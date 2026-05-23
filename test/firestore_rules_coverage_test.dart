import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Покрытие Firestore rules: все коллекции, к которым обращается клиентский код, должны иметь `match`.
void main() {
  late String rules;

  setUpAll(() {
    final root = Directory.current.path;
    rules = File('$root/firestore.rules').readAsStringSync();
  });

  bool hasMatchForTopLevel(String collectionId) {
    return rules.contains('match /$collectionId/{');
  }

  test('все топ-уровневые коллекции из клиентского кода имеют match в firestore.rules', () {
    const collectionsFromApp = <String>[
      'users',
      'specialists',
      'clients',
      'tools',
      'orders',
      'reviews',
      'notifications',
      'payments',
      'refund_requests',
      'sms_codes',
      'chats',
      'messages',
      'service_ads',
      'vacancies',
      'vacancy_applications',
      'anama_pilot_sessions',
      'anama_pilot_daily',
      'app_settings',
      'bh_organizations',
      'bh_operations',
      'bh_counterparties',
      'bh_health_scores',
      'bh_employees',
      'bh_organization_members',
      'bh_tasks',
      'bh_leads',
      'bh_deals',
      'bh_activities',
      'bh_companies',
      'bh_contacts',
      'bh_products',
      'bh_deal_items',
      'bh_pipelines',
      'bh_crm_tasks',
      'bh_subscriptions',
      'bh_deal_documents',
      'bh_crm_notifications',
      'works',
    ];
    for (final c in collectionsFromApp) {
      expect(hasMatchForTopLevel(c), true,
          reason: 'Добавь match /$c/{...} в firestore.rules (используется из lib/ или functions)');
    }
  });

  test('подколлекции users: services и saved_cards описаны в rules', () {
    expect(rules.contains('match /users/{userId}'), true);
    expect(rules.contains('match /services/{serviceId}'), true);
    expect(rules.contains('match /saved_cards/{cardId}'), true);
  });

  test('вложенные сообщения чата chats/.../messages (если понадобятся) описаны', () {
    expect(rules.contains('match /chats/{chatId}'), true);
    expect(rules.contains('match /messages/{messageId}'), true);
  });

  test('app_settings: клиентское чтение разрешено, запись запрещена (обновление только Admin SDK)', () {
    expect(rules.contains('match /app_settings/{docId}'), true);
    expect(rules.contains('allow write: if false'), true);
  });

  test('users: delete с клиента запрещён (удаление аккаунта — только через Admin / функцию)', () {
    final idx = rules.indexOf('match /users/{userId}');
    expect(idx, greaterThan(-1));
    final end = rules.indexOf('match /specialists/', idx);
    expect(end, greaterThan(idx));
    final usersBlock = rules.substring(idx, end);
    expect(usersBlock.contains('allow delete: if false'), true,
        reason: 'FirebaseFirestoreService.deleteUser с клиента получит permission-denied');
  });

  test('составные индексы для ChatService (chats / messages)', () {
    final root = Directory.current.path;
    final idxJson =
        jsonDecode(File('$root/firestore.indexes.json').readAsStringSync()) as Map<String, dynamic>;
    final indexEntries = idxJson['indexes'] as List<dynamic>;

    bool hasIndex(String collectionGroup, List<String> fieldPathsInOrder) {
      for (final raw in indexEntries) {
        final m = raw as Map<String, dynamic>;
        if (m['collectionGroup'] != collectionGroup) continue;
        final fields = (m['fields'] as List<dynamic>)
            .map((e) => (e as Map<String, dynamic>)['fieldPath'] as String)
            .toList();
        if (fields.length < fieldPathsInOrder.length) continue;
        var ok = true;
        for (var i = 0; i < fieldPathsInOrder.length; i++) {
          if (fields[i] != fieldPathsInOrder[i]) {
            ok = false;
            break;
          }
        }
        if (ok) return true;
      }
      return false;
    }

    expect(hasIndex('chats', ['clientId', 'isActive', 'lastMessageTime']), true,
        reason: 'getChatsForUser (client)');
    expect(hasIndex('chats', ['specialistId', 'isActive', 'lastMessageTime']), true,
        reason: 'getChatsForUser (specialist)');
    expect(hasIndex('chats', ['clientId', 'specialistId', 'isActive']), true,
        reason: 'createChat');
    expect(hasIndex('messages', ['chatId', 'timestamp']), true,
        reason: 'getChatMessages');
    expect(hasIndex('messages', ['chatId', 'isRead', 'senderId']), true,
        reason: 'markMessagesAsRead (senderId !=)');
  });
}
