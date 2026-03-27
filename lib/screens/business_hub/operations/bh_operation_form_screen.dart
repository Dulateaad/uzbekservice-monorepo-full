import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../constants/app_constants.dart';
import '../../../models/business_hub/operation.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';

class BHOperationFormScreen extends ConsumerStatefulWidget {
  final BHOperation? existing;
  const BHOperationFormScreen({super.key, this.existing});

  @override
  ConsumerState<BHOperationFormScreen> createState() => _BHOperationFormScreenState();
}

class _BHOperationFormScreenState extends ConsumerState<BHOperationFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late OperationType _type;
  late DateTime _date;
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();
  final _counterpartyController = TextEditingController();
  String? _counterpartyId;
  String _currency = 'UZS';
  bool _isTaxable = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _type = e?.type ?? OperationType.sale;
    _date = e?.date ?? DateTime.now();
    if (e != null) {
      _amountController.text = e.amount.toStringAsFixed(0);
      _notesController.text = e.notes ?? '';
      _counterpartyController.text = e.counterpartyName ?? '';
      _counterpartyId = e.counterpartyId;
      _currency = e.currency;
      _isTaxable = e.isTaxable;
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _notesController.dispose();
    _counterpartyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.existing != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Редактировать' : 'Новая операция'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Type selector
            const Text('Тип операции', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            DropdownButtonFormField<OperationType>(
              value: _type,
              isExpanded: true,
              decoration: _inputDecoration('Выберите тип'),
              items: OperationType.values
                  .map((t) => DropdownMenuItem(value: t, child: Text(t.label)))
                  .toList(),
              onChanged: (v) => setState(() => _type = v!),
            ),
            const SizedBox(height: 20),

            // Date
            const Text('Дата', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  border: Border.all(color: AppConstants.borderColor),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_today, size: 18),
                    const SizedBox(width: 12),
                    Text(
                      DateFormat('dd MMMM yyyy', 'ru').format(_date),
                      style: const TextStyle(fontSize: 15),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Amount + Currency
            const Text('Сумма', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: TextFormField(
                    controller: _amountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))],
                    decoration: _inputDecoration('0'),
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'Введите сумму';
                      if (double.tryParse(v) == null) return 'Некорректная сумма';
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _currency,
                    decoration: _inputDecoration(''),
                    items: ['UZS', 'USD', 'EUR', 'KZT']
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) => setState(() => _currency = v!),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Counterparty
            const Text('Контрагент', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Consumer(
              builder: (context, ref, _) {
                final cps = ref.watch(bhCounterpartiesProvider).valueOrNull ?? [];
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (cps.isNotEmpty)
                      DropdownButtonFormField<String?>(
                        value: _counterpartyId != null && cps.any((c) => c.id == _counterpartyId) ? _counterpartyId : null,
                        decoration: _inputDecoration('Выберите из списка'),
                        items: [
                          const DropdownMenuItem(value: null, child: Text('— Ввести вручную —')),
                          ...cps.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))),
                        ],
                        onChanged: (v) {
                          setState(() {
                            _counterpartyId = v;
                            if (v != null) {
                              final cp = cps.firstWhere((c) => c.id == v);
                              _counterpartyController.text = cp.name;
                            } else {
                              _counterpartyController.clear();
                            }
                          });
                        },
                      ),
                    if (cps.isNotEmpty) const SizedBox(height: 8),
                    TextFormField(
                      controller: _counterpartyController,
                      decoration: _inputDecoration('Имя контрагента (необязательно)'),
                      onChanged: (_) => setState(() => _counterpartyId = null),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 20),

            // Связь со сделкой (только при просмотре)
            if (isEditing && widget.existing?.dealId != null) ...[
              Consumer(
                builder: (context, ref, _) {
                  final org = ref.watch(bhOrganizationProvider).valueOrNull;
                  if (org == null) return const SizedBox.shrink();
                  return FutureBuilder(
                    future: ref.read(bhFirestoreServiceProvider).getDeal(org.id, widget.existing!.dealId!),
                    builder: (context, snapshot) {
                      final deal = snapshot.data;
                      if (deal == null) return const SizedBox.shrink();
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 20),
                        child: InkWell(
                          onTap: () => context.push(
                            '/home/services/business-hub/crm/deal/${deal.id}',
                            extra: deal,
                          ),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF8B5CF6).withOpacity(0.08),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFF8B5CF6).withOpacity(0.3)),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.handshake_outlined, color: const Color(0xFF8B5CF6), size: 20),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Создано из сделки',
                                        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                      ),
                                      Text(
                                        deal.title,
                                        style: TextStyle(fontSize: 12, color: AppConstants.textSecondary),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(Icons.arrow_forward_ios, size: 12, color: const Color(0xFF8B5CF6)),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ],

            // Tax toggle
            SwitchListTile(
              value: _isTaxable,
              onChanged: (v) => setState(() => _isTaxable = v),
              title: const Text('Облагается налогом'),
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 12),

            // Notes
            const Text('Примечание', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _notesController,
              maxLines: 3,
              decoration: _inputDecoration('Дополнительная информация'),
            ),
            const SizedBox(height: 32),

            // Submit
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppConstants.primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: _saving
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(
                        isEditing ? 'Сохранить' : 'Создать операцию',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                      ),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppConstants.borderColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppConstants.primaryColor),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    try {
      final user = ref.read(firestoreAuthProvider).user;
      final amount = double.parse(_amountController.text);
      final counterpartyName = _counterpartyController.text.trim().isEmpty
          ? null
          : _counterpartyController.text.trim();
      final notes = _notesController.text.trim().isEmpty
          ? null
          : _notesController.text.trim();

      final notifier = ref.read(bhOperationsProvider.notifier);
      if (widget.existing != null) {
        final updated = widget.existing!.copyWith(
          type: _type,
          date: _date,
          amount: amount,
          currency: _currency,
          counterpartyId: _counterpartyId,
          counterpartyName: counterpartyName,
          isTaxable: _isTaxable,
          notes: notes,
        );
        await notifier.updateOp(updated);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Операция сохранена'), backgroundColor: Color(0xFF10B981)),
          );
        }
      } else {
        await notifier.addOperation(
          type: _type,
          date: _date,
          amount: amount,
          createdBy: user?.id ?? '',
          currency: _currency,
          counterpartyId: _counterpartyId,
          counterpartyName: counterpartyName,
          isTaxable: _isTaxable,
          notes: notes,
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Операция создана'), backgroundColor: Color(0xFF10B981)),
          );
        }
      }
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
