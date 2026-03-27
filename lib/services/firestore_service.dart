import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/firestore_models.dart';
import 'chat_service.dart';
import '../config/firebase_config.dart';

class FirestoreService {
  static final FirebaseFirestore _firestore = FirebaseConfig.firestore;

  // Коллекции
  static const String _usersCollection = 'users';
  static const String _ordersCollection = 'orders';
  static const String _reviewsCollection = 'reviews';
  static const String _servicesSubcollection = 'services';

  // ========== ПОЛЬЗОВАТЕЛИ ==========

  // Создание пользователя
  static Future<FirestoreUser> createUser(FirestoreUser user) async {
    try {
      // Если ID пустой, создаём новый документ
      final docRef = user.id.isEmpty
          ? _firestore.collection(_usersCollection).doc()
          : _firestore.collection(_usersCollection).doc(user.id);

      final userWithId = user.copyWith(
        id: docRef.id,
        createdAt: user.createdAt,
        updatedAt: DateTime.now(),
      );

      await docRef.set(userWithId.toMap());
      print('✅ Пользователь создан в Firestore: ${userWithId.id}');
      return userWithId;
    } catch (e) {
      print('❌ Ошибка создания пользователя: $e');
      rethrow;
    }
  }

  // Получение пользователя по ID
  static Future<FirestoreUser?> getUserById(String userId) async {
    try {
      final doc = await _firestore
          .collection(_usersCollection)
          .doc(userId)
          .get();
      
      if (doc.exists) {
        return FirestoreUser.fromMap(doc.data()!);
      }
      return null;
    } catch (e) {
      print('❌ Ошибка получения пользователя: $e');
      return null;
    }
  }

  // Получение пользователя по номеру телефона
  static Future<FirestoreUser?> getUserByPhone(String phoneNumber) async {
    try {
      final query = await _firestore
          .collection(_usersCollection)
          .where('phoneNumber', isEqualTo: phoneNumber)
          .limit(1)
          .get();
      
      if (query.docs.isNotEmpty) {
        return FirestoreUser.fromMap(query.docs.first.data());
      }
      return null;
    } catch (e) {
      print('❌ Ошибка поиска пользователя по телефону: $e');
      return null;
    }
  }

  // Получение пользователя по oneIdSub
  static Future<FirestoreUser?> getUserByOneIdSub(String oneIdSub) async {
    try {
      final query = await _firestore
          .collection(_usersCollection)
          .where('oneIdSub', isEqualTo: oneIdSub)
          .limit(1)
          .get();

      if (query.docs.isNotEmpty) {
        return FirestoreUser.fromMap(query.docs.first.data());
      }
      return null;
    } catch (e) {
      print('❌ Ошибка поиска пользователя по oneIdSub: $e');
      return null;
    }
  }

  // Получение пользователей по ПИНФЛ (OneID PIN)
  static Future<List<FirestoreUser>> getUsersByPin(String pin) async {
    try {
      if (pin.isEmpty) {
        return [];
      }

      final query = await _firestore
          .collection(_usersCollection)
          .where('oneIdPin', isEqualTo: pin)
          .get();

      return query.docs
          .map((doc) {
            final data = doc.data();
            data['id'] = doc.id;
            return FirestoreUser.fromMap(data);
          })
          .toList();
    } catch (e) {
      print('❌ Ошибка поиска пользователей по ПИНФЛ: $e');
      return [];
    }
  }

  // Обновление пользователя
  static Future<void> updateUser(FirestoreUser user) async {
    try {
      final updatedUser = user.copyWith(updatedAt: DateTime.now());
      await _firestore
          .collection(_usersCollection)
          .doc(user.id)
          .update(updatedUser.toMap());
      print('✅ Пользователь обновлен: ${user.id}');
    } catch (e) {
      print('❌ Ошибка обновления пользователя: $e');
      rethrow;
    }
  }

  static Future<void> addDeviceToken(String userId, String token) async {
    try {
      await _firestore.collection(_usersCollection).doc(userId).update({
        'deviceTokens': FieldValue.arrayUnion([token]),
        'updatedAt': Timestamp.fromDate(DateTime.now()),
      });
      print('✅ Токен устройства добавлен для $userId');
    } catch (e) {
      print('❌ Ошибка добавления токена: $e');
      rethrow;
    }
  }

