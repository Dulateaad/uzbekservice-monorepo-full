import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../utils/app_router.dart';

/// Защита от случайного свайпа/нажатия назад — показывает диалог подтверждения
/// на корневых экранах (главная, выбор типа входа).
class BackGestureGuard extends StatelessWidget {
  const BackGestureGuard({
    super.key,
    required this.child,
  });

  final Widget child;

  static bool _isRootRoute(String path) {
    final p = path.replaceAll(RegExp(r'/$'), '');
    return p == '/home' ||
        p == '/intent-selection' ||
        p == '/splash' ||
        p == '/onboarding';
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;

        final path = GoRouterState.of(context)?.uri.path ?? 
            GoRouter.of(context).routerDelegate.currentConfiguration.uri.path;

        if (_isRootRoute(path)) {
          final confirm = await showDialog<bool>(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => AlertDialog(
              title: const Text('Выйти из приложения?'),
              content: const Text(
                'Вы уверены, что хотите выйти? Ваши данные сохранены.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(false),
                  child: const Text('Остаться'),
                ),
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(true),
                  child: const Text('Выйти'),
                ),
              ],
            ),
          );

          if (confirm == true && context.mounted) {
            context.go('/intent-selection');
          }
        } else {
          if (context.mounted) {
            context.pop();
          }
        }
      },
      child: child,
    );
  }
}
