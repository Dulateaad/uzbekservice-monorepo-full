import 'package:cloud_firestore/cloud_firestore.dart';

class BHCrmContact {
  final String id;
  final String organizationId;
  final String name;
  final String? phone;
  final String? email;
  final String companyId;
  final String? position;
  final String? ownerId;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BHCrmContact({
    required this.id,
    required this.organizationId,
    required this.name,
    this.phone,
    this.email,
    required this.companyId,
    this.position,
    this.ownerId,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'organizationId': organizationId,
        'name': name,
        'phone': phone,
        'email': email,
        'companyId': companyId,
        'position': position,
        'ownerId': ownerId,
        'createdAt': Timestamp.fromDate(createdAt),
        'updatedAt': Timestamp.fromDate(updatedAt),
      };

  factory BHCrmContact.fromMap(Map<String, dynamic> map) => BHCrmContact(
        id: map['id'] ?? '',
        organizationId: map['organizationId'] ?? '',
        name: map['name'] ?? '',
        phone: map['phone'],
        email: map['email'],
        companyId: map['companyId'] ?? '',
        position: map['position'],
        ownerId: map['ownerId'],
        createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
        updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      );

  BHCrmContact copyWith({
    String? name,
    String? phone,
    String? email,
    String? companyId,
    String? position,
    String? ownerId,
    DateTime? updatedAt,
  }) =>
      BHCrmContact(
        id: id,
        organizationId: organizationId,
        name: name ?? this.name,
        phone: phone ?? this.phone,
        email: email ?? this.email,
        companyId: companyId ?? this.companyId,
        position: position ?? this.position,
        ownerId: ownerId ?? this.ownerId,
        createdAt: createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
}
