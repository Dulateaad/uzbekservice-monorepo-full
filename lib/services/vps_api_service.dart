import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;

/// Сервис для работы с VPS API (хранение чувствительных данных в Узбекистане)
class VpsApiService {
  // URL API сервера на VPS
  // TODO: Настройте HTTPS для production: 'https://api.webname.uz/api'
  static const String _baseUrl = 'http://95.46.96.53:3000/api';

  static bool get _isBlocked => kIsWeb;
  
  // API ключ для аутентификации (в production используйте переменную окружения)
  // TODO: Вынесите в переменные окружения или secure storage
  static const String _apiKey = '2a206f0a3fd3edbe1a06902a99dc4874ec3213449a70768149b98211cdcfb8a0';
  
  /// Сохранить/обновить чувствительные данные пользователя
  /// 
  /// [userId] - ID пользователя
  /// [phoneNumber] - номер телефона
  /// [address] - адрес (опционально)
  /// [location] - координаты {lat, lng, address} (опционально)
  /// [isUzbekCitizen] - является ли гражданином Узбекистана (по умолчанию true)
  static Future<Map<String, dynamic>?> saveUserSensitiveData({
    required String userId,
    required String phoneNumber,
    String? address,
    Map<String, dynamic>? location,
    bool isUzbekCitizen = true,
  }) async {
    if (_isBlocked) return null;
    try {
      final url = Uri.parse('$_baseUrl/users/$userId/sensitive');
      
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': _apiKey,
        },
        body: json.encode({
          'phone_number': phoneNumber,
          'address': address,
          'location': location,
          'is_uzbek_citizen': isUzbekCitizen,
        }),
      );
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        print('❌ Ошибка сохранения данных: ${response.statusCode}');
        print('Ответ: ${response.body}');
        return null;
      }
    } catch (e) {
      print('❌ Ошибка VPS API: $e');
      return null;
    }
  }
  
  /// Получить чувствительные данные пользователя
  static Future<Map<String, dynamic>?> getUserSensitiveData(String userId) async {
    if (_isBlocked) return null;
    try {
      final url = Uri.parse('$_baseUrl/users/$userId/sensitive');
      
      final response = await http.get(
        url,
        headers: {'X-API-Key': _apiKey},
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else if (response.statusCode == 404) {
        return null; // Пользователь не найден
      } else {
        print('❌ Ошибка получения данных: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('❌ Ошибка VPS API: $e');
      return null;
    }
  }
  
  /// Получить пользователя по номеру телефона
  static Future<Map<String, dynamic>?> getUserByPhone(String phoneNumber) async {
    if (_isBlocked) return null;
    try {
      final encodedPhone = Uri.encodeComponent(phoneNumber);
      final url = Uri.parse('$_baseUrl/users/phone/$encodedPhone');
      
      final response = await http.get(
        url,
        headers: {'X-API-Key': _apiKey},
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else if (response.statusCode == 404) {
        return null;
      } else {
        print('❌ Ошибка поиска по телефону: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('❌ Ошибка VPS API: $e');
      return null;
    }
  }
  
  /// Обновить только адрес и локацию
  static Future<Map<String, dynamic>?> updateUserLocation({
    required String userId,
    String? address,
    Map<String, dynamic>? location,
  }) async {
    if (_isBlocked) return null;
    try {
      final url = Uri.parse('$_baseUrl/users/$userId/location');
      
      final response = await http.patch(
        url,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': _apiKey,
        },
        body: json.encode({
          'address': address,
          'location': location,
        }),
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        print('❌ Ошибка обновления локации: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('❌ Ошибка VPS API: $e');
      return null;
    }
  }
  
  /// Сохранить чувствительные данные заказа
  static Future<Map<String, dynamic>?> saveOrderSensitiveData({
    required String orderId,
    required String userId,
    String? address,
    Map<String, dynamic>? location,
    String? phoneNumber,
  }) async {
    if (_isBlocked) return null;
    try {
      final url = Uri.parse('$_baseUrl/orders/$orderId/sensitive');
      
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': _apiKey,
        },
        body: json.encode({
          'user_id': userId,
          'address': address,
          'location': location,
          'phone_number': phoneNumber,
        }),
      );
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        print('❌ Ошибка сохранения данных заказа: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('❌ Ошибка VPS API: $e');
      return null;
    }
  }
  
  /// Проверка доступности API
  static Future<bool> checkHealth() async {
    if (_isBlocked) return false;
    try {
      final url = Uri.parse('http://95.46.96.53:3000/health');
      final response = await http.get(url, headers: {'Connection': 'close'});
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}

