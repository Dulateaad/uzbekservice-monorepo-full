import 'package:cloud_firestore/cloud_firestore.dart';

/// Минимальный план счетов (Accounting Mode).
enum BHChartAccountKind { cash, ar, ap, revenue, expense }

extension BHChartAccountKindX on BHChartAccountKind {
  String get firestoreValue => name;

  static BHChartAccountKind parse(dynamic v) {
    return BHChartAccountKind.values.firstWhere(
      (e) => e.name == v,
      orElse: () => BHChartAccountKind.expense,
    );
  }
}

class BHChartAccount {
  final String id;
  final String organizationId;
  final String code;
  final String name;
  final BHChartAccountKind kind;
  final DateTime createdAt;

  const BHChartAccount({
    required this.id,
    required this.organizationId,
    required this.code,
    required this.name,
    required this.kind,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'organizationId': organizationId,
        'code': code,
        'name': name,
        'kind': kind.firestoreValue,
        'createdAt': Timestamp.fromDate(createdAt),
      };

  factory BHChartAccount.fromMap(Map<String, dynamic> map) => BHChartAccount(
        id: map['id'] ?? '',
        organizationId: map['organizationId'] ?? '',
        code: map['code'] ?? '',
        name: map['name'] ?? '',
        kind: BHChartAccountKindX.parse(map['kind']),
        createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      );
}
