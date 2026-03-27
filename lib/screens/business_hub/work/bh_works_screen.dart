import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../constants/app_constants.dart';
import '../../../models/work.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';

class BHWorksScreen extends ConsumerStatefulWidget {
  const BHWorksScreen({super.key});

  @override
  ConsumerState<BHWorksScreen> createState() => _BHWorksScreenState();
}

class _BHWorksScreenState extends ConsumerState<BHWorksScreen> {
  WorkType? _filterType;
  WorkStatus? _filterStatus;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org != null) {
      ref.read(bhWorksProvider.notifier).load(
            org.id,
            type: _filterType,
            status: _filterStatus,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final worksAsync = ref.watch(bhWorksProvider);
    final formatter = NumberFormat('#,###', 'ru');

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
          tooltip: 'Назад',
        ),
        title: const Text('Работы'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _showAddWork,
            tooltip: 'Добавить',
          ),
        ],
      ),
      body: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _Chip(
                  label: 'Все',
                  selected: _filterType == null && _filterStatus == null,
                  onTap: () {
                    setState(() {
                      _filterType = null;
                      _filterStatus = null;
                    });
                    _load();
                  },
                ),
                ...WorkType.values.map((t) => _Chip(
                      label: t.label,
                      selected: _filterType == t,
                      onTap: () {
                        setState(() {
                          _filterType = t;
                          _filterStatus = null;
                        });
                        _load();
                      },
                    )),
              ],
            ),
          ),
          Expanded(
            child: worksAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Ошибка: $e')),
              data: (works) {
                if (works.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.work_outline, size: 64, color: Colors.grey.shade300),
                        const SizedBox(height: 16),
                        Text(
                          'Нет работ',
                          style: TextStyle(fontSize: 16, color: AppConstants.textSecondary),
                        ),
                        const SizedBox(height: 8),
                        TextButton.icon(
                          onPressed: _showAddWork,
                          icon: const Icon(Icons.add),
                          label: const Text('Добавить работу'),
                        ),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: works.length,
                    itemBuilder: (_, i) {
                      final w = works[i];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: _colorForType(w.type).withValues(alpha: 0.2),
                            child: Icon(_iconForType(w.type), color: _colorForType(w.type), size: 20),
                          ),
                          title: Text(w.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  _TypeChip(type: w.type),
                                  const SizedBox(width: 6),
                                  _StatusChip(status: w.status),
                                ],
                              ),
                              if (w.price != null)
                                Text(
                                  '${formatter.format(w.price)} ${w.currency}',
                                  style: TextStyle(fontSize: 12, color: AppConstants.textSecondary),
                                ),
                            ],
                          ),
                          trailing: PopupMenuButton<String>(
                            onSelected: (v) {
                              if (v == 'status') _showStatusSheet(w);
                              if (v == 'delete') _deleteWork(w);
                            },
                            itemBuilder: (_) => [
                              const PopupMenuItem(value: 'status', child: Text('Изменить статус')),
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
      ),
    );
  }

  void _showAddWork() {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    final user = ref.read(firestoreAuthProvider).user;
    if (org == null || user == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _AddWorkSheet(
        onSaved: () {
          Navigator.pop(ctx);
          _load();
        },
      ),
    );
  }

  void _showStatusSheet(Work work) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Изменить статус', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            ),
            ...WorkStatus.values.map((s) => ListTile(
                  title: Text(s.label),
                  trailing: work.status == s ? const Icon(Icons.check, color: Colors.green) : null,
                  onTap: () {
                    ref.read(bhWorksProvider.notifier).updateStatus(work.id, s);
                    Navigator.pop(ctx);
                    _load();
                  },
                )),
          ],
        ),
      ),
    );
  }

  void _deleteWork(Work work) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Удалить?'),
        content: Text('Работа "${work.title}" будет удалена.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Отмена')),
          TextButton(
            onPressed: () {
              ref.read(bhWorksProvider.notifier).remove(work.id);
              Navigator.pop(ctx);
              _load();
            },
            child: const Text('Удалить', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Color _colorForType(WorkType t) {
    switch (t) {
      case WorkType.order:
      case WorkType.delivery:
        return Colors.teal;
      case WorkType.jobPosition:
      case WorkType.jobApplication:
        return Colors.blue;
      case WorkType.serviceRequest:
        return Colors.purple;
      case WorkType.task:
        return Colors.orange;
      default:
        return AppConstants.primaryColor;
    }
  }

  IconData _iconForType(WorkType t) {
    switch (t) {
      case WorkType.order:
        return Icons.shopping_cart;
      case WorkType.delivery:
        return Icons.local_shipping;
      case WorkType.jobPosition:
      case WorkType.jobApplication:
        return Icons.work;
      case WorkType.serviceRequest:
        return Icons.build;
      case WorkType.task:
        return Icons.task_alt;
      default:
        return Icons.assignment;
    }
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _Chip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label, style: const TextStyle(fontSize: 12)),
        selected: selected,
        onSelected: (_) => onTap(),
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  final WorkType type;

  const _TypeChip({required this.type});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.blue.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(type.label, style: const TextStyle(fontSize: 10, color: Colors.blue, fontWeight: FontWeight.w600)),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final WorkStatus status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case WorkStatus.completed:
        color = Colors.green;
        break;
      case WorkStatus.inProgress:
        color = Colors.blue;
        break;
      case WorkStatus.cancelled:
      case WorkStatus.failed:
        color = Colors.red;
        break;
      default:
        color = Colors.orange;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(status.label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
    );
  }
}

class _AddWorkSheet extends ConsumerStatefulWidget {
  final VoidCallback onSaved;

  const _AddWorkSheet({required this.onSaved});

  @override
  ConsumerState<_AddWorkSheet> createState() => _AddWorkSheetState();
}

class _AddWorkSheetState extends ConsumerState<_AddWorkSheet> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  WorkType _type = WorkType.task;
  bool _saving = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
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
            const Text('Новая работа', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            TextField(
              controller: _titleCtrl,
              decoration: const InputDecoration(labelText: 'Название *', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<WorkType>(
              value: _type,
              decoration: const InputDecoration(labelText: 'Тип', border: OutlineInputBorder()),
              items: WorkType.values.map((t) => DropdownMenuItem(value: t, child: Text(t.label))).toList(),
              onChanged: (v) => setState(() => _type = v ?? WorkType.task),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descCtrl,
              decoration: const InputDecoration(labelText: 'Описание', border: OutlineInputBorder()),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _priceCtrl,
              decoration: const InputDecoration(labelText: 'Сумма (UZS)', border: OutlineInputBorder()),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppConstants.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Создать'),
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
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    final user = ref.read(firestoreAuthProvider).user;
    if (org == null || user == null) return;

    setState(() => _saving = true);
    try {
      await ref.read(bhWorksProvider.notifier).add(
            type: _type,
            title: title,
            description: _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
            price: double.tryParse(_priceCtrl.text.replaceAll(' ', '')),
            createdBy: user.id,
          );
      widget.onSaved();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Работа создана')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
