import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/firestore_models.dart';
import '../services/firestore_service.dart';
import '../services/test_data_service.dart';

// ========== СПЕЦИАЛИСТЫ ==========


class SpecialistsState {
  final List<FirestoreUser> specialists;
  final bool isLoading;
  final String? error;

  const SpecialistsState({
    this.specialists = const [],
    this.isLoading = false,
    this.error,
  });

  SpecialistsState copyWith({
    List<FirestoreUser>? specialists,
    bool? isLoading,
    String? error,
  }) {
    return SpecialistsState(
      specialists: specialists ?? this.specialists,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class SpecialistsNotifier extends StateNotifier<SpecialistsState> {
  SpecialistsNotifier() : super(const SpecialistsState());

  // Загрузка всех специалистов
  Future<void> loadSpecialists() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final specialists = await FirestoreService.getSpecialists();
      // Если специалистов нет или мало, добавляем тестовые данные
      if (specialists.isEmpty || specialists.length < 5) {
        print('⚠️ Мало специалистов в Firestore, добавляем тестовые данные');
        final testSpecialists = TestDataService.getTestSpecialists();
        state = state.copyWith(
          specialists: [...specialists, ...testSpecialists],
          isLoading: false,
          error: null,
        );
        print('✅ Загружено специалистов: ${specialists.length} из Firestore + ${testSpecialists.length} тестовых');
      } else {
        state = state.copyWith(
          specialists: specialists,
          isLoading: false,
          error: null,
        );
        print('✅ Загружено специалистов из Firestore: ${specialists.length}');
      }
    } catch (e) {
      // Если Firestore недоступен, используем тестовые данные
      print('⚠️ Firestore недоступен, используем тестовые данные: $e');
      final testSpecialists = TestDataService.getTestSpecialists();
      state = state.copyWith(
        specialists: testSpecialists,
        isLoading: false,
        error: null,
      );
      print('✅ Загружено тестовых специалистов: ${testSpecialists.length}');
    }
  }

  // Загрузка специалистов по категории
  Future<void> loadSpecialistsByCategory(String category) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final specialists = await FirestoreService.getSpecialistsByCategory(category);
      state = state.copyWith(
        specialists: specialists,
        isLoading: false,
        error: null,
      );
      print('✅ Загружено специалистов категории $category: ${specialists.length}');
    } catch (e) {
      // Если Firestore недоступен, используем тестовые данные
      print('⚠️ Firestore недоступен, используем тестовые данные для категории $category: $e');
      final testSpecialists = TestDataService.getTestSpecialistsByCategory(category);
      state = state.copyWith(
        specialists: testSpecialists,
        isLoading: false,
        error: null,
      );
      print('✅ Загружено тестовых специалистов категории $category: ${testSpecialists.length}');
    }
  }

  // Поиск специалистов
  Future<void> searchSpecialists({
    required double lat,
    required double lng,
    required double radiusKm,
    String? category,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final specialists = await FirestoreService.searchSpecialistsByLocation(
        lat: lat,
        lng: lng,
        radiusKm: radiusKm,
        category: category,
      );
      state = state.copyWith(
        specialists: specialists,
        isLoading: false,
        error: null,
      );
      print('✅ Найдено специалистов: ${specialists.length}');
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      print('❌ Ошибка поиска специалистов: $e');
    }
  }
}

final specialistsProvider = StateNotifierProvider<SpecialistsNotifier, SpecialistsState>((ref) {
  return SpecialistsNotifier();
});

// ========== ЗАКАЗЫ ==========

final clientOrdersStreamProvider = StreamProvider.family<List<FirestoreOrder>, String>((ref, clientId) {
  return FirestoreService.watchClientOrders(clientId);
});

final specialistOrdersStreamProvider = StreamProvider.family<List<FirestoreOrder>, String>((ref, specialistId) {
  return FirestoreService.watchSpecialistOrders(specialistId);
});

class OrdersState {
  final List<FirestoreOrder> orders;
  final bool isLoading;
  final String? error;

  const OrdersState({
    this.orders = const [],
    this.isLoading = false,
    this.error,
  });

