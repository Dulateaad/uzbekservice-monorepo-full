import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Агрегированная статистика пилота (без персональных данных сессий).
class AnamaPilotMonitorScreen extends StatefulWidget {
  const AnamaPilotMonitorScreen({super.key});

  @override
  State<AnamaPilotMonitorScreen> createState() => _AnamaPilotMonitorScreenState();
}

class _AnamaPilotMonitorScreenState extends State<AnamaPilotMonitorScreen> {
  bool _busy = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _ensureAuth();
  }

  Future<void> _ensureAuth() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (FirebaseAuth.instance.currentUser == null) {
        await FirebaseAuth.instance.signInAnonymously();
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_busy) {
      return Scaffold(
        appBar: AppBar(title: const Text('Мониторинг пилота')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Мониторинг пилота')),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 16),
              FilledButton(onPressed: _ensureAuth, child: const Text('Повторить')),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Мониторинг пилота'),
        actions: [
          TextButton(
            onPressed: () => context.go('/'),
            child: const Text('На главную'),
          ),
        ],
      ),
      body: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
        stream: FirebaseFirestore.instance
            .collection('anama_pilot_daily')
            .orderBy(FieldPath.documentId, descending: true)
            .limit(21)
            .snapshots(),
        builder: (context, snap) {
          if (snap.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text('Ошибка: ${snap.error}'),
              ),
            );
          }
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final docs = snap.data!.docs;
          if (docs.isEmpty) {
            return const Center(
              child: Text('Пока нет агрегатов — завершите хотя бы одну сессию пилота.'),
            );
          }

          final rows = docs.map((d) {
            final m = d.data();
            return _DayRow(
              dayId: d.id,
              completed: _asInt(m['completedCount']),
              green: _asInt(m['stress_green']),
              yellow: _asInt(m['stress_yellow']),
              red: _asInt(m['stress_red']),
              teen: _asInt(m['age_teen_school']),
              adult: _asInt(m['age_young_adult']),
              parent: _asInt(m['age_parent_0_5']),
            );
          }).toList();

          final chartRows = rows.length > 14 ? rows.sublist(0, 14) : rows;
          chartRows.sort((a, b) => a.dayId.compareTo(b.dayId));

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                'Только обезличенные суммы по дням. Персональные ответы здесь не показываются.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 200,
                child: _CompletedBarStrip(rows: chartRows),
              ),
              const SizedBox(height: 24),
              Text('По дням', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...rows.map((r) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Text(r.dayId),
                      subtitle: Text(
                        'Завершили сессию: ${r.completed} · '
                        '🟢 ${r.green} 🟡 ${r.yellow} 🔴 ${r.red}\n'
                        'Возраст: школа ${r.teen}, студенты ${r.adult}, 0–5 ${r.parent}',
                      ),
                      isThreeLine: true,
                    ),
                  )),
            ],
          );
        },
      ),
    );
  }

  static int _asInt(dynamic v) {
    if (v is int) return v;
    if (v is num) return v.toInt();
    return 0;
  }
}

class _DayRow {
  const _DayRow({
    required this.dayId,
    required this.completed,
    required this.green,
    required this.yellow,
    required this.red,
    required this.teen,
    required this.adult,
    required this.parent,
  });

  final String dayId;
  final int completed;
  final int green;
  final int yellow;
  final int red;
  final int teen;
  final int adult;
  final int parent;
}

class _CompletedBarStrip extends StatelessWidget {
  const _CompletedBarStrip({required this.rows});

  final List<_DayRow> rows;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    if (rows.isEmpty) return const SizedBox.shrink();

    final maxY = rows.map((e) => e.completed).reduce((a, b) => a > b ? a : b);
    final top = (maxY < 1 ? 1 : maxY).toDouble();
    const barAreaHeight = 120.0;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        for (final r in rows)
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    '${r.completed}',
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                  const SizedBox(height: 4),
                  SizedBox(
                    height: barAreaHeight,
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        height: barAreaHeight * (r.completed / top).clamp(0.0, 1.0),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.85),
                          borderRadius:
                              const BorderRadius.vertical(top: Radius.circular(4)),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    r.dayId.length >= 10 ? r.dayId.substring(5, 10) : r.dayId,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(fontSize: 9),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
