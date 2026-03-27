import 'package:cloud_firestore/cloud_firestore.dart';

// Модель пользователя для Firestore
class FirestoreUser {
  final String id;
  final String phoneNumber;
  final String name;
  final String userType; // 'client' или 'specialist'
  final String? email;
  final String? oneIdSub; // связка с OneID
  final String? category; // для специалистов
  final String? description; // для специалистов
  final double? pricePerHour; // для специалистов
  final String? avatarUrl;
  final List<String>? deviceTokens;
  final Map<String, bool>? notificationPreferences;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isVerified;
  final Map<String, dynamic>? location; // {lat: double, lng: double}
  final List<String>? skills; // для специалистов
  final double? rating; // средний рейтинг
  final int? totalOrders; // количество заказов
  final List<String>? onboardingIntents; // Намерения пользователя при регистрации

  FirestoreUser({
    required this.id,
    required this.phoneNumber,
    required this.name,
    required this.userType,
    this.email,
    this.oneIdSub,
    this.category,
    this.description,
    this.pricePerHour,
    this.avatarUrl,
    this.deviceTokens,
    this.notificationPreferences,
    required this.createdAt,
    required this.updatedAt,
    this.isVerified = false,
    this.location,
    this.skills,
    this.rating,
    this.totalOrders,
    this.onboardingIntents,
  });

  // Конвертация в Map для Firestore
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'phoneNumber': phoneNumber,
      'name': name,
      'userType': userType,
      'email': email,
      'oneIdSub': oneIdSub,
      'category': category,
      'description': description,
      'pricePerHour': pricePerHour,
      'avatarUrl': avatarUrl,
      if (deviceTokens != null) 'deviceTokens': deviceTokens,
      if (notificationPreferences != null) 'notificationPreferences': notificationPreferences,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
      'isVerified': isVerified,
      'location': location,
      'skills': skills,
      'rating': rating,
      'totalOrders': totalOrders,
      if (onboardingIntents != null) 'onboardingIntents': onboardingIntents,
    };
  }

  // Создание из Map из Firestore
  factory FirestoreUser.fromMap(Map<String, dynamic> map) {
    return FirestoreUser(
      id: map['id'] ?? '',
      phoneNumber: map['phoneNumber'] ?? '',
      name: map['name'] ?? '',
      userType: map['userType'] ?? 'client',
      email: map['email'],
      oneIdSub: map['oneIdSub'],
      category: map['category'],
      description: map['description'],
      pricePerHour: map['pricePerHour']?.toDouble(),
      avatarUrl: map['avatarUrl'],
      deviceTokens: map['deviceTokens'] != null
          ? List<String>.from(map['deviceTokens'])
          : const <String>[],
      notificationPreferences: map['notificationPreferences'] != null
          ? Map<String, bool>.from(map['notificationPreferences'])
          : const {
              'push': true,
              'sms': true,
              'email': true,
            },
      createdAt: (map['createdAt'] as Timestamp).toDate(),
      updatedAt: (map['updatedAt'] as Timestamp).toDate(),
      isVerified: map['isVerified'] ?? false,
      location: map['location'] != null ? Map<String, dynamic>.from(map['location']) : null,
      skills: map['skills'] != null ? List<String>.from(map['skills']) : null,
      rating: map['rating']?.toDouble(),
      totalOrders: map['totalOrders'],
      onboardingIntents: map['onboardingIntents'] != null
          ? List<String>.from(map['onboardingIntents'])
          : null,
    );
  }

  // Копирование с изменениями
  FirestoreUser copyWith({
    String? id,
    String? phoneNumber,
    String? name,
    String? userType,
    String? email,
    String? oneIdSub,
    String? category,
    String? description,
    double? pricePerHour,
    String? avatarUrl,
    List<String>? deviceTokens,
    Map<String, bool>? notificationPreferences,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isVerified,
    Map<String, dynamic>? location,
    List<String>? skills,
    double? rating,
    int? totalOrders,
    List<String>? onboardingIntents,
  }) {
    return FirestoreUser(
      id: id ?? this.id,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      name: name ?? this.name,
      userType: userType ?? this.userType,
      email: email ?? this.email,
      oneIdSub: oneIdSub ?? this.oneIdSub,
      category: category ?? this.category,
      description: description ?? this.description,
      pricePerHour: pricePerHour ?? this.pricePerHour,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      deviceTokens: deviceTokens ?? this.deviceTokens,
      notificationPreferences: notificationPreferences ?? this.notificationPreferences,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isVerified: isVerified ?? this.isVerified,
      location: location ?? this.location,
      skills: skills ?? this.skills,
      rating: rating ?? this.rating,
      totalOrders: totalOrders ?? this.totalOrders,
      onboardingIntents: onboardingIntents ?? this.onboardingIntents,
    );
  }
}

