import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../constants/app_constants.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';
import '../../../widgets/business_hub/bh_stat_card.dart';

class BHTaxScreen extends ConsumerStatefulWidget {
  const BHTaxScreen({super.key});

  @override
  ConsumerState<BHTaxScreen> createState() => _BHTaxScreenState();
}

class _BHTaxScreenState extends ConsumerState<BHTaxScreen> {
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = ref.read(firestoreAuthProvider).user;
    if (user == null) return;
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org != null) {
      ref.read(bhDashboardStatsProvider.notifier).load(org.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final orgAsync = ref.watch(bhOrganizationProvider);
    final statsAsync = ref.watch(bhDashboardStatsProvider);
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
            title: const Text('Налоговый блок'),
          ),
          body: RefreshIndicator(
            onRefresh: _load,
            child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const Text(
                'Налоговый блок',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                'Сводка по налогам и обязательным платежам',
                style: TextStyle(fontSize: 14, color: AppConstants.textSecondary),
              ),
              const SizedBox(height: 24),
              statsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (_, __) => const Text('Ошибка загрузки'),
                data: (stats) {
                  final taxAccrued = (stats['taxAccrued'] as num?)?.toDouble() ?? 0;
                  final taxPaid = (stats['taxPaid'] as num?)?.toDouble() ?? 0;
                  final taxOwed = (stats['taxOwed'] as num?)?.toDouble() ?? taxAccrued - taxPaid;

                  return Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: BHStatCard(
                              title: 'Начислено',
                              value: '${formatter.format(taxAccrued)} UZS',
                              icon: Icons.receipt_long,
                              color: const Color(0xFF6366F1),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: BHStatCard(
                              title: 'Уплачено',
                              value: '${formatter.format(taxPaid)} UZS',
                              icon: Icons.check_circle_outline,
                              color: const Color(0xFF10B981),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      BHStatCard(
                        title: 'К уплате',
                        value: '${formatter.format(taxOwed > 0 ? taxOwed : 0)} UZS',
                        icon: Icons.schedule,
                        color: taxOwed > 0 ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
                      ),
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.amber.shade200),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, color: Colors.amber.shade800, size: 24),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Добавляйте операции «Начисление налогов» и «Уплата налогов» для учёта.',
                                style: TextStyle(fontSize: 13, color: Colors.amber.shade900),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
        );
      },
    );
  }
}
