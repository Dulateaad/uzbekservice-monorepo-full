import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../constants/app_constants.dart';
import '../../models/firestore_models.dart';
import '../../providers/firestore_auth_provider.dart';
import '../../providers/firestore_providers.dart';
import '../../services/firestore_service.dart';
import '../../services/storage_service.dart';

class MyToolsScreen extends ConsumerStatefulWidget {
  const MyToolsScreen({super.key});

  @override
  ConsumerState<MyToolsScreen> createState() => _MyToolsScreenState();
}

class _MyToolsScreenState extends ConsumerState<MyToolsScreen> {
  String? _ownerId;

  @override
  void initState() {
    super.initState();
    final authState = ref.read(firestoreAuthProvider);
    final user = authState.user;
    if (user != null) {
      _ownerId = user.id;
      ref.read(toolsProvider.notifier).loadToolsForSpecialist(user.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(firestoreAuthProvider);
    final user = authState.user;
    final toolsState = ref.watch(toolsProvider);

    if (user == null) {
      return const Scaffold(
        body: Center(
          child: Text('Авторизуйтесь как специалист, чтобы управлять инструментами.'),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Мои инструменты'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref
              .read(toolsProvider.notifier)
              .loadToolsForSpecialist(user.id);
        },
        child: ListView(
          padding: const EdgeInsets.all(AppConstants.spacingLG),
          children: [
            const Text(
              'Инструменты в аренду',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppConstants.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            if (toolsState.isLoading && toolsState.rentTools.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (toolsState.rentTools.isEmpty)
              const Padding(
                padding: EdgeInsets.only(bottom: 16),
                child: Text(
                  'Вы ещё не добавили инструменты для аренды.',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppConstants.textSecondary,
                  ),
                ),
              )
            else
              ...toolsState.rentTools
                  .map((item) => _buildToolListTile(context, item))
                  .toList(),
            const SizedBox(height: 24),
            const Text(
              'Товары для продажи',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppConstants.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            if (toolsState.isLoading && toolsState.saleTools.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (toolsState.saleTools.isEmpty)
              const Padding(
                padding: EdgeInsets.only(bottom: 16),
                child: Text(
                  'Вы ещё не добавили товары для продажи.',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppConstants.textSecondary,
                  ),
                ),
              )
            else
              ...toolsState.saleTools
                  .map((item) => _buildToolListTile(context, item))
                  .toList(),
            const SizedBox(height: 80),
          ],
        ),
      ),
      floatingActionButton: _ownerId == null
          ? null
          : FloatingActionButton.extended(
              onPressed: () {
                // Быстро открыть создание аренды (как наиболее частый сценарий)
                _showEditToolDialog(context, type: 'rent');
              },
              icon: const Icon(Icons.add),
              label: const Text('Добавить инструмент'),
            ),
    );
  }

  Widget _buildToolListTile(BuildContext context, FirestoreToolItem item) {
    final isRent = item.type == 'rent';
    final priceLabel = isRent
        ? '${item.price.toStringAsFixed(0)} сум / ${item.priceUnit ?? 'день'}'
        : '${item.price.toStringAsFixed(0)} сум';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: SizedBox(
          width: 52,
          height: 52,
          child: item.imageUrls.isNotEmpty
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    item.imageUrls.first,
                    fit: BoxFit.cover,
                  ),
                )
              : Container(
                  decoration: BoxDecoration(
                    color: AppConstants.primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    isRent ? Icons.construction : Icons.shopping_bag_outlined,
                    color: AppConstants.primaryColor,
                  ),
                ),
        ),
        title: Text(
          item.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          priceLabel,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            color: AppConstants.primaryColor,
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.edit, size: 20),
              onPressed: () {
                _showEditToolDialog(context, existing: item);
              },
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, size: 20),
              onPressed: () => _confirmDelete(context, item),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDelete(
      BuildContext context, FirestoreToolItem item) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Удалить объявление?'),
        content: const Text(
            'Вы уверены, что хотите удалить этот инструмент/товар? Это действие нельзя отменить.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Отмена'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Удалить'),
          ),
        ],
      ),
    );

    if (shouldDelete != true) return;

    try {
      await FirestoreService.deleteToolItem(item.id);
      final ownerId = _ownerId;
      if (ownerId != null && mounted) {
        await ref.read(toolsProvider.notifier).loadToolsForSpecialist(ownerId);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Объявление удалено'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Ошибка удаления: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showEditToolDialog(
    BuildContext context, {
    FirestoreToolItem? existing,
    String? type,
  }) {
    final isEditing = existing != null;
    final effectiveType = existing?.type ?? type ?? 'rent';

    final titleController =
        TextEditingController(text: existing?.title ?? '');
    final priceController = TextEditingController(
        text: existing != null ? existing.price.toStringAsFixed(0) : '');
    final priceUnitController = TextEditingController(
      text: existing?.priceUnit ?? (effectiveType == 'rent' ? 'день' : ''),
    );
    final depositController = TextEditingController(
      text: existing?.deposit != null
          ? existing!.deposit!.toStringAsFixed(0)
          : '',
    );
    final descriptionController =
        TextEditingController(text: existing?.description ?? '');

    showDialog(
      context: context,
      builder: (context) {
        List<String> currentUrls = List<String>.from(existing?.imageUrls ?? []);
        List<File> newImages = [];
        double uploadProgress = 0.0;
        bool isSaving = false;

        final originalUrls = List<String>.from(existing?.imageUrls ?? []);

        return StatefulBuilder(
          builder: (context, setState) => AlertDialog(
            title: Text(isEditing
                ? 'Редактировать объявление'
                : (effectiveType == 'rent'
                    ? 'Добавить инструмент (аренда)'
                    : 'Добавить товар (продажа)')),
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
                      labelText: effectiveType == 'rent'
                          ? 'Цена аренды (сум)'
                          : 'Цена продажи (сум)',
                      hintText: effectiveType == 'rent' ? '50000' : '300000',
                    ),
                    keyboardType: TextInputType.number,
                  ),
                  if (effectiveType == 'rent') ...[
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
                        final images =
                            await ImagePickerService.pickMultipleImages();
                        if (images.isNotEmpty) {
                          setState(() {
                            newImages.addAll(images);
                          });
                        }
                      },
                      icon: const Icon(Icons.photo_library),
                      label: Text(
                        newImages.isEmpty
                            ? 'Добавить фото'
                            : 'Добавлено новых фото: ${newImages.length}',
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (currentUrls.isNotEmpty) ...[
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Текущие фото:',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: currentUrls.map((url) {
                        return Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                url,
                                width: 64,
                                height: 64,
                                fit: BoxFit.cover,
                              ),
                            ),
                            Positioned(
                              top: 0,
                              right: 0,
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    currentUrls.remove(url);
                                  });
                                },
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.black54,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  padding: const EdgeInsets.all(2),
                                  child: const Icon(
                                    Icons.close,
                                    size: 14,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        );
                      }).toList(),
                    ),
                  ],
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
                onPressed: () => Navigator.pop(context),
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

                      final price =
                          double.tryParse(priceController.text.trim()) ?? 0.0;
                      final deposit = double.tryParse(
                          depositController.text.trim().isEmpty
                              ? '0'
                              : depositController.text.trim());

                      final now = DateTime.now();
                      final ownerId = _ownerId;
                      if (ownerId == null) return;

                      setState(() {
                        isSaving = true;
                        uploadProgress = 0.0;
                      });

                      // Загружаем новые фото
                      List<String> newUrls = [];
                      if (newImages.isNotEmpty) {
                        for (int i = 0; i < newImages.length; i++) {
                          final file = newImages[i];
                          final path =
                              'tools/$ownerId/${DateTime.now().millisecondsSinceEpoch}_$i.jpg';
                          try {
                            final url = await StorageService.uploadWithProgress(
                              path,
                              file,
                              onProgress: (progress) {
                                setState(() {
                                  uploadProgress = progress;
                                });
                              },
                            );
                            newUrls.add(url);
                          } catch (e) {
                            print('❌ Ошибка загрузки фото инструмента: $e');
                          }
                        }
                      }

                      final allUrls = [...currentUrls, ...newUrls];

                      final baseItem = existing ??
                          FirestoreToolItem(
                            id: '',
                            ownerId: ownerId,
                            type: effectiveType,
                            title: '',
                            price: 0,
                            isAvailable: true,
                            category: null,
                            imageUrls: const [],
                            description: null,
                            priceUnit: null,
                            deposit: null,
                            createdAt: DateTime.fromMillisecondsSinceEpoch(0),
                            updatedAt: now,
                          );

                      final updated = baseItem.copyWith(
                        title: titleController.text.trim(),
                        description: descriptionController.text.trim().isEmpty
                            ? null
                            : descriptionController.text.trim(),
                        price: price,
                        priceUnit: effectiveType == 'rent'
                            ? (priceUnitController.text.trim().isEmpty
                                ? 'день'
                                : priceUnitController.text.trim())
                            : null,
                        deposit: effectiveType == 'rent' && (deposit ?? 0) > 0
                            ? deposit
                            : null,
                        updatedAt: now,
                        imageUrls: allUrls,
                      );

                      try {
                        await FirestoreService.saveToolItem(updated);

                        // Удаляем из Storage реально удалённые фото
                        final removedUrls = originalUrls
                            .where((url) => !currentUrls.contains(url))
                            .toList();
                        for (final url in removedUrls) {
                          await StorageService.deleteFileByUrl(url);
                        }

                        if (!mounted) return;
                        await ref
                            .read(toolsProvider.notifier)
                            .loadToolsForSpecialist(ownerId);
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(isEditing
                                ? 'Объявление обновлено'
                                : 'Объявление добавлено'),
                            backgroundColor: Colors.green,
                          ),
                        );
                      } catch (e) {
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Ошибка сохранения: $e'),
                            backgroundColor: Colors.red,
                          ),
                        );
                      }
                    },
                child: const Text('Сохранить'),
              ),
            ],
          ),
        );
      },
    );
  }
}


