import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../constants/app_constants.dart';
import '../../models/vacancy.dart';
import '../../providers/vacancy_providers.dart';
import '../../l10n/app_localizations.dart';

class IntentSelectionScreen extends ConsumerWidget {
  const IntentSelectionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppConstants.spacingLG),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppConstants.spacingXL),
              Text(
                l10n.whatDoYouWant,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppConstants.textPrimary,
                    ),
              ),
              const SizedBox(height: AppConstants.spacingSM),
              Text(
                l10n.selectNextIncomeStep,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppConstants.textSecondary,
                    ),
              ),
              const SizedBox(height: AppConstants.spacingXL),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: AppConstants.spacingMD,
                mainAxisSpacing: AppConstants.spacingMD,
                childAspectRatio: 0.75, // Увеличиваем высоту карточек
                children: UserIntent.values.map((intent) {
                  return _IntentCard(
                    intent: intent,
                    l10n: l10n,
                    onTap: () {
                      ref.read(selectedIntentProvider.notifier).state = intent;
                      ref.read(vacancyFilterProvider.notifier).setIntent(intent);
                      Navigator.of(context).pop();
                    },
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _IntentCard extends StatelessWidget {
  final UserIntent intent;
  final VoidCallback onTap;
  final AppLocalizations l10n;

  const _IntentCard({
    required this.intent,
    required this.onTap,
    required this.l10n,
  });

  Color _getColor() {
    switch (intent) {
      case UserIntent.moreIncome:
        return const Color(0xFF10B981); // Зелёный
      case UserIntent.stability:
        return const Color(0xFF3B82F6); // Синий
      case UserIntent.sideJob:
        return const Color(0xFF8B5CF6); // Фиолетовый
      case UserIntent.growth:
        return const Color(0xFFEC4899); // Розовый
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              _getColor(),
              _getColor().withOpacity(0.8),
            ],
          ),
          borderRadius: BorderRadius.circular(AppConstants.radiusXL),
          boxShadow: [
            BoxShadow(
              color: _getColor().withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppConstants.spacingLG),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                intent.icon,
                style: const TextStyle(fontSize: 48),
              ),
              const SizedBox(height: AppConstants.spacingMD),
              Text(
                intent.getTitle(l10n),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  shadows: [
                    Shadow(
                      color: Colors.black26,
                      offset: Offset(0, 1),
                      blurRadius: 2,
                    ),
                  ],
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppConstants.spacingSM),
              Flexible(
                child: Text(
                  intent.getDescription(l10n),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    height: 1.4,
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 3,
                  overflow: TextOverflow.visible,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

