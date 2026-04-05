import 'package:cloud_firestore/cloud_firestore.dart';

enum BHDealStage {
  new_,
  qualification,
  proposal,
  negotiation,
  won,
  lost,
}

extension BHDealStageX on BHDealStage {
  String get label {
    switch (this) {
      case BHDealStage.new_:
        return 'Новая';
      case BHDealStage.qualification:
        return 'Квалификация';
      case BHDealStage.proposal:
        return 'Предложение';
      case BHDealStage.negotiation:
        return 'Переговоры';
      case BHDealStage.won:
        return 'Выиграна';
      case BHDealStage.lost:
        return 'Проиграна';
    }
  }

  String get firestoreValue => name;

  int get order => index;

  bool get isClosed => this == BHDealStage.won || this == BHDealStage.lost;
}

/// Приоритет сделки (enterprise CRM)
enum BHDealPriority { low, medium, high, urgent }

extension BHDealPriorityX on BHDealPriority {
  String get label {
    switch (this) {
      case BHDealPriority.low:
        return 'Низкий';
      case BHDealPriority.medium:
        return 'Средний';
      case BHDealPriority.high:
        return 'Высокий';
      case BHDealPriority.urgent:
        return 'Срочно';
    }
  }

  String get firestoreValue => name;
}

/// Тип сделки
enum BHDealType { new_, repeat, subscription, partnership, advertising }

extension BHDealTypeX on BHDealType {
  String get label {
    switch (this) {
      case BHDealType.new_:
        return 'Новая продажа';
      case BHDealType.repeat:
        return 'Повторная';
      case BHDealType.subscription:
        return 'Подписка';
      case BHDealType.partnership:
        return 'Партнёрство';
      case BHDealType.advertising:
        return 'Реклама';
    }
  }

  String get firestoreValue => name;
}

/// Причина проигрыша
enum BHLostReason { tooExpensive, noBudget, competitor, noResponse, notRelevant, other }

extension BHLostReasonX on BHLostReason {
  String get label {
    switch (this) {
      case BHLostReason.tooExpensive:
        return 'Дорого';
      case BHLostReason.noBudget:
        return 'Нет бюджета';
      case BHLostReason.competitor:
        return 'Конкурент';
      case BHLostReason.noResponse:
        return 'Не отвечает';
      case BHLostReason.notRelevant:
        return 'Не актуально';
      case BHLostReason.other:
        return 'Другое';
    }
  }

  String get firestoreValue => name;
}

class BHDeal {
  final String id;
  final String organizationId;
  final String title;
  final double amount;
  final String currency;
  final BHDealStage stage;
  final String? counterpartyId;
  final String? counterpartyName;
  final String? leadId;
  /// Ответственный (owner / менеджер)
  final String? assignedTo;
  final DateTime? expectedCloseDate;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  /// Следующее действие
  final String? nextAction;
  final DateTime? nextActionDate;
  final bool nextActionDone;

  final BHDealPriority priority;
  final BHDealType dealType;
  /// Вероятность закрытия, 0–100
  final int probability;
  final BHLostReason? lostReason;

  /// Связи CRM / BH
  final String? pipelineId;
  final String? companyId;
  final String? contactId;
  final String? operationId;
  final String? workId;
  final String? subscriptionId;

  /// Контекст продажи, скопированный из шаблона воронки при создании сделки.
  final Map<String, dynamic>? saleContext;

  const BHDeal({
    required this.id,
    required this.organizationId,
    required this.title,
    this.amount = 0,
    this.currency = 'UZS',
    this.stage = BHDealStage.new_,
    this.counterpartyId,
    this.counterpartyName,
    this.leadId,
    this.assignedTo,
    this.expectedCloseDate,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
    this.nextAction,
    this.nextActionDate,
    this.nextActionDone = false,
    this.priority = BHDealPriority.medium,
    this.dealType = BHDealType.new_,
    this.probability = 0,
    this.lostReason,
    this.pipelineId,
    this.companyId,
    this.contactId,
    this.operationId,
    this.workId,
    this.subscriptionId,
    this.saleContext,
  });

