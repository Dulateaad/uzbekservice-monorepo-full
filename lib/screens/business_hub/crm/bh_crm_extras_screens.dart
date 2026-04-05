import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../constants/app_constants.dart';
import '../../../models/business_hub/crm_company.dart';
import '../../../models/business_hub/crm_contact.dart';
import '../../../models/business_hub/crm_product.dart';
import '../../../models/business_hub/crm_crm_task.dart';
import '../../../models/business_hub/crm_subscription.dart';
import '../../../models/business_hub/crm_notification.dart';
import '../../../models/business_hub/crm_pipeline.dart';
import '../../../models/business_hub/deal.dart' show BHDealType, BHDealTypeX;
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';

/// Дашборд CRM: метрики и KPI менеджеров.
class BHCrmDashboardScreen extends ConsumerWidget {
  const BHCrmDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final org = ref.watch(bhOrganizationProvider).valueOrNull;
    if (org == null) {
      return const Center(child: Text('Нет организации'));
    }
    final async = ref.watch(bhCrmAnalyticsProvider(org.id));
    final fmt = NumberFormat('#,###', 'ru');
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e')),
      data: (data) {
        final kpi = (data['managerKpi'] as List?)?.cast<Map<String, dynamic>>() ?? [];
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(bhCrmAnalyticsProvider(org.id)),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('За всё время (организация)', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _StatTile('Лиды', '${data['leadsTotal']}'),
                  _StatTile('Лиды 30д', '${data['leads30d']}'),
                  _StatTile('Сделки', '${data['dealsTotal']}'),
                  _StatTile('Выиграно', '${data['wonCount']}'),
                  _StatTile('Проиграно', '${data['lostCount']}'),
                  _StatTile('Сумма Won', '${fmt.format((data['wonSum'] as num).toDouble())}'),
                  _StatTile('Средний чек', '${fmt.format((data['avgCheck'] as num).toDouble())}'),
                  _StatTile('Конверсия', '${((data['conversionClosed'] as num).toDouble() * 100).toStringAsFixed(1)}%'),
                  _StatTile('Прогноз', '${fmt.format((data['forecast'] as num).toDouble())}'),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Text('KPI менеджеров', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const Spacer(),
                  TextButton(
                    onPressed: () async {
                      final uid = ref.read(firestoreAuthProvider).user?.id ?? '';
                      if (uid.isEmpty) return;
                      await ref.read(bhCrmServiceProvider).runStaleDealCheck(org.id, uid);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Проверка простоя выполнена (уведомления)')));
                      }
                    },
                    child: const Text('Простой 3д'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (kpi.isEmpty)
                Text('Нет данных по ответственным', style: TextStyle(color: AppConstants.textSecondary))
              else
                ...kpi.map((m) {
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Text(m['userId'] as String, style: const TextStyle(fontSize: 13)),
                      subtitle: Text(
                        'Лиды: ${m['leads']} • Сделки: ${m['deals']} • Won: ${m['won']} • Сумма: ${fmt.format((m['sum'] as num).toDouble())} • Конв.: ${((m['conversion'] as num).toDouble() * 100).toStringAsFixed(0)}%',
                        style: const TextStyle(fontSize: 11),
                      ),
                    ),
                  );
                }),
            ],
          ),
        );
      },
    );
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final String value;
  const _StatTile(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: MediaQuery.of(context).size.width > 400 ? 160 : 140,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppConstants.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 11, color: AppConstants.textSecondary)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
        ],
      ),
    );
  }
}

/// Задачи CRM (bh_crm_tasks).
class BHCrmTasksScreen extends ConsumerStatefulWidget {
  const BHCrmTasksScreen({super.key});

  @override
  ConsumerState<BHCrmTasksScreen> createState() => _BHCrmTasksScreenState();
}

