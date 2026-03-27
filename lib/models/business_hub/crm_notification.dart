import 'package:cloud_firestore/cloud_firestore.dart';

enum BHCrmNotificationType {
  newLead,
  newDeal,
  dealOverdue,
  dealWon,
  taskAssigned,
  staleDeal,
}

extension BHCrmNotificationTypeX on BHCrmNotificationType {
  String get firestoreValue => name;
}

class BHCrmNotification {
  final String id;
  final String organizationId;
  final String userId;
  final BHCrmNotificationType type;
  final String title;
  final String body;
  final String? dealId;
  final String? leadId;
  final bool read;
  final DateTime createdAt;

  const BHCrmNotification({
    required this.id,
    required this.organizationId,
    required this.userId,
    required this.type,
    required this.title,
    required this.body,
    this.dealId,
    this.leadId,
    this.read = false,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'organizationId': organizationId,
        'userId': userId,
        'type': type.firestoreValue,
        'title': title,
        'body': body,
        'dealId': dealId,
        'leadId': leadId,
        'read': read,
        'createdAt': Timestamp.fromDate(createdAt),
      };

  factory BHCrmNotification.fromMap(Map<String, dynamic> map) => BHCrmNotification(
        id: map['id'] ?? '',
        organizationId: map['organizationId'] ?? '',
        userId: map['userId'] ?? '',
        type: BHCrmNotificationType.values.firstWhere(
          (e) => e.name == map['type'],
          orElse: () => BHCrmNotificationType.newDeal,
        ),
        title: map['title'] ?? '',
        body: map['body'] ?? '',
        dealId: map['dealId'],
        leadId: map['leadId'],
        read: map['read'] == true,
        createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      );

  BHCrmNotification copyWith({bool? read}) => BHCrmNotification(
        id: id,
        organizationId: organizationId,
        userId: userId,
        type: type,
        title: title,
        body: body,
        dealId: dealId,
        leadId: leadId,
        read: read ?? this.read,
        createdAt: createdAt,
      );
}
