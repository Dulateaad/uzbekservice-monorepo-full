import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../providers/vacancy_providers.dart';
import '../../providers/firestore_auth_provider.dart';
import '../../widgets/vacancy_card.dart';
import '../../l10n/app_localizations.dart';
import 'intent_selection_screen.dart';

class VacancyListScreen extends ConsumerStatefulWidget {
  const VacancyListScreen({super.key});

  @override
  ConsumerState<VacancyListScreen> createState() => _VacancyListScreenState();
}

class _VacancyListScreenState extends ConsumerState<VacancyListScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    ref.read(vacancyFilterProvider.notifier).setSearch(_searchController.text);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final selectedIntent = ref.watch(selectedIntentProvider);
    final vacancies = ref.watch(filteredVacanciesProvider);
    final categories = ref.watch(vacancyCategoriesProvider);
    final filter = ref.watch(vacancyFilterProvider);
    final authState = ref.watch(firestoreAuthProvider);
    final user = authState.user;

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: Text(l10n.odoVacancy),
        backgroundColor: AppConstants.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          // Кнопка "Мои отклики" для пользователей и специалистов
          Consumer(
            builder: (context, ref, _) {
              final authState = ref.watch(firestoreAuthProvider);
              final user = authState.user;
              if (user != null && user.userType != 'company') {
                return IconButton(
                  icon: const Icon(Icons.mail_outline),
                  onPressed: () {
                    context.push('/vacancy/applications');
                  },
                  tooltip: l10n.myApplications,
                );
              }
              return const SizedBox.shrink();
            },
          ),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {
              // TODO: Открыть экран фильтров
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Container(
            padding: const EdgeInsets.all(AppConstants.spacingMD),
            color: Colors.white,
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: l10n.searchVacancies,
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                  borderSide: BorderSide(color: AppConstants.borderColor),
                ),
                filled: true,
                fillColor: AppConstants.backgroundColor,
              ),
            ),
          ),
          // Intent selection button
          if (selectedIntent == null)
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppConstants.spacingMD,
                vertical: AppConstants.spacingSM,
              ),
              color: Colors.white,
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (context) => const IntentSelectionScreen(),
                        );
                      },
                      icon: const Icon(Icons.psychology),
                      label: Text(l10n.selectIntent),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppConstants.spacingMD,
                vertical: AppConstants.spacingSM,
              ),
              color: Colors.white,
              child: Row(
                children: [
                  Chip(
                    label: Text(selectedIntent.getTitle(l10n)),
                    avatar: Text(selectedIntent.icon),
                    onDeleted: () {
                      ref.read(selectedIntentProvider.notifier).state = null;
                      ref.read(vacancyFilterProvider.notifier).setIntent(null);
                    },
                    backgroundColor: AppConstants.primaryColor.withOpacity(0.1),
                  ),
                ],
              ),
            ),
          // Кнопка для компаний - создать вакансию
          if (user != null && user.userType == 'company')
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppConstants.spacingMD,
                vertical: AppConstants.spacingSM,
              ),
              color: Colors.white,
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    context.push('/vacancy/create');
                  },
                  icon: const Icon(Icons.add),
                  label: Text(l10n.createVacancy),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ),
          // Categories
          Container(
            height: 50,
            color: Colors.white,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppConstants.spacingMD),
              itemCount: categories.length,
              itemBuilder: (context, index) {
                final category = categories[index];
                final isSelected = filter.category == category.id;
                return Padding(
                  padding: const EdgeInsets.only(right: AppConstants.spacingSM),
                  child: FilterChip(
                    label: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(category.icon),
                        const SizedBox(width: 4),
                        Text(category.name),
                      ],
                    ),
                    selected: isSelected,
                    onSelected: (selected) {
                      ref.read(vacancyFilterProvider.notifier).setCategory(
                            selected ? category.id : null,
                          );
                    },
                  ),
                );
              },
            ),
          ),
          // Vacancies list
          Expanded(
            child: vacancies.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.search_off,
                          size: 64,
                          color: AppConstants.textSecondary,
                        ),
                        const SizedBox(height: AppConstants.spacingMD),
                        Text(
                          l10n.vacanciesNotFound,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                color: AppConstants.textSecondary,
                              ),
                        ),
                        const SizedBox(height: AppConstants.spacingSM),
                        Text(
                          l10n.tryChangeSearch,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppConstants.textSecondary,
                              ),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: () async {
                      ref.invalidate(allVacanciesProvider);
                    },
                    child: ListView.builder(
                      padding: const EdgeInsets.all(AppConstants.spacingMD),
                      itemCount: vacancies.length,
                      itemBuilder: (context, index) {
                        final vacancy = vacancies[index];
                        return VacancyCard(
                          vacancy: vacancy,
                          onTap: () {
                            context.push('/vacancy/${vacancy.id}');
                          },
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

