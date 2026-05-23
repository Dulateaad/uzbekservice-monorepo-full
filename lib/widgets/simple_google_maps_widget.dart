import 'package:flutter/material.dart';

import 'free_map_widget.dart';

/// Простая карта (ранее обёртка над Google Maps). Сейчас — бесплатные тайлы OSM/CARTO на всех платформах.
class SimpleGoogleMapsWidget extends StatelessWidget {
  final double lat;
  final double lng;
  final int zoom;
  final double height;
  final double width;
  final List<Map<String, dynamic>>? markers;
  final ValueChanged<Map<String, dynamic>>? onMarkerTap;

  const SimpleGoogleMapsWidget({
    super.key,
    required this.lat,
    required this.lng,
    this.zoom = 15,
    this.height = 300,
    this.width = double.infinity,
    this.markers,
    this.onMarkerTap,
  });

  @override
  Widget build(BuildContext context) {
    return FreeMapWidget(
      lat: lat,
      lng: lng,
      zoom: zoom,
      height: height,
      width: width,
      markers: markers,
      onMarkerTap: onMarkerTap,
    );
  }
}
