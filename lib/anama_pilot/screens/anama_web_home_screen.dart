import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../anama_pilot_flags.dart';

/// Главная страница Anama Web.
class AnamaWebHomeScreen extends StatelessWidget {
  const AnamaWebHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Anama',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Поддержка эмоционального благополучия подростков.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      height: 1.45,
                    ),
                  ),
                  if (kAnamaPilotWebEnabled) ...[
                    const SizedBox(height: 32),
                    FilledButton(
                      onPressed: () => context.go('/pilot'),
                      child: const Text('Школьный пилот'),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: () => context.go('/pilot/monitor'),
                      child: const Text('Мониторинг пилота (агрегаты)'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
