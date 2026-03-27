import 'dart:async';

/// Заглушка для GoogleMapsService на мобильных платформах
/// Реальная реализация доступна только на веб-платформе
class GoogleMapsService {
  static bool _isInitialized = false;
  static bool _isMapReady = false;
  static Function? _onMapsReady;
  
  /// Инициализация Google Maps (заглушка для мобильных)
  static Future<void> initialize() async {
    _isInitialized = true;
    _isMapReady = false; // На мобильных используем нативные виджеты
    print('ℹ️ GoogleMapsService: На мобильных платформах используйте google_maps_flutter');
  }
  
  static Future<void> _loadGoogleMapsAPI() async {
    // Заглушка
  }
  
  static void _waitForGoogleMaps() {
    // Заглушка
  }
  
  static void setOnMapsReady(Function callback) {
    _onMapsReady = callback;
  }
  
  static bool get isReady => _isMapReady;
  
  static Future<dynamic> createMap({
    required String containerId,
    required double lat,
    required double lng,
    required int zoom,
    List<String>? markers,
  }) async {
    throw UnsupportedError('createMap доступен только на веб-платформе. Используйте GoogleMap виджет на мобильных.');
  }
  
  static dynamic addMarker({
    required dynamic map,
    required double lat,
    required double lng,
    String? title,
    String? icon,
  }) {
    throw UnsupportedError('addMarker доступен только на веб-платформе. Используйте Marker виджет на мобильных.');
  }
  
  static Future<List<Map<String, dynamic>>> searchPlaces({
    required String query,
    required double lat,
    required double lng,
    int radius = 5000,
  }) async {
    throw UnsupportedError('searchPlaces доступен только на веб-платформе. Используйте Places API на мобильных.');
  }
  
  static Future<Map<String, double>?> getCurrentLocation() async {
    throw UnsupportedError('getCurrentLocation доступен только на веб-платформе. Используйте geolocator на мобильных.');
  }
  
  static String getGoogleMapsApiKey() {
    return 'AIzaSyBFHmNf-RhcwfdfBJyqm20eEuQaybgHMgc';
  }
}