// Модель объявления услуги специалиста
class ServiceAd {
  final String id;
  final String specialistId;
  final String title; // Название объявления
  final String description; // Описание услуги
  final String category; // Категория услуги
  final double price; // Цена
  final String? priceUnit; // Единица измерения (за час, за услугу, за м² и т.д.)
  final List<String> imageUrls; // Фотографии услуги
  final bool isActive; // Активно ли объявление
  final bool isPublished; // Опубликовано ли объявление
  final Map<String, dynamic>? location; // Геолокация {lat: double, lng: double}
  final String? address; // Адрес
  final String? phoneNumber; // Контактный телефон
  final List<String>? tags; // Теги для поиска
  final int viewCount; // Количество просмотров
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? publishedAt; // Дата публикации

  ServiceAd({
    required this.id,
    required this.specialistId,
    required this.title,
    required this.description,
    required this.category,
    required this.price,
    this.priceUnit,
    this.imageUrls = const [],
    this.isActive = true,
    this.isPublished = false,
    this.location,
    this.address,
    this.phoneNumber,
    this.tags,
    this.viewCount = 0,
    required this.createdAt,
    required this.updatedAt,
    this.publishedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'specialistId': specialistId,
      'title': title,
      'description': description,
      'category': category,
      'price': price,
      'priceUnit': priceUnit,
      'imageUrls': imageUrls,
      'isActive': isActive,
      'isPublished': isPublished,
      'location': location,
      'address': address,
      'phoneNumber': phoneNumber,
      'tags': tags,
      'viewCount': viewCount,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
      'publishedAt': publishedAt != null ? Timestamp.fromDate(publishedAt!) : null,
    };
  }

  factory ServiceAd.fromMap(Map<String, dynamic> map) {
    return ServiceAd(
      id: map['id'] ?? '',
      specialistId: map['specialistId'] ?? '',
      title: map['title'] ?? '',
      description: map['description'] ?? '',
      category: map['category'] ?? '',
      price: map['price']?.toDouble() ?? 0.0,
      priceUnit: map['priceUnit'],
      imageUrls: map['imageUrls'] != null ? List<String>.from(map['imageUrls']) : const [],
      isActive: map['isActive'] ?? true,
      isPublished: map['isPublished'] ?? false,
      location: map['location'] != null ? Map<String, dynamic>.from(map['location']) : null,
      address: map['address'],
      phoneNumber: map['phoneNumber'],
      tags: map['tags'] != null ? List<String>.from(map['tags']) : null,
      viewCount: map['viewCount'] ?? 0,
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      publishedAt: map['publishedAt'] != null ? (map['publishedAt'] as Timestamp).toDate() : null,
    );
  }

  ServiceAd copyWith({
    String? id,
    String? specialistId,
    String? title,
    String? description,
    String? category,
    double? price,
    String? priceUnit,
    List<String>? imageUrls,
    bool? isActive,
    bool? isPublished,
    Map<String, dynamic>? location,
    String? address,
    String? phoneNumber,
    List<String>? tags,
    int? viewCount,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? publishedAt,
  }) {
    return ServiceAd(
      id: id ?? this.id,
      specialistId: specialistId ?? this.specialistId,
      title: title ?? this.title,
      description: description ?? this.description,
      category: category ?? this.category,
      price: price ?? this.price,
      priceUnit: priceUnit ?? this.priceUnit,
      imageUrls: imageUrls ?? this.imageUrls,
      isActive: isActive ?? this.isActive,
      isPublished: isPublished ?? this.isPublished,
      location: location ?? this.location,
      address: address ?? this.address,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      tags: tags ?? this.tags,
      viewCount: viewCount ?? this.viewCount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      publishedAt: publishedAt ?? this.publishedAt,
    );
  }
}

