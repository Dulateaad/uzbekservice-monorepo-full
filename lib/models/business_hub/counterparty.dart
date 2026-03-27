import 'package:cloud_firestore/cloud_firestore.dart';

enum CounterpartyType { legalEntity, individual, soleProprietor }

extension CounterpartyTypeX on CounterpartyType {
  String get label {
    switch (this) {
      case CounterpartyType.legalEntity:
        return 'Юридическое лицо';
      case CounterpartyType.individual:
        return 'Физическое лицо';
      case CounterpartyType.soleProprietor:
        return 'ИП';
    }
  }

  String get firestoreValue => name;
}

class BHCounterparty {
  final String id;
  final String organizationId;
  final String name;
  final CounterpartyType type;
  final String? inn;
  final String? pinfl;
  final String? bankName;
  final String? bankAccount;
  final String? address;
  final String? phone;
  final String? email;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BHCounterparty({
    required this.id,
    required this.organizationId,
    required this.name,
    this.type = CounterpartyType.legalEntity,
    this.inn,
    this.pinfl,
    this.bankName,
    this.bankAccount,
    this.address,
    this.phone,
    this.email,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'organizationId': organizationId,
      'name': name,
      'type': type.firestoreValue,
      'inn': inn,
      'pinfl': pinfl,
      'bankName': bankName,
      'bankAccount': bankAccount,
      'address': address,
      'phone': phone,
      'email': email,
      'notes': notes,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  factory BHCounterparty.fromMap(Map<String, dynamic> map) {
    return BHCounterparty(
      id: map['id'] ?? '',
      organizationId: map['organizationId'] ?? '',
      name: map['name'] ?? '',
      type: CounterpartyType.values.firstWhere(
        (e) => e.name == map['type'],
        orElse: () => CounterpartyType.legalEntity,
      ),
      inn: map['inn'],
      pinfl: map['pinfl'],
      bankName: map['bankName'],
      bankAccount: map['bankAccount'],
      address: map['address'],
      phone: map['phone'],
      email: map['email'],
      notes: map['notes'],
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  BHCounterparty copyWith({
    String? id,
    String? organizationId,
    String? name,
    CounterpartyType? type,
    String? inn,
    String? pinfl,
    String? bankName,
    String? bankAccount,
    String? address,
    String? phone,
    String? email,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return BHCounterparty(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      name: name ?? this.name,
      type: type ?? this.type,
      inn: inn ?? this.inn,
      pinfl: pinfl ?? this.pinfl,
      bankName: bankName ?? this.bankName,
      bankAccount: bankAccount ?? this.bankAccount,
      address: address ?? this.address,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
