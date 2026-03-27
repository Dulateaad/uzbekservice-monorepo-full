/// Операционные роли для иерархии сотрудников
/// Owner → РОП / Оператор / Старший логист → Менеджеры / Курьеры
enum WorkRole {
  owner,
  rop,           // Руководитель отдела продаж
  manager,       // Менеджер по продажам
  operator,      // Оператор колл-центра
  seniorLogistics, // Старший логист
  courier,       // Курьер
  accountant,    // Бухгалтер
  viewer,        // Наблюдатель
}

extension WorkRoleX on WorkRole {
  String get label {
    switch (this) {
      case WorkRole.owner:
        return 'Владелец';
      case WorkRole.rop:
        return 'РОП';
      case WorkRole.manager:
        return 'Менеджер';
      case WorkRole.operator:
        return 'Оператор';
      case WorkRole.seniorLogistics:
        return 'Старший логист';
      case WorkRole.courier:
        return 'Курьер';
      case WorkRole.accountant:
        return 'Бухгалтер';
      case WorkRole.viewer:
        return 'Наблюдатель';
    }
  }

  String get firestoreValue => name;

  /// Может ли эта роль добавлять подчинённых
  bool get canAddSubordinates {
    switch (this) {
      case WorkRole.owner:
        return true;
      case WorkRole.rop:
        return true; // менеджеров
      case WorkRole.seniorLogistics:
        return true; // курьеров
      case WorkRole.operator:
        return false;
      case WorkRole.manager:
      case WorkRole.courier:
      case WorkRole.accountant:
      case WorkRole.viewer:
        return false;
    }
  }

  /// Роли, которые может добавить эта роль
  List<WorkRole> get allowedSubordinateRoles {
    switch (this) {
      case WorkRole.owner:
        return [WorkRole.rop, WorkRole.operator, WorkRole.seniorLogistics, WorkRole.accountant];
      case WorkRole.rop:
        return [WorkRole.manager];
      case WorkRole.seniorLogistics:
        return [WorkRole.courier];
      default:
        return [];
    }
  }

  /// Может ли менять пароль подчинённого
  bool get canChangeSubordinatePassword =>
      this == WorkRole.owner || this == WorkRole.rop || this == WorkRole.seniorLogistics;
}
