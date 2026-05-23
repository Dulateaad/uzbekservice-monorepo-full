import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../config/open_map_tiles.dart';

/// Карта на бесплатных тайлах (OpenStreetMap / CARTO). Работает на iOS, Android и Web без Google Maps JS.
class FreeMapWidget extends StatefulWidget {
  final double lat;
  final double lng;
  final int zoom;
  final double height;
  final double width;
  /// Элементы: `lat`, `lng`, опционально `title`, `id`, `category`
  final List<Map<String, dynamic>>? markers;
  final bool showUserMarker;
  final ValueChanged<LatLng>? onMapTap;
  final ValueChanged<Map<String, dynamic>>? onMarkerTap;
  final OpenMapTileStyle tileStyle;
  final BorderRadius? borderRadius;

  const FreeMapWidget({
    super.key,
    required this.lat,
    required this.lng,
    this.zoom = 15,
    this.height = 300,
    this.width = double.infinity,
    this.markers,
    this.showUserMarker = true,
    this.onMapTap,
    this.onMarkerTap,
    this.tileStyle = OpenMapTileStyle.cartoVoyager,
    this.borderRadius,
  });

  @override
  State<FreeMapWidget> createState() => _FreeMapWidgetState();
}

class _FreeMapWidgetState extends State<FreeMapWidget> {
  final MapController _mapController = MapController();

  @override
  void didUpdateWidget(FreeMapWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.lat != widget.lat || oldWidget.lng != widget.lng) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _mapController.move(LatLng(widget.lat, widget.lng), _mapController.camera.zoom);
      });
    }
  }

  List<Marker> _buildMarkers() {
    final out = <Marker>[];
    final userPoint = LatLng(widget.lat, widget.lng);

    if (widget.showUserMarker) {
      out.add(
        Marker(
          point: userPoint,
          width: 32,
          height: 32,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.blue,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: [
                BoxShadow(
                  color: Colors.blue.withOpacity(0.35),
                  blurRadius: 8,
                  spreadRadius: 1,
                ),
              ],
            ),
          ),
        ),
      );
    }

    final raw = widget.markers;
    if (raw == null) return out;

    for (final m in raw) {
      final lat = (m['lat'] as num?)?.toDouble();
      final lng = (m['lng'] as num?)?.toDouble();
      if (lat == null || lng == null) continue;
      final title = m['title'] as String? ?? '';
      final point = LatLng(lat, lng);
      out.add(
        Marker(
          point: point,
          width: 44,
          height: 52,
          alignment: Alignment.bottomCenter,
          child: GestureDetector(
            onTap: () => widget.onMarkerTap?.call(m),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (title.isNotEmpty)
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 120),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                      margin: const EdgeInsets.only(bottom: 2),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.12),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                const Icon(Icons.location_on, color: Color(0xFFE53935), size: 40),
              ],
            ),
          ),
        ),
      );
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final userPoint = LatLng(widget.lat, widget.lng);
    final layerPack = openMapTileLayer(widget.tileStyle);
    final radius = widget.borderRadius ?? BorderRadius.zero;

    Widget map = FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: userPoint,
        initialZoom: widget.zoom.toDouble(),
        minZoom: 3,
        maxZoom: 20,
        onTap: widget.onMapTap == null
            ? null
            : (_, latLng) {
                widget.onMapTap!(latLng);
              },
      ),
      children: [
        layerPack.tileLayer,
        MarkerLayer(markers: _buildMarkers()),
        RichAttributionWidget(
          attributions: [
            TextSourceAttribution(
              layerPack.attribution,
              prependCopyright: false,
            ),
          ],
        ),
      ],
    );

    map = ClipRRect(
      borderRadius: radius,
      child: map,
    );

    return SizedBox(
      height: widget.height,
      width: widget.width,
      child: map,
    );
  }
}
