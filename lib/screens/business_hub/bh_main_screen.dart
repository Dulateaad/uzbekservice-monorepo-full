import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../models/business_hub/business_vertical.dart';
import '../../providers/business_hub/bh_providers.dart';
import '../../providers/firestore_auth_provider.dart';
import '../../widgets/business_hub/business_vertical_picker.dart';
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
      try {
        await ref.read(bhCrmServiceProvider).syncInstallmentPaymentNotifications(org.id);
      } catch (_) {}
    }
  }

  void _showBusinessHubSettings(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return Consumer(
          builder: (context, ref, _) {
            final o = ref.watch(bhOrganizationProvider).valueOrNull;
            return SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                    child: Text(
                      'Настройки Business Hub',
                      style: Theme.of(ctx).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.account_balance_outlined),
                    title: const Text('Accounting Mode'),
                    subtitle: const Text('Бухгалтерский режим (этап 3: счета и проводки)'),
                    trailing: Switch(
                      value: o?.financeMode == 'accounting',
                      onChanged: o == null
                          ? null
                          : (v) async {
                              await ref.read(bhOrganizationProvider.notifier).update(
                                    o.copyWith(
                                      accountingModeEnabled: v,
                                      financeMode: v ? 'accounting' : 'business',
                                    ),
                                  );
                            },
                    ),
                  ),
                  ListTile(
                    leading: const Icon(Icons.group_outlined),
                    title: const Text('Участники и роли'),
                    subtitle: const Text('Доступы к организации'),
                    onTap: () {
                      Navigator.pop(ctx);
                      context.push('/home/services/business-hub/members');
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.business_outlined),
                    title: const Text('Организация'),
                    subtitle: const Text('Данные и онбординг'),
                    onTap: () {
                      Navigator.pop(ctx);
                      context.push('/home/services/business-hub/onboarding');
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.category_outlined),
                    title: const Text('Тип бизнеса'),
                    subtitle: Text(
                      o != null
                          ? BusinessVerticalSpec.byId(o.businessVerticalId).title
                          : '—',
                    ),
                    onTap: () {
                      Navigator.pop(ctx);
                      _showVerticalPicker(context);
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.upload_file_outlined),
                    title: const Text('Импорт'),
                    subtitle: const Text('Excel / CSV'),
                    onTap: () {
                      Navigator.pop(ctx);
                      context.push('/home/services/business-hub/import');
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.account_balance_wallet_outlined),
                    title: const Text('Налоги'),
                    onTap: () {
                      Navigator.pop(ctx);
                      context.push('/home/services/business-hub/tax');
                    },
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showVerticalPicker(BuildContext context) {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org == null) return;
    var selected = org.businessVerticalId;

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.viewInsetsOf(ctx).bottom + 16,
                left: 20,
                right: 20,
                top: 16,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Тип бизнеса',
                      style: Theme.of(ctx).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Подстраиваем подсказки и термины под вашу сферу.',
                      style: TextStyle(color: AppConstants.textSecondary, fontSize: 14),
                    ),
                    const SizedBox(height: 16),
                    BusinessVerticalPickerGrid(
                      selectedId: selected,
                      onSelect: (id) => setModalState(() => selected = id),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      height: 48,
                      child: FilledButton(
                        onPressed: () async {
                          await ref.read(bhOrganizationProvider.notifier).update(
                                org.copyWith(businessVerticalId: selected),
                              );
                          if (ctx.mounted) Navigator.pop(ctx);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Тип бизнеса сохранён')),
                            );
                          }
                        },
                        child: const Text('Сохранить'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final org = ref.watch(bhOrganizationProvider).valueOrNull;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/home/services');
            }
          },
          tooltip: 'Назад к Сервисам',
        ),
        title: org == null
            ? Row(
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
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
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
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      BusinessVerticalSpec.byId(org.businessVerticalId).title,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Theme.of(context).appBarTheme.foregroundColor?.withValues(alpha: 0.75),
                      ),
                    ),
                  ),
                ],
              ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            tooltip: 'Уведомления',
            onPressed: () => context.push('/home/services/business-hub/crm/notifications'),
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'Настройки',
            onPressed: () => _showBusinessHubSettings(context),
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (org != null && !org.bhOnboardingComplete)
            Material(
              color: const Color(0xFFEFF6FF),
              child: InkWell(
                onTap: () => context.push('/home/services/business-hub/core-onboarding'),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      const Icon(Icons.flag_outlined, color: Color(0xFF2563EB)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          ref.watch(bhBusinessVerticalSpecProvider).quickStartBanner,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                      ),
                      Icon(Icons.chevron_right, color: AppConstants.textSecondary),
                    ],
                  ),
                ),
              ),
            ),
          Expanded(
            child: IndexedStack(
              index: _currentTab,
              children: const [
                BHDashboardScreen(),
                BHOperationsListScreen(),
                BHCounterpartiesScreen(),
                BHReportsScreen(),
                BHToolsScreen(),
              ],
            ),
          ),
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
