import 'package:cloud_firestore/cloud_firestore.dart';

enum BHCrmSubscriptionStatus { active, paused, cancelled, expired }

extension BHCrmSubscriptionStatusX on BHCrmSubscriptionStatus {
  String get firestoreValue => name;
  String get label {
    switch (this) {
      case BHCrmSubscriptionStatus.active:
        return 'Активна';
      case BHCrmSubscriptionStatus.paused:
        return 'Пауза';
      case BHCrmSubscriptionStatus.cancelled:
        return 'Отменена';
      case BHCrmSubscriptionStatus.expired:
        return 'Истекла';
    }
  }
}

class BHCrmSubscription {
  final String id;
  final String organizationId;
  final String dealId;
  final String plan;
  final double price;
  final String currency;
  final DateTime startDate;
  final DateTime endDate;
  final BHCrmSubscriptionStatus status;
  final bool autoRenew;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BHCrmSubscription({
    required this.id,
    required this.organizationId,
    required this.dealId,
    required this.plan,
    this.price = 0,
    this.currency = 'UZS',
    required this.startDate,
    required this.endDate,
    this.status = BHCrmSubscriptionStatus.active,
    this.autoRenew = false,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'organizationId': organizationId,
        'dealId': dealId,
        'plan': plan,
        'price': price,
        'currency': currency,
        'startDate': Timestamp.fromDate(startDate),
        'endDate': Timestamp.fromDate(endDate),
        'status': status.firestoreValue,
        'autoRenew': autoRenew,
        'createdAt': Timestamp.fromDate(createdAt),
        'updatedAt': Timestamp.fromDate(updatedAt),
      };

  factory BHCrmSubscription.fromMap(Map<String, dynamic> map) => BHCrmSubscription(
        id: map['id'] ?? '',
        organizationId: map['organizationId'] ?? '',
        dealId: map['dealId'] ?? '',
        plan: map['plan'] ?? '',
        price: (map['price'] as num?)?.toDouble() ?? 0,
        currency: map['currency'] ?? 'UZS',
        startDate: (map['startDate'] as Timestamp?)?.toDate() ?? DateTime.now(),
        endDate: (map['endDate'] as Timestamp?)?.toDate() ?? DateTime.now(),
        status: BHCrmSubscriptionStatus.values.firstWhere(
          (e) => e.name == map['status'],
          orElse: () => BHCrmSubscriptionStatus.active,
        ),
        autoRenew: map['autoRenew'] == true,
        createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
        updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      );

  BHCrmSubscription copyWith({
    BHCrmSubscriptionStatus? status,
    bool? autoRenew,
    DateTime? endDate,
    DateTime? updatedAt,
  }) =>
      BHCrmSubscription(
        id: id,
        organizationId: organizationId,
        dealId: dealId,
        plan: plan,
        price: price,
        currency: currency,
        startDate: startDate,
        endDate: endDate ?? this.endDate,
        status: status ?? this.status,
        autoRenew: autoRenew ?? this.autoRenew,
        createdAt: createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
}
