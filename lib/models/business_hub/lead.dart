import 'package:cloud_firestore/cloud_firestore.dart';

enum BHLeadStatus { new_, contacted, qualified, proposal, negotiation, won, lost }

enum BHLeadSource { website, referral, coldCall, social, other }

extension BHLeadStatusX on BHLeadStatus {
  String get label {
    switch (this) {
      case BHLeadStatus.new_:
        return 'Новый';
      case BHLeadStatus.contacted:
        return 'Связались';
      case BHLeadStatus.qualified:
        return 'Квалифицирован';
      case BHLeadStatus.proposal:
        return 'Предложение';
      case BHLeadStatus.negotiation:
        return 'Переговоры';
      case BHLeadStatus.won:
        return 'Выигран';
      case BHLeadStatus.lost:
        return 'Проигран';
    }
  }

  String get firestoreValue => name;
}

extension BHLeadSourceX on BHLeadSource {
  String get label {
    switch (this) {
      case BHLeadSource.website:
        return 'Сайт';
      case BHLeadSource.referral:
        return 'Рекомендация';
      case BHLeadSource.coldCall:
        return 'Холодный звонок';
      case BHLeadSource.social:
        return 'Соцсети';
      case BHLeadSource.other:
        return 'Другое';
    }
  }

  String get firestoreValue => name;
}

class BHLead {
  final String id;
  final String organizationId;
  final String name;
  final String? phone;
  final String? email;
  final String? company;
  final BHLeadStatus status;
  final BHLeadSource source;
  final String? notes;
  final String? assignedTo;
  final String? campaign;
  final String? utmSource;
  final String? utmMedium;
  final String? utmCampaign;
  final String? contactId;
  final String? companyId;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BHLead({
    required this.id,
    required this.organizationId,
    required this.name,
    this.phone,
    this.email,
    this.company,
    this.status = BHLeadStatus.new_,
    this.source = BHLeadSource.other,
    this.notes,
    this.assignedTo,
    this.campaign,
    this.utmSource,
    this.utmMedium,
    this.utmCampaign,
    this.contactId,
    this.companyId,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'organizationId': organizationId,
      'name': name,
      'phone': phone,
      'email': email,
      'company': company,
      'status': status.firestoreValue,
      'source': source.firestoreValue,
      'notes': notes,
      'assignedTo': assignedTo,
      'campaign': campaign,
      'utmSource': utmSource,
      'utmMedium': utmMedium,
      'utmCampaign': utmCampaign,
      'contactId': contactId,
      'companyId': companyId,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  factory BHLead.fromMap(Map<String, dynamic> map) {
    return BHLead(
      id: map['id'] ?? '',
      organizationId: map['organizationId'] ?? '',
      name: map['name'] ?? '',
      phone: map['phone'],
      email: map['email'],
      company: map['company'],
      status: BHLeadStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => BHLeadStatus.new_,
      ),
      source: BHLeadSource.values.firstWhere(
        (e) => e.name == map['source'],
        orElse: () => BHLeadSource.other,
      ),
      notes: map['notes'],
      assignedTo: map['assignedTo'],
      campaign: map['campaign'],
      utmSource: map['utmSource'],
      utmMedium: map['utmMedium'],
      utmCampaign: map['utmCampaign'],
      contactId: map['contactId'],
      companyId: map['companyId'],
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  BHLead copyWith({
    String? id,
    String? organizationId,
    String? name,
    String? phone,
    String? email,
    String? company,
    BHLeadStatus? status,
    BHLeadSource? source,
    String? notes,
    String? assignedTo,
    String? campaign,
    String? utmSource,
    String? utmMedium,
    String? utmCampaign,
    String? contactId,
    String? companyId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return BHLead(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      company: company ?? this.company,
      status: status ?? this.status,
      source: source ?? this.source,
      notes: notes ?? this.notes,
      assignedTo: assignedTo ?? this.assignedTo,
      campaign: campaign ?? this.campaign,
      utmSource: utmSource ?? this.utmSource,
      utmMedium: utmMedium ?? this.utmMedium,
      utmCampaign: utmCampaign ?? this.utmCampaign,
      contactId: contactId ?? this.contactId,
      companyId: companyId ?? this.companyId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
