import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../constants/app_constants.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../models/business_hub/employee.dart';

class BHHRScreen extends ConsumerStatefulWidget {
  const BHHRScreen({super.key});

  @override
  ConsumerState<BHHRScreen> createState() => _BHHRScreenState();
}

class _BHHRScreenState extends ConsumerState<BHHRScreen> {
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org != null) {
      ref.read(bhEmployeesProvider.notifier).load(org.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final orgAsync = ref.watch(bhOrganizationProvider);
    final employeesAsync = ref.watch(bhEmployeesProvider);
    final formatter = NumberFormat('#,###', 'ru');

    return orgAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e')),
      data: (org) {
        if (org == null) {
          return const Center(child: Text('Создайте компанию'));
        }

        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => context.pop(),
              tooltip: 'Назад к Business Hub',
            ),
            title: const Text('Сотрудники'),
          ),
          body: RefreshIndicator(
            onRefresh: _load,
            child: employeesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Ошибка: $e')),
              data: (employees) {
                if (employees.isEmpty) {
                  return ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      const Text(
                        'Сотрудники',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.all(32),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          children: [
                            Icon(Icons.people_outline, size: 48, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            Text(
                              'Нет сотрудников',
                              style: TextStyle(color: AppConstants.textSecondary),
                            ),
                            const SizedBox(height: 8),
                            TextButton.icon(
                              onPressed: () => _showAddEmployee(context, org.id),
                              icon: const Icon(Icons.add, size: 18),
                              label: const Text('Добавить сотрудника'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  );
                }

                return ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    Row(
                      children: [
                        const Text(
                          'Сотрудники',
                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                        ),
                        const Spacer(),
                        TextButton.icon(
                          onPressed: () => _showAddEmployee(context, org.id),
                          icon: const Icon(Icons.add, size: 18),
                          label: const Text('Добавить'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    ...employees.map((e) => _EmployeeCard(
                          employee: e,
                          formatter: formatter,
                          onEdit: () => _showEditEmployee(context, e),
                          onDelete: () => _confirmDelete(context, e),
                        )),
                    const SizedBox(height: 80),
                  ],
                );
              },
            ),
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _showAddEmployee(context, org.id),
            icon: const Icon(Icons.add),
            label: const Text('Добавить'),
            backgroundColor: AppConstants.primaryColor,
          ),
        );
      },
    );
  }

  void _showAddEmployee(BuildContext context, String orgId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _EmployeeForm(
        onSave: (name, position, inn, phone, email, salary, hireDate) async {
          await ref.read(bhEmployeesProvider.notifier).add(
                fullName: name,
                position: position,
                inn: inn,
                phone: phone,
                email: email,
                salary: salary,
                hireDate: hireDate,
              );
          if (ctx.mounted) Navigator.pop(ctx);
        },
      ),
    );
  }

  void _showEditEmployee(BuildContext context, BHEmployee emp) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _EmployeeForm(
        existing: emp,
        onSave: (name, position, inn, phone, email, salary, hireDate) async {
          await ref.read(bhEmployeesProvider.notifier).update(
                emp.copyWith(
                  fullName: name,
                  position: position,
                  inn: inn,
                  phone: phone,
                  email: email,
                  salary: salary,
                  hireDate: hireDate,
                ),
              );
          if (ctx.mounted) Navigator.pop(ctx);
        },
      ),
    );
  }

  void _confirmDelete(BuildContext context, BHEmployee emp) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Удалить сотрудника?'),
        content: Text('${emp.fullName} будет удалён из списка.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Отмена')),
          TextButton(
            onPressed: () async {
              await ref.read(bhEmployeesProvider.notifier).remove(emp.id);
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Удалить', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

class _EmployeeCard extends StatelessWidget {
  final BHEmployee employee;
  final NumberFormat formatter;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _EmployeeCard({
    required this.employee,
    required this.formatter,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: AppConstants.primaryColor.withOpacity(0.2),
          child: Text(
            employee.fullName.isNotEmpty ? employee.fullName[0].toUpperCase() : '?',
            style: const TextStyle(color: AppConstants.primaryColor, fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(employee.fullName, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (employee.position != null) Text(employee.position!),
            if (employee.salary != null) Text('${formatter.format(employee.salary!)} UZS'),
          ],
        ),
        trailing: PopupMenuButton(
          itemBuilder: (ctx) => [
            const PopupMenuItem(value: 'edit', child: Text('Редактировать')),
            const PopupMenuItem(value: 'delete', child: Text('Удалить', style: TextStyle(color: Colors.red))),
          ],
          onSelected: (v) {
            if (v == 'edit') onEdit();
            if (v == 'delete') onDelete();
          },
        ),
      ),
    );
  }
}

class _EmployeeForm extends StatefulWidget {
  final BHEmployee? existing;
  final Future<void> Function(
    String name,
    String? position,
    String? inn,
    String? phone,
    String? email,
    double? salary,
    DateTime? hireDate,
  ) onSave;

  const _EmployeeForm({this.existing, required this.onSave});

  @override
  State<_EmployeeForm> createState() => _EmployeeFormState();
}

class _EmployeeFormState extends State<_EmployeeForm> {
  final _nameCtrl = TextEditingController();
  final _positionCtrl = TextEditingController();
  final _innCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _salaryCtrl = TextEditingController();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.existing != null) {
      _nameCtrl.text = widget.existing!.fullName;
      _positionCtrl.text = widget.existing!.position ?? '';
      _innCtrl.text = widget.existing!.inn ?? '';
      _phoneCtrl.text = widget.existing!.phone ?? '';
      _emailCtrl.text = widget.existing!.email ?? '';
      _salaryCtrl.text = widget.existing!.salary?.toString() ?? '';
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _positionCtrl.dispose();
    _innCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _salaryCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.existing == null ? 'Новый сотрудник' : 'Редактировать',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _nameCtrl,
              decoration: const InputDecoration(labelText: 'ФИО *'),
            ),
            TextField(
              controller: _positionCtrl,
              decoration: const InputDecoration(labelText: 'Должность'),
            ),
            TextField(
              controller: _innCtrl,
              decoration: const InputDecoration(labelText: 'ИНН'),
              keyboardType: TextInputType.number,
            ),
            TextField(
              controller: _phoneCtrl,
              decoration: const InputDecoration(labelText: 'Телефон'),
              keyboardType: TextInputType.phone,
            ),
            TextField(
              controller: _emailCtrl,
              decoration: const InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
            ),
            TextField(
              controller: _salaryCtrl,
              decoration: const InputDecoration(labelText: 'Зарплата (UZS)'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loading ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppConstants.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Сохранить'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) return;
    setState(() => _loading = true);
    final salary = double.tryParse(_salaryCtrl.text.replaceAll(',', '.'));
    await widget.onSave(
      name,
      _positionCtrl.text.trim().isEmpty ? null : _positionCtrl.text.trim(),
      _innCtrl.text.trim().isEmpty ? null : _innCtrl.text.trim(),
      _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
      _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
      salary,
      null,
    );
    setState(() => _loading = false);
  }
}
