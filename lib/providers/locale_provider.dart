import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Провайдер для управления языком приложения
final localeProvider = StateNotifierProvider<LocaleNotifier, Locale>((ref) {
  return LocaleNotifier();
});

class LocaleNotifier extends StateNotifier<Locale> {
  LocaleNotifier() : super(const Locale('ru', 'RU')) {
    _loadLocale();
  }

  Future<void> _loadLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final languageCode = prefs.getString('selected_language') ?? 'ru';
    final countryCode = _getCountryCode(languageCode);
    state = Locale(languageCode, countryCode);
  }

  String _getCountryCode(String languageCode) {
    switch (languageCode) {
      case 'ru':
        return 'RU';
      case 'uz':
        return 'UZ';
      case 'en':
        return 'US';
      default:
        return 'RU';
    }
  }

  Future<void> setLocale(Locale locale) async {
    state = locale;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('selected_language', locale.languageCode);
  }

  String getLanguageName(String languageCode) {
    switch (languageCode) {
      case 'ru':
        return 'Русский';
      case 'uz':
        return 'O\'zbekcha';
      case 'en':
        return 'English';
      default:
        return 'Русский';
    }
  }
}

