import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart' show FirebaseAuth, User;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart' show debugPrint;

import '../services/firebase_auth_service.dart';
import '../services/firebase_database_service.dart';
import '../firebase_options.dart';

class FirebaseConfig {
  static FirebaseAuth get auth => FirebaseAuth.instance;
  static FirebaseFirestore get firestore => FirebaseFirestore.instance;
  static FirebaseStorage get storage => FirebaseStorage.instance;
  
  // Используем Firebase Auth сервис
  static dynamic get authService => FirebaseAuthService();
  
  // Используем Firebase Database сервис (Firestore)
  static dynamic get databaseService => FirebaseDatabaseService();
  
  static Future<void> initialize() async {
    if (Firebase.apps.isNotEmpty) {
      debugPrint(
        'Firebase: уже инициализирован (${Firebase.apps.length} app(s)), пропуск.',
      );
      return;
    }
    try {
      // Один вызов с явными опциями — избегает дубля [DEFAULT] (краш FIRApp
      // addAppToAppDictionary на iPad при повторном configure), см. App Review 2.1(a).
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
      debugPrint('✅ Firebase инициализирован успешно!');
    } catch (e, st) {
      debugPrint('❌ Ошибка инициализации Firebase: $e\n$st');
      rethrow;
    }
  }
  
  // Получить текущего пользователя
  static User? get currentUser => auth.currentUser;
  
  // Проверить авторизован ли пользователь
  static bool get isAuthenticated => currentUser != null;
}
