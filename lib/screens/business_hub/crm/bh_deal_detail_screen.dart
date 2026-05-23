import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../constants/app_constants.dart';
import '../../../models/business_hub/activity.dart';
import '../../../models/business_hub/crm_company.dart';
import '../../../models/business_hub/crm_contact.dart';
import '../../../models/business_hub/crm_deal_document.dart';
import '../../../models/business_hub/crm_deal_item.dart';
import '../../../models/business_hub/crm_pipeline.dart';
import '../../../models/business_hub/crm_product.dart';
import '../../../models/business_hub/deal.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';

class BHDealDetailScreen extends ConsumerStatefulWidget {
  final BHDeal deal;

  const BHDealDetailScreen({super.key, required this.deal});

  @override
  ConsumerState<BHDealDetailScreen> createState() => _BHDealDetailScreenState();
}

class _BHDealDetailScreenState extends ConsumerState<BHDealDetailScreen> {
  List<BHCrmDealItem> _dealItems = [];
  List<BHCrmDealDocument> _dealDocs = [];
  List<BHCrmPipeline> _pipelines = [];
  List<BHCrmCompany> _crmCompanies = [];
  List<BHCrmContact> _crmContacts = [];
  List<BHCrmProduct> _crmProducts = [];

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
      ref.read(bhActivitiesProvider.notifier).load(org.id, dealId: widget.deal.id);
      ref.read(bhMembersProvider.notifier).load(org.id);
      final crm = ref.read(bhCrmServiceProvider);
      await crm.ensureDefaultPipelines(org.id);
      final items = await crm.getDealItems(org.id, widget.deal.id);
      final docs = await crm.getDealDocuments(org.id, widget.deal.id);
      final pipes = await crm.getPipelines(org.id);
      final comps = await crm.getCompanies(org.id);
      final conts = await crm.getContacts(org.id);
      final prods = await crm.getProducts(org.id);
      if (mounted) {
        setState(() {
          _dealItems = items;
          _dealDocs = docs;
          _pipelines = pipes;
          _crmCompanies = comps;
          _crmContacts = conts;
          _crmProducts = prods;
        });
      }
    }
  }

  String? _pipelineName(String? id) {
    if (id == null) return null;
    return _pipelines.where((x) => x.id == id).firstOrNull?.name;
  }

  String? _companyName(String? id) {
    if (id == null) return null;
    return _crmCompanies.where((x) => x.id == id).firstOrNull?.name;
  }

  String? _contactName(String? id) {
    if (id == null) return null;
    return _crmContacts.where((x) => x.id == id).firstOrNull?.name;
  }

  BHDeal _effectiveDeal() {
    final list = ref.watch(bhDealsProvider).valueOrNull;
    if (list == null) return widget.deal;
    for (final d in list) {
      if (d.id == widget.deal.id) return d;
    }
    return widget.deal;
  }

  @override
  Widget build(BuildContext context) {
    final deal = _effectiveDeal();
    final spec = ref.watch(bhBusinessVerticalSpecProvider);
    final activitiesAsync = ref.watch(bhActivitiesProvider);
    final formatter = NumberFormat('#,###', 'ru');
    final dateFormat = DateFormat('dd.MM.yyyy');

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
          tooltip: 'Назад',
        ),
        title: Text(deal.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => _showEditDeal(context, deal),
            tooltip: 'Редактировать',
          ),
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'delete') _deleteDeal(deal);
            },
            itemBuilder: (_) => [
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
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('${formatter.format(deal.amount)} ${deal.currency}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppConstants.primaryColor)),
                        _DealStageChip(stage: deal.stage, onTap: () => _showStagePicker(context, deal)),
                      ],
                    ),
                    if (deal.counterpartyName != null) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Icon(Icons.person_outline, size: 18, color: AppConstants.textSecondary),
                          const SizedBox(width: 8),
                          Text(deal.counterpartyName!, style: const TextStyle(fontSize: 15)),
                        ],
                      ),
                    ],
                    if (deal.assignedTo != null) ...[
                      const SizedBox(height: 8),
                      _AssignedToRow(assignedToUserId: deal.assignedTo!),
                    ],
                    if (deal.notes != null && deal.notes!.isNotEmpty) ...[
                      const Divider(height: 24),
                      Text('Заметки', style: TextStyle(fontSize: 12, color: AppConstants.textSecondary, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(deal.notes!, style: const TextStyle(fontSize: 14)),
                    ],
                    const SizedBox(height: 8),
                    Text('Создана: ${dateFormat.format(deal.createdAt)}', style: TextStyle(fontSize: 11, color: AppConstants.textSecondary)),
                    if (deal.expectedCloseDate != null) Text('Ожидаемое закрытие: ${dateFormat.format(deal.expectedCloseDate!)}', style: TextStyle(fontSize: 11, color: AppConstants.textSecondary)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        Chip(
                          label: Text(deal.priority.label, style: const TextStyle(fontSize: 12)),
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                        ),
                        Chip(
                          label: Text(deal.dealType.label, style: const TextStyle(fontSize: 12)),
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                        ),
                        if (deal.probability > 0)
                          Chip(
                            label: Text('Вероятность ${deal.probability}%', style: const TextStyle(fontSize: 12)),
                            visualDensity: VisualDensity.compact,
                            padding: EdgeInsets.zero,
                          ),
                      ],
                    ),
                    if (deal.stage == BHDealStage.lost && deal.lostReason != null) ...[
                      const SizedBox(height: 8),
                      Text('Причина проигрыша: ${deal.lostReason!.label}', style: TextStyle(fontSize: 13, color: Colors.red.shade800, fontWeight: FontWeight.w600)),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Связи CRM', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppConstants.textSecondary)),
                    const SizedBox(height: 6),
                    Text('Воронка: ${_pipelineName(deal.pipelineId) ?? '—'}', style: const TextStyle(fontSize: 13)),
                    Text('Компания: ${_companyName(deal.companyId) ?? '—'}', style: const TextStyle(fontSize: 13)),
                    Text('Контакт: ${_contactName(deal.contactId) ?? '—'}', style: const TextStyle(fontSize: 13)),
                  ],
                ),
              ),
            ),
            if (deal.saleContext != null && deal.saleContext!.isNotEmpty) ...[
              const SizedBox(height: 12),
              _SaleContextCard(
                context_: deal.saleContext!,
                onEdit: () => _editSaleContext(deal),
              ),
            ],
            if (deal.nextAction != null || deal.nextActionDate != null) ...[
              const SizedBox(height: 12),
              Card(
                color: deal.isNextActionOverdue ? Colors.red.shade50 : null,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Следующее действие', style: TextStyle(fontSize: 12, color: AppConstants.textSecondary, fontWeight: FontWeight.w600)),
                      if (deal.nextAction != null && deal.nextAction!.isNotEmpty) Text(deal.nextAction!, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                      if (deal.nextActionDate != null)
                        Text(
                          DateFormat('dd.MM.yyyy HH:mm').format(deal.nextActionDate!),
                          style: TextStyle(fontSize: 13, color: deal.isNextActionOverdue ? Colors.red.shade900 : AppConstants.textSecondary),
                        ),
                      if (deal.nextActionDone) Text('Выполнено', style: TextStyle(fontSize: 12, color: Colors.green.shade700, fontWeight: FontWeight.w600)),
                      if (deal.isNextActionOverdue)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text('Просрочено', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.red.shade800)),
                        ),
                    ],
                  ),
                ),
              ),
            ],
            if (deal.stage == BHDealStage.won) ...[
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text('Финансы и исполнение', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                      const SizedBox(height: 12),
                      if (deal.operationId != null)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.receipt_long, color: Color(0xFF10B981)),
                          title: const Text('Операция дохода'),
                          subtitle: const Text('Открыть в операциях'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () async {
                            final org = ref.read(bhOrganizationProvider).valueOrNull;
                            if (org == null) return;
                            final op = await ref.read(bhFirestoreServiceProvider).getOperationById(org.id, deal.operationId!);
                            if (!context.mounted) return;
                            if (op != null) {
                              context.push('/home/services/business-hub/operation/${op.id}', extra: op);
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Операция не найдена')));
                            }
                          },
                        )
                      else if (deal.amount > 0)
                        OutlinedButton.icon(
                          onPressed: () async {
                            final uid = ref.read(firestoreAuthProvider).user?.id ?? '';
                            try {
                              await ref.read(bhDealsProvider.notifier).createSaleOperationForDeal(deal.id, uid);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Операция создана')));
                                setState(() {});
                              }
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: Colors.red));
                              }
                            }
                          },
                          icon: const Icon(Icons.add_card),
                          label: const Text('Создать операцию'),
                        )
                      else
                        Text('Укажите сумму сделки, чтобы создать операцию', style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
                      const SizedBox(height: 8),
                      if (deal.workId != null)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.work_outline, color: Color(0xFF6366F1)),
                          title: const Text('Заказ в Work'),
                          subtitle: const Text('Список заказов'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => context.push('/home/services/business-hub/works'),
                        )
                      else
                        OutlinedButton.icon(
                          onPressed: () async {
                            final uid = ref.read(firestoreAuthProvider).user?.id ?? '';
                            try {
                              await ref.read(bhDealsProvider.notifier).createWorkOrderForDeal(deal.id, uid);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Заказ создан в Work')));
                                setState(() {});
                              }
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: Colors.red));
                              }
                            }
                          },
                          icon: const Icon(Icons.shopping_bag_outlined),
                          label: const Text('Создать заказ (Work)'),
                        ),
                      const SizedBox(height: 8),
                      if (deal.subscriptionId != null)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.subscriptions_outlined, color: Color(0xFF8B5CF6)),
                          title: const Text('Подписка'),
                          subtitle: Text('ID: ${deal.subscriptionId}', style: const TextStyle(fontSize: 11)),
                        )
                      else
                        OutlinedButton.icon(
                          onPressed: () => _showCreateSubscriptionSheet(context, deal),
                          icon: const Icon(Icons.subscriptions_outlined),
                          label: const Text('Оформить подписку'),
                        ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Text(spec.dealPositionsHeading, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline),
                          tooltip: 'Добавить позицию',
                          onPressed: () => _showAddDealLineSheet(context, deal),
                        ),
                      ],
                    ),
                    if (_dealItems.isEmpty)
                      Text(spec.emptyDealLinesHint, style: TextStyle(fontSize: 12, color: AppConstants.textSecondary))
                    else
                      ..._dealItems.map((i) {
                        return ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text(i.productName ?? i.productId, style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text('${i.qty} × ${formatter.format(i.price)} = ${formatter.format(i.total)}'),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete_outline, color: Colors.red),
                            onPressed: () => _confirmDeleteDealItem(context, deal, i),
                          ),
                        );
                      }),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Text('Документы', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.link),
                          tooltip: 'Добавить ссылку',
                          onPressed: () => _showAddDealDocumentSheet(context, deal),
                        ),
                      ],
                    ),
                    if (_dealDocs.isEmpty)
                      Text('Нет документов', style: TextStyle(fontSize: 12, color: AppConstants.textSecondary))
                    else
                      ..._dealDocs.map((d) {
                        return ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.description_outlined),
                          title: Text(d.title),
                          subtitle: Text(d.url, maxLines: 1, overflow: TextOverflow.ellipsis),
                          trailing: IconButton(
                            icon: const Icon(Icons.open_in_new, size: 20),
                            onPressed: () async {
                              final u = Uri.tryParse(d.url);
                              if (u != null && await canLaunchUrl(u)) {
                                await launchUrl(u, mode: LaunchMode.externalApplication);
                              }
                            },
                          ),
                        );
                      }),
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
                  onPressed: () => _showAddActivity(context, dealId: deal.id),
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
                              onPressed: () => _showAddActivity(context, dealId: deal.id),
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
                    dateFormat: DateFormat('dd.MM.yyyy HH:mm'),
                    onEdit: () => _showEditActivity(context, a, dealId: deal.id),
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

  void _showCreateSubscriptionSheet(BuildContext context, BHDeal deal) {
    final planCtrl = TextEditingController(text: 'Подписка');
    final priceCtrl = TextEditingController(text: deal.amount > 0 ? deal.amount.toStringAsFixed(0) : '');
    var start = DateTime.now();
    var end = DateTime.now().add(const Duration(days: 365));
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSt) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Подписка по сделке', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                TextField(controller: planCtrl, decoration: const InputDecoration(labelText: 'План', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(
                  controller: priceCtrl,
                  decoration: const InputDecoration(labelText: 'Цена', border: OutlineInputBorder()),
                  keyboardType: TextInputType.number,
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Начало: ${DateFormat('dd.MM.yyyy').format(start)}'),
                  trailing: const Icon(Icons.calendar_today),
                  onTap: () async {
                    final d = await showDatePicker(
                      context: ctx,
                      initialDate: start,
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now().add(const Duration(days: 3650)),
                    );
                    if (d != null) setSt(() => start = d);
                  },
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Окончание: ${DateFormat('dd.MM.yyyy').format(end)}'),
                  trailing: const Icon(Icons.calendar_today),
                  onTap: () async {
                    final d = await showDatePicker(
                      context: ctx,
                      initialDate: end,
                      firstDate: start,
                      lastDate: DateTime.now().add(const Duration(days: 3650)),
                    );
                    if (d != null) setSt(() => end = d);
                  },
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () async {
                    try {
                      await ref.read(bhDealsProvider.notifier).createSubscriptionForDeal(
                            deal.id,
                            plan: planCtrl.text.trim().isEmpty ? 'Подписка' : planCtrl.text.trim(),
                            startDate: start,
                            endDate: end,
                            price: double.tryParse(priceCtrl.text.trim()),
                          );
                      if (ctx.mounted) Navigator.pop(ctx);
                      await _load();
                      if (context.mounted) {
                        setState(() {});
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Подписка создана')));
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: Colors.red));
                      }
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: AppConstants.primaryColor, foregroundColor: Colors.white),
                  child: const Text('Сохранить'),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showAddDealLineSheet(BuildContext context, BHDeal deal) {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    final spec = ref.read(bhBusinessVerticalSpecProvider);
    if (org == null) return;
    if (_crmProducts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(spec.addCatalogFirstMessage)),
      );
      return;
    }
    var selected = _crmProducts.first;
    final qtyCtrl = TextEditingController(text: '1');
    final priceCtrl = TextEditingController(
      text: selected.price > 0 ? selected.price.toStringAsFixed(0) : '',
    );
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSt) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(spec.dealPositionSheetTitle, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                DropdownButtonFormField<BHCrmProduct>(
                  value: selected,
                  decoration: InputDecoration(labelText: spec.crmProductFieldLabel, border: const OutlineInputBorder()),
                  items: _crmProducts
                      .map((p) => DropdownMenuItem(value: p, child: Text(p.name)))
                      .toList(),
                  onChanged: (p) {
                    if (p != null) {
                      setSt(() {
                        selected = p;
                        if (p.price > 0) priceCtrl.text = p.price.toStringAsFixed(0);
                      });
                    }
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: qtyCtrl,
                  decoration: const InputDecoration(labelText: 'Кол-во', border: OutlineInputBorder()),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: priceCtrl,
                  decoration: const InputDecoration(labelText: 'Цена за ед. (UZS)', border: OutlineInputBorder()),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () async {
                    final qty = double.tryParse(qtyCtrl.text.trim().replaceAll(',', '.')) ?? 1;
                    final price = double.tryParse(priceCtrl.text.trim().replaceAll(',', '.')) ?? 0;
                    if (price <= 0) {
                      ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Укажите цену')));
                      return;
                    }
                    try {
                      await ref.read(bhCrmServiceProvider).addDealItem(
                            organizationId: org.id,
                            dealId: deal.id,
                            productId: selected.id,
                            productName: selected.name,
                            qty: qty,
                            price: price,
                          );
                      if (ctx.mounted) Navigator.pop(ctx);
                      await _load();
                      if (context.mounted) {
                        setState(() {});
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Позиция добавлена')));
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: Colors.red));
                      }
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: AppConstants.primaryColor, foregroundColor: Colors.white),
                  child: const Text('Добавить'),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showAddDealDocumentSheet(BuildContext context, BHDeal deal) {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) return;
    final uid = ref.read(firestoreAuthProvider).user?.id ?? '';
    if (uid.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Войдите в аккаунт')));
      return;
    }
    final titleCtrl = TextEditingController();
    final urlCtrl = TextEditingController();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
          left: 20,
          right: 20,
          top: 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Документ (ссылка)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Название', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: urlCtrl, decoration: const InputDecoration(labelText: 'URL', border: OutlineInputBorder())),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () async {
                final t = titleCtrl.text.trim();
                final u = urlCtrl.text.trim();
                if (t.isEmpty || u.isEmpty) {
                  ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Заполните поля')));
                  return;
                }
                try {
                  await ref.read(bhCrmServiceProvider).addDealDocument(
                        organizationId: org.id,
                        dealId: deal.id,
                        title: t,
                        url: u,
                        createdBy: uid,
                      );
                  if (ctx.mounted) Navigator.pop(ctx);
                  await _load();
                  if (context.mounted) {
                    setState(() {});
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Документ добавлен')));
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: Colors.red));
                  }
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppConstants.primaryColor, foregroundColor: Colors.white),
              child: const Text('Сохранить'),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDeleteDealItem(BuildContext context, BHDeal deal, BHCrmDealItem item) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Удалить позицию?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Отмена')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Удалить')),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    try {
      await ref.read(bhCrmServiceProvider).deleteDealItem(item.id);
      await _load();
      setState(() {});
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Позиция удалена')));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: Colors.red));
      }
    }
  }

  void _showEditDeal(BuildContext context, BHDeal deal) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _EditDealSheet(
        deal: deal,
        onSaved: () {
          Navigator.pop(ctx);
          setState(() {});
        },
      ),
    );
  }

  void _showEditActivity(BuildContext context, BHActivity activity, {String? dealId}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _EditActivitySheet(
        activity: activity,
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

  void _showAddActivity(BuildContext context, {String? dealId}) {
    final userId = ref.read(firestoreAuthProvider).user?.id ?? '';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _AddActivitySheet(
        dealId: dealId,
        createdBy: userId,
        onSaved: () {
          Navigator.pop(ctx);
          _load();
        },
      ),
    );
  }

  void _showStagePicker(BuildContext context, BHDeal deal) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(padding: EdgeInsets.all(16), child: Text('Изменить этап', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
            ...BHDealStage.values.map((s) => ListTile(
                  title: Text(s.label),
                  trailing: deal.stage == s ? const Icon(Icons.check, color: Colors.green) : null,
                  onTap: () async {
                    Navigator.pop(ctx);
                    if (s == BHDealStage.lost) {
                      if (!context.mounted) return;
                      final reason = await showModalBottomSheet<BHLostReason>(
                        context: context,
                        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                        builder: (c2) => SafeArea(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Padding(
                                padding: EdgeInsets.all(16),
                                child: Text('Причина проигрыша', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                              ),
                              ...BHLostReason.values.map(
                                (r) => ListTile(title: Text(r.label), onTap: () => Navigator.pop(c2, r)),
                              ),
                            ],
                          ),
                        ),
                      );
                      if (reason != null && mounted) {
                        await ref.read(bhDealsProvider.notifier).update(deal.copyWith(stage: BHDealStage.lost, lostReason: reason));
                        setState(() {});
                      }
                    } else {
                      final userId = ref.read(firestoreAuthProvider).user?.id ?? '';
                      await ref.read(bhDealsProvider.notifier).updateStage(deal.id, s, createdBy: userId);
                      if (mounted) setState(() {});
                    }
                  },
                )),
          ],
        ),
      ),
    );
  }

  void _editSaleContext(BHDeal deal) {
    final entries = (deal.saleContext ?? {}).entries.map((e) => MapEntry(e.key, e.value.toString())).toList();
    final keyControllers = entries.map((e) => TextEditingController(text: e.key)).toList();
    final valControllers = entries.map((e) => TextEditingController(text: e.value)).toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return StatefulBuilder(builder: (ctx, setSheetState) {
          return Padding(
            padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: MediaQuery.of(ctx).viewInsets.bottom + 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Контекст продажи', style: Theme.of(ctx).textTheme.titleMedium),
                    IconButton(
                      icon: const Icon(Icons.add_circle_outline),
                      onPressed: () {
                        setSheetState(() {
                          keyControllers.add(TextEditingController());
                          valControllers.add(TextEditingController());
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                for (int i = 0; i < keyControllers.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Expanded(child: TextField(controller: keyControllers[i], decoration: const InputDecoration(labelText: 'Ключ', isDense: true))),
                        const SizedBox(width: 8),
                        Expanded(child: TextField(controller: valControllers[i], decoration: const InputDecoration(labelText: 'Значение', isDense: true))),
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline, size: 20),
                          onPressed: () => setSheetState(() {
                            keyControllers.removeAt(i);
                            valControllers.removeAt(i);
                          }),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () {
                      final map = <String, dynamic>{};
                      for (int i = 0; i < keyControllers.length; i++) {
                        final k = keyControllers[i].text.trim();
                        if (k.isNotEmpty) map[k] = valControllers[i].text.trim();
                      }
                      final updated = deal.copyWith(
                        saleContext: map.isNotEmpty ? map : null,
                        clearSaleContext: map.isEmpty,
                      );
                      ref.read(bhDealsProvider.notifier).update(updated);
                      Navigator.pop(ctx);
                    },
                    child: const Text('Сохранить'),
                  ),
                ),
              ],
            ),
          );
        });
      },
    );
  }

  void _deleteDeal(BHDeal deal) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Удалить сделку?'),
        content: Text('Сделка "${deal.title}" будет удалена.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Отмена')),
          TextButton(
            onPressed: () {
              ref.read(bhDealsProvider.notifier).remove(deal.id);
              Navigator.pop(ctx);
              context.pop();
            },
            child: const Text('Удалить', style: TextStyle(color: Colors.red)),
          ),
        ],
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

