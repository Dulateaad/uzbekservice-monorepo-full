import 'package:cloud_firestore/cloud_firestore.dart';

enum BHTaskStatus { pending, inProgress, done }

enum BHTaskTrigger { deliveryStatus, manual }

extension BHTaskStatusX on BHTaskStatus {
  String get label {
    switch (this) {
      case BHTaskStatus.pending:
        return 'Ожидает';
      case BHTaskStatus.inProgress:
        return 'В работе';
      case BHTaskStatus.done:
        return 'Выполнено';
    }
  }

  String get firestoreValue => name;
}

extension BHTaskTriggerX on BHTaskTrigger {
  String get firestoreValue => name;
}

/// Задача, созданная Workflow Engine при смене статуса доставки
class BHTask {
  final String id;
  final String organizationId;
  final String operationId;
  final String title;
  final String? description;
  final String assignedTo; // userId
  final BHTaskStatus status;
  final BHTaskTrigger triggeredBy;
  final String? triggeredByDeliveryStatus;
  final DateTime createdAt;
  final DateTime? dueAt;
  final DateTime? completedAt;

  const BHTask({
    required this.id,
    required this.organizationId,
    required this.operationId,
    required this.title,
    this.description,
    required this.assignedTo,
    this.status = BHTaskStatus.pending,
    this.triggeredBy = BHTaskTrigger.manual,
    this.triggeredByDeliveryStatus,
    required this.createdAt,
    this.dueAt,
    this.completedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'organizationId': organizationId,
      'operationId': operationId,
      'title': title,
      'description': description,
      'assignedTo': assignedTo,
      'status': status.firestoreValue,
      'triggeredBy': triggeredBy.firestoreValue,
      'triggeredByDeliveryStatus': triggeredByDeliveryStatus,
      'createdAt': Timestamp.fromDate(createdAt),
      'dueAt': dueAt != null ? Timestamp.fromDate(dueAt!) : null,
      'completedAt': completedAt != null ? Timestamp.fromDate(completedAt!) : null,
    };
  }

  factory BHTask.fromMap(Map<String, dynamic> map) {
    return BHTask(
      id: map['id'] ?? '',
      organizationId: map['organizationId'] ?? '',
      operationId: map['operationId'] ?? '',
      title: map['title'] ?? '',
      description: map['description'],
      assignedTo: map['assignedTo'] ?? '',
      status: BHTaskStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => BHTaskStatus.pending,
      ),
      triggeredBy: BHTaskTrigger.values.firstWhere(
        (e) => e.name == map['triggeredBy'],
        orElse: () => BHTaskTrigger.manual,
      ),
      triggeredByDeliveryStatus: map['triggeredByDeliveryStatus'],
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      dueAt: (map['dueAt'] as Timestamp?)?.toDate(),
      completedAt: (map['completedAt'] as Timestamp?)?.toDate(),
    );
  }

  BHTask copyWith({
    String? id,
    String? organizationId,
    String? operationId,
    String? title,
    String? description,
    String? assignedTo,
    BHTaskStatus? status,
    BHTaskTrigger? triggeredBy,
    String? triggeredByDeliveryStatus,
    DateTime? createdAt,
    DateTime? dueAt,
    DateTime? completedAt,
  }) {
    return BHTask(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      operationId: operationId ?? this.operationId,
      title: title ?? this.title,
      description: description ?? this.description,
      assignedTo: assignedTo ?? this.assignedTo,
      status: status ?? this.status,
      triggeredBy: triggeredBy ?? this.triggeredBy,
      triggeredByDeliveryStatus: triggeredByDeliveryStatus ?? this.triggeredByDeliveryStatus,
      createdAt: createdAt ?? this.createdAt,
      dueAt: dueAt ?? this.dueAt,
      completedAt: completedAt ?? this.completedAt,
    );
  }
}
