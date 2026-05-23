import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../widgets/odo_logo.dart';
import '../../providers/firestore_auth_provider.dart';
import '../../l10n/app_localizations.dart';
import '../../utils/phone_input_normalize.dart';

class BeautifulLoginScreen extends ConsumerStatefulWidget {
  final String? intentId; // ID выбранного intent
  final String? role; // Автоматически определяемая роль
  
  const BeautifulLoginScreen({
    super.key,
    this.intentId,
    this.role,
  });

  @override
  ConsumerState<BeautifulLoginScreen> createState() => _BeautifulLoginScreenState();
}

class _BeautifulLoginScreenState extends ConsumerState<BeautifulLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  
  String _selectedCountryCode = 'UZ';
  bool _isLoading = false;
  bool _isRegistration = false; // false = вход, true = регистрация
  
  // Определяем userType из intent/role
  String get _userType {
    if (widget.role != null) {
      // Преобразуем role в userType для обратной совместимости
      switch (widget.role) {
        case 'candidate':
          return 'client';
        case 'specialist':
          return 'specialist';
        case 'company-hr':
        case 'company-full':
          return 'company';
        default:
          return 'client';
      }
    }
    return 'client'; // По умолчанию
  }

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  String _getPhoneHint() {
    if (_selectedCountryCode == 'UZ') {
      return '90 123 45 67';  // 9 цифр
    } else {
      return '700 123 45 67'; // 10 цифр
    }
  }

  // Обновление префикса при смене страны
  void _updatePhonePrefix(String countryCode) {
    String currentText = _phoneController.text;
    
    // Убираем старый префикс если он есть
    if (currentText.startsWith('+998')) {
      currentText = currentText.substring(4).trim();
    } else if (currentText.startsWith('998')) {
      currentText = currentText.substring(3).trim();
    } else if (currentText.startsWith('+7')) {
      currentText = currentText.substring(2).trim();
    } else if (currentText.startsWith('7') && currentText.length > 10) {
      currentText = currentText.substring(1).trim();
    }
    
    // Убираем все плюсы и пробелы
    currentText = currentText.replaceAll(RegExp(r'[\+\s]'), '');
    
    // Обновляем контроллер с очищенным номером
    _phoneController.text = currentText;
    _phoneController.selection = TextSelection.fromPosition(
      TextPosition(offset: currentText.length),
    );
  }

  void _sendCode() async {
    if (!_formKey.currentState!.validate()) return;

    // Специалисты теперь могут входить и по номеру телефона
    // OneID остается альтернативным способом входа

    setState(() {
      _isLoading = true;
    });

    try {
      // Единая нормализация: учитывает национальную часть, +998/+7, KZ 11 цифр с ведущей 7
      final phoneNumber = PhoneInputNormalize.toE164(
        raw: _phoneController.text.trim(),
        countryCode: _selectedCountryCode,
      );

      print('📱 Финальный номер: $phoneNumber');

      // Отправляем SMS код (и для входа, и для регистрации)
      // userType определяется автоматически из intent/role
      await ref.read(firestoreAuthProvider.notifier).sendSmsCode(
        phoneNumber: phoneNumber,
        name: _isRegistration ? _nameController.text.trim() : '',
        userType: _userType,
        intentId: widget.intentId,
        role: widget.role,
      );
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Код отправлен! Проверьте консоль для получения кода.'),
            backgroundColor: Colors.green,
          ),
        );
        
        // Переходим к SMS экрану
        context.go(
          '/auth/sms',
          extra: {
            'phoneNumber': phoneNumber,
            'name': _isRegistration ? _nameController.text.trim() : null,
            'userType': _userType,
            'intentId': widget.intentId,
            'role': widget.role,
          },
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ошибка: $e'),
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
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 40),
                
                // Логотип ODO.UZ
                const Center(
                  child: OdoLogo(),
                ),

                const SizedBox(height: 40),

                // Белая карточка с формой
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Переключатель между входом и регистрацией
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _isRegistration = false;
                                  });
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  decoration: BoxDecoration(
                                    color: !_isRegistration 
                                        ? Colors.white 
                                        : Colors.transparent,
                                    borderRadius: BorderRadius.circular(8),
                                    boxShadow: !_isRegistration
                                        ? [
                                            BoxShadow(
                                              color: Colors.black.withOpacity(0.1),
                                              blurRadius: 4,
                                              offset: const Offset(0, 2),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Text(
                                    'Войти',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: !_isRegistration 
                                          ? FontWeight.w600 
                                          : FontWeight.normal,
                                      color: !_isRegistration 
                                          ? AppConstants.primaryColor 
                                          : Colors.grey[600],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _isRegistration = true;
                                  });
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  decoration: BoxDecoration(
                                    color: _isRegistration 
                                        ? Colors.white 
                                        : Colors.transparent,
                                    borderRadius: BorderRadius.circular(8),
                                    boxShadow: _isRegistration
                                        ? [
                                            BoxShadow(
                                              color: Colors.black.withOpacity(0.1),
                                              blurRadius: 4,
                                              offset: const Offset(0, 2),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Text(
                                    'Создать аккаунт',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: _isRegistration 
                                          ? FontWeight.w600 
                                          : FontWeight.normal,
                                      color: _isRegistration 
                                          ? AppConstants.primaryColor 
                                          : Colors.grey[600],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Заголовок
                      Builder(
                        builder: (context) {
                          final l10n = AppLocalizations.of(context);
                          return Text(
                            _isRegistration 
                                ? (l10n?.register ?? 'Создание аккаунта')
                                : (l10n?.login ?? 'Вход в аккаунт'),
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          );
                        },
                      ),

                      const SizedBox(height: 6),

                      // Подзаголовок
                      Builder(
                        builder: (context) {
                          final l10n = AppLocalizations.of(context);
                          return Text(
                            _isRegistration 
                                ? 'Выберите вашу роль и заполните данные.'
                                : 'Выберите вашу роль, чтобы войти.',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[600],
                            ),
                          );
                        },
                      ),

                      const SizedBox(height: 24),

                      // Кнопка входа через OneID (для всех)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.blue[600]!,
                              Colors.blue[800]!,
                            ],
                          ),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.blue.withOpacity(0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ElevatedButton.icon(
                          onPressed: () {
                            // OneID удален - переход к SMS авторизации
                            context.go('/auth/phone');
                          },
                          icon: const Icon(Icons.phone, color: Colors.white),
                          label: const Text(
                            'Войти через SMS',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Разделитель
                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              height: 1,
                              color: Colors.grey[300],
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Text(
                              'или',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: Colors.grey[500],
                              ),
                            ),
                          ),
                          Expanded(
                            child: Container(
                              height: 1,
                              color: Colors.grey[300],
                            ),
                          ),
                        ],
                      ),

                      // Выбор роли
                      const SizedBox(height: 20),

                      // Информация о выбранном intent (если есть)
                      if (widget.intentId != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppConstants.primaryColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: AppConstants.primaryColor.withOpacity(0.3),
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.info_outline,
                                color: AppConstants.primaryColor,
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Регистрация для: ${widget.role ?? "пользователя"}',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppConstants.primaryColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],

                      // Форма входа по номеру телефона
                      // Разделитель
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                height: 1,
                                color: Colors.grey[300],
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              child: Text(
                                'или по номеру телефона',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.grey[500],
                                ),
                              ),
                            ),
                            Expanded(
                              child: Container(
                                height: 1,
                                color: Colors.grey[300],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Поле имени (только при регистрации)
                        if (_isRegistration) ...[
                          TextFormField(
                            controller: _nameController,
                            decoration: InputDecoration(
                              labelText: 'Полное имя',
                              hintText: 'Алишер Усманов',
                              prefixIcon: const Icon(Icons.person),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color: AppConstants.primaryColor,
                                  width: 2,
                                ),
                              ),
                            ),
                            validator: (value) {
                              if (_isRegistration && (value == null || value.isEmpty)) {
                                return 'Введите ваше имя';
                              }
                              return null;
                            },
                          ),

                          const SizedBox(height: 20),
                        ],

                      // Поле телефона
                      Builder(
                        builder: (context) {
                          final l10n = AppLocalizations.of(context);
                          return Text(
                            l10n?.phoneNumber ?? 'Номер телефона',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.black87,
                            ),
                          );
                        },
                      ),

                      const SizedBox(height: 10),

                      Row(
                        children: [
                          // Выбор страны
                          Container(
                            width: 120,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey[300]!),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _selectedCountryCode,
                                isExpanded: true,
                                items: [
                                  DropdownMenuItem(
                                    value: 'UZ',
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Text('🇺🇿'),
                                        const SizedBox(width: 8),
                                        const Text(
                                          '+998',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontFamily: 'monospace',
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  DropdownMenuItem(
                                    value: 'KZ',
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Text('🇰🇿'),
                                        const SizedBox(width: 8),
                                        const Text(
                                          '+7',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontFamily: 'monospace',
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                                onChanged: (value) {
                                  setState(() {
                                    _selectedCountryCode = value!;
                                    // Автоматически обновляем префикс при смене страны
                                    _updatePhonePrefix(value!);
                                  });
                                },
                              ),
                            ),
                          ),

                          const SizedBox(width: 12),

                          // Поле номера
                          Expanded(
                            child: TextFormField(
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              decoration: InputDecoration(
                                hintText: _getPhoneHint(),
                                prefixIcon: const Icon(Icons.phone),
                                prefix: Padding(
                                  padding: const EdgeInsets.only(left: 8.0, right: 4.0),
                                  child: Text(
                                    _selectedCountryCode == 'UZ' ? '+998 ' : '+7 ',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'monospace',
                                      color: Colors.black87,
                                    ),
                                  ),
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: AppConstants.primaryColor,
                                    width: 2,
                                  ),
                                ),
                              ),
                              validator: (value) => PhoneInputNormalize.validateNationalInput(
                                value: value,
                                countryCode: _selectedCountryCode,
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 24),

                      // Кнопка отправки
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _sendCode,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppConstants.primaryColor,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 0,
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2,
                                  ),
                                )
                              : Builder(
                                  builder: (context) {
                                    final l10n = AppLocalizations.of(context);
                                    return Text(
                                      _isRegistration 
                                          ? (l10n?.register ?? 'Создать аккаунт')
                                          : (l10n?.login ?? 'Войти'),
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    );
                                  },
                                ),
                        ),
                      ),
                    ],
                  ),
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
