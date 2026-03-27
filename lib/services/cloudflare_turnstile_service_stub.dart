/// Stub реализация Cloudflare Turnstile для мобильных платформ
class CloudflareTurnstileService {
  static const String _siteKey = '0x4AAAAAACWJJb3IFlkh5sHY';
  
  static String? _currentToken;
  static bool _isInitialized = false;
  
  static String get siteKey => _siteKey;
  static bool get isInitialized => _isInitialized;
  static String? get currentToken => _currentToken;
  
  /// На мобильных платформах Turnstile не нужен - автоматически "верифицируем"
  static Future<void> renderWidget(String containerId, {Function(String)? onSuccess}) async {
    _currentToken = 'mobile-bypass-token';
    _isInitialized = true;
    if (onSuccess != null) {
      onSuccess(_currentToken!);
    }
  }
  
  static String? getToken() {
    return _currentToken ?? 'mobile-bypass-token';
  }
  
  static bool isVerified() {
    return true; // На мобильных всегда верифицирован
  }
  
  static void reset() {
    _currentToken = null;
    _isInitialized = false;
  }
  
  static Future<bool> verifyTokenOnServer(String token) async {
    return true;
  }
}

