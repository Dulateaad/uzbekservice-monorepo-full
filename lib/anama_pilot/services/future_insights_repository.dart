import 'dart:convert';

import 'package:flutter/services.dart';

import '../models/anama_models.dart';

class FutureInsightsRepository {
  static List<FutureInsight>? _cache;

  static Future<List<FutureInsight>> loadAll() async {
    if (_cache != null) return _cache!;
    final raw =
        await rootBundle.loadString('assets/data/future_insights.json');
    final list = json.decode(raw) as List<dynamic>;
    _cache = list
        .map((e) => FutureInsight.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
    return _cache!;
  }

  static Future<FutureInsight?> byId(String id) async {
    final all = await loadAll();
    try {
      return all.firstWhere((e) => e.id == id);
    } catch (_) {
      return null;
    }
  }

  static Future<FutureInsight?> pickForBand(String ageBand, String insightId) async {
    final insight = await byId(insightId);
    if (insight != null &&
        (insight.ageBands.isEmpty || insight.ageBands.contains(ageBand))) {
      return insight;
    }
    final all = await loadAll();
    for (final e in all) {
      if (e.ageBands.isEmpty || e.ageBands.contains(ageBand)) return e;
    }
    return insight ?? (all.isNotEmpty ? all.first : null);
  }
}
