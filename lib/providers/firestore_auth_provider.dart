import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/firestore_models.dart';
import '../services/firestore_service.dart';
import '../services/test_data_service.dart';
import '../services/firebase_auth_service.dart';
import '../services/push_notification_service.dart';
import '../services/analytics_service.dart';

class FirestoreAuthState {
  final FirestoreUser? user;
  final bool isLoading;
  final String? error;
  final String? currentPhoneNumber;
  final String? registrationName;
  final String? registrationUserType;
  final String? registrationIntentId;
  final String? registrationRole;

  const FirestoreAuthState({
    this.user,
    this.isLoading = false,
    this.error,
    this.currentPhoneNumber,
    this.registrationName,
    this.registrationUserType,
    this.registrationIntentId,
    this.registrationRole,
  });

  bool get isAuthenticated => user != null && user!.isVerified;
  bool get isClient => user?.userType == 'client';
  bool get isSpecialist => user?.userType == 'specialist';
  Map<String, bool> get notificationPreferences =>
      user?.notificationPreferences ?? const {'push': true, 'sms': true, 'email': true};
  List<String> get deviceTokens => user?.deviceTokens ?? const <String>[];

  FirestoreAuthState copyWith({
    FirestoreUser? user,
    bool? isLoading,
    String? error,
    String? currentPhoneNumber,
    String? registrationName,
    String? registrationUserType,
    String? registrationIntentId,
    String? registrationRole,
  }) {
    return FirestoreAuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
      currentPhoneNumber: currentPhoneNumber ?? this.currentPhoneNumber,
      registrationName: registrationName ?? this.registrationName,
      registrationUserType: registrationUserType ?? this.registrationUserType,
      registrationIntentId: registrationIntentId ?? this.registrationIntentId,
      registrationRole: registrationRole ?? this.registrationRole,
    );
  }
}

class FirestoreAuthNotifier extends StateNotifier<FirestoreAuthState> {
  final FirebaseAuthService _firebaseAuthService = FirebaseAuthService();
  static const Map<String, bool> _defaultNotificationPreferences = {
    'push': true,
    'sms': true,
    'email': true,
  };

  FirestoreAuthNotifier() : super(const FirestoreAuthState());

  FirestoreUser _withNotificationDefaults(FirestoreUser user) {
    final tokens = List<String>.from(user.deviceTokens ?? const <String>[]);
    final prefs = Map<String, bool>.from(
      user.notificationPreferences ?? _defaultNotificationPreferences,
    );
    return user.copyWith(
      deviceTokens: tokens,
      notificationPreferences: prefs,
    );
  }

  // Установка номера телефона
  void setPhoneNumber(String phoneNumber) {
    state = state.copyWith(currentPhoneNumber: phoneNumber);
  }

  // Установка имени для регистрации
  void setRegistrationName(String name) {
    state = state.copyWith(registrationName: name);
  }

  // Установка типа пользователя для регистрации
  void setRegistrationUserType(String userType) {
    state = state.copyWith(registrationUserType: userType);
  }

  // Отправка SMS кода с сохранением данных регистрации
  Future<void> sendSmsCode({
    required String phoneNumber,
    required String name,
    required String userType,
    String? intentId,
    String? role,
  }) async {
    state = state.copyWith(
      currentPhoneNumber: phoneNumber,
      registrationName: name,
      registrationUserType: userType,
      registrationIntentId: intentId,
      registrationRole: role,
    );
    
    final result = await _firebaseAuthService.sendSmsCode(phoneNumber);
    if (result['success'] == true) {
      print('📱 SMS код отправлен на $phoneNumber через Firebase');
    } else {
      throw Exception(result['error'] ?? 'Ошибка отправки SMS');
    }
  }

