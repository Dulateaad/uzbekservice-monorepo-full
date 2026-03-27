import 'dart:async';
import 'dart:html' as html;
import 'dart:js' as js;
import 'package:flutter/foundation.dart';

/// Web реализация Cloudflare Turnstile
class CloudflareTurnstileService {
  static const String _siteKey = '0x4AAAAAACWJJb3IFlkh5sHY';
  
  static String? _currentToken;
  static bool _isInitialized = false;
  
  static String get siteKey => _siteKey;
  static bool get isInitialized => _isInitialized;
  static String? get currentToken => _currentToken;
  
  static Future<void> renderWidget(String containerId, {Function(String)? onSuccess}) async {
    if (!kIsWeb) {
      print('⚠️ Turnstile доступен только на веб-платформе');
      return;
    }
    
    try {
      final completer = Completer<void>();
      
      js.context['turnstileCallback_$containerId'] = (String token) {
        _currentToken = token;
        _isInitialized = true;
        print('✅ Cloudflare Turnstile: токен получен');
        if (onSuccess != null) {
          onSuccess(token);
        }
        if (!completer.isCompleted) {
          completer.complete();
        }
      };
      
      js.context.callMethod('renderTurnstile', [
        containerId,
        _siteKey,
        js.context['turnstileCallback_$containerId']
      ]);
      
      await completer.future.timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          print('⚠️ Turnstile: таймаут ожидания');
        },
      );
    } catch (e) {
      print('❌ Ошибка инициализации Turnstile: $e');
    }
  }
  
  static String? getToken() {
    if (!kIsWeb) return null;
    
    try {
      final token = js.context.callMethod('getTurnstileToken');
      if (token != null) {
        _currentToken = token.toString();
        return _currentToken;
      }
    } catch (e) {
      print('❌ Ошибка получения токена Turnstile: $e');
    }
    
    return _currentToken;
  }
  
  static bool isVerified() {
    final token = getToken();
    return token != null && token.isNotEmpty;
  }
  
  static void reset() {
    if (!kIsWeb) return;
    
    try {
      js.context.callMethod('resetTurnstile');
      _currentToken = null;
      _isInitialized = false;
      print('🔄 Turnstile сброшен');
    } catch (e) {
      print('❌ Ошибка сброса Turnstile: $e');
    }
  }
  
  static Future<bool> verifyTokenOnServer(String token) async {
    return token.isNotEmpty;
  }
}

