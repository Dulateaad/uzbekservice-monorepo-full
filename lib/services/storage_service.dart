import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:image_picker/image_picker.dart';

class StorageService {
  static final FirebaseStorage _storage = FirebaseStorage.instance;

  // ========== АВАТАРЫ ПОЛЬЗОВАТЕЛЕЙ ==========

  /// Загрузка аватара пользователя
  /// Возвращает URL загруженного файла
  static Future<String> uploadUserAvatar(String userId, File imageFile) async {
    try {
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final fileName = 'avatar_$timestamp.jpg';
      final ref = _storage.ref('avatars/$userId/$fileName');
      
      print('📤 Загрузка аватара для пользователя: $userId');
      
      final uploadTask = ref.putFile(
        imageFile,
        SettableMetadata(
          contentType: 'image/jpeg',
          customMetadata: {
            'uploadedAt': DateTime.now().toIso8601String(),
            'userId': userId,
          },
        ),
      );
      
      // Отслеживание прогресса
      uploadTask.snapshotEvents.listen((snapshot) {
        final progress = snapshot.bytesTransferred / snapshot.totalBytes;
        print('📊 Прогресс загрузки: ${(progress * 100).toStringAsFixed(1)}%');
      });
      
      final snapshot = await uploadTask;
      final downloadUrl = await snapshot.ref.getDownloadURL();
      
      print('✅ Аватар загружен: $downloadUrl');
      return downloadUrl;
    } catch (e) {
      print('❌ Ошибка загрузки аватара: $e');
      rethrow;
    }
  }

  /// Удаление старого аватара
  static Future<void> deleteUserAvatar(String userId, String? oldAvatarUrl) async {
    if (oldAvatarUrl == null || oldAvatarUrl.isEmpty) return;
    
    try {
      // Извлекаем путь из URL
      final uri = Uri.parse(oldAvatarUrl);
      final path = uri.pathSegments.last;
      final ref = _storage.ref('avatars/$userId/$path');
      
      await ref.delete();
      print('✅ Старый аватар удален: $path');
    } catch (e) {
      print('⚠️ Ошибка удаления старого аватара (можно игнорировать): $e');
      // Не бросаем ошибку, так как файл может быть уже удален
    }
  }

  /// Обновление аватара пользователя (удаляет старый, загружает новый)
  static Future<String> updateUserAvatar(String userId, File newImageFile, String? oldAvatarUrl) async {
    // Удаляем старый аватар
    await deleteUserAvatar(userId, oldAvatarUrl);
    
    // Загружаем новый
    return await uploadUserAvatar(userId, newImageFile);
  }

  // ========== ФОТОГРАФИИ ЗАКАЗОВ ==========

  /// Загрузка фотографии заказа
  static Future<String> uploadOrderPhoto(String orderId, File imageFile) async {
    try {
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final fileName = 'photo_$timestamp.jpg';
      final ref = _storage.ref('orders/$orderId/$fileName');
      
      print('📤 Загрузка фотографии заказа: $orderId');
      
      final uploadTask = ref.putFile(
        imageFile,
        SettableMetadata(
          contentType: 'image/jpeg',
          customMetadata: {
            'uploadedAt': DateTime.now().toIso8601String(),
            'orderId': orderId,
          },
        ),
      );
      
      final snapshot = await uploadTask;
      final downloadUrl = await snapshot.ref.getDownloadURL();
      
      print('✅ Фотография загружена: $downloadUrl');
      return downloadUrl;
    } catch (e) {
      print('❌ Ошибка загрузки фотографии заказа: $e');
      rethrow;
    }
  }

  /// Загрузка нескольких фотографий заказа
  static Future<List<String>> uploadOrderPhotos(String orderId, List<File> imageFiles) async {
    final urls = <String>[];
    
    for (var i = 0; i < imageFiles.length; i++) {
      try {
        final url = await uploadOrderPhoto(orderId, imageFiles[i]);
        urls.add(url);
        print('📸 Фотография ${i + 1}/${imageFiles.length} загружена');
      } catch (e) {
        print('❌ Ошибка загрузки фотографии ${i + 1}: $e');
        // Продолжаем загрузку остальных фотографий
      }
    }
    
    return urls;
  }

  /// Удаление фотографии заказа
  static Future<void> deleteOrderPhoto(String orderId, String photoUrl) async {
    try {
      final uri = Uri.parse(photoUrl);
      final path = uri.pathSegments.last;
      final ref = _storage.ref('orders/$orderId/$path');
      
      await ref.delete();
      print('✅ Фотография удалена: $path');
    } catch (e) {
      print('❌ Ошибка удаления фотографии: $e');
      rethrow;
    }
  }

  // ========== ДОКУМЕНТЫ СПЕЦИАЛИСТОВ ==========

  /// Загрузка документа специалиста
  static Future<String> uploadSpecialistDocument(String specialistId, File documentFile) async {
    try {
      final fileName = documentFile.path.split('/').last;
      final ref = _storage.ref('specialists/$specialistId/documents/$fileName');
      
      print('📤 Загрузка документа специалиста: $specialistId');
      
      final uploadTask = ref.putFile(documentFile);
      final snapshot = await uploadTask;
      final downloadUrl = await snapshot.ref.getDownloadURL();
      
      print('✅ Документ загружен: $downloadUrl');
      return downloadUrl;
    } catch (e) {
      print('❌ Ошибка загрузки документа: $e');
      rethrow;
    }
  }

