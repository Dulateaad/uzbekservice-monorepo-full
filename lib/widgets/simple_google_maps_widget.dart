import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

// Условный импорт
import 'simple_google_maps_widget_stub.dart'
    if (dart.library.html) 'simple_google_maps_widget_web.dart'
    as platform_impl;

class SimpleGoogleMapsWidget extends StatelessWidget {
  final double lat;
  final double lng;
  final int zoom;
  final double height;
  final double width;
  final List<Map<String, dynamic>>? markers;

  const SimpleGoogleMapsWidget({
    super.key,
    required this.lat,
    required this.lng,
    this.zoom = 15,
    this.height = 300,
    this.width = double.infinity,
    this.markers,
  });

  @override
  Widget build(BuildContext context) {
    return platform_impl.SimpleGoogleMapsWidgetImpl(
      lat: lat,
      lng: lng,
      zoom: zoom,
      height: height,
      width: width,
      markers: markers,
    );
  }
}
