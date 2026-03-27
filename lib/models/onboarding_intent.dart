// Модель для намерений пользователя при входе/регистрации

enum UserOnboardingIntent {
  // Для клиентов
  findSpecialists('find-specialists', 'client', '👨‍🔧', 'Ищу специалистов'),
  findService('find-service', 'client', '🔍', 'Найти услугу'),
  urgentService('urgent-service', 'client', '⚡', 'Срочная услуга'),
  regularService('regular-service', 'client', '📅', 'Регулярные услуги'),
  comparePrices('compare-prices', 'client', '💰', 'Сравнить цены'),
  
  // Для специалистов
  findClients('find-clients', 'specialist', '👥', 'Найти клиентов'),
  increaseIncome('increase-income', 'specialist', '💵', 'Увеличить доход'),
  buildReputation('build-reputation', 'specialist', '⭐', 'Построить репутацию'),
  flexibleSchedule('flexible-schedule', 'specialist', '⏰', 'Гибкий график'),
  
  // Для компаний
  findEmployees('find-employees', 'company', '👔', 'Найти сотрудников'),
  postVacancies('post-vacancies', 'company', '📢', 'Разместить вакансии'),
  manageTeam('manage-team', 'company', '👨‍💼', 'Управлять командой'),
  growBusiness('grow-business', 'company', '📈', 'Развить бизнес');

  final String id;
  final String userType; // 'client', 'specialist', 'company'
  final String icon;
  final String title;

  const UserOnboardingIntent(this.id, this.userType, this.icon, this.title);

  // Получить намерения для конкретной роли
  static List<UserOnboardingIntent> getForUserType(String userType) {
    return UserOnboardingIntent.values
        .where((intent) => intent.userType == userType)
        .toList();
  }
}

// Модель вопроса для онбординга
class OnboardingQuestion {
  final String id;
  final String userType; // 'client', 'specialist', 'company'
  final String question;
  final List<OnboardingAnswer> answers;

  const OnboardingQuestion({
    required this.id,
    required this.userType,
    required this.question,
    required this.answers,
  });
}

// Модель ответа на вопрос
class OnboardingAnswer {
  final String id;
  final String text;
  final UserOnboardingIntent? intent; // Связанное намерение (опционально)
  final String? icon;

  const OnboardingAnswer({
    required this.id,
    required this.text,
    this.intent,
    this.icon,
  });
}

// Вопросы для разных ролей
class OnboardingQuestions {
  static List<OnboardingQuestion> getForUserType(String userType) {
    switch (userType) {
      case 'client':
        return _clientQuestions;
      case 'specialist':
        return _specialistQuestions;
      case 'company':
        return _companyQuestions;
      default:
        return [];
    }
  }

  // Вопросы для клиентов
  static const List<OnboardingQuestion> _clientQuestions = [
    OnboardingQuestion(
      id: 'client-1',
      userType: 'client',
      question: 'Что вас интересует?',
      answers: [
        OnboardingAnswer(
          id: 'find-specialists',
          text: 'Ищу специалистов',
          intent: UserOnboardingIntent.findSpecialists,
          icon: '👨‍🔧',
        ),
        OnboardingAnswer(
          id: 'find-service',
          text: 'Найти специалиста для услуги',
          intent: UserOnboardingIntent.findService,
          icon: '🔍',
        ),
        OnboardingAnswer(
          id: 'urgent-service',
          text: 'Нужна срочная услуга',
          intent: UserOnboardingIntent.urgentService,
          icon: '⚡',
        ),
        OnboardingAnswer(
          id: 'regular-service',
          text: 'Регулярные услуги',
          intent: UserOnboardingIntent.regularService,
          icon: '📅',
        ),
        OnboardingAnswer(
          id: 'compare-prices',
          text: 'Сравнить цены',
          intent: UserOnboardingIntent.comparePrices,
          icon: '💰',
        ),
      ],
    ),
    OnboardingQuestion(
      id: 'client-2',
      userType: 'client',
      question: 'Как часто вы планируете пользоваться услугами?',
      answers: [
        OnboardingAnswer(
          id: 'once',
          text: 'Один раз',
          icon: '1️⃣',
        ),
        OnboardingAnswer(
          id: 'sometimes',
          text: 'Иногда',
          icon: '2️⃣',
        ),
        OnboardingAnswer(
          id: 'regularly',
          text: 'Регулярно',
          icon: '3️⃣',
        ),
      ],
    ),
  ];

  // Вопросы для специалистов
  static const List<OnboardingQuestion> _specialistQuestions = [
    OnboardingQuestion(
      id: 'specialist-1',
      userType: 'specialist',
      question: 'Что для вас важно?',
      answers: [
        OnboardingAnswer(
          id: 'find-clients',
          text: 'Найти клиентов',
          intent: UserOnboardingIntent.findClients,
          icon: '👥',
        ),
        OnboardingAnswer(
          id: 'increase-income',
          text: 'Увеличить доход',
          intent: UserOnboardingIntent.increaseIncome,
          icon: '💵',
        ),
        OnboardingAnswer(
          id: 'build-reputation',
          text: 'Построить репутацию',
          intent: UserOnboardingIntent.buildReputation,
          icon: '⭐',
        ),
        OnboardingAnswer(
          id: 'flexible-schedule',
          text: 'Гибкий график',
          intent: UserOnboardingIntent.flexibleSchedule,
          icon: '⏰',
        ),
      ],
    ),
    OnboardingQuestion(
      id: 'specialist-2',
      userType: 'specialist',
      question: 'Как вы планируете работать?',
      answers: [
        OnboardingAnswer(
          id: 'full-time',
          text: 'Полный рабочий день',
          icon: '🕐',
        ),
        OnboardingAnswer(
          id: 'part-time',
          text: 'Частичная занятость',
          icon: '⏱️',
        ),
        OnboardingAnswer(
          id: 'flexible',
          text: 'Гибкий график',
          icon: '🔄',
        ),
      ],
    ),
  ];

  // Вопросы для компаний
  static const List<OnboardingQuestion> _companyQuestions = [
    OnboardingQuestion(
      id: 'company-1',
      userType: 'company',
      question: 'Что вам нужно?',
      answers: [
        OnboardingAnswer(
          id: 'find-employees',
          text: 'Найти сотрудников',
          intent: UserOnboardingIntent.findEmployees,
          icon: '👔',
        ),
        OnboardingAnswer(
          id: 'post-vacancies',
          text: 'Разместить вакансии',
          intent: UserOnboardingIntent.postVacancies,
          icon: '📢',
        ),
        OnboardingAnswer(
          id: 'manage-team',
          text: 'Управлять командой',
          intent: UserOnboardingIntent.manageTeam,
          icon: '👨‍💼',
        ),
        OnboardingAnswer(
          id: 'grow-business',
          text: 'Развить бизнес',
          intent: UserOnboardingIntent.growBusiness,
          icon: '📈',
        ),
      ],
    ),
    OnboardingQuestion(
      id: 'company-2',
      userType: 'company',
      question: 'Сколько сотрудников вы планируете нанять?',
      answers: [
        OnboardingAnswer(
          id: '1-5',
          text: '1-5 человек',
          icon: '👥',
        ),
        OnboardingAnswer(
          id: '6-20',
          text: '6-20 человек',
          icon: '👥👥',
        ),
        OnboardingAnswer(
          id: '20+',
          text: 'Более 20 человек',
          icon: '👥👥👥',
        ),
      ],
    ),
  ];
}