class _DealStageChip extends StatelessWidget {
  final BHDealStage stage;
  final VoidCallback onTap;

  const _DealStageChip({required this.stage, required this.onTap});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (stage) {
      case BHDealStage.won:
        color = Colors.green;
        break;
      case BHDealStage.lost:
        color = Colors.red;
        break;
      default:
        color = Colors.orange;
    }
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(stage.label, style: TextStyle(fontSize: 13, color: color, fontWeight: FontWeight.w600)),
            const SizedBox(width: 4),
            Icon(Icons.arrow_drop_down, size: 18, color: color),
          ],
        ),
      ),
    );
  }
}

class _SaleContextCard extends StatelessWidget {
  final Map<String, dynamic> context_;
  final VoidCallback onEdit;

  const _SaleContextCard({required this.context_, required this.onEdit});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Контекст продажи', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppConstants.textSecondary)),
                GestureDetector(onTap: onEdit, child: Icon(Icons.edit, size: 18, color: AppConstants.textSecondary)),
              ],
            ),
            const SizedBox(height: 6),
            for (final e in context_.entries)
              Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: Row(
                  children: [
                    Text('${e.key}: ', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    Expanded(child: Text('${e.value}', style: const TextStyle(fontSize: 13))),
                  ],
                ),
              ),
          ],
        ),
      ),
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

