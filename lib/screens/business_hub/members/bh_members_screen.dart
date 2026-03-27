import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../constants/app_constants.dart';
import '../../../models/business_hub/organization_member.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';

class BHMembersScreen extends ConsumerStatefulWidget {
  const BHMembersScreen({super.key});

  @override
  ConsumerState<BHMembersScreen> createState() => _BHMembersScreenState();
}

class _BHMembersScreenState extends ConsumerState<BHMembersScreen> {
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (org != null) {
      ref.read(bhMembersProvider.notifier).load(org.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final orgAsync = ref.watch(bhOrganizationProvider);
    final membersAsync = ref.watch(bhMembersProvider);
    final authState = ref.watch(firestoreAuthProvider);

    return orgAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e')),
      data: (org) {
        if (org == null) {
          return const Center(child: Text('Создайте компанию'));
        }

        final isOwner = authState.user?.id == org.ownerId;

        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => context.pop(),
              tooltip: 'Назад к Business Hub',
            ),
            title: const Text('Участники'),
          ),
          body: RefreshIndicator(
            onRefresh: _load,
            child: membersAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Ошибка: $e')),
              data: (members) {
                return ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    const Text(
                      'Участники',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Роли: Владелец, Администратор, Бухгалтер, Наблюдатель',
                      style: TextStyle(fontSize: 13, color: AppConstants.textSecondary),
                    ),
                    const SizedBox(height: 24),
                    ...members.map((m) => _MemberCard(
                          member: m,
                          isOwner: isOwner,
                          isSelf: m.userId == authState.user?.id,
                          onRoleChange: isOwner && m.role != BHMemberRole.owner
                              ? (role) => ref.read(bhMembersProvider.notifier).updateRole(m.id, role)
                              : null,
                          onRemove: isOwner && m.role != BHMemberRole.owner
                              ? () => _confirmRemove(context, m)
                              : null,
                        )),
                    const SizedBox(height: 80),
                  ],
                );
              },
            ),
          ),
          floatingActionButton: isOwner
              ? FloatingActionButton.extended(
                  onPressed: () => _showInvite(context, org.id),
                  icon: const Icon(Icons.person_add),
                  label: const Text('Пригласить'),
                  backgroundColor: AppConstants.primaryColor,
                )
              : null,
        );
      },
    );
  }

  void _showInvite(BuildContext context, String orgId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Пригласить участника'),
        content: const Text(
          'Введите email пользователя. Он должен быть зарегистрирован в ODO.UZ. '
          'Функция приглашения по email будет доступна в следующей версии.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Закрыть')),
        ],
      ),
    );
  }

  void _confirmRemove(BuildContext context, BHOrganizationMember m) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Удалить участника?'),
        content: Text('${m.userName ?? m.userEmail ?? m.userId} будет удалён.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Отмена')),
          TextButton(
            onPressed: () async {
              await ref.read(bhMembersProvider.notifier).remove(m.id);
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Удалить', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

class _MemberCard extends StatelessWidget {
  final BHOrganizationMember member;
  final bool isOwner;
  final bool isSelf;
  final void Function(BHMemberRole)? onRoleChange;
  final VoidCallback? onRemove;

  const _MemberCard({
    required this.member,
    required this.isOwner,
    required this.isSelf,
    this.onRoleChange,
    this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final canManage = isOwner && !isSelf && member.role != BHMemberRole.owner;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: AppConstants.primaryColor.withOpacity(0.2),
          child: Text(
            (member.userName ?? member.userEmail ?? '?').isNotEmpty
                ? (member.userName ?? member.userEmail ?? '?')[0].toUpperCase()
                : '?',
            style: const TextStyle(color: AppConstants.primaryColor, fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(
          member.userName ?? member.userEmail ?? member.userId,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(member.role.label),
        trailing: canManage
            ? PopupMenuButton<String>(
                onSelected: (v) {
                  if (v == 'remove') {
                    onRemove?.call();
                  } else {
                    final role = BHMemberRole.values.firstWhere((r) => r.name == v);
                    onRoleChange?.call(role);
                  }
                },
                itemBuilder: (ctx) => [
                  ...BHMemberRole.values
                      .where((r) => r != BHMemberRole.owner)
                      .map((r) => PopupMenuItem(value: r.name, child: Text(r.label))),
                  const PopupMenuItem(value: 'remove', child: Text('Удалить', style: TextStyle(color: Colors.red))),
                ],
              )
            : null,
      ),
    );
  }
}
