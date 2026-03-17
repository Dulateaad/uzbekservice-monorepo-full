import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../models/vacancy.dart';
import '../../providers/vacancy_providers.dart';
import '../../providers/firestore_auth_provider.dart';
import '../../services/vacancy_service.dart';

class CreateVacancyScreen extends ConsumerStatefulWidget {
  const CreateVacancyScreen({super.key});

  @override
  ConsumerState<CreateVacancyScreen> createState() => _CreateVacancyScreenState();
}

class _CreateVacancyScreenState extends ConsumerState<CreateVacancyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _companyController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _salaryController = TextEditingController();
  final _locationController = TextEditingController();
  final _requirementController = TextEditingController();

  String _selectedSchedule = 'Полный день';
  String _selectedCategory = 'it';
  UserIntent? _selectedIntent;
  bool _isHot = false;
  bool _isUrgent = false;
  final List<String> _requirements = [];

  @override
  void dispose() {
    _titleController.dispose();
    _companyController.dispose();
    _descriptionController.dispose();
    _salaryController.dispose();
    _locationController.dispose();
    _requirementController.dispose();
    super.dispose();
  }

  void _addRequirement() {
    if (_requirementController.text.trim().isNotEmpty) {
      setState(() {
        _requirements.add(_requirementController.text.trim());
        _requirementController.clear();
      });
    }
  }

  void _removeRequirement(int index) {
    setState(() {
      _requirements.removeAt(index);
    });
  }

  Future<void> _createVacancy() async {
    if (!_formKey.currentState!.validate()) return;

    final authState = ref.read(firestoreAuthProvider);
    final user = authState.user;
    
    if (user == null || user.userType != 'company') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Только компании могут создавать вакансии'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final salary = int.tryParse(_salaryController.text.replaceAll(' ', '')) ?? 0;

    final vacancy = Vacancy(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: _titleController.text.trim(),
      company: _companyController.text.trim(),
      companyId: user.id,
      description: _descriptionController.text.trim(),
      salary: salary,
      location: _locationController.text.trim(),
      schedule: _selectedSchedule,
      category: _selectedCategory,
      requirements: _requirements,
      isHot: _isHot,
      isUrgent: _isUrgent,
      intent: _selectedIntent,
      status: 'active',
    );

    // Сохранить в Firestore через сервис
    final service = ref.read(vacancyServiceProvider);
    final success = await service.createVacancy(vacancy);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Вакансия создана!'),
            backgroundColor: Colors.green,
          ),
        );
        // Обновляем список вакансий
        ref.invalidate(allVacanciesProvider);
        context.pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Ошибка при создании вакансии'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Создать вакансию'),
        backgroundColor: AppConstants.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppConstants.spacingLG),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Заголовок
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Название вакансии *',
                  hintText: 'Например: Frontend Developer',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Введите название вакансии';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppConstants.spacingMD),

              // Компания
              TextFormField(
                controller: _companyController,
                decoration: const InputDecoration(
                  labelText: 'Название компании *',
                  hintText: 'Например: Tech Solutions',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Введите название компании';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppConstants.spacingMD),

              // Описание
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Описание *',
                  hintText: 'Подробное описание вакансии',
                  border: OutlineInputBorder(),
                ),
                maxLines: 5,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Введите описание';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppConstants.spacingMD),

              // Зарплата
              TextFormField(
                controller: _salaryController,
                decoration: const InputDecoration(
                  labelText: 'Зарплата (сум) *',
                  hintText: '5000000',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Введите зарплату';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppConstants.spacingMD),

              // Локация
              TextFormField(
                controller: _locationController,
                decoration: const InputDecoration(
                  labelText: 'Локация *',
                  hintText: 'Ташкент',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Введите локацию';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppConstants.spacingMD),

              // График
              DropdownButtonFormField<String>(
                value: _selectedSchedule,
                decoration: const InputDecoration(
                  labelText: 'График работы',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'Полный день', child: Text('Полный день')),
                  DropdownMenuItem(value: 'Частичная занятость', child: Text('Частичная занятость')),
                  DropdownMenuItem(value: 'Гибкий график', child: Text('Гибкий график')),
                  DropdownMenuItem(value: 'Удалённо', child: Text('Удалённо')),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedSchedule = value!;
                  });
                },
              ),
              const SizedBox(height: AppConstants.spacingMD),

              // Категория
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                decoration: const InputDecoration(
                  labelText: 'Категория',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'it', child: Text('IT')),
                  DropdownMenuItem(value: 'sales', child: Text('Продажи')),
                  DropdownMenuItem(value: 'service', child: Text('Сервис')),
                  DropdownMenuItem(value: 'delivery', child: Text('Доставка')),
                  DropdownMenuItem(value: 'education', child: Text('Образование')),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedCategory = value!;
                  });
                },
              ),
              const SizedBox(height: AppConstants.spacingMD),

              // Намерение
              DropdownButtonFormField<UserIntent?>(
                value: _selectedIntent,
                decoration: const InputDecoration(
                  labelText: 'Намерение (опционально)',
                  border: OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem(value: null, child: Text('Не выбрано')),
                  ...UserIntent.values.map((intent) {
                    return DropdownMenuItem(
                      value: intent,
                      child: Text('${intent.icon} ${intent.title}'),
                    );
                  }),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedIntent = value;
                  });
                },
              ),
              const SizedBox(height: AppConstants.spacingMD),

              // Требования
              const Text(
                'Требования',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: AppConstants.spacingSM),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _requirementController,
                      decoration: const InputDecoration(
                        hintText: 'Добавить требование',
                        border: OutlineInputBorder(),
                      ),
                      onFieldSubmitted: (_) => _addRequirement(),
                    ),
                  ),
                  const SizedBox(width: AppConstants.spacingSM),
                  IconButton(
                    icon: const Icon(Icons.add),
                    onPressed: _addRequirement,
                    color: AppConstants.primaryColor,
                  ),
                ],
              ),
              const SizedBox(height: AppConstants.spacingSM),
              ..._requirements.asMap().entries.map((entry) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppConstants.spacingXS),
                  child: Chip(
                    label: Text(entry.value),
                    onDeleted: () => _removeRequirement(entry.key),
                  ),
                );
              }),
              const SizedBox(height: AppConstants.spacingMD),

              // Флаги
              CheckboxListTile(
                title: const Text('Горячая вакансия'),
                subtitle: const Text('Показывать в топе'),
                value: _isHot,
                onChanged: (value) {
                  setState(() {
                    _isHot = value ?? false;
                  });
                },
              ),
              CheckboxListTile(
                title: const Text('Срочная вакансия'),
                subtitle: const Text('Пометить как срочную'),
                value: _isUrgent,
                onChanged: (value) {
                  setState(() {
                    _isUrgent = value ?? false;
                  });
                },
              ),
              const SizedBox(height: AppConstants.spacingLG),

              // Кнопка создания
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _createVacancy,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppConstants.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text(
                    'Создать вакансию',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

