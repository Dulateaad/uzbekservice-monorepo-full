import '../models/vacancy.dart';
import 'package:cloud_firestore/cloud_firestore.dart' as firestore;

class VacancyService {
  final firestore.FirebaseFirestore _db = firestore.FirebaseFirestore.instance;

  Future<List<Vacancy>> getAllVacancies() async {
    try {
      final snapshot = await _db
          .collection('vacancies')
          .where('status', isEqualTo: 'active')
          .orderBy('createdAt', descending: true)
          .limit(50)
          .get();

      return snapshot.docs
          .map((doc) => Vacancy.fromMap({...doc.data(), 'id': doc.id}))
          .toList();
    } catch (e) {
      print('Ошибка при загрузке вакансий из Firestore: $e');
      return [];
    }
  }

  Future<Vacancy?> getVacancyById(String id) async {
    try {
      final doc = await _db.collection('vacancies').doc(id).get();
      if (!doc.exists) return null;
      return Vacancy.fromMap({...doc.data()!, 'id': doc.id});
    } catch (e) {
      print('Ошибка при загрузке вакансии: $e');
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

      await _db
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
      final snapshot = await _db
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
      final snapshot = await _db
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
      final snapshot = await _db
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
      await _db
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

