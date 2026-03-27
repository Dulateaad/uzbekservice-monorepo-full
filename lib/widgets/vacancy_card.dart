import 'package:flutter/material.dart';
import '../constants/app_constants.dart';
import '../models/vacancy.dart';
import '../l10n/app_localizations.dart';

class VacancyCard extends StatelessWidget {
  final Vacancy vacancy;
  final VoidCallback? onTap;

  const VacancyCard({
    super.key,
    required this.vacancy,
    this.onTap,
  });

  Color _getIntentColor() {
    switch (vacancy.intent) {
      case UserIntent.moreIncome:
        return const Color(0xFF10B981);
      case UserIntent.stability:
        return const Color(0xFF3B82F6);
      case UserIntent.sideJob:
        return const Color(0xFF8B5CF6);
      case UserIntent.growth:
        return const Color(0xFFEC4899);
      case null:
        return AppConstants.primaryColor;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Card(
      margin: const EdgeInsets.only(bottom: AppConstants.spacingMD),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppConstants.radiusLG),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppConstants.radiusLG),
        child: Padding(
          padding: const EdgeInsets.all(AppConstants.spacingMD),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with hot/urgent badges
              Row(
                children: [
                  if (vacancy.isHot)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '🔥 ${l10n.hotVacancy}',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  if (vacancy.isHot && vacancy.isUrgent)
                    const SizedBox(width: 8),
                  if (vacancy.isUrgent)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.orange,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '⚡ ${l10n.urgentVacancy}',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  const Spacer(),
                  if (vacancy.compatibilityScore != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: _getIntentColor().withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _getIntentColor(),
                          width: 1.5,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${vacancy.compatibilityScore!.toInt()}%',
                            style: TextStyle(
                              color: _getIntentColor(),
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.check_circle,
                            color: _getIntentColor(),
                            size: 16,
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              const SizedBox(height: AppConstants.spacingMD),
              // Title
              Text(
                vacancy.title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppConstants.textPrimary,
                    ),
              ),
              const SizedBox(height: 4),
              // Company
              Text(
                vacancy.company,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppConstants.textSecondary,
                    ),
              ),
              const SizedBox(height: AppConstants.spacingMD),
              // Salary
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppConstants.spacingMD,
                  vertical: AppConstants.spacingSM,
                ),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      _getIntentColor(),
                      _getIntentColor().withOpacity(0.8),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                ),
                child: Text(
                  '${(vacancy.salary / 1000000).toStringAsFixed(1)} млн сум',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: AppConstants.spacingMD),
              // Quick info
              Wrap(
                spacing: AppConstants.spacingMD,
                runSpacing: AppConstants.spacingSM,
                children: [
                  _QuickInfoItem(
                    icon: Icons.schedule,
                    text: vacancy.schedule,
                  ),
                  if (vacancy.location != l10n.remote)
                    _QuickInfoItem(
                      icon: Icons.location_on,
                      text: vacancy.location,
                    ),
                  if (vacancy.distance != null)
                    _QuickInfoItem(
                      icon: Icons.near_me,
                      text: vacancy.distance!,
                    ),
                  if (vacancy.employerRating != null)
                    _QuickInfoItem(
                      icon: Icons.star,
                      text: '${vacancy.employerRating}',
                    ),
                ],
              ),
              const SizedBox(height: AppConstants.spacingMD),
              // Requirements preview
              if (vacancy.requirements.isNotEmpty)
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: vacancy.requirements.take(3).map((req) {
                    return Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppConstants.backgroundColor,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: AppConstants.borderColor,
                        ),
                      ),
                      child: Text(
                        req,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppConstants.textSecondary,
                        ),
                      ),
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

class _QuickInfoItem extends StatelessWidget {
  final IconData icon;
  final String text;

  const _QuickInfoItem({
    required this.icon,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 16,
          color: AppConstants.textSecondary,
        ),
        const SizedBox(width: 4),
        Text(
          text,
          style: const TextStyle(
            fontSize: 13,
            color: AppConstants.textSecondary,
          ),
        ),
      ],
    );
  }
}

