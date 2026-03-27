import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../providers/firestore_auth_provider.dart';
import '../../../constants/app_constants.dart';
import '../../../models/business_hub/deal.dart';
import '../../../providers/business_hub/bh_providers.dart';

class BHDealsScreen extends ConsumerStatefulWidget {
  const BHDealsScreen({super.key});

  @override
  ConsumerState<BHDealsScreen> createState() => _BHDealsScreenState();
}

class _BHDealsScreenState extends ConsumerState<BHDealsScreen> {
  bool _overdueOnly = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final org = ref.read(bhOrganizationProvider).valueOrNull;
      if (org != null) ref.read(bhDealsProvider.notifier).load(org.id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final dealsAsync = ref.watch(bhDealsProvider);
    final formatter = NumberFormat('#,###', 'ru');

    return dealsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e')),
      data: (deals) {
        final visible = _overdueOnly ? deals.where((d) => d.isNextActionOverdue).toList() : deals;
        final byStage = <BHDealStage, List<BHDeal>>{};
        for (final s in BHDealStage.values.where((s) => !s.isClosed)) {
          byStage[s] = visible.where((d) => d.stage == s).toList();
        }

        return RefreshIndicator(
          onRefresh: () async {
            final org = ref.read(bhOrganizationProvider).valueOrNull;
            if (org != null) ref.read(bhDealsProvider.notifier).load(org.id);
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              FilterChip(
                label: const Text('Только просроченные'),
                selected: _overdueOnly,
                onSelected: (v) => setState(() => _overdueOnly = v),
              ),
              const SizedBox(height: 12),
              ...BHDealStage.values.where((s) => !s.isClosed).map((stage) {
                    final list = byStage[stage] ?? [];
                    final total = list.fold<double>(0, (s, d) => s + d.amount);
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            children: [
                              Text(stage.label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                              const SizedBox(width: 8),
                              Text('${list.length} • ${formatter.format(total)} UZS', style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
                            ],
                          ),
                        ),
                        ...list.map((deal) => _DealCard(
                              deal: deal,
                              formatter: formatter,
                              onStageChange: (newStage) => _onDealStageChange(context, deal, newStage),
                              onDelete: () => _deleteDeal(deal),
                            )),
                        const SizedBox(height: 20),
                      ],
                    );
                  }),
            ],
          ),
        );
      },
    );
  }

  Future<void> _onDealStageChange(BuildContext context, BHDeal deal, BHDealStage newStage) async {
    final userId = ref.read(firestoreAuthProvider).user?.id ?? '';
    if (newStage == BHDealStage.lost) {
      final reason = await showModalBottomSheet<BHLostReason>(
        context: context,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        builder: (ctx) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Причина проигрыша', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              ),
              ...BHLostReason.values.map(
                (r) => ListTile(title: Text(r.label), onTap: () => Navigator.pop(ctx, r)),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      );
      if (reason != null && mounted) {
        await ref.read(bhDealsProvider.notifier).update(deal.copyWith(stage: newStage, lostReason: reason));
      }
    } else {
      await ref.read(bhDealsProvider.notifier).updateStage(deal.id, newStage, createdBy: userId);
    }
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
            },
            child: const Text('Удалить', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

class _DealCard extends StatelessWidget {
  final BHDeal deal;
  final NumberFormat formatter;
  final Future<void> Function(BHDealStage) onStageChange;
  final VoidCallback onDelete;

  const _DealCard({
    required this.deal,
    required this.formatter,
    required this.onStageChange,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final overdue = deal.isNextActionOverdue;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/home/services/business-hub/crm/deal/${deal.id}', extra: deal),
        onLongPress: () => _showDealActions(context),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (overdue)
                Container(width: 4, color: Colors.red.shade600),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(deal.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                          ),
                          Text('${formatter.format(deal.amount)} ${deal.currency}',
                              style: const TextStyle(fontWeight: FontWeight.w700, color: AppConstants.primaryColor)),
                        ],
                      ),
                      if (deal.counterpartyName != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(deal.counterpartyName!, style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
                        ),
                      if (overdue) ...[
                        const SizedBox(height: 6),
                        Text(
                          'Просрочено: ${deal.nextAction ?? 'след. действие'}',
                          style: TextStyle(fontSize: 11, color: Colors.red.shade700, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDealActions(BuildContext context) {
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
                    await onStageChange(s);
                  },
                )),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: Colors.red),
              title: const Text('Удалить', style: TextStyle(color: Colors.red)),
              onTap: () {
                Navigator.pop(ctx);
                onDelete();
              },
            ),
          ],
        ),
      ),
    );
  }
}
