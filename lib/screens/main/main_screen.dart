import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../constants/app_constants.dart';
import '../../widgets/island_navigation.dart';
import '../home/beautiful_home_screen.dart';
import '../home/client_home_screen.dart';
import '../home/new_client_home_screen.dart';
import '../home/specialist_home_screen.dart';
import '../profile/profile_screen.dart';
import '../tools/my_tools_screen.dart';
import '../services/services_screen.dart';
import '../profile/favorites_screen.dart';
import '../orders/orders_screen.dart';
import '../vacancy/company_dashboard_screen.dart';
import '../business_hub/bh_main_screen.dart';
import '../chat/chat_list_screen.dart';
import '../../providers/firestore_auth_provider.dart';

class MainScreen extends ConsumerStatefulWidget {
  const MainScreen({super.key});

  @override
  ConsumerState<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends ConsumerState<MainScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(firestoreAuthProvider);
    final user = authState.user;

    // Определяем экраны в зависимости от роли пользователя
    List<Widget> screens;
    List<NavigationItem> navigationItems;
    
    if (user?.userType == 'company') {
      screens = [
        const BHMainScreen(),
        const CompanyDashboardScreen(),
        const ServicesScreen(),
        const ProfileScreen(),
      ];
      navigationItems = [
        const NavigationItem(
          icon: Icons.business_outlined,
          selectedIcon: Icons.business,
          label: 'Бизнес',
        ),
        const NavigationItem(
          icon: Icons.work_outline,
          selectedIcon: Icons.work,
          label: 'Вакансии',
        ),
        const NavigationItem(
          icon: Icons.apps_outlined,
          selectedIcon: Icons.apps,
          label: 'Сервисы',
        ),
        const NavigationItem(
          icon: Icons.person_outline,
          selectedIcon: Icons.person,
          label: 'Профиль',
        ),
      ];
    } else if (user?.userType == 'specialist') {
      screens = [
        const SpecialistHomeScreen(),
        const MyToolsScreen(),
        const ServicesScreen(),
        const ChatListScreen(),
        const ProfileScreen(),
        const OrdersScreen(),
      ];
      navigationItems = [
        const NavigationItem(
          icon: Icons.dashboard_outlined,
          selectedIcon: Icons.dashboard,
          label: 'Панель',
        ),
        const NavigationItem(
          icon: Icons.build_outlined,
          selectedIcon: Icons.build,
          label: 'Инструменты',
        ),
        const NavigationItem(
          icon: Icons.apps_outlined,
          selectedIcon: Icons.apps,
          label: 'Сервисы',
        ),
        const NavigationItem(
          icon: Icons.chat_bubble_outline,
          selectedIcon: Icons.chat_bubble,
          label: 'Чаты',
        ),
        const NavigationItem(
          icon: Icons.person_outline,
          selectedIcon: Icons.person,
          label: 'Профиль',
        ),
        const NavigationItem(
          icon: Icons.work_outline,
          selectedIcon: Icons.work,
          label: 'Заказы',
        ),
      ];
    } else {
      screens = [
        const NewClientHomeScreen(),
        const FavoritesScreen(),
        const ServicesScreen(),
        const ChatListScreen(),
        const ProfileScreen(),
        const OrdersScreen(),
      ];
      navigationItems = [
        const NavigationItem(
          icon: Icons.home_outlined,
          selectedIcon: Icons.home,
          label: 'Главная',
        ),
        const NavigationItem(
          icon: Icons.favorite_outline,
          selectedIcon: Icons.favorite,
          label: 'Избранные',
        ),
        const NavigationItem(
          icon: Icons.apps_outlined,
          selectedIcon: Icons.apps,
          label: 'Сервисы',
        ),
        const NavigationItem(
          icon: Icons.chat_bubble_outline,
          selectedIcon: Icons.chat_bubble,
          label: 'Чаты',
        ),
        const NavigationItem(
          icon: Icons.person_outline,
          selectedIcon: Icons.person,
          label: 'Профиль',
        ),
        const NavigationItem(
          icon: Icons.shopping_bag_outlined,
          selectedIcon: Icons.shopping_bag,
          label: 'Заказы',
        ),
      ];
    }

    // Вычисляем высоту island navigation для padding
    final islandHeight = 90.0; // Примерная высота island navigation
    
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      body: Stack(
        children: [
          // Обертываем экраны в Padding, чтобы контент не перекрывался island navigation
          Padding(
            padding: EdgeInsets.only(bottom: islandHeight + AppConstants.spacingMD),
            child: screens[_currentIndex],
          ),
          IslandNavigation(
            currentIndex: _currentIndex,
            items: navigationItems,
            onTap: (index) {
              setState(() {
                _currentIndex = index;
              });
            },
          ),
          // Кнопка Odo Business Hub удалена - теперь она в NewClientHomeScreen под баннером
        ],
      ),
    );
  }

  Widget _buildBusinessHubButton(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _openBusinessHub(context),
        borderRadius: BorderRadius.circular(AppConstants.radiusXL),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppConstants.spacingMD,
            vertical: AppConstants.spacingSM,
          ),
          decoration: BoxDecoration(
            gradient: AppConstants.primaryGradient,
            borderRadius: BorderRadius.circular(AppConstants.radiusXL),
            boxShadow: [
              BoxShadow(
                color: AppConstants.primaryColor.withOpacity(0.3),
                blurRadius: 12,
                offset: const Offset(0, 4),
                spreadRadius: 0,
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.business_center,
                color: AppConstants.primaryContrastColor,
                size: 20,
              ),
              const SizedBox(width: AppConstants.spacingXS),
              Text(
                'Odo Business Hub',
                style: TextStyle(
                  color: AppConstants.primaryContrastColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  fontFamily: AppConstants.fontFamily,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openBusinessHub(BuildContext context) async {
    // URL веб-приложения Odo Business Hub
    const url = 'https://studio--studio-122846357-42699.us-central1.hosted.app/';
    
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(
          uri,
          mode: LaunchMode.externalApplication, // Открыть в браузере
        );
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Не удалось открыть веб-приложение'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ошибка: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}
