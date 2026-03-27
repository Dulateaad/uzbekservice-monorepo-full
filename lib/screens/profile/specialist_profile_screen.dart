import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../providers/firestore_auth_provider.dart';
import '../../providers/firestore_providers.dart';
import '../../models/firestore_models.dart';
import '../../services/firestore_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';

class SpecialistProfileScreen extends ConsumerStatefulWidget {
  const SpecialistProfileScreen({super.key});

  @override
  ConsumerState<SpecialistProfileScreen> createState() => _SpecialistProfileScreenState();
}

class _SpecialistProfileScreenState extends ConsumerState<SpecialistProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  
  bool _isLoading = false;
  String _selectedCategory = 'barber';
  bool _isAvailable = true;

  @override
  void initState() {
    super.initState();
    // Инициализация с тестовыми данными
    _descriptionController.text = 'Опытный специалист с многолетним стажем';
    _priceController.text = '50000';
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  void _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      // Здесь будет логика сохранения профиля специалиста
      await Future.delayed(const Duration(seconds: 1)); // Имитация запроса
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Профиль специалиста обновлен!'),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ошибка обновления профиля: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(firestoreAuthProvider);
    final user = authState.user;

    // Загружаем инструменты только если есть пользователь
    if (user != null) {
      // Ленивая загрузка (один раз при первом build)
      ref.read(toolsProvider.notifier).loadToolsForSpecialist(user.id);
    }

    final toolsState = ref.watch(toolsProvider);
    
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Профиль специалиста'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _saveProfile,
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text(
                    'Сохранить',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Информация о специалисте
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppConstants.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundColor: AppConstants.primaryColor.withOpacity(0.2),
                      child: Text(
                        user?.name?[0].toUpperCase() ?? 'S',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppConstants.primaryColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.name ?? 'Специалист',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppConstants.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Профиль специалиста',
                            style: const TextStyle(
                              fontSize: 14,
                              color: AppConstants.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 24),

              if (user != null) ...[
                _buildAddToolButtons(context, user.id),
                const SizedBox(height: 16),
                _buildToolsSection(context, toolsState),
                const SizedBox(height: 24),
              ],
              
              // Категория услуг
              const Text(
                'Категория услуг',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
              
              const SizedBox(height: 8),
              
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                decoration: InputDecoration(
                  labelText: 'Выберите категорию',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: const Icon(Icons.category),
                ),
                items: AppConstants.serviceCategories.map((category) {
                  return DropdownMenuItem(
                    value: category['id'] as String,
                    child: Text(category['name'] as String),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedCategory = value!;
                  });
                },
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Выберите категорию';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Описание услуг
              CustomTextField(
                controller: _descriptionController,
                labelText: 'Описание услуг',
                hintText: 'Опишите ваши услуги и опыт',
                maxLines: 4,
                prefixIcon: const Icon(Icons.description),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Введите описание услуг';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Цена за час
              CustomTextField(
                controller: _priceController,
                labelText: 'Цена за час (сум)',
                hintText: '50000',
                keyboardType: TextInputType.number,
                prefixIcon: const Icon(Icons.attach_money),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Введите цену за час';
                  }
                  if (int.tryParse(value) == null) {
                    return 'Введите корректную цену';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Статус доступности
              const Text(
                'Статус',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
              
              const SizedBox(height: 8),
              
              SwitchListTile(
                title: const Text('Доступен для заказов'),
                subtitle: const Text('Клиенты могут заказывать ваши услуги'),
                value: _isAvailable,
                onChanged: (value) {
                  setState(() {
                    _isAvailable = value;
                  });
                },
                activeColor: AppConstants.primaryColor,
              ),
              
              const SizedBox(height: 24),
              
              // Статистика (заглушка)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Статистика',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _StatItem(
                            icon: Icons.assignment,
                            label: 'Заказов',
                            value: '12',
                          ),
                        ),
                        Expanded(
                          child: _StatItem(
                            icon: Icons.star,
                            label: 'Рейтинг',
                            value: '4.8',
                          ),
                        ),
                        Expanded(
                          child: _StatItem(
                            icon: Icons.attach_money,
                            label: 'Заработано',
                            value: '2.4М',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 32),
              
              // Кнопка сохранения
              CustomButton(
                text: 'Сохранить изменения',
                onPressed: _isLoading ? null : _saveProfile,
                isLoading: _isLoading,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAddToolDialog(BuildContext context, String ownerId, String type) {
    final titleController = TextEditingController();
    final priceController = TextEditingController();
    final priceUnitController =
        TextEditingController(text: type == 'rent' ? 'день' : '');
    final depositController = TextEditingController();
    final descriptionController = TextEditingController();

    showDialog(
      context: context,
      builder: (dialogContext) {
        List<File> selectedImages = [];
        double uploadProgress = 0.0;
        bool isSaving = false;

        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: Text(
                type == 'rent'
                    ? 'Добавить инструмент (аренда)'
                    : 'Добавить товар (продажа)',
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                TextField(
                  controller: titleController,
                  decoration: const InputDecoration(
                    labelText: 'Название',
                    hintText: 'Например: Перфоратор Bosch',
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: priceController,
                  decoration: InputDecoration(
                    labelText: type == 'rent' ? 'Цена аренды (сум)' : 'Цена продажи (сум)',
                    hintText: type == 'rent' ? '50000' : '300000',
                  ),
                  keyboardType: TextInputType.number,
                ),
                if (type == 'rent') ...[
                  const SizedBox(height: 8),
                  TextField(
                    controller: priceUnitController,
                    decoration: const InputDecoration(
                      labelText: 'Период',
                      hintText: 'день / смена / час',
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: depositController,
                    decoration: const InputDecoration(
                      labelText: 'Залог (сум, не обязательно)',
                      hintText: '100000',
                    ),
                    keyboardType: TextInputType.number,
                  ),
                ],
                const SizedBox(height: 8),
                TextField(
                  controller: descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Описание (не обязательно)',
                    hintText: 'Состояние, комплектация, условия аренды...',
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: () async {
                      final images = await ImagePickerService.pickMultipleImages();
                      if (images.isNotEmpty) {
                        setState(() {
                          selectedImages = images;
                        });
                      }
                    },
                    icon: const Icon(Icons.photo_library),
                    label: Text(
                      selectedImages.isEmpty
                          ? 'Добавить фото'
                          : 'Фото выбраны: ${selectedImages.length}',
                    ),
                  ),
                ),
                    if (isSaving && uploadProgress > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: LinearProgressIndicator(value: uploadProgress),
                      ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Отмена'),
                ),
                ElevatedButton(
                  onPressed: isSaving
                      ? null
                      : () async {
                          if (titleController.text.trim().isEmpty ||
                              priceController.text.trim().isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Введите название и цену'),
                                backgroundColor: Colors.red,
                              ),
                            );
                            return;
                          }

                          final price = double.tryParse(
                                priceController.text.trim(),
                              ) ??
                              0.0;
                          final deposit = double.tryParse(
                            depositController.text.trim().isEmpty
                                ? '0'
                                : depositController.text.trim(),
                          );

                          setState(() {
                            isSaving = true;
                            uploadProgress = 0.0;
                          });

                          // Загружаем фото, если выбраны
                          List<String> imageUrls = [];
                          if (selectedImages.isNotEmpty) {
                            for (int i = 0; i < selectedImages.length; i++) {
                              final file = selectedImages[i];
                              final path =
                                  'tools/$ownerId/${DateTime.now().millisecondsSinceEpoch}_$i.jpg';
                              try {
                                final url =
                                    await StorageService.uploadWithProgress(
                                  path,
                                  file,
                                  onProgress: (progress) {
                                    setState(() {
                                      // показываем прогресс по последнему файлу
                                      uploadProgress = progress;
                                    });
                                  },
                                );
                                imageUrls.add(url);
                              } catch (e) {
                                print(
                                  '❌ Ошибка загрузки фото инструмента: $e',
                                );
                              }
                            }
                          }

                          final now = DateTime.now();
                          final newItem = FirestoreToolItem(
                            id: '',
                            ownerId: ownerId,
                            type: type,
                            title: titleController.text.trim(),
                            description:
                                descriptionController.text.trim().isEmpty
                                    ? null
                                    : descriptionController.text.trim(),
                            price: price,
                            priceUnit: type == 'rent'
                                ? (priceUnitController.text.trim().isEmpty
                                    ? 'день'
                                    : priceUnitController.text.trim())
                                : null,
                            deposit: type == 'rent' && (deposit ?? 0) > 0
                                ? deposit
                                : null,
                            isAvailable: true,
                            category: null,
                            imageUrls: imageUrls,
                            createdAt:
                                DateTime.fromMillisecondsSinceEpoch(0),
                            updatedAt: now,
                          );

                          try {
                            await FirestoreService.saveToolItem(newItem);
                            if (mounted) {
                              ref
                                  .read(toolsProvider.notifier)
                                  .loadToolsForSpecialist(ownerId);
                              Navigator.pop(dialogContext);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Инструмент/товар добавлен'),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            }
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Ошибка сохранения: $e'),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          }
                        },
                  child: const Text('Сохранить'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildAddToolButtons(BuildContext context, String ownerId) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () {
              _showAddToolDialog(context, ownerId, 'rent');
            },
            icon: const Icon(Icons.construction),
            label: const Text('Добавить аренду'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () {
              _showAddToolDialog(context, ownerId, 'sale');
            },
            icon: const Icon(Icons.shopping_bag_outlined),
            label: const Text('Добавить товар'),
          ),
        ),
      ],
    );
  }

  Widget _buildToolsSection(BuildContext context, ToolsState toolsState) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Инструменты и товары',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppConstants.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Сдавайте инструменты в аренду или продавайте товары прямо из профиля. '
          'Это дополнительный источник дохода для мастеров.',
          style: const TextStyle(
            fontSize: 14,
            color: AppConstants.textSecondary,
          ),
        ),
        const SizedBox(height: 16),
        if (toolsState.isLoading)
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: CircularProgressIndicator(),
            ),
          )
        else ...[
          _buildToolsHorizontalList(
            context,
            title: 'Инструменты в аренду',
            emptyText:
                'Добавьте инструменты, которые вы готовы сдавать в аренду другим мастерам.',
            items: toolsState.rentTools,
          ),
          const SizedBox(height: 16),
          _buildToolsHorizontalList(
            context,
            title: 'Товары мастера',
            emptyText:
                'Разместите расходники, материалы и другие товары, которые вы хотите продавать.',
            items: toolsState.saleTools,
          ),
        ],
      ],
    );
  }

  Widget _buildToolsHorizontalList(
    BuildContext context, {
    required String title,
    required String emptyText,
    required List<FirestoreToolItem> items,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppConstants.textPrimary,
              ),
            ),
            TextButton(
              onPressed: () {
                // TODO: перейти на экран управления инструментами
              },
              child: const Text('Управлять'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (items.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppConstants.surfaceColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppConstants.borderColor.withOpacity(0.6)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppConstants.primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.construction,
                    color: AppConstants.primaryColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        emptyText,
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppConstants.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Добавьте хотя бы один инструмент или товар — это дополнительный источник дохода.',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppConstants.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          )
        else
          SizedBox(
            height: 190,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final item = items[index];
                return GestureDetector(
                  onTap: () {
                    context.go('/home/tool-detail', extra: item);
                  },
                  child: _buildToolCard(context, item),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _buildToolCard(BuildContext context, FirestoreToolItem item) {
    final isRent = item.type == 'rent';
    final priceLabel = isRent
        ? '${item.price.toStringAsFixed(0)} сум / ${item.priceUnit ?? 'день'}'
        : '${item.price.toStringAsFixed(0)} сум';

    return Container(
      width: 200,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppConstants.borderColor.withOpacity(0.6)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Заглушка под фото
          Container(
            height: 90,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: item.imageUrls.isNotEmpty
                ? ClipRRect(
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(12)),
                    child: Image.network(
                      item.imageUrls.first,
                      fit: BoxFit.cover,
                    ),
                  )
                : Icon(
                    isRent ? Icons.construction : Icons.shopping_bag_outlined,
                    color: AppConstants.primaryColor,
                    size: 32,
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppConstants.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  priceLabel,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppConstants.primaryColor,
                  ),
                ),
                if (isRent && item.deposit != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Залог: ${item.deposit!.toStringAsFixed(0)} сум',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppConstants.textSecondary,
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                Text(
                  item.description ?? '',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppConstants.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _StatItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(
          icon,
          color: AppConstants.primaryColor,
          size: 24,
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppConstants.textPrimary,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: AppConstants.textSecondary,
          ),
        ),
      ],
    );
  }
}
