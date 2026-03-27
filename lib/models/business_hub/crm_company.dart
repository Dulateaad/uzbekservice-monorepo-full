import 'package:cloud_firestore/cloud_firestore.dart';

class BHCrmCompany {
  final String id;
  final String organizationId;
  final String name;
  final String? industry;
  final String? size;
  final String? address;
  final String? website;
  final String? ownerId;
  final String? counterpartyId;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BHCrmCompany({
    required this.id,
    required this.organizationId,
    required this.name,
    this.industry,
    this.size,
    this.address,
    this.website,
    this.ownerId,
    this.counterpartyId,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'organizationId': organizationId,
        'name': name,
        'industry': industry,
        'size': size,
        'address': address,
        'website': website,
        'ownerId': ownerId,
        'counterpartyId': counterpartyId,
        'createdAt': Timestamp.fromDate(createdAt),
        'updatedAt': Timestamp.fromDate(updatedAt),
      };

  factory BHCrmCompany.fromMap(Map<String, dynamic> map) => BHCrmCompany(
        id: map['id'] ?? '',
        organizationId: map['organizationId'] ?? '',
        name: map['name'] ?? '',
        industry: map['industry'],
        size: map['size'],
        address: map['address'],
        website: map['website'],
        ownerId: map['ownerId'],
        counterpartyId: map['counterpartyId'],
        createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
        updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      );

  BHCrmCompany copyWith({
    String? name,
    String? industry,
    String? size,
    String? address,
    String? website,
    String? ownerId,
    String? counterpartyId,
    DateTime? updatedAt,
  }) =>
      BHCrmCompany(
        id: id,
        organizationId: organizationId,
        name: name ?? this.name,
        industry: industry ?? this.industry,
        size: size ?? this.size,
        address: address ?? this.address,
        website: website ?? this.website,
        ownerId: ownerId ?? this.ownerId,
        counterpartyId: counterpartyId ?? this.counterpartyId,
        createdAt: createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
}
