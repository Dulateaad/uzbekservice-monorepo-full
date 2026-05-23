import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../providers/specialist_provider.dart';
import '../../widgets/specialist_card.dart';
import '../../widgets/search_bar_widget.dart';

class SpecialistListScreen extends ConsumerStatefulWidget {
  final String categoryId;
  
  const SpecialistListScreen({
    super.key,
    required this.categoryId,
  });

  @override
  ConsumerState<SpecialistListScreen> createState() => _SpecialistListScreenState();
}

class _SpecialistListScreenState extends ConsumerState<SpecialistListScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(specialistProvider.notifier).loadSpecialistsByCategory(widget.categoryId);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  String _getCategoryName() {
    if (widget.categoryId == 'all') {
      return 'Все специалисты';
    }
    final category = AppConstants.serviceCategories.firstWhere(
      (cat) => cat['id'] == widget.categoryId,
      orElse: () => {'name': 'Специалисты'},
    );
    return category['name'] as String;
  }

  @override
  Widget build(BuildContext context) {
    final specialistState = ref.watch(specialistProvider);
    
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: Text(_getCategoryName()),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {
              _showFilterDialog();
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Поиск
          Padding(
            padding: const EdgeInsets.all(16),
            child: SearchBarWidget(
              hintText: 'Поиск специалистов...',
              onChanged: (value) {
                setState(() {
                  _searchQuery = value;
                });
              },
            ),
          ),
          
          // Список специалистов
          Expanded(
            child: specialistState.isLoading
                ? const Center(
                    child: CircularProgressIndicator(),
                  )
                : specialistState.error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.error_outline,
                              size: 64,
                              color: Colors.red,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Ошибка загрузки',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              specialistState.error!,
                              style: Theme.of(context).textTheme.bodyMedium,
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: () {
                                ref.read(specialistProvider.notifier)
                                    .loadSpecialistsByCategory(widget.categoryId);
                              },
                              child: const Text('Повторить'),
                            ),
                          ],
                        ),
                      )
                    : specialistState.specialists.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.search_off,
                                  size: 64,
                                  color: Colors.grey,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'Специалисты не найдены',
                                  style: Theme.of(context).textTheme.headlineSmall,
                                ),
                                const SizedBox(height: 8),
                                const Text(
                                  'Попробуйте изменить параметры поиска',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: specialistState.specialists.length,
                            itemBuilder: (context, index) {
                              final specialist = specialistState.specialists[index];
                              
                              // Фильтрация по поисковому запросу
                              if (_searchQuery.isNotEmpty) {
                                final query = _searchQuery.toLowerCase();
                                if (!specialist.name.toLowerCase().contains(query) &&
                                    !specialist.description.toLowerCase().contains(query)) {
                                  return const SizedBox.shrink();
                                }
                              }
                              
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 16),
                                child: SpecialistCard(
                                  name: specialist.name,
                                  category: specialist.category,
                                  location: specialist.location,
                                  rating: specialist.rating,
                                  reviewCount: specialist.reviewCount,
                                  avatarUrl: specialist.photos.isNotEmpty ? specialist.photos.first : null,
                                  isFeatured: specialist.isAvailable,
                                  onTap: () {
                                    context.go('/home/specialist/${specialist.id}');
                                  },
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }

  void _showFilterDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Фильтры'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Только доступные'),
              trailing: Switch(
                value: false,
                onChanged: (value) {
                  // TODO: Implement filter logic
                },
              ),
            ),
            ListTile(
              title: const Text('Рейтинг от 4.0'),
              trailing: Switch(
                value: false,
                onChanged: (value) {
                  // TODO: Implement filter logic
                },
              ),
            ),
            ListTile(
              title: const Text('Цена до 100,000 сум'),
              trailing: Switch(
                value: false,
                onChanged: (value) {
                  // TODO: Implement filter logic
                },
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Apply filters
            },
            child: const Text('Применить'),
          ),
        ],
      ),
    );
  }
}
