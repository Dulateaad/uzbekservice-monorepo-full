import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../models/onboarding_intent.dart';
import '../../widgets/odo_logo.dart';
import '../../providers/firestore_auth_provider.dart';

class OnboardingIntentScreen extends ConsumerStatefulWidget {
  final String userType; // 'client', 'specialist', 'company'
  final String phoneNumber;
  final String? name;
  final bool isRegistration;

  const OnboardingIntentScreen({
    super.key,
    required this.userType,
    required this.phoneNumber,
    this.name,
    required this.isRegistration,
  });

  @override
  ConsumerState<OnboardingIntentScreen> createState() => _OnboardingIntentScreenState();
}

class _OnboardingIntentScreenState extends ConsumerState<OnboardingIntentScreen> {
  int _currentQuestionIndex = 0;
  final Map<String, String> _selectedAnswers = {};
  List<UserOnboardingIntent> _selectedIntents = [];

  late List<OnboardingQuestion> _questions;

  @override
  void initState() {
    super.initState();
    _questions = OnboardingQuestions.getForUserType(widget.userType);
  }

  void _selectAnswer(OnboardingAnswer answer) {
    setState(() {
      _selectedAnswers[_questions[_currentQuestionIndex].id] = answer.id;
      
      // Если ответ связан с намерением, добавляем его
      if (answer.intent != null && !_selectedIntents.contains(answer.intent)) {
        _selectedIntents.add(answer.intent!);
      }
    });

    // Переходим к следующему вопросу или завершаем
    Future.delayed(const Duration(milliseconds: 300), () {
      if (_currentQuestionIndex < _questions.length - 1) {
        setState(() {
          _currentQuestionIndex++;
        });
      } else {
        _completeOnboarding();
      }
    });
  }

  void _completeOnboarding() async {
    // Сохраняем намерения и отправляем SMS код
    final intents = _selectedIntents.map((e) => e.id).toList();
    
    // Отправляем SMS код
    try {
      await ref.read(firestoreAuthProvider.notifier).sendSmsCode(
        phoneNumber: widget.phoneNumber,
        name: widget.name ?? '',
        userType: widget.userType,
      );
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Код отправлен! Проверьте консоль для получения кода.'),
            backgroundColor: Colors.green,
          ),
        );
        
        context.go(
          '/auth/sms',
          extra: {
            'phoneNumber': widget.phoneNumber,
            'name': widget.name,
            'userType': widget.userType,
            'intents': intents,
            'answers': _selectedAnswers,
          },
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ошибка: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _skip() {
    // Пропускаем вопросы и переходим к SMS
    context.go(
      '/auth/sms',
      extra: {
        'phoneNumber': widget.phoneNumber,
        'name': widget.name,
        'userType': widget.userType,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_questions.isEmpty) {
      // Если нет вопросов для этой роли, сразу переходим к SMS
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _skip();
      });
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final currentQuestion = _questions[_currentQuestionIndex];
    final progress = (_currentQuestionIndex + 1) / _questions.length;

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            // Прогресс бар
            Container(
              padding: const EdgeInsets.all(AppConstants.spacingMD),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Вопрос ${_currentQuestionIndex + 1} из ${_questions.length}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppConstants.textSecondary,
                            ),
                      ),
                      TextButton(
                        onPressed: _skip,
                        child: const Text('Пропустить'),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppConstants.spacingSM),
                  LinearProgressIndicator(
                    value: progress,
                    backgroundColor: AppConstants.borderColor,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      AppConstants.primaryColor,
                    ),
                    minHeight: 4,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ],
              ),
            ),

            // Контент
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppConstants.spacingLG),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: AppConstants.spacingXL),
                    
                    // Логотип
                    const Center(
                      child: OdoLogo(),
                    ),

                    const SizedBox(height: AppConstants.spacingXXL),

                    // Вопрос
                    Text(
                      currentQuestion.question,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppConstants.textPrimary,
                          ),
                      textAlign: TextAlign.center,
                    ),

                    const SizedBox(height: AppConstants.spacingXXL),

                    // Варианты ответов
                    ...currentQuestion.answers.map((answer) {
                      final isSelected = _selectedAnswers[currentQuestion.id] == answer.id;
                      
                      return Padding(
                        padding: const EdgeInsets.only(bottom: AppConstants.spacingMD),
                        child: _AnswerCard(
                          answer: answer,
                          isSelected: isSelected,
                          onTap: () => _selectAnswer(answer),
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),

            // Кнопка "Назад" (если не первый вопрос)
            if (_currentQuestionIndex > 0)
              Padding(
                padding: const EdgeInsets.all(AppConstants.spacingLG),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          setState(() {
                            _currentQuestionIndex--;
                            // Удаляем ответ на текущий вопрос
                            _selectedAnswers.remove(_questions[_currentQuestionIndex + 1].id);
                          });
                        },
                        icon: const Icon(Icons.arrow_back),
                        label: const Text('Назад'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppConstants.radiusLG),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _AnswerCard extends StatelessWidget {
  final OnboardingAnswer answer;
  final bool isSelected;
  final VoidCallback onTap;

  const _AnswerCard({
    required this.answer,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(AppConstants.spacingLG),
        decoration: BoxDecoration(
          color: isSelected
              ? AppConstants.primaryColor.withOpacity(0.1)
              : AppConstants.surfaceColor,
          borderRadius: BorderRadius.circular(AppConstants.radiusLG),
          border: Border.all(
            color: isSelected
                ? AppConstants.primaryColor
                : AppConstants.borderColor,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppConstants.primaryColor.withOpacity(0.2),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          children: [
            // Иконка
            if (answer.icon != null)
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppConstants.primaryColor.withOpacity(0.1)
                      : AppConstants.borderColor.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                ),
                child: Center(
                  child: Text(
                    answer.icon!,
                    style: const TextStyle(fontSize: 24),
                  ),
                ),
              ),
            
            if (answer.icon != null)
              const SizedBox(width: AppConstants.spacingMD),

            // Текст
            Expanded(
              child: Text(
                answer.text,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      color: isSelected
                          ? AppConstants.primaryColor
                          : AppConstants.textPrimary,
                    ),
              ),
            ),

            // Индикатор выбора
            if (isSelected)
              const Icon(
                Icons.check_circle,
                color: AppConstants.primaryColor,
              ),
          ],
        ),
      ),
    );
  }
}