class _BHCrmTasksScreenState extends ConsumerState<BHCrmTasksScreen> {
  List<BHCrmTask> _tasks = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) return;
    setState(() => _loading = true);
    try {
      final list = await ref.read(bhCrmServiceProvider).getCrmTasks(org.id);
      setState(() {
        _tasks = list;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: _load,
      child: _tasks.isEmpty
          ? ListView(
              children: [
                const SizedBox(height: 80),
                Center(child: Text('Нет задач CRM', style: TextStyle(color: AppConstants.textSecondary))),
              ],
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _tasks.length,
              itemBuilder: (_, i) {
                final t = _tasks[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(t.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      'До ${DateFormat('dd.MM.yyyy').format(t.dueDate)}${t.isOverdue ? ' • Просрочено' : ''}',
                      style: TextStyle(color: t.isOverdue ? Colors.red : AppConstants.textSecondary),
                    ),
                    trailing: t.status == BHCrmTaskStatus.done
                        ? const Icon(Icons.check_circle, color: Colors.green)
                        : IconButton(
                            icon: const Icon(Icons.check),
                            onPressed: () async {
                              await ref.read(bhCrmServiceProvider).updateCrmTask(t.copyWith(status: BHCrmTaskStatus.done));
                              _load();
                            },
                          ),
                  ),
                );
              },
            ),
    );
  }
}

/// Меню справочников и подписок.
class BHCrmMoreScreen extends ConsumerWidget {
  const BHCrmMoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ListTile(
          leading: const Icon(Icons.business),
          title: const Text('Компании'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/home/services/business-hub/crm/companies'),
        ),
        ListTile(
          leading: const Icon(Icons.contacts),
          title: const Text('Контакты'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/home/services/business-hub/crm/contacts'),
        ),
        ListTile(
          leading: const Icon(Icons.inventory_2_outlined),
          title: const Text('Продукты'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/home/services/business-hub/crm/products'),
        ),
        ListTile(
          leading: const Icon(Icons.subscriptions_outlined),
          title: const Text('Подписки'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/home/services/business-hub/crm/subscriptions'),
        ),
        ListTile(
          leading: const Icon(Icons.notifications_outlined),
          title: const Text('Уведомления CRM'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/home/services/business-hub/crm/notifications'),
        ),
        ListTile(
          leading: const Icon(Icons.account_tree_outlined),
          title: const Text('Воронки (pipelines)'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/home/services/business-hub/crm/pipelines'),
        ),
      ],
    );
  }
}

class BHCrmCompaniesScreen extends ConsumerStatefulWidget {
  const BHCrmCompaniesScreen({super.key});

  @override
  ConsumerState<BHCrmCompaniesScreen> createState() => _BHCrmCompaniesScreenState();
}

class _BHCrmCompaniesScreenState extends ConsumerState<BHCrmCompaniesScreen> {
  List<BHCrmCompany> _list = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) return;
    setState(() => _loading = true);
    final l = await ref.read(bhCrmServiceProvider).getCompanies(org.id);
    setState(() {
      _list = l;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Компании')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAdd(context),
        child: const Icon(Icons.add),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _list.length,
                itemBuilder: (_, i) {
                  final c = _list[i];
                  return Card(
                    child: ListTile(
                      title: Text(c.name),
                      subtitle: Text([c.industry, c.website].whereType<String>().where((s) => s.isNotEmpty).join(' • ')),
                    ),
                  );
                },
              ),
            ),
    );
  }

  void _showAdd(BuildContext context) {
    final nameCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Новая компания'),
        content: TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Название')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Отмена')),
          TextButton(
            onPressed: () async {
              final org = ref.read(bhOrganizationProvider).valueOrNull;
              if (org == null || nameCtrl.text.trim().isEmpty) return;
              await ref.read(bhCrmServiceProvider).createCompany(organizationId: org.id, name: nameCtrl.text.trim());
              if (ctx.mounted) Navigator.pop(ctx);
              _load();
            },
            child: const Text('Создать'),
          ),
        ],
      ),
    );
  }
}

class BHCrmContactsScreen extends ConsumerStatefulWidget {
  const BHCrmContactsScreen({super.key});

  @override
  ConsumerState<BHCrmContactsScreen> createState() => _BHCrmContactsScreenState();
}

