import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../constants/app_constants.dart';
import '../../../models/business_hub/task.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';

class BHTasksScreen extends ConsumerStatefulWidget {
  const BHTasksScreen({super.key});

  @override
  ConsumerState<BHTasksScreen> createState() => _BHTasksScreenState();
}

class _BHTasksScreenState extends ConsumerState<BHTasksScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final user = ref.read(firestoreAuthProvider).user;
    if (user == null) return;
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org != null) {
      ref.read(bhTasksProvider.notifier).load(org.id, assignedTo: user.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tasksAsync = ref.watch(bhTasksProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Мои задачи'),
      ),
      body: tasksAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Ошибка: $e')),
        data: (tasks) {
          final pending = tasks.where((t) => t.status != BHTaskStatus.done).toList();
          final done = tasks.where((t) => t.status == BHTaskStatus.done).toList();

          if (tasks.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.task_alt, size: 64, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  Text(
                    'Нет задач',
                    style: TextStyle(fontSize: 16, color: AppConstants.textSecondary),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (pending.isNotEmpty) ...[
                  Text(
                    'Активные (${pending.length})',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppConstants.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...pending.map((t) => _TaskCard(
                        task: t,
                        onComplete: () => ref.read(bhTasksProvider.notifier).completeTask(t.id),
                      )),
                  const SizedBox(height: 24),
                ],
                if (done.isNotEmpty) ...[
                  Text(
                    'Выполнено (${done.length})',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppConstants.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...done.map((t) => _TaskCard(task: t, onComplete: null)),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  final BHTask task;
  final VoidCallback? onComplete;

  const _TaskCard({required this.task, this.onComplete});

  @override
  Widget build(BuildContext context) {
    final isDone = task.status == BHTaskStatus.done;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isDone ? Colors.grey.shade200 : AppConstants.primaryColor.withOpacity(0.2),
          child: Icon(
            isDone ? Icons.check : Icons.assignment,
            color: isDone ? Colors.grey : AppConstants.primaryColor,
          ),
        ),
        title: Text(
          task.title,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            decoration: isDone ? TextDecoration.lineThrough : null,
          ),
        ),
        subtitle: task.description != null
            ? Text(
                task.description!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  color: AppConstants.textSecondary,
                  decoration: isDone ? TextDecoration.lineThrough : null,
                ),
              )
            : null,
        trailing: !isDone && onComplete != null
            ? IconButton(
                icon: const Icon(Icons.check_circle_outline),
                onPressed: onComplete,
                tooltip: 'Выполнено',
              )
            : null,
      ),
    );
  }
}
