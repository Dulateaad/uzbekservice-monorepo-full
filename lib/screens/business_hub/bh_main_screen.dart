import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../providers/business_hub/bh_providers.dart';
import '../../providers/firestore_auth_provider.dart';
import 'dashboard/bh_dashboard_screen.dart';
import 'operations/bh_operations_list_screen.dart';
import 'counterparties/bh_counterparties_screen.dart';
import 'reports/bh_reports_screen.dart';
import 'tools/bh_tools_screen.dart';

class BHMainScreen extends ConsumerStatefulWidget {
  const BHMainScreen({super.key});

  @override
  ConsumerState<BHMainScreen> createState() => _BHMainScreenState();
}

class _BHMainScreenState extends ConsumerState<BHMainScreen> {
  int _currentTab = 0;

  final _tabs = const [
    _TabDef(icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard, label: 'Обзор'),
    _TabDef(icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long, label: 'Операции'),
    _TabDef(icon: Icons.people_outline, activeIcon: Icons.people, label: 'Контрагенты'),
    _TabDef(icon: Icons.bar_chart_outlined, activeIcon: Icons.bar_chart, label: 'Отчёты'),
    _TabDef(icon: Icons.more_horiz, activeIcon: Icons.more_horiz, label: 'Ещё'),
  ];

  @override
  void initState() {
    super.initState();
    _initData();
  }

  Future<void> _initData() async {
    final user = ref.read(firestoreAuthProvider).user;
    if (user == null) return;

    await ref.read(bhOrganizationProvider.notifier).loadByOwner(user.id);
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org != null) {
      ref.read(bhOperationsProvider.notifier).load(org.id);
      ref.read(bhCounterpartiesProvider.notifier).load(org.id);
      ref.read(bhHealthScoreProvider.notifier).load(org.id);
      ref.read(bhDashboardStatsProvider.notifier).load(org.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
          tooltip: 'Назад к Сервисам',
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: AppConstants.primaryGradient,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.business, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            const Text(
              'Business Hub',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () {
              // TODO: BH settings
            },
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentTab,
        children: const [
          BHDashboardScreen(),
          BHOperationsListScreen(),
          BHCounterpartiesScreen(),
          BHReportsScreen(),
          BHToolsScreen(),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 12,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: Row(
              children: List.generate(_tabs.length, (i) {
                final tab = _tabs[i];
                final isSelected = _currentTab == i;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _currentTab = i),
                    behavior: HitTestBehavior.opaque,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppConstants.primaryColor.withOpacity(0.1)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isSelected ? tab.activeIcon : tab.icon,
                            color: isSelected
                                ? AppConstants.primaryColor
                                : AppConstants.textSecondary,
                            size: 22,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            tab.label,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                              color: isSelected
                                  ? AppConstants.primaryColor
                                  : AppConstants.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class _TabDef {
  final IconData icon;
  final IconData activeIcon;
  final String label;

  const _TabDef({
    required this.icon,
    required this.activeIcon,
    required this.label,
  });
}
