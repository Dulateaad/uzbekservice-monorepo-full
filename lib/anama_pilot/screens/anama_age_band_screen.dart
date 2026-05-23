import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/anama_pilot_flow_provider.dart';

class AnamaAgeBandScreen extends ConsumerWidget {
  const AnamaAgeBandScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final flow = ref.watch(anamaPilotFlowProvider);
    final notifier = ref.read(anamaPilotFlowProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Возрастная группа')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Text('Выберите группу — контент и формулировки будут соответствовать ей.'),
          const SizedBox(height: 16),
          RadioListTile<String>(
            title: const Text('Школьники / подростки'),
            subtitle: const Text('teen_school'),
            value: 'teen_school',
            groupValue: flow.ageBand,
            onChanged: (v) {
              if (v != null) notifier.setAgeBand(v);
            },
          ),
          RadioListTile<String>(
            title: const Text('Студенты / молодые взрослые'),
            subtitle: const Text('young_adult'),
            value: 'young_adult',
            groupValue: flow.ageBand,
            onChanged: (v) {
              if (v != null) notifier.setAgeBand(v);
            },
          ),
          RadioListTile<String>(
            title: const Text('Родители малышей 0–5 лет'),
            subtitle: const Text('parent_0_5 — контент в духе Future Insights'),
            value: 'parent_0_5',
            groupValue: flow.ageBand,
            onChanged: (v) {
              if (v != null) notifier.setAgeBand(v);
            },
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => context.go('/quiz'),
            child: const Text('Далее'),
          ),
        ],
      ),
    );
  }
}
