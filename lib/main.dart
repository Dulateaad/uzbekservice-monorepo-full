import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'package:flutter/foundation.dart' show kDebugMode;

import 'utils/app_router.dart';
import 'config/firebase_config.dart';
import 'config/gemini_init.dart';
import 'widgets/back_gesture_guard.dart';
import 'theme/app_theme.dart';
import 'services/push_notification_service.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'providers/notification_navigation_provider.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'services/google_maps_service.dart';
import 'services/analytics_service.dart';
import 'providers/locale_provider.dart';
import 'l10n/app_localizations.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Кастомный обработчик ошибок с возможностью копирования
  ErrorWidget.builder = (FlutterErrorDetails details) {
    return _CopyableErrorWidget(details: details);
  };
  
  // Initialize Firebase
  await FirebaseConfig.initialize();
  
  // Initialize Push Notifications
  // Регистрируем background handler (должен быть зарегистрирован до runApp)
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  
  // Инициализируем push-уведомления
  await PushNotificationService.initialize();
  
  // Предзагружаем Google Maps API для веб (для ускорения загрузки карты)
  if (kIsWeb) {
    GoogleMapsService.initialize().catchError((e) {
      print('⚠️ Предзагрузка Google Maps API: $e');
    });
    initGeminiConfigForWeb();
  }
  
  // Initialize Hive for local storage
  await Hive.initFlutter();
  
  // В тестовом режиме (debug) держим экран включенным
  if (kDebugMode) {
    await WakelockPlus.enable();
    print('🔋 Режим тестирования: экран будет оставаться включенным');
  }
  
  runApp(
    const ProviderScope(
      child: UzbekistanServiceApp(),
    ),
  );
}

class UzbekistanServiceApp extends ConsumerWidget {
  const UzbekistanServiceApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Устанавливаем router для навигации из уведомлений
    NotificationNavigationProvider.setRouter(AppRouter.router);
    
    // Получаем текущий язык из провайдера
    final locale = ref.watch(localeProvider);
    
    return MaterialApp.router(
      title: 'ODO.UZ',
      debugShowCheckedModeBanner: false,
      
      // Theme
      theme: AppTheme.lightTheme,
      
      // Localization
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      locale: locale,
      
      // Routing
      routerConfig: AppRouter.router,
      
      // Защита от случайного свайпа закрытия (PWA, мобильные)
      builder: (context, child) => BackGestureGuard(
        child: child ?? const SizedBox.shrink(),
      ),
    );
  }
}

/// Виджет ошибки с возможностью копирования
class _CopyableErrorWidget extends StatelessWidget {
  final FlutterErrorDetails details;

  const _CopyableErrorWidget({required this.details});

  @override
  Widget build(BuildContext context) {
    final errorText = '''
🚨 FLUTTER ERROR

📍 Ошибка: ${details.exception}

📚 Stack Trace:
${details.stack}

📦 Library: ${details.library}
🏷️ Context: ${details.context}

📱 Время: ${DateTime.now()}
''';

    return Material(
      color: const Color(0xFFB00020),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  const Icon(
                    Icons.error_outline,
                    color: Colors.white,
                    size: 32,
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Произошла ошибка',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  // Copy button
                  IconButton(
                    onPressed: () => _copyError(context, errorText),
                    icon: const Icon(Icons.copy, color: Colors.white),
                    tooltip: 'Копировать',
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              // Error message
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SelectableText(
                  details.exception.toString(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
              const SizedBox(height: 16),
              
              // Stack trace (scrollable)
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black26,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: SingleChildScrollView(
                    child: SelectableText(
                      details.stack?.toString() ?? 'No stack trace',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 11,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              
              // Copy button (large)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _copyError(context, errorText),
                  icon: const Icon(Icons.copy),
                  label: const Text('СКОПИРОВАТЬ ОШИБКУ'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFFB00020),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _copyError(BuildContext context, String errorText) {
    Clipboard.setData(ClipboardData(text: errorText));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.white),
            SizedBox(width: 12),
            Text('✅ Ошибка скопирована!'),
          ],
        ),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }
}
