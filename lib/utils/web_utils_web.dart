import 'dart:html' as html;

/// Web реализация
class WebUtils {
  static void redirect(String url) {
    html.window.location.href = url;
  }
  
  static void reload() {
    html.window.location.reload();
  }
  
  static String? getLocationHref() {
    return html.window.location.href;
  }
}

