import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../constants/app_constants.dart';
import '../../../models/business_hub/operation.dart';
import '../../../models/business_hub/organization.dart';
import '../../../models/business_hub/counterparty.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../services/business_hub/bh_export_service.dart';
import '../../../services/business_hub/bh_document_service.dart';
import '../../../widgets/business_hub/bh_health_gauge.dart';

class BHReportsScreen extends ConsumerStatefulWidget {
  const BHReportsScreen({super.key});

  @override
  ConsumerState<BHReportsScreen> createState() => _BHReportsScreenState();
}

class _BHReportsScreenState extends ConsumerState<BHReportsScreen> {
  final _docService = BHDocumentService();

  @override
  Widget build(BuildContext context) {
    final bhsAsync = ref.watch(bhHealthScoreProvider);
    final opsAsync = ref.watch(bhOperationsProvider);
    final orgAsync = ref.watch(bhOrganizationProvider);
    final formatter = NumberFormat('#,###', 'ru');
    final exportService = BHExportService();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Отчёты'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.download),
            onSelected: (value) async {
              final org = orgAsync.valueOrNull;
              final ops = opsAsync.valueOrNull ?? [];
              final bhs = bhsAsync.valueOrNull;
              final counterparties = ref.read(bhCounterpartiesProvider).valueOrNull ?? [];
              if (org == null) return;

              try {
                if (value == 'excel') {
                  final bytes = await exportService.exportOperationsToExcel(operations: ops, org: org);
                  await exportService.shareFile(bytes, 'operations_${DateTime.now().millisecondsSinceEpoch}.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                } else if (value == 'pdf_ops') {
                  final pdf = await exportService.exportOperationsToPdf(operations: ops, org: org);
                  await exportService.printPdf(pdf);
                } else if (value == 'pdf_bhs' && bhs != null) {
                  final pdf = await exportService.exportBHSToPdf(bhs: bhs, org: org);
                  await exportService.printPdf(pdf);
                } else if (value == 'invoice' || value == 'act') {
                  if (counterparties.isEmpty) {
                    if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Добавьте контрагента')));
                    return;
                  }
                  if (context.mounted) {
                    _showDocumentDialog(context, org, ops, counterparties, value == 'invoice');
                  }
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red),
                  );
                }
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'excel', child: Text('Экспорт Excel')),
              const PopupMenuItem(value: 'pdf_ops', child: Text('PDF операций')),
              const PopupMenuItem(value: 'pdf_bhs', child: Text('PDF BHS')),
              const PopupMenuItem(value: 'invoice', child: Text('Создать счёт')),
              const PopupMenuItem(value: 'act', child: Text('Создать акт')),
            ],
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // BHS Detail
          const Text('Business Health Score', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          bhsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, __) => const Text('Ошибка'),
            data: (bhs) {
              if (bhs == null) return const Text('Нет данных');
              return Column(
                children: [
                  BHHealthGauge(bhs: bhs, size: 150),
                  const SizedBox(height: 20),
                  _ComponentRow(label: 'Финансы', value: bhs.components.finance, weight: '40%'),
                  _ComponentRow(label: 'Продажи', value: bhs.components.sales, weight: '25%'),
                  _ComponentRow(label: 'Операции', value: bhs.components.operations, weight: '20%'),
                  _ComponentRow(label: 'Персонал', value: bhs.components.personnel, weight: '15%'),
                ],
              );
            },
          ),
          const SizedBox(height: 32),

          // Income / Expense breakdown by type
          const Text('Разбивка по типам', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          opsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, __) => const Text('Ошибка'),
            data: (ops) {
              if (ops.isEmpty) {
                return Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(child: Text('Нет данных для отчёта')),
                );
              }

              final byType = <OperationType, double>{};
              for (final op in ops) {
                byType[op.type] = (byType[op.type] ?? 0) + op.amount;
              }

              final sorted = byType.entries.toList()
                ..sort((a, b) => b.value.compareTo(a.value));

              return Column(
                children: sorted.map((entry) {
                  final isIncome = entry.key.isIncome;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppConstants.borderColor),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 8,
                          height: 40,
                          decoration: BoxDecoration(
                            color: isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            entry.key.label,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                        Text(
                          '${formatter.format(entry.value)} UZS',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              );
            },
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  void _showDocumentDialog(
    BuildContext context,
    BHOrganization org,
    List<BHOperation> ops,
    List<BHCounterparty> counterparties,
    bool isInvoice,
  ) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                isInvoice ? 'Выберите контрагента для счёта' : 'Выберите контрагента для акта',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            ...counterparties.map((cp) {
              final items = ops.where((o) => o.counterpartyId == cp.id || o.counterpartyName == cp.name).where((o) => o.type.isIncome).toList();
              return ListTile(
                title: Text(cp.name),
                subtitle: Text('${items.length} операций'),
                onTap: () async {
                  Navigator.pop(ctx);
                  if (items.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Нет доходных операций по этому контрагенту')));
                    return;
                  }
                  final docNum = '${DateTime.now().year}${DateTime.now().month.toString().padLeft(2, '0')}${DateTime.now().day.toString().padLeft(2, '0')}-${items.length}';
                  final pdf = isInvoice
                      ? await _docService.generateInvoice(org: org, counterparty: cp, items: items, documentNumber: docNum)
                      : await _docService.generateAct(org: org, counterparty: cp, items: items, documentNumber: docNum);
                  final name = isInvoice ? 'invoice_$docNum.pdf' : 'act_$docNum.pdf';
                  await _docService.sharePdf(pdf, name);
                },
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _ComponentRow extends StatelessWidget {
  final String label;
  final double value;
  final String weight;

  const _ComponentRow({
    required this.label,
    required this.value,
    required this.weight,
  });

  @override
  Widget build(BuildContext context) {
    Color barColor;
    if (value >= 80) {
      barColor = const Color(0xFF10B981);
    } else if (value >= 50) {
      barColor = const Color(0xFFF59E0B);
    } else {
      barColor = const Color(0xFFEF4444);
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        children: [
          Row(
            children: [
              Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
              const SizedBox(width: 4),
              Text('($weight)', style: TextStyle(fontSize: 12, color: AppConstants.textHint)),
              const Spacer(),
              Text(
                '${value.toInt()}/100',
                style: TextStyle(fontWeight: FontWeight.w600, color: barColor),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: value / 100,
              backgroundColor: Colors.grey.shade200,
              valueColor: AlwaysStoppedAnimation(barColor),
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }
}
