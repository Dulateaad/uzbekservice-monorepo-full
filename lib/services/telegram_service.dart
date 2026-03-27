import 'dart:convert';
import 'package:http/http.dart' as http;

/// Сервис для отправки сообщений в Telegram бот
class TelegramService {
  static final TelegramService _instance = TelegramService._internal();
  factory TelegramService() => _instance;
  TelegramService._internal();

  // URL Firebase Function для отправки в Telegram
  // Для проекта anama-app используем anama-app, для других проектов можно изменить
  static const String telegramFunctionUrl = 
      'https://us-central1-anama-app.cloudfunctions.net/sendTelegramMessage';

  /// Отправка данных заказа в Telegram бот
  /// Вызывается когда продавец нажимает "Вызвать курьера"
  Future<bool> sendCourierRequest({
    required String orderId,
    required String bookTitle,
    required String bookAuthor,
    required double bookPrice,
    required String parentName,
    required String parentPhone,
    required String deliveryAddress,
    String? deliveryNotes,
    required String sellerName,
    required String sellerPhone,
  }) async {
    try {
      final message = _formatCourierMessage(
        orderId: orderId,
        bookTitle: bookTitle,
        bookAuthor: bookAuthor,
        bookPrice: bookPrice,
        parentName: parentName,
        parentPhone: parentPhone,
        deliveryAddress: deliveryAddress,
        deliveryNotes: deliveryNotes,
        sellerName: sellerName,
        sellerPhone: sellerPhone,
      );

      final response = await http.post(
        Uri.parse(telegramFunctionUrl),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'message': message,
          'orderId': orderId,
        }),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        print('✅ Сообщение отправлено в Telegram бот');
        return true;
      } else {
        print('❌ Ошибка отправки в Telegram: ${response.statusCode}');
        print('Response: ${response.body}');
        return false;
      }
    } catch (e) {
      print('❌ Ошибка при отправке в Telegram: $e');
      return false;
    }
  }

  /// Форматирование сообщения для Telegram
  String _formatCourierMessage({
    required String orderId,
    required String bookTitle,
    required String bookAuthor,
    required double bookPrice,
    required String parentName,
    required String parentPhone,
    required String deliveryAddress,
    String? deliveryNotes,
    required String sellerName,
    required String sellerPhone,
  }) {
    final buffer = StringBuffer();
    buffer.writeln('🚚 *ВЫЗОВ КУРЬЕРА*');
    buffer.writeln('');
    buffer.writeln('📦 *Заказ #$orderId*');
    buffer.writeln('');
    buffer.writeln('📚 *Книга:*');
    buffer.writeln('$bookTitle');
    buffer.writeln('Автор: $bookAuthor');
    buffer.writeln('Цена: ${bookPrice.toStringAsFixed(0)} сум');
    buffer.writeln('');
    buffer.writeln('👤 *Покупатель:*');
    buffer.writeln('Имя: $parentName');
    buffer.writeln('Телефон: $parentPhone');
    buffer.writeln('');
    buffer.writeln('📍 *Адрес доставки:*');
    buffer.writeln('$deliveryAddress');
    if (deliveryNotes != null && deliveryNotes.isNotEmpty) {
      buffer.writeln('');
      buffer.writeln('📝 *Примечания:*');
      buffer.writeln('$deliveryNotes');
    }
    buffer.writeln('');
    buffer.writeln('🏪 *Продавец:*');
    buffer.writeln('$sellerName');
    buffer.writeln('Телефон: $sellerPhone');
    buffer.writeln('');
    buffer.writeln('⏰ Время: ${DateTime.now().toString().substring(0, 19)}');

    return buffer.toString();
  }
}

