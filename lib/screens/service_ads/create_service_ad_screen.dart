import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../models/firestore_models.dart';
import '../../services/service_ad_service.dart';
import '../../providers/firestore_auth_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CreateServiceAdScreen extends ConsumerStatefulWidget {
  final ServiceAd? existingAd; // Для редактирования

  const CreateServiceAdScreen({super.key, this.existingAd});

  @override
  ConsumerState<CreateServiceAdScreen> createState() => _CreateServiceAdScreenState();
}

class _CreateServiceAdScreenState extends ConsumerState<CreateServiceAdScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();

  String? _selectedCategory;
  String? _selectedPriceUnit;
  List<String> _imageUrls = [];
  bool _isLoading = false;
  bool _publishImmediately = false;

  final ServiceAdService _serviceAdService = ServiceAdService();

  final List<String> _priceUnits = [
    'за час',
    'за услугу',
    'за м²',
    'за м³',
    'за единицу',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.existingAd != null) {
      _loadExistingAd();
    }
  }

  void _loadExistingAd() {
    final ad = widget.existingAd!;
    _titleController.text = ad.title;
    _descriptionController.text = ad.description;
    _priceController.text = ad.price.toStringAsFixed(0);
    _addressController.text = ad.address ?? '';
    _phoneController.text = ad.phoneNumber ?? '';
    _selectedCategory = ad.category;
    _selectedPriceUnit = ad.priceUnit;
    _imageUrls = List.from(ad.imageUrls);
    _publishImmediately = ad.isPublished;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveAd() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCategory == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Выберите категорию услуги')),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final authState = ref.read(firestoreAuthProvider);
      final user = authState.user;

      if (user == null || user.userType != AppConstants.userTypeSpecialist) {
        throw Exception('Только специалисты могут создавать объявления');
      }

      final price = double.tryParse(_priceController.text);
      if (price == null || price <= 0) {
        throw Exception('Введите корректную цену');
      }

      if (widget.existingAd != null) {
        // Редактирование существующего объявления
        final updatedAd = widget.existingAd!.copyWith(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          category: _selectedCategory!,
          price: price,
          priceUnit: _selectedPriceUnit,
          address: _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
          phoneNumber: _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
          imageUrls: _imageUrls,
          isPublished: _publishImmediately,
          publishedAt: _publishImmediately && !widget.existingAd!.isPublished
              ? DateTime.now()
              : widget.existingAd!.publishedAt,
          updatedAt: DateTime.now(),
        );

        await _serviceAdService.updateServiceAd(updatedAd);

        if (_publishImmediately && !widget.existingAd!.isPublished) {
          await _serviceAdService.publishServiceAd(updatedAd.id);
        } else if (!_publishImmediately && widget.existingAd!.isPublished) {
          await _serviceAdService.unpublishServiceAd(updatedAd.id);
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Объявление обновлено'),
              backgroundColor: AppConstants.successColor,
            ),
          );
          context.pop();
        }
      } else {
        // Создание нового объявления
        print('🔍 Создание объявления: user.id=${user.id}, userType=${user.userType}');
        final newAd = await _serviceAdService.createServiceAd(
          specialistId: user.id,
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          category: _selectedCategory!,
          price: price,
          priceUnit: _selectedPriceUnit,
          address: _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
          phoneNumber: _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
          imageUrls: _imageUrls,
          tags: _selectedCategory != null ? [_selectedCategory!] : null,
        );

        if (_publishImmediately) {
          await _serviceAdService.publishServiceAd(newAd.id);
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(_publishImmediately
                  ? 'Объявление создано и опубликовано'
                  : 'Объявление создано. Опубликуйте его в списке объявлений'),
              backgroundColor: AppConstants.successColor,
            ),
          );
          context.pop();
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ошибка: ${e.toString()}'),
            backgroundColor: AppConstants.errorColor,
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
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: Text(widget.existingAd != null ? 'Редактировать объявление' : 'Создать объявление'),
        elevation: 0,
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Категория
              Text(
                'Категория услуги *',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 8),
              _buildCategorySelector(),
              const SizedBox(height: 24),

              // Название
              TextFormField(
                controller: _titleController,
                decoration: InputDecoration(
                  labelText: 'Название услуги *',
                  hintText: 'Например: Стрижка мужская',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                  ),
                  prefixIcon: const Icon(Icons.title),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Введите название услуги';
                  }
                  if (value.trim().length < 5) {
                    return 'Название должно быть не менее 5 символов';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Описание
              TextFormField(
                controller: _descriptionController,
                decoration: InputDecoration(
                  labelText: 'Описание услуги *',
                  hintText: 'Опишите подробно вашу услугу...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                  ),
                  prefixIcon: const Icon(Icons.description),
                ),
                maxLines: 5,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Введите описание услуги';
                  }
                  if (value.trim().length < 20) {
                    return 'Описание должно быть не менее 20 символов';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Цена
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      controller: _priceController,
                      decoration: InputDecoration(
                        labelText: 'Цена *',
                        hintText: '0',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                        ),
                        prefixIcon: const Icon(Icons.attach_money),
                      ),
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                      ],
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Введите цену';
                        }
                        final price = double.tryParse(value);
                        if (price == null || price <= 0) {
                          return 'Цена должна быть больше 0';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedPriceUnit,
                      decoration: InputDecoration(
                        labelText: 'Единица',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                        ),
                      ),
                      items: _priceUnits.map((unit) {
                        return DropdownMenuItem(
                          value: unit,
                          child: Text(unit),
                        );
                      }).toList(),
                      onChanged: (value) {
                        setState(() {
                          _selectedPriceUnit = value;
                        });
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Адрес
              TextFormField(
                controller: _addressController,
                decoration: InputDecoration(
                  labelText: 'Адрес (необязательно)',
                  hintText: 'Город, район, улица',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                  ),
                  prefixIcon: const Icon(Icons.location_on),
                ),
              ),
              const SizedBox(height: 16),

              // Телефон
              TextFormField(
                controller: _phoneController,
                decoration: InputDecoration(
                  labelText: 'Контактный телефон (необязательно)',
                  hintText: '+998901234567',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                  ),
                  prefixIcon: const Icon(Icons.phone),
                ),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 24),

              // Фотографии (заглушка)
              Text(
                'Фотографии (в разработке)',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppConstants.surfaceColor,
                  borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                  border: Border.all(color: AppConstants.borderColor),
                ),
                child: Row(
                  children: [
                    Icon(Icons.image, color: AppConstants.textSecondary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Загрузка фотографий будет доступна в следующей версии',
                        style: TextStyle(color: AppConstants.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Публикация сразу
              CheckboxListTile(
                title: const Text('Опубликовать сразу'),
                subtitle: const Text('Объявление будет видно всем пользователям'),
                value: _publishImmediately,
                onChanged: (value) {
                  setState(() {
                    _publishImmediately = value ?? false;
                  });
                },
                controlAffinity: ListTileControlAffinity.leading,
              ),
              const SizedBox(height: 32),

              // Кнопка сохранения
              ElevatedButton(
                onPressed: _isLoading ? null : _saveAd,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppConstants.primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppConstants.radiusMD),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Text(
                        widget.existingAd != null ? 'Сохранить изменения' : 'Создать объявление',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategorySelector() {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        borderRadius: BorderRadius.circular(AppConstants.radiusMD),
        border: Border.all(color: AppConstants.borderColor),
      ),
      child: GridView.builder(
        padding: const EdgeInsets.all(8),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          childAspectRatio: 1.2,
          crossAxisSpacing: 8,
          mainAxisSpacing: 8,
        ),
        itemCount: AppConstants.serviceCategories.length,
        itemBuilder: (context, index) {
          final category = AppConstants.serviceCategories[index];
          final isSelected = _selectedCategory == category['id'];

          return GestureDetector(
            onTap: () {
              setState(() {
                _selectedCategory = category['id'] as String;
              });
            },
            child: Container(
              decoration: BoxDecoration(
                color: isSelected
                    ? (category['color'] as Color).withOpacity(0.1)
                    : AppConstants.backgroundColor,
                borderRadius: BorderRadius.circular(AppConstants.radiusSM),
                border: Border.all(
                  color: isSelected
                      ? category['color'] as Color
                      : AppConstants.borderColor,
                  width: isSelected ? 2 : 1,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    category['emoji'] as String,
                    style: const TextStyle(fontSize: 24),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    category['name'] as String,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      color: isSelected
                          ? category['color'] as Color
                          : AppConstants.textPrimary,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

