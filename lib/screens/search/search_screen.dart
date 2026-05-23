import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../widgets/design_system_button.dart';
import '../../widgets/specialist_card.dart';
import '../../providers/firestore_providers.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedCategory = '';
  String _selectedFilter = '';
  bool _isListView = true; // true = список, false = карта

  final List<Map<String, dynamic>> _quickFilters = [
    {'id': 'nearby', 'label': 'Рядом', 'icon': Icons.location_on},
    {'id': 'high_rating', 'label': 'Высокий рейтинг', 'icon': Icons.star},
    {'id': 'low_price', 'label': 'Низкая цена', 'icon': Icons.attach_money},
    {'id': 'online', 'label': 'Онлайн', 'icon': Icons.online_prediction},
    {'id': 'newbies', 'label': 'Новички', 'icon': Icons.new_releases},
  ];

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
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        backgroundColor: AppConstants.backgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: TextField(
          controller: _searchController,
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'Поиск специалистов, услуг...',
            border: InputBorder.none,
            hintStyle: TextStyle(
              color: AppConstants.textHint,
              fontSize: 16,
            ),
          ),
          style: TextStyle(
            color: AppConstants.textPrimary,
            fontSize: 16,
          ),
          onChanged: (value) {
            setState(() {
              _searchQuery = value;
            });
            _performSearch();
          },
        ),
        actions: [
          TextButton(
            onPressed: () => context.pop(),
            child: const Text('Отмена'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Быстрые фильтры
          _buildQuickFilters(),
          
          // Переключатель вида
          _buildViewToggle(),
          
          // Результаты поиска
          Expanded(
            child: _isListView ? _buildListView() : _buildMapView(),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickFilters() {
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(vertical: AppConstants.spacingSM),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppConstants.spacingMD),
        itemCount: _quickFilters.length,
        itemBuilder: (context, index) {
          final filter = _quickFilters[index];
          final isSelected = _selectedFilter == filter['id'];
          
          return Container(
            margin: const EdgeInsets.only(right: AppConstants.spacingSM),
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _selectedFilter = isSelected ? '' : filter['id'];
                });
                _applyFilter();
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppConstants.spacingMD,
                  vertical: AppConstants.spacingSM,
                ),
                decoration: BoxDecoration(
                  color: isSelected 
                      ? AppConstants.primaryColor 
                      : AppConstants.surfaceColor,
                  borderRadius: BorderRadius.circular(AppConstants.radiusRound),
                  border: Border.all(
                    color: isSelected 
                        ? AppConstants.primaryColor 
                        : AppConstants.borderColor,
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      filter['icon'],
                      size: 16,
                      color: isSelected 
                          ? AppConstants.primaryContrastColor 
                          : AppConstants.textSecondary,
                    ),
                    const SizedBox(width: AppConstants.spacingXS),
                    Text(
                      filter['label'],
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: isSelected 
                            ? AppConstants.primaryContrastColor 
                            : AppConstants.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildViewToggle() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppConstants.spacingMD),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        borderRadius: BorderRadius.circular(AppConstants.radiusLG),
        border: Border.all(
          color: AppConstants.borderColor,
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _isListView = true;
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: AppConstants.spacingMD),
                decoration: BoxDecoration(
                  color: _isListView 
                      ? AppConstants.primaryColor 
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppConstants.radiusLG),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.list,
                      color: _isListView 
                          ? AppConstants.primaryContrastColor 
                          : AppConstants.textSecondary,
                      size: 20,
                    ),
                    const SizedBox(width: AppConstants.spacingXS),
                    Text(
                      'Список',
                      style: TextStyle(
                        color: _isListView 
                            ? AppConstants.primaryContrastColor 
                            : AppConstants.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _isListView = false;
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: AppConstants.spacingMD),
                decoration: BoxDecoration(
                  color: !_isListView 
                      ? AppConstants.primaryColor 
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppConstants.radiusLG),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.map,
                      color: !_isListView 
                          ? AppConstants.primaryContrastColor 
                          : AppConstants.textSecondary,
                      size: 20,
                    ),
                    const SizedBox(width: AppConstants.spacingXS),
                    Text(
                      'Карта',
                      style: TextStyle(
                        color: !_isListView 
                            ? AppConstants.primaryContrastColor 
                            : AppConstants.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildListView() {
    return Consumer(
      builder: (context, ref, child) {
        final specialistsState = ref.watch(specialistsProvider);
        
        if (specialistsState.isLoading) {
          return const Center(
            child: CircularProgressIndicator(),
          );
        }
        
        if (specialistsState.error != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.error_outline,
                  size: 64,
                  color: Colors.red,
                ),
                const SizedBox(height: 16),
                Text(
                  'Ошибка загрузки специалистов',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  specialistsState.error!,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppConstants.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }
        
        final filteredSpecialists = _getFilteredSpecialists(specialistsState.specialists);
        
        if (filteredSpecialists.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.search_off,
                  size: 64,
                  color: Colors.grey,
                ),
                const SizedBox(height: 16),
                Text(
                  'Специалисты не найдены',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'Попробуйте изменить параметры поиска',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppConstants.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }
        
        return ListView.builder(
          padding: const EdgeInsets.all(AppConstants.spacingMD),
          itemCount: filteredSpecialists.length,
          itemBuilder: (context, index) {
            final specialist = filteredSpecialists[index];
            return Container(
              margin: const EdgeInsets.only(bottom: AppConstants.spacingMD),
              child: SpecialistCard(
                name: specialist.name,
                category: specialist.category ?? 'Специалист',
                location: _formatLocation(specialist.location),
                rating: specialist.rating ?? 0.0,
                reviewCount: specialist.totalOrders ?? 0,
                avatarUrl: specialist.avatarUrl,
                isFeatured: specialist.isVerified,
                onTap: () {
                  context.go('/home/specialist/${specialist.id}');
                },
                onBook: () {
                  context.go('/home/order/create/${specialist.id}');
                },
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildMapView() {
    return Container(
      margin: const EdgeInsets.all(AppConstants.spacingMD),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        borderRadius: BorderRadius.circular(AppConstants.radiusLG),
        border: Border.all(
          color: AppConstants.borderColor,
          width: 1,
        ),
      ),
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.map_outlined,
              size: 64,
              color: Colors.grey,
            ),
            SizedBox(height: 16),
            Text(
              'Карта специалистов',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.grey,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Функция карты будет доступна в следующей версии',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  List<dynamic> _getFilteredSpecialists(List<dynamic> specialists) {
    List<dynamic> filtered = specialists;
    
    // Фильтр по поисковому запросу
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((specialist) {
        final name = specialist.name?.toLowerCase() ?? '';
        final category = specialist.category?.toLowerCase() ?? '';
        final description = specialist.description?.toLowerCase() ?? '';
        final query = _searchQuery.toLowerCase();
        
        return name.contains(query) || 
               category.contains(query) || 
               description.contains(query);
      }).toList();
    }
    
    // Фильтр по категории
    if (_selectedCategory.isNotEmpty) {
      filtered = filtered.where((specialist) {
        return specialist.category == _selectedCategory;
      }).toList();
    }
    
    // Применение быстрых фильтров
    switch (_selectedFilter) {
      case 'nearby':
        // Сортировка по расстоянию (в реальном приложении здесь была бы геолокация)
        filtered.sort((a, b) => (a.totalOrders ?? 0).compareTo(b.totalOrders ?? 0));
        break;
      case 'high_rating':
        filtered = filtered.where((s) => (s.rating ?? 0) >= 4.5).toList();
        filtered.sort((a, b) => (b.rating ?? 0).compareTo(a.rating ?? 0));
        break;
      case 'low_price':
        filtered.sort((a, b) => (a.pricePerHour ?? 0).compareTo(b.pricePerHour ?? 0));
        break;
      case 'online':
        // В реальном приложении здесь была бы проверка статуса онлайн
        filtered = filtered.where((s) => s.isVerified == true).toList();
        break;
      case 'newbies':
        filtered = filtered.where((s) => (s.totalOrders ?? 0) < 10).toList();
        break;
    }
    
    return filtered;
  }

  String _formatLocation(Map<String, dynamic>? location) {
    if (location == null) return 'Местоположение не указано';
    
    final lat = location['lat'] ?? location['latitude'];
    final lng = location['lng'] ?? location['longitude'];
    
    if (lat != null && lng != null) {
      return '${lat.toStringAsFixed(2)}, ${lng.toStringAsFixed(2)}';
    }
    
    return 'Местоположение не указано';
  }

  void _performSearch() {
    // Поиск будет выполняться автоматически через _getFilteredSpecialists
    setState(() {});
  }

  void _applyFilter() {
    // Фильтрация будет выполняться автоматически через _getFilteredSpecialists
    setState(() {});
  }
}
