import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../models/firestore_models.dart';
import '../../services/service_ad_service.dart';
import '../../providers/firestore_auth_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'create_service_ad_screen.dart';

class MyServiceAdsScreen extends ConsumerWidget {
  const MyServiceAdsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(firestoreAuthProvider);
    final user = authState.user;

    if (user == null || user.userType != AppConstants.userTypeSpecialist) {
      return Scaffold(
        appBar: AppBar(title: const Text('Мои объявления')),
        body: const Center(
          child: Text('Только специалисты могут создавать объявления'),
        ),
      );
    }

    final serviceAdService = ServiceAdService();

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Мои объявления'),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              context.push('/home/profile/service-ads/create');
            },
            tooltip: 'Создать объявление',
          ),
        ],
      ),
      body: StreamBuilder<List<ServiceAd>>(
        stream: serviceAdService.getSpecialistAds(user.id),
        builder: (context, snapshot) {
          print('🔍 StreamBuilder состояние: ${snapshot.connectionState}, ошибка: ${snapshot.hasError}, данные: ${snapshot.data?.length ?? 0} объявлений');
          
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            print('❌ Ошибка в StreamBuilder: ${snapshot.error}');
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: AppConstants.errorColor,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Ошибка загрузки объявлений',
                    style: TextStyle(color: AppConstants.errorColor),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${snapshot.error}',
                    style: TextStyle(color: AppConstants.textSecondary, fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          final ads = snapshot.data ?? [];
          print('📋 Загружено объявлений: ${ads.length} для специалиста ${user.id}');

          if (ads.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.assignment_outlined,
                    size: 80,
                    color: AppConstants.textSecondary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'У вас пока нет объявлений',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: AppConstants.textSecondary,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Создайте первое объявление, чтобы начать получать заказы',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppConstants.textSecondary,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () {
                      context.push('/home/profile/service-ads/create');
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Создать объявление'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppConstants.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: ads.length,
            itemBuilder: (context, index) {
              final ad = ads[index];
              return _buildAdCard(context, ad, serviceAdService);
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          context.push('/home/profile/service-ads/create');
        },
        icon: const Icon(Icons.add),
        label: const Text('Создать объявление'),
        backgroundColor: AppConstants.primaryColor,
      ),
    );
  }

  Widget _buildAdCard(BuildContext context, ServiceAd ad, ServiceAdService service) {
    final category = AppConstants.serviceCategories.firstWhere(
      (cat) => cat['id'] == ad.category,
      orElse: () => {
        'name': ad.category,
        'emoji': '📋',
        'color': AppConstants.categoryOtherColor,
      },
    );

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppConstants.radiusMD),
      ),
      child: InkWell(
        onTap: () {
          context.push('/profile/service-ads/create', extra: ad);
        },
        borderRadius: BorderRadius.circular(AppConstants.radiusMD),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: (category['color'] as Color).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(AppConstants.radiusSM),
                    ),
                    child: Text(
                      category['emoji'] as String,
                      style: const TextStyle(fontSize: 20),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          ad.title,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          category['name'] as String,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppConstants.textSecondary,
                              ),
                        ),
                      ],
                    ),
                  ),
                  _buildStatusChip(ad),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                ad.description,
                style: Theme.of(context).textTheme.bodyMedium,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.attach_money,
                        size: 18,
                        color: AppConstants.primaryColor,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${ad.price.toStringAsFixed(0)} ${ad.priceUnit ?? 'сум'}',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: AppConstants.primaryColor,
                            ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Icon(
                        Icons.visibility,
                        size: 16,
                        color: AppConstants.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${ad.viewCount}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppConstants.textSecondary,
                            ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        context.push('/profile/service-ads/create', extra: ad);
                      },
                      icon: const Icon(Icons.edit, size: 18),
                      label: const Text('Редактировать'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppConstants.primaryColor,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        _togglePublish(context, ad, service);
                      },
                      icon: Icon(
                        ad.isPublished ? Icons.visibility_off : Icons.visibility,
                        size: 18,
                      ),
                      label: Text(ad.isPublished ? 'Снять' : 'Опубликовать'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ad.isPublished
                            ? AppConstants.warningColor
                            : AppConstants.successColor,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(ServiceAd ad) {
    if (ad.isPublished && ad.isActive) {
      return Chip(
        label: const Text('Опубликовано'),
        backgroundColor: AppConstants.successColor.withOpacity(0.1),
        labelStyle: TextStyle(
          color: AppConstants.successColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
        avatar: Icon(
          Icons.check_circle,
          size: 16,
          color: AppConstants.successColor,
        ),
      );
    } else if (!ad.isActive) {
      return Chip(
        label: const Text('Неактивно'),
        backgroundColor: AppConstants.errorColor.withOpacity(0.1),
        labelStyle: TextStyle(
          color: AppConstants.errorColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      );
    } else {
      return Chip(
        label: const Text('Черновик'),
        backgroundColor: AppConstants.textSecondary.withOpacity(0.1),
        labelStyle: TextStyle(
          color: AppConstants.textSecondary,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      );
    }
  }

  void _togglePublish(BuildContext context, ServiceAd ad, ServiceAdService service) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(ad.isPublished ? 'Снять с публикации?' : 'Опубликовать объявление?'),
        content: Text(
          ad.isPublished
              ? 'Объявление будет скрыто от пользователей, но не удалено.'
              : 'Объявление станет видимым для всех пользователей приложения.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                if (ad.isPublished) {
                  await service.unpublishServiceAd(ad.id);
                } else {
                  await service.publishServiceAd(ad.id);
                }
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        ad.isPublished
                            ? 'Объявление снято с публикации'
                            : 'Объявление опубликовано',
                      ),
                      backgroundColor: AppConstants.successColor,
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Ошибка: ${e.toString()}'),
                      backgroundColor: AppConstants.errorColor,
                    ),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: ad.isPublished
                  ? AppConstants.warningColor
                  : AppConstants.successColor,
            ),
            child: Text(ad.isPublished ? 'Снять' : 'Опубликовать'),
          ),
        ],
      ),
    );
  }
}

