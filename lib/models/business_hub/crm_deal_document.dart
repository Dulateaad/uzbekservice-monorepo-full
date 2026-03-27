import 'package:cloud_firestore/cloud_firestore.dart';

class BHCrmDealDocument {
  final String id;
  final String organizationId;
  final String dealId;
  final String title;
  final String url;
  final String createdBy;
  final DateTime createdAt;

  const BHCrmDealDocument({
    required this.id,
    required this.organizationId,
    required this.dealId,
    required this.title,
    required this.url,
    required this.createdBy,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'organizationId': organizationId,
        'dealId': dealId,
        'title': title,
        'url': url,
        'createdBy': createdBy,
        'createdAt': Timestamp.fromDate(createdAt),
      };

  factory BHCrmDealDocument.fromMap(Map<String, dynamic> map) => BHCrmDealDocument(
        id: map['id'] ?? '',
        organizationId: map['organizationId'] ?? '',
        dealId: map['dealId'] ?? '',
        title: map['title'] ?? '',
        url: map['url'] ?? '',
        createdBy: map['createdBy'] ?? '',
        createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      );
}
