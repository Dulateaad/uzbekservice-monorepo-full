import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../constants/app_constants.dart';
import '../../../models/business_hub/lead.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';

class BHLeadsScreen extends ConsumerStatefulWidget {
  const BHLeadsScreen({super.key});

  @override
  ConsumerState<BHLeadsScreen> createState() => _BHLeadsScreenState();
}

class _BHLeadsScreenState extends ConsumerState<BHLeadsScreen> {
  BHLeadStatus? _filterStatus;
  String? _filterAssignedTo; // userId для фильтра «Мои» или по сотруднику

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final org = ref.read(bhOrganizationProvider).valueOrNull;
      if (org != null) ref.read(bhMembersProvider.notifier).load(org.id);
      _load();
    });
  }

  Future<void> _load() async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org != null) {
      ref.read(bhLeadsProvider.notifier).load(org.id, status: _filterStatus, assignedTo: _filterAssignedTo);
    }
  }

  @override
  Widget build(BuildContext context) {
    final leadsAsync = ref.watch(bhLeadsProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              _FilterChip(
                label: 'Все',
                selected: _filterStatus == null && _filterAssignedTo == null,
                onTap: () {
                  setState(() {
                    _filterStatus = null;
                    _filterAssignedTo = null;
                  });
                  _load();
                },
              ),
              _FilterChip(
                label: 'Мои',
                selected: _filterAssignedTo != null,
                onTap: () {
                  final userId = ref.read(firestoreAuthProvider).user?.id;
                  setState(() {
                    _filterAssignedTo = userId;
                  });
                  _load();
                },
              ),
              ...BHLeadStatus.values.map((s) => _FilterChip(
                    label: s.label,
                    selected: _filterStatus == s,
                    onTap: () {
                      setState(() => _filterStatus = s);
                      _load();
                    },
                  )),
            ],
          ),
        ),
        Expanded(
          child: leadsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Ошибка: $e')),
            data: (leads) {
              if (leads.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people_outline, size: 64, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      Text('Нет лидов', style: TextStyle(fontSize: 16, color: AppConstants.textSecondary)),
                    ],
                  ),
                );
              }
              return RefreshIndicator(
                onRefresh: _load,
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: leads.length,
                  itemBuilder: (_, i) {
                    final lead = leads[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        onTap: () => context.push('/home/services/business-hub/crm/lead/${lead.id}', extra: lead),
                        leading: CircleAvatar(
                          backgroundColor: AppConstants.primaryColor.withValues(alpha: 0.2),
                          child: Text(lead.name.isNotEmpty ? lead.name[0].toUpperCase() : '?', style: const TextStyle(color: AppConstants.primaryColor, fontWeight: FontWeight.w600)),
                        ),
                        title: Text(lead.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (lead.company != null) Text(lead.company!, style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
                            if (lead.phone != null) Text(lead.phone!, style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
                            const SizedBox(height: 4),
                            _LeadStatusChip(status: lead.status),
                          ],
                        ),
                        trailing: PopupMenuButton<String>(
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
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
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
            },
            child: const Text('Удалить', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
      ),
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
      margin: const EdgeInsets.only(top: 4),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
      child: Text(status.label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
    );
  }
}