// Модель услуги специалиста
class FirestoreSpecialistService {
  final String id;
  final String specialistId;
  final String name;
  final String? description;
  final double price;
  final int durationMinutes;
  final String? category;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  FirestoreSpecialistService({
    required this.id,
    required this.specialistId,
    required this.name,
    this.description,
    required this.price,
    required this.durationMinutes,
    this.category,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'specialistId': specialistId,
      'name': name,
      'description': description,
      'price': price,
      'durationMinutes': durationMinutes,
      'category': category,
      'isActive': isActive,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  factory FirestoreSpecialistService.fromMap(Map<String, dynamic> map) {
    return FirestoreSpecialistService(
      id: map['id'] ?? '',
      specialistId: map['specialistId'] ?? '',
      name: map['name'] ?? '',
      description: map['description'],
      price: map['price']?.toDouble() ?? 0.0,
      durationMinutes: map['durationMinutes'] ?? 0,
      category: map['category'],
      isActive: map['isActive'] ?? true,
      createdAt: (map['createdAt'] as Timestamp).toDate(),
      updatedAt: (map['updatedAt'] as Timestamp).toDate(),
    );
  }

  FirestoreSpecialistService copyWith({
    String? id,
    String? specialistId,
    String? name,
    String? description,
    double? price,
    int? durationMinutes,
    String? category,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return FirestoreSpecialistService(
      id: id ?? this.id,
      specialistId: specialistId ?? this.specialistId,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      category: category ?? this.category,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

// Услуга, выбранная в заказе
class OrderServiceItem {
  final String id;
  final String name;
  final double price;
  final int durationMinutes;
  final String? description;
  final String? category;

  const OrderServiceItem({
    required this.id,
    required this.name,
    required this.price,
    required this.durationMinutes,
    this.description,
    this.category,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'durationMinutes': durationMinutes,
      'description': description,
      'category': category,
    };
  }

  factory OrderServiceItem.fromMap(Map<String, dynamic> map) {
    return OrderServiceItem(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      price: map['price']?.toDouble() ?? 0.0,
      durationMinutes: map['durationMinutes'] ?? 0,
      description: map['description'],
      category: map['category'],
    );
  }
}

// Модель заказа
class FirestoreOrder {
  final String id;
  final String clientId;
  final String specialistId;
  final String category;
  final String title;
  final String description;
  final String status; // 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'
  final double price;
  final String? address;
  final Map<String, dynamic>? location;
  final DateTime scheduledDate;
  final String? timeSlot;
  final int totalDurationMinutes;
  final List<OrderServiceItem> services;
  final DateTime? completedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<String>? images;
  final String? notes;
  final double? rating;
  final String? review;

  FirestoreOrder({
    required this.id,
    required this.clientId,
    required this.specialistId,
    required this.category,
    required this.title,
    required this.description,
    required this.status,
    required this.price,
    this.address,
    this.location,
    required this.scheduledDate,
    this.timeSlot,
    this.totalDurationMinutes = 0,
    this.services = const [],
    this.completedAt,
    required this.createdAt,
    required this.updatedAt,
    this.images,
    this.notes,
    this.rating,
    this.review,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'clientId': clientId,
      'specialistId': specialistId,
      'category': category,
      'title': title,
      'description': description,
      'status': status,
      'price': price,
      'address': address,
      'location': location,
      'scheduledDate': Timestamp.fromDate(scheduledDate),
      'timeSlot': timeSlot,
      'totalDurationMinutes': totalDurationMinutes,
      'services': services.map((service) => service.toMap()).toList(),
      'completedAt': completedAt != null ? Timestamp.fromDate(completedAt!) : null,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
      'images': images,
      'notes': notes,
      'rating': rating,
      'review': review,
    };
  }

  factory FirestoreOrder.fromMap(Map<String, dynamic> map) {
    return FirestoreOrder(
      id: map['id'] ?? '',
      clientId: map['clientId'] ?? '',
      specialistId: map['specialistId'] ?? '',
      category: map['category'] ?? '',
      title: map['title'] ?? '',
      description: map['description'] ?? '',
      status: map['status'] ?? 'pending',
      price: map['price']?.toDouble() ?? 0.0,
      address: map['address'],
      location: map['location'] != null ? Map<String, dynamic>.from(map['location']) : null,
      scheduledDate: (map['scheduledDate'] as Timestamp).toDate(),
      timeSlot: map['timeSlot'],
      totalDurationMinutes: map['totalDurationMinutes'] ?? 0,
      services: map['services'] != null
          ? List<Map<String, dynamic>>.from(map['services'])
              .map(OrderServiceItem.fromMap)
              .toList()
          : const [],
      completedAt: map['completedAt'] != null ? (map['completedAt'] as Timestamp).toDate() : null,
      createdAt: (map['createdAt'] as Timestamp).toDate(),
      updatedAt: (map['updatedAt'] as Timestamp).toDate(),
      images: map['images'] != null ? List<String>.from(map['images']) : null,
      notes: map['notes'],
      rating: map['rating']?.toDouble(),
      review: map['review'],
    );
  }

  FirestoreOrder copyWith({
    String? id,
    String? clientId,
    String? specialistId,
    String? category,
    String? title,
    String? description,
    String? status,
    double? price,
    String? address,
    Map<String, dynamic>? location,
    DateTime? scheduledDate,
    String? timeSlot,
    int? totalDurationMinutes,
    List<OrderServiceItem>? services,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? completedAt,
    List<String>? images,
    String? notes,
    double? rating,
    String? review,
  }) {
    return FirestoreOrder(
      id: id ?? this.id,
      clientId: clientId ?? this.clientId,
      specialistId: specialistId ?? this.specialistId,
      category: category ?? this.category,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
      price: price ?? this.price,
      address: address ?? this.address,
      location: location ?? this.location,
      scheduledDate: scheduledDate ?? this.scheduledDate,
      timeSlot: timeSlot ?? this.timeSlot,
      totalDurationMinutes: totalDurationMinutes ?? this.totalDurationMinutes,
      services: services ?? this.services,
      completedAt: completedAt ?? this.completedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      images: images ?? this.images,
      notes: notes ?? this.notes,
      rating: rating ?? this.rating,
      review: review ?? this.review,
    );
  }
}

// Модель отзыва
class FirestoreReview {
  final String id;
  final String orderId;
  final String clientId;
  final String specialistId;
  final double rating;
  final String comment;
  final DateTime createdAt;

  FirestoreReview({
    required this.id,
    required this.orderId,
    required this.clientId,
    required this.specialistId,
    required this.rating,
    required this.comment,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'orderId': orderId,
      'clientId': clientId,
      'specialistId': specialistId,
      'rating': rating,
      'comment': comment,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  factory FirestoreReview.fromMap(Map<String, dynamic> map) {
    return FirestoreReview(
      id: map['id'] ?? '',
      orderId: map['orderId'] ?? '',
      clientId: map['clientId'] ?? '',
      specialistId: map['specialistId'] ?? '',
      rating: map['rating']?.toDouble() ?? 0.0,
      comment: map['comment'] ?? '',
      createdAt: (map['createdAt'] as Timestamp).toDate(),
    );
  }
}

/// Агрегированная статистика рейтинга по городу и нише за период
class CitySpecialistRating {
  final String city;
  final String category; // ниша
  final String specialistId;
  final String specialistName;
  final double averageRating;
  final int totalReviews;
  final int totalOrders;

  CitySpecialistRating({
    required this.city,
    required this.category,
    required this.specialistId,
    required this.specialistName,
    required this.averageRating,
    required this.totalReviews,
    required this.totalOrders,
  });
}

/// Инструмент / товар специалиста (аренда или продажа)
class FirestoreToolItem {
  final String id;
  final String ownerId; // специалист / мастер
  final String type; // rent | sale
  final String title;
  final String? description;
  final double price; // цена продажи или аренды за период
  final String? priceUnit; // "день", "смена", "час" и т.п. (для аренды)
  final double? deposit; // залог для аренды
  final bool isAvailable;
  final String? category;
  final List<String> imageUrls;
  final DateTime createdAt;
  final DateTime updatedAt;

  const FirestoreToolItem({
    required this.id,
    required this.ownerId,
    required this.type,
    required this.title,
    this.description,
    required this.price,
    this.priceUnit,
    this.deposit,
    this.isAvailable = true,
    this.category,
    this.imageUrls = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  FirestoreToolItem copyWith({
    String? id,
    String? ownerId,
    String? type,
    String? title,
    String? description,
    double? price,
    String? priceUnit,
    double? deposit,
    bool? isAvailable,
    String? category,
    List<String>? imageUrls,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return FirestoreToolItem(
      id: id ?? this.id,
      ownerId: ownerId ?? this.ownerId,
      type: type ?? this.type,
      title: title ?? this.title,
      description: description ?? this.description,
      price: price ?? this.price,
      priceUnit: priceUnit ?? this.priceUnit,
      deposit: deposit ?? this.deposit,
      isAvailable: isAvailable ?? this.isAvailable,
      category: category ?? this.category,
      imageUrls: imageUrls ?? this.imageUrls,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'ownerId': ownerId,
      'type': type,
      'title': title,
      'description': description,
      'price': price,
      'priceUnit': priceUnit,
      'deposit': deposit,
      'isAvailable': isAvailable,
      'category': category,
      'imageUrls': imageUrls,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  factory FirestoreToolItem.fromMap(Map<String, dynamic> map) {
    return FirestoreToolItem(
      id: map['id'] ?? '',
      ownerId: map['ownerId'] ?? '',
      type: map['type'] ?? 'rent',
      title: map['title'] ?? '',
      description: map['description'],
      price: (map['price'] as num?)?.toDouble() ?? 0.0,
      priceUnit: map['priceUnit'],
      deposit: (map['deposit'] as num?)?.toDouble(),
      isAvailable: map['isAvailable'] ?? true,
      category: map['category'],
      imageUrls: (map['imageUrls'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }
}
