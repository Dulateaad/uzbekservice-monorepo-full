import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../providers/firestore_auth_provider.dart';
import '../../services/storage_service.dart';
import '../../services/firestore_service.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  
  File? _pickedImage;
  bool _isLoading = false;
  double _uploadProgress = 0.0;

  @override
  void initState() {
    super.initState();
    final authState = ref.read(firestoreAuthProvider);
    final user = authState.user;
    if (user != null) {
      _nameController.text = user.name ?? '';
      _emailController.text = user.email ?? '';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    try {
      final imageFile = await ImagePickerService.pickImageFromGallery();
      if (imageFile != null) {
        setState(() {
          _pickedImage = imageFile;
          _uploadProgress = 0.0;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ошибка выбора изображения: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _uploadProgress = 0.0;
    });

    try {
      final authState = ref.read(firestoreAuthProvider);
      final currentUser = authState.user;

      if (currentUser == null) {
        throw Exception('Пользователь не авторизован');
      }

      String? avatarUrl = currentUser.avatarUrl;
      
      // Загружаем фото если выбрано
      if (_pickedImage != null) {
        print('📤 Загружаем фото в Firebase Storage...');
        
        // Загружаем с отслеживанием прогресса
        avatarUrl = await StorageService.uploadWithProgress(
          'avatars/${currentUser.id}/avatar_${DateTime.now().millisecondsSinceEpoch}.jpg',
          _pickedImage!,
          onProgress: (progress) {
            if (mounted) {
              setState(() {
                _uploadProgress = progress;
              });
            }
          },
        );
        
        // Удаляем старый аватар, если он есть
        if (currentUser.avatarUrl != null && currentUser.avatarUrl != avatarUrl) {
          await StorageService.deleteUserAvatar(currentUser.id, currentUser.avatarUrl);
        }
        
        print('✅ Фото загружено: $avatarUrl');
      }

      // Создаем обновленного пользователя
      final updatedUser = currentUser.copyWith(
        name: _nameController.text.trim(),
        email: _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        avatarUrl: avatarUrl,
        updatedAt: DateTime.now(),
      );

      print('📝 Обновляем пользователя в Firestore...');
      // Обновляем пользователя в Firestore
      await FirestoreService.updateUser(updatedUser);

      print('🔄 Обновляем состояние в провайдере...');
      // Обновляем состояние в провайдере
      ref.read(firestoreAuthProvider.notifier).state = authState.copyWith(user: updatedUser);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Профиль успешно обновлен!'),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    } catch (e) {
      print('❌ Ошибка обновления профиля: $e');
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
          _uploadProgress = 0.0;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(firestoreAuthProvider);
    final user = authState.user;
    
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Редактировать профиль'),
        backgroundColor: AppConstants.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _saveProfile,
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Text(
                    'Сохранить',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Аватар с возможностью загрузки
              Center(
                child: GestureDetector(
                  onTap: _pickImage,
                  child: Stack(
                    children: [
                      Stack(
                        children: [
                          CircleAvatar(
                            radius: 60,
                            backgroundColor: AppConstants.primaryColor.withOpacity(0.1),
                            backgroundImage: _pickedImage != null
                                ? FileImage(_pickedImage!)
                                : (user?.avatarUrl != null 
                                    ? NetworkImage(user!.avatarUrl!) 
                                    : null) as ImageProvider?,
                            child: _pickedImage == null && user?.avatarUrl == null
                                ? Text(
                                    user?.name?[0].toUpperCase() ?? 'U',
                                    style: const TextStyle(
                                      fontSize: 40,
                                      fontWeight: FontWeight.bold,
                                      color: AppConstants.primaryColor,
                                    ),
                                  )
                                : null,
                          ),
                          if (_isLoading && _uploadProgress > 0)
                            Positioned.fill(
                              child: CircularProgressIndicator(
                                value: _uploadProgress,
                                strokeWidth: 3,
                                backgroundColor: Colors.white.withOpacity(0.3),
                                valueColor: AlwaysStoppedAnimation<Color>(AppConstants.primaryColor),
                              ),
                            ),
                        ],
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppConstants.primaryColor,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: const Icon(
                            Icons.camera_alt,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              
              const SizedBox(height: 16),
              
              Center(
                child: TextButton(
                  onPressed: _pickImage,
                  child: const Text('Изменить фото профиля'),
                ),
              ),
              
              const SizedBox(height: 32),
              
              // Имя
              CustomTextField(
                controller: _nameController,
                labelText: 'Имя',
                hintText: 'Введите ваше имя',
                prefixIcon: const Icon(Icons.person),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Введите имя';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Email
              CustomTextField(
                controller: _emailController,
                labelText: 'Email',
                hintText: 'example@email.com',
                keyboardType: TextInputType.emailAddress,
                prefixIcon: const Icon(Icons.email),
                validator: (value) {
                  if (value != null && value.isNotEmpty) {
                    if (!value.contains('@')) {
                      return 'Введите корректный email';
                    }
                  }
                  return null;
                },
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
}
