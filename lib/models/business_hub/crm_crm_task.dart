import 'package:cloud_firestore/cloud_firestore.dart';

enum BHCrmTaskStatus { pending, inProgress, done }

extension BHCrmTaskStatusX on BHCrmTaskStatus {
  String get firestoreValue => name;
  String get label {
    switch (this) {
      case BHCrmTaskStatus.pending:
        return 'Ожидает';
      case BHCrmTaskStatus.inProgress:
        return 'В работе';
      case BHCrmTaskStatus.done:
        return 'Готово';
    }
  }
}

/// Задача CRM (не путать с bh_tasks — доставка).
class BHCrmTask {
  final String id;
  final String organizationId;
  final String title;
  final String? description;
  final String? dealId;
  final String? leadId;
  final String assignedTo;
  final DateTime dueDate;
  final BHCrmTaskStatus status;
  final String? priority;
  final String? createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BHCrmTask({
    required this.id,
    required this.organizationId,
    required this.title,
    this.description,
    this.dealId,
    this.leadId,
    required this.assignedTo,
    required this.dueDate,
    this.status = BHCrmTaskStatus.pending,
    this.priority,
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isOverdue => status != BHCrmTaskStatus.done && dueDate.isBefore(DateTime.now());

  Map<String, dynamic> toMap() => {
        'id': id,
        'organizationId': organizationId,
        'title': title,
        'description': description,
        'dealId': dealId,
        'leadId': leadId,
        'assignedTo': assignedTo,
        'dueDate': Timestamp.fromDate(dueDate),
        'status': status.firestoreValue,
        'priority': priority,
        'createdBy': createdBy,
        'createdAt': Timestamp.fromDate(createdAt),
        'updatedAt': Timestamp.fromDate(updatedAt),
      };

  factory BHCrmTask.fromMap(Map<String, dynamic> map) => BHCrmTask(
        id: map['id'] ?? '',
        organizationId: map['organizationId'] ?? '',
        title: map['title'] ?? '',
        description: map['description'],
        dealId: map['dealId'],
        leadId: map['leadId'],
        assignedTo: map['assignedTo'] ?? '',
        dueDate: (map['dueDate'] as Timestamp?)?.toDate() ?? DateTime.now(),
        status: BHCrmTaskStatus.values.firstWhere(
          (e) => e.name == map['status'],
          orElse: () => BHCrmTaskStatus.pending,
        ),
        priority: map['priority'],
        createdBy: map['createdBy'],
        createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
        updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      );

  BHCrmTask copyWith({
    String? title,
    String? description,
    String? assignedTo,
    DateTime? dueDate,
    BHCrmTaskStatus? status,
    DateTime? updatedAt,
      }) =>
      BHCrmTask(
        id: id,
        organizationId: organizationId,
        title: title ?? this.title,
        description: description ?? this.description,
        dealId: this.dealId,
        leadId: this.leadId,
        assignedTo: assignedTo ?? this.assignedTo,
        dueDate: dueDate ?? this.dueDate,
        status: status ?? this.status,
        priority: priority ?? this.priority,
        createdBy: createdBy ?? this.createdBy,
        createdAt: createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
}
