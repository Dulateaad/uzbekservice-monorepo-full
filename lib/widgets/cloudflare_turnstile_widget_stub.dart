import 'package:flutter/material.dart';

/// Stub реализация для мобильных платформ (iOS, Android)
class CloudflareTurnstileWidgetImpl extends StatelessWidget {
  final Function(String token)? onVerified;
  final Function()? onError;
  final double height;
  final String siteKey;
  final Function(String)? onTokenReceived;
  final Function()? onExpired;
  
  const CloudflareTurnstileWidgetImpl({
    super.key,
    this.onVerified,
    this.onError,
    this.height = 65,
    this.siteKey = '',
    this.onTokenReceived,
    this.onExpired,
  });

  @override
  Widget build(BuildContext context) {
    // На мобильных платформах Turnstile не нужен
    // Автоматически "верифицируем" пользователя
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (onVerified != null) {
        onVerified!('mobile-bypass-token');
      }
      if (onTokenReceived != null) {
        onTokenReceived!('mobile-bypass-token');
      }
    });
    
    return const SizedBox.shrink();
  }
}

