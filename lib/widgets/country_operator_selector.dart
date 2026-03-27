import 'package:flutter/material.dart';
import '../models/country_operator_model.dart';
import '../constants/app_constants.dart';

class CountryOperatorSelector extends StatefulWidget {
  final String? selectedCountryCode;
  final String? selectedOperatorCode;
  final Function(String countryCode, String? operatorCode) onChanged;

  const CountryOperatorSelector({
    super.key,
    this.selectedCountryCode,
    this.selectedOperatorCode,
    required this.onChanged,
  });

  @override
  State<CountryOperatorSelector> createState() => _CountryOperatorSelectorState();
}

class _CountryOperatorSelectorState extends State<CountryOperatorSelector> {
  String? _selectedCountryCode;
  String? _selectedOperatorCode;

  @override
  void initState() {
    super.initState();
    _selectedCountryCode = widget.selectedCountryCode ?? 'UZ';
    _selectedOperatorCode = widget.selectedOperatorCode;
  }

  @override
  Widget build(BuildContext context) {
    final selectedCountry = CountryOperatorData.getCountryByCode(_selectedCountryCode!);
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Выбор страны
        Text(
          'Страна',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.grey[700],
          ),
        ),
        const SizedBox(height: 8),
        
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedCountryCode,
              isExpanded: true,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              items: CountryOperatorData.countries.map((country) {
                return DropdownMenuItem<String>(
                  value: country.code,
                  child: Row(
                    children: [
                      Text(
                        country.phoneCode,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              country.name,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (String? newValue) {
                if (newValue != null) {
                  setState(() {
                    _selectedCountryCode = newValue;
                    _selectedOperatorCode = null; // Сбрасываем оператора при смене страны
                  });
                  widget.onChanged(newValue, null);
                }
              },
            ),
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Выбор оператора
        Text(
          'Оператор (необязательно)',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.grey[700],
          ),
        ),
        const SizedBox(height: 8),
        
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String?>(
              value: _selectedOperatorCode,
              isExpanded: true,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              hint: const Text('Выберите оператора'),
              items: [
                const DropdownMenuItem<String?>(
                  value: null,
                  child: Text('Любой оператор'),
                ),
                ...selectedCountry.operators.map((operator) {
                  return DropdownMenuItem<String>(
                    value: operator.code,
                    child: Text(
                      operator.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }).toList(),
              ],
              onChanged: (String? newValue) {
                setState(() {
                  _selectedOperatorCode = newValue;
                });
                widget.onChanged(_selectedCountryCode!, newValue);
              },
            ),
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Примеры номеров
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppConstants.primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: AppConstants.primaryColor.withOpacity(0.3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: AppConstants.primaryColor,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Примеры номеров для ${selectedCountry.name}:',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppConstants.primaryColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ...CountryOperatorData.getPhoneNumberExamples(_selectedCountryCode!)
                  .map((example) => Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text(
                          example,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[700],
                            fontFamily: 'monospace',
                          ),
                        ),
                      )),
            ],
          ),
        ),
      ],
    );
  }
}
