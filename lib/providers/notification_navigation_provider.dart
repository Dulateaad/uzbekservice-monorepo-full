import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Провайдер для навигации при клике на push-уведомление
class NotificationNavigationProvider {
  static GoRouter? _router;
  
  /// Устанавливает router для навигации
  static void setRouter(GoRouter router) {
    _router = router;
  }
  
  /// Обрабатывает навигацию на основе данных уведомления
  static void handleNavigation(Map<String, dynamic> data) {
    if (_router == null) {
      print('⚠️ Router не установлен для навигации');
      return;
    }

    final type = data['type'] as String?;
    
    try {
      switch (type) {
        case 'order':
          final orderId = data['orderId'] as String?;
          if (orderId != null) {
            print('📱 Навигация к заказу: $orderId');
            _router!.go('/home/orders/$orderId');
          }
          break;
          
        case 'chat':
          final chatId = data['chatId'] as String?;
          if (chatId != null) {
            print('📱 Навигация к чату: $chatId');
            _router!.go('/home/chat/$chatId');
          }
          break;
          
        case 'specialist':
          final specialistId = data['specialistId'] as String?;
          if (specialistId != null) {
            print('📱 Навигация к специалисту: $specialistId');
            _router!.go('/home/specialist/$specialistId');
          }
          break;
          
        case 'bh_crm_notification':
          print('📱 Навигация: уведомления Business Hub CRM');
          _router!.go('/home/services/business-hub/crm/notifications');
          break;

        default:
          print('📱 Неизвестный тип уведомления: $type');
          // По умолчанию переходим на главную
          _router!.go('/home');
      }
    } catch (e) {
      print('❌ Ошибка навигации: $e');
      // В случае ошибки переходим на главную
      _router!.go('/home');
    }
  }
}