  static Future<void> removeDeviceToken(String userId, String token) async {
    try {
      await _firestore.collection(_usersCollection).doc(userId).update({
        'deviceTokens': FieldValue.arrayRemove([token]),
        'updatedAt': Timestamp.fromDate(DateTime.now()),
      });
      print('✅ Токен устройства удалён для $userId');
    } catch (e) {
      print('❌ Ошибка удаления токена: $e');
      rethrow;
    }
  }

  static Future<void> updateNotificationPreferences(
    String userId,
    Map<String, bool> preferences,
  ) async {
    try {
      await _firestore.collection(_usersCollection).doc(userId).update({
        'notificationPreferences': preferences,
        'updatedAt': Timestamp.fromDate(DateTime.now()),
      });
      print('✅ Настройки уведомлений обновлены для $userId');
    } catch (e) {
      print('❌ Ошибка обновления настроек уведомлений: $e');
      rethrow;
    }
  }

  // Получение всех специалистов
  static Future<List<FirestoreUser>> getSpecialists() async {
    try {
      final query = await _firestore
          .collection(_usersCollection)
          .where('userType', isEqualTo: 'specialist')
          .orderBy('rating', descending: true)
          .get();
      
      return query.docs
          .map((doc) => FirestoreUser.fromMap(doc.data()))
          .toList();
    } catch (e) {
      print('❌ Ошибка получения специалистов: $e');
      return [];
    }
  }

  // Получение специалистов по категории
  static Future<List<FirestoreUser>> getSpecialistsByCategory(String category) async {
    try {
      final query = await _firestore
          .collection(_usersCollection)
          .where('userType', isEqualTo: 'specialist')
          .where('category', isEqualTo: category)
          .orderBy('rating', descending: true)
          .get();
      
      return query.docs
          .map((doc) => FirestoreUser.fromMap(doc.data()))
          .toList();
    } catch (e) {
      print('❌ Ошибка получения специалистов по категории: $e');
      return [];
    }
  }

  // ========== УСЛУГИ СПЕЦИАЛИСТОВ ==========

  static CollectionReference<Map<String, dynamic>> _specialistServicesRef(String specialistId) {
    return _firestore.collection(_usersCollection).doc(specialistId).collection(_servicesSubcollection);
  }

  static Future<List<FirestoreSpecialistService>> getSpecialistServices(String specialistId) async {
    try {
      final snapshot = await _specialistServicesRef(specialistId)
          .where('isActive', isEqualTo: true)
          .orderBy('name')
          .get();

      return snapshot.docs.map((doc) {
        final data = doc.data();
        data['id'] = doc.id;
        data['specialistId'] = specialistId;
        return FirestoreSpecialistService.fromMap(data);
      }).toList();
    } catch (e) {
      print('❌ Ошибка получения услуг специалиста: $e');
      return [];
    }
  }

