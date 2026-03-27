import 'package:cloud_firestore/cloud_firestore.dart';

class BHCrmDealItem {
  final String id;
  final String organizationId;
  final String dealId;
  final String productId;
  final String? productName;
  final double qty;
  final double price;
  final DateTime createdAt;

  const BHCrmDealItem({
    required this.id,
    required this.organizationId,
    required this.dealId,
    required this.productId,
    this.productName,
    this.qty = 1,
    required this.price,
    required this.createdAt,
  });

  double get total => qty * price;

  Map<String, dynamic> toMap() => {
        'id': id,
        'organizationId': organizationId,
        'dealId': dealId,
        'productId': productId,
        'productName': productName,
        'qty': qty,
        'price': price,
        'createdAt': Timestamp.fromDate(createdAt),
      };

  factory BHCrmDealItem.fromMap(Map<String, dynamic> map) => BHCrmDealItem(
        id: map['id'] ?? '',
        organizationId: map['organizationId'] ?? '',
        dealId: map['dealId'] ?? '',
        productId: map['productId'] ?? '',
        productName: map['productName'],
        qty: (map['qty'] as num?)?.toDouble() ?? 1,
        price: (map['price'] as num?)?.toDouble() ?? 0,
        createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      );
}