class _BHCrmContactsScreenState extends ConsumerState<BHCrmContactsScreen> {
  List<BHCrmContact> _list = [];
  List<BHCrmCompany> _companies = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) return;
    setState(() => _loading = true);
    final crm = ref.read(bhCrmServiceProvider);
    final c = await crm.getCompanies(org.id);
    final ct = await crm.getContacts(org.id);
    setState(() {
      _companies = c;
      _list = ct;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Контакты')),
      floatingActionButton: _companies.isEmpty
          ? null
          : FloatingActionButton(
              onPressed: () => _showAdd(context),
              child: const Icon(Icons.add),
            ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _list.isEmpty
                  ? ListView(children: [const SizedBox(height: 80), Center(child: Text(_companies.isEmpty ? 'Сначала создайте компанию' : 'Нет контактов'))])
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _list.length,
                      itemBuilder: (_, i) {
                        final c = _list[i];
                        final comp = _companies.where((x) => x.id == c.companyId).firstOrNull;
                        return Card(
                          child: ListTile(
                            title: Text(c.name),
                            subtitle: Text('${comp?.name ?? c.companyId}${c.position != null ? ' • ${c.position}' : ''}'),
                          ),
                        );
                      },
                    ),
            ),
    );
  }

  void _showAdd(BuildContext context) {
    final nameCtrl = TextEditingController();
    String? companyId = _companies.isNotEmpty ? _companies.first.id : null;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSt) => AlertDialog(
          title: const Text('Новый контакт'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Имя')),
              DropdownButtonFormField<String>(
                value: companyId,
                decoration: const InputDecoration(labelText: 'Компания'),
                items: _companies.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                onChanged: (v) => setSt(() => companyId = v),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Отмена')),
            TextButton(
              onPressed: () async {
                final org = ref.read(bhOrganizationProvider).valueOrNull;
                if (org == null || companyId == null || nameCtrl.text.trim().isEmpty) return;
                await ref.read(bhCrmServiceProvider).createContact(
                      organizationId: org.id,
                      name: nameCtrl.text.trim(),
                      companyId: companyId!,
                    );
                if (ctx.mounted) Navigator.pop(ctx);
                _load();
              },
              child: const Text('Создать'),
            ),
          ],
        ),
      ),
    );
  }
}

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull {
    final it = iterator;
    return it.moveNext() ? it.current : null;
  }
}

class BHCrmProductsScreen extends ConsumerStatefulWidget {
  const BHCrmProductsScreen({super.key});

  @override
  ConsumerState<BHCrmProductsScreen> createState() => _BHCrmProductsScreenState();
}

class _BHCrmProductsScreenState extends ConsumerState<BHCrmProductsScreen> {
  List<BHCrmProduct> _list = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) return;
    setState(() => _loading = true);
    final l = await ref.read(bhCrmServiceProvider).getProducts(org.id);
    setState(() {
      _list = l;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,###', 'ru');
    return Scaffold(
      appBar: AppBar(title: const Text('Продукты')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAdd(context),
        child: const Icon(Icons.add),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _list.length,
                itemBuilder: (_, i) {
                  final p = _list[i];
                  return Card(
                    child: ListTile(
                      title: Text(p.name),
                      subtitle: Text('${p.kind.label} • ${fmt.format(p.price)} ${p.currency}'),
                    ),
                  );
                },
              ),
            ),
    );
  }

  void _showAdd(BuildContext context) {
    final nameCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Новый продукт'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Название')),
            TextField(controller: priceCtrl, decoration: const InputDecoration(labelText: 'Цена'), keyboardType: TextInputType.number),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Отмена')),
          TextButton(
            onPressed: () async {
              final org = ref.read(bhOrganizationProvider).valueOrNull;
              if (org == null || nameCtrl.text.trim().isEmpty) return;
              final price = double.tryParse(priceCtrl.text.trim()) ?? 0;
              await ref.read(bhCrmServiceProvider).createProduct(organizationId: org.id, name: nameCtrl.text.trim(), price: price);
              if (ctx.mounted) Navigator.pop(ctx);
              _load();
            },
            child: const Text('Создать'),
          ),
        ],
      ),
    );
  }
}

class BHCrmSubscriptionsScreen extends ConsumerStatefulWidget {
  const BHCrmSubscriptionsScreen({super.key});

  @override
  ConsumerState<BHCrmSubscriptionsScreen> createState() => _BHCrmSubscriptionsScreenState();
}

