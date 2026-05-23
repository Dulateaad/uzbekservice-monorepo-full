import 'package:cloud_firestore/cloud_firestore.dart';

/// Статус строки графика оплат (инстолмент).
enum BHInstallmentStatus { unpaid, partial, paid }

extension BHInstallmentStatusX on BHInstallmentStatus {
  String get firestoreValue => name;

  static BHInstallmentStatus parse(dynamic v) {
    return BHInstallmentStatus.values.firstWhere(
      (e) => e.name == v,
      orElse: () => BHInstallmentStatus.unpaid,
    );
  }
}

/// Одна строка графика оплат по заказу (Work / Order).
class BHInstallment {
  final String id;
  final String organizationId;
  final String workId;
  final String scheduleGroupId;
  final int sequenceIndex;
  final DateTime dueDate;
  final double amount;
  final double paidAmount;
  final BHInstallmentStatus status;
  final String currency;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BHInstallment({
    required this.id,
    required this.organizationId,
    required this.workId,
    required this.scheduleGroupId,
    required this.sequenceIndex,
    required this.dueDate,
    required this.amount,
    this.paidAmount = 0,
    this.status = BHInstallmentStatus.unpaid,
    this.currency = 'UZS',
    required this.createdAt,
    required this.updatedAt,
  });

  double get remaining => (amount - paidAmount).clamp(0.0, double.infinity);

  Map<String, dynamic> toMap() => {
        'id': id,
        'organizationId': organizationId,
        'workId': workId,
        'scheduleGroupId': scheduleGroupId,
        'sequenceIndex': sequenceIndex,
        'dueDate': Timestamp.fromDate(dueDate),
        'amount': amount,
        'paidAmount': paidAmount,
        'status': status.firestoreValue,
        'currency': currency,
        'createdAt': Timestamp.fromDate(createdAt),
        'updatedAt': Timestamp.fromDate(updatedAt),
      };

  factory BHInstallment.fromMap(Map<String, dynamic> map) {
    return BHInstallment(
      id: map['id'] ?? '',
      organizationId: map['organizationId'] ?? '',
      workId: map['workId'] ?? '',
      scheduleGroupId: map['scheduleGroupId'] ?? '',
      sequenceIndex: (map['sequenceIndex'] as num?)?.toInt() ?? 0,
      dueDate: (map['dueDate'] as Timestamp?)?.toDate() ?? DateTime.now(),
      amount: (map['amount'] as num?)?.toDouble() ?? 0,
      paidAmount: (map['paidAmount'] as num?)?.toDouble() ?? 0,
      status: BHInstallmentStatusX.parse(map['status']),
      currency: map['currency'] ?? 'UZS',
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  BHInstallment copyWith({
    double? paidAmount,
    BHInstallmentStatus? status,
    DateTime? updatedAt,
  }) {
    return BHInstallment(
      id: id,
      organizationId: organizationId,
      workId: workId,
      scheduleGroupId: scheduleGroupId,
      sequenceIndex: sequenceIndex,
      dueDate: dueDate,
      amount: amount,
      paidAmount: paidAmount ?? this.paidAmount,
      status: status ?? this.status,
      currency: currency,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
