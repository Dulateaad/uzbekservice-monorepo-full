import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/anama_pilot_flow_provider.dart';
import '../services/anama_merge_service.dart';
import '../services/anama_rmssd.dart';
import '../services/anama_rtdb_service.dart';

class AnamaPulseScreen extends ConsumerStatefulWidget {
  const AnamaPulseScreen({super.key});

  @override
  ConsumerState<AnamaPulseScreen> createState() => _AnamaPulseScreenState();
}

class _AnamaPulseScreenState extends ConsumerState<AnamaPulseScreen> {
  final _deviceCtrl = TextEditingController(text: 'child_01');
  final List<double> _rrBuffer = [];
  bool _merging = false;
  dynamic _lastSeenTs;
  dynamic _lastSeenRr;

  @override
  void dispose() {
    _deviceCtrl.dispose();
    super.dispose();
  }

  String get _deviceId =>
      _deviceCtrl.text.trim().isEmpty ? 'child_01' : _deviceCtrl.text.trim();

  void _appendRr(dynamic raw) {
    if (raw == null) return;
    final n = (raw is num) ? raw.toDouble() : double.tryParse(raw.toString());
    if (n == null || n < 200 || n > 3000) return;
    setState(() {
      _rrBuffer.add(n);
      while (_rrBuffer.length > 30) {
        _rrBuffer.removeAt(0);
      }
    });
  }

  Future<void> _finish() async {
    final flow = ref.read(anamaPilotFlowProvider);
    final sessionId = flow.sessionId;
    if (sessionId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Нет sessionId — пройдите опрос снова')),
      );
      return;
    }

    ref.read(anamaPilotFlowProvider.notifier).setDeviceId(_deviceId);

    setState(() => _merging = true);
    try {
      final merge = AnamaMergeService();
      final result = await merge.merge(
        sessionId: sessionId,
        deviceId: _deviceId,
      );
      if (!mounted) return;
      context.go('/pilot/result', extra: result);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Ошибка объединения данных: $e')),
      );
    } finally {
      if (mounted) setState(() => _merging = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final rmssd = computeRmssdMs(_rrBuffer);
    final localStatus = stressStatusFromRmssd(rmssd);

    return Scaffold(
      appBar: AppBar(title: const Text('Пульс и телеметрия')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Text(
            'Укажите тот же ID, что в прошивке ESP32 (путь /users/{id}/telemetry). '
            'Приложите палец к датчику и дождитесь стабильных значений.',
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _deviceCtrl,
            decoration: const InputDecoration(
              labelText: 'Device ID',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 20),
          StreamBuilder(
            stream: AnamaRtdbService.telemetryStream(_deviceId),
            builder: (context, snap) {
              final map = snap.data;
              if (map != null) {
                final ts = map['timestamp'];
                final rr = map['last_rr'];
                if (ts != _lastSeenTs || rr != _lastSeenRr) {
                  _lastSeenTs = ts;
                  _lastSeenRr = rr;
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (!mounted) return;
                    _appendRr(rr);
                  });
                }
              }
              final bpm = map?['bpm'];
              final status = map?['status']?.toString() ?? '—';
              final lastRr = map?['last_rr'];
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Статус датчика: $status'),
                      Text('BPM: ${bpm ?? "—"}'),
                      Text('last_rr (мс): ${lastRr ?? "—"}'),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          Card(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Локальный RMSSD (пилот, до 30 ударов): '
                    '${rmssd.toStringAsFixed(1)} мс',
                  ),
                  Text('Ориентир на экране: $localStatus'),
                  Text('Точек RR в буфере: ${_rrBuffer.length}'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Для точного RMSSD на сервере прошивка должна писать массив '
            'RR в Realtime Database: users/{id}/rr_history (20–30 интервалов в мс). '
            'Иначе сервер использует только last_rr и буфер на экране.',
            style: TextStyle(fontSize: 12),
          ),
          const SizedBox(height: 8),
          const Text(
            'Окончательный статус и рекомендации считает сервер после нажатия кнопки.',
            style: TextStyle(fontSize: 12),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _merging ? null : _finish,
            child: Text(_merging ? 'Отправка…' : 'Получить итог и рекомендации'),
          ),
        ],
      ),
    );
  }
}
