import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/services.dart';

/// Загружает [FirebaseOptions] из [assets/config/anama_web_config.json].
///
/// Непустые `--dart-define=...` переопределяют поля из JSON (удобно, чтобы не
/// хранить ключи в файле). Пример см. [ANAMA_PILOT_README.md].
///
/// Firebase Console: Project settings → Your apps → веб-приложение (анама-app).
class AnamaFirebaseConfigLoader {
  static bool _isPlaceholderApiKey(String apiKey) {
    return apiKey.isEmpty ||
        apiKey.startsWith('REPLACE_') ||
        apiKey.contains('REPLACE_WITH');
  }

  static Future<FirebaseOptions> load() async {
    final raw =
        await rootBundle.loadString('assets/config/anama_web_config.json');
    final j = json.decode(raw) as Map<String, dynamic>;

    const apiKeyEnv =
        String.fromEnvironment('ANAMA_WEB_API_KEY', defaultValue: '');
    const appIdEnv =
        String.fromEnvironment('ANAMA_WEB_APP_ID', defaultValue: '');
    const msgEnv = String.fromEnvironment(
      'ANAMA_MESSAGING_SENDER_ID',
      defaultValue: '',
    );
    const projectEnv =
        String.fromEnvironment('ANAMA_PROJECT_ID', defaultValue: '');
    const authEnv =
        String.fromEnvironment('ANAMA_AUTH_DOMAIN', defaultValue: '');
    const bucketEnv =
        String.fromEnvironment('ANAMA_STORAGE_BUCKET', defaultValue: '');
    const dbUrlEnv =
        String.fromEnvironment('ANAMA_DATABASE_URL', defaultValue: '');

    final apiKey =
        apiKeyEnv.isNotEmpty ? apiKeyEnv : (j['apiKey'] as String? ?? '');
    final appId =
        appIdEnv.isNotEmpty ? appIdEnv : (j['appId'] as String? ?? '');
    final messagingSenderId = msgEnv.isNotEmpty
        ? msgEnv
        : (j['messagingSenderId'] as String? ?? '');
    final projectId = projectEnv.isNotEmpty
        ? projectEnv
        : (j['projectId'] as String? ?? '');
    final authDomain = authEnv.isNotEmpty
        ? authEnv
        : (j['authDomain'] as String? ?? '');
    final storageBucket = bucketEnv.isNotEmpty
        ? bucketEnv
        : (j['storageBucket'] as String? ?? '');
    final databaseURL = dbUrlEnv.isNotEmpty
        ? dbUrlEnv
        : (j['databaseURL'] as String? ?? '');

    if (_isPlaceholderApiKey(apiKey)) {
      throw StateError(
        'Нет валидного apiKey для Firebase Web.\n\n'
        'Вариант A — отредактируйте assets/config/anama_web_config.json '
        '(скопируйте объект firebase из консоли: Project settings → Your apps → Web).\n\n'
        'Вариант B — запуск с dart-define (см. ANAMA_PILOT_README.md), например:\n'
        'flutter run -d chrome -t lib/main_anama_pilot.dart '
        '--dart-define=ANAMA_WEB_API_KEY=... --dart-define=ANAMA_WEB_APP_ID=... '
        '--dart-define=ANAMA_MESSAGING_SENDER_ID=...',
      );
    }

    if (appId.isEmpty ||
        appId.contains('REPLACE_WITH') ||
        messagingSenderId.isEmpty ||
        messagingSenderId.contains('REPLACE')) {
      throw StateError(
        'Заполните appId и messagingSenderId (в JSON или через '
        'ANAMA_WEB_APP_ID и ANAMA_MESSAGING_SENDER_ID).',
      );
    }

    return FirebaseOptions(
      apiKey: apiKey,
      appId: appId,
      messagingSenderId: messagingSenderId,
      projectId: projectId.isNotEmpty ? projectId : 'anama-app',
      authDomain: authDomain.isNotEmpty ? authDomain : 'anama-app.firebaseapp.com',
      storageBucket: storageBucket.isNotEmpty
          ? storageBucket
          : 'anama-app.firebasestorage.app',
      databaseURL: databaseURL.isNotEmpty ? databaseURL : null,
    );
  }
}
