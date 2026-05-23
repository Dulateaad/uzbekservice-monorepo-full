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
  /// `business` (по умолчанию) или `accounting` (расширенный режим из ТЗ).
  final String financeMode;
  /// Включён ли блок Accounting (проводки, счета).
  final bool accountingModeEnabled;
  /// Завершён ли мастер онбординга Business Hub.
  final bool bhOnboardingComplete;
  /// Тип бизнеса для терминов и подсказок в интерфейсе (`BusinessVerticalIds`).
  final String businessVerticalId;
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
    this.financeMode = 'business',
    this.accountingModeEnabled = false,
    this.bhOnboardingComplete = false,
    this.businessVerticalId = 'services',
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
      'financeMode': financeMode,
      'accountingModeEnabled': accountingModeEnabled,
      'bhOnboardingComplete': bhOnboardingComplete,
      'businessVerticalId': businessVerticalId,
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
      financeMode: map['financeMode'] as String? ?? 'business',
      accountingModeEnabled: map['accountingModeEnabled'] == true,
      bhOnboardingComplete: map['bhOnboardingComplete'] == true,
      businessVerticalId: map['businessVerticalId'] as String? ?? 'services',
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
    String? financeMode,
    bool? accountingModeEnabled,
    bool? bhOnboardingComplete,
    String? businessVerticalId,
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
      financeMode: financeMode ?? this.financeMode,
      accountingModeEnabled: accountingModeEnabled ?? this.accountingModeEnabled,
      bhOnboardingComplete: bhOnboardingComplete ?? this.bhOnboardingComplete,
      businessVerticalId: businessVerticalId ?? this.businessVerticalId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
