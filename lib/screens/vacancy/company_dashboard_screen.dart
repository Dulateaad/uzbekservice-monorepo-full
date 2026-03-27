import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../providers/firestore_auth_provider.dart';
import '../../providers/vacancy_providers.dart';
import '../../services/vacancy_service.dart';
import '../../models/vacancy.dart';
import '../../widgets/vacancy_card.dart';
import 'create_vacancy_screen.dart';
import 'vacancy_detail_screen.dart';

class CompanyDashboardScreen extends ConsumerWidget {
  const CompanyDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(firestoreAuthProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Панель компании'),
        backgroundColor: const Color(0xFF10B981),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              context.push('/vacancy/create');
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppConstants.spacingLG),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Приветствие
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppConstants.spacingLG),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF10B981), Color(0xFF059669)],
                ),
                borderRadius: BorderRadius.circular(AppConstants.radiusLG),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Добро пожаловать, ${user?.name ?? 'Компания'}!',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: AppConstants.spacingSM),
                  const Text(
                    'Управляйте вашими вакансиями и откликами',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppConstants.spacingLG),

            // Статистика
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    title: 'Активные вакансии',
                    value: '3',
                    icon: Icons.work,
                    color: Colors.blue,
                  ),
                ),
                const SizedBox(width: AppConstants.spacingMD),
                Expanded(
                  child: _StatCard(
                    title: 'Новые отклики',
                    value: '12',
                    icon: Icons.mail,
                    color: Colors.orange,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppConstants.spacingLG),

            // Действия
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      context.push('/vacancy/create');
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Создать вакансию'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
                const SizedBox(width: AppConstants.spacingMD),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      context.push('/vacancy/applications');
                    },
                    icon: const Icon(Icons.mail),
                    label: const Text('Отклики'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppConstants.spacingLG),

            // Мои вакансии
            const Text(
              'Мои вакансии',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: AppConstants.spacingMD),
            Consumer(
              builder: (context, ref, _) {
                final service = ref.watch(vacancyServiceProvider);
                final companyVacancies = ref.watch(
                  FutureProvider((ref) => service.getCompanyVacancies(user?.id ?? '')),
                );

                return companyVacancies.when(
                  data: (vacancies) {
                    if (vacancies.isEmpty) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.all(AppConstants.spacingXL),
                          child: Column(
                            children: [
                              Icon(
                                Icons.work_outline,
                                size: 64,
                                color: AppConstants.textSecondary,
                              ),
                              SizedBox(height: AppConstants.spacingMD),
                              Text(
                                'У вас пока нет вакансий',
                                style: TextStyle(color: AppConstants.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      );
                    }
                    return ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: vacancies.length,
                      itemBuilder: (context, index) {
                        final vacancy = vacancies[index];
                        return VacancyCard(
                          vacancy: vacancy,
                          onTap: () {
                            context.push('/vacancy/${vacancy.id}');
                          },
                        );
                      },
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (_, __) => const Text(
                    'Ошибка при загрузке вакансий',
                    style: TextStyle(color: Colors.red),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppConstants.spacingMD),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: AppConstants.spacingSM),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: const TextStyle(
                fontSize: 12,
                color: AppConstants.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
