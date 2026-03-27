import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../config/firebase_config.dart';

class FirebaseAuthService {
  static final FirebaseAuthService _instance = FirebaseAuthService._internal();
  factory FirebaseAuthService() => _instance;
  FirebaseAuthService._internal();

  final FirebaseAuth _auth = FirebaseConfig.auth;
  String? _verificationId;
  final Map<String, String> _verificationIds = {}; // Храним verificationId по номерам

  /// Отправляет SMS код на указанный номер
  /// phoneNumber должен быть уже отформатирован в формате E.164 (например: +998901234567 или +77771234567)
  Future<Map<String, dynamic>> sendSmsCode(String phoneNumber) async {
    try {
      // Номер уже должен быть отформатирован в phone_auth_screen.dart с учетом выбранной страны
      // Только очищаем от пробелов и проверяем формат
      String formattedPhone = phoneNumber.trim();
      
      // Убираем все пробелы, дефисы и скобки (на всякий случай)
      formattedPhone = formattedPhone.replaceAll(RegExp(r'[\s\-\(\)]'), '');
      
      // Если номер не начинается с +, пытаемся определить страну по формату
      if (!formattedPhone.startsWith('+')) {
        // Если начинается с 998 - Узбекистан
        if (formattedPhone.startsWith('998')) {
          formattedPhone = '+$formattedPhone';
        }
        // Если начинается с 7 и длина 11 цифр - Казахстан/Россия
        else if (formattedPhone.startsWith('7') && formattedPhone.length == 11) {
          formattedPhone = '+$formattedPhone';
        }
        // Если начинается с 9 и длина 9 цифр - Узбекистан
        else if (formattedPhone.startsWith('9') && formattedPhone.length == 9) {
          formattedPhone = '+998$formattedPhone';
        }
        // Если начинается с 7 и длина 10 цифр - Казахстан/Россия
        else if (formattedPhone.startsWith('7') && formattedPhone.length == 10) {
          formattedPhone = '+$formattedPhone';
        }
        // По умолчанию не добавляем код - пусть будет ошибка валидации
        else {
          throw Exception('Номер должен начинаться с + или содержать код страны. Формат: +код_страны номер');
        }
      }
      
      // Проверяем длину номера (E.164 формат: максимум 15 символов включая +)
      // Узбекский номер: +998XXXXXXXXX (13 символов) - правильно
      // Казахстанский: +7XXXXXXXXXX (12 символов) - правильно
      if (formattedPhone.length > 15) {
        throw Exception('Номер телефона слишком длинный: ${formattedPhone.length} символов (максимум 15)');
      }
      
      // Минимальная длина зависит от страны:
      // Узбекистан: +998XXXXXXXXX = 13 символов (минимум)
      // Казахстан: +7XXXXXXXXXX = 12 символов (минимум)
      // Но некоторые страны могут иметь короче, поэтому минимум 10 символов
      if (formattedPhone.length < 10) {
        throw Exception('Номер телефона слишком короткий: ${formattedPhone.length} символов. Минимум 10 символов (включая +)');
      }
      
      // Проверка для конкретных стран
      if (formattedPhone.startsWith('+998') && formattedPhone.length < 13) {
        throw Exception('Узбекский номер должен быть в формате +998XXXXXXXXX (13 символов). Текущий: ${formattedPhone.length}');
      }
      
      if (formattedPhone.startsWith('+7') && formattedPhone.length < 12) {
        throw Exception('Казахстанский/Российский номер должен быть в формате +7XXXXXXXXXX (12 символов). Текущий: ${formattedPhone.length}');
      }
      
      // Проверяем формат E.164 (должен начинаться с + и содержать только цифры после +)
      if (!RegExp(r'^\+[1-9]\d{1,14}$').hasMatch(formattedPhone)) {
        throw Exception('Неверный формат номера. Используйте формат: +код_страны номер (например: +998901234567 или +77771234567)');
      }
      
      print('📱 Форматированный номер: $formattedPhone (длина: ${formattedPhone.length})');

      // Используем Completer для ожидания результата
      final completer = Completer<Map<String, dynamic>>();
      String? verificationId;
      String? errorMessage;

      // reCAPTCHA удалена по запросу пользователя
      // Для веб используем прямой вызов verifyPhoneNumber без reCAPTCHA
      if (kIsWeb) {
        await _auth.verifyPhoneNumber(
          phoneNumber: formattedPhone,
          verificationCompleted: (PhoneAuthCredential credential) {
            // На веб не используется, но параметр обязательный
          },
          verificationFailed: (FirebaseAuthException e) {
            print('❌ Ошибка верификации: ${e.message}');
            errorMessage = e.message ?? e.toString();
            
            if (!completer.isCompleted) {
              completer.complete({
                'success': false,
                'error': errorMessage,
              });
            }
          },
          codeSent: (String vid, int? resendToken) {
            verificationId = vid;
            _verificationId = vid;
            _verificationIds[formattedPhone] = vid;
            print('✅ SMS код отправлен на $formattedPhone');
            print('🔑 Verification ID: $vid');
            
            if (!completer.isCompleted) {
              completer.complete({
                'success': true,
                'message': 'SMS код отправлен',
                'verificationId': vid,
              });
            }
          },
          codeAutoRetrievalTimeout: (String vid) {
            // На веб не используется, но параметр обязательный
            if (!kIsWeb) {
              print('⏱️ Автоматическое получение кода истекло: $vid');
            }
          },
          timeout: const Duration(seconds: 60),
        );
      } else {
        // Для мобильных платформ (Android/iOS)
        await _auth.verifyPhoneNumber(
          phoneNumber: formattedPhone,
          verificationCompleted: (PhoneAuthCredential credential) {
            _auth.signInWithCredential(credential).then((_) {
              print('✅ Автоматическая верификация успешна');
            }).catchError((e) {
              print('❌ Ошибка автоматической верификации: $e');
            });
          },
          verificationFailed: (FirebaseAuthException e) {
            print('❌ Ошибка верификации: ${e.message}');
            errorMessage = e.message ?? e.toString();
            if (!completer.isCompleted) {
              completer.complete({
                'success': false,
                'error': errorMessage,
              });
            }
          },
          codeSent: (String vid, int? resendToken) {
            verificationId = vid;
            _verificationId = vid;
            _verificationIds[formattedPhone] = vid;
            print('✅ SMS код отправлен на $formattedPhone');
            if (!completer.isCompleted) {
              completer.complete({
                'success': true,
                'message': 'SMS код отправлен',
                'verificationId': vid,
              });
            }
          },
          codeAutoRetrievalTimeout: (String vid) {
            verificationId = vid;
            _verificationId = vid;
            _verificationIds[formattedPhone] = vid;
            print('⏱️ Timeout, но verificationId получен: $vid');
          },
          timeout: const Duration(seconds: 60),
        );
      }

      // Ждем результат (либо codeSent, либо verificationFailed)
      return await completer.future.timeout(
        const Duration(seconds: 65),
        onTimeout: () {
          if (verificationId != null) {
            return {
              'success': true,
              'message': 'SMS код отправлен',
              'verificationId': verificationId,
            };
          }
          return {
            'success': false,
            'error': 'Таймаут ожидания отправки SMS',
          };
        },
      );
    } catch (e) {
      print('❌ Ошибка отправки SMS: $e');
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  /// Проверяет SMS код и аутентифицирует пользователя
  Future<bool> verifySmsCode(String phoneNumber, String smsCode, {String? verificationId}) async {
    try {
      // Форматируем номер для поиска verificationId
      String formattedPhone = phoneNumber;
      if (!formattedPhone.startsWith('+')) {
        if (formattedPhone.startsWith('998')) {
          formattedPhone = '+$formattedPhone';
        } else if (formattedPhone.startsWith('9')) {
          formattedPhone = '+998$formattedPhone';
        } else {
          formattedPhone = '+998$formattedPhone';
        }
      }

      // Используем переданный verificationId или ищем по номеру
      String? vid = verificationId ?? _verificationId ?? _verificationIds[formattedPhone];
      
      if (vid == null) {
        print('❌ Verification ID не найден для $formattedPhone');
        throw Exception('Verification ID не найден. Сначала отправьте SMS код.');
      }

      print('🔍 Проверка кода с verificationId: $vid');

      final credential = PhoneAuthProvider.credential(
        verificationId: vid,
        smsCode: smsCode,
      );

      final userCredential = await _auth.signInWithCredential(credential);
      
      if (userCredential.user != null) {
        print('✅ SMS код успешно проверен, пользователь аутентифицирован: ${userCredential.user?.uid}');
        return true;
      }
      return false;
    } catch (e) {
      print('❌ Ошибка проверки SMS кода: $e');
      return false;
    }
  }

  /// Аутентификация через OTP (One-Time Password)
  Future<Map<String, dynamic>> signInWithOtp(String phoneNumber) async {
    return await sendSmsCode(phoneNumber);
  }

  /// Проверка OTP кода
  Future<bool> verifyOtp(String phoneNumber, String token) async {
    return await verifySmsCode(phoneNumber, token);
  }

  /// Получает текущего пользователя
  User? get currentUser => _auth.currentUser;

  /// Выход из системы
  Future<void> signOut() async {
    try {
      await _auth.signOut();
      _verificationId = null;
      print('Пользователь вышел из системы');
    } catch (e) {
      print('Ошибка выхода: $e');
      rethrow;
    }
  }

  /// Проверяет, аутентифицирован ли пользователь
  bool get isAuthenticated => _auth.currentUser != null;

  /// Получает ID текущего пользователя
  String? get currentUserId => _auth.currentUser?.uid;

  /// Обновляет профиль пользователя
  Future<void> updateUser({
    String? email,
    String? phone,
    Map<String, dynamic>? data,
  }) async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Пользователь не аутентифицирован');
      }

      if (email != null) {
        await user.updateEmail(email);
      }

      if (phone != null) {
        // Обновление телефона требует повторной верификации
        // Это сложный процесс, лучше обновлять через Firestore
        print('Обновление телефона требует повторной верификации');
      }

      if (data != null) {
        await user.updateDisplayName(data['displayName'] as String?);
        await user.updatePhotoURL(data['photoURL'] as String?);
      }

      print('Профиль пользователя обновлен');
    } catch (e) {
      print('Ошибка обновления профиля: $e');
      rethrow;
    }
  }

  /// Слушает изменения состояния аутентификации
  Stream<User?> get authStateChanges => _auth.authStateChanges();
}
