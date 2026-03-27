import 'package:cloud_firestore/cloud_firestore.dart';

enum BHSStatus { healthy, attention, critical }

extension BHSStatusX on BHSStatus {
  String get label {
    switch (this) {
      case BHSStatus.healthy:
        return 'Здоровый';
      case BHSStatus.attention:
        return 'Внимание';
      case BHSStatus.critical:
        return 'Критический';
    }
  }

  static BHSStatus fromScore(int score) {
    if (score >= 80) return BHSStatus.healthy;
    if (score >= 50) return BHSStatus.attention;
    return BHSStatus.critical;
  }
}

class BHSComponents {
  final double finance;    // 0-100, вес 40%
  final double sales;      // 0-100, вес 25%
  final double operations; // 0-100, вес 20%
  final double personnel;  // 0-100, вес 15%

  const BHSComponents({
    this.finance = 0,
    this.sales = 0,
    this.operations = 0,
    this.personnel = 0,
  });

  int get totalScore {
    final raw = finance * 0.4 + sales * 0.25 + operations * 0.2 + personnel * 0.15;
    return raw.round().clamp(0, 100);
  }

  Map<String, dynamic> toMap() => {
    'finance': finance,
    'sales': sales,
    'operations': operations,
    'personnel': personnel,
  };

  factory BHSComponents.fromMap(Map<String, dynamic> map) {
    return BHSComponents(
      finance: (map['finance'] as num?)?.toDouble() ?? 0,
      sales: (map['sales'] as num?)?.toDouble() ?? 0,
      operations: (map['operations'] as num?)?.toDouble() ?? 0,
      personnel: (map['personnel'] as num?)?.toDouble() ?? 0,
    );
  }
}

class BusinessHealthScore {
  final String organizationId;
  final int score;
  final BHSStatus status;
  final BHSComponents components;
  final DateTime calculatedAt;
  final List<String> topReasons;
  final List<String> recommendations;

  const BusinessHealthScore({
    required this.organizationId,
    required this.score,
    required this.status,
    required this.components,
    required this.calculatedAt,
    this.topReasons = const [],
    this.recommendations = const [],
  });

  factory BusinessHealthScore.empty(String orgId) {
    return BusinessHealthScore(
      organizationId: orgId,
      score: -1,
      status: BHSStatus.attention,
      components: const BHSComponents(),
      calculatedAt: DateTime.now(),
      topReasons: ['Недостаточно данных для оценки'],
      recommendations: ['Добавьте первую операцию'],
    );
  }

  bool get hasData => score >= 0;

  Map<String, dynamic> toMap() => {
    'organizationId': organizationId,
    'score': score,
    'status': status.name,
    'components': components.toMap(),
    'calculatedAt': Timestamp.fromDate(calculatedAt),
    'topReasons': topReasons,
    'recommendations': recommendations,
  };

  factory BusinessHealthScore.fromMap(Map<String, dynamic> map) {
    final score = map['score'] ?? -1;
    return BusinessHealthScore(
      organizationId: map['organizationId'] ?? '',
      score: score,
      status: BHSStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => BHSStatusX.fromScore(score is int ? score : 0),
      ),
      components: map['components'] != null
          ? BHSComponents.fromMap(Map<String, dynamic>.from(map['components']))
          : const BHSComponents(),
      calculatedAt: (map['calculatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      topReasons: map['topReasons'] != null
          ? List<String>.from(map['topReasons'])
          : const [],
      recommendations: map['recommendations'] != null
          ? List<String>.from(map['recommendations'])
          : const [],
    );
  }
}
