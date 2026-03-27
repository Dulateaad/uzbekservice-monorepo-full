// Модель для intent-based onboarding

enum UserIntent {
  // Ищу специалистов → Клиент (заказать услугу)
  findSpecialist('find-specialist', 'client', '👨‍🔧', 'Ищу специалистов'),
  
  // Найти работу / подработку → Кандидат
  findJob('find-job', 'candidate', '💼', 'Найти работу / подработку'),
  
  // Предложить свои услуги → Специалист
  offerServices('offer-services', 'specialist', '🛠️', 'Предложить свои услуги'),
  
  // Разместить вакансию → Компания (HR-Lite)
  postVacancy('post-vacancy', 'company-hr', '📢', 'Разместить вакансию'),
  
  // Управлять бизнесом → Компания (Full)
  manageBusiness('manage-business', 'company-full', '🏢', 'Управлять бизнесом');

  final String id;
  final String role; // Автоматически определяемая роль
  final String icon;
  final String title;

  const UserIntent(this.id, this.role, this.icon, this.title);

  String get description {
    switch (this) {
      case UserIntent.findSpecialist:
        return 'Нужен мастер или услуга';
      case UserIntent.findJob:
        return 'Я ищу работу или подработку';
      case UserIntent.offerServices:
        return 'Я специалист и хочу зарабатывать';
      case UserIntent.postVacancy:
        return 'Я представляю компанию и ищу сотрудников';
      case UserIntent.manageBusiness:
        return 'Я владелец или руководитель бизнеса';
    }
  }

  // Минимальные данные для регистрации
  List<String> get requiredFields {
    switch (this) {
      case UserIntent.findSpecialist:
        return ['phone']; // Минимальные для клиента
      case UserIntent.findJob:
        return ['phone']; // Минимальные
      case UserIntent.offerServices:
        return ['phone', 'skills', 'city']; // Навыки, город
      case UserIntent.postVacancy:
        return ['phone', 'companyName', 'contact']; // Компания, контакт
      case UserIntent.manageBusiness:
        return ['phone', 'companyName', 'legalData']; // Юр. данные
    }
  }
}

