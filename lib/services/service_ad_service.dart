import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/firestore_models.dart';

class ServiceAdService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'service_ads';

  /// Создать новое объявление
  Future<ServiceAd> createServiceAd({
    required String specialistId,
    required String title,
    required String description,
    required String category,
    required double price,
    String? priceUnit,
    List<String>? imageUrls,
    Map<String, dynamic>? location,
    String? address,
    String? phoneNumber,
    List<String>? tags,
  }) async {
    try {
      final adId = _firestore.collection(_collection).doc().id;
      final now = DateTime.now();

      final serviceAd = ServiceAd(
        id: adId,
        specialistId: specialistId,
        title: title,
        description: description,
        category: category,
        price: price,
        priceUnit: priceUnit,
        imageUrls: imageUrls ?? [],
        isActive: true,
        isPublished: false,
        location: location,
        address: address,
        phoneNumber: phoneNumber,
        tags: tags,
        viewCount: 0,
        createdAt: now,
        updatedAt: now,
      );

      final adData = serviceAd.toMap();
      print('🔍 Создание объявления: specialistId=${adData['specialistId']}, adId=$adId');
      
      await _firestore.collection(_collection).doc(adId).set(adData);

      print('✅ Объявление создано: $adId');
      return serviceAd;
    } catch (e) {
      print('❌ Ошибка создания объявления: $e');
      rethrow;
    }
  }

  /// Обновить объявление
  Future<void> updateServiceAd(ServiceAd ad) async {
    try {
      await _firestore.collection(_collection).doc(ad.id).update({
        ...ad.toMap(),
        'updatedAt': Timestamp.fromDate(DateTime.now()),
      });
      print('✅ Объявление обновлено: ${ad.id}');
    } catch (e) {
      print('❌ Ошибка обновления объявления: $e');
      rethrow;
    }
  }

  /// Удалить объявление
  Future<void> deleteServiceAd(String adId) async {
    try {
      await _firestore.collection(_collection).doc(adId).delete();
      print('✅ Объявление удалено: $adId');
    } catch (e) {
      print('❌ Ошибка удаления объявления: $e');
      rethrow;
    }
  }

  /// Получить объявление по ID
  Future<ServiceAd?> getServiceAdById(String adId) async {
    try {
      final doc = await _firestore.collection(_collection).doc(adId).get();
      if (!doc.exists) return null;
      return ServiceAd.fromMap(doc.data()!);
    } catch (e) {
      print('❌ Ошибка получения объявления: $e');
      return null;
    }
  }

  /// Получить все объявления специалиста
  Stream<List<ServiceAd>> getSpecialistAds(String specialistId) {
    try {
      return _firestore
          .collection(_collection)
          .where('specialistId', isEqualTo: specialistId)
          .snapshots()
          .map((snapshot) {
            final ads = snapshot.docs
                .map((doc) {
                  try {
                    return ServiceAd.fromMap(doc.data());
                  } catch (e) {
                    print('⚠️ Ошибка парсинга объявления ${doc.id}: $e');
                    return null;
                  }
                })
                .whereType<ServiceAd>()
                .toList();
            
            // Сортируем в памяти по дате создания
            ads.sort((a, b) => b.createdAt.compareTo(a.createdAt));
            return ads;
          });
    } catch (e) {
      print('❌ Ошибка получения объявлений: $e');
      // Возвращаем пустой stream при ошибке
      return Stream.value([]);
    }
  }

  /// Получить все объявления специалиста (без stream)
  Future<List<ServiceAd>> getSpecialistAdsOnce(String specialistId) async {
    try {
      final snapshot = await _firestore
          .collection(_collection)
          .where('specialistId', isEqualTo: specialistId)
          .get();

      final ads = snapshot.docs
          .map((doc) {
            try {
              return ServiceAd.fromMap(doc.data());
            } catch (e) {
              print('⚠️ Ошибка парсинга объявления ${doc.id}: $e');
              return null;
            }
          })
          .whereType<ServiceAd>()
          .toList();

      // Сортируем в памяти по дате создания
      ads.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return ads;
    } catch (e) {
      print('❌ Ошибка получения объявлений специалиста: $e');
      return [];
    }
  }

  /// Опубликовать объявление
  Future<void> publishServiceAd(String adId) async {
    try {
      await _firestore.collection(_collection).doc(adId).update({
        'isPublished': true,
        'publishedAt': Timestamp.fromDate(DateTime.now()),
        'updatedAt': Timestamp.fromDate(DateTime.now()),
      });
      print('✅ Объявление опубликовано: $adId');
    } catch (e) {
      print('❌ Ошибка публикации объявления: $e');
      rethrow;
    }
  }

  /// Снять объявление с публикации
  Future<void> unpublishServiceAd(String adId) async {
    try {
      await _firestore.collection(_collection).doc(adId).update({
        'isPublished': false,
        'updatedAt': Timestamp.fromDate(DateTime.now()),
      });
      print('✅ Объявление снято с публикации: $adId');
    } catch (e) {
      print('❌ Ошибка снятия объявления с публикации: $e');
      rethrow;
    }
  }

  /// Активировать/деактивировать объявление
  Future<void> toggleServiceAdActive(String adId, bool isActive) async {
    try {
      await _firestore.collection(_collection).doc(adId).update({
        'isActive': isActive,
        'updatedAt': Timestamp.fromDate(DateTime.now()),
      });
      print('✅ Статус объявления изменен: $adId -> $isActive');
    } catch (e) {
      print('❌ Ошибка изменения статуса объявления: $e');
      rethrow;
    }
  }

  /// Увеличить счетчик просмотров
  Future<void> incrementViewCount(String adId) async {
    try {
      await _firestore.collection(_collection).doc(adId).update({
        'viewCount': FieldValue.increment(1),
      });
    } catch (e) {
      print('⚠️ Ошибка увеличения счетчика просмотров: $e');
      // Не критичная ошибка, не пробрасываем
    }
  }

  /// Получить опубликованные объявления по категории
  Stream<List<ServiceAd>> getPublishedAdsByCategory(String category) {
    return _firestore
        .collection(_collection)
        .where('category', isEqualTo: category)
        .where('isPublished', isEqualTo: true)
        .where('isActive', isEqualTo: true)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => ServiceAd.fromMap(doc.data()))
            .toList());
  }

  /// Получить все опубликованные объявления
  Stream<List<ServiceAd>> getAllPublishedAds() {
    return _firestore
        .collection(_collection)
        .where('isPublished', isEqualTo: true)
        .where('isActive', isEqualTo: true)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => ServiceAd.fromMap(doc.data()))
            .toList());
  }
}