class _EditDealSheet extends ConsumerStatefulWidget {
  final BHDeal deal;
  final VoidCallback onSaved;

  const _EditDealSheet({required this.deal, required this.onSaved});

  @override
  ConsumerState<_EditDealSheet> createState() => _EditDealSheetState();
}

class _EditDealSheetState extends ConsumerState<_EditDealSheet> {
  late TextEditingController _titleCtrl;
  late TextEditingController _amountCtrl;
  late TextEditingController _notesCtrl;
  late TextEditingController _nextActionCtrl;
  late BHDealStage _stage;
  String? _assignedTo;
  DateTime? _nextActionDate;
  bool _nextActionDone = false;
  BHDealPriority _priority = BHDealPriority.medium;
  BHDealType _dealType = BHDealType.new_;
  int _probability = 0;
  bool _saving = false;
  List<BHCrmPipeline> _pipelines = [];
  List<BHCrmCompany> _companies = [];
  List<BHCrmContact> _contacts = [];
  String? _pipelineId;
  String? _companyId;
  String? _contactId;

  List<BHCrmContact> _contactsForDropdown() {
    final filtered = _companyId == null ? _contacts : _contacts.where((c) => c.companyId == _companyId).toList();
    if (_contactId != null && filtered.where((c) => c.id == _contactId).isEmpty) {
      final cur = _contacts.where((c) => c.id == _contactId).firstOrNull;
      if (cur != null) return [...filtered, cur];
    }
    return filtered;
  }

