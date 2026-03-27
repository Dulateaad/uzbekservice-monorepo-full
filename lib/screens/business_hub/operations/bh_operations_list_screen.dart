import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../constants/app_constants.dart';
import '../../../models/business_hub/operation.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../widgets/business_hub/bh_operation_row.dart';

class BHOperationsListScreen extends ConsumerStatefulWidget {
  const BHOperationsListScreen({super.key});

  @override
  ConsumerState<BHOperationsListScreen> createState() => _BHOperationsListScreenState();
}

class _BHOperationsListScreenState extends ConsumerState<BHOperationsListScreen> {
  OperationType? _filterType;
  OperationStatus? _filterStatus;

  @override
  Widget build(BuildContext context) {
    final opsAsync = ref.watch(bhOperationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Операции'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterSheet,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/home/services/business-hub/operation/new'),
        icon: const Icon(Icons.add),
        label: const Text('Операция'),
        backgroundColor: AppConstants.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: opsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Ошибка: $e')),
        data: (ops) {
          var filtered = ops;
          if (_filterType != null) {
            filtered = filtered.where((o) => o.type == _filterType).toList();
          }
          if (_filterStatus != null) {
            filtered = filtered.where((o) => o.status == _filterStatus).toList();
          }

          if (filtered.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.receipt_long, size: 64, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  Text(
                    _filterType != null || _filterStatus != null
                        ? 'Нет операций с таким фильтром'
                        : 'Нет операций',
                    style: TextStyle(
                      fontSize: 16,
                      color: AppConstants.textSecondary,
                    ),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: filtered.length,
            itemBuilder: (context, index) {
              final op = filtered[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: BHOperationRow(
                  operation: op,
                  onTap: () => context.push(
                    '/home/services/business-hub/operation/${op.id}',
                    extra: op,
                  ),
                  onLongPress: () => _showActions(op),
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text(
                    'Фильтры',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _filterType = null;
                        _filterStatus = null;
                      });
                      Navigator.pop(context);
                    },
                    child: const Text('Сбросить'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text('Тип операции', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: OperationType.values.map((t) {
                  final selected = _filterType == t;
                  return FilterChip(
                    label: Text(t.label),
                    selected: selected,
                    onSelected: (v) {
                      setState(() => _filterType = v ? t : null);
                      Navigator.pop(context);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              const Text('Статус', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: OperationStatus.values.map((s) {
                  final selected = _filterStatus == s;
                  return FilterChip(
                    label: Text(s.label),
                    selected: selected,
                    onSelected: (v) {
                      setState(() => _filterStatus = v ? s : null);
                      Navigator.pop(context);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }

  void _showActions(BHOperation op) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              if (op.type.hasDelivery) ...[
                ListTile(
                  leading: const Icon(Icons.local_shipping, color: Colors.teal),
                  title: const Text('Статус доставки'),
                  subtitle: op.deliveryStatus != null
                      ? Text(op.deliveryStatus!.label, style: const TextStyle(fontSize: 12))
                      : null,
                  onTap: () {
                    Navigator.pop(ctx);
                    _showDeliveryStatusSheet(op);
                  },
                ),
              ],
              if (op.status == OperationStatus.draft)
                ListTile(
                  leading: const Icon(Icons.check_circle_outline, color: Colors.blue),
                  title: const Text('Подтвердить'),
                  onTap: () {
                    ref.read(bhOperationsProvider.notifier).confirmOp(op.id);
                    Navigator.pop(ctx);
                  },
                ),
              ListTile(
                leading: const Icon(Icons.delete_outline, color: Colors.red),
                title: const Text('Удалить'),
                onTap: () {
                  ref.read(bhOperationsProvider.notifier).deleteOp(op.id);
                  Navigator.pop(ctx);
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  void _showDeliveryStatusSheet(BHOperation op) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Статус доставки',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 16),
                ...DeliveryStatus.values.map((ds) {
                  return ListTile(
                    leading: Icon(
                      ds == DeliveryStatus.delivered ? Icons.check_circle : Icons.circle_outlined,
                      color: ds == DeliveryStatus.delivered ? Colors.green : null,
                    ),
                    title: Text(ds.label),
                    onTap: () async {
                      Navigator.pop(ctx);
                      await ref.read(bhOperationsProvider.notifier).updateDeliveryStatus(op, ds);
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Статус: ${ds.label}')),
                        );
                      }
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }
}
