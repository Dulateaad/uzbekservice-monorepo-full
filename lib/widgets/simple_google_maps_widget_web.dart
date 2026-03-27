import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'dart:ui_web' as ui_web;
import 'dart:html' as html;
import '../services/google_maps_service.dart';

/// Web реализация Google Maps
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
  static const String _viewType = 'simple-google-map-view';
  static int _viewIdCounter = 0;
  
  late final int _viewId;
  String? _containerId;
  bool _isMapReady = false;
  bool _initializationError = false;
  late final Future<void> _initializeFuture;

  @override
  void initState() {
    super.initState();
    _viewId = _viewIdCounter++;
    _containerId = '$_viewType-$_viewId';
    _initializeFuture = _initialize();
  }

  Future<void> _createMapAfterRender() async {
    await Future.delayed(const Duration(milliseconds: 500));
    
    html.Element? containerElement;
    int attempts = 0;
    while (containerElement == null && attempts < 30) {
      await Future.delayed(const Duration(milliseconds: 100));
      containerElement = html.document.getElementById(_containerId!);
      attempts++;
    }
    
    if (containerElement == null) {
      print('⚠️ Контейнер не найден в DOM после ожидания');
      return;
    }
    
    try {
      final map = await GoogleMapsService.createMap(
        containerId: _containerId!,
        lat: widget.lat,
        lng: widget.lng,
        zoom: widget.zoom,
      );
      
      if (map != null) {
        await Future.delayed(const Duration(milliseconds: 100));
        
        try {
          GoogleMapsService.addMarker(
            map: map,
            lat: widget.lat,
            lng: widget.lng,
            title: 'Мое местоположение',
          );
        } catch (e) {
          print('⚠️ Не удалось добавить маркер пользователя: $e');
        }
        
        if (widget.markers != null && widget.markers!.isNotEmpty) {
          for (final markerData in widget.markers!) {
            try {
              final lat = markerData['lat'] as double?;
              final lng = markerData['lng'] as double?;
              final title = markerData['title'] as String? ?? '';
              
              if (lat != null && lng != null) {
                GoogleMapsService.addMarker(
                  map: map,
                  lat: lat,
                  lng: lng,
                  title: title,
                );
              }
            } catch (e) {
              print('⚠️ Не удалось добавить маркер специалиста: $e');
            }
          }
        }
      }
    } catch (e) {
      print('❌ Ошибка создания карты: $e');
    }
  }

  Future<void> _initialize() async {
    try {
      await GoogleMapsService.initialize();
      
      if (_containerId != null) {
        final oldContainer = html.document.getElementById(_containerId!);
        if (oldContainer != null) {
          oldContainer.remove();
        }
        
        final container = html.DivElement()
          ..id = _containerId!
          ..style.width = '100%'
          ..style.height = '100%'
          ..style.position = 'relative'
          ..style.overflow = 'hidden'
          ..style.display = 'block'
          ..style.margin = '0'
          ..style.padding = '0';
        
        ui_web.platformViewRegistry.registerViewFactory(
          _viewType + _viewId.toString(),
          (int viewId) => container,
        );
        
        if (mounted) {
          setState(() {
            _isMapReady = true;
          });
        }
        
        _createMapAfterRender();
      }
    } catch (e) {
      _initializationError = true;
      print('❌ Ошибка инициализации Google Maps: $e');
      if (mounted) {
        setState(() {});
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_initializationError) {
      return _errorPlaceholder();
    }

    if (!_isMapReady) {
      return _placeholder();
    }

    return Container(
      height: widget.height,
      width: widget.width,
      decoration: const BoxDecoration(
        color: Colors.transparent,
      ),
      child: HtmlElementView(
        viewType: _viewType + _viewId.toString(),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      height: widget.height,
      width: widget.width,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Center(
        child: CircularProgressIndicator(),
      ),
    );
  }

  Widget _errorPlaceholder() {
    return Container(
      height: widget.height,
      width: widget.width,
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.redAccent.withOpacity(0.5)),
      ),
      child: const Center(
        child: Text(
          'Не удалось загрузить карту',
          style: TextStyle(color: Colors.redAccent),
        ),
      ),
    );
  }
  
  @override
  void dispose() {
    if (_containerId != null) {
      final container = html.document.getElementById(_containerId!);
      container?.remove();
    }
    super.dispose();
  }
}

