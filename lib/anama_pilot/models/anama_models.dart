class FutureInsight {
  final String id;
  final String category;
  final String source;
  final String title;
  final String scientificFact;
  final String audienceText;
  final String learnMoreUrl;
  final List<String> ageBands;

  const FutureInsight({
    required this.id,
    required this.category,
    required this.source,
    required this.title,
    required this.scientificFact,
    required this.audienceText,
    required this.learnMoreUrl,
    required this.ageBands,
  });

  factory FutureInsight.fromJson(Map<String, dynamic> j) {
    return FutureInsight(
      id: j['id'] as String,
      category: j['category'] as String? ?? '',
      source: j['source'] as String? ?? '',
      title: j['title'] as String? ?? '',
      scientificFact: j['scientificFact'] as String? ?? '',
      audienceText: j['audienceText'] as String? ?? '',
      learnMoreUrl: j['learnMoreUrl'] as String? ?? '',
      ageBands: (j['ageBands'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
    );
  }
}