  /// Просрочено следующее действие
  bool get isNextActionOverdue {
    if (nextActionDone || nextActionDate == null || stage.isClosed) return false;
    return nextActionDate!.isBefore(DateTime.now());
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'organizationId': organizationId,
      'title': title,
      'amount': amount,
      'currency': currency,
      'stage': stage.firestoreValue,
      'counterpartyId': counterpartyId,
      'counterpartyName': counterpartyName,
      'leadId': leadId,
      'assignedTo': assignedTo,
      'expectedCloseDate': expectedCloseDate != null ? Timestamp.fromDate(expectedCloseDate!) : null,
      'notes': notes,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
      'nextAction': nextAction,
      'nextActionDate': nextActionDate != null ? Timestamp.fromDate(nextActionDate!) : null,
      'nextActionDone': nextActionDone,
      'priority': priority.firestoreValue,
      'dealType': dealType.firestoreValue,
      'probability': probability,
      'lostReason': lostReason?.firestoreValue,
      'pipelineId': pipelineId,
      'companyId': companyId,
      'contactId': contactId,
      'operationId': operationId,
      'workId': workId,
      'subscriptionId': subscriptionId,
      if (saleContext != null) 'saleContext': saleContext,
    };
  }

  static BHDealPriority _parsePriority(dynamic v) {
    if (v == null) return BHDealPriority.medium;
    return BHDealPriority.values.firstWhere(
      (e) => e.name == v || e.firestoreValue == v,
      orElse: () => BHDealPriority.medium,
    );
  }

  static BHDealType _parseDealType(dynamic v) {
    if (v == null) return BHDealType.new_;
    return BHDealType.values.firstWhere(
      (e) => e.name == v || e.firestoreValue == v,
      orElse: () => BHDealType.new_,
    );
  }

  static BHLostReason? _parseLostReason(dynamic v) {
    if (v == null) return null;
    for (final e in BHLostReason.values) {
      if (e.name == v || e.firestoreValue == v) return e;
    }
    return null;
  }

  factory BHDeal.fromMap(Map<String, dynamic> map) {
    return BHDeal(
      id: map['id'] ?? '',
      organizationId: map['organizationId'] ?? '',
      title: map['title'] ?? '',
      amount: (map['amount'] as num?)?.toDouble() ?? 0,
      currency: map['currency'] ?? 'UZS',
      stage: BHDealStage.values.firstWhere(
        (e) => e.name == map['stage'],
        orElse: () => BHDealStage.new_,
      ),
      counterpartyId: map['counterpartyId'],
      counterpartyName: map['counterpartyName'],
      leadId: map['leadId'],
      assignedTo: map['assignedTo'],
      expectedCloseDate: (map['expectedCloseDate'] as Timestamp?)?.toDate(),
      notes: map['notes'],
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      nextAction: map['nextAction'],
      nextActionDate: (map['nextActionDate'] as Timestamp?)?.toDate(),
      nextActionDone: map['nextActionDone'] == true,
      priority: _parsePriority(map['priority']),
      dealType: _parseDealType(map['dealType']),
      probability: ((map['probability'] as num?)?.round() ?? 0).clamp(0, 100),
      lostReason: _parseLostReason(map['lostReason']),
      pipelineId: map['pipelineId'],
      companyId: map['companyId'],
      contactId: map['contactId'],
      operationId: map['operationId'],
      workId: map['workId'],
      subscriptionId: map['subscriptionId'],
      saleContext: map['saleContext'] is Map
          ? Map<String, dynamic>.from(map['saleContext'] as Map)
          : null,
    );
  }

  BHDeal copyWith({
    String? id,
    String? organizationId,
    String? title,
    double? amount,
    String? currency,
    BHDealStage? stage,
    String? counterpartyId,
    String? counterpartyName,
    String? leadId,
    String? assignedTo,
    DateTime? expectedCloseDate,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? nextAction,
    DateTime? nextActionDate,
    bool? nextActionDone,
    BHDealPriority? priority,
    BHDealType? dealType,
    int? probability,
    BHLostReason? lostReason,
    bool clearLostReason = false,
    String? pipelineId,
    String? companyId,
    String? contactId,
    String? operationId,
    String? workId,
    String? subscriptionId,
    bool clearNextActionDate = false,
    bool clearOperationId = false,
    bool clearWorkId = false,
    bool clearSubscriptionId = false,
    Map<String, dynamic>? saleContext,
    bool clearSaleContext = false,
  }) {
    return BHDeal(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      title: title ?? this.title,
      amount: amount ?? this.amount,
      currency: currency ?? this.currency,
      stage: stage ?? this.stage,
      counterpartyId: counterpartyId ?? this.counterpartyId,
      counterpartyName: counterpartyName ?? this.counterpartyName,
      leadId: leadId ?? this.leadId,
      assignedTo: assignedTo ?? this.assignedTo,
      expectedCloseDate: expectedCloseDate ?? this.expectedCloseDate,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      nextAction: nextAction ?? this.nextAction,
      nextActionDate: clearNextActionDate ? null : (nextActionDate ?? this.nextActionDate),
      nextActionDone: nextActionDone ?? this.nextActionDone,
      priority: priority ?? this.priority,
      dealType: dealType ?? this.dealType,
      probability: probability ?? this.probability,
      lostReason: clearLostReason ? null : (lostReason ?? this.lostReason),
      pipelineId: pipelineId ?? this.pipelineId,
      companyId: companyId ?? this.companyId,
      contactId: contactId ?? this.contactId,
      operationId: clearOperationId ? null : (operationId ?? this.operationId),
      workId: clearWorkId ? null : (workId ?? this.workId),
      subscriptionId: clearSubscriptionId ? null : (subscriptionId ?? this.subscriptionId),
      saleContext: clearSaleContext ? null : (saleContext ?? this.saleContext),
    );
  }
}
