import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import 'package:cloud_firestore/cloud_firestore.dart';
import '../config/firebase_config.dart';

/// Сервис для отправки SMS через Twilio API
/// 
/// Для использования необходимо:
/// 1. Зарегистрироваться на https://www.twilio.com/
/// 2. Получить Account SID и Auth Token
/// 3. Купить номер телефона в Twilio
/// 4. Перед сборкой релиза передать секреты через `--dart-define` (не коммитить в репозиторий):
///    `--dart-define=TWILIO_ACCOUNT_SID=... --dart-define=TWILIO_AUTH_TOKEN=... --dart-define=TWILIO_FROM_NUMBER=+1...`
class TwilioSmsService {
  static final TwilioSmsService _instance = TwilioSmsService._internal();
  factory TwilioSmsService() => _instance;
  TwilioSmsService._internal();

  // TODO: Выключить тестовый режим перед релизом в продакшен
  static const bool _testMode = true;
  static const String _testCode = '123456';

  static const String _accountSid = String.fromEnvironment(
    'TWILIO_ACCOUNT_SID',
    defaultValue: '',
  );
  static const String _authToken = String.fromEnvironment(
    'TWILIO_AUTH_TOKEN',
    defaultValue: '',
  );
  static const String _twilioNumber = String.fromEnvironment(
    'TWILIO_FROM_NUMBER',
    defaultValue: '',
  );
  
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  
  bool get isConfigured {
    if (_testMode) return true;
    return _accountSid.isNotEmpty &&
        _authToken.isNotEmpty &&
        _twilioNumber.startsWith('+') &&
        _twilioNumber.length > 5;
  }
  
  String _generateCode() {
    if (_testMode) return _testCode;
    final random = Random();
    return (100000 + random.nextInt(900000)).toString();
  }
  
  /// Сохраняет код в Firestore для проверки
  Future<void> _saveCode(String phoneNumber, String code) async {
    try {
      await _firestore.collection('sms_codes').doc(phoneNumber).set({
        'code': code,
        'phoneNumber': phoneNumber,
        'createdAt': FieldValue.serverTimestamp(),
        'expiresAt': FieldValue.serverTimestamp(),
        'verified': false,
      }, SetOptions(merge: true));
    } catch (e) {
      print('⚠️ Ошибка сохранения кода в Firestore: $e');
    }
  }
  
