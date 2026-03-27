import 'package:firebase_database/firebase_database.dart';

class AnamaRtdbService {
  static DatabaseReference telemetryRef(String deviceId) {
    return FirebaseDatabase.instance.ref('users/$deviceId/telemetry');
  }

  static DatabaseReference rrHistoryRef(String deviceId) {
    return FirebaseDatabase.instance.ref('users/$deviceId/rr_history');
  }

  /// Поток снимка телеметрии (bpm, last_rr, status, timestamp).
  static Stream<Map<String, dynamic>?> telemetryStream(String deviceId) {
    return telemetryRef(deviceId).onValue.map((event) {
      final v = event.snapshot.value;
      if (v == null) return null;
      if (v is! Map) return null;
      return v.map((k, val) => MapEntry(k.toString(), val));
    });
  }

  /// Последнее значение rr_history (массив чисел в RTDB).
  static Future<List<double>> readRrHistory(String deviceId) async {
    final snap = await rrHistoryRef(deviceId).get();
    if (!snap.exists || snap.value == null) return [];
    final v = snap.value;
    if (v is List) {
      return v
          .whereType<num>()
          .map((e) => e.toDouble())
          .where((e) => e > 200 && e < 3000)
          .toList();
    }
    if (v is Map) {
      return v.values
          .whereType<num>()
          .map((e) => e.toDouble())
          .where((e) => e > 200 && e < 3000)
          .toList();
    }
    return [];
  }
}
