import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'google_maps_service.dart' if (dart.library.html) 'google_maps_service_web.dart';

/// Сервис для геокодирования адресов через Google Geocoding API
class GeocodingService {
  // API ключ Google (используется тот же, что и для Google Maps)
  // В production должен быть получен из конфигурации
  static String? _apiKey;
  
  /// Базовый URL для Google Geocoding API
  static const String _baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
  
  /// Установка API ключа
  static void setApiKey(String key) {
    _apiKey = key;
  }
  
  /// Получение API ключа (использует тот же ключ, что и для Google Maps)
  static String? _getApiKey() {
    if (_apiKey != null) return _apiKey;
    
    if (kIsWeb) {
      // Для веб используем тот же API ключ, что и для Google Maps
      try {
        // Пытаемся получить ключ из GoogleMapsService
        return GoogleMapsService.getGoogleMapsApiKey();
      } catch (e) {
        print('⚠️ Не удалось получить API ключ из GoogleMapsService: $e');
        // Fallback на значение по умолчанию
        return 'AIzaSyAa8kAiaItTeaf2UTE1T2fDxV_Z57z7cjk';
      }
    }
    
    // Для других платформ можно использовать flutter_dotenv или другие методы
    return 'AIzaSyAa8kAiaItTeaf2UTE1T2fDxV_Z57z7cjk';
  }
  
  /// Геокодирование адреса (адрес -> координаты)
  /// 
  /// [address] - адрес для геокодирования (например: "ул. Амира Темура, 15, Ташкент")
  /// 
  /// Возвращает Map с координатами: {'lat': double, 'lng': double, 'formatted_address': String}
  /// или null в случае ошибки
  static Future<Map<String, dynamic>?> geocodeAddress(String address) async {
    final apiKey = _getApiKey();
    if (apiKey == null || apiKey.isEmpty) {
      print('❌ Google Geocoding API ключ не настроен');
      return null;
    }
    
    try {
      final encodedAddress = Uri.encodeComponent(address);
      final url = '$_baseUrl?address=$encodedAddress&key=$apiKey&language=ru';
      
      print('🔍 Геокодирование адреса: $address');
      
      final response = await http.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        
        if (data['status'] == 'OK' && data['results'].isNotEmpty) {
          final result = data['results'][0];
          final location = result['geometry']['location'];
          
          final coordinates = {
            'lat': location['lat'] as double,
            'lng': location['lng'] as double,
            'formatted_address': result['formatted_address'] as String,
            'place_id': result['place_id'] as String?,
          };
          
          print('✅ Координаты получены: ${coordinates['lat']}, ${coordinates['lng']}');
          print('📍 Форматированный адрес: ${coordinates['formatted_address']}');
          
          return coordinates;
        } else {
          final status = data['status'] as String;
          print('⚠️ Геокодирование не удалось: $status');
          
          if (status == 'ZERO_RESULTS') {
            print('ℹ️ Адрес не найден: $address');
          } else if (status == 'OVER_QUERY_LIMIT') {
            print('⚠️ Превышен лимит запросов к Google Geocoding API');
          } else if (status == 'REQUEST_DENIED') {
            print('❌ Запрос отклонен. Проверьте API ключ и разрешения.');
          }
          
          return null;
        }
      } else {
        print('❌ Ошибка HTTP при геокодировании: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('❌ Ошибка геокодирования: $e');
      return null;
    }
  }
  
  /// Обратное геокодирование (координаты -> адрес)
  /// 
  /// [lat] - широта
  /// [lng] - долгота
  /// 
  /// Возвращает форматированный адрес или null в случае ошибки
  static Future<String?> reverseGeocode(double lat, double lng) async {
    final apiKey = _getApiKey();
    if (apiKey == null || apiKey.isEmpty) {
      print('❌ Google Geocoding API ключ не настроен');
      return null;
    }
    
    try {
      final url = '$_baseUrl?latlng=$lat,$lng&key=$apiKey&language=ru';
      
      print('🔍 Обратное геокодирование: $lat, $lng');
      
      final response = await http.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        
        if (data['status'] == 'OK' && data['results'].isNotEmpty) {
          final formattedAddress = data['results'][0]['formatted_address'] as String;
          print('✅ Адрес получен: $formattedAddress');
          return formattedAddress;
        } else {
          print('⚠️ Обратное геокодирование не удалось: ${data['status']}');
          return null;
        }
      } else {
        print('❌ Ошибка HTTP при обратном геокодировании: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('❌ Ошибка обратного геокодирования: $e');
      return null;
    }
  }
  
  /// Проверка доступности сервиса
  static bool get isAvailable {
    final apiKey = _getApiKey();
    return apiKey != null && apiKey.isNotEmpty;
  }
}

