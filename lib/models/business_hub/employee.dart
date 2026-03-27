import 'package:cloud_firestore/cloud_firestore.dart';

class BHEmployee {
  final String id;
  final String organizationId;
  final String fullName;
  final String? position;
  final String? inn;
  final String? phone;
  final String? email;
  final double? salary;
  final DateTime? hireDate;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BHEmployee({
    required this.id,
    required this.organizationId,
    required this.fullName,
    this.position,
    this.inn,
    this.phone,
    this.email,
    this.salary,
    this.hireDate,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'organizationId': organizationId,
      'fullName': fullName,
      'position': position,
      'inn': inn,
      'phone': phone,
      'email': email,
      'salary': salary,
      'hireDate': hireDate != null ? Timestamp.fromDate(hireDate!) : null,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  factory BHEmployee.fromMap(Map<String, dynamic> map) {
    return BHEmployee(
      id: map['id'] ?? '',
      organizationId: map['organizationId'] ?? '',
      fullName: map['fullName'] ?? '',
      position: map['position'],
      inn: map['inn'],
      phone: map['phone'],
      email: map['email'],
      salary: (map['salary'] as num?)?.toDouble(),
      hireDate: (map['hireDate'] as Timestamp?)?.toDate(),
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  BHEmployee copyWith({
    String? id,
    String? organizationId,
    String? fullName,
    String? position,
    String? inn,
    String? phone,
    String? email,
    double? salary,
    DateTime? hireDate,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return BHEmployee(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      fullName: fullName ?? this.fullName,
      position: position ?? this.position,
      inn: inn ?? this.inn,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      salary: salary ?? this.salary,
      hireDate: hireDate ?? this.hireDate,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
