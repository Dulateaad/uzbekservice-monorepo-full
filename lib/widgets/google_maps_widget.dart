import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

// Условный импорт
export 'google_maps_widget_stub.dart'
    if (dart.library.html) 'google_maps_widget_web.dart';
