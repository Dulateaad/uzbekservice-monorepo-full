import 'package:cloud_firestore/cloud_firestore.dart';

/// Проводка (double-entry, одна строка Dr/Cr).
class BHJournalEntry {
  final String id;
  final String organizationId;
  final DateTime date;
  final String debitAccountId;
  final String creditAccountId;
  final double amount;
  final String currency;
  final String? referenceType;
  final String? referenceId;
  final String? note;
  final DateTime createdAt;

  const BHJournalEntry({
    required this.id,
    required this.organizationId,
    required this.date,
    required this.debitAccountId,
    required this.creditAccountId,
    required this.amount,
    this.currency = 'UZS',
    this.referenceType,
    this.referenceId,
    this.note,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'organizationId': organizationId,
        'date': Timestamp.fromDate(date),
        'debitAccountId': debitAccountId,
        'creditAccountId': creditAccountId,
        'amount': amount,
        'currency': currency,
        'referenceType': referenceType,
        'referenceId': referenceId,
        'note': note,
        'createdAt': Timestamp.fromDate(createdAt),
      };

  factory BHJournalEntry.fromMap(Map<String, dynamic> map) => BHJournalEntry(
        id: map['id'] ?? '',
        organizationId: map['organizationId'] ?? '',
        date: (map['date'] as Timestamp?)?.toDate() ?? DateTime.now(),
        debitAccountId: map['debitAccountId'] ?? '',
        creditAccountId: map['creditAccountId'] ?? '',
        amount: (map['amount'] as num?)?.toDouble() ?? 0,
        currency: map['currency'] ?? 'UZS',
        referenceType: map['referenceType'] as String?,
        referenceId: map['referenceId'] as String?,
        note: map['note'] as String?,
        createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      );
}
