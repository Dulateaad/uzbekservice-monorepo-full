import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../constants/app_constants.dart';
import '../../widgets/design_system_button.dart';
import '../../providers/locale_provider.dart';
import '../../l10n/app_localizations.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen>
    with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  // Настройки приложения
  bool _notificationsEnabled = true;
  bool _locationEnabled = true;
  bool _darkModeEnabled = false;
  String _selectedLanguage = 'uz';
  String _selectedCurrency = 'UZS';
  bool _autoUpdateEnabled = true;
  bool _dataSavingEnabled = false;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _loadSettings();
  }

  void _initializeAnimations() {
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeInOut,
    ));

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
    ));

    _fadeController.forward();
    _slideController.forward();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _notificationsEnabled = prefs.getBool('notifications_enabled') ?? true;
      _locationEnabled = prefs.getBool('location_enabled') ?? true;
      _darkModeEnabled = prefs.getBool('dark_mode_enabled') ?? false;
      _selectedLanguage = prefs.getString('selected_language') ?? 'uz';
      _selectedCurrency = prefs.getString('selected_currency') ?? 'UZS';
      _autoUpdateEnabled = prefs.getBool('auto_update_enabled') ?? true;
      _dataSavingEnabled = prefs.getBool('data_saving_enabled') ?? false;
    });
  }

  Future<void> _saveSettings() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notifications_enabled', _notificationsEnabled);
    await prefs.setBool('location_enabled', _locationEnabled);
    await prefs.setBool('dark_mode_enabled', _darkModeEnabled);
    await prefs.setString('selected_language', _selectedLanguage);
    await prefs.setString('selected_currency', _selectedCurrency);
    await prefs.setBool('auto_update_enabled', _autoUpdateEnabled);
    await prefs.setBool('data_saving_enabled', _dataSavingEnabled);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: _buildAppBar(),
      body: FadeTransition(
        opacity: _fadeAnimation,
        child: SlideTransition(
          position: _slideAnimation,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppConstants.spacingMD),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildProfileSection(),
                const SizedBox(height: AppConstants.spacingLG),
                _buildGeneralSettings(),
                const SizedBox(height: AppConstants.spacingLG),
                _buildNotificationSettings(),
                const SizedBox(height: AppConstants.spacingLG),
                _buildPrivacySettings(),
                const SizedBox(height: AppConstants.spacingLG),
                _buildAppSettings(),
                const SizedBox(height: AppConstants.spacingLG),
                _buildAboutSection(),
                const SizedBox(height: AppConstants.spacingLG),
                _buildDangerZone(),
                const SizedBox(height: AppConstants.spacingXL),
              ],
            ),
          ),
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: AppConstants.backgroundColor,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios, color: AppConstants.textPrimary),
        onPressed: () => context.pop(),
      ),
      title: Text(
        'Настройки',
        style: Theme.of(context).textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.bold,
        ),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.save, color: AppConstants.primaryColor),
          onPressed: _saveSettings,
        ),
      ],
    );
  }

  Widget _buildProfileSection() {
    return Container(
      padding: const EdgeInsets.all(AppConstants.spacingLG),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        borderRadius: BorderRadius.circular(AppConstants.radiusLG),
        border: Border.all(
          color: AppConstants.borderColor,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: AppConstants.primaryColor.withOpacity(0.1),
            child: Text(
              'U',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppConstants.primaryColor,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Пользователь',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '+998 90 123 45 67',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppConstants.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => context.push('/profile/edit'),
            icon: const Icon(Icons.edit, color: AppConstants.primaryColor),
          ),
        ],
      ),
    );
  }

  Widget _buildGeneralSettings() {
    return _buildSettingsSection(
      title: 'Общие настройки',
      icon: Icons.settings,
      children: [
        _buildLanguageSetting(),
        _buildCurrencySetting(),
        _buildThemeSetting(),
      ],
    );
  }

  Widget _buildNotificationSettings() {
    return _buildSettingsSection(
      title: 'Уведомления',
      icon: Icons.notifications,
      children: [
        _buildSwitchTile(
          title: 'Push-уведомления',
          subtitle: 'Получать уведомления о новых сообщениях и заказах',
          value: _notificationsEnabled,
          onChanged: (value) {
            setState(() {
              _notificationsEnabled = value;
            });
          },
        ),
        _buildSwitchTile(
          title: 'Email-уведомления',
          subtitle: 'Получать уведомления на email',
          value: true,
          onChanged: (value) {},
        ),
        _buildSwitchTile(
          title: 'SMS-уведомления',
          subtitle: 'Получать уведомления по SMS',
          value: false,
          onChanged: (value) {},
        ),
      ],
    );
  }

  Widget _buildPrivacySettings() {
    return _buildSettingsSection(
      title: 'Конфиденциальность',
      icon: Icons.privacy_tip,
      children: [
        _buildSwitchTile(
          title: 'Местоположение',
          subtitle: 'Разрешить доступ к местоположению',
          value: _locationEnabled,
          onChanged: (value) {
            setState(() {
              _locationEnabled = value;
            });
          },
        ),
        _buildListTile(
          title: 'Управление данными',
          subtitle: 'Скачать или удалить ваши данные',
          icon: Icons.data_usage,
          onTap: () => _showDataManagementDialog(),
        ),
        _buildListTile(
          title: 'Политика конфиденциальности',
          subtitle: 'Ознакомиться с политикой',
          icon: Icons.description,
          onTap: () => _showPrivacyPolicy(),
        ),
      ],
    );
  }

  Widget _buildAppSettings() {
    return _buildSettingsSection(
      title: 'Приложение',
      icon: Icons.apps,
      children: [
        _buildSwitchTile(
          title: 'Автообновления',
          subtitle: 'Автоматически обновлять приложение',
          value: _autoUpdateEnabled,
          onChanged: (value) {
            setState(() {
              _autoUpdateEnabled = value;
            });
          },
        ),
        _buildSwitchTile(
          title: 'Экономия трафика',
          subtitle: 'Сжимать изображения для экономии трафика',
          value: _dataSavingEnabled,
          onChanged: (value) {
            setState(() {
              _dataSavingEnabled = value;
            });
          },
        ),
        _buildListTile(
          title: 'Очистить кэш',
          subtitle: 'Освободить место на устройстве',
          icon: Icons.cleaning_services,
          onTap: () => _clearCache(),
        ),
        _buildListTile(
          title: 'Версия приложения',
          subtitle: '1.0.0 (Build 1)',
          icon: Icons.info,
          onTap: () => _showAppInfo(),
        ),
      ],
    );
  }

  Widget _buildAboutSection() {
    return _buildSettingsSection(
      title: 'О приложении',
      icon: Icons.info_outline,
      children: [
        _buildListTile(
          title: 'Помощь и поддержка',
          subtitle: 'FAQ, контакты, обратная связь',
          icon: Icons.help,
          onTap: () => context.push('/help'),
        ),
        _buildListTile(
          title: 'Оценить приложение',
          subtitle: 'Оставить отзыв в App Store',
          icon: Icons.star,
          onTap: () => _rateApp(),
        ),
        _buildListTile(
          title: 'Поделиться приложением',
          subtitle: 'Рассказать друзьям',
          icon: Icons.share,
          onTap: () => _shareApp(),
        ),
        _buildListTile(
          title: 'Связаться с нами',
          subtitle: 'support@odo.uz',
          icon: Icons.email,
          onTap: () => _contactUs(),
        ),
      ],
    );
  }

  Widget _buildDangerZone() {
    return _buildSettingsSection(
      title: 'Опасная зона',
      icon: Icons.warning,
      children: [
        _buildListTile(
          title: 'Выйти из аккаунта',
          subtitle: 'Выйти из текущего аккаунта',
          icon: Icons.logout,
          textColor: Colors.orange,
          onTap: () => _showLogoutDialog(),
        ),
        _buildListTile(
          title: 'Удалить аккаунт',
          subtitle: 'Навсегда удалить аккаунт и все данные',
          icon: Icons.delete_forever,
          textColor: Colors.red,
          onTap: () => _showDeleteAccountDialog(),
        ),
      ],
    );
  }

  Widget _buildSettingsSection({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        borderRadius: BorderRadius.circular(AppConstants.radiusLG),
        border: Border.all(
          color: AppConstants.borderColor,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(AppConstants.spacingMD),
            child: Row(
              children: [
                Icon(icon, color: AppConstants.primaryColor, size: 20),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          ...children,
        ],
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppConstants.spacingMD,
        vertical: AppConstants.spacingSM,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppConstants.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppConstants.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: AppConstants.primaryColor,
          ),
        ],
      ),
    );
  }

  Widget _buildListTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
    Color? textColor,
  }) {
    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: AppConstants.borderColor.withOpacity(0.5),
            width: 0.5,
          ),
        ),
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: textColor ?? AppConstants.primaryColor,
          size: 20,
        ),
        title: Text(
          title,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: textColor ?? AppConstants.textPrimary,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(
            fontSize: 14,
            color: AppConstants.textSecondary,
          ),
        ),
        trailing: Icon(
          Icons.chevron_right,
          color: AppConstants.textSecondary,
        ),
        onTap: onTap,
      ),
    );
  }

  Widget _buildLanguageSetting() {
    final l10n = AppLocalizations.of(context)!;
    final currentLocale = ref.watch(localeProvider);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppConstants.spacingMD,
        vertical: AppConstants.spacingSM,
      ),
      child: Row(
        children: [
          Icon(Icons.language, color: AppConstants.primaryColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.language,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppConstants.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  currentLocale.languageCode == 'ru' 
                    ? l10n.russian 
                    : currentLocale.languageCode == 'uz' 
                      ? l10n.uzbek 
                      : l10n.english,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppConstants.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Consumer(
            builder: (context, ref, _) {
              final locale = ref.watch(localeProvider);
              return DropdownButton<String>(
                value: locale.languageCode,
                underline: const SizedBox(),
                items: [
                  DropdownMenuItem(value: 'uz', child: Text(l10n.uzbek)),
                  DropdownMenuItem(value: 'ru', child: Text(l10n.russian)),
                ],
                onChanged: (value) async {
                  if (value != null) {
                    final localeNotifier = ref.read(localeProvider.notifier);
                    await localeNotifier.setLocale(Locale(value));
                    setState(() {
                      _selectedLanguage = value;
                    });
                    await _saveSettings();
                  }
                },
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCurrencySetting() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppConstants.spacingMD,
        vertical: AppConstants.spacingSM,
      ),
      child: Row(
        children: [
          Icon(Icons.attach_money, color: AppConstants.primaryColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Валюта',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppConstants.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _selectedCurrency,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppConstants.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          DropdownButton<String>(
            value: _selectedCurrency,
            underline: const SizedBox(),
            items: const [
              DropdownMenuItem(value: 'UZS', child: Text('UZS')),
              DropdownMenuItem(value: 'USD', child: Text('USD')),
              DropdownMenuItem(value: 'EUR', child: Text('EUR')),
            ],
            onChanged: (value) {
              setState(() {
                _selectedCurrency = value!;
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildThemeSetting() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppConstants.spacingMD,
        vertical: AppConstants.spacingSM,
      ),
      child: Row(
        children: [
          Icon(Icons.palette, color: AppConstants.primaryColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Тема',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppConstants.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _darkModeEnabled ? 'Темная' : 'Светлая',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppConstants.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: _darkModeEnabled,
            onChanged: (value) {
              setState(() {
                _darkModeEnabled = value;
              });
            },
            activeColor: AppConstants.primaryColor,
          ),
        ],
      ),
    );
  }

  String _getLanguageName(String code) {
    switch (code) {
      case 'uz':
        return 'O\'zbekcha';
      case 'ru':
        return 'Русский';
      case 'en':
        return 'English';
      default:
        return 'O\'zbekcha';
    }
  }

  void _showDataManagementDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Управление данными'),
        content: const Text(
          'Вы можете скачать все ваши данные или полностью удалить аккаунт. '
          'Это действие нельзя отменить.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Implement data download
            },
            child: const Text('Скачать данные'),
          ),
        ],
      ),
    );
  }

  void _showPrivacyPolicy() {
    // TODO: Implement privacy policy screen
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Политика конфиденциальности'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _clearCache() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Очистить кэш'),
        content: const Text('Это действие очистит кэш приложения и освободит место на устройстве.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Implement cache clearing
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Кэш очищен'),
                  duration: Duration(seconds: 2),
                ),
              );
            },
            child: const Text('Очистить'),
          ),
        ],
      ),
    );
  }

  void _showAppInfo() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Информация о приложении'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Версия: 1.0.0'),
            Text('Сборка: 1'),
            Text('Дата сборки: 2024-01-01'),
            Text('Разработчик: ODO.UZ Team'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Закрыть'),
          ),
        ],
      ),
    );
  }

  void _rateApp() {
    // TODO: Implement app rating
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Спасибо за оценку!'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _shareApp() {
    // TODO: Implement app sharing
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Приложение поделено'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _contactUs() {
    // TODO: Implement contact us
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Открыть контакты'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Выйти из аккаунта'),
        content: const Text('Вы уверены, что хотите выйти из аккаунта?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Implement logout
              context.go('/auth/phone');
            },
            child: const Text('Выйти'),
          ),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Удалить аккаунт'),
        content: const Text(
          'Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить. '
          'Все ваши данные будут безвозвратно удалены.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Implement account deletion
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Аккаунт удален'),
                  duration: Duration(seconds: 2),
                ),
              );
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Удалить'),
          ),
        ],
      ),
    );
  }
}
