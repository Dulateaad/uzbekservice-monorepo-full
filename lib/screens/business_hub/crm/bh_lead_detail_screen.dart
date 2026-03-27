import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../constants/app_constants.dart';
import '../../../models/business_hub/lead.dart';
import '../../../models/business_hub/activity.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';

class BHLeadDetailScreen extends ConsumerStatefulWidget {
  final BHLead lead;

  const BHLeadDetailScreen({super.key, required this.lead});

  @override
  ConsumerState<BHLeadDetailScreen> createState() => _BHLeadDetailScreenState();
}

class _BHLeadDetailScreenState extends ConsumerState<BHLeadDetailScreen> {
  @override
  void initState() {
    super.initState();
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
      ref.read(bhActivitiesProvider.notifier).load(org.id, leadId: widget.lead.id);
      ref.read(bhMembersProvider.notifier).load(org.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lead = widget.lead;
    final activitiesAsync = ref.watch(bhActivitiesProvider);
    final dateFormat = DateFormat('dd.MM.yyyy HH:mm');

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
          tooltip: 'Назад',
        ),
        title: Text(lead.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => _showEditLead(context),
            tooltip: 'Редактировать',
          ),
          PopupMenuButton<String>(
            onSelected: (v) async {
              if (v == 'convert') {
                await _convertToDeal(lead);
              } else if (v == 'delete') {
                _deleteLead(lead);
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'convert', child: Text('В сделку')),
              const PopupMenuItem(value: 'delete', child: Text('Удалить', style: TextStyle(color: Colors.red))),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 28,
                          backgroundColor: AppConstants.primaryColor.withValues(alpha: 0.2),
                          child: Text(
                            lead.name.isNotEmpty ? lead.name[0].toUpperCase() : '?',
                            style: const TextStyle(fontSize: 24, color: AppConstants.primaryColor, fontWeight: FontWeight.w600),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(lead.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 4),
                              _LeadStatusChip(status: lead.status),
                              if (lead.company != null) ...[
                                const SizedBox(height: 4),
                                Text(lead.company!, style: TextStyle(fontSize: 13, color: AppConstants.textSecondary)),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (lead.phone != null || lead.email != null) ...[
                      const Divider(height: 24),
                      if (lead.phone != null)
                        _InfoRow(icon: Icons.phone, label: lead.phone!, onTap: () => _call(lead.phone!)),
                      if (lead.email != null)
                        _InfoRow(icon: Icons.email, label: lead.email!, onTap: () => _email(lead.email!)),
                    ],
                    if (lead.notes != null && lead.notes!.isNotEmpty) ...[
                      const Divider(height: 24),
                      Text('Заметки', style: TextStyle(fontSize: 12, color: AppConstants.textSecondary, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(lead.notes!, style: const TextStyle(fontSize: 14)),
                    ],
                    if ([lead.campaign, lead.utmSource, lead.utmMedium, lead.utmCampaign]
                        .any((s) => s != null && s.trim().isNotEmpty)) ...[
                      const Divider(height: 24),
                      Text('Кампания и UTM', style: TextStyle(fontSize: 12, color: AppConstants.textSecondary, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 6),
                      if (lead.campaign != null && lead.campaign!.trim().isNotEmpty)
                        Text('Кампания: ${lead.campaign}', style: const TextStyle(fontSize: 13)),
                      if (lead.utmSource != null && lead.utmSource!.trim().isNotEmpty)
                        Text('utm_source: ${lead.utmSource}', style: const TextStyle(fontSize: 13)),
                      if (lead.utmMedium != null && lead.utmMedium!.trim().isNotEmpty)
                        Text('utm_medium: ${lead.utmMedium}', style: const TextStyle(fontSize: 13)),
                      if (lead.utmCampaign != null && lead.utmCampaign!.trim().isNotEmpty)
                        Text('utm_campaign: ${lead.utmCampaign}', style: const TextStyle(fontSize: 13)),
                    ],
                    const SizedBox(height: 8),
                    Text('Источник: ${lead.source.label}', style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
                    if (lead.assignedTo != null) ...[
                      const SizedBox(height: 4),
                      _AssignedToRow(assignedToUserId: lead.assignedTo!),
                    ],
                    Text('Создан: ${dateFormat.format(lead.createdAt)}', style: TextStyle(fontSize: 11, color: AppConstants.textSecondary)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('История', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                TextButton.icon(
                  onPressed: () => _showAddActivity(context, leadId: lead.id),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Добавить'),
                ),
              ],
            ),
            activitiesAsync.when(
              loading: () => const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
              error: (e, _) => Text('Ошибка: $e', style: const TextStyle(color: Colors.red)),
              data: (activities) {
                if (activities.isEmpty) {
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Center(
                        child: Column(
                          children: [
                            Icon(Icons.history, size: 48, color: Colors.grey.shade300),
                            const SizedBox(height: 12),
                            Text('Нет активностей', style: TextStyle(color: AppConstants.textSecondary)),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: () => _showAddActivity(context, leadId: lead.id),
                              child: const Text('Добавить звонок, встречу или заметку'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }
                return Column(
                  children: activities.map((a) => _ActivityTile(
                    activity: a,
                    dateFormat: dateFormat,
                    onEdit: () => _showEditActivity(context, a, leadId: lead.id),
                    onDelete: () => _deleteActivity(a),
                  )).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showEditLead(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _EditLeadSheet(
        lead: widget.lead,
        onSaved: () {
          Navigator.pop(ctx);
          context.pop();
        },
      ),
    );
  }

  void _showEditActivity(BuildContext context, BHActivity activity, {String? leadId, String? dealId}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _EditActivitySheet(
        activity: activity,
        leadId: leadId,
        dealId: dealId,
        onSaved: () {
          Navigator.pop(ctx);
          _load();
        },
      ),
    );
  }

  void _deleteActivity(BHActivity activity) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Удалить активность?'),
        content: Text('«${activity.subject}» будет удалена.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Отмена')),
          TextButton(
            onPressed: () {
              ref.read(bhActivitiesProvider.notifier).remove(activity.id);
              Navigator.pop(ctx);
              _load();
            },
            child: const Text('Удалить', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _showAddActivity(BuildContext context, {String? leadId, String? dealId}) {
    final userId = ref.read(firestoreAuthProvider).user?.id ?? '';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _AddActivitySheet(
        leadId: leadId,
        dealId: dealId,
        createdBy: userId,
        onSaved: () {
          Navigator.pop(ctx);
          _load();
        },
      ),
    );
  }

  Future<void> _convertToDeal(BHLead lead) async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) return;
    final createdBy = ref.read(firestoreAuthProvider).user?.id ?? '';
    if (createdBy.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Войдите в аккаунт')));
      }
      return;
    }
    try {
      final cp = await ref.read(bhCounterpartiesProvider.notifier).createFromLead(lead);
      await ref.read(bhDealsProvider.notifier).add(
            title: lead.company ?? lead.name,
            createdBy: createdBy,
            counterpartyId: cp?.id,
            counterpartyName: lead.name,
            leadId: lead.id,
            notes: lead.notes,
            companyId: lead.companyId,
            contactId: lead.contactId,
          );
      await ref.read(bhLeadsProvider.notifier).update(lead.copyWith(status: BHLeadStatus.qualified));
      if (mounted) {
        ref.read(bhDealsProvider.notifier).load(org.id);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Сделка создана из лида')));
        context.pop();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red));
    }
  }

  void _deleteLead(BHLead lead) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Удалить лид?'),
        content: Text('Лид "${lead.name}" будет удалён.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Отмена')),
          TextButton(
            onPressed: () {
              ref.read(bhLeadsProvider.notifier).remove(lead.id);
              Navigator.pop(ctx);
              context.pop();
            },
            child: const Text('Удалить', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _call(String phone) {}
  void _email(String email) {}
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  const _InfoRow({required this.icon, required this.label, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        child: Row(
          children: [
            Icon(icon, size: 18, color: AppConstants.textSecondary),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(fontSize: 14)),
          ],
        ),
      ),
    );
  }
}

class _AssignedToRow extends StatelessWidget {
  final String assignedToUserId;

  const _AssignedToRow({required this.assignedToUserId});

  @override
  Widget build(BuildContext context) {
    return Consumer(
      builder: (context, ref, _) {
        final members = ref.watch(bhMembersProvider).valueOrNull ?? [];
        final member = members.where((m) => m.userId == assignedToUserId).firstOrNull;
        if (member == null) return const SizedBox.shrink();
        return Row(
          children: [
            Icon(Icons.person_outline, size: 14, color: AppConstants.textSecondary),
            const SizedBox(width: 6),
            Text('Ответственный: ${member.userName ?? member.userEmail ?? assignedToUserId}', style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
          ],
        );
      },
    );
  }
}

class _LeadStatusChip extends StatelessWidget {
  final BHLeadStatus status;

  const _LeadStatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case BHLeadStatus.new_:
        color = Colors.blue;
        break;
      case BHLeadStatus.won:
        color = Colors.green;
        break;
      case BHLeadStatus.lost:
        color = Colors.red;
        break;
      default:
        color = Colors.orange;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
      child: Text(status.label, style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w600)),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  final BHActivity activity;
  final DateFormat dateFormat;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  const _ActivityTile({required this.activity, required this.dateFormat, this.onEdit, this.onDelete});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    switch (activity.type) {
      case BHActivityType.call:
        icon = Icons.call;
        break;
      case BHActivityType.meeting:
        icon = Icons.event;
        break;
      case BHActivityType.email:
        icon = Icons.email;
        break;
      default:
        icon = Icons.note;
    }
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(backgroundColor: AppConstants.primaryColor.withValues(alpha: 0.2), child: Icon(icon, color: AppConstants.primaryColor, size: 20)),
        title: Text(activity.subject, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (activity.description != null) Text(activity.description!, maxLines: 2, overflow: TextOverflow.ellipsis),
            Text('${activity.status.label} • ${dateFormat.format(activity.activityDate)}', style: TextStyle(fontSize: 11, color: AppConstants.textSecondary)),
          ],
        ),
        trailing: (onEdit != null || onDelete != null)
            ? PopupMenuButton<String>(
                onSelected: (v) {
                  if (v == 'edit') onEdit?.call();
                  else if (v == 'delete') onDelete?.call();
                },
                itemBuilder: (_) => [
                  if (onEdit != null) const PopupMenuItem(value: 'edit', child: Text('Редактировать')),
                  if (onDelete != null) const PopupMenuItem(value: 'delete', child: Text('Удалить', style: TextStyle(color: Colors.red))),
                ],
              )
            : null,
      ),
    );
  }
}

class _EditLeadSheet extends ConsumerStatefulWidget {
  final BHLead lead;
  final VoidCallback onSaved;

  const _EditLeadSheet({required this.lead, required this.onSaved});

  @override
  ConsumerState<_EditLeadSheet> createState() => _EditLeadSheetState();
}

class _EditLeadSheetState extends ConsumerState<_EditLeadSheet> {
  late TextEditingController _nameCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _companyCtrl;
  late TextEditingController _notesCtrl;
  late TextEditingController _campaignCtrl;
  late TextEditingController _utmSourceCtrl;
  late TextEditingController _utmMediumCtrl;
  late TextEditingController _utmCampaignCtrl;
  late BHLeadSource _source;
  late BHLeadStatus _status;
  String? _assignedTo;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.lead.name);
    _phoneCtrl = TextEditingController(text: widget.lead.phone ?? '');
    _emailCtrl = TextEditingController(text: widget.lead.email ?? '');
    _companyCtrl = TextEditingController(text: widget.lead.company ?? '');
    _notesCtrl = TextEditingController(text: widget.lead.notes ?? '');
    _campaignCtrl = TextEditingController(text: widget.lead.campaign ?? '');
    _utmSourceCtrl = TextEditingController(text: widget.lead.utmSource ?? '');
    _utmMediumCtrl = TextEditingController(text: widget.lead.utmMedium ?? '');
    _utmCampaignCtrl = TextEditingController(text: widget.lead.utmCampaign ?? '');
    _source = widget.lead.source;
    _status = widget.lead.status;
    _assignedTo = widget.lead.assignedTo;
  }

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
            const Text('Редактировать лид', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Имя *', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _phoneCtrl, decoration: const InputDecoration(labelText: 'Телефон', border: OutlineInputBorder()), keyboardType: TextInputType.phone),
            const SizedBox(height: 12),
            TextField(controller: _emailCtrl, decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()), keyboardType: TextInputType.emailAddress),
            const SizedBox(height: 12),
            TextField(controller: _companyCtrl, decoration: const InputDecoration(labelText: 'Компания', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            DropdownButtonFormField<BHLeadStatus>(
              value: _status,
              decoration: const InputDecoration(labelText: 'Статус', border: OutlineInputBorder()),
              items: BHLeadStatus.values.map((s) => DropdownMenuItem(value: s, child: Text(s.label))).toList(),
              onChanged: (v) => setState(() => _status = v ?? _status),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<BHLeadSource>(
              value: _source,
              decoration: const InputDecoration(labelText: 'Источник', border: OutlineInputBorder()),
              items: BHLeadSource.values.map((s) => DropdownMenuItem(value: s, child: Text(s.label))).toList(),
              onChanged: (v) => setState(() => _source = v ?? _source),
            ),
            const SizedBox(height: 12),
            _buildAssignedToDropdown(context),
            TextField(controller: _campaignCtrl, decoration: const InputDecoration(labelText: 'Кампания', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _utmSourceCtrl, decoration: const InputDecoration(labelText: 'UTM source', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _utmMediumCtrl, decoration: const InputDecoration(labelText: 'UTM medium', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _utmCampaignCtrl, decoration: const InputDecoration(labelText: 'UTM campaign', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _notesCtrl, decoration: const InputDecoration(labelText: 'Заметки', border: OutlineInputBorder()), maxLines: 2),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(backgroundColor: AppConstants.primaryColor, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14)),
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
    setState(() => _saving = true);
    try {
      await ref.read(bhLeadsProvider.notifier).update(widget.lead.copyWith(
            name: name,
            phone: _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
            email: _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
            company: _companyCtrl.text.trim().isEmpty ? null : _companyCtrl.text.trim(),
            source: _source,
            status: _status,
            notes: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
            assignedTo: _assignedTo,
            campaign: _campaignCtrl.text.trim().isEmpty ? null : _campaignCtrl.text.trim(),
            utmSource: _utmSourceCtrl.text.trim().isEmpty ? null : _utmSourceCtrl.text.trim(),
            utmMedium: _utmMediumCtrl.text.trim().isEmpty ? null : _utmMediumCtrl.text.trim(),
            utmCampaign: _utmCampaignCtrl.text.trim().isEmpty ? null : _utmCampaignCtrl.text.trim(),
          ));
      widget.onSaved();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Лид обновлён')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

class _AddActivitySheet extends ConsumerStatefulWidget {
  final String? leadId;
  final String? dealId;
  final String createdBy;
  final VoidCallback onSaved;

  const _AddActivitySheet({this.leadId, this.dealId, required this.createdBy, required this.onSaved});

  @override
  ConsumerState<_AddActivitySheet> createState() => _AddActivitySheetState();
}

class _AddActivitySheetState extends ConsumerState<_AddActivitySheet> {
  final _subjectCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  BHActivityType _type = BHActivityType.note;
  DateTime _date = DateTime.now();
  bool _saving = false;

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _descCtrl.dispose();
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
            const Text('Добавить активность', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            DropdownButtonFormField<BHActivityType>(
              value: _type,
              decoration: const InputDecoration(labelText: 'Тип', border: OutlineInputBorder()),
              items: BHActivityType.values.map((t) => DropdownMenuItem(value: t, child: Text(t.label))).toList(),
              onChanged: (v) => setState(() => _type = v ?? _type),
            ),
            const SizedBox(height: 12),
            TextField(controller: _subjectCtrl, decoration: const InputDecoration(labelText: 'Тема *', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _descCtrl, decoration: const InputDecoration(labelText: 'Описание', border: OutlineInputBorder()), maxLines: 2),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Дата'),
              subtitle: Text(DateFormat('dd.MM.yyyy HH:mm').format(_date)),
              trailing: IconButton(
                icon: const Icon(Icons.calendar_today),
                onPressed: () async {
                  final date = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime(2020), lastDate: DateTime.now().add(const Duration(days: 365)));
                  if (!context.mounted) return;
                  if (date != null) {
                    final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(_date));
                    if (!context.mounted) return;
                    if (time != null) setState(() => _date = DateTime(date.year, date.month, date.day, time.hour, time.minute));
                  }
                },
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(backgroundColor: AppConstants.primaryColor, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14)),
              child: _saving ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Сохранить'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    final subject = _subjectCtrl.text.trim();
    if (subject.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Введите тему')));
      return;
    }
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) return;
    setState(() => _saving = true);
    try {
      await ref.read(bhActivitiesProvider.notifier).add(
            type: _type,
            subject: subject,
            description: _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
            activityDate: _date,
            createdBy: widget.createdBy,
            leadId: widget.leadId,
            dealId: widget.dealId,
          );
      widget.onSaved();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Активность добавлена')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

class _EditActivitySheet extends ConsumerStatefulWidget {
  final BHActivity activity;
  final String? leadId;
  final String? dealId;
  final VoidCallback onSaved;

  const _EditActivitySheet({required this.activity, this.leadId, this.dealId, required this.onSaved});

  @override
  ConsumerState<_EditActivitySheet> createState() => _EditActivitySheetState();
}

class _EditActivitySheetState extends ConsumerState<_EditActivitySheet> {
  late TextEditingController _subjectCtrl;
  late TextEditingController _descCtrl;
  late BHActivityType _type;
  late DateTime _date;
  late BHActivityStatus _status;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _subjectCtrl = TextEditingController(text: widget.activity.subject);
    _descCtrl = TextEditingController(text: widget.activity.description ?? '');
    _type = widget.activity.type;
    _date = widget.activity.activityDate;
    _status = widget.activity.status;
  }

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _descCtrl.dispose();
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
            const Text('Редактировать активность', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            DropdownButtonFormField<BHActivityType>(
              value: _type,
              decoration: const InputDecoration(labelText: 'Тип', border: OutlineInputBorder()),
              items: BHActivityType.values.map((t) => DropdownMenuItem(value: t, child: Text(t.label))).toList(),
              onChanged: (v) => setState(() => _type = v ?? _type),
            ),
            const SizedBox(height: 12),
            TextField(controller: _subjectCtrl, decoration: const InputDecoration(labelText: 'Тема *', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _descCtrl, decoration: const InputDecoration(labelText: 'Описание', border: OutlineInputBorder()), maxLines: 2),
            const SizedBox(height: 12),
            DropdownButtonFormField<BHActivityStatus>(
              value: _status,
              decoration: const InputDecoration(labelText: 'Статус', border: OutlineInputBorder()),
              items: BHActivityStatus.values.map((s) => DropdownMenuItem(value: s, child: Text(s.label))).toList(),
              onChanged: (v) => setState(() => _status = v ?? _status),
            ),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Дата'),
              subtitle: Text(DateFormat('dd.MM.yyyy HH:mm').format(_date)),
              trailing: IconButton(
                icon: const Icon(Icons.calendar_today),
                onPressed: () async {
                  final date = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime(2020), lastDate: DateTime.now().add(const Duration(days: 365)));
                  if (!context.mounted) return;
                  if (date != null) {
                    final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(_date));
                    if (!context.mounted) return;
                    if (time != null) setState(() => _date = DateTime(date.year, date.month, date.day, time.hour, time.minute));
                  }
                },
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(backgroundColor: AppConstants.primaryColor, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14)),
              child: _saving ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Сохранить'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    final subject = _subjectCtrl.text.trim();
    if (subject.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Введите тему')));
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(bhActivitiesProvider.notifier).update(widget.activity.copyWith(
            type: _type,
            subject: subject,
            description: _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
            activityDate: _date,
            status: _status,
          ));
      widget.onSaved();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Активность обновлена')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
