import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Конфигурация Firebase для всех платформ
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return macos;
      case TargetPlatform.windows:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for windows - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyC9CTXPa_2UzpVAiLzTR1hlVm7RD6cmhHw',
    appId: '1:678613616925:web:2f35b684fe08c0d2a439f4',
    messagingSenderId: '678613616925',
    projectId: 'odo-business-hub',
    authDomain: 'odo-business-hub.firebaseapp.com',
    storageBucket: 'odo-business-hub.firebasestorage.app',
  );

  /// Проект Firebase: **odo-business-hub** (как в веб-конфиге).
  /// Для Android лучше подставить `mobilesdk_app_id` из `google-services.json` этого же проекта.
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyC9CTXPa_2UzpVAiLzTR1hlVm7RD6cmhHw',
    appId: '1:678613616925:web:2f35b684fe08c0d2a439f4',
    messagingSenderId: '678613616925',
    projectId: 'odo-business-hub',
    storageBucket: 'odo-business-hub.firebasestorage.app',
  );

  /// Совпадает с `ios/Runner/GoogleService-Info.plist` (odo-business-hub, com.odo.odoUzApp).
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyDiNhVApW6GqlbrFJTgtq_4Z8o0EfYJikE',
    appId: '1:678613616925:ios:c9e0fc97c5ab5289a439f4',
    messagingSenderId: '678613616925',
    projectId: 'odo-business-hub',
    storageBucket: 'odo-business-hub.firebasestorage.app',
    iosBundleId: 'com.odo.odoUzApp',
  );

  /// Те же значения, что и iOS, пока для macOS нет отдельного приложения в Firebase.
  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'AIzaSyDiNhVApW6GqlbrFJTgtq_4Z8o0EfYJikE',
    appId: '1:678613616925:ios:c9e0fc97c5ab5289a439f4',
    messagingSenderId: '678613616925',
    projectId: 'odo-business-hub',
    storageBucket: 'odo-business-hub.firebasestorage.app',
    iosBundleId: 'com.odo.odoUzApp',
  );
}

