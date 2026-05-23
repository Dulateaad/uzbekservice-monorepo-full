import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../constants/app_constants.dart';
import '../../widgets/odo_business_hub_logo.dart';
import '../../widgets/odo_vacancy_logo.dart';

class ServicesScreen extends StatelessWidget {
  const ServicesScreen({super.key});

  static const _odoVacancyUrl = 'https://odo.uz/vacancy'; // TODO: заменить на реальный URL

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Сервисы ODO'),
      ),
      body: ListView(
        children: [
          const SizedBox(height: AppConstants.spacingLG),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppConstants.spacingLG),
            child: Text(
              'Дополнительные сервисы для мастеров и клиентов ODO.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppConstants.textSecondary,
                  ),
            ),
          ),
          const SizedBox(height: AppConstants.spacingLG),
          _buildServiceTileWithLogo(
            context,
            logo: const OdoBusinessHubLogo(size: 44),
            title: 'Business Hub',
            subtitle:
                'Управление бизнесом: операции, BHS, аналитика, контрагенты.',
            onTap: () {
              context.go('/home/services/business-hub');
            },
          ),
          _buildServiceTileWithLogo(
            context,
            logo: const OdoVacancyLogo(size: 44),
            title: 'ODO Vacancy',
            subtitle:
                'Вакансии и предложения работы для мастеров и специалистов.',
            onTap: () {
              context.go('/vacancy');
            },
          ),
        ],
      ),
    );
  }

  Widget _buildServiceTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Card(
      margin: const EdgeInsets.symmetric(
        horizontal: AppConstants.spacingLG,
        vertical: AppConstants.spacingSM,
      ),
      child: ListTile(
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppConstants.primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppConstants.primaryColor),
        ),
        title: Text(title),
        subtitle: Text(
          subtitle,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }

  Widget _buildServiceTileWithLogo(
    BuildContext context, {
    required Widget logo,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Card(
      margin: const EdgeInsets.symmetric(
        horizontal: AppConstants.spacingLG,
        vertical: AppConstants.spacingSM,
      ),
      child: ListTile(
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Container(
            width: 52,
            height: 52,
            color: Theme.of(context).brightness == Brightness.dark
                ? Theme.of(context).colorScheme.surfaceContainerHigh
                : Colors.grey.shade100,
            alignment: Alignment.center,
            padding: const EdgeInsets.all(4),
            child: logo,
          ),
        ),
        title: Text(title),
        subtitle: Text(
          subtitle,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}