  /// Удаление документа специалиста
  static Future<void> deleteSpecialistDocument(String specialistId, String documentUrl) async {
    try {
      final uri = Uri.parse(documentUrl);
      final fileName = uri.pathSegments.last;
      final ref = _storage.ref('specialists/$specialistId/documents/$fileName');
      
      await ref.delete();
      print('✅ Документ удален: $fileName');
    } catch (e) {
      print('❌ Ошибка удаления документа: $e');
      rethrow;
    }
  }

  // ========== ВРЕМЕННЫЕ ФАЙЛЫ ==========

  /// Загрузка временного файла
  static Future<String> uploadTempFile(String userId, File file) async {
    try {
      final fileName = file.path.split('/').last;
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final ref = _storage.ref('temp/$userId/${timestamp}_$fileName');
      
      final uploadTask = ref.putFile(file);
      final snapshot = await uploadTask;
      final downloadUrl = await snapshot.ref.getDownloadURL();
      
      print('✅ Временный файл загружен: $downloadUrl');
      return downloadUrl;
    } catch (e) {
      print('❌ Ошибка загрузки временного файла: $e');
      rethrow;
    }
  }

  /// Удаление временного файла
  static Future<void> deleteTempFile(String path) async {
    try {
      final ref = _storage.ref(path);
      await ref.delete();
      print('✅ Временный файл удален: $path');
    } catch (e) {
      print('⚠️ Ошибка удаления временного файла (можно игнорировать): $e');
    }
  }

  /// Удаление файла по его download URL (используется для очистки фото инструментов)
  static Future<void> deleteFileByUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      final segments = uri.pathSegments;

      // Формат URL: .../o/<encodedPath>
      final oIndex = segments.indexOf('o');
      if (oIndex == -1 || oIndex + 1 >= segments.length) {
        print('⚠️ Не удалось извлечь путь из URL: $url');
        return;
      }

      final encodedPath = segments[oIndex + 1];
      final path = Uri.decodeFull(encodedPath); // tools%2Fuid%2Ffile.jpg -> tools/uid/file.jpg

      final ref = _storage.ref(path);
      await ref.delete();
      print('✅ Файл удален из Storage по URL: $url');
    } catch (e) {
      print('⚠️ Ошибка удаления файла по URL (можно игнорировать): $e');
    }
  }

  // ========== УТИЛИТЫ ==========

  /// Получение URL файла по пути
  static Future<String> getFileUrl(String path) async {
    try {
      final ref = _storage.ref(path);
      return await ref.getDownloadURL();
    } catch (e) {
      print('❌ Ошибка получения URL: $e');
      rethrow;
    }
  }

  /// Загрузка с отслеживанием прогресса
  static Future<String> uploadWithProgress(
    String path,
    File file, {
    Function(double progress)? onProgress,
  }) async {
    try {
      final ref = _storage.ref(path);
      final uploadTask = ref.putFile(file);
      
      if (onProgress != null) {
        uploadTask.snapshotEvents.listen((snapshot) {
          final progress = snapshot.bytesTransferred / snapshot.totalBytes;
          onProgress(progress);
        });
      }
      
      final snapshot = await uploadTask;
      return await snapshot.ref.getDownloadURL();
    } catch (e) {
      print('❌ Ошибка загрузки с прогрессом: $e');
      rethrow;
    }
  }
}

/// Утилита для работы с ImagePicker
class ImagePickerService {
  static final ImagePicker _picker = ImagePicker();

  /// Выбор изображения из галереи
  static Future<File?> pickImageFromGallery() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85, // Сжатие до 85%
        maxWidth: 1920, // Максимальная ширина
        maxHeight: 1920, // Максимальная высота
      );
      
      if (image != null) {
        return File(image.path);
      }
      return null;
    } catch (e) {
      print('❌ Ошибка выбора изображения из галереи: $e');
      return null;
    }
  }

  /// Съемка фото камерой
  static Future<File?> pickImageFromCamera() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1920,
      );
      
      if (image != null) {
        return File(image.path);
      }
      return null;
    } catch (e) {
      print('❌ Ошибка съемки фото: $e');
      return null;
    }
  }

  /// Выбор изображения (галерея или камера)
  static Future<File?> pickImage({bool allowCamera = true}) async {
    if (allowCamera) {
      // Показываем диалог выбора
      // В реальном приложении можно использовать showDialog
      // Для простоты используем галерею
      return await pickImageFromGallery();
    }
    return await pickImageFromGallery();
  }

  /// Выбор нескольких изображений
  static Future<List<File>> pickMultipleImages() async {
    try {
      final List<XFile> images = await _picker.pickMultiImage(
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1920,
      );
      
      return images.map((xFile) => File(xFile.path)).toList();
    } catch (e) {
      print('❌ Ошибка выбора нескольких изображений: $e');
      return [];
    }
  }
}

