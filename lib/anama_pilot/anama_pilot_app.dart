import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'anama_pilot_flags.dart';
import 'screens/anama_age_band_screen.dart';
import 'screens/anama_privacy_screen.dart';
import 'screens/anama_pulse_screen.dart';
import 'screens/anama_quiz_screen.dart';
import 'screens/anama_result_screen.dart';
import 'screens/anama_pilot_monitor_screen.dart';
import 'screens/anama_start_screen.dart';
import 'screens/anama_web_home_screen.dart';

/// Корневой виджет приложения пилота Anama (отдельная точка входа).
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

    if (!kAnamaPilotWebEnabled) {
      if (path == '/pilot' ||
          path.startsWith('/pilot/') ||
          path == '/anama' ||
          path.startsWith('/anama/')) {
        return '/';
      }
      return null;
    }

    if (path == '/anama' || path.startsWith('/anama/')) {
      final suffix = path == '/anama' ? '' : path.substring('/anama'.length);
      return '/pilot$suffix';
    }
    return null;
  },
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const AnamaWebHomeScreen(),
    ),
    if (kAnamaPilotWebEnabled) ...[
      GoRoute(
        path: '/pilot',
        builder: (context, state) => const AnamaStartScreen(),
      ),
      GoRoute(
        path: '/pilot/privacy',
        builder: (context, state) => const AnamaPrivacyScreen(),
      ),
      GoRoute(
        path: '/pilot/age',
        builder: (context, state) => const AnamaAgeBandScreen(),
      ),
      GoRoute(
        path: '/pilot/quiz',
        builder: (context, state) => const AnamaQuizScreen(),
      ),
      GoRoute(
        path: '/pilot/pulse',
        builder: (context, state) => const AnamaPulseScreen(),
      ),
      GoRoute(
        path: '/pilot/result',
        builder: (context, state) {
          final extra = state.extra;
          final map = extra is Map<String, dynamic>
              ? extra
              : <String, dynamic>{};
          return AnamaResultScreen(mergeResult: map);
        },
      ),
      GoRoute(
        path: '/pilot/monitor',
        builder: (context, state) => const AnamaPilotMonitorScreen(),
      ),
    ],
  ],
);
