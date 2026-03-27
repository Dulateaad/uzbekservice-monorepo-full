import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

// Условный импорт - web версия или stub
import 'cloudflare_turnstile_widget_stub.dart'
    if (dart.library.html) 'cloudflare_turnstile_widget_web.dart'
    as platform_impl;

/// Виджет для отображения Cloudflare Turnstile
class CloudflareTurnstileWidget extends StatelessWidget {
  final Function(String token)? onVerified;
  final Function()? onError;
  final double height;
  final String siteKey;
  final Function(String)? onTokenReceived;
  final Function()? onExpired;
  
  const CloudflareTurnstileWidget({
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
    if (!kIsWeb) {
      // На мобильных платформах - пустой виджет
      return const SizedBox.shrink();
    }
    
    return platform_impl.CloudflareTurnstileWidgetImpl(
      onVerified: onVerified,
      onError: onError,
      height: height,
      siteKey: siteKey,
      onTokenReceived: onTokenReceived,
      onExpired: onExpired,
    );
  }
}
