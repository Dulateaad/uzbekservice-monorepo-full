import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../models/firestore_models.dart';
import '../../providers/firestore_auth_provider.dart';
import '../../providers/locale_provider.dart';
import '../../services/test_data_service.dart';
import '../../widgets/custom_button.dart';
import '../../l10n/app_localizations.dart';
import '../../utils/web_utils.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(firestoreAuthProvider);
    final user = authState.user;
    
    // Если пользователь не авторизован, показываем экран входа
    if (!authState.isAuthenticated || user == null) {
      return Scaffold(
        backgroundColor: AppConstants.backgroundColor,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.person_outline,
                  size: 80,
                  color: AppConstants.primaryColor.withOpacity(0.6),
                ),
                const SizedBox(height: 24),
                Text(
                  'Войдите в аккаунт',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Чтобы просмотреть профиль и управлять настройками',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppConstants.textSecondary,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: () {
                      print('🔐 Кнопка "Войти" нажата');
                      
                      // Используем несколько способов навигации для надежности
                      final router = GoRouter.of(context);
                      if (router.canPop()) {
                        router.pop();
                      }
                      
                      // Прямой переход через роутер
                      Future.microtask(() {
                        try {
                          router.go('/auth/phone');
                          print('✅ Переход на /auth/phone выполнен через router.go');
                        } catch (e) {
                          print('❌ Ошибка router.go: $e');
                          // Fallback 1: используем push
                          try {
                            router.push('/auth/phone');
                            print('✅ Переход выполнен через router.push');
                          } catch (e2) {
                            print('❌ Ошибка router.push: $e2');
                            // Fallback 2: используем window.location для веб
                            if (kIsWeb) {
                              WebUtils.redirect('/#/auth/phone');
                              print('✅ Переход выполнен через window.location');
                            }
                          }
                        }
                      });
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppConstants.primaryColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 2,
                    ),
                    child: const Text(
                      'Войти',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }
    
    final favoriteSpecialists = TestDataService.getTestSpecialists().take(6).toList();
    
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      body: CustomScrollView(
        slivers: [
          // App Bar с аватаром
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppConstants.primaryColor.withOpacity(0.8),
                      AppConstants.primaryColor,
                    ],
                  ),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircleAvatar(
                        radius: 40,
                        backgroundColor: Colors.white.withOpacity(0.2),
                        child: user?.avatarUrl != null
                            ? ClipOval(
                                child: Image.network(
                                  user!.avatarUrl!,
                                  width: 80,
                                  height: 80,
                                  fit: BoxFit.cover,
                                ),
                              )
                            : Text(
                                user?.name?[0].toUpperCase() ?? 'U',
                                style: const TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        user?.name ?? 'Пользователь',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        user?.phoneNumber ?? '',
                        style: const TextStyle(
                          fontSize: 16,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          
          // Контент
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatsSection(context, user?.userType),
                  const SizedBox(height: 24),
                  _buildFavoritesPreview(context, favoriteSpecialists),
                  const SizedBox(height: 24),
                  _buildPaymentMethodsPreview(context),
                  const SizedBox(height: 24),
                  ..._buildActionTiles(context, ref, user),
                  const SizedBox(height: 32),
                  CustomButton(
                    text: 'Выйти',
                    backgroundColor: Colors.red,
                    onPressed: () {
                      _showLogoutDialog(context, ref);
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsSection(BuildContext context, String? userType) {
    final stats = [
      {
        'label': 'Активные заказы',
        'value': '2',
        'icon': Icons.flash_on,
        'color': AppConstants.primaryColor,
      },
      {
        'label': 'Завершено заказов',
        'value': '18',
        'icon': Icons.check_circle_outline,
        'color': Colors.green,
      },
      {
        'label': userType == 'specialist' ? 'Средний рейтинг' : 'Любимые мастера',
        'value': userType == 'specialist' ? '4.9' : '6',
        'icon': userType == 'specialist' ? Icons.star : Icons.favorite,
        'color': userType == 'specialist' ? Colors.amber : Colors.pinkAccent,
      },
      {
        'label': userType == 'specialist' ? 'Часы на площадке' : 'Бонусный баланс',
        'value': userType == 'specialist' ? '126 ч.' : '45 000 сум',
        'icon': userType == 'specialist' ? Icons.access_time : Icons.card_giftcard,
        'color': userType == 'specialist' ? Colors.blueAccent : Colors.deepPurple,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(
          context,
          title: 'Моя статистика',
          actionLabel: userType == 'specialist' ? 'Подробнее' : null,
          onAction: () {
            // TODO: открыть подробную аналитику
          },
        ),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: stats.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.6,
          ),
          itemBuilder: (context, index) {
            final item = stats[index];
            return Container(
              decoration: BoxDecoration(
                color: AppConstants.surfaceColor,
                borderRadius: BorderRadius.circular(AppConstants.radiusLG),
                border: Border.all(color: AppConstants.borderColor.withOpacity(0.6)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: (item['color'] as Color).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      item['icon'] as IconData,
                      color: item['color'] as Color,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    item['value'] as String,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item['label'] as String,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppConstants.textSecondary,
                        ),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildFavoritesPreview(
    BuildContext context,
    List<FirestoreUser> favoriteSpecialists,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(
          context,
          title: 'Избранные специалисты',
          actionLabel: 'Все',
          onAction: () => context.go('/home/profile/favorites'),
        ),
        const SizedBox(height: 16),
        if (favoriteSpecialists.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppConstants.surfaceColor,
              borderRadius: BorderRadius.circular(AppConstants.radiusLG),
              border: Border.all(color: AppConstants.borderColor.withOpacity(0.6)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.favorite_border,
                  color: AppConstants.primaryColor.withOpacity(0.6),
                  size: 48,
                ),
                const SizedBox(height: 16),
                Text(
                  'Пока нет избранных специалистов',
                  style: Theme.of(context).textTheme.titleMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Добавляйте мастеров, чтобы быстро найти их в следующий раз',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppConstants.textSecondary,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                CustomButton(
                  text: 'Найти специалиста',
                  onPressed: () => context.go('/home'),
                ),
              ],
            ),
          )
        else
          SizedBox(
            height: 160,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: favoriteSpecialists.length,
              separatorBuilder: (context, index) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final specialist = favoriteSpecialists[index];
                return GestureDetector(
                  onTap: () => context.go('/home/specialist/${specialist.id}'),
                  child: Container(
                    width: 160,
                    decoration: BoxDecoration(
                      color: AppConstants.surfaceColor,
                      borderRadius: BorderRadius.circular(AppConstants.radiusLG),
                      border: Border.all(color: AppConstants.borderColor.withOpacity(0.5)),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CircleAvatar(
                          radius: 26,
                          backgroundImage: specialist.avatarUrl != null
                              ? NetworkImage(specialist.avatarUrl!)
                              : null,
                          backgroundColor: AppConstants.primaryColor.withOpacity(0.1),
                          child: specialist.avatarUrl == null
                              ? Text(
                                  specialist.name.isNotEmpty
                                      ? specialist.name[0].toUpperCase()
                                      : 'O',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: AppConstants.primaryColor,
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          specialist.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          specialist.category ?? 'Категория',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppConstants.primaryColor,
                                fontWeight: FontWeight.w500,
                              ),
                        ),
                        const Spacer(),
                        Row(
                          children: [
                            const Icon(
                              Icons.star,
                              size: 16,
                              color: Colors.amber,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              (specialist.rating ?? 4.8).toStringAsFixed(1),
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _buildPaymentMethodsPreview(BuildContext context) {
    final paymentMethods = [
      {
        'type': 'Uzcard',
        'lastFour': '1234',
        'isPrimary': true,
        'icon': Icons.credit_card,
      },
      {
        'type': 'Humo',
        'lastFour': '5678',
        'isPrimary': false,
        'icon': Icons.credit_card,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(
          context,
          title: 'Способы оплаты',
          actionLabel: 'Управлять',
          onAction: () => context.go('/home/profile/payment-methods'),
        ),
        const SizedBox(height: 16),
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: AppConstants.surfaceColor,
            borderRadius: BorderRadius.circular(AppConstants.radiusLG),
            border: Border.all(color: AppConstants.borderColor.withOpacity(0.6)),
          ),
          child: Column(
            children: [
              for (var i = 0; i < paymentMethods.length; i++)
                Column(
                  children: [
                    ListTile(
                      leading: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppConstants.primaryColor.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          paymentMethods[i]['icon'] as IconData,
                          color: AppConstants.primaryColor,
                        ),
                      ),
                      title: Text('${paymentMethods[i]['type']} •••• ${paymentMethods[i]['lastFour']}'),
                      subtitle: paymentMethods[i]['isPrimary'] as bool
                          ? const Text(
                              'Основной способ оплаты',
                              style: TextStyle(color: AppConstants.primaryColor),
                            )
                          : null,
                      trailing: IconButton(
                        icon: const Icon(Icons.chevron_right),
                        onPressed: () => context.go('/home/profile/payment-methods'),
                      ),
                    ),
                    if (i != paymentMethods.length - 1)
                      Divider(
                        height: 1,
                        color: AppConstants.borderColor.withOpacity(0.4),
                      ),
                  ],
                ),
              if (paymentMethods.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Icon(
                        Icons.account_balance_wallet_outlined,
                        size: 48,
                        color: AppConstants.primaryColor.withOpacity(0.6),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Добавьте способ оплаты',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Привяжите банковскую карту для мгновенных оплат',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppConstants.textSecondary,
                            ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      CustomButton(
                        text: 'Добавить карту',
                        onPressed: () => context.go('/home/profile/payment-methods'),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  List<Widget> _buildActionTiles(BuildContext context, WidgetRef ref, dynamic user) {
    return [
      _ProfileTile(
        icon: Icons.edit,
        title: 'Редактировать профиль',
        subtitle: 'Изменить личную информацию',
        onTap: () => context.go('/home/profile/edit'),
      ),
      const SizedBox(height: 16),
      if (user?.userType == 'specialist') ...[
        _ProfileTile(
          icon: Icons.bar_chart,
          title: 'Рейтинг по городам',
          subtitle: 'Статистика по нишам за месяц',
          onTap: () => context.go('/home/profile/analytics-city-ratings'),
        ),
        const SizedBox(height: 16),
        _ProfileTile(
          icon: Icons.work_outline,
          title: 'Профиль специалиста',
          subtitle: 'Управление услугами и ценами',
          onTap: () => context.go('/home/profile/specialist'),
        ),
        const SizedBox(height: 16),
        _ProfileTile(
          icon: Icons.assignment,
          title: 'Мои объявления',
          subtitle: 'Создать и управлять объявлениями услуг',
          onTap: () => context.go('/home/profile/service-ads'),
        ),
        const SizedBox(height: 16),
      ],
      _ProfileTile(
        icon: Icons.history,
        title: 'История заказов',
        subtitle: 'Просмотр всех заказов',
        onTap: () => context.go('/home/orders'),
      ),
      const SizedBox(height: 16),
      _ProfileTile(
        icon: Icons.favorite,
        title: 'Избранное',
        subtitle: 'Сохраненные специалисты',
        onTap: () => context.go('/home/profile/favorites'),
      ),
      const SizedBox(height: 16),
      const _LanguageTile(),
      const SizedBox(height: 16),
      _ProfileTile(
        icon: Icons.notifications_active_outlined,
        title: 'Уведомления',
        subtitle: 'Настройки уведомлений',
        onTap: () {
          // TODO: Navigate to notifications settings
        },
      ),
      const SizedBox(height: 16),
      _ProfileTile(
        icon: Icons.support_agent,
        title: 'Поддержка',
        subtitle: 'FAQ и чат с поддержкой',
        onTap: () {
          // TODO: Navigate to support
        },
      ),
      const SizedBox(height: 16),
      _ProfileTile(
        icon: Icons.info_outline,
        title: 'О приложении',
        subtitle: 'Версия ${AppConstants.appVersion}',
        onTap: () => _showAboutDialog(context),
      ),
      const SizedBox(height: 16),
      _ProfileTile(
        icon: Icons.description,
        title: 'Пользовательское соглашение',
        subtitle: 'Условия использования сервиса',
        onTap: () => context.go('/home/terms-of-service'),
      ),
      const SizedBox(height: 16),
      _ProfileTile(
        icon: Icons.privacy_tip,
        title: 'Политика конфиденциальности',
        subtitle: 'Как мы обрабатываем ваши данные',
        onTap: () => context.go('/home/privacy-policy'),
      ),
      const SizedBox(height: 16),
      _ProfileTile(
        icon: Icons.swap_horiz,
        title: 'Переключить роль',
        subtitle: 'Текущая роль: ${user?.userType == 'specialist' ? 'Специалист' : 'Клиент'}',
        onTap: () => _switchUserRole(context, ref),
      ),
    ];
  }

  Widget _buildSectionHeader(
    BuildContext context, {
    required String title,
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        if (actionLabel != null && onAction != null)
          TextButton(
            onPressed: onAction,
            child: Text(actionLabel),
          ),
      ],
    );
  }

  void _switchUserRole(BuildContext context, WidgetRef ref) {
    final authState = ref.read(firestoreAuthProvider);
    final user = authState.user;
    
    if (user == null) return;
    
    final newUserType = user.userType == 'specialist' ? 'client' : 'specialist';
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Переключить роль'),
        content: Text('Переключить с ${user.userType == 'specialist' ? 'Специалиста' : 'Клиента'} на ${newUserType == 'specialist' ? 'Специалиста' : 'Клиента'}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Обновляем роль пользователя
              ref.read(firestoreAuthProvider.notifier).updateProfile(
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
                category: newUserType == 'specialist' ? user.category ?? 'barber' : null,
                description: newUserType == 'specialist' ? user.description : null,
                pricePerHour: newUserType == 'specialist' ? user.pricePerHour : null,
              );
              
              // Принудительно обновляем роль в состоянии
              final updatedUser = user.copyWith(userType: newUserType);
              ref.read(firestoreAuthProvider.notifier).state = authState.copyWith(user: updatedUser);
              
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Роль изменена на ${newUserType == 'specialist' ? 'Специалист' : 'Клиент'}'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            child: const Text('Переключить'),
          ),
        ],
      ),
    );
  }

  void _showAboutDialog(BuildContext context) {
    showAboutDialog(
      context: context,
      applicationName: AppConstants.appName,
      applicationVersion: AppConstants.appVersion,
      applicationIcon: const Icon(
        Icons.build_circle,
        size: 48,
        color: AppConstants.primaryColor,
      ),
      children: [
        const Text(
          'Мобильное приложение для соединения клиентов со специалистами в Узбекистане.',
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
            context.go('/home/terms-of-service');
          },
          child: const Text('Пользовательское соглашение'),
        ),
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
            context.go('/home/privacy-policy');
          },
          child: const Text('Политика конфиденциальности'),
        ),
      ],
    );
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Выйти из аккаунта'),
        content: const Text('Вы уверены, что хотите выйти?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(firestoreAuthProvider.notifier).logout();
              context.go('/auth/phone');
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Выйти'),
          ),
        ],
      ),
    );
  }
}

class _LanguageTile extends ConsumerWidget {
  const _LanguageTile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final localeNotifier = ref.read(localeProvider.notifier);
    final l10n = AppLocalizations.of(context);
    
    String languageName;
    if (l10n != null) {
      switch (locale.languageCode) {
        case 'ru':
          languageName = l10n.russian;
          break;
        case 'uz':
          languageName = l10n.uzbek;
          break;
        case 'en':
          languageName = l10n.english;
          break;
        default:
          languageName = l10n.russian;
      }
    } else {
      languageName = localeNotifier.getLanguageName(locale.languageCode);
    }
    
    return _ProfileTile(
      icon: Icons.language,
      title: l10n?.language ?? 'Язык',
      subtitle: languageName,
      onTap: () => _showLanguageDialog(context, ref),
    );
  }

  void _showLanguageDialog(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final localeNotifier = ref.read(localeProvider.notifier);
    final l10n = AppLocalizations.of(context);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n?.language ?? 'Выберите язык'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _LanguageOption(
              title: l10n?.russian ?? 'Русский',
              locale: const Locale('ru', 'RU'),
              currentLocale: locale,
              onTap: () {
                localeNotifier.setLocale(const Locale('ru', 'RU'));
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 8),
            _LanguageOption(
              title: l10n?.uzbek ?? 'O\'zbekcha',
              locale: const Locale('uz', 'UZ'),
              currentLocale: locale,
              onTap: () {
                localeNotifier.setLocale(const Locale('uz', 'UZ'));
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 8),
            _LanguageOption(
              title: l10n?.english ?? 'English',
              locale: const Locale('en', 'US'),
              currentLocale: locale,
              onTap: () {
                localeNotifier.setLocale(const Locale('en', 'US'));
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _LanguageOption extends StatelessWidget {
  final String title;
  final Locale locale;
  final Locale currentLocale;
  final VoidCallback onTap;

  const _LanguageOption({
    required this.title,
    required this.locale,
    required this.currentLocale,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = locale.languageCode == currentLocale.languageCode;
    
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected 
              ? AppConstants.primaryColor.withOpacity(0.1)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected 
                ? AppConstants.primaryColor
                : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  color: isSelected 
                      ? AppConstants.primaryColor
                      : Colors.black87,
                ),
              ),
            ),
            if (isSelected)
              Icon(
                Icons.check_circle,
                color: AppConstants.primaryColor,
                size: 20,
              ),
          ],
        ),
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ProfileTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppConstants.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Icon(
                  icon,
                  color: AppConstants.primaryColor,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppConstants.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppConstants.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right,
                color: AppConstants.textSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
