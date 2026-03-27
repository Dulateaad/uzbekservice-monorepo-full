/// Stub реализация для мобильных платформ
class WebUtils {
  static void redirect(String url) {
    // На мобильных платформах не делаем ничего
    print('WebUtils.redirect called on mobile - ignoring');
  }
  
  static void reload() {
    // На мобильных платформах не делаем ничего
  }
  
  static String? getLocationHref() {
    return null;
  }
}

