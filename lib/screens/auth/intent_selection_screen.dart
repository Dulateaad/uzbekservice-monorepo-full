import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../models/user_intent.dart';
import '../../widgets/odo_logo.dart';

/// Экран выбора intent (цели) - первый экран при открытии приложения
/// Заменяет выбор роли - роль определяется автоматически по intent
class IntentSelectionScreen extends StatefulWidget {
  const IntentSelectionScreen({super.key});

  @override
  State<IntentSelectionScreen> createState() => _IntentSelectionScreenState();
}

class _IntentSelectionScreenState extends State<IntentSelectionScreen> {
  void _selectIntent(UserIntent intent) {
    // Переходим к регистрации с выбранным intent
    context.go(
      '/auth/phone',
      extra: {
        'intent': intent.id,
        'role': intent.role,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppConstants.spacingLG),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppConstants.spacingXXL),
              
              // Логотип
              const Center(
                child: OdoLogo(),
              ),

              const SizedBox(height: AppConstants.spacingXXL),

              // Заголовок
              Text(
                'Что вы хотите сделать сейчас?',
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppConstants.textPrimary,
                    ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: AppConstants.spacingSM),

              // Подзаголовок
              Text(
                'Мы настроим ODO под вашу цель',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppConstants.textSecondary,
                    ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: AppConstants.spacingXXL),

              // Кнопки intent
              ...UserIntent.values.map((intent) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppConstants.spacingMD),
                  child: _IntentCard(
                    intent: intent,
                    onTap: () => _selectIntent(intent),
                  ),
                );
              }),
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

  const _IntentCard({
    required this.intent,
    required this.onTap,
  });

  Color _getColor() {
    switch (intent) {
      case UserIntent.findSpecialist:
        return const Color(0xFFEC4899); // Розовый - для клиентов
      case UserIntent.findJob:
        return const Color(0xFF3B82F6); // Синий
      case UserIntent.offerServices:
        return const Color(0xFF10B981); // Зелёный
      case UserIntent.postVacancy:
        return const Color(0xFF8B5CF6); // Фиолетовый
      case UserIntent.manageBusiness:
        return const Color(0xFFF59E0B); // Оранжевый
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getColor();

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppConstants.spacingLG),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppConstants.radiusXL),
          border: Border.all(
            color: color.withOpacity(0.3),
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.1),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            // Иконка
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    color,
                    color.withOpacity(0.7),
                  ],
                ),
                borderRadius: BorderRadius.circular(AppConstants.radiusLG),
              ),
              child: Center(
                child: Text(
                  intent.icon,
                  style: const TextStyle(fontSize: 32),
                ),
              ),
            ),

            const SizedBox(width: AppConstants.spacingLG),

            // Текст
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    intent.title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppConstants.textPrimary,
                        ),
                  ),
                  const SizedBox(height: AppConstants.spacingXS),
                  Text(
                    intent.description,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppConstants.textSecondary,
                        ),
                  ),
                ],
              ),
            ),

            // Стрелка
            Icon(
              Icons.arrow_forward_ios,
              color: color,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}