  static Stream<List<FirestoreSpecialistService>> watchSpecialistServices(String specialistId) {
    return _specialistServicesRef(specialistId)
        .orderBy('name')
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) {
              final data = doc.data();
              data['id'] = doc.id;
              data['specialistId'] = specialistId;
              return FirestoreSpecialistService.fromMap(data);
            }).toList());
  }

  static Future<FirestoreSpecialistService?> getSpecialistServiceById(
    String specialistId,
    String serviceId,
  ) async {
    try {
      final doc = await _specialistServicesRef(specialistId).doc(serviceId).get();
      if (!doc.exists) return null;
      final data = doc.data()!;
      data['id'] = doc.id;
      data['specialistId'] = specialistId;
      return FirestoreSpecialistService.fromMap(data);
    } catch (e) {
      print('❌ Ошибка получения услуги: $e');
      return null;
    }
  }

  // ========== ЗАКАЗЫ ==========

  // Создание заказа
  static Future<FirestoreOrder> createOrder(FirestoreOrder order) async {
    try {
      final ordersRef = _firestore.collection('orders');
      final docRef = order.id.isEmpty ? ordersRef.doc() : ordersRef.doc(order.id);
      final createdAt = order.createdAt;
      final orderToSave = order.copyWith(
        id: docRef.id,
        createdAt: createdAt,
        updatedAt: DateTime.now(),
      );

      await docRef.set(orderToSave.toMap());
      print('✅ Заказ создан: ${orderToSave.id}');
      
      // Создаем чат для заказа
      try {
        await ChatService.createChat(
          clientId: orderToSave.clientId,
          specialistId: orderToSave.specialistId,
          orderId: orderToSave.id,
        );
        print('✅ Чат создан для заказа: ${orderToSave.id}');
      } catch (chatError) {
        print('⚠️ Ошибка создания чата (заказ все равно создан): $chatError');
        // Не прерываем создание заказа, если чат не создался
      }
      
      return orderToSave;
    } catch (e) {
      print('❌ Ошибка создания заказа: $e');
      rethrow;
    }
  }

  // Получение заказов клиента
  static Future<List<FirestoreOrder>> getClientOrders(String clientId) async {
    try {
      final query = await _firestore
          .collection('orders')
          .where('clientId', isEqualTo: clientId)
          .orderBy('createdAt', descending: true)
          .get();
      
      return query.docs
          .map((doc) => FirestoreOrder.fromMap(doc.data()))
          .toList();
    } catch (e) {
      print('❌ Ошибка получения заказов клиента: $e');
      return [];
    }
  }

  // Получение заказов специалиста
  static Future<List<FirestoreOrder>> getSpecialistOrders(String specialistId) async {
    try {
      final query = await _firestore
          .collection('orders')
          .where('specialistId', isEqualTo: specialistId)
          .orderBy('createdAt', descending: true)
          .get();
      
      return query.docs
          .map((doc) => FirestoreOrder.fromMap(doc.data()))
          .toList();
    } catch (e) {
      print('❌ Ошибка получения заказов специалиста: $e');
      return [];
    }
  }

  // Получение заказа по ID
  static Future<FirestoreOrder?> getOrderById(String orderId) async {
    try {
      final doc = await _firestore.collection('orders').doc(orderId).get();
      if (doc.exists) {
        final data = doc.data()!;
        data['id'] = doc.id;
        return FirestoreOrder.fromMap(data);
      }
      return null;
    } catch (e) {
      print('❌ Ошибка получения заказа по ID: $e');
      return null;
    }
  }

  static Stream<List<FirestoreOrder>> watchClientOrders(String clientId) {
    return _firestore
        .collection('orders')
        .where('clientId', isEqualTo: clientId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => FirestoreOrder.fromMap(doc.data()))
            .toList());
  }

  static Stream<List<FirestoreOrder>> watchSpecialistOrders(String specialistId) {
    return _firestore
        .collection('orders')
        .where('specialistId', isEqualTo: specialistId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => FirestoreOrder.fromMap(doc.data()))
            .toList());
  }

  // ========== ИНСТРУМЕНТЫ / ТОВАРЫ СПЕЦИАЛИСТОВ ==========

  /// Получить список инструментов / товаров специалиста
  static Future<List<FirestoreToolItem>> getSpecialistTools(
    String ownerId, {
    String? type, // rent | sale
  }) async {
    try {
      Query<Map<String, dynamic>> query = _firestore
          .collection('tools')
          .where('ownerId', isEqualTo: ownerId)
          .orderBy('createdAt', descending: true);

      if (type != null) {
        query = query.where('type', isEqualTo: type);
      }

      final snapshot = await query.get();
      return snapshot.docs.map((doc) {
        final data = doc.data();
        data['id'] = doc.id;
        return FirestoreToolItem.fromMap(data);
      }).toList();
    } catch (e) {
      print('❌ Ошибка получения инструментов специалиста: $e');
      return [];
    }
  }

  /// Стрим инструментов / товаров специалиста
  static Stream<List<FirestoreToolItem>> watchSpecialistTools(
    String ownerId, {
    String? type,
  }) {
    Query<Map<String, dynamic>> query = _firestore
        .collection('tools')
        .where('ownerId', isEqualTo: ownerId)
        .orderBy('createdAt', descending: true);

    if (type != null) {
      query = query.where('type', isEqualTo: type);
    }

    return query.snapshots().map((snapshot) {
      return snapshot.docs.map((doc) {
        final data = doc.data();
        data['id'] = doc.id;
        return FirestoreToolItem.fromMap(data);
      }).toList();
    });
  }

  /// Создать или обновить инструмент / товар
  static Future<FirestoreToolItem> saveToolItem(FirestoreToolItem item) async {
    try {
      final toolsRef = _firestore.collection('tools');
      final docRef = item.id.isEmpty ? toolsRef.doc() : toolsRef.doc(item.id);
      final now = DateTime.now();
      final toolToSave = FirestoreToolItem(
        id: docRef.id,
        ownerId: item.ownerId,
        type: item.type,
        title: item.title,
        description: item.description,
        price: item.price,
        priceUnit: item.priceUnit,
        deposit: item.deposit,
        isAvailable: item.isAvailable,
        category: item.category,
        imageUrls: item.imageUrls,
        createdAt: item.createdAt == DateTime.fromMillisecondsSinceEpoch(0)
            ? now
            : item.createdAt,
        updatedAt: now,
      );

      await docRef.set(toolToSave.toMap(), SetOptions(merge: true));
      print('✅ Инструмент/товар сохранен: ${toolToSave.id}');
      return toolToSave;
    } catch (e) {
      print('❌ Ошибка сохранения инструмента/товара: $e');
      rethrow;
    }
  }

  /// Удалить инструмент / товар
  static Future<void> deleteToolItem(String id) async {
    try {
      await _firestore.collection('tools').doc(id).delete();
      print('✅ Инструмент/товар удален: $id');
    } catch (e) {
      print('❌ Ошибка удаления инструмента/товара: $e');
      rethrow;
    }
  }

  // Обновление статуса заказа
  static Future<void> updateOrderStatus(String orderId, String status) async {
    try {
      final updates = <String, dynamic>{
        'status': status,
        'updatedAt': Timestamp.fromDate(DateTime.now()),
      };

      if (status == 'completed') {
        updates['completedAt'] = Timestamp.fromDate(DateTime.now());
      }

      await _firestore.collection('orders').doc(orderId).update(updates);

      print('✅ Статус заказа обновлен: $orderId -> $status');
    } catch (e) {
      print('❌ Ошибка обновления статуса заказа: $e');
      rethrow;
    }
  }

  // ========== ОТЗЫВЫ ==========

  // Создание отзыва
  static Future<void> createReview(FirestoreReview review) async {
    try {
      await _firestore
          .collection(_reviewsCollection)
          .doc(review.id)
          .set(review.toMap());
      print('✅ Отзыв создан: ${review.id}');
    } catch (e) {
      print('❌ Ошибка создания отзыва: $e');
      rethrow;
    }
  }

  // Получение отзывов специалиста
  static Future<List<FirestoreReview>> getSpecialistReviews(String specialistId) async {
    try {
      final query = await _firestore
          .collection(_reviewsCollection)
          .where('specialistId', isEqualTo: specialistId)
          .orderBy('createdAt', descending: true)
          .get();
      
      return query.docs
          .map((doc) => FirestoreReview.fromMap(doc.data()))
          .toList();
    } catch (e) {
      print('❌ Ошибка получения отзывов: $e');
      return [];
    }
  }

  // ========== СТАТИСТИКА ==========

  // Обновление рейтинга специалиста
  static Future<void> updateSpecialistRating(String specialistId) async {
    try {
      final reviews = await getSpecialistReviews(specialistId);
      if (reviews.isEmpty) return;

      final averageRating = reviews
          .map((r) => r.rating)
          .reduce((a, b) => a + b) / reviews.length;

      await _firestore
          .collection(_usersCollection)
          .doc(specialistId)
          .update({
        'rating': averageRating,
        'totalOrders': reviews.length,
        'updatedAt': Timestamp.fromDate(DateTime.now()),
      });

      print('✅ Рейтинг специалиста обновлен: $specialistId -> $averageRating');
    } catch (e) {
      print('❌ Ошибка обновления рейтинга: $e');
    }
  }

    // Рейтинг по городам и нишам за месяц
