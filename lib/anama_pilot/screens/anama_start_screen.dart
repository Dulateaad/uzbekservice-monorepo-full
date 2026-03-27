import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AnamaStartScreen extends ConsumerStatefulWidget {
  const AnamaStartScreen({super.key});

  @override
  ConsumerState<AnamaStartScreen> createState() => _AnamaStartScreenState();
}

class _AnamaStartScreenState extends ConsumerState<AnamaStartScreen> {
  bool _busy = false;
  String? _error;
  final _labelCtrl = TextEditingController();

  static const _prefsKey = 'anama_pilot_label';

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((p) {
      final s = p.getString(_prefsKey);
      if (s != null && mounted) _labelCtrl.text = s;
    });
  }

  @override
  void dispose() {
    _labelCtrl.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = _labelCtrl.text.trim();
      if (raw.isEmpty) {
        await prefs.remove(_prefsKey);
      } else {
        await prefs.setString(_prefsKey, raw.length > 48 ? raw.substring(0, 48) : raw);
      }

      final auth = FirebaseAuth.instance;
      if (auth.currentUser == null) {
        await auth.signInAnonymously();
      }
      if (!mounted) return;
      context.go('/pilot/age');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Anama — пилот')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Школьный пилот',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 12),
              const Text(
                'Короткий опрос, затем измерение пульса с устройства (ESP32 → Firebase). '
                'Данные обрабатываются в обезличенном виде. Это не медицинская диагностика.',
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _labelCtrl,
                maxLength: 48,
                decoration: const InputDecoration(
                  labelText: 'Ник или класс (необязательно)',
                  hintText: 'Например: 9Б или «Аня» — только для удобства в пилоте',
                  border: OutlineInputBorder(),
                  counterText: '',
                ),
              ),
              const Spacer(),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(_error!, style: const TextStyle(color: Colors.red)),
                ),
              FilledButton(
                onPressed: _busy ? null : _start,
                child: Text(_busy ? 'Вход…' : 'Начать (анонимно)'),
              ),
              TextButton(
                onPressed: () => context.go('/pilot/privacy'),
                child: const Text('Политика пилота и дисклеймер'),
              ),
              TextButton(
                onPressed: () => context.go('/'),
                child: const Text('На главную'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
