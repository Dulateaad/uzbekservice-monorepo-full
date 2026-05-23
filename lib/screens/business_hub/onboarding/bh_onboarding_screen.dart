import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../constants/app_constants.dart';
import '../../../models/business_hub/business_vertical.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';
import '../../../widgets/business_hub/business_vertical_picker.dart';

class BHOnboardingScreen extends ConsumerStatefulWidget {
  const BHOnboardingScreen({super.key});

  @override
  ConsumerState<BHOnboardingScreen> createState() => _BHOnboardingScreenState();
}

class _BHOnboardingScreenState extends ConsumerState<BHOnboardingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _innCtrl = TextEditingController();
  String _industry = 'Услуги';
  String _verticalId = BusinessVerticalIds.services;
  String _legalForm = 'ИП';
  int _employeeCount = 1;
  bool _creating = false;

  static const _industries = [
    'Услуги',
    'Торговля',
    'Производство',
    'Строительство',
    'IT и технологии',
    'Транспорт и логистика',
    'Общественное питание',
    'Образование',
    'Здравоохранение',
    'Недвижимость',
    'Другое',
  ];

  static String _industryForVertical(String verticalId) {
    switch (verticalId) {
      case BusinessVerticalIds.services:
        return 'Услуги';
      case BusinessVerticalIds.restaurant:
        return 'Общественное питание';
      case BusinessVerticalIds.retail:
        return 'Торговля';
      case BusinessVerticalIds.manufacturing:
        return 'Производство';
      case BusinessVerticalIds.realEstate:
        return 'Недвижимость';
      case BusinessVerticalIds.construction:
        return 'Строительство';
      default:
        return 'Услуги';
    }
  }

  void _applyVertical(String id) {
    setState(() {
      _verticalId = id;
      _industry = _industryForVertical(id);
    });
  }

  static const _legalForms = ['ИП', 'ООО', 'ТОО', 'АО', 'МЧЖ', 'Другое'];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _innCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Создание компании')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: AppConstants.primaryGradient,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.business, color: Colors.white, size: 36),
                  SizedBox(height: 12),
                  Text(
                    'ODO Business Hub',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Полный контроль бизнеса в одном месте',
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            const Text(
              'Тип бизнеса',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
            ),
            const SizedBox(height: 6),
            Text(
              'Под этот тип подстраиваются подсказки и термины в Business Hub. Сферу деятельности ниже мы подставим автоматически; при необходимости измените вручную.',
              style: TextStyle(color: AppConstants.textSecondary, fontSize: 13, height: 1.35),
            ),
            const SizedBox(height: 14),
            BusinessVerticalPickerGrid(
              selectedId: _verticalId,
              onSelect: _applyVertical,
            ),
            const SizedBox(height: 24),

            // Name
            const Text('Название компании *', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _nameCtrl,
              decoration: _decoration('Например: ТОО Алем Групп'),
              validator: (v) => v == null || v.trim().isEmpty ? 'Введите название' : null,
            ),
            const SizedBox(height: 20),

            // Legal form
            const Text('Форма собственности', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _legalForm,
              decoration: _decoration(''),
              items: _legalForms
                  .map((f) => DropdownMenuItem(value: f, child: Text(f)))
                  .toList(),
              onChanged: (v) => setState(() => _legalForm = v!),
            ),
            const SizedBox(height: 20),

            // Industry
            const Text('Сфера деятельности', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _industry,
              decoration: _decoration(''),
              items: _industries
                  .map((i) => DropdownMenuItem(value: i, child: Text(i)))
                  .toList(),
              onChanged: (v) => setState(() => _industry = v!),
            ),
            const SizedBox(height: 20),

            // INN
            const Text('ИНН / СТИР / БИН', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _innCtrl,
              decoration: _decoration('Необязательно'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 20),

            // Employee count
            const Text('Количество сотрудников', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              children: [
                _EmployeeOption(label: '1', value: 1, selected: _employeeCount, onTap: (v) => setState(() => _employeeCount = v)),
                _EmployeeOption(label: '2-10', value: 5, selected: _employeeCount, onTap: (v) => setState(() => _employeeCount = v)),
                _EmployeeOption(label: '11-50', value: 30, selected: _employeeCount, onTap: (v) => setState(() => _employeeCount = v)),
                _EmployeeOption(label: '51-100', value: 75, selected: _employeeCount, onTap: (v) => setState(() => _employeeCount = v)),
                _EmployeeOption(label: '100+', value: 150, selected: _employeeCount, onTap: (v) => setState(() => _employeeCount = v)),
              ],
            ),
            const SizedBox(height: 36),

            // Submit
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _creating ? null : _create,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppConstants.primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: _creating
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text(
                        'Создать компанию',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                      ),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  InputDecoration _decoration(String hint) {
    return InputDecoration(
      hintText: hint,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppConstants.borderColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppConstants.primaryColor),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }

  Future<void> _create() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _creating = true);

    try {
      final user = ref.read(firestoreAuthProvider).user;
      if (user == null) throw Exception('Пользователь не найден');

      await ref.read(bhOrganizationProvider.notifier).create(
        ownerId: user.id,
        name: _nameCtrl.text.trim(),
        industry: _industry,
        businessVerticalId: _verticalId,
        inn: _innCtrl.text.trim().isEmpty ? null : _innCtrl.text.trim(),
        legalForm: _legalForm,
        employeeCount: _employeeCount,
        ownerName: user.name,
        ownerEmail: user.email,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Компания создана!'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
        context.go('/home/services/business-hub');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }
}

class _EmployeeOption extends StatelessWidget {
  final String label;
  final int value;
  final int selected;
  final ValueChanged<int> onTap;

  const _EmployeeOption({
    required this.label,
    required this.value,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = selected == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => onTap(value),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 3),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppConstants.primaryColor : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isSelected ? Colors.white : AppConstants.textSecondary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
