import 'package:cloud_firestore/cloud_firestore.dart';

/// Воронка: набор стадий совпадает с BHDealStage (ключи Firestore).
///
/// Шаблонные поля ([scenario], [defaultTitlePrefix], [defaultNotesTemplate],
/// [defaultDealType], [contextDefaults]) задаются один раз владельцем воронки
/// и автоматически подставляются в каждую новую сделку.
class BHCrmPipeline {
  final String id;
  final String organizationId;
  final String name;
  final List<String> stageKeys;
  final DateTime createdAt;
  final DateTime updatedAt;

  /// Отраслевой сценарий: generic, restaurant, advertising, …
  final String scenario;

  /// Префикс, автоматически добавляемый к названию новой сделки.
  final String? defaultTitlePrefix;

  /// Многострочный шаблон заметок для новой сделки.
  final String? defaultNotesTemplate;

  /// Тип сделки по умолчанию (ключ [BHDealType.firestoreValue]).
  final String? defaultDealType;

  /// Произвольные ключи/значения, копируемые в [BHDeal.saleContext] при создании.
  final Map<String, dynamic> contextDefaults;

  const BHCrmPipeline({
    required this.id,
    required this.organizationId,
    required this.name,
    required this.stageKeys,
    required this.createdAt,
    required this.updatedAt,
    this.scenario = 'generic',
    this.defaultTitlePrefix,
    this.defaultNotesTemplate,
    this.defaultDealType,
    this.contextDefaults = const {},
  });

  static List<String> defaultStageKeys() =>
      ['new_', 'qualification', 'proposal', 'negotiation', 'won', 'lost'];

  static const knownScenarios = <String, String>{
    'generic': 'Универсальная',
    'restaurant': 'Ресторан / банкет',
    'advertising': 'Реклама',
    'beauty': 'Салон красоты',
    'education': 'Обучение / курсы',
    'realestate': 'Недвижимость',
    'auto': 'Авто / сервис',
  };

  String get scenarioLabel => knownScenarios[scenario] ?? scenario;

  Map<String, dynamic> toMap() => {
        'id': id,
        'organizationId': organizationId,
        'name': name,
        'stageKeys': stageKeys,
        'createdAt': Timestamp.fromDate(createdAt),
        'updatedAt': Timestamp.fromDate(updatedAt),
        'scenario': scenario,
        if (defaultTitlePrefix != null) 'defaultTitlePrefix': defaultTitlePrefix,
        if (defaultNotesTemplate != null) 'defaultNotesTemplate': defaultNotesTemplate,
        if (defaultDealType != null) 'defaultDealType': defaultDealType,
        if (contextDefaults.isNotEmpty) 'contextDefaults': contextDefaults,
      };

  factory BHCrmPipeline.fromMap(Map<String, dynamic> map) {
    final keys = map['stageKeys'];
    return BHCrmPipeline(
      id: map['id'] ?? '',
      organizationId: map['organizationId'] ?? '',
      name: map['name'] ?? '',
      stageKeys: keys is List
          ? keys.map((e) => e.toString()).toList()
          : defaultStageKeys(),
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      scenario: (map['scenario'] as String?) ?? 'generic',
      defaultTitlePrefix: map['defaultTitlePrefix'] as String?,
      defaultNotesTemplate: map['defaultNotesTemplate'] as String?,
      defaultDealType: map['defaultDealType'] as String?,
      contextDefaults: map['contextDefaults'] is Map
          ? Map<String, dynamic>.from(map['contextDefaults'] as Map)
          : const {},
    );
  }

  BHCrmPipeline copyWith({
    String? id,
    String? organizationId,
    String? name,
    List<String>? stageKeys,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? scenario,
    String? defaultTitlePrefix,
    bool clearDefaultTitlePrefix = false,
    String? defaultNotesTemplate,
    bool clearDefaultNotesTemplate = false,
    String? defaultDealType,
    bool clearDefaultDealType = false,
    Map<String, dynamic>? contextDefaults,
  }) {
    return BHCrmPipeline(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      name: name ?? this.name,
      stageKeys: stageKeys ?? this.stageKeys,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      scenario: scenario ?? this.scenario,
      defaultTitlePrefix: clearDefaultTitlePrefix ? null : (defaultTitlePrefix ?? this.defaultTitlePrefix),
      defaultNotesTemplate: clearDefaultNotesTemplate ? null : (defaultNotesTemplate ?? this.defaultNotesTemplate),
      defaultDealType: clearDefaultDealType ? null : (defaultDealType ?? this.defaultDealType),
      contextDefaults: contextDefaults ?? this.contextDefaults,
    );
  }
}
