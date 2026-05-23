import 'package:flutter_map/flutter_map.dart';

/// Стили бесплатных растровых тайлов (данные OpenStreetMap; без ключей Google).
/// OpenFreeMap в основном отдаёт векторные PBF — для [flutter_map] удобнее Carto/OSM.
enum OpenMapTileStyle {
  /// CARTO Voyager — читаемая цветная подложка
  cartoVoyager,

  /// CARTO Positron — светлая минималистичная
  cartoLight,

  /// Прямые тайлы OSM (см. https://operations.osmfoundation.org/policies/tiles/)
  openStreetMap,
}

/// Идентификатор приложения для User-Agent (требование тайловых политик).
const String kOpenMapUserAgentPackage = 'odo_uz_app';

String _attributionFor(OpenMapTileStyle style) {
  switch (style) {
    case OpenMapTileStyle.cartoVoyager:
    case OpenMapTileStyle.cartoLight:
      return '© OpenStreetMap contributors © CARTO';
    case OpenMapTileStyle.openStreetMap:
      return '© OpenStreetMap contributors';
  }
}

/// Слой тайлов + короткая строка атрибуции для подписи под картой.
({TileLayer tileLayer, String attribution}) openMapTileLayer(OpenMapTileStyle style) {
  switch (style) {
    case OpenMapTileStyle.cartoVoyager:
      return (
        tileLayer: TileLayer(
          urlTemplate: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
          subdomains: const ['a', 'b', 'c', 'd'],
          userAgentPackageName: kOpenMapUserAgentPackage,
          maxNativeZoom: 20,
        ),
        attribution: _attributionFor(style),
      );
    case OpenMapTileStyle.cartoLight:
      return (
        tileLayer: TileLayer(
          urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          subdomains: const ['a', 'b', 'c', 'd'],
          userAgentPackageName: kOpenMapUserAgentPackage,
          maxNativeZoom: 20,
        ),
        attribution: _attributionFor(style),
      );
    case OpenMapTileStyle.openStreetMap:
      return (
        tileLayer: TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: kOpenMapUserAgentPackage,
          maxNativeZoom: 19,
        ),
        attribution: _attributionFor(style),
      );
  }
}
