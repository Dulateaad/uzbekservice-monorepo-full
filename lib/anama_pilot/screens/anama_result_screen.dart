import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/anama_models.dart';
import '../services/future_insights_repository.dart';

class AnamaResultScreen extends ConsumerWidget {
  const AnamaResultScreen({super.key, required this.mergeResult});

  final Map<String, dynamic> mergeResult;

  static Future<void> _open(String url) async {
    final u = Uri.parse(url);
    if (await canLaunchUrl(u)) {
      await launchUrl(u, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rmssd = mergeResult['rmssd'];
    final stress = mergeResult['stressStatus']?.toString() ?? 'unknown';
    final insightId = mergeResult['insightId']?.toString() ?? 'stress_resilience';
    final recommendation = mergeResult['recommendationRu']?.toString() ?? '';
    final ageBand = mergeResult['ageBand']?.toString() ?? 'teen_school';
    final source = mergeResult['recommendationSource']?.toString() ?? 'template';
    final aiPowered = source == 'gemini';

    return Scaffold(
      appBar: AppBar(title: const Text('Итог пилота')),
      body: FutureBuilder<FutureInsight?>(
        future: FutureInsightsRepository.pickForBand(ageBand, insightId),
        builder: (context, snap) {
          final insight = snap.data;
          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Text(
                'Ориентировочный статус (не диагноз): $stress',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text('RMSSD (сервер): ${rmssd ?? "—"}'),
              if (aiPowered)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Chip(
                    avatar: Icon(
                      Icons.auto_awesome,
                      size: 18,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    label: const Text(
                      'Рекомендации дополнены языковой моделью (Gemini)',
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              if (recommendation.isNotEmpty)
                Text(recommendation),
              const SizedBox(height: 24),
              if (insight != null) ...[
                Text(
                  insight.title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text('Источник: ${insight.source}'),
                const SizedBox(height: 12),
                Text(
                  'Научный факт',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                Text(insight.scientificFact),
                const SizedBox(height: 12),
                Text(
                  'Для вас',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                Text(insight.audienceText),
                const SizedBox(height: 16),
                InkWell(
                  onTap: () => _open(insight.learnMoreUrl),
                  child: Text(
                    'Подробнее по теме инсайта',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Learn more:',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 4,
                  runSpacing: 2,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    InkWell(
                      onTap: () => _open('https://developingchild.harvard.edu/'),
                      child: Text(
                        'Harvard standards',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          decoration: TextDecoration.underline,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    Text('&', style: Theme.of(context).textTheme.bodySmall),
                    InkWell(
                      onTap: () => _open('https://www.uptodate.com/'),
                      child: Text(
                        'UpToDate standards',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          decoration: TextDecoration.underline,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 32),
              OutlinedButton(
                onPressed: () => context.go('/pilot'),
                child: const Text('На главную пилота'),
              ),
            ],
          );
        },
      ),
    );
  }
}
