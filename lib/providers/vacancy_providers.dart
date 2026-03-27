import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/vacancy.dart';
import '../services/vacancy_service.dart';

// Провайдер для сервиса вакансий
final vacancyServiceProvider = Provider<VacancyService>((ref) {
  return VacancyService();
});

// Провайдер для всех вакансий
final allVacanciesProvider = FutureProvider<List<Vacancy>>((ref) async {
  final service = ref.watch(vacancyServiceProvider);
  return await service.getAllVacancies();
});

// Провайдер для фильтров
final vacancyFilterProvider = StateNotifierProvider<VacancyFilterNotifier, VacancyFilter>((ref) {
  return VacancyFilterNotifier();
});

// Провайдер для отфильтрованных вакансий
final filteredVacanciesProvider = Provider<List<Vacancy>>((ref) {
  final vacancies = ref.watch(allVacanciesProvider);
  final filter = ref.watch(vacancyFilterProvider);

  return vacancies.when(
    data: (vacancies) {
      var filtered = vacancies;

      // Фильтр по поиску
      if (filter.search != null && filter.search!.isNotEmpty) {
        final searchLower = filter.search!.toLowerCase();
        filtered = filtered.where((v) {
          return v.title.toLowerCase().contains(searchLower) ||
              v.company.toLowerCase().contains(searchLower) ||
              v.description.toLowerCase().contains(searchLower);
        }).toList();
      }

      // Фильтр по категории
      if (filter.category != null && filter.category!.isNotEmpty && filter.category != 'all') {
        filtered = filtered.where((v) => v.category == filter.category).toList();
      }

      // Фильтр по локации
      if (filter.location != null && filter.location!.isNotEmpty) {
        filtered = filtered.where((v) =>
            v.location.toLowerCase().contains(filter.location!.toLowerCase())).toList();
      }

      // Фильтр по намерению
      if (filter.intent != null) {
        filtered = filtered.where((v) => v.intent == filter.intent).toList();
      }

      // Фильтр по зарплате
      if (filter.salaryMin != null) {
        filtered = filtered.where((v) => v.salary >= filter.salaryMin!).toList();
      }
      if (filter.salaryMax != null) {
        filtered = filtered.where((v) => v.salary <= filter.salaryMax!).toList();
      }

      // Сортировка: сначала горячие, потом по совместимости
      filtered.sort((a, b) {
        if (a.isHot && !b.isHot) return -1;
        if (!a.isHot && b.isHot) return 1;
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        if (a.compatibilityScore != null && b.compatibilityScore != null) {
          return b.compatibilityScore!.compareTo(a.compatibilityScore!);
        }
        if (a.compatibilityScore != null) return -1;
        if (b.compatibilityScore != null) return 1;
        return 0;
      });

      return filtered;
    },
    loading: () => [],
    error: (_, __) => [],
  );
});

// Провайдер для выбранного намерения
final selectedIntentProvider = StateProvider<UserIntent?>((ref) => null);

// Провайдер для категорий
final vacancyCategoriesProvider = Provider<List<VacancyCategory>>((ref) {
  return [
    const VacancyCategory(
      id: 'all',
      name: 'Все',
      icon: '📋',
    ),
    const VacancyCategory(
      id: 'it',
      name: 'IT',
      icon: '💻',
      intent: UserIntent.growth,
    ),
    const VacancyCategory(
      id: 'sales',
      name: 'Продажи',
      icon: '💼',
      intent: UserIntent.moreIncome,
    ),
    const VacancyCategory(
      id: 'service',
      name: 'Сервис',
      icon: '🔧',
      intent: UserIntent.stability,
    ),
    const VacancyCategory(
      id: 'delivery',
      name: 'Доставка',
      icon: '🚚',
      intent: UserIntent.sideJob,
    ),
    const VacancyCategory(
      id: 'education',
      name: 'Образование',
      icon: '📚',
      intent: UserIntent.growth,
    ),
  ];
});

// Notifier для фильтров
class VacancyFilterNotifier extends StateNotifier<VacancyFilter> {
  VacancyFilterNotifier() : super(const VacancyFilter());

  void setSearch(String? search) {
    state = state.copyWith(search: search);
  }

  void setCategory(String? category) {
    state = state.copyWith(category: category);
  }

  void setLocation(String? location) {
    state = state.copyWith(location: location);
  }

  void setIntent(UserIntent? intent) {
    state = state.copyWith(intent: intent);
  }

  void setSalaryRange(int? min, int? max) {
    state = state.copyWith(salaryMin: min, salaryMax: max);
  }

  void reset() {
    state = const VacancyFilter();
  }
}

