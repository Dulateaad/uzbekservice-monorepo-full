import 'dart:html' as html;

import 'gemini_config.dart';

/// Инициализация Gemini API ключа для web (из window.GEMINI_API_KEY)
void initGeminiConfigForWeb() {
  try {
    final key = (html.window as dynamic).GEMINI_API_KEY;
    if (key != null && key.toString().trim().isNotEmpty) {
      GeminiConfig.setApiKey(key.toString().trim());
      print('✅ Gemini API ключ загружен');
    }
  } catch (_) {}
}
