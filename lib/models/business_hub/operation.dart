import 'package:cloud_firestore/cloud_firestore.dart';

enum OperationType {
  sale,
  redelivery, // Повторная доставка (workflow)
  purchase,
  serviceRendered,
  production,
  inventoryWriteOff,
  salaryAccrual,
  salaryPayment,
  taxAccrual,
  taxPayment,
  logisticsCost,
  b2bDeposit,
  compensationPenalty,
}

/// Статус доставки (для sale/redelivery)
enum DeliveryStatus {
  pending,
  inProgress,
  delivered,
  clientRefused,
  notEnoughMoney,
  notAvailable,
  reschedule,
}

extension DeliveryStatusX on DeliveryStatus {
  String get label {
    switch (this) {
      case DeliveryStatus.pending:
        return 'Ожидает';
      case DeliveryStatus.inProgress:
        return 'В пути';
      case DeliveryStatus.delivered:
        return 'Доставлено';
      case DeliveryStatus.clientRefused:
        return 'Клиент отказался';
      case DeliveryStatus.notEnoughMoney:
        return 'Нет денег';
      case DeliveryStatus.notAvailable:
        return 'Недоступен';
      case DeliveryStatus.reschedule:
        return 'Перенос';
    }
  }

  String get firestoreValue => name;

  bool get needsManagerAction =>
      this == DeliveryStatus.clientRefused ||
      this == DeliveryStatus.notEnoughMoney ||
      this == DeliveryStatus.notAvailable;
}

enum OperationStatus { draft, confirmed, closed }

extension OperationTypeX on OperationType {
  String get label {
    switch (this) {
      case OperationType.sale:
        return 'Продажа';
      case OperationType.purchase:
        return 'Закупка';
      case OperationType.serviceRendered:
        return 'Услуга';
      case OperationType.production:
        return 'Производство';
      case OperationType.inventoryWriteOff:
        return 'Списание';
      case OperationType.salaryAccrual:
        return 'Начисление ЗП';
      case OperationType.salaryPayment:
        return 'Выплата ЗП';
      case OperationType.taxAccrual:
        return 'Начисление налогов';
      case OperationType.taxPayment:
        return 'Уплата налогов';
      case OperationType.logisticsCost:
        return 'Логистика';
      case OperationType.b2bDeposit:
        return 'B2B Депозит';
      case OperationType.compensationPenalty:
        return 'Компенсация / Штраф';
      case OperationType.redelivery:
        return 'Повторная доставка';
    }
  }

  String get firestoreValue => name;

  bool get isIncome =>
      this == OperationType.sale ||
      this == OperationType.redelivery ||
      this == OperationType.serviceRendered;

  bool get hasDelivery => this == OperationType.sale || this == OperationType.redelivery;

  bool get isExpense =>
      this == OperationType.purchase ||
      this == OperationType.salaryPayment ||
      this == OperationType.taxPayment ||
      this == OperationType.logisticsCost ||
      this == OperationType.compensationPenalty;
}

extension OperationStatusX on OperationStatus {
  String get label {
    switch (this) {
      case OperationStatus.draft:
        return 'Черновик';
      case OperationStatus.confirmed:
        return 'Подтверждён';
      case OperationStatus.closed:
        return 'Закрыт';
    }
  }

  String get firestoreValue => name;
}

class BHOperation {
  final String id;
  final String organizationId;
  final OperationType type;
  final DateTime date;
  final double amount;
  final String currency;
  final String? counterpartyId;
  final String? counterpartyName;
  final bool isTaxable;
  final String? documentId;
  final OperationStatus status;
  final String? notes;
  final String? category;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  // Workflow: доставка
  final DeliveryStatus? deliveryStatus;
  final String? assignedTo; // userId логиста/менеджера
  final String? parentOperationId; // для redelivery
  final String? deliveryComment;
  final String? dealId; // связь с CRM: сделка, из которой создана операция

  const BHOperation({
    required this.id,
    required this.organizationId,
    required this.type,
    required this.date,
    required this.amount,
    this.currency = 'UZS',
    this.counterpartyId,
    this.counterpartyName,
    this.isTaxable = true,
    this.documentId,
    this.status = OperationStatus.draft,
    this.notes,
    this.category,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.deliveryStatus,
    this.assignedTo,
    this.parentOperationId,
    this.deliveryComment,
    this.dealId,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'organizationId': organizationId,
      'type': type.firestoreValue,
      'date': Timestamp.fromDate(date),
      'amount': amount,
      'currency': currency,
      'counterpartyId': counterpartyId,
      'counterpartyName': counterpartyName,
      'isTaxable': isTaxable,
      'documentId': documentId,
      'status': status.firestoreValue,
      'notes': notes,
      'category': category,
      'createdBy': createdBy,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
      'deliveryStatus': deliveryStatus?.firestoreValue,
      'assignedTo': assignedTo,
      'parentOperationId': parentOperationId,
      'deliveryComment': deliveryComment,
      'dealId': dealId,
    };
  }

  factory BHOperation.fromMap(Map<String, dynamic> map) {
    DeliveryStatus? ds;
    final dsVal = map['deliveryStatus'] as String?;
    if (dsVal != null) {
      for (final e in DeliveryStatus.values) {
        if (e.name == dsVal) {
          ds = e;
          break;
        }
      }
    }
    return BHOperation(
      id: map['id'] ?? '',
      organizationId: map['organizationId'] ?? '',
      type: OperationType.values.firstWhere(
        (e) => e.name == map['type'],
        orElse: () => OperationType.sale,
      ),
      date: (map['date'] as Timestamp?)?.toDate() ?? DateTime.now(),
      amount: (map['amount'] as num?)?.toDouble() ?? 0.0,
      currency: map['currency'] ?? 'UZS',
      counterpartyId: map['counterpartyId'],
      counterpartyName: map['counterpartyName'],
      isTaxable: map['isTaxable'] ?? true,
      documentId: map['documentId'],
      status: OperationStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => OperationStatus.draft,
      ),
      notes: map['notes'],
      category: map['category'],
      createdBy: map['createdBy'] ?? '',
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      deliveryStatus: ds,
      assignedTo: map['assignedTo'],
      parentOperationId: map['parentOperationId'],
      deliveryComment: map['deliveryComment'],
      dealId: map['dealId'],
    );
  }

  BHOperation copyWith({
    String? id,
    String? organizationId,
    OperationType? type,
    DateTime? date,
    double? amount,
    String? currency,
    String? counterpartyId,
    String? counterpartyName,
    bool? isTaxable,
    String? documentId,
    OperationStatus? status,
    String? notes,
    String? category,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
    DeliveryStatus? deliveryStatus,
    String? assignedTo,
    String? parentOperationId,
    String? deliveryComment,
    String? dealId,
  }) {
    return BHOperation(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      type: type ?? this.type,
      date: date ?? this.date,
      amount: amount ?? this.amount,
      currency: currency ?? this.currency,
      counterpartyId: counterpartyId ?? this.counterpartyId,
      counterpartyName: counterpartyName ?? this.counterpartyName,
      isTaxable: isTaxable ?? this.isTaxable,
      documentId: documentId ?? this.documentId,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      category: category ?? this.category,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deliveryStatus: deliveryStatus ?? this.deliveryStatus,
      assignedTo: assignedTo ?? this.assignedTo,
      parentOperationId: parentOperationId ?? this.parentOperationId,
      deliveryComment: deliveryComment ?? this.deliveryComment,
      dealId: dealId ?? this.dealId,
    );
  }
}
