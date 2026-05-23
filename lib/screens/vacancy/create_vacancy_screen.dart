import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../models/vacancy.dart';
import '../../providers/vacancy_providers.dart';
import '../../providers/firestore_auth_provider.dart';
import '../../providers/business_hub/bh_providers.dart';
import '../../l10n/app_localizations.dart';
import '../../utils/vacancy_post_permission.dart';

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

  String _selectedSchedule = ''; // Будет установлен в build
  String _selectedCategory = 'it';
  UserIntent? _selectedIntent;
  bool _isHot = false;
  bool _isUrgent = false;
  final List<String> _requirements = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final user = ref.read(firestoreAuthProvider).user;
      if (user == null || !mounted) return;
      await ref.read(bhOrganizationProvider.notifier).loadByOwner(user.id);
      if (!mounted) return;
      final org = ref.read(bhOrganizationProvider).valueOrNull;
      if (org != null && _companyController.text.isEmpty) {
        setState(() => _companyController.text = org.name);
      }
    });
  }

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
    
    if (user == null) {
      if (mounted) {
        final l10n = AppLocalizations.of(context)!;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.loginRequired), backgroundColor: Colors.red),
        );
        context.go('/auth/phone');
      }
      return;
    }
    await ref.read(bhOrganizationProvider.notifier).loadByOwner(user.id);
    if (!mounted) return;
    final bhOrg = ref.read(bhOrganizationProvider).valueOrNull;
    if (!userCanPostVacancy(user, bhOrg)) {
      final l10n = AppLocalizations.of(context)!;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(l10n.onlyCompaniesCanCreate),
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
    try {
      final service = ref.read(vacancyServiceProvider);
      final success = await service.createVacancy(vacancy);

      if (!mounted) return;
      final l10n = AppLocalizations.of(context)!;
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.vacancyCreated),
            backgroundColor: Colors.green,
          ),
        );
        ref.invalidate(allVacanciesProvider);
        context.pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.vacancyCreateError),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${AppLocalizations.of(context)!.vacancyCreateError}: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    if (_selectedSchedule.isEmpty) {
      _selectedSchedule = l10n.fullTime;
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.createVacancy),
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
                decoration: InputDecoration(
                  labelText: l10n.vacancyTitle,
                  hintText: l10n.vacancyTitleHint,
                  border: const OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return l10n.enterVacancyTitle;
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppConstants.spacingMD),

              // Компания
              TextFormField(
                controller: _companyController,
                decoration: InputDecoration(
                  labelText: l10n.companyName,
                  hintText: l10n.companyNameHint,
                  border: const OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return l10n.enterCompanyName;
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppConstants.spacingMD),

              // Описание
              TextFormField(
                controller: _descriptionController,
                decoration: InputDecoration(
                  labelText: l10n.descriptionLabel,
                  hintText: l10n.descriptionHint,
                  border: const OutlineInputBorder(),
                ),
                maxLines: 5,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return l10n.enterDescription;
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppConstants.spacingMD),

              // Зарплата
              TextFormField(
                controller: _salaryController,
                decoration: InputDecoration(
                  labelText: l10n.salary,
                  hintText: l10n.salaryHint,
                  border: const OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return l10n.enterSalary;
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppConstants.spacingMD),

              // Локация
              TextFormField(
                controller: _locationController,
                decoration: InputDecoration(
                  labelText: l10n.locationLabel,
                  hintText: l10n.locationHint,
                  border: const OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return l10n.enterLocation;
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppConstants.spacingMD),

              // График
              DropdownButtonFormField<String>(
                value: _selectedSchedule.isEmpty ? l10n.fullTime : _selectedSchedule,
                decoration: InputDecoration(
                  labelText: l10n.workSchedule,
                  border: const OutlineInputBorder(),
                ),
                items: [
                  DropdownMenuItem(value: l10n.fullTime, child: Text(l10n.fullTime)),
                  DropdownMenuItem(value: l10n.partTime, child: Text(l10n.partTime)),
                  DropdownMenuItem(value: l10n.flexible, child: Text(l10n.flexible)),
                  DropdownMenuItem(value: l10n.remote, child: Text(l10n.remote)),
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
                decoration: InputDecoration(
                  labelText: l10n.category,
                  border: const OutlineInputBorder(),
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
                decoration: InputDecoration(
                  labelText: l10n.intentOptional,
                  border: const OutlineInputBorder(),
                ),
                items: [
                  DropdownMenuItem(value: null, child: Text(l10n.notSelected)),
                  ...UserIntent.values.map((intent) {
                    return DropdownMenuItem(
                      value: intent,
                      child: Text('${intent.icon} ${intent.getTitle(l10n)}'),
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
              Text(
                l10n.requirementsLabel,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: AppConstants.spacingSM),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _requirementController,
                      decoration: InputDecoration(
                        hintText: l10n.addRequirement,
                        border: const OutlineInputBorder(),
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
                title: Text(l10n.hotVacancyFlag),
                subtitle: Text(l10n.hotVacancySubtitle),
                value: _isHot,
                onChanged: (value) {
                  setState(() {
                    _isHot = value ?? false;
                  });
                },
              ),
              CheckboxListTile(
                title: Text(l10n.urgentVacancyFlag),
                subtitle: Text(l10n.urgentVacancySubtitle),
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
                  child: Text(
                    l10n.createVacancy,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
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

