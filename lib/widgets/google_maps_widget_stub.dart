import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;

/// Класс для маркеров на карте
class MapMarker {
  final double lat;
  final double lng;
  final String? title;
  final String? icon;

  const MapMarker({
    required this.lat,
    required this.lng,
    this.title,
    this.icon,
  });
}

/// Native реализация Google Maps для iOS/Android
class GoogleMapsWidget extends StatefulWidget {
  final double lat;
  final double lng;
  final int zoom;
  final List<MapMarker>? markers;
  final bool showCurrentLocation;
  final Function(double lat, double lng)? onLocationChanged;
  final double height;
  final double width;

  const GoogleMapsWidget({
    super.key,
    required this.lat,
    required this.lng,
    this.zoom = 15,
    this.markers,
    this.showCurrentLocation = false,
    this.onLocationChanged,
    this.height = 300,
    this.width = double.infinity,
  });

  @override
  State<GoogleMapsWidget> createState() => _GoogleMapsWidgetState();
}

class _GoogleMapsWidgetState extends State<GoogleMapsWidget> {
  gmaps.GoogleMapController? _controller;
  Set<gmaps.Marker> _markers = {};

  @override
  void initState() {
    super.initState();
    _buildMarkers();
  }

  void _buildMarkers() {
    final markers = <gmaps.Marker>{};
    
    if (widget.showCurrentLocation) {
      markers.add(
        gmaps.Marker(
          markerId: const gmaps.MarkerId('current_location'),
          position: gmaps.LatLng(widget.lat, widget.lng),
          infoWindow: const gmaps.InfoWindow(title: 'Мое местоположение'),
          icon: gmaps.BitmapDescriptor.defaultMarkerWithHue(gmaps.BitmapDescriptor.hueBlue),
        ),
      );
    }
    
    if (widget.markers != null) {
      for (int i = 0; i < widget.markers!.length; i++) {
        final m = widget.markers![i];
        markers.add(
          gmaps.Marker(
            markerId: gmaps.MarkerId('marker_$i'),
            position: gmaps.LatLng(m.lat, m.lng),
            infoWindow: gmaps.InfoWindow(title: m.title ?? ''),
          ),
        );
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
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: gmaps.GoogleMap(
          initialCameraPosition: gmaps.CameraPosition(
            target: gmaps.LatLng(widget.lat, widget.lng),
            zoom: widget.zoom.toDouble(),
          ),
          markers: _markers,
          myLocationEnabled: widget.showCurrentLocation,
          myLocationButtonEnabled: widget.showCurrentLocation,
          zoomControlsEnabled: true,
          onMapCreated: (controller) {
            _controller = controller;
          },
          onTap: widget.onLocationChanged != null 
              ? (position) {
                  widget.onLocationChanged!(position.latitude, position.longitude);
                }
              : null,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }
}

/// Виджет для выбора местоположения
class LocationPickerWidget extends StatefulWidget {
  final double? initialLat;
  final double? initialLng;
  final Function(double lat, double lng) onLocationSelected;
  final String? hint;

  const LocationPickerWidget({
    super.key,
    this.initialLat,
    this.initialLng,
    required this.onLocationSelected,
    this.hint,
  });

  @override
  State<LocationPickerWidget> createState() => _LocationPickerWidgetState();
}

class _LocationPickerWidgetState extends State<LocationPickerWidget> {
  double _selectedLat = 41.2995;
  double _selectedLng = 69.2401;

  @override
  void initState() {
    super.initState();
    if (widget.initialLat != null && widget.initialLng != null) {
      _selectedLat = widget.initialLat!;
      _selectedLng = widget.initialLng!;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.hint != null) ...[
          Text(
            widget.hint!,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 12),
        ],
        
        Container(
          height: 300,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: GoogleMapsWidget(
            lat: _selectedLat,
            lng: _selectedLng,
            zoom: 15,
            showCurrentLocation: true,
            onLocationChanged: (lat, lng) {
              setState(() {
                _selectedLat = lat;
                _selectedLng = lng;
              });
              widget.onLocationSelected(lat, lng);
            },
          ),
        ),
        
        const SizedBox(height: 16),
        
        ElevatedButton(
          onPressed: () {
            widget.onLocationSelected(_selectedLat, _selectedLng);
            Navigator.of(context).pop();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF00E676),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: const Text(
            'Выбрать это местоположение',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

