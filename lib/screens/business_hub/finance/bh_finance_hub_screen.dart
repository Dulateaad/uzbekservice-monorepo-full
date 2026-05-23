import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../constants/app_constants.dart';
import '../../../models/business_hub/organization.dart';
import '../../../models/business_hub/organization_member.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';

/// Business Mode: баланс, дебиторка, кредиторка; ввод кредиторки (поставщики).
class BHFinanceHubScreen extends ConsumerStatefulWidget {
  const BHFinanceHubScreen({super.key});

  @override
  ConsumerState<BHFinanceHubScreen> createState() => _BHFinanceHubScreenState();
}

class _BHFinanceHubScreenState extends ConsumerState<BHFinanceHubScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) return;
    ref.invalidate(bhExtendedFinanceProvider(org.id));
    ref.read(bhMembersProvider.notifier).load(org.id);
  }

  Future<void> _vendorBill(BHOrganization org) async {
    final c = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Начислить обязательство (кредиторка)'),
        content: TextField(
          controller: c,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
          decoration: const InputDecoration(labelText: 'Сумма (UZS)', hintText: 'Например: счёт поставщика'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Отмена')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Сохранить')),
        ],
      ),
    );
    final t = c.text;
    c.dispose();
    if (ok != true || !mounted) return;
    final v = double.tryParse(t.replaceAll(' ', '')) ?? 0;
    if (v <= 0) return;
    await ref.read(bhFirestoreServiceProvider).recordVendorBill(organizationId: org.id, amount: v);
    ref.invalidate(bhExtendedFinanceProvider(org.id));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Кредиторка увеличена')));
    }
  }

  Future<void> _vendorPay(BHOrganization org) async {
    final c = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Оплатить поставщику'),
        content: TextField(
          controller: c,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
          decoration: const InputDecoration(labelText: 'Сумма'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Отмена')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Провести')),
        ],
      ),
    );
    final t = c.text;
    c.dispose();
    if (ok != true || !mounted) return;
    final v = double.tryParse(t.replaceAll(' ', '')) ?? 0;
    if (v <= 0) return;
    await ref.read(bhFirestoreServiceProvider).recordVendorPayment(organizationId: org.id, amount: v);
    ref.invalidate(bhExtendedFinanceProvider(org.id));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Оплата учтена')));
    }
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

    final fmt = NumberFormat('#,###', 'ru');

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
        title: const Text('Финансы'),
        actions: [
          if (org != null &&
              org.accountingModeEnabled &&
              org.financeMode == 'accounting' &&
              (me?.role.canAccessAccounting ?? true))
            IconButton(
              icon: const Icon(Icons.account_balance_outlined),
              tooltip: 'Accounting',
              onPressed: () => context.push('/home/services/business-hub/accounting'),
            ),
        ],
      ),
      body: org == null
          ? const Center(child: Text('Нет организации'))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  ref.watch(bhExtendedFinanceProvider(org.id)).when(
                        loading: () => const Padding(
                          padding: EdgeInsets.all(24),
                          child: Center(child: CircularProgressIndicator()),
                        ),
                        error: (e, _) => Text('Ошибка: $e'),
                        data: (f) => Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _Tile(
                              title: 'Баланс (по движениям)',
                              value: '${fmt.format(f.balance)} UZS',
                              icon: Icons.account_balance_wallet_outlined,
                              color: AppConstants.primaryColor,
                            ),
                            const SizedBox(height: 12),
                            _Tile(
                              title: 'Дебиторка',
                              subtitle: 'Неоплаченные инстолменты',
                              value: '${fmt.format(f.receivables)} UZS',
                              icon: Icons.trending_up,
                              color: const Color(0xFFF59E0B),
                            ),
                            const SizedBox(height: 12),
                            _Tile(
                              title: 'Кредиторка',
                              subtitle: 'Обязательства перед поставщиками',
                              value: '${fmt.format(f.payables)} UZS',
                              icon: Icons.trending_down,
                              color: const Color(0xFFEF4444),
                            ),
                          ],
                        ),
                      ),
                  const SizedBox(height: 28),
                  const Text(
                    'Операции',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  ListTile(
                    leading: const Icon(Icons.receipt_long_outlined),
                    title: const Text('Начислить счёт поставщика'),
                    subtitle: const Text('Увеличивает кредиторку'),
                    onTap: () => _vendorBill(org),
                  ),
                  ListTile(
                    leading: const Icon(Icons.payments_outlined),
                    title: const Text('Оплатить поставщику'),
                    subtitle: const Text('Уменьшает кредиторку и деньги'),
                    onTap: () => _vendorPay(org),
                  ),
                ],
              ),
            ),
    );
  }
}

class _Tile extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String value;
  final IconData icon;
  final Color color;

  const _Tile({
    required this.title,
    this.subtitle,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 32),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                if (subtitle != null)
                  Text(subtitle!, style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
                const SizedBox(height: 4),
                Text(value, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: color)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
