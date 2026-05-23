import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../constants/app_constants.dart';
import '../../../models/business_hub/lead.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';
import 'bh_crm_extras_screens.dart';
import 'bh_leads_screen.dart';
import 'bh_deals_screen.dart';

class BHCRMScreen extends ConsumerStatefulWidget {
  const BHCRMScreen({super.key, this.initialTabIndex = 0});

  /// 0 Дашборд, 1 Лиды, 2 Воронка, 3 Задачи, 4 Ещё
  final int initialTabIndex;

  @override
  ConsumerState<BHCRMScreen> createState() => _BHCRMScreenState();
}

class _BHCRMScreenState extends ConsumerState<BHCRMScreen> {
  late int _tabIndex;

  @override
  void initState() {
    super.initState();
    _tabIndex = widget.initialTabIndex;
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    var org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) {
      final user = ref.read(firestoreAuthProvider).user;
      if (user != null) {
        await ref.read(bhOrganizationProvider.notifier).loadByOwner(user.id);
        org = ref.read(bhOrganizationProvider).valueOrNull;
      }
    }
    if (org != null) {
      await ref.read(bhCrmServiceProvider).ensureDefaultPipelines(org.id);
      ref.read(bhLeadsProvider.notifier).load(org.id);
      ref.read(bhDealsProvider.notifier).load(org.id);
      ref.read(bhCounterpartiesProvider.notifier).load(org.id);
      ref.read(bhMembersProvider.notifier).load(org.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
          tooltip: 'Назад',
        ),
        title: const Text('CRM'),
        actions: [
          if (_tabIndex == 1)
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () => _showAddLead(context),
              tooltip: 'Добавить лид',
            )
          else if (_tabIndex == 2)
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () => _showAddDeal(context),
              tooltip: 'Добавить сделку',
            ),
        ],
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Row(
                children: [
                  _TabChip(
                    label: 'Дашборд',
                    selected: _tabIndex == 0,
                    onTap: () => setState(() => _tabIndex = 0),
                  ),
                  _TabChip(
                    label: 'Лиды',
                    selected: _tabIndex == 1,
                    onTap: () => setState(() => _tabIndex = 1),
                  ),
                  _TabChip(
                    label: 'Воронка',
                    selected: _tabIndex == 2,
                    onTap: () => setState(() => _tabIndex = 2),
                  ),
                  _TabChip(
                    label: 'Задачи',
                    selected: _tabIndex == 3,
                    onTap: () => setState(() => _tabIndex = 3),
                  ),
                  _TabChip(
                    label: 'Ещё',
                    selected: _tabIndex == 4,
                    onTap: () => setState(() => _tabIndex = 4),
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: IndexedStack(
              index: _tabIndex,
              children: const [
                BHCrmDashboardScreen(),
                BHLeadsScreen(),
                BHDealsScreen(),
                BHCrmTasksScreen(),
                BHCrmMoreScreen(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showAddLead(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _AddLeadSheet(
        onSaved: () {
          Navigator.pop(ctx);
          _load();
        },
      ),
    );
  }

  void _showAddDeal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _AddDealSheet(
        onSaved: () {
          Navigator.pop(ctx);
          _load();
        },
      ),
    );
  }
}

class _TabChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _TabChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? AppConstants.primaryColor : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: selected ? Colors.white : Colors.grey.shade700,
            ),
          ),
        ),
      ),
    );
  }
}

class _AddLeadSheet extends ConsumerStatefulWidget {
  final VoidCallback onSaved;

  const _AddLeadSheet({required this.onSaved});

  @override
  ConsumerState<_AddLeadSheet> createState() => _AddLeadSheetState();
}

