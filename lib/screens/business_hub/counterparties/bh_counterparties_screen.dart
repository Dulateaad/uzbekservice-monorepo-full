import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../constants/app_constants.dart';
import '../../../models/business_hub/counterparty.dart';
import '../../../providers/business_hub/bh_providers.dart';

class BHCounterpartiesScreen extends ConsumerWidget {
  const BHCounterpartiesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cpAsync = ref.watch(bhCounterpartiesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Контрагенты')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddDialog(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Добавить'),
        backgroundColor: AppConstants.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: cpAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Ошибка: $e')),
        data: (list) {
          if (list.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.people_outline, size: 64, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  Text(
                    'Нет контрагентов',
                    style: TextStyle(fontSize: 16, color: AppConstants.textSecondary),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Добавьте поставщиков и клиентов',
                    style: TextStyle(fontSize: 13, color: AppConstants.textHint),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final cp = list[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  leading: CircleAvatar(
                    backgroundColor: const Color(0xFF8B5CF6).withOpacity(0.1),
                    child: Text(
                      cp.name.isNotEmpty ? cp.name[0].toUpperCase() : '?',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF8B5CF6),
                      ),
                    ),
                  ),
                  title: Text(cp.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(cp.type.label, style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
                      if (cp.inn != null)
                        Text('ИНН: ${cp.inn}', style: TextStyle(fontSize: 12, color: AppConstants.textHint)),
                    ],
                  ),
                  trailing: IconButton(
                    icon: Icon(Icons.delete_outline, color: Colors.red.shade300),
                    onPressed: () => _confirmDelete(context, ref, cp),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showAddDialog(BuildContext context, WidgetRef ref) {
    final nameCtrl = TextEditingController();
    final innCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    var selectedType = CounterpartyType.legalEntity;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Новый контрагент'),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Название *',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<CounterpartyType>(
                      value: selectedType,
                      decoration: const InputDecoration(
                        labelText: 'Тип',
                        border: OutlineInputBorder(),
                      ),
                      items: CounterpartyType.values
                          .map((t) => DropdownMenuItem(value: t, child: Text(t.label)))
                          .toList(),
                      onChanged: (v) => setDialogState(() => selectedType = v!),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: innCtrl,
                      decoration: const InputDecoration(
                        labelText: 'ИНН / СТИР',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: phoneCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Телефон',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.phone,
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Отмена'),
                ),
                ElevatedButton(
                  onPressed: () {
                    if (nameCtrl.text.trim().isEmpty) return;
                    ref.read(bhCounterpartiesProvider.notifier).add(
                      name: nameCtrl.text.trim(),
                      type: selectedType,
                      inn: innCtrl.text.trim().isEmpty ? null : innCtrl.text.trim(),
                      phone: phoneCtrl.text.trim().isEmpty ? null : phoneCtrl.text.trim(),
                    );
                    Navigator.pop(ctx);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppConstants.primaryColor,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Добавить'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _confirmDelete(BuildContext context, WidgetRef ref, BHCounterparty cp) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Удалить контрагента?'),
        content: Text('${cp.name} будет удалён навсегда'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Отмена'),
          ),
          TextButton(
            onPressed: () {
              ref.read(bhCounterpartiesProvider.notifier).remove(cp.id);
              Navigator.pop(ctx);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Удалить'),
          ),
        ],
      ),
    );
  }
}
