import 'package:cloud_firestore/cloud_firestore.dart';

/// Воронка: набор стадий совпадает с BHDealStage (ключи Firestore).
class BHCrmPipeline {
  final String id;
  final String organizationId;
  final String name;
  final List<String> stageKeys;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BHCrmPipeline({
    required this.id,
    required this.organizationId,
    required this.name,
    required this.stageKeys,
    required this.createdAt,
    required this.updatedAt,
  });

  static List<String> defaultStageKeys() =>
      ['new_', 'qualification', 'proposal', 'negotiation', 'won', 'lost'];

  Map<String, dynamic> toMap() => {
        'id': id,
        'organizationId': organizationId,
        'name': name,
        'stageKeys': stageKeys,
        'createdAt': Timestamp.fromDate(createdAt),
        'updatedAt': Timestamp.fromDate(updatedAt),
      };

  factory BHCrmPipeline.fromMap(Map<String, dynamic> map) {
    final keys = map['stageKeys'];
    return BHCrmPipeline(
      id: map['id'] ?? '',
      organizationId: map['organizationId'] ?? '',
      name: map['name'] ?? '',
      stageKeys: keys is List
          ? keys.map((e) => e.toString()).toList()
          : defaultStageKeys(),
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }
}
