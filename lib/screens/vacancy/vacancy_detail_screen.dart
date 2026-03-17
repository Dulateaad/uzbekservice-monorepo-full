import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../models/vacancy.dart';
import '../../providers/vacancy_providers.dart';
import '../../providers/firestore_auth_provider.dart';

class VacancyDetailScreen extends ConsumerStatefulWidget {
  final String vacancyId;

  const VacancyDetailScreen({
    super.key,
    required this.vacancyId,
  });

  @override
  ConsumerState<VacancyDetailScreen> createState() => _VacancyDetailScreenState();
}

class _VacancyDetailScreenState extends ConsumerState<VacancyDetailScreen> {
  Vacancy? _vacancy;
  bool _isLoading = true;
  bool _isApplying = false;

  @override
  void initState() {
    super.initState();
    _loadVacancy();
  }

  Future<void> _loadVacancy() async {
    final service = ref.read(vacancyServiceProvider);
    final vacancy = await service.getVacancyById(widget.vacancyId);
    setState(() {
      _vacancy = vacancy;
      _isLoading = false;
    });
  }

  Future<void> _applyToVacancy() async {
    if (_vacancy == null) return;

    setState(() {
      _isApplying = true;
    });

    final service = ref.read(vacancyServiceProvider);
    final authState = ref.read(firestoreAuthProvider);
    final user = authState.user;

    if (user == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Необходимо войти в систему'),
            backgroundColor: Colors.red,
          ),
        );
        context.go('/auth/phone');
      }
      setState(() {
        _isApplying = false;
      });
      return;
    }

    // Проверяем, что пользователь не компания
    if (user.userType == 'company') {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Компании не могут подавать на вакансии'),
            backgroundColor: Colors.red,
          ),
        );
      }
      setState(() {
        _isApplying = false;
      });
      return;
    }

    final success = await service.applyToVacancy(
      _vacancy!.id,
      user.id,
      userName: user.name,
      userPhone: user.phoneNumber,
      userEmail: user.email,
      userType: user.userType,
    );

    setState(() {
      _isApplying = false;
    });

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Отклик отправлен!'),
            backgroundColor: Colors.green,
          ),
        );
        // Обновляем список вакансий
        ref.invalidate(allVacanciesProvider);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Ошибка при отправке отклика'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Color _getIntentColor() {
    if (_vacancy?.intent == null) return AppConstants.primaryColor;
    switch (_vacancy!.intent!) {
      case UserIntent.moreIncome:
        return const Color(0xFF10B981);
      case UserIntent.stability:
        return const Color(0xFF3B82F6);
      case UserIntent.sideJob:
        return const Color(0xFF8B5CF6);
      case UserIntent.growth:
        return const Color(0xFFEC4899);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Вакансия'),
          backgroundColor: AppConstants.primaryColor,
          foregroundColor: Colors.white,
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_vacancy == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Вакансия'),
          backgroundColor: AppConstants.primaryColor,
          foregroundColor: Colors.white,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                size: 64,
                color: AppConstants.textSecondary,
              ),
              const SizedBox(height: AppConstants.spacingMD),
              const Text('Вакансия не найдена'),
              const SizedBox(height: AppConstants.spacingMD),
              ElevatedButton(
                onPressed: () => context.pop(),
                child: const Text('Назад'),
              ),
            ],
          ),
        ),
      );
    }

    final vacancy = _vacancy!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Вакансия'),
        backgroundColor: AppConstants.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppConstants.spacingLG),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    _getIntentColor(),
                    _getIntentColor().withOpacity(0.8),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (vacancy.isHot || vacancy.isUrgent)
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
                            child: const Text(
                              '🔥 Горячая',
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
                            child: const Text(
                              '⚡ Срочно',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                      ],
                    ),
                  if (vacancy.isHot || vacancy.isUrgent)
                    const SizedBox(height: AppConstants.spacingMD),
                  Text(
                    vacancy.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: AppConstants.spacingSM),
                  Text(
                    vacancy.company,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.9),
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppConstants.spacingMD),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppConstants.spacingMD,
                      vertical: AppConstants.spacingSM,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                    ),
                    child: Text(
                      '${(vacancy.salary / 1000000).toStringAsFixed(1)} млн сум',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(AppConstants.spacingLG),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Quick info
                  _InfoRow(
                    icon: Icons.schedule,
                    label: 'График',
                    value: vacancy.schedule,
                  ),
                  const SizedBox(height: AppConstants.spacingMD),
                  _InfoRow(
                    icon: Icons.location_on,
                    label: 'Локация',
                    value: vacancy.location,
                  ),
                  if (vacancy.distance != null) ...[
                    const SizedBox(height: AppConstants.spacingMD),
                    _InfoRow(
                      icon: Icons.near_me,
                      label: 'Расстояние',
                      value: vacancy.distance!,
                    ),
                  ],
                  if (vacancy.employerRating != null) ...[
                    const SizedBox(height: AppConstants.spacingMD),
                    _InfoRow(
                      icon: Icons.star,
                      label: 'Рейтинг работодателя',
                      value: '${vacancy.employerRating}',
                    ),
                  ],
                  if (vacancy.compatibilityScore != null) ...[
                    const SizedBox(height: AppConstants.spacingLG),
                    Container(
                      padding: const EdgeInsets.all(AppConstants.spacingMD),
                      decoration: BoxDecoration(
                        color: _getIntentColor().withOpacity(0.1),
                        borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                        border: Border.all(
                          color: _getIntentColor(),
                          width: 2,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.check_circle,
                                color: _getIntentColor(),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Совместимость: ${vacancy.compatibilityScore!.toInt()}%',
                                style: TextStyle(
                                  color: _getIntentColor(),
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          if (vacancy.compatibilityReasons != null &&
                              vacancy.compatibilityReasons!.isNotEmpty) ...[
                            const SizedBox(height: AppConstants.spacingSM),
                            ...vacancy.compatibilityReasons!.map((reason) {
                              return Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.check,
                                      size: 16,
                                      color: _getIntentColor(),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        reason,
                                        style: TextStyle(
                                          color: _getIntentColor().withOpacity(0.8),
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: AppConstants.spacingLG),
                  // Description
                  Text(
                    'Описание',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: AppConstants.spacingSM),
                  Text(
                    vacancy.description,
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: AppConstants.spacingLG),
                  // Requirements
                  Text(
                    'Требования',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: AppConstants.spacingSM),
                  ...vacancy.requirements.map((req) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppConstants.spacingSM),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.check_circle_outline,
                            size: 20,
                            color: AppConstants.primaryColor,
                          ),
                          const SizedBox(width: AppConstants.spacingSM),
                          Expanded(
                            child: Text(
                              req,
                              style: Theme.of(context).textTheme.bodyLarge,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(AppConstants.spacingMD),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isApplying ? null : _applyToVacancy,
              style: ElevatedButton.styleFrom(
                backgroundColor: _getIntentColor(),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                ),
              ),
              child: _isApplying
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text(
                      'Откликнуться',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          icon,
          size: 20,
          color: AppConstants.textSecondary,
        ),
        const SizedBox(width: AppConstants.spacingSM),
        Text(
          '$label: ',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppConstants.textSecondary,
              ),
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }
}

