import 'package:cloud_firestore/cloud_firestore.dart';

enum BHCrmProductKind { product, service }

extension BHCrmProductKindX on BHCrmProductKind {
  String get firestoreValue => name;
  String get label => this == BHCrmProductKind.product ? 'Товар' : 'Услуга';
}

class BHCrmProduct {
  final String id;
  final String organizationId;
  final String name;
  final double price;
  final String currency;
  final BHCrmProductKind kind;
  final bool active;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BHCrmProduct({
    required this.id,
    required this.organizationId,
    required this.name,
    this.price = 0,
    this.currency = 'UZS',
    this.kind = BHCrmProductKind.product,
    this.active = true,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'organizationId': organizationId,
        'name': name,
        'price': price,
        'currency': currency,
        'kind': kind.firestoreValue,
        'active': active,
        'createdAt': Timestamp.fromDate(createdAt),
        'updatedAt': Timestamp.fromDate(updatedAt),
      };

  factory BHCrmProduct.fromMap(Map<String, dynamic> map) => BHCrmProduct(
        id: map['id'] ?? '',
        organizationId: map['organizationId'] ?? '',
        name: map['name'] ?? '',
        price: (map['price'] as num?)?.toDouble() ?? 0,
        currency: map['currency'] ?? 'UZS',
        kind: BHCrmProductKind.values.firstWhere(
          (e) => e.name == map['kind'],
          orElse: () => BHCrmProductKind.product,
        ),
        active: map['active'] != false,
        createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
        updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      );

  BHCrmProduct copyWith({
    String? name,
    double? price,
    String? currency,
    BHCrmProductKind? kind,
    bool? active,
    DateTime? updatedAt,
  }) =>
      BHCrmProduct(
        id: id,
        organizationId: organizationId,
        name: name ?? this.name,
        price: price ?? this.price,
        currency: currency ?? this.currency,
        kind: kind ?? this.kind,
        active: active ?? this.active,
        createdAt: createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
}