  OrdersState copyWith({
    List<FirestoreOrder>? orders,
    bool? isLoading,
    String? error,
  }) {
    return OrdersState(
      orders: orders ?? this.orders,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class OrdersNotifier extends StateNotifier<OrdersState> {
  OrdersNotifier() : super(const OrdersState());

  // Загрузка заказов клиента
  Future<void> loadClientOrders(String clientId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final orders = await FirestoreService.getClientOrders(clientId);
      state = state.copyWith(
        orders: orders,
        isLoading: false,
        error: null,
      );
      print('✅ Загружено заказов клиента: ${orders.length}');
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      print('❌ Ошибка загрузки заказов клиента: $e');
    }
  }

  // Загрузка заказов специалиста
  Future<void> loadSpecialistOrders(String specialistId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final orders = await FirestoreService.getSpecialistOrders(specialistId);
      state = state.copyWith(
        orders: orders,
        isLoading: false,
        error: null,
      );
      print('✅ Загружено заказов специалиста: ${orders.length}');
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      print('❌ Ошибка загрузки заказов специалиста: $e');
    }
  }

  // Создание заказа
  Future<void> createOrder(FirestoreOrder order) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final savedOrder = await FirestoreService.createOrder(order);
      
      // Обновляем список заказов
      final updatedOrders = [savedOrder, ...state.orders];
      state = state.copyWith(
        orders: updatedOrders,
        isLoading: false,
        error: null,
      );
      
      print('✅ Заказ создан: ${savedOrder.id}');
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      print('❌ Ошибка создания заказа: $e');
    }
  }

  // Обновление статуса заказа
  Future<void> updateOrderStatus(String orderId, String status) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await FirestoreService.updateOrderStatus(orderId, status);
      
      // Обновляем заказ в списке
      final updatedOrders = state.orders.map((order) {
        if (order.id == orderId) {
          return order.copyWith(
            status: status,
            updatedAt: DateTime.now(),
          );
        }
        return order;
      }).toList();

      state = state.copyWith(
        orders: updatedOrders,
        isLoading: false,
        error: null,
      );
      
      print('✅ Статус заказа обновлен: $orderId -> $status');
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      print('❌ Ошибка обновления статуса заказа: $e');
    }
  }

  Future<void> leaveReview({
    required FirestoreOrder order,
    required int rating,
    String? comment,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final review = FirestoreReview(
        id: '${order.id}_${DateTime.now().millisecondsSinceEpoch}',
        orderId: order.id,
        clientId: order.clientId,
        specialistId: order.specialistId,
        rating: rating.toDouble(),
        comment: comment ?? '',
        createdAt: DateTime.now(),
      );

      await FirestoreService.createReview(review);
      await FirestoreService.updateOrderStatus(order.id, 'reviewed');
      await FirestoreService.updateSpecialistRating(order.specialistId);

      final updatedOrders = state.orders.map((existing) {
        if (existing.id == order.id) {
          return existing.copyWith(
            status: 'reviewed',
            rating: review.rating,
            review: review.comment,
            updatedAt: DateTime.now(),
          );
        }
        return existing;
      }).toList();

      state = state.copyWith(
        orders: updatedOrders,
        isLoading: false,
        error: null,
      );

      print('✅ Отзыв оставлен: ${review.id}');
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      print('❌ Ошибка сохранения отзыва: $e');
      rethrow;
    }
  }
}

final ordersProvider = StateNotifierProvider<OrdersNotifier, OrdersState>((ref) {
  return OrdersNotifier();
});

// ========== ОТЗЫВЫ ==========

class ReviewsState {
  final List<FirestoreReview> reviews;
  final bool isLoading;
  final String? error;

  const ReviewsState({
    this.reviews = const [],
    this.isLoading = false,
    this.error,
  });

  ReviewsState copyWith({
    List<FirestoreReview>? reviews,
    bool? isLoading,
    String? error,
  }) {
    return ReviewsState(
      reviews: reviews ?? this.reviews,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class ReviewsNotifier extends StateNotifier<ReviewsState> {
  ReviewsNotifier() : super(const ReviewsState());

  // Загрузка отзывов специалиста
  Future<void> loadSpecialistReviews(String specialistId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final reviews = await FirestoreService.getSpecialistReviews(specialistId);
      state = state.copyWith(
        reviews: reviews,
        isLoading: false,
        error: null,
      );
      print('✅ Загружено отзывов: ${reviews.length}');
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      print('❌ Ошибка загрузки отзывов: $e');
    }
  }

  // Создание отзыва
  Future<void> createReview(FirestoreReview review) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await FirestoreService.createReview(review);
      
      // Обновляем рейтинг специалиста
      await FirestoreService.updateSpecialistRating(review.specialistId);
      
      // Обновляем список отзывов
      final updatedReviews = [review, ...state.reviews];
      state = state.copyWith(
        reviews: updatedReviews,
        isLoading: false,
        error: null,
      );
      
      print('✅ Отзыв создан: ${review.id}');
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      print('❌ Ошибка создания отзыва: $e');
    }
  }
}

final reviewsProvider = StateNotifierProvider<ReviewsNotifier, ReviewsState>((ref) {
  return ReviewsNotifier();
});

// ========== ИНСТРУМЕНТЫ / ТОВАРЫ СПЕЦИАЛИСТОВ ==========

class ToolsState {
  final List<FirestoreToolItem> rentTools;
  final List<FirestoreToolItem> saleTools;
  final bool isLoading;
  final String? error;

  const ToolsState({
    this.rentTools = const [],
    this.saleTools = const [],
    this.isLoading = false,
    this.error,
  });

  ToolsState copyWith({
    List<FirestoreToolItem>? rentTools,
    List<FirestoreToolItem>? saleTools,
    bool? isLoading,
    String? error,
  }) {
    return ToolsState(
      rentTools: rentTools ?? this.rentTools,
      saleTools: saleTools ?? this.saleTools,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class ToolsNotifier extends StateNotifier<ToolsState> {
  ToolsNotifier() : super(const ToolsState());

  Future<void> loadToolsForSpecialist(String ownerId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final rent = await FirestoreService.getSpecialistTools(ownerId, type: 'rent');
      final sale = await FirestoreService.getSpecialistTools(ownerId, type: 'sale');
      state = state.copyWith(
        rentTools: rent,
        saleTools: sale,
        isLoading: false,
        error: null,
      );
      print('✅ Загружено инструментов: аренда=${rent.length}, продажа=${sale.length}');
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      print('❌ Ошибка загрузки инструментов: $e');
    }
  }
}

final toolsProvider = StateNotifierProvider<ToolsNotifier, ToolsState>((ref) {
  return ToolsNotifier();
});
