import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../constants/app_constants.dart';
import '../../../models/business_hub/bh_installment.dart';
import '../../../models/work.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';

/// Карточка заказа (Work): график оплат, частичные оплаты, пресеты 3/6/12.
class BHWorkDetailScreen extends ConsumerStatefulWidget {
  const BHWorkDetailScreen({super.key, required this.work});

  final Work work;

  @override
  ConsumerState<BHWorkDetailScreen> createState() => _BHWorkDetailScreenState();
}

class _BHWorkDetailScreenState extends ConsumerState<BHWorkDetailScreen> {
  List<BHInstallment> _rows = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final svc = ref.read(bhFirestoreServiceProvider);
    final list = await svc.getInstallmentsForWork(widget.work.id);
    if (mounted) {
      setState(() {
        _rows = list;
        _loading = false;
      });
    }
  }

  Future<void> _addSchedule(int months) async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) return;
    final price = widget.work.price;
    if (price == null || price <= 0) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Укажите сумму заказа (цена) в данных заказа')),
        );
      }
      return;
    }
    final svc = ref.read(bhFirestoreServiceProvider);
    await svc.createEqualInstallmentSchedule(
      organizationId: org.id,
      workId: widget.work.id,
      totalAmount: price,
      currency: widget.work.currency,
      months: months,
    );
    await _load();
  }

  Future<void> _payLine(BHInstallment row) async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) return;
    final ctrl = TextEditingController(text: row.remaining.toStringAsFixed(0));
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Оплата по графику'),
        content: TextField(
          controller: ctrl,
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
    final raw = ctrl.text;
    ctrl.dispose();
    if (ok != true || !mounted) return;
    final amt = double.tryParse(raw.replaceAll(' ', '')) ?? 0;
    if (amt <= 0) return;
    try {
      await ref.read(bhFirestoreServiceProvider).applyInstallmentPayment(
            installmentId: row.id,
            amount: amt,
            organizationId: org.id,
          );
      ref.invalidate(bhExtendedFinanceProvider(org.id));
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,###', 'ru');
    final dFmt = DateFormat('dd.MM.yyyy');

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Text(widget.work.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [
          PopupMenuButton<int>(
            onSelected: _addSchedule,
            itemBuilder: (_) => const [
              PopupMenuItem(value: 3, child: Text('График на 3 мес.')),
              PopupMenuItem(value: 6, child: Text('График на 6 мес.')),
              PopupMenuItem(value: 12, child: Text('График на 12 мес.')),
            ],
            icon: const Icon(Icons.calendar_month_outlined),
            tooltip: 'Создать график оплат',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  Text(
                    widget.work.type.label,
                    style: TextStyle(color: AppConstants.textSecondary, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text('Статус: ${widget.work.status.label}'),
                  if (widget.work.price != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Сумма: ${fmt.format(widget.work.price)} ${widget.work.currency}',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                  ],
                  if (widget.work.dealId != null)
                    Text('Связь со сделкой: ${widget.work.dealId}', style: const TextStyle(fontSize: 12)),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      const Text(
                        'График оплат',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      const Spacer(),
                      if (_rows.isEmpty)
                        TextButton(
                          onPressed: () => _showScheduleSheet(),
                          child: const Text('Добавить'),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_rows.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('График не задан.'),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            children: [
                              ActionChip(
                                label: const Text('3 мес.'),
                                onPressed: () => _addSchedule(3),
                              ),
                              ActionChip(
                                label: const Text('6 мес.'),
                                onPressed: () => _addSchedule(6),
                              ),
                              ActionChip(
                                label: const Text('12 мес.'),
                                onPressed: () => _addSchedule(12),
                              ),
                            ],
                          ),
                        ],
                      ),
                    )
                  else
                    ..._rows.map((r) {
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(
                            '#${r.sequenceIndex + 1} • ${fmt.format(r.amount)} ${r.currency}',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          subtitle: Text(
                            'Оплатить до ${dFmt.format(r.dueDate)}\n'
                            'Оплачено: ${fmt.format(r.paidAmount)} • Остаток: ${fmt.format(r.remaining)} • ${r.status.name}',
                          ),
                          trailing: r.status == BHInstallmentStatus.paid
                              ? const Icon(Icons.check_circle, color: Colors.green)
                              : IconButton(
                                  icon: const Icon(Icons.payments_outlined),
                                  onPressed: () => _payLine(r),
                                  tooltip: 'Оплатить',
                                ),
                        ),
                      );
                    }),
                  const SizedBox(height: 24),
                  const Text(
                    'CRM-задача по заказу',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  FilledButton.tonalIcon(
                    onPressed: _createFollowUpTask,
                    icon: const Icon(Icons.add_task),
                    label: const Text('Создать задачу с привязкой к заказу'),
                  ),
                ],
              ),
            ),
    );
  }

  void _showScheduleSheet() {
    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Равные платежи — 3 месяца'),
              onTap: () {
                Navigator.pop(ctx);
                _addSchedule(3);
              },
            ),
            ListTile(
              title: const Text('Равные платежи — 6 месяцев'),
              onTap: () {
                Navigator.pop(ctx);
                _addSchedule(6);
              },
            ),
            ListTile(
              title: const Text('Равные платежи — 12 месяцев'),
              onTap: () {
                Navigator.pop(ctx);
                _addSchedule(12);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _createFollowUpTask() async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    final user = ref.read(firestoreAuthProvider).user;
    if (org == null || user == null) return;
    await ref.read(bhCrmServiceProvider).createCrmTask(
          organizationId: org.id,
          title: 'По заказу: ${widget.work.title}',
          workId: widget.work.id,
          dealId: widget.work.dealId,
          assignedTo: user.id,
          dueDate: DateTime.now().add(const Duration(days: 3)),
          createdBy: user.id,
        );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Задача создана')));
    }
  }
}
