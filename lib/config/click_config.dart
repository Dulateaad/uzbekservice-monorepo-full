/// Конфигурация для Click Payment
/// 
/// В production эти значения должны быть получены из environment variables
/// или из Firebase Remote Config
class ClickConfig {
  // ⚠️ ВАЖНО: В production эти значения должны храниться на сервере!
  // Используйте Firebase Remote Config или environment variables
  
  /// Merchant ID от Click
  /// Получить на: https://my.click.uz
  /// Проект: odo (SERVICE_ID: 84238)
  static const String merchantId = String.fromEnvironment(
    'CLICK_MERCHANT_ID',
    defaultValue: '46893', // odo project
  );
  
  /// Service ID от Click
  /// Проект: odo
  static const String serviceId = String.fromEnvironment(
    'CLICK_SERVICE_ID',
    defaultValue: '84238', // odo project
  );
  
  /// Secret Key от Click (НИКОГДА не храните в клиентском коде!)
  /// Должен использоваться только на сервере
  /// ⚠️ Это значение используется только для fallback, реальный secret_key на сервере
  static const String secretKey = String.fromEnvironment(
    'CLICK_SECRET_KEY',
    defaultValue: '', // Не храним в клиенте
  );
  
  /// URL для возврата после оплаты
  static const String returnUrl = 'odouzapp://payment/callback';
  
  /// Base URL для API Click
  static const String apiBaseUrl = 'https://my.click.uz/services/pay';
  
  /// URL для серверных endpoints (Firebase Functions)
  static const String serverBaseUrl = String.fromEnvironment(
    'CLICK_SERVER_URL',
    defaultValue: 'https://us-central1-odo-uz-app.cloudfunctions.net',
  );
  
  /// Проверка, что конфигурация настроена
  static bool get isConfigured {
    return merchantId.isNotEmpty &&
           serviceId.isNotEmpty &&
           merchantId != 'YOUR_MERCHANT_ID' &&
           serviceId != 'YOUR_SERVICE_ID';
  }
  
  /// Получить конфигурацию для отладки (без секретных данных)
  static Map<String, dynamic> get debugConfig {
    return {
      'merchantId': merchantId,
      'serviceId': serviceId,
      'returnUrl': returnUrl,
      'apiBaseUrl': apiBaseUrl,
      'serverBaseUrl': serverBaseUrl,
      'isConfigured': isConfigured,
    };
  }
}