class _AddLeadSheetState extends ConsumerState<_AddLeadSheet> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _companyCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _campaignCtrl = TextEditingController();
  final _utmSourceCtrl = TextEditingController();
  final _utmMediumCtrl = TextEditingController();
  final _utmCampaignCtrl = TextEditingController();
  BHLeadSource _source = BHLeadSource.other;
  String? _assignedTo;
  bool _saving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _companyCtrl.dispose();
    _notesCtrl.dispose();
    _campaignCtrl.dispose();
    _utmSourceCtrl.dispose();
    _utmMediumCtrl.dispose();
    _utmCampaignCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Новый лид', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            TextField(
              controller: _nameCtrl,
              decoration: const InputDecoration(labelText: 'Имя *', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneCtrl,
              decoration: const InputDecoration(labelText: 'Телефон', border: OutlineInputBorder()),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _emailCtrl,
              decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _companyCtrl,
              decoration: const InputDecoration(labelText: 'Компания', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<BHLeadSource>(
              value: _source,
              decoration: const InputDecoration(labelText: 'Источник', border: OutlineInputBorder()),
              items: BHLeadSource.values.map((s) => DropdownMenuItem(value: s, child: Text(s.label))).toList(),
              onChanged: (v) => setState(() => _source = v ?? BHLeadSource.other),
            ),
            const SizedBox(height: 12),
            _buildAssignedToDropdown(context),
            const SizedBox(height: 12),
            TextField(
              controller: _campaignCtrl,
              decoration: const InputDecoration(labelText: 'Кампания', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _utmSourceCtrl,
              decoration: const InputDecoration(labelText: 'UTM source', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _utmMediumCtrl,
              decoration: const InputDecoration(labelText: 'UTM medium', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _utmCampaignCtrl,
              decoration: const InputDecoration(labelText: 'UTM campaign', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notesCtrl,
              decoration: const InputDecoration(labelText: 'Заметки', border: OutlineInputBorder()),
              maxLines: 2,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppConstants.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _saving ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Сохранить'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAssignedToDropdown(BuildContext context) {
    final members = ref.watch(bhMembersProvider).valueOrNull ?? [];
    if (members.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: DropdownButtonFormField<String>(
        value: _assignedTo,
        decoration: const InputDecoration(labelText: 'Ответственный', border: OutlineInputBorder()),
        items: [
          const DropdownMenuItem(value: null, child: Text('— Не назначен')),
          ...members.map((m) => DropdownMenuItem(value: m.userId, child: Text(m.userName ?? m.userEmail ?? m.userId))),
        ],
        onChanged: (v) => setState(() => _assignedTo = v),
      ),
    );
  }

  Future<void> _save() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Введите имя')));
      return;
    }
    final createdBy = ref.read(firestoreAuthProvider).user?.id ?? '';
    if (createdBy.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Войдите в аккаунт, чтобы создать лид')));
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(bhLeadsProvider.notifier).add(
            name: name,
            createdBy: createdBy,
            phone: _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
            email: _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
            company: _companyCtrl.text.trim().isEmpty ? null : _companyCtrl.text.trim(),
            source: _source,
            notes: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
            assignedTo: _assignedTo,
            campaign: _campaignCtrl.text.trim().isEmpty ? null : _campaignCtrl.text.trim(),
            utmSource: _utmSourceCtrl.text.trim().isEmpty ? null : _utmSourceCtrl.text.trim(),
            utmMedium: _utmMediumCtrl.text.trim().isEmpty ? null : _utmMediumCtrl.text.trim(),
            utmCampaign: _utmCampaignCtrl.text.trim().isEmpty ? null : _utmCampaignCtrl.text.trim(),
          );
      widget.onSaved();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Лид добавлен')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

class _AddDealSheet extends ConsumerStatefulWidget {
  final VoidCallback onSaved;

  const _AddDealSheet({required this.onSaved});

  @override
  ConsumerState<_AddDealSheet> createState() => _AddDealSheetState();
}

class _AddDealSheetState extends ConsumerState<_AddDealSheet> {
  final _titleCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  String? _counterpartyId;
  String? _counterpartyName;
  String? _assignedTo;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final cps = ref.read(bhCounterpartiesProvider).valueOrNull ?? [];
      if (cps.isNotEmpty && _counterpartyId == null) {
        setState(() {
          _counterpartyId = cps.first.id;
          _counterpartyName = cps.first.name;
        });
      }
    });
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _amountCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Widget _buildAssignedToDropdown(BuildContext context) {
    final members = ref.watch(bhMembersProvider).valueOrNull ?? [];
    if (members.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: DropdownButtonFormField<String>(
        value: _assignedTo,
        decoration: const InputDecoration(labelText: 'Ответственный', border: OutlineInputBorder()),
        items: [
          const DropdownMenuItem(value: null, child: Text('— Не назначен')),
          ...members.map((m) => DropdownMenuItem(value: m.userId, child: Text(m.userName ?? m.userEmail ?? m.userId))),
        ],
        onChanged: (v) => setState(() => _assignedTo = v),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cps = ref.watch(bhCounterpartiesProvider).valueOrNull ?? [];

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Новая сделка', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            TextField(
              controller: _titleCtrl,
              decoration: const InputDecoration(labelText: 'Название *', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _amountCtrl,
              decoration: const InputDecoration(labelText: 'Сумма (UZS)', border: OutlineInputBorder()),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            if (cps.isNotEmpty)
              DropdownButtonFormField<String>(
                value: _counterpartyId,
                decoration: const InputDecoration(labelText: 'Контрагент', border: OutlineInputBorder()),
                items: cps.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                onChanged: (v) {
                  final cp = cps.firstWhere((c) => c.id == v);
                  setState(() {
                    _counterpartyId = cp.id;
                    _counterpartyName = cp.name;
                  });
                },
              ),
            _buildAssignedToDropdown(context),
            const SizedBox(height: 12),
            TextField(
              controller: _notesCtrl,
              decoration: const InputDecoration(labelText: 'Заметки', border: OutlineInputBorder()),
              maxLines: 2,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppConstants.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _saving ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Сохранить'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Введите название')));
      return;
    }
    final createdBy = ref.read(firestoreAuthProvider).user?.id ?? '';
    if (createdBy.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Войдите в аккаунт, чтобы создать сделку')));
      return;
    }
    final amount = double.tryParse(_amountCtrl.text.trim()) ?? 0;
    setState(() => _saving = true);
    try {
      await ref.read(bhDealsProvider.notifier).add(
            title: title,
            createdBy: createdBy,
            amount: amount,
            counterpartyId: _counterpartyId,
            counterpartyName: _counterpartyName,
            notes: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
            assignedTo: _assignedTo,
          );
      widget.onSaved();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Сделка создана')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
