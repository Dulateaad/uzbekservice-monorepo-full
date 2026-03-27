import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../constants/app_constants.dart';

class BHToolsScreen extends StatelessWidget {
  const BHToolsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'Инструменты',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        Text(
          'Дополнительные модули Business Hub',
          style: TextStyle(fontSize: 14, color: AppConstants.textSecondary),
        ),
        const SizedBox(height: 24),
        _ToolTile(
          icon: Icons.account_balance,
          title: 'Налоговый блок',
          subtitle: 'Сводка по налогам и обязательным платежам',
          color: const Color(0xFF6366F1),
          onTap: () => context.push('/home/services/business-hub/tax'),
        ),
        _ToolTile(
          icon: Icons.people,
          title: 'HR — Сотрудники',
          subtitle: 'Управление сотрудниками и зарплатами',
          color: const Color(0xFF10B981),
          onTap: () => context.push('/home/services/business-hub/hr'),
        ),
        _ToolTile(
          icon: Icons.group,
          title: 'Участники и роли',
          subtitle: 'RBAC: владелец, админ, бухгалтер, наблюдатель',
          color: const Color(0xFF8B5CF6),
          onTap: () => context.push('/home/services/business-hub/members'),
        ),
        _ToolTile(
          icon: Icons.upload_file,
          title: 'Импорт',
          subtitle: 'Импорт операций из Excel или CSV',
          color: const Color(0xFFF59E0B),
          onTap: () => context.push('/home/services/business-hub/import'),
        ),
        _ToolTile(
          icon: Icons.task_alt,
          title: 'Задачи',
          subtitle: 'Задачи от Workflow (доставка, связь с клиентом)',
          color: const Color(0xFF06B6D4),
          onTap: () => context.push('/home/services/business-hub/tasks'),
        ),
        _ToolTile(
          icon: Icons.people_alt,
          title: 'CRM',
          subtitle: 'Лиды, воронка сделок, контакты',
          color: const Color(0xFFEC4899),
          onTap: () => context.push('/home/services/business-hub/crm'),
        ),
        _ToolTile(
          icon: Icons.work_outline,
          title: 'Работы (Work)',
          subtitle: 'Универсальные заказы, задачи, доставки',
          color: const Color(0xFF10B981),
          onTap: () => context.push('/home/services/business-hub/works'),
        ),
        const SizedBox(height: 80),
      ],
    );
  }
}

class _ToolTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _ToolTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}
