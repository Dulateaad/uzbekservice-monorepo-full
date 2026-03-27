import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:http/http.dart' as http;
import '../models/payment_model.dart';
import '../config/click_config.dart';

/// Сервис для работы с платежной системой Click
/// 
/// Для production нужно:
/// 1. Зарегистрироваться как мерчант на my.click.uz
/// 2. Получить merchant_id и service_id
/// 3. Настроить Prepare и Complete URL на сервере (Firebase Functions)
class ClickPaymentService {
  // URL для возврата после оплаты
  static const String _returnUrl = ClickConfig.returnUrl;
  
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Создать транзакцию для оплаты
  Future<ClickTransaction> createTransaction({
    required String orderId,
    required double amount,
    required String userId,
  }) async {
    final transactionId = _generateTransactionId();
    
    final transaction = ClickTransaction(
      transactionId: transactionId,
      orderId: orderId,
      amount: amount,
      status: PaymentStatus.pending,
      createdAt: DateTime.now(),
    );

    // Сохраняем транзакцию в Firestore
    await _firestore
        .collection('payments')
        .doc(transactionId)
        .set({
          ...transaction.toJson(),
          'user_id': userId,
          'payment_method': PaymentMethod.click.name,
        });

    return transaction;
  }

  /// Получить URL для оплаты через Click
  /// 
  /// В production должен вызывать серверный endpoint для создания платежа
  String getPaymentUrl({
    required String orderId,
    required double amount,
    String? cardType,
  }) {
    // Проверяем конфигурацию
    if (!ClickConfig.isConfigured) {
      throw Exception(
        'Click не настроен. Установите CLICK_MERCHANT_ID и CLICK_SERVICE_ID',
      );
    }
    
    final params = ClickPaymentParams(
      merchantId: ClickConfig.merchantId,
      serviceId: ClickConfig.serviceId,
      transactionParam: orderId,
      amount: amount,
      returnUrl: _returnUrl,
      cardType: cardType,
    );

    return params.paymentUrl;
  }
  
