import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'screens/anama_age_band_screen.dart';
import 'screens/anama_home_screen.dart';
import 'screens/anama_privacy_screen.dart';
import 'screens/anama_pulse_screen.dart';
import 'screens/anama_quiz_screen.dart';
import 'screens/anama_result_screen.dart';
import 'screens/anama_pilot_monitor_screen.dart';
import 'screens/anama_start_screen.dart';

class AnamaPilotRoot extends ConsumerWidget {
  const AnamaPilotRoot({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Anama',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2E7D6B)),
        useMaterial3: true,
      ),
      routerConfig: _router,
    );
  }
}

final GoRouter _router = GoRouter(
  initialLocation: '/',
  redirect: (context, state) {
    var path = state.uri.path;
    if (path.isEmpty) path = '/';
    if (path.length > 1 && path.endsWith('/')) {
      path = path.substring(0, path.length - 1);
    }
    if (path == '/anama') return '/';
    if (path.startsWith('/anama/')) {
      return path.substring('/anama'.length);
    }
    if (path == '/pilot') return '/test';
    if (path.startsWith('/pilot/')) {
      final sub = path.substring('/pilot'.length);
      return sub == '/age' || sub == '/quiz' || sub == '/pulse' || sub == '/result'
          ? sub
          : '/test$sub';
    }
    return null;
  },
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const AnamaHomeScreen(),
    ),
    GoRoute(
      path: '/test',
      builder: (context, state) => const AnamaStartScreen(),
    ),
    GoRoute(
      path: '/privacy',
      builder: (context, state) => const AnamaPrivacyScreen(),
    ),
    GoRoute(
      path: '/age',
      builder: (context, state) => const AnamaAgeBandScreen(),
    ),
    GoRoute(
      path: '/quiz',
      builder: (context, state) => const AnamaQuizScreen(),
    ),
    GoRoute(
      path: '/pulse',
      builder: (context, state) => const AnamaPulseScreen(),
    ),
    GoRoute(
      path: '/result',
      builder: (context, state) {
        final extra = state.extra;
        final map = extra is Map<String, dynamic>
            ? extra
            : <String, dynamic>{};
        return AnamaResultScreen(mergeResult: map);
      },
    ),
    GoRoute(
      path: '/monitor',
      builder: (context, state) => const AnamaPilotMonitorScreen(),
    ),
  ],
);
