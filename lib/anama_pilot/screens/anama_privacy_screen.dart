import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Краткая политика пилота (дублирует ключевые пункты; полный HTML — web/anama-pilot-privacy.html).
class AnamaPrivacyScreen extends StatelessWidget {
  const AnamaPrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Пилот Anama — данные и дисклеймер')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            'Не медицинское заключение',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          const Text(
            'Сервис носит образовательный и ознакомительный характер. '
            'Показатели пульса и вариабельности с потребительского датчика '
            'не являются диагнозом и не заменяют врача или психолога.',
          ),
          const SizedBox(height: 24),
          Text(
            'Какие данные собираем в пилоте',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          const Text(
            '• Анонимный идентификатор Firebase (Anonymous Auth).\n'
            '• По желанию: короткая метка (ник/класс) — только для удобства в пилоте, не обязательна.\n'
            '• Возрастная группа (категория).\n'
            '• Ответы короткого опроса (настроение, сон, субъективный стресс).\n'
            '• Агрегаты по RR/BPM и расчёт RMSSD на сервере.\n'
            '• Телеметрия с устройства в Realtime Database по выбранному ID устройства.\n'
            '• При наличии ключа API на сервере текст рекомендаций может дополняться языковой моделью (Gemini); это не диагноз.\n'
            'Мы не запрашиваем ФИО и телефон ребёнка в этом потоке пилота.',
          ),
          const SizedBox(height: 24),
          Text(
            'Школьный пилот',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          const Text(
            'Участие класса должно быть согласовано с школой и при необходимости '
            'с родителями в соответствии с местным законодательством. '
            'Технически родительский вход в приложение для каждого прохождения не требуется.',
          ),
          const SizedBox(height: 24),
          Text(
            'Динамика и аналитика',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          const Text(
            'Количество завершённых сессий и обезличенные агрегаты по дням '
            '(стресс, возрастные группы, опрос) доступны на экране «Мониторинг пилота» '
            'после анонимного входа — без списка персональных ответов.',
          ),
          const SizedBox(height: 32),
          FilledButton(
            onPressed: () => context.go('/pilot'),
            child: const Text('Понятно, назад'),
          ),
        ],
      ),
    );
  }
}
