/// Конфигурация Gemini API.
/// Установите API ключ через:
/// - dart-define: GEMINI_API_KEY=your_key при сборке
/// - или window.GEMINI_API_KEY в index.html (для web)
class GeminiConfig {
  static const String _buildTimeKey = String.fromEnvironment(
    'GEMINI_API_KEY',
    defaultValue: '',
  );

  static String? _runtimeKey;

  /// Установить ключ в runtime (для web из index.html)
  static void setApiKey(String? key) {
    _runtimeKey = key;
  }

  static String get apiKey {
    if (_runtimeKey != null && _runtimeKey!.isNotEmpty) return _runtimeKey!;
    return _buildTimeKey;
  }

  static bool get isConfigured => apiKey.isNotEmpty;
}