  /// Отправляет SMS код через Twilio API
  /// 
  /// [phoneNumber] - номер телефона в формате E.164 (например: +998901234567)
  /// 
  /// Возвращает Map с результатом:
  /// - success: bool - успешна ли отправка
  /// - message: String - сообщение
  /// - code: String? - код (только для тестирования)
  /// - error: String? - ошибка (если есть)
  Future<Map<String, dynamic>> sendSmsCode(String phoneNumber) async {
    try {
      // Проверяем настройку
      if (!isConfigured) {
        return {
          'success': false,
          'error':
              'Twilio не настроен. Передайте TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER через --dart-define или включите тестовый режим.',
        };
      }
      
      // Форматируем номер телефона (убираем пробелы, дефисы)
      String formattedPhone = phoneNumber.trim().replaceAll(RegExp(r'[\s\-\(\)]'), '');
      
      // Проверяем формат E.164
      if (!formattedPhone.startsWith('+')) {
        if (formattedPhone.startsWith('998')) {
          formattedPhone = '+$formattedPhone';
        } else if (formattedPhone.startsWith('9') && formattedPhone.length == 9) {
          formattedPhone = '+998$formattedPhone';
        } else if (formattedPhone.startsWith('7') && formattedPhone.length == 11) {
          formattedPhone = '+$formattedPhone';
        } else {
          return {
            'success': false,
            'error': 'Неверный формат номера. Используйте формат: +код_страны номер',
          };
        }
      }
      
      final code = _generateCode();
      await _saveCode(formattedPhone, code);

      if (_testMode) {
        print('🧪 ТЕСТОВЫЙ РЕЖИМ: код $code для $formattedPhone');
        return {
          'success': true,
          'message': 'Тестовый режим. Код: $code',
        };
      }
      
      final message = 'ODO.UZ: Ваш код подтверждения: $code. Код действителен 5 минут.';
      
      final url = Uri.parse(
        'https://api.twilio.com/2010-04-01/Accounts/$_accountSid/Messages.json'
      );
      
      final credentials = base64Encode(utf8.encode('$_accountSid:$_authToken'));
      
      final response = await http.post(
        url,
        headers: {
          'Authorization': 'Basic $credentials',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: {
          'From': _twilioNumber,
          'To': formattedPhone,
          'Body': message,
        },
      );
      
      if (response.statusCode == 201) {
        final responseData = jsonDecode(response.body);
        print('✅ SMS отправлен через Twilio на $formattedPhone');
        return {
          'success': true,
          'message': 'SMS код отправлен',
          'twilioSid': responseData['sid'],
        };
      } else {
        final errorData = jsonDecode(response.body);
        print('❌ Ошибка Twilio: ${errorData['message']}');
        return {
          'success': false,
          'error': 'Ошибка Twilio: ${errorData['message']}',
        };
      }
    } catch (e, stackTrace) {
      print('❌ Ошибка отправки SMS через Twilio: $e');
      print('Stack trace: $stackTrace');
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }
  
  /// Проверяет SMS код
  /// 
  /// [phoneNumber] - номер телефона
  /// [code] - код для проверки
  /// 
  /// Возвращает true, если код верный и не истек
  Future<bool> verifySmsCode(String phoneNumber, String code) async {
    try {
      final cleanInputCode = code.trim();

      if (_testMode && cleanInputCode == _testCode) {
        print('🧪 ТЕСТОВЫЙ РЕЖИМ: код $cleanInputCode принят');
        return true;
      }
      
      String formattedPhone = phoneNumber.trim().replaceAll(RegExp(r'[\s\-\(\)]'), '');
      if (!formattedPhone.startsWith('+')) {
        if (formattedPhone.startsWith('998')) {
          formattedPhone = '+$formattedPhone';
        } else if (formattedPhone.startsWith('9') && formattedPhone.length == 9) {
          formattedPhone = '+998$formattedPhone';
        } else if (formattedPhone.startsWith('7') && formattedPhone.length == 11) {
          formattedPhone = '+$formattedPhone';
        } else if (formattedPhone.startsWith('7') && formattedPhone.length == 10) {
          formattedPhone = '+$formattedPhone';
        }
      }
      
      print('🔍 Проверка кода для номера: $formattedPhone');
      print('🔍 Введенный код: "$code" (длина: ${code.length})');
      
      // Получаем код из Firestore
      final doc = await _firestore.collection('sms_codes').doc(formattedPhone).get();
      
      if (!doc.exists) {
        print('❌ Код не найден для $formattedPhone');
        // Попробуем найти с другим форматом номера
        print('🔍 Пробуем найти код с другими вариантами формата...');
        
        // Пробуем разные варианты формата
        final variants = [
          formattedPhone.replaceAll('+', ''),
          formattedPhone.replaceAll('+', '').replaceFirst('7', '+7'),
          formattedPhone.replaceAll('+', '').replaceFirst('998', '+998'),
        ];
        
        for (final variant in variants) {
          final variantDoc = await _firestore.collection('sms_codes').doc(variant).get();
          if (variantDoc.exists) {
            print('✅ Найден код с вариантом формата: $variant');
            final variantData = variantDoc.data()!;
            final savedCode = variantData['code'] as String? ?? '';
            print('🔍 Сохраненный код: "$savedCode" (длина: ${savedCode.length})');
            print('🔍 Сравнение: "$savedCode" == "$code" = ${savedCode == code}');
            
            if (savedCode == code) {
              // Обновляем документ с правильным форматом
              await variantDoc.reference.update({'verified': true});
              print('✅ Код подтвержден (найден по варианту формата)');
              return true;
            }
          }
        }
        
        return false;
      }
      
      final data = doc.data()!;
      final savedCode = data['code'] as String? ?? '';
      final verified = data['verified'] as bool? ?? false;
      
      print('🔍 Сохраненный код: "$savedCode" (длина: ${savedCode.length})');
      print('🔍 Код уже использован: $verified');
      print('🔍 Сравнение: "$savedCode" == "$code" = ${savedCode == code}');
      
      // Проверяем, не был ли код уже использован
      if (verified) {
        print('⚠️ Код уже был использован');
        return false;
      }
      
      // Проверяем код (убираем пробелы и приводим к строке)
      final cleanSavedCode = savedCode.trim();
      
      if (cleanSavedCode != cleanInputCode) {
        print('❌ Неверный код. Ожидалось: "$cleanSavedCode", получено: "$cleanInputCode"');
        return false;
      }
      
      // Проверяем срок действия (5 минут)
      final createdAt = (data['createdAt'] as Timestamp?)?.toDate();
      if (createdAt != null) {
        final expiresAt = createdAt.add(const Duration(minutes: 5));
        final now = DateTime.now();
        print('🔍 Код создан: $createdAt');
        print('🔍 Код истекает: $expiresAt');
        print('🔍 Текущее время: $now');
        print('🔍 Код истек: ${now.isAfter(expiresAt)}');
        
        if (now.isAfter(expiresAt)) {
          print('⚠️ Код истек');
          return false;
        }
      }
      
      // Помечаем код как использованный
      await doc.reference.update({'verified': true});
      
      print('✅ Код подтвержден');
      return true;
    } catch (e, stackTrace) {
      print('❌ Ошибка проверки кода: $e');
      print('Stack trace: $stackTrace');
      return false;
    }
  }
  
  /// Очищает старые коды из Firestore
  Future<void> cleanupExpiredCodes() async {
    try {
      final fiveMinutesAgo = Timestamp.fromDate(
        DateTime.now().subtract(const Duration(minutes: 5))
      );
      
      final query = await _firestore
          .collection('sms_codes')
          .where('createdAt', isLessThan: fiveMinutesAgo)
          .get();
      
      final batch = _firestore.batch();
      for (var doc in query.docs) {
        batch.delete(doc.reference);
      }
      
      await batch.commit();
      print('✅ Очищены истекшие SMS коды');
    } catch (e) {
      print('⚠️ Ошибка очистки кодов: $e');
    }
  }
}