class _BHCrmSubscriptionsScreenState extends ConsumerState<BHCrmSubscriptionsScreen> {
  List<BHCrmSubscription> _list = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) return;
    setState(() => _loading = true);
    final l = await ref.read(bhCrmServiceProvider).getSubscriptions(org.id);
    setState(() {
      _list = l;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,###', 'ru');
    return Scaffold(
      appBar: AppBar(title: const Text('Подписки')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _list.length,
                itemBuilder: (_, i) {
                  final s = _list[i];
                  return Card(
                    child: ListTile(
                      title: Text(s.plan),
                      subtitle: Text('${s.status.label} • ${fmt.format(s.price)} ${s.currency}\nдо ${DateFormat('dd.MM.yyyy').format(s.endDate)}'),
                    ),
                  );
                },
              ),
            ),
    );
  }
}

class BHCrmNotificationsScreen extends ConsumerStatefulWidget {
  const BHCrmNotificationsScreen({super.key});

  @override
  ConsumerState<BHCrmNotificationsScreen> createState() => _BHCrmNotificationsScreenState();
}

class _BHCrmNotificationsScreenState extends ConsumerState<BHCrmNotificationsScreen> {
  List<BHCrmNotification> _list = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    final uid = ref.read(firestoreAuthProvider).user?.id;
    if (org == null || uid == null) return;
    setState(() => _loading = true);
    final l = await ref.read(bhCrmServiceProvider).getCrmNotifications(org.id, uid);
    setState(() {
      _list = l;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Уведомления CRM')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _list.isEmpty
                  ? ListView(children: [const SizedBox(height: 80), const Center(child: Text('Нет уведомлений'))])
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _list.length,
                      itemBuilder: (_, i) {
                        final n = _list[i];
                        return Card(
                          color: n.read ? null : Colors.blue.shade50,
                          child: ListTile(
                            title: Text(n.title, style: TextStyle(fontWeight: n.read ? FontWeight.normal : FontWeight.w700)),
                            subtitle: Text(n.body),
                            onTap: () async {
                              if (!n.read) {
                                await ref.read(bhCrmServiceProvider).markCrmNotificationRead(n.id);
                                _load();
                              }
                            },
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

class BHCrmPipelinesScreen extends ConsumerStatefulWidget {
  const BHCrmPipelinesScreen({super.key});

  @override
  ConsumerState<BHCrmPipelinesScreen> createState() => _BHCrmPipelinesScreenState();
}

class _BHCrmPipelinesScreenState extends ConsumerState<BHCrmPipelinesScreen> {
  List<BHCrmPipeline> _list = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) return;
    setState(() => _loading = true);
    final crm = ref.read(bhCrmServiceProvider);
    await crm.ensureDefaultPipelines(org.id);
    final l = await crm.getPipelines(org.id);
    setState(() {
      _list = l;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Воронки')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _list.length,
                itemBuilder: (_, i) {
                  final p = _list[i];
                  return Card(
                    child: ListTile(
                      title: Text(p.name),
                      subtitle: Text('${p.scenarioLabel} · стадий: ${p.stageKeys.length}'),
                      trailing: const Icon(Icons.edit, size: 20),
                      onTap: () async {
                        final updated = await Navigator.of(context).push<bool>(
                          MaterialPageRoute(builder: (_) => _PipelineEditScreen(pipeline: p)),
                        );
                        if (updated == true) _load();
                      },
                    ),
                  );
                },
              ),
            ),
    );
  }
}

/// Экран редактирования шаблона воронки.
class _PipelineEditScreen extends ConsumerStatefulWidget {
  const _PipelineEditScreen({required this.pipeline});
  final BHCrmPipeline pipeline;

  @override
  ConsumerState<_PipelineEditScreen> createState() => _PipelineEditScreenState();
}

class _PipelineEditScreenState extends ConsumerState<_PipelineEditScreen> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _prefixCtrl;
  late final TextEditingController _notesCtrl;
  late String _scenario;
  late String? _dealType;
  final List<_KvEntry> _ctxEntries = [];
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final p = widget.pipeline;
    _nameCtrl = TextEditingController(text: p.name);
    _prefixCtrl = TextEditingController(text: p.defaultTitlePrefix ?? '');
    _notesCtrl = TextEditingController(text: p.defaultNotesTemplate ?? '');
    _scenario = p.scenario;
    _dealType = p.defaultDealType;
    for (final e in p.contextDefaults.entries) {
      _ctxEntries.add(_KvEntry(e.key, e.value.toString()));
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _prefixCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) return;
    setState(() => _saving = true);

    final ctx = <String, dynamic>{};
    for (final e in _ctxEntries) {
      final k = e.key.trim();
      if (k.isNotEmpty) ctx[k] = e.value.trim();
    }

    final updated = widget.pipeline.copyWith(
      name: name,
      scenario: _scenario,
      defaultTitlePrefix: _prefixCtrl.text.trim().isEmpty ? null : _prefixCtrl.text.trim(),
      clearDefaultTitlePrefix: _prefixCtrl.text.trim().isEmpty,
      defaultNotesTemplate: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
      clearDefaultNotesTemplate: _notesCtrl.text.trim().isEmpty,
      defaultDealType: _dealType,
      clearDefaultDealType: _dealType == null,
      contextDefaults: ctx,
      updatedAt: DateTime.now(),
    );
    await ref.read(bhCrmServiceProvider).updatePipeline(updated);
    setState(() => _saving = false);
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final scenarios = BHCrmPipeline.knownScenarios;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Настроить воронку'),
        actions: [
          if (_saving)
            const Padding(
              padding: EdgeInsets.all(12),
              child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)),
            )
          else
            IconButton(icon: const Icon(Icons.check), onPressed: _save),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Название воронки')),
          const SizedBox(height: 16),

          DropdownButtonFormField<String>(
            value: scenarios.containsKey(_scenario) ? _scenario : 'generic',
            decoration: const InputDecoration(labelText: 'Сценарий / отрасль'),
            items: scenarios.entries
                .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                .toList(),
            onChanged: (v) => setState(() => _scenario = v ?? 'generic'),
          ),
          const SizedBox(height: 16),

          DropdownButtonFormField<String?>(
            value: _dealType,
            decoration: const InputDecoration(labelText: 'Тип сделки по умолчанию'),
            items: [
              const DropdownMenuItem(value: null, child: Text('Не задан')),
              ...BHDealType.values.map((t) => DropdownMenuItem(value: t.firestoreValue, child: Text(t.label))),
            ],
            onChanged: (v) => setState(() => _dealType = v),
          ),
          const SizedBox(height: 16),

          TextField(
            controller: _prefixCtrl,
            decoration: const InputDecoration(
              labelText: 'Префикс названия сделки',
              hintText: 'Например: Банкет',
            ),
          ),
          const SizedBox(height: 16),

          TextField(
            controller: _notesCtrl,
            decoration: const InputDecoration(
              labelText: 'Шаблон заметок',
              hintText: 'Чеклист, формат и т.д.',
            ),
            maxLines: 5,
          ),
          const SizedBox(height: 24),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Контекст по умолчанию', style: Theme.of(context).textTheme.titleSmall),
              IconButton(
                icon: const Icon(Icons.add_circle_outline, size: 22),
                onPressed: () => setState(() => _ctxEntries.add(_KvEntry('', ''))),
              ),
            ],
          ),
          const SizedBox(height: 8),
          for (int i = 0; i < _ctxEntries.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      decoration: const InputDecoration(labelText: 'Ключ', isDense: true),
                      controller: TextEditingController(text: _ctxEntries[i].key)
                        ..addListener(() {}),
                      onChanged: (v) => _ctxEntries[i] = _KvEntry(v, _ctxEntries[i].value),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      decoration: const InputDecoration(labelText: 'Значение', isDense: true),
                      controller: TextEditingController(text: _ctxEntries[i].value)
                        ..addListener(() {}),
                      onChanged: (v) => _ctxEntries[i] = _KvEntry(_ctxEntries[i].key, v),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline, size: 20),
                    onPressed: () => setState(() => _ctxEntries.removeAt(i)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _KvEntry {
  String key;
  String value;
  _KvEntry(this.key, this.value);
}
