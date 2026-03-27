import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../providers/anama_pilot_flow_provider.dart';
import '../services/anama_pilot_firestore_service.dart';

class AnamaQuizScreen extends ConsumerStatefulWidget {
  const AnamaQuizScreen({super.key});

  @override
  ConsumerState<AnamaQuizScreen> createState() => _AnamaQuizScreenState();
}

class _AnamaQuizScreenState extends ConsumerState<AnamaQuizScreen> {
  String _mood = '3';
  String _sleep = 'ok';
  String _stress = 'medium';

  Future<void> _continue() async {
    final notifier = ref.read(anamaPilotFlowProvider.notifier);
    final flow = ref.read(anamaPilotFlowProvider);
    final sessionId = notifier.ensureSessionId();
    final quiz = {
      'mood': _mood,
      'sleep': _sleep,
      'stress_self': _stress,
    };
    notifier.setQuiz(quiz);

    final prefs = await SharedPreferences.getInstance();
    final pilotLabel = prefs.getString('anama_pilot_label')?.trim();

    final fs = AnamaPilotFirestoreService();
    try {
      await fs.createSession(
        sessionId: sessionId,
        ageBand: flow.ageBand,
        deviceId: flow.deviceId,
        quiz: quiz,
        pilotLabel: pilotLabel != null && pilotLabel.isNotEmpty ? pilotLabel : null,
      );
      if (!mounted) return;
      context.go('/pilot/pulse');
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString();
      final hint = msg.contains('permission-denied') || msg.contains('PERMISSION_DENIED')
          ? '\n\nПроверьте: 1) Включён Anonymous в Auth. 2) Задеплоены правила: '
              'firebase deploy --only firestore:rules --project anama-app'
          : '';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Ошибка сохранения сессии: $e$hint'),
          duration: const Duration(seconds: 8),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Короткий опрос')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Text('Как вы себя чувствуете сегодня? (субъективно)'),
          const SizedBox(height: 8),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: '1', label: Text('1')),
              ButtonSegment(value: '2', label: Text('2')),
              ButtonSegment(value: '3', label: Text('3')),
              ButtonSegment(value: '4', label: Text('4')),
              ButtonSegment(value: '5', label: Text('5')),
            ],
            selected: {_mood},
            onSelectionChanged: (s) => setState(() => _mood = s.first),
          ),
          const SizedBox(height: 24),
          const Text('Сон'),
          RadioListTile(
            title: const Text('Нормально'),
            value: 'ok',
            groupValue: _sleep,
            onChanged: (v) => setState(() => _sleep = v!),
          ),
          RadioListTile(
            title: const Text('Мало / усталость'),
            value: 'tired',
            groupValue: _sleep,
            onChanged: (v) => setState(() => _sleep = v!),
          ),
          const SizedBox(height: 16),
          const Text('Субъективный стресс'),
          RadioListTile(
            title: const Text('Низкий'),
            value: 'low',
            groupValue: _stress,
            onChanged: (v) => setState(() => _stress = v!),
          ),
          RadioListTile(
            title: const Text('Средний'),
            value: 'medium',
            groupValue: _stress,
            onChanged: (v) => setState(() => _stress = v!),
          ),
          RadioListTile(
            title: const Text('Высокий'),
            value: 'high',
            groupValue: _stress,
            onChanged: (v) => setState(() => _stress = v!),
          ),
          const SizedBox(height: 32),
          FilledButton(
            onPressed: _continue,
            child: const Text('К измерению пульса'),
          ),
        ],
      ),
    );
  }
}
