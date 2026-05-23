import 'package:cloud_firestore/cloud_firestore.dart';

/// Упрощённая финансовая транзакция (Business Mode).
enum BHFinanceTxKind { income, expense, arIncrease, arDecrease, apIncrease, apDecrease }

extension BHFinanceTxKindX on BHFinanceTxKind {
  String get firestoreValue => name;

  static BHFinanceTxKind parse(dynamic v) {
    return BHFinanceTxKind.values.firstWhere(
      (e) => e.name == v,
      orElse: () => BHFinanceTxKind.income,
    );
  }
}

class BHFinanceTransaction {
  final String id;
  final String organizationId;
  final BHFinanceTxKind kind;
  final double amount;
  final String currency;
  final String? refType;
  final String? refId;
  final String? note;
  final DateTime createdAt;

  const BHFinanceTransaction({
    required this.id,
    required this.organizationId,
    required this.kind,
    required this.amount,
    this.currency = 'UZS',
    this.refType,
    this.refId,
    this.note,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'organizationId': organizationId,
        'kind': kind.firestoreValue,
        'amount': amount,
        'currency': currency,
        'refType': refType,
        'refId': refId,
        'note': note,
        'createdAt': Timestamp.fromDate(createdAt),
      };

  factory BHFinanceTransaction.fromMap(Map<String, dynamic> map) {
    return BHFinanceTransaction(
      id: map['id'] ?? '',
      organizationId: map['organizationId'] ?? '',
      kind: BHFinanceTxKindX.parse(map['kind']),
      amount: (map['amount'] as num?)?.toDouble() ?? 0,
      currency: map['currency'] ?? 'UZS',
      refType: map['refType'] as String?,
      refId: map['refId'] as String?,
      note: map['note'] as String?,
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }
}