Future<List<CitySpecialistRating>> getCityRatingsByCategoryForMonth(
    DateTime monthStart,
  ) async {
    try {
      final monthEnd = DateTime(monthStart.year, monthStart.month + 1, 1);

      final snapshot = await FirebaseFirestore.instance
          .collection('orders')
          .where('status', isEqualTo: 'completed')
          .where('createdAt', isGreaterThanOrEqualTo: Timestamp.fromDate(monthStart))
          .where('createdAt', isLessThan: Timestamp.fromDate(monthEnd))
          .get();

      final Map<String, _CityAgg> agg = {};

      for (final doc in snapshot.docs) {
        final data = doc.data() as Map<String, dynamic>;
        final order = FirestoreOrder.fromMap(data);

        String city = (order.address ?? '').split(',').first.trim();
        if (city.isEmpty) city = 'Не указан';

        final key = '____';
        final rating = order.rating ?? 0.0;

        agg.putIfAbsent(
          key,
          () => _CityAgg(
            city: city,
            category: order.category,
            specialistId: order.specialistId,
            specialistName: order.title,
          ),
        );

        final a = agg[key]!;
        a.totalOrders += 1;
        if (rating > 0) {
          a.totalReviews += 1;
          a.ratingSum += rating;
        }
      }

      return agg.values.map((a) {
        final avg = a.totalReviews > 0 ? a.ratingSum / a.totalReviews : 0.0;
        return CitySpecialistRating(
          city: a.city,
          category: a.category,
          specialistId: a.specialistId,
          specialistName: a.specialistName,
          averageRating: double.parse(avg.toStringAsFixed(2)),
          totalReviews: a.totalReviews,
          totalOrders: a.totalOrders,
        );
      }).toList();
    } catch (e) {
      print('❌ Ошибка получения рейтинга по городам: ');
      return [];
    }
  }

  // ========== ПОИСК ==========

  // Поиск специалистов по местоположению
  static Future<List<FirestoreUser>> searchSpecialistsByLocation({
    required double lat,
    required double lng,
    required double radiusKm,
    String? category,
  }) async {
    try {
      // Простой поиск по категории (для демонстрации)
      // В реальном приложении используйте GeoFirestore
      Query query = _firestore
          .collection(_usersCollection)
          .where('userType', isEqualTo: 'specialist');

      if (category != null) {
        query = query.where('category', isEqualTo: category);
      }

      final snapshot = await query.get();
      return snapshot.docs
          .map((doc) => FirestoreUser.fromMap(doc.data() as Map<String, dynamic>))
          .toList();
    } catch (e) {
      print('❌ Ошибка поиска специалистов: $e');
      return [];
    }
  }
}


