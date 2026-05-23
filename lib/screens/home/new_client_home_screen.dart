import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../constants/app_constants.dart';
import '../../widgets/category_card.dart';
import '../../widgets/specialist_card.dart';
import '../../widgets/search_bar.dart';
import '../../widgets/banner_carousel.dart';
import '../../widgets/top_specialist_card.dart';
import '../../widgets/odo_business_hub_logo.dart';
import '../../widgets/odo_vacancy_logo.dart';
import '../../providers/firestore_providers.dart';
import '../../providers/firestore_auth_provider.dart';
import '../../providers/brain_lobe_progress_provider.dart';
import '../../widgets/brain_regions_map.dart';

class NewClientHomeScreen extends ConsumerStatefulWidget {
  const NewClientHomeScreen({super.key});

  @override
  ConsumerState<NewClientHomeScreen> createState() => _NewClientHomeScreenState();
}

class _NewClientHomeScreenState extends ConsumerState<NewClientHomeScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Загружаем специалистов при инициализации
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(specialistsProvider.notifier).loadSpecialists();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(firestoreAuthProvider);
    final userName = authState.user?.name ?? 'Пользователь';
    
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppConstants.spacingMD),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with Greeting and Notifications
              _buildHeader(context, userName),
              
              const SizedBox(height: AppConstants.spacingLG),
              
              // Search Bar
              _buildSearchBar(),
              
              const SizedBox(height: AppConstants.spacingMD),
              
              // Find Nearby Button
              _buildFindNearbyButton(),
              
              const SizedBox(height: AppConstants.spacingLG),
              
              // Carousel Banner
              _buildBannerCarousel(),
              
              const SizedBox(height: AppConstants.spacingLG),
              
              // Categories Section
              _buildCategoriesSection(),
              
              const SizedBox(height: AppConstants.spacingLG),
              
              // Top Specialists Section
              _buildTopSpecialistsSection(),
              
              const SizedBox(height: AppConstants.spacingLG),
              
              // Recommended Specialists Section
              _buildRecommendedSpecialistsSection(),
              
              const SizedBox(height: AppConstants.spacingLG),
              
              // Services Section (Business Hub & Vacancy)
              _buildServicesSection(context),
              
              const SizedBox(height: AppConstants.spacingLG),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, String userName) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppConstants.spacingLG + 4),
      decoration: BoxDecoration(
        gradient: AppConstants.primaryGradient,
        borderRadius: BorderRadius.circular(AppConstants.radiusXL),
        boxShadow: [
          BoxShadow(
            color: AppConstants.primaryColor.withOpacity(0.4),
            blurRadius: 20,
            offset: const Offset(0, 8),
            spreadRadius: 2,
          ),
          BoxShadow(
            color: AppConstants.primaryColor.withOpacity(0.2),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Привет, $userName! 👋',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Найдите лучших специалистов рядом с вами',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withOpacity(0.9),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.25),
              borderRadius: BorderRadius.circular(AppConstants.radiusLG),
              border: Border.all(
                color: Colors.white.withOpacity(0.3),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Stack(
              children: [
                const Icon(
                  Icons.notifications_outlined,
                  color: Colors.white,
                  size: 24,
                ),
                Positioned(
                  right: -2,
                  top: -2,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Colors.white,
                        width: 2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.red.withOpacity(0.5),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return GestureDetector(
      onTap: () {
        context.go('/home/search');
      },
      child: DesignSystemSearchBar(
        hintText: 'Поиск специалистов, услуг...',
        onChanged: (value) {
          // Здесь будет логика поиска
        },
        onSubmitted: (value) {
          // Здесь будет логика поиска
        },
      ),
    );
  }

  Widget _buildFindNearbyButton() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          context.push('/home/maps/find-nearby');
        },
        borderRadius: BorderRadius.circular(AppConstants.radiusLG),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(
            horizontal: AppConstants.spacingMD,
            vertical: AppConstants.spacingMD,
          ),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppConstants.secondaryColor,
                AppConstants.secondaryDarkColor,
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(AppConstants.radiusLG),
            boxShadow: [
              BoxShadow(
                color: AppConstants.secondaryColor.withOpacity(0.3),
                blurRadius: 12,
                offset: const Offset(0, 4),
                spreadRadius: 0,
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.location_on,
                color: Colors.white,
                size: 24,
              ),
              const SizedBox(width: AppConstants.spacingSM),
              Text(
                'Найти специалистов рядом',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
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

  Widget _buildBannerCarousel() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Специальные предложения',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: AppConstants.spacingMD),
        BannerCarousel(
          banners: _getBannerItems(),
          height: 180,
        ),
      ],
    );
  }

  /// Карта зон мозга (серые по умолчанию; подсветка через [brainLobeProgressProvider]).
  Widget _buildBrainRegionsCard(BuildContext context, WidgetRef ref) {
    final active = ref.watch(brainLobeProgressProvider);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppConstants.spacingMD),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        borderRadius: BorderRadius.circular(AppConstants.radiusLG),
        border: Border.all(color: AppConstants.borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.psychology_outlined, color: AppConstants.primaryColor, size: 22),
              const SizedBox(width: AppConstants.spacingSM),
              Text(
                'Зоны активности',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ],
          ),
          const SizedBox(height: AppConstants.spacingSM),
          Text(
            'По мере выполнения заданий в приложении подсвечиваются соответствующие области.',
            style: TextStyle(
              fontSize: 13,
              color: AppConstants.textSecondary,
              height: 1.35,
            ),
          ),
          const SizedBox(height: AppConstants.spacingMD),
          Center(
            child: BrainRegionsMap(
              activeLobes: active,
              height: 190,
            ),
          ),
        ],
      ),
    );
  }

  List<BannerItem> _getBannerItems() {
    return [
      BannerItem(
        title: 'Скидка 20% новым клиентам',
        subtitle: 'Получите скидку на первый заказ',
        buttonText: 'Узнать больше',
        gradient: const LinearGradient(
          colors: [Color(0xFF0EA5E9), Color(0xFF0284C7)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        icon: Icons.local_offer,
        onTap: () {
          // TODO: Navigate to promotion details
        },
      ),
      BannerItem(
        title: 'Бесплатная консультация',
        subtitle: 'Получите профессиональный совет',
        buttonText: 'Получить',
        gradient: const LinearGradient(
          colors: [Color(0xFF84CC16), Color(0xFF65A30D)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        icon: Icons.chat_bubble_outline,
        onTap: () {
          // TODO: Navigate to consultation
        },
      ),
      BannerItem(
        title: 'Рефералка: Приведи друга',
        subtitle: 'Получите бонус за каждого друга',
        buttonText: 'Пригласить',
        gradient: const LinearGradient(
          colors: [Color(0xFF8B5CF6), Color(0xFF7C3AED)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        icon: Icons.group_add,
        onTap: () {
          // TODO: Navigate to referral program
        },
      ),
    ];
  }

  Widget _buildCategoriesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Категории услуг',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: () {
                context.go('/home/categories');
              },
              child: Text(
                'Все',
                style: TextStyle(
                  color: AppConstants.primaryColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppConstants.spacingMD),
        SizedBox(
          height: 120,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: AppConstants.serviceCategories.length,
            itemBuilder: (context, index) {
              final category = AppConstants.serviceCategories[index];
              return Container(
                width: 100,
                margin: const EdgeInsets.only(right: AppConstants.spacingMD),
                child: CategoryCard(
                  id: category['id']!,
                  name: category['name']!,
                  icon: category['icon']!,
                  color: category['color']!,
                  emoji: category['emoji']!,
                  onTap: () {
                    context.go('/home/specialists/${category['id']}');
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildTopSpecialistsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '⭐ ТОП недели',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'Самые популярные мастера',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppConstants.textSecondary,
                  ),
                ),
              ],
            ),
            TextButton(
              onPressed: () {
                // TODO: Navigate to all specialists
              },
              child: const Text('Все'),
            ),
          ],
        ),
        const SizedBox(height: AppConstants.spacingMD),
        Consumer(
          builder: (context, ref, child) {
            final specialistsState = ref.watch(specialistsProvider);
            
            if (specialistsState.isLoading) {
              return const SizedBox(
                height: 160,
                child: Center(
                  child: CircularProgressIndicator(),
                ),
              );
            }
            
            if (specialistsState.error != null) {
              return SizedBox(
                height: 160,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.error_outline,
                        size: 32,
                        color: Colors.red,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Ошибка загрузки',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              );
            }
            
            if (specialistsState.specialists.isEmpty) {
              return const SizedBox.shrink();
            }
            
            // Берем топ 3 специалистов с лучшим рейтингом (оптимизировано)
            final topSpecialists = specialistsState.specialists
                .where((s) => s.rating != null && s.rating! > 4.5)
                .take(3)
                .toList();
            
            final displaySpecialists = topSpecialists.isEmpty 
                ? specialistsState.specialists.take(3).toList()
                : topSpecialists;
            
            if (displaySpecialists.isEmpty) {
              return const SizedBox.shrink();
            }
            
            return SizedBox(
              height: 160,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                cacheExtent: 200, // Кэширование для плавности
                itemCount: displaySpecialists.length,
                itemBuilder: (context, index) {
                  final specialist = displaySpecialists[index];
                  return TopSpecialistCard(
                    specialist: specialist,
                    onTap: () {
                      context.go('/home/specialist/${specialist.id}');
                    },
                    onBook: () {
                      context.go('/home/order/create/${specialist.id}');
                    },
                    onChat: () {
                      // TODO: Navigate to chat
                    },
                  );
                },
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildRecommendedSpecialistsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Рекомендуемые',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: () {
                context.go('/home/specialists');
              },
              child: Text(
                'Все',
                style: TextStyle(
                  color: AppConstants.primaryColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppConstants.spacingMD),
        Consumer(
          builder: (context, ref, child) {
            final specialistsState = ref.watch(specialistsProvider);
            
            if (specialistsState.isLoading) {
              return const SizedBox(
                height: 200,
                child: Center(
                  child: CircularProgressIndicator(),
                ),
              );
            }
            
            if (specialistsState.error != null) {
              return SizedBox(
                height: 200,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.error_outline,
                        size: 32,
                        color: Colors.red,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Ошибка загрузки',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              );
            }
            
            if (specialistsState.specialists.isEmpty) {
              return const SizedBox.shrink();
            }
            
            // Берем рекомендованных специалистов (пропускаем топ 3, оптимизировано)
            final recommendedSpecialists = specialistsState.specialists.skip(3).take(5).toList();
            
            if (recommendedSpecialists.isEmpty) {
              return const SizedBox.shrink();
            }
            
            return ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              cacheExtent: 500, // Кэширование для плавности
              itemCount: recommendedSpecialists.length,
              itemBuilder: (context, index) {
                final specialist = recommendedSpecialists[index];
                final lat = specialist.location?['lat']?.toDouble() ?? 0.0;
                final lng = specialist.location?['lng']?.toDouble() ?? 0.0;
                
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppConstants.spacingMD),
                  child: SpecialistCard(
                    name: specialist.name ?? 'Специалист',
                    category: specialist.category ?? 'Специалист',
                    location: '$lat, $lng',
                    rating: specialist.rating ?? 0.0,
                    reviewCount: specialist.totalOrders ?? 0,
                    avatarUrl: specialist.avatarUrl,
                    isFeatured: specialist.isVerified ?? false,
                    onTap: () {
                      context.go('/home/specialist/${specialist.id}');
                    },
                    onBook: () {
                      context.go('/home/booking/service-selection/${specialist.id}');
                    },
                  ),
                );
              },
            );
          },
        ),
      ],
    );
  }

  Widget _buildServicesSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppConstants.spacingXS),
          child: Text(
            'Дополнительные сервисы',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppConstants.textPrimary,
                ),
          ),
        ),
        const SizedBox(height: AppConstants.spacingMD),
        _buildBusinessHubButton(context),
        const SizedBox(height: AppConstants.spacingMD),
        _buildVacancyButton(context),
      ],
    );
  }

  Widget _buildBusinessHubButton(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        const url = 'https://studio--studio-122846357-42699.us-central1.hosted.app/';
        try {
          final uri = Uri.parse(url);
          if (await canLaunchUrl(uri)) {
            await launchUrl(
              uri,
              mode: LaunchMode.externalApplication,
            );
          }
        } catch (e) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Не удалось открыть: $e'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(
          horizontal: AppConstants.spacingMD,
          vertical: AppConstants.spacingMD,
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
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const OdoBusinessHubLogo(
              size: 28,
              blueColor: Colors.white,
              greenColor: Colors.white,
            ),
            const SizedBox(width: AppConstants.spacingSM),
            Text(
              'Odo Business Hub',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
                fontFamily: AppConstants.fontFamily,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVacancyButton(BuildContext context) {
    return GestureDetector(
      onTap: () {
        context.go('/vacancy');
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(
          horizontal: AppConstants.spacingMD,
          vertical: AppConstants.spacingMD,
        ),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              const Color(0xFF10B981), // Зелёный
              const Color(0xFF059669),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(AppConstants.radiusXL),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF10B981).withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
              spreadRadius: 0,
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const OdoVacancyLogo(
              size: 28,
              blueColor: Colors.white,
              greenColor: Colors.white,
            ),
            const SizedBox(width: AppConstants.spacingSM),
            Text(
              'ODO Vacancy',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
                fontFamily: AppConstants.fontFamily,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

