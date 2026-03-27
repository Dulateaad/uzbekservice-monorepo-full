import 'package:cloud_firestore/cloud_firestore.dart';

enum BHMemberRole {
  owner,
  admin,
  accountant,
  viewer,
}

extension BHMemberRoleX on BHMemberRole {
  String get label {
    switch (this) {
      case BHMemberRole.owner:
        return 'Владелец';
      case BHMemberRole.admin:
        return 'Администратор';
      case BHMemberRole.accountant:
        return 'Бухгалтер';
      case BHMemberRole.viewer:
        return 'Наблюдатель';
    }
  }

  String get firestoreValue => name;

  bool get canEditOperations =>
      this == BHMemberRole.owner || this == BHMemberRole.admin || this == BHMemberRole.accountant;

  bool get canManageMembers =>
      this == BHMemberRole.owner || this == BHMemberRole.admin;

  bool get canViewReports =>
      this == BHMemberRole.owner ||
      this == BHMemberRole.admin ||
      this == BHMemberRole.accountant ||
      this == BHMemberRole.viewer;
}

class BHOrganizationMember {
  final String id;
  final String organizationId;
  final String userId;
  final String? userEmail;
  final String? userName;
  final BHMemberRole role;
  final String? managerId; // ID руководителя (для иерархии)
  final DateTime createdAt;
  final DateTime updatedAt;

  const BHOrganizationMember({
    required this.id,
    required this.organizationId,
    required this.userId,
    this.userEmail,
    this.userName,
    required this.role,
    this.managerId,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'organizationId': organizationId,
      'userId': userId,
      'userEmail': userEmail,
      'userName': userName,
      'role': role.firestoreValue,
      'managerId': managerId,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  factory BHOrganizationMember.fromMap(Map<String, dynamic> map) {
    return BHOrganizationMember(
      id: map['id'] ?? '',
      organizationId: map['organizationId'] ?? '',
      userId: map['userId'] ?? '',
      userEmail: map['userEmail'],
      userName: map['userName'],
      role: BHMemberRole.values.firstWhere(
        (e) => e.name == map['role'],
        orElse: () => BHMemberRole.viewer,
      ),
      managerId: map['managerId'],
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  BHOrganizationMember copyWith({
    String? id,
    String? organizationId,
    String? userId,
    String? userEmail,
    String? userName,
    BHMemberRole? role,
    String? managerId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return BHOrganizationMember(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      userId: userId ?? this.userId,
      userEmail: userEmail ?? this.userEmail,
      userName: userName ?? this.userName,
      role: role ?? this.role,
      managerId: managerId ?? this.managerId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
