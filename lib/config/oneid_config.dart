/// Конфигурация для OneID OAuth2 интеграции
class OneIdConfig {
  // OneID OAuth2 credentials
  // ⚠️ В production эти значения должны храниться на сервере!
  // Используйте Firebase Remote Config или environment variables
  static const String clientId = String.fromEnvironment(
    'ONEID_CLIENT_ID',
    defaultValue: 'odo_uz',
  );
  
  static const String clientSecret = String.fromEnvironment(
    'ONEID_CLIENT_SECRET',
    defaultValue: '8H8dcZ118ix2arY7w5ObjrfN',
  );
  
  // URL бэкенда на Firebase Functions
  static const String backendUrl = 'https://us-central1-odo-uz-app.cloudfunctions.net';
  
  // OAuth endpoints
  static const String loginEndpoint = '$backendUrl/oneidLogin';
  static const String callbackEndpoint = '$backendUrl/oneidCallback';
  static const String userInfoEndpoint = '$backendUrl/oneidUser';
  
  // Mobile app redirect scheme (для deep linking после получения токена)
  static const String redirectScheme = 'odouzapp';
  static const String mobileRedirectUri = '$redirectScheme://oneid/callback';
  
  // HTTP redirect_uri для OneID (OneID требует HTTP/HTTPS, не поддерживает custom scheme)
  static const String redirectUri = '$backendUrl/oneidCallback';
  
  // OneID scopes
  static const List<String> scopes = ['openid', 'profile', 'email'];
  
  // Timeout settings
  static const Duration requestTimeout = Duration(seconds: 30);
  
  /// Проверка, что конфигурация настроена
  static bool get isConfigured {
    return clientId.isNotEmpty && clientSecret.isNotEmpty;
  }
  
  /// Получить конфигурацию для отладки (без секретных данных)
  static Map<String, dynamic> get debugConfig {
    return {
      'clientId': clientId,
      'backendUrl': backendUrl,
      'redirectUri': redirectUri,
      'scopes': scopes,
      'isConfigured': isConfigured,
      // clientSecret не включаем в debug для безопасности
    };
  }
  
  /// Проверка, является ли URL callback от OneID
  static bool isOneIdCallback(String url) {
    return url.startsWith(redirectUri);
  }
  
  /// Извлечение кода из callback URL
  static String? extractCodeFromCallback(String url) {
    final uri = Uri.parse(url);
    return uri.queryParameters['code'];
  }
  
  /// Извлечение ошибки из callback URL
  static String? extractErrorFromCallback(String url) {
    final uri = Uri.parse(url);
    return uri.queryParameters['error'] ?? uri.queryParameters['error_description'];
  }
}
