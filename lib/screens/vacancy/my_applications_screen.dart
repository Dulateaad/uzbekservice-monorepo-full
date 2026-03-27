import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../constants/app_constants.dart';
import '../../models/vacancy.dart';
import '../../providers/firestore_auth_provider.dart';
import '../../services/vacancy_service.dart';
import '../../providers/vacancy_providers.dart';
import 'vacancy_detail_screen.dart';

class MyApplicationsScreen extends ConsumerStatefulWidget {
  const MyApplicationsScreen({super.key});

  @override
  ConsumerState<MyApplicationsScreen> createState() => _MyApplicationsScreenState();
}

class _MyApplicationsScreenState extends ConsumerState<MyApplicationsScreen> {
  List<VacancyApplication> _applications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadApplications();
  }

  Future<void> _loadApplications() async {
    final authState = ref.read(firestoreAuthProvider);
    final user = authState.user;
    
    if (user == null) {
      setState(() {
        _isLoading = false;
      });
      return;
    }

    final service = ref.read(vacancyServiceProvider);
    final applications = await service.getUserApplications(user.id);
    
    setState(() {
      _applications = applications;
      _isLoading = false;
    });
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'accepted':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      case 'viewed':
        return Colors.blue;
      default:
        return Colors.orange;
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'accepted':
        return 'Принято';
      case 'rejected':
        return 'Отклонено';
      case 'viewed':
        return 'Просмотрено';
      default:
        return 'На рассмотрении';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Мои отклики'),
        backgroundColor: AppConstants.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _applications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.inbox_outlined,
                        size: 64,
                        color: AppConstants.textSecondary,
                      ),
                      const SizedBox(height: AppConstants.spacingMD),
                      const Text(
                        'У вас пока нет откликов',
                        style: TextStyle(
                          fontSize: 18,
                          color: AppConstants.textSecondary,
                        ),
                      ),
                      const SizedBox(height: AppConstants.spacingMD),
                      ElevatedButton(
                        onPressed: () {
                          context.go('/vacancy');
                        },
                        child: const Text('Найти вакансии'),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(AppConstants.spacingMD),
                  itemCount: _applications.length,
                  itemBuilder: (context, index) {
                    final application = _applications[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: AppConstants.spacingMD),
                      child: ListTile(
                        title: Text(application.userName),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Вакансия ID: ${application.vacancyId}'),
                            Text(
                              'Отправлено: ${application.appliedAt.toString().substring(0, 10)}',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                        trailing: Chip(
                          label: Text(
                            _getStatusText(application.status),
                            style: const TextStyle(color: Colors.white, fontSize: 12),
                          ),
                          backgroundColor: _getStatusColor(application.status),
                        ),
                        onTap: () {
                          context.push('/vacancy/${application.vacancyId}');
                        },
                      ),
                    );
                  },
                ),
    );
  }
}

