/// Нормализация телефона для входа (UZ / KZ) в E.164.
///
/// Учитывает ввод только национальной части, полного номера с +998/+7,
/// а для KZ — 11 цифр вида `7XXXXXXXXXX` (код страны + национальная часть).
class PhoneInputNormalize {
  PhoneInputNormalize._();

  /// `countryCode`: `UZ` или `KZ`
  static String toE164({
    required String raw,
    required String countryCode,
  }) {
    String digits = raw.replaceAll(RegExp(r'[^\d]'), '');

    if (countryCode == 'UZ') {
      if (digits.startsWith('998')) {
        digits = digits.substring(3);
      }
      if (digits.length != 9) {
        throw FormatException(
          'Укажите 9 цифр узбекского номера (например 90 123 45 67). '
          'Сейчас введено ${digits.length} цифр после кода 998.',
        );
      }
      return '+998$digits';
    }

    if (countryCode == 'KZ') {
      if (digits.startsWith('998')) {
        throw FormatException(
          'Выбран Казахстан (+7). Номер не должен начинаться с 998.',
        );
      }
      // Полный номер 11 цифр, начинается с 7 — типично +7 и 10 национальных
      if (digits.length == 11 && digits.startsWith('7')) {
        digits = digits.substring(1);
      }
      if (digits.length != 10) {
        throw FormatException(
          'Укажите 10 цифр казахстанского номера после +7 '
          '(например 700 123 45 67). Сейчас: ${digits.length} цифр.',
        );
      }
      return '+7$digits';
    }

    throw FormatException('Неизвестный код страны: $countryCode');
  }

  /// Для [FormField.validator]: возвращает текст ошибки или `null`.
  static String? validateNationalInput({
    required String? value,
    required String countryCode,
  }) {
    if (value == null || value.trim().isEmpty) {
      return 'Введите номер телефона';
    }
    try {
      toE164(raw: value, countryCode: countryCode);
      return null;
    } on FormatException catch (e) {
      return e.message;
    }
  }
}
