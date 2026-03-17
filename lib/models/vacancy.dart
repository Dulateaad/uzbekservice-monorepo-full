import 'package:cloud_firestore/cloud_firestore.dart' as firestore;

enum UserIntent {
  moreIncome('more-income', '💰', 'Быстрый доход', 'Найди работу с высокой оплатой'),
  stability('stability', '🗓️', 'Постоянная работа', 'Вакансии с графиком и фиксированным доходом'),
  sideJob('side-job', '⏱️', 'Подработка рядом', 'Гибкие варианты для дополнительного заработка'),
  growth('growth', '🌱', 'Рост и обучение', 'Вакансии с возможностью развития и обучения');

  final String id;
  final String icon;
  final String title;
  final String description;

  const UserIntent(this.id, this.icon, this.title, this.description);
}

class VacancyCategory {
  final String id;
  final String name;
  final String icon;
  final UserIntent? intent;

  const VacancyCategory({
    required this.id,
    required this.name,
    required this.icon,
    this.intent,
  });
}

class Vacancy {
  final String id;
  final String title;
  final String company;
  final String? companyId; // ID компании-создателя
  final String description;
  final int salary;
  final String location;
  final String schedule;
  final String category;
  final List<String> requirements;
  final bool isHot;
  final bool isUrgent;
  final UserIntent? intent;
  final double? compatibilityScore;
  final List<String>? compatibilityReasons;
  final double? employerRating;
  final String? distance;
  final DateTime createdAt;
  final DateTime? expiresAt;
  final String? status; // active, closed, draft

  Vacancy({
    required this.id,
    required this.title,
    required this.company,
    this.companyId,
    required this.description,
    required this.salary,
    required this.location,
    required this.schedule,
    required this.category,
    required this.requirements,
    this.isHot = false,
    this.isUrgent = false,
    this.intent,
    this.compatibilityScore,
    this.compatibilityReasons,
    this.employerRating,
    this.distance,
    DateTime? createdAt,
    this.expiresAt,
    this.status = 'active',
  }) : createdAt = createdAt ?? DateTime.now();

  factory Vacancy.fromMap(Map<String, dynamic> map) {
    DateTime? parseDateTime(dynamic value) {
      if (value == null) return null;
      if (value is String) {
        return DateTime.parse(value);
      } else if (value is firestore.Timestamp) {
        return value.toDate();
      }
      return null;
    }

    return Vacancy(
      id: map['id'] ?? '',
      title: map['title'] ?? '',
      company: map['company'] ?? '',
      companyId: map['companyId'],
      description: map['description'] ?? '',
      salary: map['salary'] ?? 0,
      location: map['location'] ?? '',
      schedule: map['schedule'] ?? '',
      category: map['category'] ?? '',
      requirements: List<String>.from(map['requirements'] ?? []),
      isHot: map['isHot'] ?? false,
      isUrgent: map['isUrgent'] ?? false,
      intent: map['intent'] != null
          ? UserIntent.values.firstWhere(
              (e) => e.id == map['intent'],
              orElse: () => UserIntent.moreIncome,
            )
          : null,
      compatibilityScore: map['compatibilityScore']?.toDouble(),
      compatibilityReasons: map['compatibilityReasons'] != null
          ? List<String>.from(map['compatibilityReasons'])
          : null,
      employerRating: map['employerRating']?.toDouble(),
      distance: map['distance'],
      status: map['status'] ?? 'active',
      createdAt: parseDateTime(map['createdAt']),
      expiresAt: parseDateTime(map['expiresAt']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'company': company,
      'description': description,
      'salary': salary,
      'location': location,
      'schedule': schedule,
      'category': category,
      'requirements': requirements,
      'isHot': isHot,
      'isUrgent': isUrgent,
      'intent': intent?.id,
      'compatibilityScore': compatibilityScore,
      'compatibilityReasons': compatibilityReasons,
      'employerRating': employerRating,
      'distance': distance,
      'createdAt': createdAt.toIso8601String(),
      'expiresAt': expiresAt?.toIso8601String(),
      'companyId': companyId,
      'status': status,
    };
  }
}

// Модель отклика на вакансию
class VacancyApplication {
  final String id;
  final String vacancyId;
  final String userId;
  final String userName;
  final String? userPhone;
  final String? userEmail;
  final String? userType; // client, specialist
  final String status; // pending, viewed, accepted, rejected
  final DateTime appliedAt;
  final String? coverLetter;
  final Map<String, dynamic>? userProfile; // Дополнительная информация о пользователе

  VacancyApplication({
    required this.id,
    required this.vacancyId,
    required this.userId,
    required this.userName,
    this.userPhone,
    this.userEmail,
    this.userType,
    this.status = 'pending',
    DateTime? appliedAt,
    this.coverLetter,
    this.userProfile,
  }) : appliedAt = appliedAt ?? DateTime.now();

  factory VacancyApplication.fromMap(Map<String, dynamic> map) {
    DateTime? parseDateTime(dynamic value) {
      if (value == null) return null;
      if (value is String) {
        return DateTime.parse(value);
      } else if (value is firestore.Timestamp) {
        return value.toDate();
      }
      return null;
    }

    return VacancyApplication(
      id: map['id'] ?? '',
      vacancyId: map['vacancyId'] ?? '',
      userId: map['userId'] ?? '',
      userName: map['userName'] ?? '',
      userPhone: map['userPhone'],
      userEmail: map['userEmail'],
      userType: map['userType'],
      status: map['status'] ?? 'pending',
      appliedAt: parseDateTime(map['appliedAt']),
      coverLetter: map['coverLetter'],
      userProfile: map['userProfile'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'vacancyId': vacancyId,
      'userId': userId,
      'userName': userName,
      'userPhone': userPhone,
      'userEmail': userEmail,
      'userType': userType,
      'status': status,
      'appliedAt': appliedAt.toIso8601String(),
      'coverLetter': coverLetter,
      'userProfile': userProfile,
    };
  }

  VacancyApplication copyWith({
    String? status,
    String? coverLetter,
  }) {
    return VacancyApplication(
      id: id,
      vacancyId: vacancyId,
      userId: userId,
      userName: userName,
      userPhone: userPhone,
      userEmail: userEmail,
      userType: userType,
      status: status ?? this.status,
      appliedAt: appliedAt,
      coverLetter: coverLetter ?? this.coverLetter,
      userProfile: userProfile,
    );
  }
}

class VacancyFilter {
  final String? search;
  final String? category;
  final String? location;
  final int? salaryMin;
  final int? salaryMax;
  final UserIntent? intent;
  final String? schedule;

  const VacancyFilter({
    this.search,
    this.category,
    this.location,
    this.salaryMin,
    this.salaryMax,
    this.intent,
    this.schedule,
  });

  VacancyFilter copyWith({
    String? search,
    String? category,
    String? location,
    int? salaryMin,
    int? salaryMax,
    UserIntent? intent,
    String? schedule,
  }) {
    return VacancyFilter(
      search: search ?? this.search,
      category: category ?? this.category,
      location: location ?? this.location,
      salaryMin: salaryMin ?? this.salaryMin,
      salaryMax: salaryMax ?? this.salaryMax,
      intent: intent ?? this.intent,
      schedule: schedule ?? this.schedule,
    );
  }
}