Future<List<CitySpecialistRating>> getCityRatingsByCategoryForMonth(
    DateTime monthStart,
  ) async {
    try {
      final monthEnd = DateTime(monthStart.year, monthStart.month + 1, 1);

      final snapshot = await FirebaseFirestore.instance
          .collection('orders')
          .where('status', isEqualTo: 'completed')
          .where('createdAt', isGreaterThanOrEqualTo: Timestamp.fromDate(monthStart))
          .where('createdAt', isLessThan: Timestamp.fromDate(monthEnd))
          .get();

      // ключ: city__category__specialistId
      final Map<String, _CityAgg> agg = {};

      for (final doc in snapshot.docs) {
        final data = doc.data() as Map<String, dynamic>;
        final order = FirestoreOrder.fromMap(data);

        String city = (order.address ?? '').split(',').first.trim();
        if (city.isEmpty) city = 'Не указан';

        final key = '${city}__${order.category}__${order.specialistId}';
        final rating = order.rating ?? 0.0;

        agg.putIfAbsent(
          key,
          () => _CityAgg(
            city: city,
            category: order.category,
            specialistId: order.specialistId,
            specialistName: order.title,
          ),
        );

        final a = agg[key]!;
        a.totalOrders += 1;
        if (rating > 0) {
          a.totalReviews += 1;
          a.ratingSum += rating;
        }
      }

      return agg.values.map((a) {
        final avg = a.totalReviews > 0 ? a.ratingSum / a.totalReviews : 0.0;
        return CitySpecialistRating(
          city: a.city,
          category: a.category,
          specialistId: a.specialistId,
          specialistName: a.specialistName,
          averageRating: double.parse(avg.toStringAsFixed(2)),
          totalReviews: a.totalReviews,
          totalOrders: a.totalOrders,
        );
      }).toList();
    } catch (e) {
      print('❌ Ошибка получения рейтинга по городам: $e');
      return [];
    }
  }

class _CityAgg {
  final String city;
  final String category;
  final String specialistId;
  final String specialistName;
  int totalOrders = 0;
  int totalReviews = 0;
  double ratingSum = 0.0;

  _CityAgg({
    required this.city,
    required this.category,
    required this.specialistId,
    required this.specialistName,
  });
}
