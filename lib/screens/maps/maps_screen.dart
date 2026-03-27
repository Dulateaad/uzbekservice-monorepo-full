import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../../constants/app_constants.dart';
import '../../widgets/simple_google_maps_widget.dart';
import '../../services/google_maps_service.dart';

class MapsScreen extends StatefulWidget {
  const MapsScreen({super.key});

  @override
  State<MapsScreen> createState() => _MapsScreenState();
}

class _MapsScreenState extends State<MapsScreen> {
  double _currentLat = 41.2995; // Ташкент
  double _currentLng = 69.2401;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    // Оптимизированная загрузка: получаем геолокацию параллельно с инициализацией карты
    _initializeMap();
  }

  void _initializeMap() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
      });
    }
    
    // Параллельно загружаем карту и получаем геолокацию
    final futures = <Future>[];
    
    // Загружаем Google Maps API (только для веб)
    if (kIsWeb) {
      futures.add(GoogleMapsService.initialize().catchError((e) {
        print('⚠️ Ошибка загрузки Google Maps API: $e');
      }));
    }
    
    // Получаем геолокацию (только для веб, с быстрым таймаутом)
    if (kIsWeb) {
      futures.add(_getCurrentLocation());
    }
    
    // Ждем завершения всех операций
    await Future.wait(futures);
    
    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  Future<void> _getCurrentLocation() async {
    try {
      // Быстрая проверка разрешений
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      
      if (permission == LocationPermission.denied || 
          permission == LocationPermission.deniedForever) {
        print('⚠️ Разрешение на геолокацию отклонено, используем Ташкент');
        return;
      }
      
      // Получаем местоположение с коротким таймаутом
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.low, // Используем low для максимальной скорости
        timeLimit: const Duration(seconds: 2),
      ).timeout(
        const Duration(seconds: 2),
        onTimeout: () {
          throw TimeoutException('Геолокация заняла слишком много времени');
        },
      );

      if (mounted) {
        setState(() {
          _currentLat = position.latitude;
          _currentLng = position.longitude;
          print('✅ Местоположение получено: ${position.latitude}, ${position.longitude}');
        });
      }
    } catch (e) {
      print('⚠️ Ошибка получения геолокации: $e');
      print('📍 Используем местоположение по умолчанию (Ташкент)');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Карта на весь экран
          _isLoading
              ? Container(
                  color: Colors.grey[100],
                  child: const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 20),
                        Text(
                          'Загрузка карты...',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : kIsWeb
                  ? SimpleGoogleMapsWidget(
                      lat: _currentLat,
                      lng: _currentLng,
                      zoom: 15,
                      height: MediaQuery.of(context).size.height,
                      width: MediaQuery.of(context).size.width,
                    )
                  : Container(
                      color: Colors.grey[100],
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.map_rounded,
                              size: 80,
                              color: AppConstants.primaryColor.withOpacity(0.5),
                            ),
                            const SizedBox(height: 20),
                            const Text(
                              'Карта',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Google Maps доступна только в веб-версии',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
          
          // Кнопка "Назад" в левом верхнем углу
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.arrow_back, color: Colors.black87),
                ),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}