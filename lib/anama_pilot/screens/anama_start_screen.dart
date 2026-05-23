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
        await prefs.setString(
            _prefsKey, raw.length > 48 ? raw.substring(0, 48) : raw);
      }

      final auth = FirebaseAuth.instance;
      if (auth.currentUser == null) {
        await auth.signInAnonymously();
      }
      if (!mounted) return;
      context.go('/age');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/'),
        ),
        title: const Text('Пилот — старт'),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 28, vertical: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 12),
                  const Text(
                    'Введите ник или класс (необязательно) и нажмите «Начать».',
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: _labelCtrl,
                    maxLength: 48,
                    decoration: const InputDecoration(
                      labelText: 'Ник или класс',
                      hintText: 'Например: 9Б',
                      border: OutlineInputBorder(),
                      counterText: '',
                    ),
                  ),
                  const Spacer(),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        _error!,
                        style: TextStyle(
                            color: theme.colorScheme.error, fontSize: 13),
                      ),
                    ),
                  FilledButton.icon(
                    onPressed: _busy ? null : _start,
                    icon: _busy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.play_arrow_rounded),
                    label: Text(_busy ? 'Вход…' : 'Начать'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(52),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
