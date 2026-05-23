import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../constants/app_constants.dart';
import '../../../models/business_hub/bh_chart_account.dart';
import '../../../models/business_hub/bh_journal_entry.dart';
import '../../../models/business_hub/organization_member.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';

/// Accounting Mode: счета, проводки, отчёты P&L и баланс.
class BHAccountingScreen extends ConsumerStatefulWidget {
  const BHAccountingScreen({super.key});

  @override
  ConsumerState<BHAccountingScreen> createState() => _BHAccountingScreenState();
}

class _BHAccountingScreenState extends ConsumerState<BHAccountingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) return;
    await ref.read(bhFirestoreServiceProvider).ensureDefaultChartAccounts(org.id);
    ref.read(bhMembersProvider.notifier).load(org.id);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final org = ref.watch(bhOrganizationProvider).valueOrNull;
    final user = ref.watch(firestoreAuthProvider).user;
    final members = ref.watch(bhMembersProvider).valueOrNull ?? [];
    BHOrganizationMember? me;
    if (user != null) {
      for (final m in members) {
        if (m.userId == user.id) {
          me = m;
          break;
        }
      }
    }
    final allowed = me?.role.canAccessAccounting ?? true;

    if (org != null && (!org.accountingModeEnabled || org.financeMode != 'accounting')) {
      return Scaffold(
        appBar: AppBar(title: const Text('Accounting')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Включите Accounting Mode в настройках Business Hub (иконка шестерёнки на главном экране хаба).',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: () => context.pop(),
                  child: const Text('Назад'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (!allowed) {
      return Scaffold(
        appBar: AppBar(title: const Text('Accounting')),
        body: const Center(child: Text('Недостаточно прав (роль менеджера без бухгалтерии)')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
        title: const Text('Accounting'),
        bottom: TabBar(
          controller: _tabs,
          tabs: const [
            Tab(text: 'Счета'),
            Tab(text: 'Проводки'),
            Tab(text: 'Отчёты'),
          ],
        ),
      ),
      body: org == null
          ? const Center(child: Text('Нет организации'))
          : TabBarView(
              controller: _tabs,
              children: [
                _AccountsTab(orgId: org.id),
                _JournalTab(orgId: org.id),
                _ReportsTab(orgId: org.id),
              ],
            ),
    );
  }
}

class _AccountsTab extends ConsumerStatefulWidget {
  const _AccountsTab({required this.orgId});
  final String orgId;

  @override
  ConsumerState<_AccountsTab> createState() => _AccountsTabState();
}

class _AccountsTabState extends ConsumerState<_AccountsTab> {
  List<BHChartAccount> _list = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    setState(() => _loading = true);
    final svc = ref.read(bhFirestoreServiceProvider);
    await svc.ensureDefaultChartAccounts(widget.orgId);
    final list = await svc.getChartAccounts(widget.orgId);
    if (mounted) {
      setState(() {
        _list = list;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    return RefreshIndicator(
      onRefresh: _reload,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _list.length,
        itemBuilder: (_, i) {
          final a = _list[i];
          return Card(
            child: ListTile(
              title: Text(a.name, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('${a.code} • ${a.kind.name}'),
            ),
          );
        },
      ),
    );
  }
}

class _JournalTab extends ConsumerStatefulWidget {
  const _JournalTab({required this.orgId});
  final String orgId;

  @override
  ConsumerState<_JournalTab> createState() => _JournalTabState();
}

class _JournalTabState extends ConsumerState<_JournalTab> {
  List<BHJournalEntry> _list = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    setState(() => _loading = true);
    final list = await ref.read(bhFirestoreServiceProvider).getJournalEntries(widget.orgId);
    if (mounted) {
      setState(() {
        _list = list;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,###', 'ru');
    final dFmt = DateFormat('dd.MM.yyyy HH:mm');
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_list.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Проводки создаются автоматически при оплатах по графику и начислениях кредиторки (Accounting Mode).',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppConstants.textSecondary),
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _reload,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _list.length,
        itemBuilder: (_, i) {
          final j = _list[i];
          return Card(
            child: ListTile(
              title: Text(
                '${fmt.format(j.amount)} ${j.currency}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Text(
                '${dFmt.format(j.date)}\nDr ${j.debitAccountId.split('_').last} → Cr ${j.creditAccountId.split('_').last}\n${j.note ?? j.referenceType ?? ''}',
              ),
              isThreeLine: true,
            ),
          );
        },
      ),
    );
  }
}

class _ReportsTab extends ConsumerStatefulWidget {
  const _ReportsTab({required this.orgId});
  final String orgId;

  @override
  ConsumerState<_ReportsTab> createState() => _ReportsTabState();
}

class _ReportsTabState extends ConsumerState<_ReportsTab> {
  Map<String, double>? _bal;
  ({double revenue, double expense, double net})? _pnl;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    setState(() => _loading = true);
    final svc = ref.read(bhFirestoreServiceProvider);
    final bal = await svc.getAccountingBalanceSheet(widget.orgId);
    final pnl = await svc.getAccountingPnL(widget.orgId);
    if (mounted) {
      setState(() {
        _bal = bal;
        _pnl = pnl;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,###', 'ru');
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    final bal = _bal!;
    final pnl = _pnl!;
    return RefreshIndicator(
      onRefresh: _reload,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'P&L (упрощённо)',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
          ),
          const SizedBox(height: 8),
          Text('Выручка (кредит Revenue): ${fmt.format(pnl.revenue)}'),
          Text('Расходы (дебет Expense): ${fmt.format(pnl.expense)}'),
          Text(
            'Чистая прибыль: ${fmt.format(pnl.net)}',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          const Divider(height: 32),
          const Text(
            'Баланс (остатки по счетам)',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
          ),
          const SizedBox(height: 8),
          Text('Cash: ${fmt.format(bal['cash'] ?? 0)}'),
          Text('AR: ${fmt.format(bal['ar'] ?? 0)}'),
          Text('AP: ${fmt.format(bal['ap'] ?? 0)}'),
          const SizedBox(height: 12),
          Text(
            'Интерпретация остатков — учебная; для полного учёта используйте проводки и счета выше.',
            style: TextStyle(fontSize: 12, color: AppConstants.textSecondary),
          ),
        ],
      ),
    );
  }
}
