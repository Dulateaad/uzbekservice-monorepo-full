import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../constants/app_constants.dart';
import '../../widgets/design_system_button.dart';
import '../../providers/chat_providers.dart';
import '../../models/chat_models.dart';
import '../../models/firestore_models.dart';

Map<String, dynamic> _mapFromFirestoreDynamic(dynamic value) {
  if (value == null) return {};
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return {};
}

Map<String, dynamic>? _optionalMapFromFirestoreDynamic(dynamic value) {
  if (value == null) return null;
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return null;
}

class ChatScreen extends ConsumerStatefulWidget {
  final String chatId;

  const ChatScreen({
    super.key,
    required this.chatId,
  });

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollToBottom();
      // Отмечаем сообщения как прочитанные при открытии чата
      _markAsRead();
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _markAsRead() async {
    final userId = ref.read(userIdProvider);
    if (userId != null) {
      try {
        await ref.read(markAsReadProvider({
          'chatId': widget.chatId,
          'userId': userId,
        }).future);
      } catch (e) {
        print('Ошибка отметки сообщений как прочитанных: $e');
      }
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isSending) return;

    final userId = ref.read(userIdProvider);
    final userType = ref.read(userTypeProvider);
    
    if (userId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ошибка: пользователь не авторизован')),
      );
      return;
    }

    setState(() {
      _isSending = true;
    });