  @override
  void initState() {
    super.initState();
    _titleCtrl = TextEditingController(text: widget.deal.title);
    _amountCtrl = TextEditingController(text: widget.deal.amount > 0 ? widget.deal.amount.toStringAsFixed(0) : '');
    _notesCtrl = TextEditingController(text: widget.deal.notes ?? '');
    _nextActionCtrl = TextEditingController(text: widget.deal.nextAction ?? '');
    _stage = widget.deal.stage;
    _assignedTo = widget.deal.assignedTo;
    _nextActionDate = widget.deal.nextActionDate;
    _nextActionDone = widget.deal.nextActionDone;
    _priority = widget.deal.priority;
    _dealType = widget.deal.dealType;
    _probability = widget.deal.probability;
    _pipelineId = widget.deal.pipelineId;
    _companyId = widget.deal.companyId;
    _contactId = widget.deal.contactId;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final org = ref.read(bhOrganizationProvider).valueOrNull;
      if (org == null || !mounted) return;
      final crm = ref.read(bhCrmServiceProvider);
      await crm.ensureDefaultPipelines(org.id);
      final pipes = await crm.getPipelines(org.id);
      final comps = await crm.getCompanies(org.id);
      final conts = await crm.getContacts(org.id);
      if (!mounted) return;
      setState(() {
        _pipelines = pipes;
        _companies = comps;
        _contacts = conts;
        _pipelineId ??= pipes.isNotEmpty ? pipes.first.id : widget.deal.pipelineId;
      });
    });
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _amountCtrl.dispose();
    _notesCtrl.dispose();
    _nextActionCtrl.dispose();
    super.dispose();
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
            const Text('Редактировать сделку', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            TextField(controller: _titleCtrl, decoration: const InputDecoration(labelText: 'Название *', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _amountCtrl, decoration: const InputDecoration(labelText: 'Сумма (UZS)', border: OutlineInputBorder()), keyboardType: TextInputType.number),
            const SizedBox(height: 12),
            DropdownButtonFormField<BHDealStage>(
              value: _stage,
              decoration: const InputDecoration(labelText: 'Этап', border: OutlineInputBorder()),
              items: BHDealStage.values.map((s) => DropdownMenuItem(value: s, child: Text(s.label))).toList(),
              onChanged: (v) => setState(() => _stage = v ?? _stage),
            ),
            const SizedBox(height: 12),
            if (_pipelines.isNotEmpty) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: DropdownButtonFormField<String>(
                  value: _pipelineId != null && _pipelines.any((p) => p.id == _pipelineId) ? _pipelineId : _pipelines.first.id,
                  decoration: const InputDecoration(labelText: 'Воронка', border: OutlineInputBorder()),
                  items: _pipelines.map((p) => DropdownMenuItem(value: p.id, child: Text('${p.name} (${p.scenarioLabel})'))).toList(),
                  onChanged: (v) => setState(() => _pipelineId = v),
                ),
              ),
              Builder(builder: (_) {
                final pipe = _pipelines.where((p) => p.id == _pipelineId).firstOrNull;
                if (pipe == null || (pipe.defaultTitlePrefix == null && pipe.defaultNotesTemplate == null && pipe.contextDefaults.isEmpty)) {
                  return const SizedBox(height: 12);
                }
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Card(
                    color: Colors.blue.shade50,
                    child: Padding(
                      padding: const EdgeInsets.all(10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Шаблон воронки', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.blue.shade800)),
                          if (pipe.defaultTitlePrefix != null) Text('Префикс: ${pipe.defaultTitlePrefix}', style: const TextStyle(fontSize: 12)),
                          if (pipe.defaultNotesTemplate != null) Text('Заметки: ${pipe.defaultNotesTemplate!.length > 60 ? '${pipe.defaultNotesTemplate!.substring(0, 60)}...' : pipe.defaultNotesTemplate}', style: const TextStyle(fontSize: 12)),
                          if (pipe.contextDefaults.isNotEmpty)
                            Text('Контекст: ${pipe.contextDefaults.entries.map((e) => '${e.key}=${e.value}').join(', ')}', style: const TextStyle(fontSize: 12)),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ],
            DropdownButtonFormField<String?>(
              value: _companyId,
              decoration: const InputDecoration(labelText: 'Компания (CRM)', border: OutlineInputBorder()),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('—')),
                ..._companies.map((c) => DropdownMenuItem<String?>(value: c.id, child: Text(c.name))),
              ],
              onChanged: (v) => setState(() {
                _companyId = v;
                if (v != null && _contactId != null) {
                  final ct = _contacts.where((c) => c.id == _contactId).firstOrNull;
                  if (ct != null && ct.companyId != v) _contactId = null;
                }
              }),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String?>(
              value: _contactId,
              decoration: const InputDecoration(labelText: 'Контакт (CRM)', border: OutlineInputBorder()),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('—')),
                ..._contactsForDropdown().map((c) => DropdownMenuItem<String?>(value: c.id, child: Text(c.name))),
              ],
              onChanged: (v) => setState(() => _contactId = v),
            ),
            const SizedBox(height: 12),
            _buildAssignedToDropdown(context),
            TextField(controller: _notesCtrl, decoration: const InputDecoration(labelText: 'Заметки', border: OutlineInputBorder()), maxLines: 2),
            const SizedBox(height: 12),
            const Text('Следующее действие', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(controller: _nextActionCtrl, decoration: const InputDecoration(labelText: 'Что сделать', border: OutlineInputBorder())),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Срок'),
              subtitle: Text(_nextActionDate == null ? 'Не задан' : DateFormat('dd.MM.yyyy HH:mm').format(_nextActionDate!)),
              trailing: IconButton(
                icon: const Icon(Icons.event),
                onPressed: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: _nextActionDate ?? DateTime.now(),
                    firstDate: DateTime(2020),
                    lastDate: DateTime.now().add(const Duration(days: 730)),
                  );
                  if (!context.mounted || date == null) return;
                  final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(_nextActionDate ?? DateTime.now()));
                  if (!context.mounted || time == null) return;
                  setState(() => _nextActionDate = DateTime(date.year, date.month, date.day, time.hour, time.minute));
                },
              ),
            ),
            TextButton(
              onPressed: () => setState(() => _nextActionDate = null),
              child: const Text('Сбросить срок'),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Следующее действие выполнено'),
              value: _nextActionDone,
              onChanged: (v) => setState(() => _nextActionDone = v),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<BHDealPriority>(
              value: _priority,
              decoration: const InputDecoration(labelText: 'Приоритет', border: OutlineInputBorder()),
              items: BHDealPriority.values.map((p) => DropdownMenuItem(value: p, child: Text(p.label))).toList(),
              onChanged: (v) => setState(() => _priority = v ?? _priority),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<BHDealType>(
              value: _dealType,
              decoration: const InputDecoration(labelText: 'Тип сделки', border: OutlineInputBorder()),
              items: BHDealType.values.map((t) => DropdownMenuItem(value: t, child: Text(t.label))).toList(),
              onChanged: (v) => setState(() => _dealType = v ?? _dealType),
            ),
            const SizedBox(height: 12),
            Text('Вероятность закрытия: $_probability%', style: const TextStyle(fontWeight: FontWeight.w500)),
            Slider(
              value: _probability.toDouble(),
              min: 0,
              max: 100,
              divisions: 20,
              label: '$_probability%',
              onChanged: (v) => setState(() => _probability = v.round()),
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
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Введите название')));
      return;
    }
    final amount = double.tryParse(_amountCtrl.text.trim()) ?? 0;
    final uid = ref.read(firestoreAuthProvider).user?.id ?? '';
    final stageChanged = _stage != widget.deal.stage;
    setState(() => _saving = true);
    try {
      await ref.read(bhDealsProvider.notifier).update(widget.deal.copyWith(
            title: title,
            amount: amount,
            stage: stageChanged ? widget.deal.stage : _stage,
            notes: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
            assignedTo: _assignedTo,
            nextAction: _nextActionCtrl.text.trim().isEmpty ? null : _nextActionCtrl.text.trim(),
            nextActionDate: _nextActionDate,
            clearNextActionDate: _nextActionDate == null,
            nextActionDone: _nextActionDone,
            priority: _priority,
            dealType: _dealType,
            probability: _probability,
            pipelineId: _pipelineId,
            companyId: _companyId,
            contactId: _contactId,
          ));
      if (stageChanged) {
        await ref.read(bhDealsProvider.notifier).updateStage(widget.deal.id, _stage, createdBy: uid);
      }
      widget.onSaved();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Сделка обновлена')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

class _AddActivitySheet extends ConsumerStatefulWidget {
  final String? dealId;
  final String createdBy;
  final VoidCallback onSaved;

  const _AddActivitySheet({this.dealId, required this.createdBy, required this.onSaved});

  @override
  ConsumerState<_AddActivitySheet> createState() => _AddActivitySheetDealState();
}

class _AddActivitySheetDealState extends ConsumerState<_AddActivitySheet> {
  final _subjectCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  BHActivityType _type = BHActivityType.note;
  DateTime _date = DateTime.now();
  bool _closeNextAction = false;
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
            if (widget.dealId != null)
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Закрыть следующее действие по сделке'),
                value: _closeNextAction,
                onChanged: (v) => setState(() => _closeNextAction = v),
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
            dealId: widget.dealId,
          );
      if (_closeNextAction && widget.dealId != null) {
        final deals = ref.read(bhDealsProvider).valueOrNull;
        BHDeal? d;
        if (deals != null) {
          for (final x in deals) {
            if (x.id == widget.dealId) {
              d = x;
              break;
            }
          }
        }
        if (d != null) {
          await ref.read(bhDealsProvider.notifier).update(d.copyWith(nextActionDone: true));
        }
      }
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
  final String? dealId;
  final VoidCallback onSaved;

  const _EditActivitySheet({required this.activity, this.dealId, required this.onSaved});

  @override
  ConsumerState<_EditActivitySheet> createState() => _EditActivitySheetDealState();
}

class _EditActivitySheetDealState extends ConsumerState<_EditActivitySheet> {
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
