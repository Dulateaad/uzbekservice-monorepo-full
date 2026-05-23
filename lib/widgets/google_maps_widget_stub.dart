import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

import 'free_map_widget.dart';

/// Маркер для [GoogleMapsWidget] (совместимость со старым API).
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

/// Карта выбора точки / просмотра на бесплатных тайлах (OSM / CARTO).
class GoogleMapsWidget extends StatelessWidget {
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
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width,
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
        child: FreeMapWidget(
          lat: lat,
          lng: lng,
          zoom: zoom,
          height: height,
          width: width,
          markers: markers
              ?.map((m) => <String, dynamic>{
                    'lat': m.lat,
                    'lng': m.lng,
                    'title': m.title,
                  })
              .toList(),
          showUserMarker: showCurrentLocation,
          onMapTap: onLocationChanged == null
              ? null
              : (LatLng ll) {
                  onLocationChanged!(ll.latitude, ll.longitude);
                },
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
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
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