    try {
      await ref.read(sendMessageProvider({
        'chatId': widget.chatId,
        'senderId': userId,
        'senderType': userType,
        'content': text,
        'messageType': 'text',
      }).future);

      _messageController.clear();
      _scrollToBottom();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка отправки сообщения: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
      }
    }
  }

  String _formatMessageTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays == 0) {
      return DateFormat('HH:mm').format(dateTime);
    } else if (difference.inDays == 1) {
      return 'Вчера ${DateFormat('HH:mm').format(dateTime)}';
    } else if (difference.inDays < 7) {
      return DateFormat('EEEE, HH:mm', 'ru').format(dateTime);
    } else {
      return DateFormat('dd.MM.yyyy, HH:mm').format(dateTime);
    }
  }

  @override
  Widget build(BuildContext context) {
    final chatInfoAsync = ref.watch(chatInfoProvider(widget.chatId));
    final messagesAsync = ref.watch(chatMessagesProvider(widget.chatId));
    final currentUserId = ref.watch(userIdProvider);

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        backgroundColor: AppConstants.backgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: chatInfoAsync.when(
          data: (info) {
            final specialist = _mapFromFirestoreDynamic(info['specialist']);
            final specialistName = specialist['name'] ?? 'Специалист';
            final specialistAvatar = specialist['avatarUrl'] as String?;
            final isOnline = specialist['isOnline'] as bool? ?? false;

            return Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: AppConstants.primaryColor.withOpacity(0.1),
                  backgroundImage: specialistAvatar != null
                      ? NetworkImage(specialistAvatar)
                      : null,
                  child: specialistAvatar == null
                      ? Text(
                          specialistName.isNotEmpty
                              ? specialistName[0].toUpperCase()
                              : '?',
                          style: const TextStyle(
                            color: AppConstants.primaryColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: AppConstants.spacingSM),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        specialistName,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        isOnline ? 'В сети' : 'Был(а) в сети',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: isOnline ? Colors.green : AppConstants.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
          loading: () => const Text('Загрузка...'),
          error: (_, __) => const Text('Ошибка'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert),
            onPressed: () {
              _showChatOptions();
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Информация о заказе
          chatInfoAsync.when(
            data: (info) {
              final order = _optionalMapFromFirestoreDynamic(info['order']);
              if (order != null) {
                return _buildOrderInfo(order);
              }
              return const SizedBox.shrink();
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          
          // Сообщения
          Expanded(
            child: messagesAsync.when(
              data: (messages) {
                if (messages.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.chat_bubble_outline,
                          size: 64,
                          color: AppConstants.textSecondary.withOpacity(0.5),
                        ),
                        const SizedBox(height: AppConstants.spacingMD),
                        Text(
                          'Нет сообщений',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: AppConstants.textSecondary,
                          ),
                        ),
                        const SizedBox(height: AppConstants.spacingSM),
                        Text(
                          'Начните общение',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppConstants.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  );
                }
                return ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(AppConstants.spacingMD),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final message = messages[index];
                    final isCurrentUser = message.senderId == currentUserId;
                    return _buildMessage(message, isCurrentUser);
                  },
                );
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
                      'Ошибка загрузки сообщений',
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
                        ref.invalidate(chatMessagesProvider(widget.chatId));
                      },
                      type: ButtonType.primary,
                    ),
                  ],
                ),
              ),
            ),
          ),
          
          // Поле ввода сообщения
          _buildMessageInput(),
        ],
      ),
    );
  }

  Widget _buildOrderInfo(Map<String, dynamic> order) {
    final orderModel = FirestoreOrder.fromMap(order);
    final serviceName = orderModel.services.isNotEmpty
        ? orderModel.services.first.name
        : 'Услуга';
    final scheduledDate = orderModel.scheduledDate != null
        ? DateFormat('dd MMMM в HH:mm', 'ru').format(orderModel.scheduledDate!)
        : 'Дата не указана';
    final address = orderModel.address ?? 'Адрес не указан';

    return Container(
      padding: const EdgeInsets.all(AppConstants.spacingMD),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        border: Border(
          bottom: BorderSide(
            color: AppConstants.borderColor,
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.work_outline,
            color: AppConstants.primaryColor,
            size: 20,
          ),
          const SizedBox(width: AppConstants.spacingSM),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  serviceName,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '$scheduledDate • $address',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppConstants.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          DesignSystemButton(
            text: 'Детали',
            onPressed: () {
              if (orderModel.id != null) {
                context.push('/home/order/${orderModel.id}');
              }
            },
            type: ButtonType.secondary,
            height: 32,
          ),
        ],
      ),
    );
  }

  Widget _buildMessage(MessageModel message, bool isCurrentUser) {
    if (message.isSystem) {
      return _buildSystemMessage(message);
    }

    if (isCurrentUser) {
      return _buildUserMessage(message);
    } else {
      return _buildSpecialistMessage(message);
    }
  }

  Widget _buildSystemMessage(MessageModel message) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: AppConstants.spacingSM),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppConstants.spacingMD,
            vertical: AppConstants.spacingSM,
          ),
          decoration: BoxDecoration(
            color: AppConstants.primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(AppConstants.radiusRound),
          ),
          child: Text(
            message.content,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppConstants.primaryColor,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }

  Widget _buildUserMessage(MessageModel message) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: AppConstants.spacingXS),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(AppConstants.spacingMD),
              decoration: BoxDecoration(
                color: AppConstants.primaryColor,
                borderRadius: BorderRadius.circular(AppConstants.radiusLG).copyWith(
                  bottomRight: const Radius.circular(AppConstants.radiusSM),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    message.content,
                    style: const TextStyle(
                      color: AppConstants.primaryContrastColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatMessageTime(message.timestamp),
                    style: TextStyle(
                      color: AppConstants.primaryContrastColor.withOpacity(0.7),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: AppConstants.spacingSM),
          CircleAvatar(
            radius: 16,
            backgroundColor: AppConstants.primaryColor.withOpacity(0.1),
            child: const Icon(
              Icons.person,
              color: AppConstants.primaryColor,
              size: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpecialistMessage(MessageModel message) {
    final chatInfoAsync = ref.watch(chatInfoProvider(widget.chatId));
    
    return chatInfoAsync.when(
      data: (info) {
        final specialist = _mapFromFirestoreDynamic(info['specialist']);
        final specialistName = specialist['name'] ?? 'Специалист';
        final specialistAvatar = specialist['avatarUrl'] as String?;

        return Container(
          margin: const EdgeInsets.symmetric(vertical: AppConstants.spacingXS),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: AppConstants.primaryColor.withOpacity(0.1),
                backgroundImage: specialistAvatar != null
                    ? NetworkImage(specialistAvatar)
                    : null,
                child: specialistAvatar == null
                    ? Text(
                        specialistName.isNotEmpty
                            ? specialistName[0].toUpperCase()
                            : '?',
                        style: const TextStyle(
                          color: AppConstants.primaryColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: AppConstants.spacingSM),
              Flexible(
                child: Container(
                  padding: const EdgeInsets.all(AppConstants.spacingMD),
                  decoration: BoxDecoration(
                    color: AppConstants.surfaceColor,
                    borderRadius: BorderRadius.circular(AppConstants.radiusLG).copyWith(
                      bottomLeft: const Radius.circular(AppConstants.radiusSM),
                    ),
                    border: Border.all(
                      color: AppConstants.borderColor,
                      width: 1,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        message.content,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppConstants.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatMessageTime(message.timestamp),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppConstants.textSecondary,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildMessageInput() {
    return Container(
      padding: const EdgeInsets.all(AppConstants.spacingMD),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        border: Border(
          top: BorderSide(
            color: AppConstants.borderColor,
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Быстрые действия
            IconButton(
              icon: const Icon(Icons.attach_file),
              onPressed: () {
                _showQuickActions();
              },
            ),
            
            // Поле ввода
            Expanded(
              child: TextField(
                controller: _messageController,
                focusNode: _focusNode,
                enabled: !_isSending,
                decoration: InputDecoration(
                  hintText: 'Напишите сообщение...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppConstants.radiusRound),
                    borderSide: BorderSide(color: AppConstants.borderColor),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppConstants.radiusRound),
                    borderSide: BorderSide(color: AppConstants.borderColor),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppConstants.radiusRound),
                    borderSide: BorderSide(color: AppConstants.primaryColor),
                  ),
                  filled: true,
                  fillColor: AppConstants.backgroundColor,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: AppConstants.spacingMD,
                    vertical: AppConstants.spacingSM,
                  ),
                ),
                maxLines: null,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendMessage(),
              ),
            ),
            
            const SizedBox(width: AppConstants.spacingSM),
            
            // Кнопка отправки
            Container(
              decoration: BoxDecoration(
                color: _isSending
                    ? AppConstants.primaryColor.withOpacity(0.5)
                    : AppConstants.primaryColor,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: _isSending
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            AppConstants.primaryContrastColor,
                          ),
                        ),
                      )
                    : const Icon(
                        Icons.send,
                        color: AppConstants.primaryContrastColor,
                      ),
                onPressed: _isSending ? null : _sendMessage,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showChatOptions() {
    final chatInfoAsync = ref.watch(chatInfoProvider(widget.chatId));
    
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(AppConstants.spacingLG),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            chatInfoAsync.when(
              data: (info) {
                final order = _optionalMapFromFirestoreDynamic(info['order']);
                final specialist = _mapFromFirestoreDynamic(info['specialist']);
                final phoneNumber = specialist['phoneNumber'] as String?;

                return Column(
                  children: [
                    if (order != null)
                      ListTile(
                        leading: const Icon(Icons.info_outline),
                        title: const Text('Информация о заказе'),
                        onTap: () {
                          Navigator.pop(context);
                          final orderModel = FirestoreOrder.fromMap(order);
                          if (orderModel.id != null) {
                            context.push('/home/order/${orderModel.id}');
                          }
                        },
                      ),
                    if (phoneNumber != null)
                      ListTile(
                        leading: const Icon(Icons.phone),
                        title: const Text('Позвонить'),
                        onTap: () {
                          Navigator.pop(context);
                          // TODO: Make call
                        },
                      ),
                    ListTile(
                      leading: const Icon(Icons.block),
                      title: const Text('Заблокировать'),
                      onTap: () {
                        Navigator.pop(context);
                        // TODO: Block user
                      },
                    ),
                  ],
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const Text('Ошибка загрузки'),
            ),
          ],
        ),
      ),
    );
  }

  void _showQuickActions() {
    final chatInfoAsync = ref.watch(chatInfoProvider(widget.chatId));
    
    chatInfoAsync.when(
      data: (info) {
        final order = _optionalMapFromFirestoreDynamic(info['order']);
        final specialist = _mapFromFirestoreDynamic(info['specialist']);
        final phoneNumber = specialist['phoneNumber'] as String?;

        showModalBottomSheet(
          context: context,
          builder: (context) => Container(
            padding: const EdgeInsets.all(AppConstants.spacingLG),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Быстрые действия',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: AppConstants.spacingLG),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    if (order != null)
                      _buildQuickActionButton(
                        icon: Icons.location_on,
                        label: 'Мой адрес',
                        onTap: () {
                          Navigator.pop(context);
                          final orderModel = FirestoreOrder.fromMap(order);
                          _messageController.text = 'Мой адрес: ${orderModel.address ?? 'Не указан'}';
                        },
                      ),
                    if (order != null)
                      _buildQuickActionButton(
                        icon: Icons.access_time,
                        label: 'Время встречи',
                        onTap: () {
                          Navigator.pop(context);
                          final orderModel = FirestoreOrder.fromMap(order);
                          if (orderModel.scheduledDate != null) {
                            final dateStr = DateFormat('dd MMMM в HH:mm', 'ru')
                                .format(orderModel.scheduledDate!);
                            _messageController.text = 'Время встречи: $dateStr';
                          }
                        },
                      ),
                    if (phoneNumber != null)
                      _buildQuickActionButton(
                        icon: Icons.phone,
                        label: 'Мой телефон',
                        onTap: () {
                          Navigator.pop(context);
                          _messageController.text = 'Мой телефон: $phoneNumber';
                        },
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: AppConstants.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(AppConstants.radiusRound),
            ),
            child: Icon(
              icon,
              color: AppConstants.primaryColor,
              size: 24,
            ),
          ),
          const SizedBox(height: AppConstants.spacingSM),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppConstants.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
