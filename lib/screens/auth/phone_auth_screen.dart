import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/gradient_button.dart';
import '../../widgets/glass_card.dart';
import '../../services/twilio_sms_service.dart';
import '../../providers/firestore_auth_provider.dart';
import '../../widgets/simple_country_selector.dart';
import '../../widgets/cloudflare_turnstile_widget.dart';
import '../../services/cloudflare_turnstile_service.dart';
import '../../utils/phone_input_normalize.dart';

class PhoneAuthScreen extends ConsumerStatefulWidget {
  const PhoneAuthScreen({super.key});

  @override
  ConsumerState<PhoneAuthScreen> createState() => _PhoneAuthScreenState();
}

class _PhoneAuthScreenState extends ConsumerState<PhoneAuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _twilioSmsService = TwilioSmsService();
  bool _isLoading = false;
  String _selectedUserType = 'client'; // client или specialist
  String _selectedCountryCode = 'UZ';
  String? _verificationId;
  bool _isTurnstileVerified = false; // Cloudflare Turnstile верификация

  @override
  void initState() {
    super.initState();
    // Устанавливаем начальный префикс в зависимости от выбранной страны
    _phoneController.text = _selectedCountryCode == 'UZ' ? '+998' : '+7';
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  String _getPhoneHint() {
    if (_selectedCountryCode == 'UZ') {
      return '90 123 45 67';
    } else {
      return '777 123 45 67';
    }
  }
  
  // Обновляет префикс в поле ввода при смене страны
  void _updatePhonePrefix(String countryCode) {
    final currentText = _phoneController.text.trim();
    
    // Убираем старый префикс если есть
    String numberWithoutPrefix = currentText;
    if (numberWithoutPrefix.startsWith('+998')) {
      numberWithoutPrefix = numberWithoutPrefix.substring(4);
    } else if (numberWithoutPrefix.startsWith('+7')) {
      numberWithoutPrefix = numberWithoutPrefix.substring(2);
    } else if (numberWithoutPrefix.startsWith('998')) {
      numberWithoutPrefix = numberWithoutPrefix.substring(3);
    } else if (numberWithoutPrefix.startsWith('7') && numberWithoutPrefix.length > 10) {
      numberWithoutPrefix = numberWithoutPrefix.substring(1);
    }
    
    // Убираем все пробелы, дефисы
    numberWithoutPrefix = numberWithoutPrefix.replaceAll(RegExp(r'[\s\-\(\)]'), '');
    
    // Добавляем новый префикс
    String newPrefix = countryCode == 'UZ' ? '+998' : '+7';
    String newText = numberWithoutPrefix.isEmpty ? newPrefix : '$newPrefix$numberWithoutPrefix';
    
    _phoneController.text = newText;
    // Перемещаем курсор в конец
    _phoneController.selection = TextSelection.fromPosition(
      TextPosition(offset: _phoneController.text.length),
    );
  }

  void _sendSms() async {
    if (!_formKey.currentState!.validate()) return;
    
    // Проверяем Cloudflare Turnstile на веб-платформе
    if (kIsWeb && !_isTurnstileVerified) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('⚠️ Пожалуйста, пройдите проверку безопасности'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      if (_selectedUserType == 'client') {
        final phoneNumber = PhoneInputNormalize.toE164(
          raw: _phoneController.text.trim(),
          countryCode: _selectedCountryCode,
        );

        print('🌍 Страна: $_selectedCountryCode, введено: ${_phoneController.text}, E.164: $phoneNumber');

        print('📱 Отправка SMS на номер: $phoneNumber');
        
        // Сохраняем номер телефона в провайдере
        ref.read(firestoreAuthProvider.notifier).setPhoneNumber(phoneNumber);
        
        // Отправляем SMS через Firebase Phone Authentication
        final result = await _twilioSmsService.sendSmsCode(phoneNumber);
        
        if (result['success'] == true) {
          _verificationId = result['verificationId'] as String?;
          
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('✅ SMS код отправлен! Проверьте телефон.'),
                backgroundColor: Colors.green,
                duration: Duration(seconds: 3),
              ),
            );
            
            // Переходим на экран ввода кода
            context.go('/auth/sms', extra: {
              'phoneNumber': phoneNumber,
              'verificationId': _verificationId,
            });
          }
        } else {
          throw Exception(result['error'] ?? 'Ошибка отправки SMS');
        }
      } else {
        // Для специалистов используем тот же SMS метод
        // OneID удален по запросу
      }
    } catch (e) {
      print('❌ Ошибка отправки SMS: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ошибка: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
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
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 40),
                
                // Логотип
                Center(
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: AppConstants.primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(
                      Icons.phone_android,
                      size: 50,
                      color: AppConstants.primaryColor,
                    ),
                  ),
                ),
                
                const SizedBox(height: 32),
                
                // Заголовок
                const Text(
                  'Введите номер телефона',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 8),
                
                // Подзаголовок
                const Text(
                  'Мы отправим SMS с кодом подтверждения',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 24),
                
                // Выбор типа пользователя
                const Text(
                  'Выберите тип входа:',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // Клиент - SMS
                Card(
                  elevation: _selectedUserType == 'client' ? 4 : 1,
                  color: _selectedUserType == 'client' 
                      ? AppConstants.primaryColor.withOpacity(0.1) 
                      : Colors.white,
                  child: RadioListTile<String>(
                    title: const Text('Клиент'),
                    subtitle: const Text('Вход через SMS'),
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
                
                // Специалист - SMS (OneID удален)
                Card(
                  elevation: _selectedUserType == 'specialist' ? 4 : 1,
                  color: _selectedUserType == 'specialist' 
                      ? AppConstants.secondaryColor.withOpacity(0.1) 
                      : Colors.white,
                  child: RadioListTile<String>(
                    title: const Text('Специалист'),
                    subtitle: const Text('Вход через SMS'),
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
                
                // Выбор страны
                Text(
                  'Выберите страну',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[700],
                  ),
                ),
                const SizedBox(height: 12),
                SimpleCountrySelector(
                  selectedCountryCode: _selectedCountryCode,
                  onChanged: (countryCode) {
                    setState(() {
                      _selectedCountryCode = countryCode;
                      // Автоматически добавляем префикс при смене страны
                      _updatePhonePrefix(countryCode);
                    });
                  },
                ),
                
                const SizedBox(height: 24),
                
                // Поле ввода телефона
                CustomTextField(
                  controller: _phoneController,
                  labelText: 'Номер телефона',
                  hintText: _getPhoneHint(),
                  keyboardType: TextInputType.phone,
                  prefixIcon: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(width: 12),
                      const Icon(Icons.phone),
                      const SizedBox(width: 8),
                      Text(
                        _selectedCountryCode == 'UZ' ? '+998' : '+7',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppConstants.primaryColor,
                        ),
                      ),
                    ],
                  ),
                  onChanged: (value) {
                    // Автоматически добавляем префикс если его нет
                    if (!value.startsWith('+')) {
                      final prefix = _selectedCountryCode == 'UZ' ? '+998' : '+7';
                      if (!value.startsWith(prefix)) {
                        _phoneController.value = TextEditingValue(
                          text: prefix + value,
                          selection: TextSelection.collapsed(offset: (prefix + value).length),
                        );
                      }
                    }
                  },
                  validator: (value) => PhoneInputNormalize.validateNationalInput(
                    value: value,
                    countryCode: _selectedCountryCode,
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Cloudflare Turnstile (защита от ботов) - только на веб
                if (kIsWeb) ...[
                  Text(
                    'Проверка безопасности',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey[700],
                    ),
                  ),
                  const SizedBox(height: 8),
                  CloudflareTurnstileWidget(
                    onVerified: (token) {
                      setState(() {
                        _isTurnstileVerified = true;
                      });
                      print('✅ Turnstile верификация пройдена');
                    },
                    onError: () {
                      setState(() {
                        _isTurnstileVerified = false;
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                ],
                
                const SizedBox(height: 16),
                
                // Кнопка отправки
                CustomButton(
                  text: 'Отправить SMS',
                  onPressed: _isLoading ? null : _sendSms,
                  isLoading: _isLoading,
                ),
                
                const SizedBox(height: 24),
                
                // Информация о конфиденциальности
                const Text(
                  'Нажимая "Отправить код", вы соглашаетесь с условиями использования и политикой конфиденциальности',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }
}