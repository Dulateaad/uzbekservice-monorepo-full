import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';
import '../../providers/firestore_auth_provider.dart';
import '../../services/geocoding_service.dart';

class SpecialistRegistrationScreen extends ConsumerStatefulWidget {
  const SpecialistRegistrationScreen({super.key});

  @override
  ConsumerState<SpecialistRegistrationScreen> createState() => _SpecialistRegistrationScreenState();
}

class _SpecialistRegistrationScreenState extends ConsumerState<SpecialistRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _addressController = TextEditingController();
  
  bool _isLoading = false;
  bool _isGeocoding = false; // Индикатор геокодирования
  String _selectedCategory = '';
  String _selectedUserType = 'client'; // client или specialist
  Map<String, double>? _location; // Координаты адреса {lat, lng}

  final List<String> _categories = [
    'Барбер',
    'Няня',
    'Мастер по дому',
    'Строительная бригада',
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  void _register() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      // Получаем номер телефона из FirestoreAuthProvider
      final authState = ref.read(firestoreAuthProvider);
      final phoneNumber = authState.currentPhoneNumber;
      
      if (phoneNumber == null) {
        throw Exception('Номер телефона не найден. Пожалуйста, начните процесс заново.');
      }

      // Регистрируем пользователя через FirestoreAuthProvider
      await ref.read(firestoreAuthProvider.notifier).register(
        phoneNumber: phoneNumber,
        name: _nameController.text,
        userType: _selectedUserType,
        email: _emailController.text.isNotEmpty ? _emailController.text : null,
        category: _selectedUserType == 'specialist' ? _selectedCategory : null,
        description: _selectedUserType == 'specialist' ? _descriptionController.text : null,
        pricePerHour: _selectedUserType == 'specialist' && _priceController.text.isNotEmpty 
            ? double.tryParse(_priceController.text) : null,
        address: _selectedUserType == 'specialist' && _addressController.text.isNotEmpty
            ? _addressController.text : null,
        location: _selectedUserType == 'specialist' ? _location : null,
      );
      
      // Проверяем результат
      final updatedAuthState = ref.read(firestoreAuthProvider);
      
      if (updatedAuthState.isAuthenticated) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Регистрация успешна!'),
              backgroundColor: Colors.green,
            ),
          );
          context.go('/home');
        }
      } else if (updatedAuthState.error != null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Ошибка регистрации: ${updatedAuthState.error}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ошибка регистрации: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Регистрация'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.black87,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Заголовок
                const Text(
                  'Завершите регистрацию',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 8),
                
                const Text(
                  'Расскажите о себе',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 32),
                
                // Выбор роли пользователя
                const Text(
                  'Выберите вашу роль:',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // Клиент
                Card(
                  elevation: _selectedUserType == 'client' ? 4 : 1,
                  color: _selectedUserType == 'client' 
                      ? AppConstants.primaryColor.withOpacity(0.1) 
                      : Colors.white,
                  child: RadioListTile<String>(
                    title: const Text('Клиент'),
                    subtitle: const Text('Заказываю услуги'),
                    value: 'client',
                    groupValue: _selectedUserType,
                    onChanged: (value) {
                      setState(() {
                        _selectedUserType = value!;
                      });
                    },
                    activeColor: AppConstants.primaryColor,
                  ),
                ),
                
                const SizedBox(height: 8),
                
                // Специалист
                Card(
                  elevation: _selectedUserType == 'specialist' ? 4 : 1,
                  color: _selectedUserType == 'specialist' 
                      ? AppConstants.secondaryColor.withOpacity(0.1) 
                      : Colors.white,
                  child: RadioListTile<String>(
                    title: const Text('Специалист'),
                    subtitle: const Text('Предоставляю услуги'),
                    value: 'specialist',
                    groupValue: _selectedUserType,
                    onChanged: (value) {
                      setState(() {
                        _selectedUserType = value!;
                      });
                    },
                    activeColor: AppConstants.secondaryColor,
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Поле имени
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
                
                // Поле email
                CustomTextField(
                  controller: _emailController,
                  labelText: 'Email (необязательно)',
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
                
                // Дополнительные поля для специалистов
                if (_selectedUserType == 'specialist') ...[
                  const SizedBox(height: 16),
                  
                  // Выбор категории
                  const Text(
                    'Категория услуг',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  
                  const SizedBox(height: 8),
                  
                  DropdownButtonFormField<String>(
                    value: _selectedCategory.isEmpty ? null : _selectedCategory,
                    decoration: InputDecoration(
                      labelText: 'Выберите категорию',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      prefixIcon: const Icon(Icons.category),
                    ),
                    items: _categories.map((category) {
                      return DropdownMenuItem(
                        value: category,
                        child: Text(category),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedCategory = value!;
                      });
                    },
                    validator: (value) {
                      if (_selectedUserType == 'specialist' && (value == null || value.isEmpty)) {
                        return 'Выберите категорию';
                      }
                      return null;
                    },
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Описание услуг
                  CustomTextField(
                    controller: _descriptionController,
                    labelText: 'Описание услуг',
                    hintText: 'Опишите ваши услуги',
                    maxLines: 3,
                    prefixIcon: const Icon(Icons.description),
                    validator: (value) {
                      if (_selectedUserType == 'specialist' && (value == null || value.isEmpty)) {
                        return 'Введите описание услуг';
                      }
                      return null;
                    },
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Цена за час
                  CustomTextField(
                    controller: _priceController,
                    labelText: 'Цена за час (сум)',
                    hintText: '50000',
                    keyboardType: TextInputType.number,
                    prefixIcon: const Icon(Icons.attach_money),
                    validator: (value) {
                      if (_selectedUserType == 'specialist' && (value == null || value.isEmpty)) {
                        return 'Введите цену за час';
                      }
                      if (value != null && value.isNotEmpty) {
                        if (int.tryParse(value) == null) {
                          return 'Введите корректную цену';
                        }
                      }
                      return null;
                    },
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Адрес
                  CustomTextField(
                    controller: _addressController,
                    labelText: 'Адрес',
                    hintText: 'Введите ваш адрес (например: ул. Амира Темура, 15, Ташкент)',
                    prefixIcon: const Icon(Icons.location_on),
                    validator: (value) {
                      if (_selectedUserType == 'specialist' && (value == null || value.isEmpty)) {
                        return 'Введите адрес';
                      }
                      return null;
                    },
                    onChanged: (value) {
                      // При изменении адреса можно добавить геокодирование
                      // Пока просто сохраняем адрес
                    },
                  ),
                  
                  const SizedBox(height: 8),
                  
                  // Кнопка для получения координат по адресу через Google Geocoding API
                  OutlinedButton.icon(
                    onPressed: _addressController.text.isEmpty || _isGeocoding
                        ? null
                        : () async {
                            if (_addressController.text.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Сначала введите адрес'),
                                  duration: Duration(seconds: 2),
                                ),
                              );
                              return;
                            }
                            
                            setState(() {
                              _isGeocoding = true;
                            });
                            
                            try {
                              // Геокодируем адрес
                              final coordinates = await GeocodingService.geocodeAddress(
                                _addressController.text,
                              );
                              
                              if (coordinates != null) {
                                setState(() {
                                  _location = {
                                    'lat': coordinates['lat'] as double,
                                    'lng': coordinates['lng'] as double,
                                  };
                                });
                                
                                // Обновляем адрес на форматированный из Google
                                if (coordinates['formatted_address'] != null) {
                                  _addressController.text = coordinates['formatted_address'] as String;
                                }
                                
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        '✅ Координаты получены: ${coordinates['lat']}, ${coordinates['lng']}',
                                      ),
                                      backgroundColor: Colors.green,
                                      duration: const Duration(seconds: 3),
                                    ),
                                  );
                                }
                              } else {
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('❌ Не удалось получить координаты. Проверьте адрес и попробуйте снова.'),
                                      backgroundColor: Colors.red,
                                      duration: Duration(seconds: 3),
                                    ),
                                  );
                                }
                              }
                            } catch (e) {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('❌ Ошибка: $e'),
                                    backgroundColor: Colors.red,
                                    duration: const Duration(seconds: 3),
                                  ),
                                );
                              }
                            } finally {
                              if (mounted) {
                                setState(() {
                                  _isGeocoding = false;
                                });
                              }
                            }
                          },
                    icon: _isGeocoding
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.my_location),
                    label: Text(_isGeocoding ? 'Получение координат...' : 'Получить координаты'),
                  ),
                ],
                
                const SizedBox(height: 32),
                
                // Кнопка регистрации
                CustomButton(
                  text: 'Завершить регистрацию',
                  onPressed: _isLoading ? null : _register,
                  isLoading: _isLoading,
                ),
                
                const SizedBox(height: 16),
                
                // Информация о конфиденциальности
                const Text(
                  'Нажимая "Завершить регистрацию", вы соглашаетесь с условиями использования и политикой конфиденциальности',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
