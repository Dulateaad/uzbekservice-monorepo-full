import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import '../../constants/app_constants.dart';
import '../../models/firestore_models.dart';
import '../../services/firestore_service.dart';
import '../../widgets/simple_google_maps_widget.dart';
import '../../services/google_maps_service.dart';

/// Экран поиска специалистов рядом на карте
class FindNearbyScreen extends ConsumerStatefulWidget {
  const FindNearbyScreen({super.key});

  @override
  ConsumerState<FindNearbyScreen> createState() => _FindNearbyScreenState();
}

class _FindNearbyScreenState extends ConsumerState<FindNearbyScreen>
    with TickerProviderStateMixin {
  // Текущее местоположение пользователя
  double _userLat = 41.2995; // Ташкент по умолчанию
  double _userLng = 69.2401;
  
  // Состояние загрузки
  bool _isLoadingLocation = true;
  bool _isLoadingSpecialists = true;
  
  // Список специалистов
  List<FirestoreUser> _specialists = [];
  List<FirestoreUser> _filteredSpecialists = [];
  
  // Фильтры
  String _selectedCategory = 'all';
  double _searchRadius = 10.0; // км
  String _sortBy = 'distance';
  String _serviceSearchQuery = ''; // Поиск по названию услуги
  final TextEditingController _searchController = TextEditingController();
  
  // Выбранный специалист
  FirestoreUser? _selectedSpecialist;
  
  // Bottom sheet controller
  final DraggableScrollableController _sheetController = DraggableScrollableController();
  
  // Анимации
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _initAnimations();
    _initializeScreen();
  }

  void _initAnimations() {
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeOut),
    );
    _fadeController.forward();
  }

  Future<void> _initializeScreen() async {
    await Future.wait([
      _getCurrentLocation(),
      _loadSpecialists(),
    ]);
  }

  Future<void> _getCurrentLocation() async {
    try {
      if (kIsWeb) {
        // Для веба используем Geolocator
        LocationPermission permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) {
          permission = await Geolocator.requestPermission();
        }
        
        if (permission == LocationPermission.denied || 
            permission == LocationPermission.deniedForever) {
          print('⚠️ Геолокация отклонена, используем Ташкент');
          setState(() => _isLoadingLocation = false);
          return;
        }
        
        Position position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
          timeLimit: const Duration(seconds: 5),
        );
        
        if (mounted) {
          setState(() {
            _userLat = position.latitude;
            _userLng = position.longitude;
            _isLoadingLocation = false;
          });
          print('✅ Местоположение: ${position.latitude}, ${position.longitude}');
        }
      } else {
        setState(() => _isLoadingLocation = false);
      }
    } catch (e) {
      print('⚠️ Ошибка геолокации: $e');
      if (mounted) {
        setState(() => _isLoadingLocation = false);
      }
    }
  }

  Future<void> _loadSpecialists() async {
    try {
      final specialists = await FirestoreService.getSpecialists();
      
      // Добавляем тестового барбера с координатами рядом с пользователем
      // Координаты на расстоянии ~2 км от пользователя
      final testBarberLat = _userLat + 0.018; // ~2 км на север
      final testBarberLng = _userLng + 0.018; // ~2 км на восток
      
      final testBarber = FirestoreUser(
        id: 'test-barber-1',
        phoneNumber: '+998901234567',
        name: 'Тестовый Барбер',
        userType: 'specialist',
        category: 'barber',
        location: {
          'lat': testBarberLat,
          'lng': testBarberLng,
          'address': 'ул. Тестовая, 123',
        },
        rating: 4.8,
        totalOrders: 150,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        isVerified: true,
      );
      
      if (mounted) {
        setState(() {
          _specialists = [testBarber, ...specialists];
          _isLoadingSpecialists = false;
        });
        _applyFilters();
      }
    } catch (e) {
      print('❌ Ошибка загрузки специалистов: $e');
      if (mounted) {
        setState(() => _isLoadingSpecialists = false);
      }
    }
  }

  void _applyFilters() {
    List<FirestoreUser> filtered = List.from(_specialists);
    
    // Фильтр по поиску услуги
    if (_serviceSearchQuery.isNotEmpty) {
      final query = _serviceSearchQuery.toLowerCase();
      filtered = filtered.where((s) {
        // Ищем в категории или имени специалиста
        final categoryMatch = s.category?.toLowerCase().contains(query) ?? false;
        final nameMatch = s.name.toLowerCase().contains(query);
        // Можно добавить поиск по услугам, если они есть
        return categoryMatch || nameMatch;
      }).toList();
    }
    
    // Фильтр по категории
    if (_selectedCategory != 'all') {
      filtered = filtered.where((s) => s.category == _selectedCategory).toList();
    }
    
    // Добавляем расстояние и фильтруем по радиусу
    filtered = filtered.where((s) {
      if (s.location == null) return false;
      final distance = _calculateDistance(s);
      return distance <= _searchRadius;
    }).toList();
    
    // Сортировка
    switch (_sortBy) {
      case 'distance':
        filtered.sort((a, b) => _calculateDistance(a).compareTo(_calculateDistance(b)));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating ?? 0).compareTo(a.rating ?? 0));
        break;
      case 'price':
        filtered.sort((a, b) => (a.pricePerHour ?? 0).compareTo(b.pricePerHour ?? 0));
        break;
    }
    
    setState(() {
      _filteredSpecialists = filtered;
    });
  }

  double _calculateDistance(FirestoreUser specialist) {
    if (specialist.location == null) return double.infinity;
    
    final lat = specialist.location!['lat'] as double? ?? 0;
    final lng = specialist.location!['lng'] as double? ?? 0;
    
    // Формула Haversine
    const R = 6371.0; // Радиус Земли в км
    final dLat = _toRadians(lat - _userLat);
    final dLon = _toRadians(lng - _userLng);
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_toRadians(_userLat)) * math.cos(_toRadians(lat)) *
        math.sin(dLon / 2) * math.sin(dLon / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return R * c;
  }

  double _toRadians(double degree) {
    return degree * math.pi / 180;
  }

  String _formatDistance(double km) {
    if (km < 1) {
      return '${(km * 1000).round()} м';
    }
    return '${km.toStringAsFixed(1)} км';
  }

  String _formatPrice(double? price) {
    if (price == null) return 'Договорная';
    return '${price.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]} ',
    )} сум';
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _sheetController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = _isLoadingLocation || _isLoadingSpecialists;
    
    return Scaffold(
      body: Stack(
        children: [
          // Карта с маркерами
          _buildMap(),
          
          // Верхняя панель
          _buildTopBar(),
          
          // Панель поиска и фильтров
          _buildSearchPanel(),
          
          // Bottom Sheet со списком специалистов
          _buildSpecialistsSheet(),
          
          // Индикатор загрузки
          if (isLoading) _buildLoadingOverlay(),
          
          // Карточка выбранного специалиста
          if (_selectedSpecialist != null) _buildSelectedSpecialistCard(),
        ],
      ),
    );
  }

  Widget _buildMap() {
    if (_isLoadingLocation) {
      return Container(
        color: AppConstants.backgroundColor,
        child: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }
    
    if (!kIsWeb) {
      return _buildMapPlaceholder();
    }
    
    // Создаем список маркеров для специалистов
    final markers = _filteredSpecialists.map((specialist) {
      if (specialist.location == null) return null;
      final lat = specialist.location!['lat'] as double?;
      final lng = specialist.location!['lng'] as double?;
      if (lat == null || lng == null) return null;
      
      return {
        'lat': lat,
        'lng': lng,
        'title': specialist.name,
        'category': specialist.category,
      };
    }).where((m) => m != null).cast<Map<String, dynamic>>().toList();
    
    return SimpleGoogleMapsWidget(
      lat: _userLat,
      lng: _userLng,
      zoom: 13,
      height: MediaQuery.of(context).size.height,
      width: MediaQuery.of(context).size.width,
      markers: markers,
    );
  }

  Widget _buildMapPlaceholder() {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppConstants.primaryColor.withOpacity(0.1),
            AppConstants.backgroundColor,
          ],
        ),
      ),
      child: Stack(
        children: [
          // Фоновый паттерн для имитации карты
          CustomPaint(
            size: Size.infinite,
            painter: _MapPatternPainter(),
          ),
          
          // Маркеры специалистов
          ..._filteredSpecialists.asMap().entries.map((entry) {
            final index = entry.key;
            final specialist = entry.value;
            return _buildSpecialistMarker(specialist, index);
          }),
          
          // Маркер пользователя
          Center(
            child: Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: AppConstants.primaryColor,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 3),
                boxShadow: [
                  BoxShadow(
                    color: AppConstants.primaryColor.withOpacity(0.4),
                    blurRadius: 12,
                    spreadRadius: 4,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpecialistMarker(FirestoreUser specialist, int index) {
    // Рассчитываем позицию маркера относительно центра
    final distance = _calculateDistance(specialist);
    final angle = (index * 45.0) * math.pi / 180; // Распределяем по кругу
    final radius = math.min(distance * 20, 150.0); // Масштаб расстояния
    
    final screenCenter = MediaQuery.of(context).size / 2;
    final x = screenCenter.width + radius * math.cos(angle);
    final y = screenCenter.height + radius * math.sin(angle);
    
    final categoryColor = _getCategoryColor(specialist.category);
    final isSelected = _selectedSpecialist?.id == specialist.id;
    
    return Positioned(
      left: x - 20,
      top: y - 40,
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedSpecialist = specialist;
          });
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          child: Column(
            children: [
              Container(
                width: isSelected ? 48 : 40,
                height: isSelected ? 48 : 40,
                decoration: BoxDecoration(
                  color: categoryColor,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isSelected ? Colors.white : Colors.white70,
                    width: isSelected ? 4 : 2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: categoryColor.withOpacity(0.4),
                      blurRadius: isSelected ? 16 : 8,
                      spreadRadius: isSelected ? 4 : 2,
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    specialist.name.isNotEmpty ? specialist.name[0].toUpperCase() : '?',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: isSelected ? 20 : 16,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 4,
                    ),
                  ],
                ),
                child: Text(
                  _formatDistance(distance),
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: EdgeInsets.only(
          top: MediaQuery.of(context).padding.top + 8,
          left: 16,
          right: 16,
          bottom: 12,
        ),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.white,
              Colors.white.withOpacity(0.95),
              Colors.white.withOpacity(0),
            ],
          ),
        ),
        child: Row(
          children: [
            // Кнопка назад
            Material(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              elevation: 2,
              shadowColor: Colors.black.withOpacity(0.1),
              child: InkWell(
                onTap: () => context.pop(),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  child: const Icon(Icons.arrow_back, size: 22),
                ),
              ),
            ),
            
            const SizedBox(width: 12),
            
            // Заголовок
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Найти рядом',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppConstants.textPrimary,
                    ),
                  ),
                  Text(
                    '${_filteredSpecialists.length} специалистов в радиусе ${_searchRadius.toInt()} км',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppConstants.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            
            // Кнопка фильтров
            Material(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              elevation: 2,
              shadowColor: Colors.black.withOpacity(0.1),
              child: InkWell(
                onTap: _showFiltersSheet,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  child: Badge(
                    isLabelVisible: _selectedCategory != 'all',
                    child: const Icon(Icons.tune, size: 22),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchPanel() {
    return Positioned(
      top: MediaQuery.of(context).padding.top + 70,
      left: 16,
      right: 16,
      child: FadeTransition(
        opacity: _fadeAnimation,
        child: Column(
          children: [
            // Поле поиска услуг
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Поиск услуги (например: стрижка, маникюр...)',
                  prefixIcon: const Icon(Icons.search, color: AppConstants.primaryColor),
                  suffixIcon: _serviceSearchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            setState(() {
                              _serviceSearchQuery = '';
                              _searchController.clear();
                            });
                            _applyFilters();
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
                onChanged: (value) {
                  setState(() {
                    _serviceSearchQuery = value;
                  });
                  _applyFilters();
                },
              ),
            ),
            
            const SizedBox(height: 12),
            
            // Категории (горизонтальный скролл)
            SizedBox(
              height: 44,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _buildCategoryChip('all', 'Все', Icons.apps),
                  ...AppConstants.serviceCategories.take(6).map((cat) {
                    return _buildCategoryChip(
                      cat['id'] as String,
                      cat['name'] as String,
                      cat['icon'] as IconData,
                      color: cat['color'] as Color,
                    );
                  }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryChip(String id, String name, IconData icon, {Color? color}) {
    final isSelected = _selectedCategory == id;
    final chipColor = color ?? AppConstants.primaryColor;
    
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Material(
        color: isSelected ? chipColor : Colors.white,
        borderRadius: BorderRadius.circular(22),
        elevation: isSelected ? 4 : 2,
        shadowColor: isSelected ? chipColor.withOpacity(0.4) : Colors.black.withOpacity(0.1),
        child: InkWell(
          onTap: () {
            setState(() {
              _selectedCategory = id;
            });
            _applyFilters();
          },
          borderRadius: BorderRadius.circular(22),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  icon,
                  size: 18,
                  color: isSelected ? Colors.white : chipColor,
                ),
                const SizedBox(width: 6),
                Text(
                  name,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isSelected ? Colors.white : AppConstants.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMyLocationButton() {
    return Positioned(
      right: 16,
      bottom: MediaQuery.of(context).size.height * 0.45 + 20,
      child: Column(
        children: [
          // Кнопка "Моё местоположение"
          Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            elevation: 4,
            shadowColor: Colors.black.withOpacity(0.15),
            child: InkWell(
              onTap: () async {
                setState(() => _isLoadingLocation = true);
                await _getCurrentLocation();
                _applyFilters();
              },
              borderRadius: BorderRadius.circular(14),
              child: Container(
                width: 52,
                height: 52,
                alignment: Alignment.center,
                child: Icon(
                  Icons.my_location,
                  color: AppConstants.primaryColor,
                  size: 24,
                ),
              ),
            ),
          ),
          
          const SizedBox(height: 12),
          
          // Кнопка увеличения радиуса
          Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            elevation: 4,
            shadowColor: Colors.black.withOpacity(0.15),
            child: InkWell(
              onTap: () {
                setState(() {
                  _searchRadius = _searchRadius >= 50 ? 5 : _searchRadius + 5;
                });
                _applyFilters();
              },
              borderRadius: BorderRadius.circular(14),
              child: Container(
                width: 52,
                height: 52,
                alignment: Alignment.center,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.radar, size: 20),
                    Text(
                      '${_searchRadius.toInt()}км',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
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

  Widget _buildSpecialistsSheet() {
    return DraggableScrollableSheet(
      controller: _sheetController,
      initialChildSize: 0.35,
      minChildSize: 0.15,
      maxChildSize: 0.85,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [
              BoxShadow(
                color: Colors.black12,
                blurRadius: 20,
                offset: Offset(0, -5),
              ),
            ],
          ),
          child: Column(
            children: [
              // Ручка
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              
              // Заголовок
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Text(
                      'Специалисты рядом',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    // Сортировка
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.sort),
                      onSelected: (value) {
                        setState(() => _sortBy = value);
                        _applyFilters();
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'distance',
                          child: Text('По расстоянию'),
                        ),
                        const PopupMenuItem(
                          value: 'rating',
                          child: Text('По рейтингу'),
                        ),
                        const PopupMenuItem(
                          value: 'price',
                          child: Text('По цене'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 8),
              
              // Список специалистов
              Expanded(
                child: _filteredSpecialists.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        controller: scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _filteredSpecialists.length,
                        itemBuilder: (context, index) {
                          return _buildSpecialistCard(_filteredSpecialists[index]);
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSpecialistCard(FirestoreUser specialist) {
    final distance = _calculateDistance(specialist);
    final categoryColor = _getCategoryColor(specialist.category);
    final isSelected = _selectedSpecialist?.id == specialist.id;
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: isSelected ? categoryColor.withOpacity(0.05) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        elevation: isSelected ? 4 : 1,
        shadowColor: isSelected ? categoryColor.withOpacity(0.3) : Colors.black12,
        child: InkWell(
          onTap: () {
            setState(() {
              _selectedSpecialist = specialist;
            });
          },
          onDoubleTap: () {
            context.push('/home/specialist/${specialist.id}');
          },
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isSelected ? categoryColor : Colors.grey.shade200,
                width: isSelected ? 2 : 1,
              ),
            ),
            child: Row(
              children: [
                // Аватар
                Stack(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: categoryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(14),
                        image: specialist.avatarUrl != null
                            ? DecorationImage(
                                image: NetworkImage(specialist.avatarUrl!),
                                fit: BoxFit.cover,
                              )
                            : null,
                      ),
                      child: specialist.avatarUrl == null
                          ? Center(
                              child: Text(
                                specialist.name.isNotEmpty 
                                    ? specialist.name[0].toUpperCase() 
                                    : '?',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: categoryColor,
                                ),
                              ),
                            )
                          : null,
                    ),
                    // Индикатор онлайн
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: Colors.green,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(width: 14),
                
                // Информация
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              specialist.name,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (specialist.isVerified)
                            const Icon(
                              Icons.verified,
                              size: 18,
                              color: AppConstants.primaryColor,
                            ),
                        ],
                      ),
                      
                      const SizedBox(height: 4),
                      
                      // Категория и расстояние
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: categoryColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              _getCategoryName(specialist.category),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: categoryColor,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(
                            Icons.location_on,
                            size: 14,
                            color: AppConstants.textSecondary,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            _formatDistance(distance),
                            style: TextStyle(
                              fontSize: 12,
                              color: AppConstants.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 6),
                      
                      // Рейтинг и цена
                      Row(
                        children: [
                          // Рейтинг
                          Row(
                            children: [
                              const Icon(Icons.star, size: 16, color: Colors.amber),
                              const SizedBox(width: 2),
                              Text(
                                (specialist.rating ?? 0).toStringAsFixed(1),
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                ' (${specialist.totalOrders ?? 0})',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppConstants.textSecondary,
                                ),
                              ),
                            ],
                          ),
                          
                          const Spacer(),
                          
                          // Цена
                          Text(
                            _formatPrice(specialist.pricePerHour),
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: categoryColor,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(width: 8),
                
                // Кнопка действия
                Material(
                  color: categoryColor,
                  borderRadius: BorderRadius.circular(12),
                  child: InkWell(
                    onTap: () {
                      context.push('/home/specialist/${specialist.id}');
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 44,
                      height: 44,
                      alignment: Alignment.center,
                      child: const Icon(
                        Icons.arrow_forward,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSelectedSpecialistCard() {
    final specialist = _selectedSpecialist!;
    final distance = _calculateDistance(specialist);
    final categoryColor = _getCategoryColor(specialist.category);
    
    return Positioned(
      left: 16,
      right: 80,
      bottom: MediaQuery.of(context).size.height * 0.36,
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        elevation: 8,
        shadowColor: categoryColor.withOpacity(0.3),
        child: InkWell(
          onTap: () {
            context.push('/home/specialist/${specialist.id}');
          },
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Аватар
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: categoryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      specialist.name.isNotEmpty ? specialist.name[0].toUpperCase() : '?',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: categoryColor,
                      ),
                    ),
                  ),
                ),
                
                const SizedBox(width: 12),
                
                // Информация
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        specialist.name,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(Icons.star, size: 14, color: Colors.amber),
                          const SizedBox(width: 2),
                          Text(
                            '${(specialist.rating ?? 0).toStringAsFixed(1)} • ${_formatDistance(distance)}',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppConstants.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                
                // Кнопка закрытия
                IconButton(
                  onPressed: () {
                    setState(() {
                      _selectedSpecialist = null;
                    });
                  },
                  icon: const Icon(Icons.close, size: 20),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search_off,
              size: 64,
              color: AppConstants.textSecondary.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            const Text(
              'Специалисты не найдены',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Попробуйте увеличить радиус поиска\nили выбрать другую категорию',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: AppConstants.textSecondary,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                setState(() {
                  _searchRadius = 50;
                  _selectedCategory = 'all';
                });
                _applyFilters();
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Сбросить фильтры'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppConstants.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingOverlay() {
    return Positioned.fill(
      child: Container(
        color: Colors.white.withOpacity(0.8),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(
                _isLoadingLocation ? 'Определяем местоположение...' : 'Загружаем специалистов...',
                style: TextStyle(
                  fontSize: 16,
                  color: AppConstants.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showFiltersSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.6,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  // Ручка
                  Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  
                  // Заголовок
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Row(
                      children: [
                        const Text(
                          'Фильтры',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Spacer(),
                        TextButton(
                          onPressed: () {
                            setModalState(() {
                              _searchRadius = 10;
                              _selectedCategory = 'all';
                              _sortBy = 'distance';
                            });
                          },
                          child: const Text('Сбросить'),
                        ),
                      ],
                    ),
                  ),
                  
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(20),
                      children: [
                        // Радиус поиска
                        const Text(
                          'Радиус поиска',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: Slider(
                                value: _searchRadius,
                                min: 1,
                                max: 50,
                                divisions: 49,
                                activeColor: AppConstants.primaryColor,
                                onChanged: (value) {
                                  setModalState(() {
                                    _searchRadius = value;
                                  });
                                },
                              ),
                            ),
                            SizedBox(
                              width: 60,
                              child: Text(
                                '${_searchRadius.toInt()} км',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        
                        const SizedBox(height: 24),
                        
                        // Сортировка
                        const Text(
                          'Сортировка',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          children: [
                            _buildSortChip(setModalState, 'distance', 'По расстоянию'),
                            _buildSortChip(setModalState, 'rating', 'По рейтингу'),
                            _buildSortChip(setModalState, 'price', 'По цене'),
                          ],
                        ),
                        
                        const SizedBox(height: 24),
                        
                        // Категории
                        const Text(
                          'Категория',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _buildFilterCategoryChip(setModalState, 'all', 'Все'),
                            ...AppConstants.serviceCategories.map((cat) {
                              return _buildFilterCategoryChip(
                                setModalState,
                                cat['id'] as String,
                                cat['name'] as String,
                              );
                            }),
                          ],
                        ),
                      ],
                    ),
                  ),
                  
                  // Кнопка применить
                  Padding(
                    padding: EdgeInsets.only(
                      left: 20,
                      right: 20,
                      bottom: MediaQuery.of(context).padding.bottom + 20,
                    ),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pop(context);
                          _applyFilters();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppConstants.primaryColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          'Применить',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildSortChip(StateSetter setModalState, String value, String label) {
    final isSelected = _sortBy == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: AppConstants.primaryColor.withOpacity(0.2),
      onSelected: (selected) {
        setModalState(() {
          _sortBy = value;
        });
      },
    );
  }

  Widget _buildFilterCategoryChip(StateSetter setModalState, String id, String name) {
    final isSelected = _selectedCategory == id;
    return ChoiceChip(
      label: Text(name),
      selected: isSelected,
      selectedColor: AppConstants.primaryColor.withOpacity(0.2),
      onSelected: (selected) {
        setModalState(() {
          _selectedCategory = id;
        });
      },
    );
  }

  Color _getCategoryColor(String? category) {
    if (category == null) return AppConstants.primaryColor;
    
    final cat = AppConstants.serviceCategories.firstWhere(
      (c) => c['id'] == category,
      orElse: () => {'color': AppConstants.primaryColor},
    );
    return cat['color'] as Color? ?? AppConstants.primaryColor;
  }

  String _getCategoryName(String? category) {
    if (category == null) return 'Специалист';
    
    final cat = AppConstants.serviceCategories.firstWhere(
      (c) => c['id'] == category,
      orElse: () => {'name': 'Специалист'},
    );
    return cat['name'] as String? ?? 'Специалист';
  }
}

/// Painter для фонового паттерна карты
class _MapPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.grey.withOpacity(0.1)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    // Рисуем сетку
    const spacing = 50.0;
    for (double x = 0; x < size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }

    // Круги для имитации зон
    final centerPaint = Paint()
      ..color = AppConstants.primaryColor.withOpacity(0.1)
      ..style = PaintingStyle.fill;
    
    final center = Offset(size.width / 2, size.height / 2);
    canvas.drawCircle(center, 150, centerPaint);
    
    centerPaint.color = AppConstants.primaryColor.withOpacity(0.05);
    canvas.drawCircle(center, 250, centerPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