  // Вход через SMS
  Future<void> login(
    String phoneNumber, 
    String smsCode, {
    String? verificationId,
    String? registrationName,
    String? registrationUserType,
    List<String>? onboardingIntents,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      print('🔐 Попытка входа с номером: $phoneNumber, код: $smsCode');

      // Проверяем SMS код через Firebase Phone Authentication
      final isValid = await _firebaseAuthService.verifySmsCode(phoneNumber, smsCode);
      
      if (!isValid) {
        throw Exception('Неверный код подтверждения');
      }

      // Получаем Firebase User после успешной верификации
      final firebaseUser = _firebaseAuthService.currentUser;
      if (firebaseUser == null) {
        throw Exception('Ошибка аутентификации: пользователь не найден');
      }
      
      final firebaseUid = firebaseUser.uid;
      print('✅ Firebase Auth: Пользователь аутентифицирован: $firebaseUid');

      // Ищем пользователя в Firestore сначала по Firebase UID (правильный способ)
      FirestoreUser? user;
      try {
        user = await FirestoreService.getUserById(firebaseUid);
        print('🔍 Поиск пользователя по Firebase UID: ${user != null ? "найден" : "не найден"}');
      } catch (e) {
        print('⚠️ Ошибка поиска пользователя по Firebase UID: $e');
      }
      
      // Если не найден по Firebase UID, ищем по телефону (fallback для старых пользователей)
      if (user == null) {
        try {
          final userByPhone = await FirestoreService.getUserByPhone(phoneNumber);
          if (userByPhone != null) {
            print('🔍 Найден пользователь по телефону, ID: ${userByPhone.id}, Firebase UID: $firebaseUid');
            // Всегда используем Firebase UID как ID
            // Создаем пользователя с правильным Firebase UID
            user = userByPhone.copyWith(
              id: firebaseUid,
              updatedAt: DateTime.now(),
            );
            user = _withNotificationDefaults(user);
            try {
              // Пытаемся создать пользователя с Firebase UID
              await FirestoreService.createUser(user);
              print('✅ Пользователь создан с Firebase UID: $firebaseUid');
            } catch (e) {
              print('⚠️ Ошибка при создании пользователя с Firebase UID: $e');
              // Если документ уже существует, пытаемся обновить
              try {
                await FirestoreService.updateUser(user);
                print('✅ Пользователь обновлен в Firestore');
              } catch (updateError) {
                print('⚠️ Не удалось обновить пользователя: $updateError');
                // Используем пользователя локально
              }
            }
          }
        } catch (e) {
          print('⚠️ Firestore недоступен при поиске по телефону: $e');
        }
      }
      
      // Если пользователь все еще не найден
      if (user == null) {
        // Если есть имя в registrationName - это регистрация
        if (state.registrationName != null && state.registrationName!.isNotEmpty) {
          print('📝 Создаем нового пользователя (регистрация) с Firebase UID: $firebaseUid');
          user = _withNotificationDefaults(FirestoreUser(
            id: firebaseUid,
            phoneNumber: phoneNumber,
            name: registrationName ?? state.registrationName ?? 'Пользователь',
            userType: registrationUserType ?? state.registrationUserType ?? 'client',
            deviceTokens: const [],
            notificationPreferences: const {
              'push': true,
              'sms': true,
              'email': true,
            },
            createdAt: DateTime.now(),
            updatedAt: DateTime.now(),
            isVerified: true,
            rating: (registrationUserType ?? state.registrationUserType) == 'specialist' ? 0.0 : null,
            totalOrders: (registrationUserType ?? state.registrationUserType) == 'specialist' ? 0 : null,
            onboardingIntents: onboardingIntents ?? 
                (state.registrationIntentId != null ? [state.registrationIntentId!] : null),
          ));
          
          try {
            await FirestoreService.createUser(user);
            print('✅ Новый пользователь создан в Firestore: $firebaseUid');
          } catch (e) {
            print('⚠️ Не удалось создать пользователя в Firestore: $e');
            // Продолжаем с локальными данными
          }
        } else {
          // При входе пользователь не найден
          throw Exception('Пользователь с таким номером не найден. Пожалуйста, создайте аккаунт.');
        }
      } else {
        // Пользователь найден, убеждаемся что ID правильный и обновляем
        if (user.id != firebaseUid) {
          print('⚠️ ID пользователя ($user.id) не совпадает с Firebase UID ($firebaseUid). Обновляем.');
          user = user.copyWith(id: firebaseUid);
        }
        user = user.copyWith(
          id: firebaseUid, // Убеждаемся, что ID правильный
          isVerified: true,
          updatedAt: DateTime.now(),
        );
        user = _withNotificationDefaults(user);
        
        try {
          // Пытаемся создать, если не существует, иначе обновить
          try {
            await FirestoreService.createUser(user);
            print('✅ Пользователь создан в Firestore: $firebaseUid');
          } catch (createError) {
            // Если уже существует, обновляем
            await FirestoreService.updateUser(user);
            print('✅ Пользователь обновлен в Firestore: $firebaseUid');
          }
        } catch (e) {
          print('⚠️ Не удалось сохранить пользователя в Firestore: $e');
          // Продолжаем с локальными данными
        }
      }

      final normalizedUser = _withNotificationDefaults(user);

      state = state.copyWith(
        user: normalizedUser,
        isLoading: false,
        error: null,
      );

      // Сохраняем токен устройства для push-уведомлений
      try {
        await PushNotificationService.saveTokenToUser(normalizedUser.id);
      } catch (e) {
        print('⚠️ Не удалось сохранить токен устройства: $e');
      }

      // Логируем событие входа в Analytics
      try {
        await AnalyticsService.logLogin(
          loginMethod: 'sms',
          userId: normalizedUser.id,
        );
        await AnalyticsService.setUserProperties(
          userType: normalizedUser.userType,
          category: normalizedUser.category,
        );
      } catch (e) {
        print('⚠️ Не удалось залогировать событие входа: $e');
      }

      print('✅ Успешный вход: ${user.name} (${user.userType})');
    } catch (e) {
      print('❌ Ошибка входа: $e');
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  // Вход через OneID (после успешного обмена кода на токены)
  // Профиль содержит хотя бы: sub (oneIdSub), name, phone, email, picture
  Future<void> loginWithOneId({
    required String oneIdSub,
    String? phoneNumber,
    String? name,
    String? email,
    String? avatarUrl,
    String? userType, // 'client' | 'specialist' (если уже выбран ранее)
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      print('🔐 Вход через OneID: sub=$oneIdSub, phone=$phoneNumber, email=$email');

      FirestoreUser? user;

      // Сначала пробуем найти по oneIdSub, затем по телефону
      try {
        user = await FirestoreService.getUserByOneIdSub(oneIdSub);
      } catch (_) {}

      if (user == null && phoneNumber != null && phoneNumber.isNotEmpty) {
        try {
          user = await FirestoreService.getUserByPhone(phoneNumber);
        } catch (e) {
          print('⚠️ Firestore недоступен при поиске по телефону: $e');
        }
      }

      final now = DateTime.now();
      if (user == null) {
        // Создаем нового пользователя
        final created = FirestoreUser(
          id: phoneNumber?.isNotEmpty == true ? phoneNumber! : oneIdSub,
          phoneNumber: phoneNumber ?? '',
          name: (name?.isNotEmpty == true ? name! : (email ?? 'Пользователь')),
          userType: userType ?? (state.registrationUserType ?? 'client'),
          email: email,
          oneIdSub: oneIdSub,
          avatarUrl: avatarUrl,
          deviceTokens: const [],
          notificationPreferences: const {
            'push': true,
            'sms': true,
            'email': true,
          },
          createdAt: now,
          updatedAt: now,
          isVerified: true,
          rating: (userType ?? state.registrationUserType) == 'specialist' ? 0.0 : null,
          totalOrders: (userType ?? state.registrationUserType) == 'specialist' ? 0 : null,
        );
        final normalizedCreated = _withNotificationDefaults(created);

        try {
          await FirestoreService.createUser(normalizedCreated);
          user = normalizedCreated;
          print('✅ Пользователь создан (OneID) в Firestore: ${normalizedCreated.name}');
        } catch (e) {
          print('⚠️ Не удалось сохранить OneID-пользователя в Firestore: $e');
          user = normalizedCreated; // продолжаем локально
        }
      } else {
        // Обновляем существующего
        final updated = user.copyWith(
          email: email ?? user.email,
          oneIdSub: oneIdSub,
          avatarUrl: avatarUrl ?? user.avatarUrl,
          name: (name?.isNotEmpty == true ? name : null) ?? user.name,
          phoneNumber: (phoneNumber?.isNotEmpty == true ? phoneNumber : null) ?? user.phoneNumber,
          userType: (userType ?? state.registrationUserType) ?? user.userType,
          isVerified: true,
          updatedAt: now,
        );
        final normalizedUpdated = _withNotificationDefaults(updated);

        try {
          await FirestoreService.updateUser(normalizedUpdated);
          user = normalizedUpdated;
          print('✅ OneID профиль обновлен в Firestore: ${normalizedUpdated.name}');
        } catch (e) {
          print('⚠️ Не удалось обновить OneID-профиль в Firestore: $e');
          user = normalizedUpdated;
        }
      }

      state = state.copyWith(user: user, isLoading: false, error: null);
      
      // Сохраняем токен устройства для push-уведомлений
      try {
        await PushNotificationService.saveTokenToUser(user.id);
      } catch (e) {
        print('⚠️ Не удалось сохранить токен устройства: $e');
      }
      
      print('✅ Успешный вход через OneID: ${user.name} (${user.userType})');
    } catch (e) {
      print('❌ Ошибка OneID входа: $e');
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  // Регистрация нового пользователя
  Future<void> register({
    required String phoneNumber,
    required String name,
    required String userType,
    String? email,
    String? category,
    String? description,
    double? pricePerHour,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      print('📝 Регистрация пользователя: $name ($userType)');

      // Проверяем, не существует ли уже пользователь
      FirestoreUser? existingUser;
      try {
        existingUser = await FirestoreService.getUserByPhone(phoneNumber);
      } catch (e) {
        print('⚠️ Firestore недоступен при проверке существующего пользователя: $e');
        existingUser = null;
      }
      
      if (existingUser != null) {
        throw Exception('Пользователь с таким номером уже существует');
      }

      // Создаем нового пользователя (без Firebase Auth)
      final now = DateTime.now();
      final newUser = _withNotificationDefaults(FirestoreUser(
        id: phoneNumber, // Используем номер телефона как ID
        phoneNumber: phoneNumber,
        name: name,
        userType: userType,
        email: email,
        category: category,
        description: description,
        pricePerHour: pricePerHour,
        deviceTokens: const [],
        notificationPreferences: const {
          'push': true,
          'sms': true,
          'email': true,
        },
        createdAt: now,
        updatedAt: now,
        isVerified: true,
        rating: userType == 'specialist' ? 0.0 : null,
        totalOrders: userType == 'specialist' ? 0 : null,
      ));

      // Пытаемся сохранить в Firestore
      try {
        await FirestoreService.createUser(newUser);
        print('✅ Пользователь сохранен в Firestore: ${newUser.name}');
      } catch (e) {
        print('⚠️ Не удалось сохранить в Firestore: $e');
        // Продолжаем с локальными данными
      }

      state = state.copyWith(
        user: newUser,
        isLoading: false,
        error: null,
      );

      // Сохраняем токен устройства для push-уведомлений
      try {
        await PushNotificationService.saveTokenToUser(newUser.id);
      } catch (e) {
        print('⚠️ Не удалось сохранить токен устройства: $e');
      }

      print('✅ Пользователь зарегистрирован: ${newUser.name}');
    } catch (e) {
      // Если Firestore недоступен, создаем пользователя локально
      print('⚠️ Firestore недоступен, создаем пользователя локально: $e');
      
      try {
        final newUser = _withNotificationDefaults(TestDataService.createTestUser(
          phoneNumber: phoneNumber,
          name: name,
          userType: userType,
          category: category,
          description: description,
          pricePerHour: pricePerHour,
        ));

        state = state.copyWith(
          user: newUser,
          isLoading: false,
          error: null,
        );

        print('✅ Пользователь создан локально: ${newUser.name}');
      } catch (localError) {
        print('❌ Ошибка создания локального пользователя: $localError');
        state = state.copyWith(
          isLoading: false,
          error: 'Не удалось создать пользователя: $localError',
        );
      }
    }
  }

  // Обновление профиля
  Future<void> updateProfile({
    String? name,
    String? email,
    String? category,
    String? description,
    double? pricePerHour,
    String? avatarUrl,
  }) async {
    if (state.user == null) return;

    state = state.copyWith(isLoading: true, error: null);

    try {
      final updatedUser = state.user!.copyWith(
        name: name ?? state.user!.name,
        email: email ?? state.user!.email,
        category: category ?? state.user!.category,
        description: description ?? state.user!.description,
        pricePerHour: pricePerHour ?? state.user!.pricePerHour,
        avatarUrl: avatarUrl ?? state.user!.avatarUrl,
        updatedAt: DateTime.now(),
      );
      final normalizedUser = _withNotificationDefaults(updatedUser);

      // Пытаемся обновить в Firestore
      try {
        await FirestoreService.updateUser(normalizedUser);
        print('✅ Профиль обновлен в Firestore: ${normalizedUser.name}');
      } catch (e) {
        print('⚠️ Не удалось обновить профиль в Firestore: $e');
        // Продолжаем с локальными данными
      }

      state = state.copyWith(
        user: normalizedUser,
        isLoading: false,
        error: null,
      );

      print('✅ Профиль обновлен: ${normalizedUser.name}');
    } catch (e) {
      print('❌ Ошибка обновления профиля: $e');
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> registerDeviceToken(String token) async {
    if (token.isEmpty || state.user == null) return;
    final user = state.user!;
    final tokens = List<String>.from(user.deviceTokens ?? const <String>[]);
    if (tokens.contains(token)) return;

    try {
      await FirestoreService.addDeviceToken(user.id, token);
      tokens.add(token);
      state = state.copyWith(user: user.copyWith(deviceTokens: tokens));
    } catch (e) {
      print('❌ Не удалось зарегистрировать токен устройства: $e');
    }
  }

  Future<void> unregisterDeviceToken(String token) async {
    if (token.isEmpty || state.user == null) return;
    final user = state.user!;
    final tokens = List<String>.from(user.deviceTokens ?? const <String>[]);
    if (!tokens.contains(token)) return;

    try {
      await FirestoreService.removeDeviceToken(user.id, token);
      tokens.remove(token);
      state = state.copyWith(user: user.copyWith(deviceTokens: tokens));
    } catch (e) {
      print('❌ Не удалось удалить токен устройства: $e');
    }
  }

  Future<void> updateNotificationPreferences({
    bool? push,
    bool? sms,
    bool? email,
  }) async {
    if (state.user == null) return;

    final user = state.user!;
    final prefs = Map<String, bool>.from(
      user.notificationPreferences ?? _defaultNotificationPreferences,
    );

    if (push != null) prefs['push'] = push;
    if (sms != null) prefs['sms'] = sms;
    if (email != null) prefs['email'] = email;

    try {
      await FirestoreService.updateNotificationPreferences(user.id, prefs);
    } catch (e) {
      print('❌ Не удалось обновить настройки уведомлений: $e');
    }

    state = state.copyWith(
      user: user.copyWith(notificationPreferences: prefs),
    );
  }

  // Выход
  void logout() {
    state = const FirestoreAuthState();
    print('👋 Пользователь вышел из системы');
  }

}

// Провайдер для состояния аутентификации
final firestoreAuthProvider = StateNotifierProvider<FirestoreAuthNotifier, FirestoreAuthState>((ref) {
  return FirestoreAuthNotifier();
});
