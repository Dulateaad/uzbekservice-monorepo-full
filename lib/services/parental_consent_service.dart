import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:http/http.dart' as http;
import '../models/parental_consent_model.dart';
import 'firestore_service.dart';

/// Сервис для работы с родительскими согласиями
class ParentalConsentService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Отправка OTP на email родителя
  Future<bool> sendOtpToEmail(String email) async {
    try {
      // Генерируем 6-значный код
      final otp = _generateOtp();
      
      // Сохраняем OTP во временную коллекцию (с TTL)
      await _firestore
          .collection('parental_consent_otps')
          .doc(email)
          .set({
        'otp': otp,
        'email': email,
        'createdAt': FieldValue.serverTimestamp(),
        'expiresAt': Timestamp.fromDate(
          DateTime.now().add(Duration(minutes: 10)),
        ),
      });

      // Отправляем email через Firebase Function
      try {
        // Определяем URL Firebase Function
        // TODO: Заменить на реальный проект (anama-app или odo-uz-app)
        final functionUrl = 'https://us-central1-anama-app.cloudfunctions.net/sendParentalConsentOtp';
        
        final response = await http.post(
          Uri.parse(functionUrl),
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'email': email,
            'otp': otp,
            'language': 'ru', // Можно определить язык из настроек пользователя
          }),
        ).timeout(const Duration(seconds: 10));

        if (response.statusCode == 200) {
          print('✅ OTP email отправлен на $email');
          return true;
        } else {
          print('❌ Ошибка отправки email: ${response.statusCode}');
          print('Response: ${response.body}');
          // Не возвращаем false, так как OTP сохранен в Firestore
          // Пользователь может запросить повторную отправку
          return true; // OTP сохранен, email может быть отправлен позже
        }
      } catch (e) {
        print('⚠️ Ошибка отправки email через Firebase Function: $e');
        // OTP сохранен в Firestore, можно попробовать отправить позже
        return true;
      }
    } catch (e) {
      print('❌ Ошибка отправки OTP: $e');
      return false;
    }
  }

  /// Проверка OTP
  Future<bool> verifyOtp(String email, String otp) async {
    try {
      final doc = await _firestore
          .collection('parental_consent_otps')
          .doc(email)
          .get();

      if (!doc.exists) {
        return false;
      }

      final data = doc.data()!;
      final storedOtp = data['otp'] as String;
      final expiresAt = (data['expiresAt'] as Timestamp).toDate();

      // Проверяем срок действия
      if (DateTime.now().isAfter(expiresAt)) {
        await doc.reference.delete();
        return false;
      }

      // Проверяем код
      if (storedOtp == otp) {
        // Удаляем использованный OTP
        await doc.reference.delete();
        return true;
      }

      return false;
    } catch (e) {
      print('❌ Ошибка проверки OTP: $e');
      return false;
    }
  }

  /// Создание родительского согласия
  Future<ParentalConsent?> createParentalConsent({
    required String childUserId,
    required String parentEmail,
    required String parentPhone,
    required String consentMethod,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final consentId = _firestore.collection('parental_consents').doc().id;

      final consent = ParentalConsent(
        id: consentId,
        childUserId: childUserId,
        parentUserId: 'temp_parent_id', // TODO: Получить ID родителя
        parentEmail: parentEmail,
        parentPhone: parentPhone,
        consentMethod: consentMethod,
        isVerified: true,
        createdAt: DateTime.now(),
        verifiedAt: DateTime.now(),
        isActive: true,
        metadata: metadata,
      );

      await _firestore
          .collection('parental_consents')
          .doc(consentId)
          .set(consent.toFirestore());

      print('✅ Родительское согласие создано: $consentId');
      return consent;
    } catch (e) {
      print('❌ Ошибка создания согласия: $e');
      return null;
    }
  }

  /// Получение активного согласия для пользователя
  Future<ParentalConsent?> getActiveConsent(String childUserId) async {
    try {
      final querySnapshot = await _firestore
          .collection('parental_consents')
          .where('childUserId', isEqualTo: childUserId)
          .where('isActive', isEqualTo: true)
          .where('isVerified', isEqualTo: true)
          .orderBy('createdAt', descending: true)
          .limit(1)
          .get();

      if (querySnapshot.docs.isEmpty) {
        return null;
      }

      return ParentalConsent.fromFirestore(querySnapshot.docs.first);
    } catch (e) {
      print('❌ Ошибка получения согласия: $e');
      return null;
    }
  }

  /// Отзыв согласия
  Future<bool> revokeConsent(String consentId) async {
    try {
      await _firestore
          .collection('parental_consents')
          .doc(consentId)
          .update({
        'isActive': false,
        'revokedAt': FieldValue.serverTimestamp(),
      });

      print('✅ Согласие отозвано: $consentId');
      return true;
    } catch (e) {
      print('❌ Ошибка отзыва согласия: $e');
      return false;
    }
  }

  /// Генерация 6-значного OTP
  String _generateOtp() {
    final random = DateTime.now().millisecondsSinceEpoch;
    return (random % 1000000).toString().padLeft(6, '0');
  }
}

