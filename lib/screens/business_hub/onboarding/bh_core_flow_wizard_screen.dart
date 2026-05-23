import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../constants/app_constants.dart';
import '../../../models/business_hub/deal.dart';
import '../../../models/business_hub/lead.dart';
import '../../../models/business_hub/organization.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';

/// Онбординг по ТЗ: клиент → квалификация (сделка) → выигрыш → заказ.
class BHCoreFlowWizardScreen extends ConsumerStatefulWidget {
  const BHCoreFlowWizardScreen({super.key});

  @override
  ConsumerState<BHCoreFlowWizardScreen> createState() => _BHCoreFlowWizardScreenState();
}

class _BHCoreFlowWizardScreenState extends ConsumerState<BHCoreFlowWizardScreen> {
  int _step = 0;

  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  BHLeadSource _source = BHLeadSource.other;

  final _amountCtrl = TextEditingController(text: '100000');

  BHLead? _lead;
  BHDeal? _deal;
  bool _busy = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _finishAndMarkOnboarding(BHOrganization org) async {
    await ref.read(bhOrganizationProvider.notifier).update(
          org.copyWith(bhOnboardingComplete: true),
        );
  }

  Future<void> _step1CreateLead(String organizationId, String assignedTo) async {
    if (_nameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Введите имя клиента')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final lead = await ref.read(bhFirestoreServiceProvider).createLead(
            organizationId: organizationId,
            name: _nameCtrl.text.trim(),
            phone: _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
            status: BHLeadStatus.new_,
            source: _source,
            assignedTo: assignedTo,
          );
      setState(() {
        _lead = lead;
        _step = 1;
      });
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _step2Qualify() async {
    final lead = _lead;
    if (lead == null) return;
    setState(() => _busy = true);
    try {
      final svc = ref.read(bhFirestoreServiceProvider);
      await svc.updateLead(lead.copyWith(status: BHLeadStatus.qualified));
      BHDeal? deal;
      for (var i = 0; i < 8; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 150));
        deal = await svc.getDealByLeadId(lead.id);
        if (deal != null) break;
      }
      if (!mounted) return;
      setState(() => _deal = deal);
      if (deal != null) {
        setState(() => _step = 2);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Сделка не создана автоматически. Откройте CRM → Лиды.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _step3WinAndOrder(BHOrganization org) async {
    final deal = _deal;
    final user = ref.read(firestoreAuthProvider).user;
    if (deal == null || user == null) return;

    final raw = _amountCtrl.text.replaceAll(RegExp(r'\s'), '').replaceAll(',', '.');
    final amt = double.tryParse(raw) ?? 0;

    setState(() => _busy = true);
    try {
      final svc = ref.read(bhFirestoreServiceProvider);
      final wonDeal = deal.copyWith(stage: BHDealStage.won, amount: amt);
      await svc.updateDeal(wonDeal);
      await svc.createOrderFromDeal(deal: wonDeal, createdBy: user.id);

      await _finishAndMarkOnboarding(org);

      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Шаг 4'),
          content: const Text(
            'Добавьте график оплат к заказу: список заказов → откройте заказ и задайте расписание (или позже в финансах).',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Понятно'),
            ),
          ],
        ),
      );
      if (mounted) {
        context.go('/home/services/business-hub');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final org = ref.watch(bhOrganizationProvider).valueOrNull;
    final user = ref.watch(firestoreAuthProvider).user;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
        title: const Text('Быстрый старт'),
      ),
      body: org == null || user == null
          ? const Center(child: Text('Нет организации или входа'))
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                Text(
                  'Шаг ${_step + 1} из 3',
                  style: TextStyle(color: AppConstants.textSecondary, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                Row(
                  children: List.generate(3, (i) {
                    final done = i < _step;
                    final cur = i == _step;
                    return Expanded(
                      child: Container(
                        margin: EdgeInsets.only(right: i < 2 ? 8 : 0),
                        height: 4,
                        decoration: BoxDecoration(
                          color: done || cur ? AppConstants.primaryColor : Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 28),
                if (_step == 0) ...[
                  const Text(
                    'Добавьте первого клиента (лид)',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Имя *',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Телефон',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<BHLeadSource>(
                    value: _source,
                    decoration: const InputDecoration(
                      labelText: 'Источник',
                      border: OutlineInputBorder(),
                    ),
                    items: BHLeadSource.values
                        .map((s) => DropdownMenuItem(value: s, child: Text(s.label)))
                        .toList(),
                    onChanged: _busy ? null : (v) => setState(() => _source = v ?? BHLeadSource.other),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _busy ? null : () => _step1CreateLead(org.id, user.id),
                      child: _busy
                          ? const SizedBox(
                              height: 22,
                              width: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Далее'),
                    ),
                  ),
                ],
                if (_step == 1) ...[
                  const Text(
                    'Переведите лида в «Квалифицирован» — создастся сделка',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  if (_lead != null)
                    Text(
                      '${_lead!.name} • ${_lead!.phone ?? 'без телефона'}',
                      style: TextStyle(color: AppConstants.textSecondary),
                    ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _busy ? null : _step2Qualify,
                      child: _busy
                          ? const SizedBox(
                              height: 22,
                              width: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Квалифицировать'),
                    ),
                  ),
                ],
                if (_step == 2) ...[
                  const Text(
                    'Закройте сделку и создайте заказ',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  if (_deal != null)
                    Text(
                      _deal!.title,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _amountCtrl,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Сумма сделки (${_deal?.currency ?? 'UZS'})',
                      border: const OutlineInputBorder(),
                      hintText: NumberFormat('#,###', 'ru').format(100000),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _busy ? null : () => _step3WinAndOrder(org),
                      child: _busy
                          ? const SizedBox(
                              height: 22,
                              width: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Выиграть сделку и создать заказ'),
                    ),
                  ),
                ],
              ],
            ),
    );
  }
}
