import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Индекс вкладки нижнего меню в [MainScreen] (0 — первая вкладка).
final mainShellTabIndexProvider = StateProvider<int>((ref) => 0);
