import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_core/firebase_core.dart';

class AnamaMergeService {
  AnamaMergeService({FirebaseFunctions? functions})
      : _fn = functions ??
            FirebaseFunctions.instanceFor(
              app: Firebase.app(),
              region: 'us-central1',
            );

  final FirebaseFunctions _fn;

  /// Вызывает [anamaMergePilotSession] (деплой в проект anama-app).
  Future<Map<String, dynamic>> merge({
    required String sessionId,
    required String deviceId,
  }) async {
    final callable = _fn.httpsCallable('anamaMergePilotSession');
    final result = await callable.call({
      'sessionId': sessionId,
      'deviceId': deviceId,
    });
    final data = result.data;
    if (data == null) {
      throw StateError('Пустой ответ Cloud Function');
    }
    if (data is! Map) {
      throw StateError('Неверный формат ответа Cloud Function');
    }
    return data.map((k, v) => MapEntry(k.toString(), v));
  }
}