  /// Создать платеж через серверный endpoint (рекомендуемый способ)
  /// 
  /// В production используйте этот метод вместо прямого создания URL
  Future<String> createPaymentViaServer({
    required String orderId,
    required double amount,
    required String userId,
    String? cardType,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${ClickConfig.serverBaseUrl}/clickPrepare'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'orderId': orderId,
          'amount': amount,
          'userId': userId,
          'cardType': cardType,
        }),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['paymentUrl'] as String;
      } else {
        throw Exception('Ошибка создания платежа: ${response.body}');
      }
    } catch (e) {
      print('⚠️ Ошибка создания платежа через сервер, используем прямой URL: $e');
      // Fallback к прямому URL
      return getPaymentUrl(orderId: orderId, amount: amount, cardType: cardType);
    }
  }

  /// Проверить статус платежа
  Future<ClickTransaction?> checkPaymentStatus(String transactionId) async {
    try {
      final doc = await _firestore
          .collection('payments')
          .doc(transactionId)
          .get();

      if (!doc.exists) return null;

      return ClickTransaction.fromJson(doc.data()!);
    } catch (e) {
      print('Error checking payment status: $e');
      return null;
    }
  }

  /// Обновить статус платежа (вызывается через webhook от Click)
  Future<void> updatePaymentStatus({
    required String transactionId,
    required PaymentStatus status,
    Map<String, dynamic>? clickResponse,
    String? errorMessage,
  }) async {
    final updates = <String, dynamic>{
      'status': status.name,
      'updated_at': FieldValue.serverTimestamp(),
    };

    if (status == PaymentStatus.completed) {
      updates['completed_at'] = FieldValue.serverTimestamp();
    }

    if (clickResponse != null) {
      updates['click_response'] = clickResponse;
    }

    if (errorMessage != null) {
      updates['error_message'] = errorMessage;
    }

    await _firestore
        .collection('payments')
        .doc(transactionId)
        .update(updates);

    // Если оплата успешна, обновляем статус заказа
    if (status == PaymentStatus.completed) {
      final paymentDoc = await _firestore
          .collection('payments')
          .doc(transactionId)
          .get();
      
      if (paymentDoc.exists) {
        final orderId = paymentDoc.data()?['order_id'];
        if (orderId != null) {
          await _firestore
              .collection('orders')
              .doc(orderId)
              .update({
                'payment_status': 'paid',
                'paid_at': FieldValue.serverTimestamp(),
              });
        }
      }
    }
  }

  /// Получить историю платежей пользователя
  Future<List<ClickTransaction>> getPaymentHistory(String userId) async {
    try {
      final snapshot = await _firestore
          .collection('payments')
          .where('user_id', isEqualTo: userId)
          .orderBy('created_at', descending: true)
          .limit(50)
          .get();

      return snapshot.docs
          .map((doc) => ClickTransaction.fromJson(doc.data()))
          .toList();
    } catch (e) {
      print('Error getting payment history: $e');
      return [];
    }
  }

  /// Генерация подписи для Prepare/Complete запросов
  /// 
  /// ⚠️ ВАЖНО: Этот метод должен использоваться только на сервере!
  /// Secret key не должен быть доступен в клиентском коде
  static String generateSignature({
    required String clickTransId,
    required String serviceId,
    required String secretKey,
    required String merchantTransId,
    required String amount,
    required String action,
    required String signTime,
  }) {
    final signString = '$clickTransId$serviceId$secretKey$merchantTransId$amount$action$signTime';
    final bytes = utf8.encode(signString);
    final digest = md5.convert(bytes);
    return digest.toString();
  }

  /// Верификация подписи от Click
  /// 
  /// ⚠️ ВАЖНО: Этот метод должен использоваться только на сервере!
  /// Для верификации на клиенте используйте серверный endpoint
  static bool verifySignature({
    required String receivedSign,
    required String clickTransId,
    required String serviceId,
    required String secretKey,
    required String merchantTransId,
    required String amount,
    required String action,
    required String signTime,
  }) {
    final expectedSign = generateSignature(
      clickTransId: clickTransId,
      serviceId: serviceId,
      secretKey: secretKey,
      merchantTransId: merchantTransId,
      amount: amount,
      action: action,
      signTime: signTime,
    );

    return receivedSign == expectedSign;
  }

  /// Генерация уникального ID транзакции
  String _generateTransactionId() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = Random().nextInt(999999).toString().padLeft(6, '0');
    return 'TXN$timestamp$random';
  }

  /// Отменить платеж
  Future<bool> cancelPayment(String transactionId) async {
    try {
      await updatePaymentStatus(
        transactionId: transactionId,
        status: PaymentStatus.cancelled,
      );
      return true;
    } catch (e) {
      print('Error cancelling payment: $e');
      return false;
    }
  }

  /// Запросить возврат средств
  Future<bool> requestRefund({
    required String transactionId,
    required String reason,
  }) async {
    try {
      await _firestore.collection('refund_requests').add({
        'transaction_id': transactionId,
        'reason': reason,
        'status': 'pending',
        'created_at': FieldValue.serverTimestamp(),
      });

      await _firestore
          .collection('payments')
          .doc(transactionId)
          .update({
            'refund_requested': true,
            'refund_reason': reason,
          });

      return true;
    } catch (e) {
      print('Error requesting refund: $e');
      return false;
    }
  }

  /// Сохранить карту для повторных платежей
  Future<void> saveCard({
    required String userId,
    required SavedCard card,
  }) async {
    await _firestore
        .collection('users')
        .doc(userId)
        .collection('saved_cards')
        .doc(card.id)
        .set(card.toJson());
  }

  /// Получить сохраненные карты пользователя
  Future<List<SavedCard>> getSavedCards(String userId) async {
    try {
      final snapshot = await _firestore
          .collection('users')
          .doc(userId)
          .collection('saved_cards')
          .get();

      return snapshot.docs
          .map((doc) => SavedCard.fromJson(doc.data()))
          .toList();
    } catch (e) {
      print('Error getting saved cards: $e');
      return [];
    }
  }

  /// Удалить сохраненную карту
  Future<void> deleteCard({
    required String userId,
    required String cardId,
  }) async {
    await _firestore
        .collection('users')
        .doc(userId)
        .collection('saved_cards')
        .doc(cardId)
        .delete();
  }

  /// Установить карту как основную
  Future<void> setCardAsPrimary({
    required String userId,
    required String cardId,
  }) async {
    // Сначала сбрасываем флаг у всех карт
    final batch = _firestore.batch();
    final cardsSnapshot = await _firestore
        .collection('users')
        .doc(userId)
        .collection('saved_cards')
        .get();

    for (final doc in cardsSnapshot.docs) {
      batch.update(doc.reference, {'is_primary': doc.id == cardId});
    }

    await batch.commit();
  }
}

/// Коды ошибок Click
class ClickErrorCodes {
  static const int success = 0;
  static const int signCheckFailed = -1;
  static const int invalidAmount = -2;
  static const int actionNotFound = -3;
  static const int alreadyPaid = -4;
  static const int userNotFound = -5;
  static const int transactionNotFound = -6;
  static const int badRequest = -8;
  static const int transactionCancelled = -9;

  static String getMessage(int code) {
    switch (code) {
      case success:
        return 'Успешно';
      case signCheckFailed:
        return 'Ошибка проверки подписи';
      case invalidAmount:
        return 'Неверная сумма';
      case actionNotFound:
        return 'Действие не найдено';
      case alreadyPaid:
        return 'Уже оплачено';
      case userNotFound:
        return 'Пользователь не найден';
      case transactionNotFound:
        return 'Транзакция не найдена';
      case badRequest:
        return 'Неверный запрос';
      case transactionCancelled:
        return 'Транзакция отменена';
      default:
        return 'Неизвестная ошибка';
    }
  }
}

