import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../constants/app_constants.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';
import '../../../widgets/business_hub/bh_health_gauge.dart';
import '../../../widgets/business_hub/bh_stat_card.dart';
import '../../../widgets/business_hub/bh_operation_row.dart';

class BHDashboardScreen extends ConsumerStatefulWidget {
  const BHDashboardScreen({super.key});

  @override
  ConsumerState<BHDashboardScreen> createState() => _BHDashboardScreenState();
}

class _BHDashboardScreenState extends ConsumerState<BHDashboardScreen> {
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final user = ref.read(firestoreAuthProvider).user;
    if (user == null) return;

    final orgNotifier = ref.read(bhOrganizationProvider.notifier);
    await orgNotifier.loadByOwner(user.id);

    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org != null) {
      ref.read(bhHealthScoreProvider.notifier).load(org.id);
      ref.read(bhDashboardStatsProvider.notifier).load(org.id);
      ref.read(bhOperationsProvider.notifier).load(org.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final orgAsync = ref.watch(bhOrganizationProvider);
    final bhsAsync = ref.watch(bhHealthScoreProvider);
    final statsAsync = ref.watch(bhDashboardStatsProvider);
    final opsAsync = ref.watch(bhOperationsProvider);
    final formatter = NumberFormat('#,###', 'ru');

    return orgAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e')),
      data: (org) {
        if (org == null) {
          return _buildNoOrganization(context);
        }

        return RefreshIndicator(
          onRefresh: _loadData,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // Header
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          org.name,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          org.industry,
                          style: TextStyle(
                            fontSize: 14,
                            color: AppConstants.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () async {
                      await ref.read(bhHealthScoreProvider.notifier).recalculate(org.id);
                      ref.read(bhDashboardStatsProvider.notifier).load(org.id);
                    },
                    icon: const Icon(Icons.refresh),
                    tooltip: 'Обновить BHS',
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // BHS Gauge
              Center(
                child: bhsAsync.when(
                  loading: () => const SizedBox(
                    height: 180,
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (_, __) => const Text('Ошибка загрузки BHS'),
                  data: (bhs) => BHHealthGauge(bhs: bhs, size: 180),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  'Business Health Score',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppConstants.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // AI Reasons & Recommendations
              bhsAsync.whenData((bhs) {
                if (bhs == null) return const SizedBox.shrink();
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F9FF),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFBAE6FD)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.auto_awesome, color: AppConstants.primaryColor, size: 18),
                          const SizedBox(width: 8),
                          const Text(
                            'AI Аналитика',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      for (final reason in bhs.topReasons)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('• ', style: TextStyle(fontWeight: FontWeight.bold)),
                              Expanded(child: Text(reason, style: const TextStyle(fontSize: 13))),
                            ],
                          ),
                        ),
                      if (bhs.recommendations.isNotEmpty) ...[
                        const Divider(height: 20),
                        for (final rec in bhs.recommendations)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('💡 ', style: TextStyle(fontSize: 13)),
                                Expanded(
                                  child: Text(rec, style: const TextStyle(fontSize: 13)),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ],
                  ),
                );
              }).valueOrNull ?? const SizedBox.shrink(),
              const SizedBox(height: 24),

              // Stat cards
              statsAsync.when(
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
                data: (stats) {
                  final income = (stats['totalIncome'] as num?)?.toDouble() ?? 0;
                  final expense = (stats['totalExpense'] as num?)?.toDouble() ?? 0;
                  final profit = (stats['profit'] as num?)?.toDouble() ?? 0;
                  final totalOps = stats['totalOperations'] ?? 0;

                  return Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: BHStatCard(
                              title: 'Доходы',
                              value: '${formatter.format(income)} UZS',
                              icon: Icons.trending_up,
                              color: const Color(0xFF10B981),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: BHStatCard(
                              title: 'Расходы',
                              value: '${formatter.format(expense)} UZS',
                              icon: Icons.trending_down,
                              color: const Color(0xFFEF4444),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: BHStatCard(
                              title: 'Налоги (начисл.)',
                              value: '${formatter.format((stats['taxAccrued'] as num?)?.toDouble() ?? 0)} UZS',
                              icon: Icons.receipt_long,
                              color: const Color(0xFF6366F1),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: BHStatCard(
                              title: 'Налоги (уплач.)',
                              value: '${formatter.format((stats['taxPaid'] as num?)?.toDouble() ?? 0)} UZS',
                              icon: Icons.check_circle_outline,
                              color: const Color(0xFF10B981),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: BHStatCard(
                              title: 'Прибыль',
                              value: '${formatter.format(profit)} UZS',
                              icon: Icons.account_balance_wallet_outlined,
                              color: profit >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: BHStatCard(
                              title: 'Операций',
                              value: '$totalOps',
                              icon: Icons.receipt_long_outlined,
                              color: AppConstants.primaryColor,
                            ),
                          ),
                        ],
                      ),
                      // CRM блок
                      if (((stats['pipelineValue'] as num?)?.toDouble() ?? 0) > 0 ||
                          (stats['wonDealsCount'] ?? 0) > 0 ||
                          (stats['leadsCount'] ?? 0) > 0) ...[
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: BHStatCard(
                                title: 'Воронка',
                                value: '${formatter.format((stats['pipelineValue'] as num?)?.toDouble() ?? 0)} UZS',
                                icon: Icons.account_tree_outlined,
                                color: const Color(0xFF8B5CF6),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: BHStatCard(
                                title: 'Выиграно сделок',
                                value: '${stats['wonDealsCount'] ?? 0}',
                                icon: Icons.emoji_events_outlined,
                                color: const Color(0xFFF59E0B),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: BHStatCard(
                                title: 'Лиды (30 дн.)',
                                value: '${stats['leadsCount'] ?? 0}',
                                icon: Icons.person_add_outlined,
                                color: const Color(0xFF06B6D4),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: BHStatCard(
                                title: 'Сделок в воронке',
                                value: '${stats['dealsInFunnel'] ?? 0}',
                                icon: Icons.filter_list,
                                color: const Color(0xFF14B8A6),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  );
                },
              ),
              const SizedBox(height: 28),

              // Quick actions
              Row(
                children: [
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.add_circle_outline,
                      label: 'Операция',
                      color: AppConstants.primaryColor,
                      onTap: () => context.push('/home/services/business-hub/operation/new'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.document_scanner_outlined,
                      label: 'Сканер',
                      color: const Color(0xFF14B8A6),
                      onTap: () => context.push('/home/services/business-hub/ocr-scan'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.people_outline,
                      label: 'Контрагенты',
                      color: const Color(0xFF8B5CF6),
                      onTap: () => context.push('/home/services/business-hub/counterparties'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.bar_chart,
                      label: 'Отчёты',
                      color: const Color(0xFFF59E0B),
                      onTap: () => context.push('/home/services/business-hub/reports'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.people_alt_outlined,
                      label: 'CRM',
                      color: const Color(0xFF8B5CF6),
                      onTap: () => context.push('/home/services/business-hub/crm'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // Recent operations
              Row(
                children: [
                  const Text(
                    'Последние операции',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => context.push('/home/services/business-hub/operations'),
                    child: const Text('Все'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              opsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (_, __) => const Text('Ошибка загрузки операций'),
                data: (ops) {
                  if (ops.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          Icon(Icons.receipt_long, size: 48, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          Text(
                            'Нет операций',
                            style: TextStyle(color: AppConstants.textSecondary),
                          ),
                          const SizedBox(height: 8),
                          TextButton.icon(
                            onPressed: () => context.push('/home/services/business-hub/operation/new'),
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('Добавить первую'),
                          ),
                        ],
                      ),
                    );
                  }
                  final recent = ops.take(5).toList();
                  return Column(
                    children: recent
                        .map((op) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: BHOperationRow(
                                operation: op,
                                onTap: () => context.push(
                                  '/home/services/business-hub/operation/${op.id}',
                                  extra: op,
                                ),
                              ),
                            ))
                        .toList(),
                  );
                },
              ),
              const SizedBox(height: 80),
            ],
          ),
        );
      },
    );
  }

  Widget _buildNoOrganization(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.business, size: 72, color: Colors.grey.shade300),
            const SizedBox(height: 24),
            const Text(
              'Добро пожаловать\nв ODO Business Hub',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            Text(
              'Создайте компанию, чтобы начать управлять бизнесом',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, color: AppConstants.textSecondary),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => context.push('/home/services/business-hub/onboarding'),
                icon: const Icon(Icons.add_business),
                label: const Text('Создать компанию'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppConstants.primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
