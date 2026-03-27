import 'package:cloud_firestore/cloud_firestore.dart';

enum BHActivityType { call, meeting, email, note }

enum BHActivityStatus { planned, done }

extension BHActivityStatusX on BHActivityStatus {
  String get firestoreValue => name;
  String get label => this == BHActivityStatus.done ? 'Выполнено' : 'Запланировано';
}

extension BHActivityTypeX on BHActivityType {
  String get label {
    switch (this) {
      case BHActivityType.call:
        return 'Звонок';
      case BHActivityType.meeting:
        return 'Встреча';
      case BHActivityType.email:
        return 'Email';
      case BHActivityType.note:
        return 'Заметка';
    }
  }

  String get firestoreValue => name;
}

class BHActivity {
  final String id;
  final String organizationId;
  final BHActivityType type;
  final String? counterpartyId;
  final String? dealId;
  final String? leadId;
  final String subject;
  final String? description;
  final DateTime activityDate;
  final String createdBy;
  final DateTime createdAt;
  final BHActivityStatus status;

  const BHActivity({
    required this.id,
    required this.organizationId,
    required this.type,
    this.counterpartyId,
    this.dealId,
    this.leadId,
    required this.subject,
    this.description,
    required this.activityDate,
    required this.createdBy,
    required this.createdAt,
    this.status = BHActivityStatus.planned,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'organizationId': organizationId,
      'type': type.firestoreValue,
      'counterpartyId': counterpartyId,
      'dealId': dealId,
      'leadId': leadId,
      'subject': subject,
      'description': description,
      'activityDate': Timestamp.fromDate(activityDate),
      'createdBy': createdBy,
      'createdAt': Timestamp.fromDate(createdAt),
      'status': status.firestoreValue,
    };
  }

  factory BHActivity.fromMap(Map<String, dynamic> map) {
    return BHActivity(
      id: map['id'] ?? '',
      organizationId: map['organizationId'] ?? '',
      type: BHActivityType.values.firstWhere(
        (e) => e.name == map['type'],
        orElse: () => BHActivityType.note,
      ),
      counterpartyId: map['counterpartyId'],
      dealId: map['dealId'],
      leadId: map['leadId'],
      subject: map['subject'] ?? '',
      description: map['description'],
      activityDate: (map['activityDate'] as Timestamp?)?.toDate() ?? DateTime.now(),
      createdBy: map['createdBy'] ?? '',
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      status: BHActivityStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => BHActivityStatus.planned,
      ),
    );
  }

  BHActivity copyWith({
    String? id,
    String? organizationId,
    BHActivityType? type,
    String? counterpartyId,
    String? dealId,
    String? leadId,
    String? subject,
    String? description,
    DateTime? activityDate,
    String? createdBy,
    DateTime? createdAt,
    BHActivityStatus? status,
  }) {
    return BHActivity(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      type: type ?? this.type,
      counterpartyId: counterpartyId ?? this.counterpartyId,
      dealId: dealId ?? this.dealId,
      leadId: leadId ?? this.leadId,
      subject: subject ?? this.subject,
      description: description ?? this.description,
      activityDate: activityDate ?? this.activityDate,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      status: status ?? this.status,
    );
  }
}
