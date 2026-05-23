import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AnamaHomeScreen extends StatelessWidget {
  const AnamaHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 24),

                    // --- Logo ---
                    Container(
                      width: 88,
                      height: 88,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: [cs.primary, cs.primary.withOpacity(.7)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: cs.primary.withOpacity(.25),
                            blurRadius: 24,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: const Icon(Icons.monitor_heart_outlined,
                          color: Colors.white, size: 44),
                    ),
                    const SizedBox(height: 20),

                    Text(
                      'Anama',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.headlineLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -.5,
                        color: cs.primary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Поддержка эмоционального благополучия',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: cs.onSurfaceVariant,
                        height: 1.4,
                      ),
                    ),

                    const SizedBox(height: 36),

                    // --- Info cards ---
                    _InfoCard(
                      icon: Icons.school_outlined,
                      title: 'Школьный пилот',
                      body: 'Короткий опрос самочувствия + измерение пульса '
                          'через ESP32-датчик.',
                    ),
                    const SizedBox(height: 12),
                    _InfoCard(
                      icon: Icons.shield_outlined,
                      title: 'Обезличенные данные',
                      body: 'Анонимный вход, без ФИО и телефона. '
                          'Это не медицинская диагностика.',
                    ),
                    const SizedBox(height: 12),
                    _InfoCard(
                      icon: Icons.insights_outlined,
                      title: 'Результаты и инсайты',
                      body: 'RMSSD-анализ на сервере, рекомендации и ссылки на '
                          'научные источники (Harvard, UpToDate).',
                    ),

                    const SizedBox(height: 36),

                    // --- CTA ---
                    FilledButton.icon(
                      onPressed: () => context.go('/test'),
                      icon: const Icon(Icons.play_arrow_rounded),
                      label: const Text('Начать тест'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(52),
                        textStyle: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: () => context.go('/monitor'),
                      icon: const Icon(Icons.bar_chart_rounded, size: 20),
                      label: const Text('Мониторинг (агрегаты)'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextButton(
                      onPressed: () => context.go('/privacy'),
                      child: const Text('Политика и дисклеймер'),
                    ),

                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest.withOpacity(.45),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cs.outlineVariant.withOpacity(.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: cs.primary.withOpacity(.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: cs.primary, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                      color: cs.onSurface,
                    )),
                const SizedBox(height: 4),
                Text(body,
                    style: TextStyle(
                      fontSize: 13,
                      color: cs.onSurfaceVariant,
                      height: 1.4,
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
