import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_core/firebase_core.dart';

/// Callable платформы: события, outbox уведомлений (`functions/src/platform/callable.ts`).
class PlatformCloudService {
  PlatformCloudService({FirebaseFunctions? functions})
      : _fn = functions ??
            FirebaseFunctions.instanceFor(
              app: Firebase.app(),
              region: 'us-central1',
            );

  final FirebaseFunctions _fn;

  Future<Map<String, dynamic>> _call(String name, Map<String, dynamic> payload) async {
    final result = await _fn.httpsCallable(name).call(payload);
    final data = result.data;
    if (data == null) {
      throw StateError('Пустой ответ Cloud Function $name');
    }
    if (data is! Map) {
      throw StateError('Неверный формат ответа $name');
    }
    return data.map((k, v) => MapEntry(k.toString(), v));
  }

  Future<Map<String, dynamic>> emitBusinessEvent({
    required String type,
    required String companyId,
    Map<String, dynamic>? payload,
  }) =>
      _call('platformEmitBusinessEvent', {
        'type': type,
        'companyId': companyId,
        if (payload != null) 'payload': payload,
      });

  Future<Map<String, dynamic>> enqueueNotification({
    required String companyId,
    required String title,
    required String body,
    String channel = 'in_app',
    Map<String, dynamic>? meta,
  }) =>
      _call('platformEnqueueNotification', {
        'companyId': companyId,
        'title': title,
        'body': body,
        'channel': channel,
        if (meta != null) 'meta': meta,
      });
}
