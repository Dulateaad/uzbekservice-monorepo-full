import 'package:cloud_firestore/cloud_firestore.dart';

/// Universal Work — единая сущность для заказов, вакансий, доставок, задач
enum WorkType {
  serviceRequest,
  jobPosition,
  jobApplication,
  order,
  delivery,
  task,
  project,
  consultation,
}

enum WorkStatus {
  created,
  accepted,
  inProgress,
  completed,
  cancelled,
  failed,
}

extension WorkTypeX on WorkType {
  String get label {
    switch (this) {
      case WorkType.serviceRequest:
        return 'Заявка на услугу';
      case WorkType.jobPosition:
        return 'Вакансия';
      case WorkType.jobApplication:
        return 'Отклик на вакансию';
      case WorkType.order:
        return 'Заказ';
      case WorkType.delivery:
        return 'Доставка';
      case WorkType.task:
        return 'Задача';
      case WorkType.project:
        return 'Проект';
      case WorkType.consultation:
        return 'Консультация';
    }
  }

  String get firestoreValue => name;

  bool get isActive => true;
}

extension WorkStatusX on WorkStatus {
  String get label {
    switch (this) {
      case WorkStatus.created:
        return 'Создано';
      case WorkStatus.accepted:
        return 'Принято';
      case WorkStatus.inProgress:
        return 'В работе';
      case WorkStatus.completed:
        return 'Завершено';
      case WorkStatus.cancelled:
        return 'Отменено';
      case WorkStatus.failed:
        return 'Не выполнено';
    }
  }

  String get firestoreValue => name;

  bool get isClosed =>
      this == WorkStatus.completed ||
      this == WorkStatus.cancelled ||
      this == WorkStatus.failed;
}

class Work {
  final String id;
  final String organizationId;
  final WorkType type;
  final String title;
  final String? description;
  final WorkStatus status;
  final String? clientId;
  final String? clientName;
  final String? executorId;
  final String? executorName;
  final String? assignedTo;
  final String? parentWorkId;
  final double? price;
  final String currency;
  final Map<String, dynamic>? metadata;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Work({
    required this.id,
    required this.organizationId,
    required this.type,
    required this.title,
    this.description,
    this.status = WorkStatus.created,
    this.clientId,
    this.clientName,
    this.executorId,
    this.executorName,
    this.assignedTo,
    this.parentWorkId,
    this.price,
    this.currency = 'UZS',
    this.metadata,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'organizationId': organizationId,
      'type': type.firestoreValue,
      'title': title,
      'description': description,
      'status': status.firestoreValue,
      'clientId': clientId,
      'clientName': clientName,
      'executorId': executorId,
      'executorName': executorName,
      'assignedTo': assignedTo,
      'parentWorkId': parentWorkId,
      'price': price,
      'currency': currency,
      'metadata': metadata,
      'createdBy': createdBy,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  factory Work.fromMap(Map<String, dynamic> map) {
    return Work(
      id: map['id'] ?? '',
      organizationId: map['organizationId'] ?? '',
      type: WorkType.values.firstWhere(
        (e) => e.name == map['type'],
        orElse: () => WorkType.task,
      ),
      title: map['title'] ?? '',
      description: map['description'],
      status: WorkStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => WorkStatus.created,
      ),
      clientId: map['clientId'],
      clientName: map['clientName'],
      executorId: map['executorId'],
      executorName: map['executorName'],
      assignedTo: map['assignedTo'],
      parentWorkId: map['parentWorkId'],
      price: (map['price'] as num?)?.toDouble(),
      currency: map['currency'] ?? 'UZS',
      metadata: map['metadata'] != null
          ? Map<String, dynamic>.from(map['metadata'] as Map)
          : null,
      createdBy: map['createdBy'] ?? '',
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Work copyWith({
    String? id,
    String? organizationId,
    WorkType? type,
    String? title,
    String? description,
    WorkStatus? status,
    String? clientId,
    String? clientName,
    String? executorId,
    String? executorName,
    String? assignedTo,
    String? parentWorkId,
    double? price,
    String? currency,
    Map<String, dynamic>? metadata,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Work(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      type: type ?? this.type,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
      clientId: clientId ?? this.clientId,
      clientName: clientName ?? this.clientName,
      executorId: executorId ?? this.executorId,
      executorName: executorName ?? this.executorName,
      assignedTo: assignedTo ?? this.assignedTo,
      parentWorkId: parentWorkId ?? this.parentWorkId,
      price: price ?? this.price,
      currency: currency ?? this.currency,
      metadata: metadata ?? this.metadata,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
