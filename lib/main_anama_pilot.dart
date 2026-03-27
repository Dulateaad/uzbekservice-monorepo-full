import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_plugins/flutter_web_plugins.dart';

import 'anama_pilot/anama_pilot_app.dart';
import 'anama_pilot/config/anama_firebase_config_loader.dart';

/// Точка входа для веб-пилота Anama.
///
/// Сборка: `flutter build web -t lib/main_anama_pilot.dart`
/// Запуск: `flutter run -d chrome -t lib/main_anama_pilot.dart`
///
/// Перед деплоем заполните [assets/config/anama_web_config.json].
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Чтобы / и /pilot в адресной строке совпадали с GoRouter (не только hash #/).
  usePathUrlStrategy();
  try {
    final options = await AnamaFirebaseConfigLoader.load();
    await Firebase.initializeApp(options: options);
  } catch (e, st) {
    runApp(
      MaterialApp(
        home: Scaffold(
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: SelectableText(
                'Anama pilot — не удалось инициализировать Firebase:\n\n$e\n\n$st',
              ),
            ),
          ),
        ),
      ),
    );
    return;
  }

  runApp(const ProviderScope(child: AnamaPilotRoot()));
}
