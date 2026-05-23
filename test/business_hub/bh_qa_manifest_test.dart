import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// QA: Business Hub — маршруты GoRouter, Firestore rules для bh_*, составные индексы под реальные запросы.
void main() {
  final root = Directory.current.path;

  group('Business Hub QA manifest', () {
    late String routerSrc;
    late String rulesSrc;
    late List<dynamic> indexEntries;

    setUpAll(() {
      routerSrc = File('$root/lib/utils/app_router.dart').readAsStringSync();
      rulesSrc = File('$root/firestore.rules').readAsStringSync();
      final idxJson =
          jsonDecode(File('$root/firestore.indexes.json').readAsStringSync()) as Map<String, dynamic>;
      indexEntries = idxJson['indexes'] as List<dynamic>;
    });

    test('GoRouter declares all BH child routes used in navigation', () {
      const expectedPathLiterals = <String>[
        "path: 'business-hub'",
        "path: 'onboarding'",
        "path: 'operations'",
        "path: 'operation/new'",
        "path: 'operation/:id'",
        "path: 'counterparties'",
        "path: 'reports'",
        "path: 'ocr-scan'",
        "path: 'tax'",
        "path: 'hr'",
        "path: 'members'",
        "path: 'import'",
        "path: 'tasks'",
        "path: 'crm'",
        "path: 'works'",
        "path: 'companies'",
        "path: 'contacts'",
        "path: 'products'",
        "path: 'subscriptions'",
        "path: 'notifications'",
        "path: 'pipelines'",
        "path: 'lead/:id'",
        "path: 'deal/:id'",
      ];
      for (final lit in expectedPathLiterals) {
        expect(routerSrc.contains(lit), true,
            reason: 'app_router.dart must declare $lit for BH navigation');
      }
    });

    test('Firestore rules define match blocks for all bh_* collections in services', () {
      const collections = <String>[
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
      ];
      for (final c in collections) {
        expect(rulesSrc.contains('match /$c/{'), true,
            reason: 'firestore.rules must include $c');
      }
      expect(rulesSrc.contains('match /works/{'), true,
          reason: 'firestore.rules must include works (BH Work)');
    });

    test('BH collections allow read for current app auth model', () {
      expect(rulesSrc.contains('match /bh_organizations/{orgId}'), true);
      expect(rulesSrc.contains('allow read, list: if true'), true,
          reason: 'BH should remain readable without Firebase Auth UID match');
    });

    test('Composite indexes exist for known BH Firestore queries', () {
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

      expect(hasIndex('bh_operations', ['organizationId', 'date']), true,
          reason: 'getOperations / watchOperations');
      expect(hasIndex('bh_operations', ['organizationId', 'type', 'date']), true,
          reason: 'getOperations with type filter');
      expect(hasIndex('bh_operations', ['organizationId', 'status', 'date']), true,
          reason: 'getOperations with status filter');
      expect(hasIndex('bh_operations', ['organizationId', 'type', 'status', 'date']), true,
          reason: 'getOperations with type+status');
      expect(hasIndex('bh_counterparties', ['organizationId', 'name']), true,
          reason: 'getCounterparties');
      expect(hasIndex('bh_leads', ['organizationId', 'updatedAt']), true,
          reason: 'list leads');
      expect(hasIndex('bh_deals', ['organizationId', 'stage', 'updatedAt']), true,
          reason: 'Kanban deals by stage');
      expect(hasIndex('bh_activities', ['organizationId', 'dealId', 'activityDate']), true,
          reason: 'activities on deal');
      expect(hasIndex('bh_tasks', ['organizationId', 'createdAt']), true,
          reason: 'workflow tasks');
      expect(hasIndex('bh_tasks', ['organizationId', 'assignedTo', 'createdAt']), true,
          reason: 'tasks by assignee');
      expect(hasIndex('bh_tasks', ['organizationId', 'assignedTo', 'status', 'createdAt']), true,
          reason: 'getTasks with assignee+status');
      expect(hasIndex('bh_contacts', ['organizationId', 'companyId']), true,
          reason: 'contacts filtered by company');
      expect(hasIndex('bh_crm_notifications', ['organizationId', 'userId']), true,
          reason: 'CRM notifications inbox');
      expect(hasIndex('bh_deal_items', ['organizationId', 'dealId']), true,
          reason: 'line items on deal');
      expect(hasIndex('bh_deal_documents', ['organizationId', 'dealId']), true,
          reason: 'documents on deal');
      expect(hasIndex('works', ['organizationId', 'updatedAt']), true,
          reason: 'works list');
    });
  });
}
