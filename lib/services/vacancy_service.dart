import '../models/vacancy.dart';
import 'package:cloud_firestore/cloud_firestore.dart' as firestore;

class VacancyService {
  // Загружает вакансии из Firestore, если нет - возвращает моковые данные
  Future<List<Vacancy>> getAllVacancies() async {
    try {
      final snapshot = await firestore.FirebaseFirestore.instance
          .collection('vacancies')
          .where('status', isEqualTo: 'active')
          .orderBy('createdAt', descending: true)
          .limit(50)
          .get();

      if (snapshot.docs.isNotEmpty) {
        return snapshot.docs
            .map((doc) => Vacancy.fromMap({...doc.data(), 'id': doc.id}))
            .toList();
      }
    } catch (e) {
      print('Ошибка при загрузке вакансий из Firestore: $e');
    }

    // Если нет данных в Firestore, возвращаем моковые данные
    return [
      Vacancy(
        id: '1',
        title: 'Frontend Developer',
        company: 'Tech Solutions',
        description: 'Ищем опытного Frontend разработчика для работы над современными веб-приложениями.',
        salary: 5000000,
        location: 'Ташкент',
        schedule: 'Полный день',
        category: 'it',
        requirements: ['React', 'TypeScript', '3+ года опыта'],
        isHot: true,
        intent: UserIntent.growth,
        compatibilityScore: 92.0,
        compatibilityReasons: ['Совпадают навыки', 'Опыт подходит', 'Рядом'],
        employerRating: 4.8,
        distance: '2.5 км',
      ),
      Vacancy(
        id: '2',
        title: 'Менеджер по продажам',
        company: 'Sales Pro',
        description: 'Активные продажи, работа с клиентами, высокий доход от комиссии.',
        salary: 3000000,
        location: 'Ташкент',
        schedule: 'Полный день',
        category: 'sales',
        requirements: ['Опыт продаж', 'Коммуникабельность'],
        isUrgent: true,
        intent: UserIntent.moreIncome,
        compatibilityScore: 85.0,
        employerRating: 4.5,
        distance: '5 км',
      ),
      Vacancy(
        id: '3',
        title: 'Курьер',
        company: 'Express Delivery',
        description: 'Доставка заказов по городу. Гибкий график, можно совмещать с основной работой.',
        salary: 2000000,
        location: 'Ташкент',
        schedule: 'Гибкий график',
        category: 'delivery',
        requirements: ['Водительские права', 'Собственный транспорт'],
        intent: UserIntent.sideJob,
        employerRating: 4.2,
        distance: '1 км',
      ),
      Vacancy(
        id: '4',
        title: 'Мастер по ремонту',
        company: 'Home Service',
        description: 'Ремонт бытовой техники и электроники. Стабильный график, обучение на месте.',
        salary: 4000000,
        location: 'Ташкент',
        schedule: 'Полный день',
        category: 'service',
        requirements: ['Опыт ремонта', 'Ответственность'],
        intent: UserIntent.stability,
        compatibilityScore: 78.0,
        employerRating: 4.7,
        distance: '3 км',
      ),
      Vacancy(
        id: '5',
        title: 'Преподаватель английского',
        company: 'Language School',
        description: 'Обучение английскому языку детей и взрослых. Возможность роста до методиста.',
        salary: 3500000,
        location: 'Ташкент',
        schedule: 'Частичная занятость',
        category: 'education',
        requirements: ['Английский C1+', 'Опыт преподавания'],
        intent: UserIntent.growth,
        employerRating: 4.9,
        distance: '4 км',
      ),
      Vacancy(
        id: '6',
        title: 'SMM-менеджер',
        company: 'Digital Agency',
        description: 'Ведение социальных сетей, создание контента, работа с блогерами.',
        salary: 2800000,
        location: 'Удалённо',
        schedule: 'Удалённо',
        category: 'it',
        requirements: ['Опыт SMM', 'Креативность'],
        intent: UserIntent.sideJob,
        employerRating: 4.3,
      ),
    ];
  }

  Future<Vacancy?> getVacancyById(String id) async {
    final vacancies = await getAllVacancies();
    try {
      return vacancies.firstWhere((v) => v.id == id);
    } catch (e) {
      return null;
    }
  }

  Future<bool> applyToVacancy(
    String vacancyId,
    String userId, {
    String? userName,
    String? userPhone,
    String? userEmail,
    String? userType,
  }) async {
    try {
      final application = VacancyApplication(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        vacancyId: vacancyId,
        userId: userId,
        userName: userName ?? 'Пользователь',
        userPhone: userPhone,
        userEmail: userEmail,
        userType: userType,
        status: 'pending',
      );

      await firestore.FirebaseFirestore.instance
          .collection('vacancy_applications')
          .doc(application.id)
          .set(application.toMap());

      return true;
    } catch (e, st) {
      print('Ошибка при создании отклика: $e');
      print('Stack: $st');
      return false;
    }
  }

  Future<List<Vacancy>> getCompanyVacancies(String companyId) async {
    try {
      final snapshot = await firestore.FirebaseFirestore.instance
          .collection('vacancies')
          .where('companyId', isEqualTo: companyId)
          .get();

      return snapshot.docs
          .map((doc) => Vacancy.fromMap({...doc.data(), 'id': doc.id}))
          .toList();
    } catch (e) {
      print('Ошибка при загрузке вакансий компании: $e');
      return [];
    }
  }

  Future<List<VacancyApplication>> getVacancyApplications(String vacancyId) async {
    try {
      final snapshot = await firestore.FirebaseFirestore.instance
          .collection('vacancy_applications')
          .where('vacancyId', isEqualTo: vacancyId)
          .get();

      return snapshot.docs
          .map((doc) => VacancyApplication.fromMap({...doc.data(), 'id': doc.id}))
          .toList();
    } catch (e) {
      print('Ошибка при загрузке откликов: $e');
      return [];
    }
  }

  Future<List<VacancyApplication>> getUserApplications(String userId) async {
    try {
      final snapshot = await firestore.FirebaseFirestore.instance
          .collection('vacancy_applications')
          .where('userId', isEqualTo: userId)
          .orderBy('appliedAt', descending: true)
          .get();

      return snapshot.docs
          .map((doc) => VacancyApplication.fromMap({...doc.data(), 'id': doc.id}))
          .toList();
    } catch (e) {
      print('Ошибка при загрузке откликов пользователя: $e');
      return [];
    }
  }

  Future<bool> createVacancy(Vacancy vacancy) async {
    try {
      await firestore.FirebaseFirestore.instance
          .collection('vacancies')
          .doc(vacancy.id)
          .set(vacancy.toMap());
      return true;
    } catch (e, st) {
      print('Ошибка при создании вакансии: $e');
      print('Stack: $st');
      return false;
    }
  }
}

