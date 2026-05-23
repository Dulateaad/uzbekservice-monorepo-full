import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../widgets/design_system_button.dart';
import '../../providers/chat_providers.dart';
import '../../providers/main_shell_tab_provider.dart';
import '../../models/chat_models.dart';
import 'package:intl/intl.dart';

class ChatListScreen extends ConsumerStatefulWidget {
  const ChatListScreen({super.key});

  @override
  ConsumerState<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends ConsumerState<ChatListScreen> {
  String _searchQuery = '';

  String _formatMessageTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays == 0) {
      return DateFormat('HH:mm').format(dateTime);
    } else if (difference.inDays == 1) {
      return 'Вчера';
    } else if (difference.inDays < 7) {
      return DateFormat('EEEE', 'ru').format(dateTime);
    } else {
      return DateFormat('dd.MM.yyyy').format(dateTime);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userType = ref.watch(userTypeProvider);
    final chatsAsync = ref.watch(chatsProvider(userType));

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        backgroundColor: AppConstants.backgroundColor,
        elevation: 0,
        title: const Text('Чаты'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              // TODO: Implement search
            },
          ),
        ],
      ),
      body: chatsAsync.when(
        data: (chats) {
          if (chats.isEmpty) {
            return _buildEmptyState();
          }
          return _buildChatsList(chats);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: AppConstants.textSecondary.withOpacity(0.5),
              ),
              const SizedBox(height: AppConstants.spacingMD),
              Text(
                'Ошибка загрузки чатов',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppConstants.textPrimary,
                ),
              ),
              const SizedBox(height: AppConstants.spacingSM),
              Text(
                error.toString(),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppConstants.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppConstants.spacingLG),
              DesignSystemButton(
                text: 'Повторить',
                onPressed: () {
                  ref.invalidate(chatsProvider(userType));
                },
                type: ButtonType.primary,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          padding: const EdgeInsets.all(AppConstants.spacingXL),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.chat_bubble_outline,
                  size: 80,
                  color: AppConstants.textSecondary.withOpacity(0.5),
                ),
                const SizedBox(height: AppConstants.spacingLG),
                Text(
                  'Нет активных чатов',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppConstants.textPrimary,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppConstants.spacingMD),
                Text(
                  'Чаты появятся после создания заказа с специалистом',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppConstants.textSecondary,
                        height: 1.5,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppConstants.spacingXL),
                DesignSystemButton(
                  text: 'Найти специалиста',
                  onPressed: () {
                    ref.read(mainShellTabIndexProvider.notifier).state = 0;
                  },
                  type: ButtonType.primary,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildChatsList(List<ChatListItem> chats) {
    return ListView.builder(
      padding: const EdgeInsets.all(AppConstants.spacingMD),
      itemCount: chats.length,
      itemBuilder: (context, index) {
        final chat = chats[index];
        return _buildChatCard(chat);
      },
    );
  }

  Widget _buildChatCard(ChatListItem chat) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppConstants.spacingMD),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        borderRadius: BorderRadius.circular(AppConstants.radiusLG),
        border: Border.all(
          color: AppConstants.borderColor,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            context.go('/home/chat/${chat.id}');
          },
          borderRadius: BorderRadius.circular(AppConstants.radiusLG),
          child: Padding(
            padding: const EdgeInsets.all(AppConstants.spacingMD),
            child: Row(
              children: [
                // Аватар специалиста
                Stack(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: AppConstants.primaryColor.withOpacity(0.1),
                      backgroundImage: chat.specialistAvatar != null
                          ? NetworkImage(chat.specialistAvatar!)
                          : null,
                      child: chat.specialistAvatar == null
                          ? Text(
                              chat.specialistName.isNotEmpty
                                  ? chat.specialistName[0].toUpperCase()
                                  : '?',
                              style: const TextStyle(
                                color: AppConstants.primaryColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                              ),
                            )
                          : null,
                    ),
                    // Индикатор онлайн
                    if (chat.isOnline)
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          width: 16,
                          height: 16,
                          decoration: BoxDecoration(
                            color: Colors.green,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppConstants.surfaceColor,
                              width: 2,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),

                const SizedBox(width: AppConstants.spacingMD),

                // Основная информация
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Имя и время
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              chat.specialistName,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppConstants.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            _formatMessageTime(chat.lastMessageTime),
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppConstants.textSecondary,
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 4),

                      // Роль специалиста
                      Text(
                        chat.specialistRole,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppConstants.primaryColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),

                      if (chat.orderService != null) ...[
                        const SizedBox(height: 4),
                        // Услуга заказа
                        Text(
                          chat.orderService!,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppConstants.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],

                      const SizedBox(height: 8),

                      // Последнее сообщение
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              chat.lastMessage,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppConstants.textSecondary,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (chat.unreadCount > 0) ...[
                            const SizedBox(width: AppConstants.spacingSM),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: AppConstants.primaryColor,
                                borderRadius: BorderRadius.circular(AppConstants.radiusRound),
                              ),
                              child: Text(
                                '${chat.unreadCount}',
                                style: const TextStyle(
                                  color: AppConstants.primaryContrastColor,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
