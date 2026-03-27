import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

class SimpleCountrySelector extends StatelessWidget {
  final String selectedCountryCode;
  final Function(String countryCode) onChanged;

  const SimpleCountrySelector({
    super.key,
    required this.selectedCountryCode,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Узбекистан
        Expanded(
          child: GestureDetector(
            onTap: () => onChanged('UZ'),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
              decoration: BoxDecoration(
                color: selectedCountryCode == 'UZ' 
                    ? AppConstants.primaryColor.withOpacity(0.1)
                    : Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: selectedCountryCode == 'UZ' 
                      ? AppConstants.primaryColor
                      : Colors.grey[300]!,
                  width: selectedCountryCode == 'UZ' ? 2 : 1,
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    '🇺🇿',
                    style: TextStyle(fontSize: 20),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '+998',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: selectedCountryCode == 'UZ' 
                          ? AppConstants.primaryColor
                          : Colors.grey[700],
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        
        const SizedBox(width: 12),
        
        // Казахстан
        Expanded(
          child: GestureDetector(
            onTap: () => onChanged('KZ'),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
              decoration: BoxDecoration(
                color: selectedCountryCode == 'KZ' 
                    ? AppConstants.secondaryColor.withOpacity(0.1)
                    : Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: selectedCountryCode == 'KZ' 
                      ? AppConstants.secondaryColor
                      : Colors.grey[300]!,
                  width: selectedCountryCode == 'KZ' ? 2 : 1,
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    '🇰🇿',
                    style: TextStyle(fontSize: 20),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '+7',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: selectedCountryCode == 'KZ' 
                          ? AppConstants.secondaryColor
                          : Colors.grey[700],
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
