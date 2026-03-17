import 'package:flutter/material.dart';
import '../constants/app_constants.dart';
import '../models/firestore_models.dart';

class TopSpecialistCard extends StatelessWidget {
  final FirestoreUser specialist;
  final VoidCallback? onTap;
  final VoidCallback? onBook;
  final VoidCallback? onChat;

  const TopSpecialistCard({
    super.key,
    required this.specialist,
    this.onTap,
    this.onBook,
    this.onChat,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 320,
        height: 140,
        margin: const EdgeInsets.only(right: AppConstants.spacingMD),
        decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppConstants.surfaceColor,
            AppConstants.primaryColor.withOpacity(0.02),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppConstants.radiusXL + 4),
        border: Border.all(
          color: AppConstants.primaryColor.withOpacity(0.3),
          width: 2.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppConstants.primaryColor.withOpacity(0.25),
            blurRadius: 24,
            offset: const Offset(0, 12),
            spreadRadius: 2,
          ),
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppConstants.radiusXL),
        child: Stack(
              children: [
                // Градиентная рамка
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppConstants.primaryColor.withOpacity(0.1),
                        AppConstants.secondaryColor.withOpacity(0.1),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                ),
                
                // Контент
                Padding(
                  padding: const EdgeInsets.all(AppConstants.spacingMD),
                  child: Row(
                children: [
                  // Аватар специалиста
                  Stack(
                    children: [
                      CircleAvatar(
                        radius: 30,
                        backgroundColor: AppConstants.primaryColor.withOpacity(0.1),
                        child: specialist.avatarUrl != null
                            ? ClipOval(
                                child: Image.network(
                                  specialist.avatarUrl!,
                                  width: 60,
                                  height: 60,
                                  fit: BoxFit.cover,
                                ),
                              )
                            : Text(
                                specialist.name?.isNotEmpty == true 
                                    ? specialist.name![0].toUpperCase() 
                                    : '?',
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: AppConstants.primaryColor,
                                ),
                              ),
                      ),
                      // ТОП бейдж с градиентом
                      Positioned(
                        top: -4,
                        right: -4,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFFFD700), Color(0xFFFFA500)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: Colors.white,
                              width: 2.5,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.amber.withOpacity(0.5),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.emoji_events,
                            color: Colors.white,
                            size: 18,
                          ),
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(width: AppConstants.spacingMD),
                  
                  // Информация о специалисте
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                specialist.name ?? 'Специалист',
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AppConstants.textPrimary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            // Рейтинг с улучшенным дизайном
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    Colors.amber.withOpacity(0.2),
                                    Colors.amber.withOpacity(0.1),
                                  ],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                                border: Border.all(
                                  color: Colors.amber.withOpacity(0.3),
                                  width: 1,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.amber.withOpacity(0.2),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.star_rounded,
                                    color: Colors.amber,
                                    size: 16,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    specialist.rating?.toStringAsFixed(1) ?? '0.0',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.amber,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        
                        const SizedBox(height: 4),
                        
                        Text(
                          _getCategoryName(specialist.category),
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppConstants.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                        
                        if (specialist.description != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            specialist.description!,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppConstants.textHint,
                              fontSize: 10,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                        
                        const SizedBox(height: 8),
                        
                        Row(
                          children: [
                            Icon(
                              Icons.work_outline,
                              size: 12,
                              color: AppConstants.textSecondary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${specialist.totalOrders ?? 0} заказов',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppConstants.textSecondary,
                                fontSize: 10,
                              ),
                            ),
                            const SizedBox(width: AppConstants.spacingMD),
                            Icon(
                              Icons.location_on_outlined,
                              size: 12,
                              color: AppConstants.textSecondary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '2.3 км от вас',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppConstants.textSecondary,
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            // Кнопки действий
            Positioned(
              bottom: AppConstants.spacingSM,
              right: AppConstants.spacingSM,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Кнопка чата
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () {
                      // Останавливаем всплытие события
                      if (onChat != null) {
                        onChat!();
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppConstants.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(AppConstants.radiusSM),
                      ),
                      child: const Icon(
                        Icons.chat_bubble_outline,
                        color: AppConstants.primaryColor,
                        size: 16,
                      ),
                    ),
                  ),
                  
                  const SizedBox(width: 6),
                  
                  // Кнопка записи с градиентом
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () {
                      // Предотвращаем всплытие события на карточку
                      if (onBook != null) {
                        onBook!();
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        gradient: AppConstants.primaryGradient,
                        borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                        boxShadow: [
                          BoxShadow(
                            color: AppConstants.primaryColor.withOpacity(0.4),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Text(
                        'Записаться',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }

  String _getCategoryName(String? category) {
    switch (category) {
      case 'barber':
        return 'Барбер • 5 лет опыта';
      case 'nanny':
        return 'Няня • 3 года опыта';
      case 'handyman':
        return 'Мастер • 7 лет опыта';
      case 'construction':
        return 'Строитель • 10 лет опыта';
      case 'medical':
        return 'Медик • 8 лет опыта';
      default:
        return 'Специалист • 5 лет опыта';
    }
  }
}
