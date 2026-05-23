import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../widgets/design_system_button.dart';
import '../../utils/chat_navigation.dart';

class AdvancedSearchScreen extends ConsumerStatefulWidget {
  const AdvancedSearchScreen({super.key});

  @override
  ConsumerState<AdvancedSearchScreen> createState() => _AdvancedSearchScreenState();
}

class _AdvancedSearchScreenState extends ConsumerState<AdvancedSearchScreen>
    with TickerProviderStateMixin {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late AnimationController _staggerController;
  
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _staggerAnimation;

  String _searchQuery = '';
  String _selectedCategory = 'all';
  String _selectedSort = 'relevance';
  String _selectedPriceRange = 'all';
  String _selectedRating = 'all';
  bool _isOnlineOnly = false;
  bool _isAvailableOnly = false;
  bool _showAdvancedFilters = false;

  final List<String> _categories = ['all', 'barber', 'cleaning', 'plumber', 'electrician', 'nanny', 'tutor', 'driver'];
  final Map<String, String> _categoryLabels = {
    'all': 'Все категории',
    'barber': 'Парикмахер',
    'cleaning': 'Уборка',
    'plumber': 'Сантехник',
    'electrician': 'Электрик',
    'nanny': 'Няня',
    'tutor': 'Репетитор',
    'driver': 'Водитель',
  };

  final List<String> _sortOptions = ['relevance', 'rating', 'price_low', 'price_high', 'distance', 'reviews'];
  final Map<String, String> _sortLabels = {
    'relevance': 'По релевантности',
    'rating': 'По рейтингу',
    'price_low': 'По цене (низкая → высокая)',
    'price_high': 'По цене (высокая → низкая)',
    'distance': 'По расстоянию',
    'reviews': 'По количеству отзывов',
  };

  final List<String> _priceRanges = ['all', '0-50000', '50000-100000', '100000-200000', '200000+'];
  final Map<String, String> _priceRangeLabels = {
    'all': 'Любая цена',
    '0-50000': 'До 50,000 сум',
    '50000-100000': '50,000 - 100,000 сум',
    '100000-200000': '100,000 - 200,000 сум',
    '200000+': 'От 200,000 сум',
  };

  final List<String> _ratings = ['all', '4.5', '4.0', '3.5', '3.0'];
  final Map<String, String> _ratingLabels = {
    'all': 'Любой рейтинг',
    '4.5': '4.5+ звезд',
    '4.0': '4.0+ звезд',
    '3.5': '3.5+ звезд',
    '3.0': '3.0+ звезд',
  };

  // Тестовые данные специалистов
  final List<Map<String, dynamic>> _allSpecialists = [
    {
      'id': '1',
      'name': 'Александр Петров',
      'category': 'barber',
      'rating': 4.8,
      'reviews': 127,
      'price': 50000,
      'distance': 0.5,
      'isAvailable': true,
      'isOnline': true,
      'avatar': null,
      'services': ['Мужская стрижка', 'Укладка', 'Бритье'],
      'address': 'ул. Амира Темура, 15, Ташкент',
      'description': 'Опытный парикмахер с 10-летним стажем',
    },
    {
      'id': '2',
      'name': 'Мария Иванова',
      'category': 'cleaning',
      'rating': 4.6,
      'reviews': 89,
      'price': 80000,
      'distance': 1.2,
      'isAvailable': true,
      'isOnline': false,
      'avatar': null,
      'services': ['Уборка квартиры', 'Генеральная уборка', 'Мытье окон'],
      'address': 'ул. Навои, 25, Ташкент',
      'description': 'Профессиональная уборка квартир и офисов',
    },
    {
      'id': '3',
      'name': 'Дмитрий Козлов',
      'category': 'plumber',
      'rating': 4.9,
      'reviews': 203,
      'price': 120000,
      'distance': 0.8,
      'isAvailable': false,
      'isOnline': true,
      'avatar': null,
      'services': ['Ремонт кранов', 'Установка сантехники', 'Прочистка труб'],
      'address': 'ул. Чилонзар, 8, Ташкент',
      'description': 'Сантехник с лицензией, все виды работ',
    },
    {
      'id': '4',
      'name': 'Анна Смирнова',
      'category': 'nanny',
      'rating': 4.7,
      'reviews': 156,
      'price': 150000,
      'distance': 2.1,
      'isAvailable': true,
      'isOnline': true,
      'avatar': null,
      'services': ['Няня на день', 'Присмотр за детьми', 'Развивающие игры'],
      'address': 'ул. Мирабад, 12, Ташкент',
      'description': 'Опытная няня с педагогическим образованием',
    },
    {
      'id': '5',
      'name': 'Игорь Волков',
      'category': 'electrician',
      'rating': 4.5,
      'reviews': 78,
      'price': 200000,
      'distance': 1.5,
      'isAvailable': true,
      'isOnline': false,
      'avatar': null,
      'services': ['Установка розеток', 'Ремонт проводки', 'Установка кондиционера'],
      'address': 'ул. Юнусабад, 45, Ташкент',
      'description': 'Электрик с допуском, безопасные работы',
    },
    {
      'id': '6',
      'name': 'Елена Козлова',
      'category': 'tutor',
      'rating': 4.9,
      'reviews': 234,
      'price': 100000,
      'distance': 0.9,
      'isAvailable': true,
      'isOnline': true,
      'avatar': null,
      'services': ['Математика', 'Физика', 'Подготовка к ЕГЭ'],
      'address': 'ул. Университетская, 7, Ташкент',
      'description': 'Репетитор по точным наукам, кандидат наук',
    },
    {
      'id': '7',
      'name': 'Сергей Морозов',
      'category': 'driver',
      'rating': 4.4,
      'reviews': 67,
      'price': 30000,
      'distance': 0.3,
      'isAvailable': true,
      'isOnline': true,
      'avatar': null,
      'services': ['Такси', 'Доставка', 'Трансфер'],
      'address': 'ул. Транспортная, 22, Ташкент',
      'description': 'Опытный водитель, безопасное вождение',
    },
  ];

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _searchController.addListener(_onSearchChanged);
  }

  void _initializeAnimations() {
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    
    _staggerController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeInOut,
    ));

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
    ));

    _staggerAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _staggerController,
      curve: Curves.easeInOut,
    ));

    _fadeController.forward();
    _slideController.forward();
    _staggerController.forward();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    _fadeController.dispose();
    _slideController.dispose();
    _staggerController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {
      _searchQuery = _searchController.text;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            // Поисковая панель
            _buildSearchPanel(),
            
            // Фильтры
            _buildFiltersPanel(),
            
            // Результаты поиска
            Expanded(
              child: _buildSearchResults(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchPanel() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        border: Border(
          bottom: BorderSide(
            color: AppConstants.borderColor,
            width: 1,
          ),
        ),
      ),
      child: FadeTransition(
        opacity: _fadeAnimation,
        child: SlideTransition(
          position: _slideAnimation,
          child: Column(
            children: [
              // Заголовок и кнопка назад
              Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: const Icon(Icons.arrow_back),
                  ),
                  Expanded(
                    child: Text(
                      'Поиск специалистов',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () {
                      _clearAllFilters();
                    },
                    icon: const Icon(Icons.refresh),
                    tooltip: 'Сбросить фильтры',
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Поле поиска
              TextField(
                controller: _searchController,
                focusNode: _searchFocusNode,
                decoration: InputDecoration(
                  hintText: 'Поиск по имени, услуге или описанию...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          onPressed: () {
                            _searchController.clear();
                          },
                          icon: const Icon(Icons.clear),
                        )
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppConstants.radiusLG),
                    borderSide: BorderSide(color: AppConstants.borderColor),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppConstants.radiusLG),
                    borderSide: BorderSide(color: AppConstants.primaryColor),
                  ),
                  filled: true,
                  fillColor: AppConstants.backgroundColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFiltersPanel() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: FadeTransition(
        opacity: _fadeAnimation,
        child: SlideTransition(
          position: _slideAnimation,
          child: Column(
            children: [
              // Основные фильтры
              Row(
                children: [
                  Expanded(
                    child: _buildFilterChip(
                      label: _categoryLabels[_selectedCategory]!,
                      onTap: () => _showCategoryFilter(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildFilterChip(
                      label: _sortLabels[_selectedSort]!,
                      onTap: () => _showSortFilter(),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 8),
              
              // Дополнительные фильтры
              Row(
                children: [
                  Expanded(
                    child: _buildFilterChip(
                      label: _priceRangeLabels[_selectedPriceRange]!,
                      onTap: () => _showPriceFilter(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildFilterChip(
                      label: _ratingLabels[_selectedRating]!,
                      onTap: () => _showRatingFilter(),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 8),
              
              // Переключатели
              Row(
                children: [
                  Expanded(
                    child: FilterChip(
                      label: const Text('Только онлайн'),
                      selected: _isOnlineOnly,
                      onSelected: (selected) {
                        setState(() {
                          _isOnlineOnly = selected;
                        });
                      },
                      selectedColor: AppConstants.primaryColor.withOpacity(0.2),
                      checkmarkColor: AppConstants.primaryColor,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilterChip(
                      label: const Text('Только доступные'),
                      selected: _isAvailableOnly,
                      onSelected: (selected) {
                        setState(() {
                          _isAvailableOnly = selected;
                        });
                      },
                      selectedColor: AppConstants.primaryColor.withOpacity(0.2),
                      checkmarkColor: AppConstants.primaryColor,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppConstants.backgroundColor,
          borderRadius: BorderRadius.circular(AppConstants.radiusLG),
          border: Border.all(
            color: AppConstants.borderColor,
            width: 1,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const Icon(
              Icons.arrow_drop_down,
              size: 20,
              color: AppConstants.textSecondary,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchResults() {
    final results = _getFilteredResults();
    
    if (results.isEmpty) {
      return _buildEmptyState();
    }

    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: results.length,
          itemBuilder: (context, index) {
            final specialist = results[index];
            return TweenAnimationBuilder<double>(
              duration: Duration(milliseconds: 400 + (index * 100)),
              tween: Tween(begin: 0.0, end: 1.0),
              builder: (context, value, child) {
                return Transform.scale(
                  scale: 0.9 + (0.1 * value),
                  child: Opacity(
                    opacity: value,
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _buildSpecialistCard(specialist),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }

  Widget _buildSpecialistCard(Map<String, dynamic> specialist) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        borderRadius: BorderRadius.circular(AppConstants.radiusLG),
        border: Border.all(
          color: AppConstants.borderColor,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            context.go('/home/specialist/${specialist['id']}');
          },
          borderRadius: BorderRadius.circular(AppConstants.radiusLG),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Заголовок карточки
              Row(
                children: [
                  // Аватар
                  Stack(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: AppConstants.primaryColor.withOpacity(0.1),
                        backgroundImage: specialist['avatar'] != null
                            ? NetworkImage(specialist['avatar'])
                            : null,
                        child: specialist['avatar'] == null
                            ? Text(
                                specialist['name'][0].toUpperCase(),
                                style: TextStyle(
                                  color: AppConstants.primaryColor,
                                  fontWeight: FontWeight.bold,
                                ),
                              )
                            : null,
                      ),
                      if (specialist['isOnline'])
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: Colors.green,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white,
                                width: 2,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  
                  const SizedBox(width: 12),
                  
                  // Информация о специалисте
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                specialist['name'],
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: specialist['isAvailable'] 
                                    ? Colors.green.withOpacity(0.1)
                                    : Colors.red.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                specialist['isAvailable'] ? 'Доступен' : 'Занят',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: specialist['isAvailable'] ? Colors.green : Colors.red,
                                ),
                              ),
                            ),
                          ],
                        ),
                        
                        const SizedBox(height: 4),
                        
                        Text(
                          specialist['description'],
                          style: TextStyle(
                            color: AppConstants.textSecondary,
                            fontSize: 14,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              // Рейтинг и отзывы
              Row(
                children: [
                  Icon(
                    Icons.star,
                    size: 16,
                    color: Colors.amber,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${specialist['rating']} (${specialist['reviews']} отзывов)',
                    style: TextStyle(
                      color: AppConstants.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Icon(
                    Icons.location_on,
                    size: 16,
                    color: AppConstants.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${specialist['distance']} км',
                    style: TextStyle(
                      color: AppConstants.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              // Услуги
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: specialist['services'].take(3).map<Widget>((service) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppConstants.primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      service,
                      style: TextStyle(
                        color: AppConstants.primaryColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }).toList(),
              ),
              
              const SizedBox(height: 12),
              
              // Цена и кнопки действий
              Row(
                children: [
                  Text(
                    '${specialist['price'].toString().replaceAllMapped(
                      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                      (Match m) => '${m[1]},',
                    )} сум/час',
                    style: TextStyle(
                      color: AppConstants.primaryColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const Spacer(),
                  DesignSystemButton(
                    text: 'Написать',
                    onPressed: () {
                      final id = specialist['id']?.toString();
                      if (id == null || id.isEmpty) return;
                      openChatWithSpecialist(context, ref, id);
                    },
                    type: ButtonType.secondary,
                  ),
                  const SizedBox(width: 8),
                  DesignSystemButton(
                    text: 'Заказать',
                    onPressed: () {
                      context.go('/home/specialist/${specialist['id']}');
                    },
                    type: ButtonType.primary,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: AppConstants.primaryColor.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.search_off,
                    size: 60,
                    color: AppConstants.primaryColor.withOpacity(0.6),
                  ),
                ),
                
                const SizedBox(height: 24),
                
                Text(
                  'Ничего не найдено',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                
                const SizedBox(height: 8),
                
                Text(
                  'Попробуйте изменить параметры поиска',
                  style: TextStyle(
                    color: AppConstants.textSecondary,
                    fontSize: 16,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 32),
                
                DesignSystemButton(
                  text: 'Сбросить фильтры',
                  onPressed: () {
                    _clearAllFilters();
                  },
                  type: ButtonType.primary,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _getFilteredResults() {
    List<Map<String, dynamic>> results = List.from(_allSpecialists);
    
    // Поиск по тексту
    if (_searchQuery.isNotEmpty) {
      results = results.where((specialist) {
        final query = _searchQuery.toLowerCase();
        return specialist['name'].toLowerCase().contains(query) ||
               specialist['description'].toLowerCase().contains(query) ||
               specialist['services'].any((service) => 
                   service.toLowerCase().contains(query));
      }).toList();
    }
    
    // Фильтр по категории
    if (_selectedCategory != 'all') {
      results = results.where((s) => s['category'] == _selectedCategory).toList();
    }
    
    // Фильтр по цене
    if (_selectedPriceRange != 'all') {
      final range = _selectedPriceRange.split('-');
      if (range.length == 2) {
        final minPrice = int.parse(range[0]);
        final maxPrice = range[1] == '+' ? double.infinity : int.parse(range[1]);
        results = results.where((s) {
          final price = s['price'] as int;
          return price >= minPrice && (maxPrice == double.infinity || price <= maxPrice);
        }).toList();
      }
    }
    
    // Фильтр по рейтингу
    if (_selectedRating != 'all') {
      final minRating = double.parse(_selectedRating);
      results = results.where((s) => s['rating'] >= minRating).toList();
    }
    
    // Фильтр по онлайн статусу
    if (_isOnlineOnly) {
      results = results.where((s) => s['isOnline'] == true).toList();
    }
    
    // Фильтр по доступности
    if (_isAvailableOnly) {
      results = results.where((s) => s['isAvailable'] == true).toList();
    }
    
    // Сортировка
    switch (_selectedSort) {
      case 'rating':
        results.sort((a, b) => b['rating'].compareTo(a['rating']));
        break;
      case 'price_low':
        results.sort((a, b) => a['price'].compareTo(b['price']));
        break;
      case 'price_high':
        results.sort((a, b) => b['price'].compareTo(a['price']));
        break;
      case 'distance':
        results.sort((a, b) => a['distance'].compareTo(b['distance']));
        break;
      case 'reviews':
        results.sort((a, b) => b['reviews'].compareTo(a['reviews']));
        break;
      case 'relevance':
      default:
        // Сортировка по релевантности (поиск + рейтинг)
        results.sort((a, b) {
          final aRelevance = _calculateRelevance(a);
          final bRelevance = _calculateRelevance(b);
          return bRelevance.compareTo(aRelevance);
        });
        break;
    }
    
    return results;
  }

  double _calculateRelevance(Map<String, dynamic> specialist) {
    double relevance = specialist['rating'] as double;
    
    // Бонус за онлайн статус
    if (specialist['isOnline'] == true) {
      relevance += 0.5;
    }
    
    // Бонус за доступность
    if (specialist['isAvailable'] == true) {
      relevance += 0.3;
    }
    
    // Бонус за количество отзывов
    relevance += (specialist['reviews'] as int) / 1000.0;
    
    return relevance;
  }

  void _clearAllFilters() {
    setState(() {
      _searchQuery = '';
      _searchController.clear();
      _selectedCategory = 'all';
      _selectedSort = 'relevance';
      _selectedPriceRange = 'all';
      _selectedRating = 'all';
      _isOnlineOnly = false;
      _isAvailableOnly = false;
    });
  }

  void _showCategoryFilter() {
    _showFilterBottomSheet(
      title: 'Выберите категорию',
      options: _categories,
      labels: _categoryLabels,
      selected: _selectedCategory,
      onSelected: (value) {
        setState(() {
          _selectedCategory = value;
        });
      },
    );
  }

  void _showSortFilter() {
    _showFilterBottomSheet(
      title: 'Сортировка',
      options: _sortOptions,
      labels: _sortLabels,
      selected: _selectedSort,
      onSelected: (value) {
        setState(() {
          _selectedSort = value;
        });
      },
    );
  }

  void _showPriceFilter() {
    _showFilterBottomSheet(
      title: 'Ценовой диапазон',
      options: _priceRanges,
      labels: _priceRangeLabels,
      selected: _selectedPriceRange,
      onSelected: (value) {
        setState(() {
          _selectedPriceRange = value;
        });
      },
    );
  }

  void _showRatingFilter() {
    _showFilterBottomSheet(
      title: 'Минимальный рейтинг',
      options: _ratings,
      labels: _ratingLabels,
      selected: _selectedRating,
      onSelected: (value) {
        setState(() {
          _selectedRating = value;
        });
      },
    );
  }

  void _showFilterBottomSheet({
    required String title,
    required List<String> options,
    required Map<String, String> labels,
    required String selected,
    required ValueChanged<String> onSelected,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: AppConstants.surfaceColor,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
            ),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),
              
              ...options.map((option) {
                final isSelected = selected == option;
                return ListTile(
                  title: Text(labels[option]!),
                  trailing: isSelected ? const Icon(Icons.check, color: AppConstants.primaryColor) : null,
                  onTap: () {
                    onSelected(option);
                    Navigator.pop(context);
                  },
                );
              }).toList(),
              
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }
}
