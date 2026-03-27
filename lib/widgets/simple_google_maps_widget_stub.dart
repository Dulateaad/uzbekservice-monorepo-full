import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Stub/Native реализация для мобильных платформ (iOS, Android)
class SimpleGoogleMapsWidgetImpl extends StatefulWidget {
  final double lat;
  final double lng;
  final int zoom;
  final double height;
  final double width;
  final List<Map<String, dynamic>>? markers;

  const SimpleGoogleMapsWidgetImpl({
    super.key,
    required this.lat,
    required this.lng,
    this.zoom = 15,
    this.height = 300,
    this.width = double.infinity,
    this.markers,
  });

  @override
  State<SimpleGoogleMapsWidgetImpl> createState() => _SimpleGoogleMapsWidgetImplState();
}

class _SimpleGoogleMapsWidgetImplState extends State<SimpleGoogleMapsWidgetImpl> {
  GoogleMapController? _controller;
  Set<Marker> _markers = {};

  @override
  void initState() {
    super.initState();
    _buildMarkers();
  }

  void _buildMarkers() {
    final markers = <Marker>{};
    
    // Маркер текущего местоположения
    markers.add(
      Marker(
        markerId: const MarkerId('current_location'),
        position: LatLng(widget.lat, widget.lng),
        infoWindow: const InfoWindow(title: 'Мое местоположение'),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
      ),
    );
    
    // Маркеры специалистов
    if (widget.markers != null) {
      for (int i = 0; i < widget.markers!.length; i++) {
        final m = widget.markers![i];
        final lat = m['lat'] as double?;
        final lng = m['lng'] as double?;
        final title = m['title'] as String? ?? 'Специалист';
        
        if (lat != null && lng != null) {
          markers.add(
            Marker(
              markerId: MarkerId('marker_$i'),
              position: LatLng(lat, lng),
              infoWindow: InfoWindow(title: title),
            ),
          );
        }
      }
    }
    
    setState(() {
      _markers = markers;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: widget.height,
      width: widget.width,
      clipBehavior: Clip.hardEdge,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
      ),
      child: GoogleMap(
        initialCameraPosition: CameraPosition(
          target: LatLng(widget.lat, widget.lng),
          zoom: widget.zoom.toDouble(),
        ),
        markers: _markers,
        myLocationEnabled: true,
        myLocationButtonEnabled: true,
        zoomControlsEnabled: true,
        onMapCreated: (controller) {
          _controller = controller;
        },
      ),
    );
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }
}

