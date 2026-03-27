import 'package:cloud_firestore/cloud_firestore.dart';

class BHOrganization {
  final String id;
  final String ownerId;
  final String name;
  final String? inn; // ИНН / СТИР / БИН
  final String? legalForm; // ИП, ООО, ТОО
  final String industry;
  final int employeeCount;
  final String subscriptionTier; // lite, pro, corporate
  final String? address;
  final String? phone;
  final String? email;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BHOrganization({
    required this.id,
    required this.ownerId,
    required this.name,
    this.inn,
    this.legalForm,
    required this.industry,
    this.employeeCount = 1,
    this.subscriptionTier = 'lite',
    this.address,
    this.phone,
    this.email,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'ownerId': ownerId,
      'name': name,
      'inn': inn,
      'legalForm': legalForm,
      'industry': industry,
      'employeeCount': employeeCount,
      'subscriptionTier': subscriptionTier,
      'address': address,
      'phone': phone,
      'email': email,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  factory BHOrganization.fromMap(Map<String, dynamic> map) {
    return BHOrganization(
      id: map['id'] ?? '',
      ownerId: map['ownerId'] ?? '',
      name: map['name'] ?? '',
      inn: map['inn'],
      legalForm: map['legalForm'],
      industry: map['industry'] ?? '',
      employeeCount: map['employeeCount'] ?? 1,
      subscriptionTier: map['subscriptionTier'] ?? 'lite',
      address: map['address'],
      phone: map['phone'],
      email: map['email'],
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  BHOrganization copyWith({
    String? id,
    String? ownerId,
    String? name,
    String? inn,
    String? legalForm,
    String? industry,
    int? employeeCount,
    String? subscriptionTier,
    String? address,
    String? phone,
    String? email,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return BHOrganization(
      id: id ?? this.id,
      ownerId: ownerId ?? this.ownerId,
      name: name ?? this.name,
      inn: inn ?? this.inn,
      legalForm: legalForm ?? this.legalForm,
      industry: industry ?? this.industry,
      employeeCount: employeeCount ?? this.employeeCount,
      subscriptionTier: subscriptionTier ?? this.subscriptionTier,
      address: address ?? this.address,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
