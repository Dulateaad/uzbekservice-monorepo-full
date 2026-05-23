import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../models/firestore_models.dart';
import '../../providers/firestore_providers.dart';
import '../../services/firestore_service.dart';
import '../../utils/chat_navigation.dart';
import '../../services/test_data_service.dart';
import '../../widgets/design_system_button.dart';

class EnhancedSpecialistDetailScreen extends ConsumerStatefulWidget {
  final String specialistId;

  const EnhancedSpecialistDetailScreen({
    super.key,
    required this.specialistId,
  });

  @override
  ConsumerState<EnhancedSpecialistDetailScreen> createState() => _EnhancedSpecialistDetailScreenState();
}

class _EnhancedSpecialistDetailScreenState extends ConsumerState<EnhancedSpecialistDetailScreen> 
    with SingleTickerProviderStateMixin {
  FirestoreUser? specialist;
  bool isLoading = true;
  String? error;
  late TabController _tabController;
  int _currentTabIndex = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _tabController.addListener(() {
      setState(() {
        _currentTabIndex = _tabController.index;
      });
    });
    _loadSpecialist();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadSpecialist() async {
    print('🔍 Загрузка специалиста с ID: ${widget.specialistId}');
    
    try {
      setState(() {
        isLoading = true;
        error = null;
      });

      // Сначала пытаемся загрузить из Firestore
      try {
        specialist = await FirestoreService.getUserById(widget.specialistId);
        if (specialist != null) {
          print('✅ Специалист загружен из Firestore: ${specialist?.name}');
          setState(() {
            isLoading = false;
            error = null;
          });
          return;
        }
      } catch (e) {
        print('⚠️ Firestore недоступен или ошибка: $e');
      }

      // Используем тестовые данные
      print('📋 Загрузка из тестовых данных...');
      final testSpecialists = TestDataService.getTestSpecialists();
      print('📋 Всего тестовых специалистов: ${testSpecialists.length}');
      print('📋 ID тестовых специалистов: ${testSpecialists.map((s) => s.id).join(", ")}');
      
      // Пытаемся найти специалиста по ID
      try {
        specialist = testSpecialists.firstWhere(
          (s) => s.id == widget.specialistId,
        );
        print('✅ Специалист найден в тестовых данных по ID: ${specialist?.name}');
      } catch (_) {
        print('⚠️ Специалист с ID ${widget.specialistId} не найден в тестовых данных');
        // Если не найден по ID, берем первого из списка
        specialist = testSpecialists.isNotEmpty ? testSpecialists.first : null;
        if (specialist != null) {
          print('✅ Используем первого специалиста из тестовых данных: ${specialist?.name}');
        }
      }

      // Если специалист все еще null, это критическая ошибка
      if (specialist == null) {
        throw Exception('Не удалось загрузить специалиста. Тестовые данные пусты.');
      }

      setState(() {
        isLoading = false;
        error = null;
      });
    } catch (e, stackTrace) {
      print('❌ Критическая ошибка загрузки специалиста: $e');
      print('Stack trace: $stackTrace');
      
      // В случае ошибки все равно пытаемся показать тестового специалиста
      try {
        final testSpecialists = TestDataService.getTestSpecialists();
        if (testSpecialists.isNotEmpty) {
          specialist = testSpecialists.first;
          print('✅ Используем первого специалиста из тестовых данных как fallback: ${specialist?.name}');
          setState(() {
            isLoading = false;
            error = null;
          });
        } else {
          throw Exception('Тестовые данные пусты');
        }
      } catch (fallbackError) {
        print('❌ Fallback тоже не сработал: $fallbackError');
        setState(() {
          isLoading = false;
          error = 'Не удалось загрузить профиль специалиста. Попробуйте позже.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Scaffold(
        backgroundColor: AppConstants.backgroundColor,
        body: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (error != null || specialist == null) {
      return Scaffold(
        backgroundColor: AppConstants.backgroundColor,
        appBar: AppBar(
          backgroundColor: AppConstants.backgroundColor,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppConstants.spacingLG),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                Text(
                  'Ошибка загрузки профиля',
                  style: Theme.of(context).textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  error ?? 'Специалист не найден',
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'ID: ${widget.specialistId}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppConstants.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    _loadSpecialist();
                  },
                  child: const Text('Повторить'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      body: CustomScrollView(
        slivers: [
          _buildHeroSection(),
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeaderInfo(),
                _buildTabBar(),
                _buildTabContent(),
                const SizedBox(height: 100), // Отступ для нижней панели
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomPanel(),
    );
  }

  Widget _buildHeroSection() {
    return SliverAppBar(
      expandedHeight: 320,
      pinned: true,
      backgroundColor: AppConstants.primaryColor,
      leading: IconButton(
        icon: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            borderRadius: BorderRadius.circular(AppConstants.radiusMD),
          ),
          child: const Icon(Icons.arrow_back, color: Colors.white),
        ),
        onPressed: () => context.pop(),
      ),
      actions: [
        IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(AppConstants.radiusMD),
            ),
            child: const Icon(Icons.favorite_border, color: Colors.white),
          ),
          onPressed: () {},
        ),
        IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(AppConstants.radiusMD),
            ),
            child: const Icon(Icons.share, color: Colors.white),
          ),
          onPressed: () {},
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: BoxDecoration(
            gradient: AppConstants.primaryGradient,
          ),
          child: Stack(
            children: [
              // Галерея изображений
              if (specialist?.avatarUrl != null)
                Positioned.fill(
                  child: Image.network(
                    specialist!.avatarUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        color: AppConstants.primaryColor,
                        child: const Icon(Icons.person, size: 100, color: Colors.white70),
                      );
                    },
                  ),
                ),
              // Градиентный overlay
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        AppConstants.primaryColor.withOpacity(0.8),
                        AppConstants.primaryColor,
                      ],
                    ),
                  ),
                ),
              ),
              // Контент поверх изображения
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Padding(
                  padding: const EdgeInsets.all(AppConstants.spacingLG),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.25),
                              borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                              border: Border.all(color: Colors.white.withOpacity(0.3)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.star, color: Colors.amber, size: 18),
                                const SizedBox(width: 4),
                                Text(
                                  specialist?.rating?.toStringAsFixed(1) ?? '5.0',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          if (specialist?.isVerified == true)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                gradient: AppConstants.secondaryGradient,
                                borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.verified, color: Colors.white, size: 16),
                                  SizedBox(width: 4),
                                  Text(
                                    'Проверен',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
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

  Widget _buildHeaderInfo() {
    return Container(
      padding: const EdgeInsets.all(AppConstants.spacingLG),
      color: AppConstants.surfaceColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            specialist?.name ?? 'Специалист',
            style: Theme.of(context).textTheme.displaySmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.work_outline, size: 18, color: AppConstants.textSecondary),
              const SizedBox(width: 6),
              Text(
                specialist?.category ?? 'Специалист',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppConstants.textSecondary,
                ),
              ),
              const SizedBox(width: 16),
              Icon(Icons.location_on_outlined, size: 18, color: AppConstants.textSecondary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Ташкент, Узбекистан',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppConstants.textSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildStatCard(Icons.star, '${specialist?.rating ?? 5.0}', 'Рейтинг'),
              const SizedBox(width: 12),
              _buildStatCard(Icons.work, '${specialist?.totalOrders ?? 0}', 'Заказов'),
              const SizedBox(width: 12),
              _buildStatCard(Icons.access_time, '5 лет', 'Опыт'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(IconData icon, String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppConstants.backgroundColor,
          borderRadius: BorderRadius.circular(AppConstants.radiusMD),
          border: Border.all(color: AppConstants.borderColor.withOpacity(0.5)),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppConstants.primaryColor, size: 20),
            const SizedBox(height: 4),
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppConstants.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      color: AppConstants.surfaceColor,
      child: TabBar(
        controller: _tabController,
        indicatorColor: AppConstants.primaryColor,
        indicatorWeight: 3,
        labelColor: AppConstants.primaryColor,
        unselectedLabelColor: AppConstants.textSecondary,
        labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
        tabs: const [
          Tab(text: 'О специалисте'),
          Tab(text: 'Услуги'),
          Tab(text: 'Галерея'),
          Tab(text: 'Инструменты'),
          Tab(text: 'Отзывы'),
        ],
      ),
    );
  }

  Widget _buildTabContent() {
    return Container(
      height: 500,
      color: AppConstants.backgroundColor,
      child: TabBarView(
        controller: _tabController,
        children: [
          _buildAboutTab(),
          _buildServicesTab(),
          _buildGalleryTab(),
          _buildToolsTab(),
          _buildReviewsTab(),
        ],
      ),
    );
  }

  Widget _buildAboutTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppConstants.spacingLG),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Описание',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            specialist?.description ?? 
            'Опытный специалист с многолетним стажем работы. Предоставляю качественные услуги с гарантией результата.',
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: 24),
          Text(
            'Навыки',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildSkillChip('Профессионализм'),
              _buildSkillChip('Пунктуальность'),
              _buildSkillChip('Качество'),
              _buildSkillChip('Опыт'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSkillChip(String skill) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppConstants.primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(AppConstants.radiusMD),
        border: Border.all(color: AppConstants.primaryColor.withOpacity(0.3)),
      ),
      child: Text(
        skill,
        style: TextStyle(
          color: AppConstants.primaryColor,
          fontWeight: FontWeight.w600,
          fontSize: 13,
        ),
      ),
    );
  }

  Widget _buildServicesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppConstants.spacingLG),
      child: Column(
        children: [
          _buildServiceCard('Стрижка', '50000', '45 мин'),
          const SizedBox(height: 12),
          _buildServiceCard('Борода', '30000', '30 мин'),
          const SizedBox(height: 12),
          _buildServiceCard('Комплекс', '70000', '60 мин'),
        ],
      ),
    );
  }

  Widget _buildServiceCard(String name, String price, String duration) {
    return Container(
      padding: const EdgeInsets.all(AppConstants.spacingMD),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        borderRadius: BorderRadius.circular(AppConstants.radiusLG),
        border: Border.all(color: AppConstants.borderColor.withOpacity(0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.access_time, size: 14, color: AppConstants.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      duration,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppConstants.textSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$price сум',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppConstants.primaryColor,
                ),
              ),
              const SizedBox(height: 4),
              TextButton(
                onPressed: () {},
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                ),
                child: const Text('Выбрать'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildGalleryTab() {
    final images = [
      specialist?.avatarUrl,
      specialist?.avatarUrl,
      specialist?.avatarUrl,
    ].whereType<String>().toList();

    if (images.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.photo_library_outlined, size: 64, color: AppConstants.textSecondary),
            const SizedBox(height: 16),
            Text(
              'Галерея пуста',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppConstants.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(AppConstants.spacingLG),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1,
      ),
      itemCount: images.length,
      itemBuilder: (context, index) {
        return GestureDetector(
          onTap: () {
            // TODO: Открыть полноэкранную галерею
          },
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppConstants.radiusLG),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppConstants.radiusLG),
              child: Image.network(
                images[index],
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: AppConstants.borderColor,
                    child: const Icon(Icons.image, size: 40),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildToolsTab() {
    final toolsState = ref.watch(toolsProvider);
    final specialistId = widget.specialistId;

    // Ленивая загрузка инструментов, если ещё не загружены
    if (!toolsState.isLoading &&
        toolsState.rentTools.isEmpty &&
        toolsState.saleTools.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(toolsProvider.notifier).loadToolsForSpecialist(specialistId);
      });
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppConstants.spacingLG),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Инструменты и товары мастера',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Мастер может сдавать инструменты в аренду или продавать товары. '
            'Вы можете обсудить условия в чате.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppConstants.textSecondary,
                ),
          ),
          const SizedBox(height: 16),
          if (toolsState.isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: CircularProgressIndicator(),
              ),
            )
          else ...[
            _buildPublicToolsSection(
              title: 'Инструменты в аренду',
              emptyText:
                  'Пока нет инструментов в аренду. Мастер может добавить их в своём профиле.',
              items: toolsState.rentTools,
            ),
            const SizedBox(height: 16),
            _buildPublicToolsSection(
              title: 'Товары мастера',
              emptyText:
                  'Пока нет товаров. Мастер может добавить свои товары в своём профиле.',
              items: toolsState.saleTools,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPublicToolsSection({
    required String title,
    required String emptyText,
    required List<FirestoreToolItem> items,
  }) {
    if (items.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppConstants.surfaceColor,
          borderRadius: BorderRadius.circular(AppConstants.radiusLG),
          border: Border.all(color: AppConstants.borderColor.withOpacity(0.6)),
        ),
        child: Text(
          emptyText,
          style: const TextStyle(
            fontSize: 14,
            color: AppConstants.textSecondary,
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 190,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final item = items[index];
              return GestureDetector(
                onTap: () {
                  context.go('/home/tool-detail', extra: item);
                },
                child: _buildPublicToolCard(item),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildPublicToolCard(FirestoreToolItem item) {
    final isRent = item.type == 'rent';
    final priceLabel = isRent
        ? '${item.price.toStringAsFixed(0)} сум / ${item.priceUnit ?? 'день'}'
        : '${item.price.toStringAsFixed(0)} сум';

    return Container(
      width: 200,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppConstants.borderColor.withOpacity(0.6)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 90,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: item.imageUrls.isNotEmpty
                ? ClipRRect(
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(12)),
                    child: Image.network(
                      item.imageUrls.first,
                      fit: BoxFit.cover,
                    ),
                  )
                : Icon(
                    isRent ? Icons.construction : Icons.shopping_bag_outlined,
                    color: AppConstants.primaryColor,
                    size: 32,
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppConstants.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  priceLabel,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppConstants.primaryColor,
                  ),
                ),
                if (isRent && item.deposit != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Залог: ${item.deposit!.toStringAsFixed(0)} сум',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppConstants.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppConstants.spacingLG),
      child: Column(
        children: [
          _buildReviewCard('Алексей', 5.0, 'Отличный специалист! Очень доволен результатом.'),
          const SizedBox(height: 12),
          _buildReviewCard('Мария', 5.0, 'Профессионал своего дела. Рекомендую!'),
          const SizedBox(height: 12),
          _buildReviewCard('Дмитрий', 4.5, 'Хорошая работа, но можно было бы быстрее.'),
        ],
      ),
    );
  }

  Widget _buildReviewCard(String name, double rating, String text) {
    return Container(
      padding: const EdgeInsets.all(AppConstants.spacingMD),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        borderRadius: BorderRadius.circular(AppConstants.radiusLG),
        border: Border.all(color: AppConstants.borderColor.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppConstants.primaryColor.withOpacity(0.1),
                child: Text(
                  name[0],
                  style: TextStyle(
                    color: AppConstants.primaryColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Row(
                      children: List.generate(5, (index) {
                        return Icon(
                          Icons.star,
                          size: 14,
                          color: index < rating.floor()
                              ? Colors.amber
                              : Colors.grey[300],
                        );
                      }),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            text,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }

  Widget _buildBottomPanel() {
    return Container(
      padding: const EdgeInsets.all(AppConstants.spacingMD),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () {
                  openChatWithSpecialist(context, ref, widget.specialistId);
                },
                style: OutlinedButton.styleFrom(
                  backgroundColor: AppConstants.surfaceColor,
                  foregroundColor: AppConstants.primaryColor,
                  side: BorderSide(
                    color: AppConstants.primaryColor,
                    width: 2,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppConstants.radiusLG),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                ),
                child: Text(
                  'Написать',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    fontFamily: AppConstants.fontFamily,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: DesignSystemButton(
                text: 'Записаться',
                onPressed: () {
                  context.go('/home/booking/service-selection/${widget.specialistId}');
                },
                type: ButtonType.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

