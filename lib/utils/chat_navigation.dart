import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/firestore_auth_provider.dart';
import '../services/chat_service.dart';

/// Создаёт (или находит) чат клиент ↔ специалист и открывает экран переписки.
Future<void> openChatWithSpecialist(
  BuildContext context,
  WidgetRef ref,
  String specialistId,
) async {
  final messenger = ScaffoldMessenger.maybeOf(context);
  final user = ref.read(firestoreAuthProvider).user;
  if (user == null) {
    messenger?.showSnackBar(
      const SnackBar(content: Text('Войдите в аккаунт, чтобы написать')),
    );
    if (context.mounted) context.push('/auth/phone');
    return;
  }
  if (user.id == specialistId) {
    messenger?.showSnackBar(
      const SnackBar(content: Text('Нельзя открыть чат с самим собой')),
    );
    return;
  }

  try {
    final chatId = await ChatService.createChat(
      clientId: user.id,
      specialistId: specialistId,
    );
    if (!context.mounted) return;
    context.push('/home/chat/$chatId');
  } catch (e) {
    if (context.mounted) {
      messenger?.showSnackBar(
        SnackBar(content: Text('Не удалось открыть чат: $e')),
      );
    }
  }
}
