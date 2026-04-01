import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/cpa_attribution.dart';

/// Сохраняет «первый клик» CPA до регистрации (веб: query string, позже — deep link).
class CpaAttributionService {
  CpaAttributionService._();
  static final CpaAttributionService instance = CpaAttributionService._();

  static const _kPendingJson = 'cpa_pending_attribution_json';

  /// Вызывать после `SharedPreferences.getInstance()` в main.
  static Future<void> init() async {}

  /// Захватить параметры из URL (PWA / веб-лендинг). Сохраняет только первый непустой набор.
  Future<void> captureFromUri(Uri uri) async {
    final q = uri.queryParameters;
    if (q.isEmpty) return;

    final parsed = CpaAttribution.fromUriQuery(q);
    if (parsed == null) return;

    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(_kPendingJson);
    if (existing != null && existing.isNotEmpty) {
      return;
    }

    await prefs.setString(_kPendingJson, jsonEncode(parsed.toFirestoreMap()));
  }

  /// Для отладки: перезаписать pending (не затирает, если уже есть — используйте clear).
  Future<void> debugSetPending(CpaAttribution a) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kPendingJson, jsonEncode(a.toFirestoreMap()));
  }

  Future<Map<String, dynamic>?> peekPendingMap() async {
    final prefs = await SharedPreferences.getInstance();
    final s = prefs.getString(_kPendingJson);
    if (s == null || s.isEmpty) return null;
    try {
      final decoded = jsonDecode(s);
      if (decoded is Map<String, dynamic>) return decoded;
      if (decoded is Map) {
        return Map<String, dynamic>.from(decoded);
      }
    } catch (_) {}
    return null;
  }

  /// Взять атрибуцию для записи в профиль и очистить локальный буфер (один раз на установку).
  Future<Map<String, dynamic>?> takePendingForRegistration() async {
    final map = await peekPendingMap();
    if (map == null) return null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kPendingJson);
    return map;
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kPendingJson);
  }
}
