import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:uuid/uuid.dart';
import '../../models/business_hub/lead.dart';
import '../../models/business_hub/deal.dart';
import '../../models/business_hub/crm_company.dart';
import '../../models/business_hub/crm_contact.dart';
import '../../models/business_hub/crm_product.dart';
import '../../models/business_hub/crm_deal_item.dart';
import '../../models/business_hub/crm_pipeline.dart';
import '../../models/business_hub/crm_crm_task.dart';
import '../../models/business_hub/crm_subscription.dart';
import '../../models/business_hub/crm_deal_document.dart';
import '../../models/business_hub/crm_notification.dart';
import 'bh_firestore_service.dart';

/// Расширенный CRM: справочники, задачи CRM, подписки, документы, уведомления, аналитика, автоматизации.
class BHCrmService {
  BHCrmService(this._bh);
  final BHFirestoreService _bh;
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  static const _uuid = Uuid();

  CollectionReference get _companies => _db.collection('bh_companies');
  CollectionReference get _contacts => _db.collection('bh_contacts');
  CollectionReference get _products => _db.collection('bh_products');
  CollectionReference get _dealItems => _db.collection('bh_deal_items');
  CollectionReference get _pipelines => _db.collection('bh_pipelines');
  CollectionReference get _crmTasks => _db.collection('bh_crm_tasks');
  CollectionReference get _subscriptions => _db.collection('bh_subscriptions');
  CollectionReference get _dealDocs => _db.collection('bh_deal_documents');
  CollectionReference get _crmNotifs => _db.collection('bh_crm_notifications');

  // ── Pipelines ────────────────────────────────────────────────

  Future<void> ensureDefaultPipelines(String organizationId) async {
    final q = await _pipelines.where('organizationId', isEqualTo: organizationId).limit(1).get();
    if (q.docs.isNotEmpty) return;
    final now = DateTime.now();
    final defaults = ['Продажи', 'Партнёрства', 'Реклама', 'Подписки', 'Повторные продажи'];
    for (final name in defaults) {
      final id = _uuid.v4();
      await _pipelines.doc(id).set(BHCrmPipeline(
            id: id,
            organizationId: organizationId,
            name: name,
            stageKeys: BHCrmPipeline.defaultStageKeys(),
            createdAt: now,
            updatedAt: now,
          ).toMap());
    }
  }

  Future<List<BHCrmPipeline>> getPipelines(String organizationId) async {
    final snap = await _pipelines.where('organizationId', isEqualTo: organizationId).get();
    final list = snap.docs.map((d) => BHCrmPipeline.fromMap(d.data() as Map<String, dynamic>)).toList();
    list.sort((a, b) => a.name.compareTo(b.name));
    return list;
  }

  Future<String?> getDefaultPipelineId(String organizationId) async {
    final list = await getPipelines(organizationId);
    if (list.isEmpty) return null;
    return list.first.id;
  }

  Future<BHCrmPipeline?> getPipeline(String pipelineId) async {
    final doc = await _pipelines.doc(pipelineId).get();
    if (!doc.exists) return null;
    return BHCrmPipeline.fromMap(doc.data() as Map<String, dynamic>);
  }

  Future<void> updatePipeline(BHCrmPipeline p) async {
    await _pipelines.doc(p.id).set(
      p.copyWith(updatedAt: DateTime.now()).toMap(),
      SetOptions(merge: true),
    );
  }

  /// Собирает параметры новой сделки из шаблона воронки.
  /// Вызывается при создании сделки: результат передаётся в [BHFirestoreService.createDeal].
  Future<({String? title, String? notes, BHDealType? dealType, Map<String, dynamic>? saleContext})>
      resolvePipelineTemplate(String? pipelineId, {String? userTitle, String? userNotes}) async {
    if (pipelineId == null || pipelineId.isEmpty) {
      return (title: null, notes: null, dealType: null, saleContext: null);
    }
    final pipe = await getPipeline(pipelineId);
    if (pipe == null) {
      return (title: null, notes: null, dealType: null, saleContext: null);
    }

    String? mergedTitle;
    if (pipe.defaultTitlePrefix != null && pipe.defaultTitlePrefix!.isNotEmpty) {
      if (userTitle != null && userTitle.isNotEmpty) {
        mergedTitle = '${pipe.defaultTitlePrefix}: $userTitle';
      } else {
        mergedTitle = pipe.defaultTitlePrefix;
      }
    }

    final mergedNotes = (userNotes != null && userNotes.isNotEmpty)
        ? userNotes
        : pipe.defaultNotesTemplate;

    BHDealType? dealType;
    if (pipe.defaultDealType != null) {
      dealType = BHDealType.values.where(
        (e) => e.firestoreValue == pipe.defaultDealType || e.name == pipe.defaultDealType,
      ).firstOrNull;
    }

    final ctx = pipe.contextDefaults.isNotEmpty
        ? Map<String, dynamic>.from(pipe.contextDefaults)
        : null;

    return (title: mergedTitle, notes: mergedNotes, dealType: dealType, saleContext: ctx);
  }

  // ── Companies / Contacts / Products ─────────────────────────

  Future<BHCrmCompany> createCompany({
    required String organizationId,
    required String name,
    String? industry,
    String? size,
    String? address,
    String? website,
    String? ownerId,
    String? counterpartyId,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final c = BHCrmCompany(
      id: id,
      organizationId: organizationId,
      name: name,
      industry: industry,
      size: size,
      address: address,
      website: website,
      ownerId: ownerId,
      counterpartyId: counterpartyId,
      createdAt: now,
      updatedAt: now,
    );
    await _companies.doc(id).set(c.toMap());
    return c;
  }

  Future<List<BHCrmCompany>> getCompanies(String organizationId) async {
    final snap = await _companies.where('organizationId', isEqualTo: organizationId).get();
    final list = snap.docs.map((d) => BHCrmCompany.fromMap(d.data() as Map<String, dynamic>)).toList();
    list.sort((a, b) => a.name.compareTo(b.name));
    return list;
  }

  Future<void> updateCompany(BHCrmCompany c) async {
    final u = c.copyWith(updatedAt: DateTime.now());
    await _companies.doc(c.id).set(u.toMap(), SetOptions(merge: true));
  }

  Future<void> deleteCompany(String id) async {
    await _companies.doc(id).delete();
  }

  Future<BHCrmContact> createContact({
    required String organizationId,
    required String name,
    required String companyId,
    String? phone,
    String? email,
    String? position,
    String? ownerId,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final c = BHCrmContact(
      id: id,
      organizationId: organizationId,
      name: name,
      companyId: companyId,
      phone: phone,
      email: email,
      position: position,
      ownerId: ownerId,
      createdAt: now,
      updatedAt: now,
    );
    await _contacts.doc(id).set(c.toMap());
    return c;
  }

  Future<List<BHCrmContact>> getContacts(String organizationId, {String? companyId}) async {
    Query q = _contacts.where('organizationId', isEqualTo: organizationId);
    if (companyId != null) q = q.where('companyId', isEqualTo: companyId);
    final snap = await q.get();
    final list = snap.docs.map((d) => BHCrmContact.fromMap(d.data() as Map<String, dynamic>)).toList();
    list.sort((a, b) => a.name.compareTo(b.name));
    return list;
  }

  Future<void> updateContact(BHCrmContact c) async {
    final u = c.copyWith(updatedAt: DateTime.now());
    await _contacts.doc(c.id).set(u.toMap(), SetOptions(merge: true));
  }

  Future<void> deleteContact(String id) async {
    await _contacts.doc(id).delete();
  }

  Future<BHCrmProduct> createProduct({
    required String organizationId,
    required String name,
    double price = 0,
    String currency = 'UZS',
    BHCrmProductKind kind = BHCrmProductKind.product,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final p = BHCrmProduct(
      id: id,
      organizationId: organizationId,
      name: name,
      price: price,
      currency: currency,
      kind: kind,
      createdAt: now,
      updatedAt: now,
    );
    await _products.doc(id).set(p.toMap());
    return p;
  }

  Future<List<BHCrmProduct>> getProducts(String organizationId, {bool activeOnly = true}) async {
    final snap = await _products.where('organizationId', isEqualTo: organizationId).get();
    var list = snap.docs.map((d) => BHCrmProduct.fromMap(d.data() as Map<String, dynamic>)).toList();
    if (activeOnly) list = list.where((p) => p.active).toList();
    list.sort((a, b) => a.name.compareTo(b.name));
    return list;
  }

  Future<void> updateProduct(BHCrmProduct p) async {
    final u = p.copyWith(updatedAt: DateTime.now());
    await _products.doc(p.id).set(u.toMap(), SetOptions(merge: true));
  }

  // ── Deal items ───────────────────────────────────────────────

  Future<BHCrmDealItem> addDealItem({
    required String organizationId,
    required String dealId,
    required String productId,
    String? productName,
    double qty = 1,
    required double price,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final item = BHCrmDealItem(
      id: id,
      organizationId: organizationId,
      dealId: dealId,
      productId: productId,
      productName: productName,
      qty: qty,
      price: price,
      createdAt: now,
    );
    await _dealItems.doc(id).set(item.toMap());
    return item;
  }

  Future<List<BHCrmDealItem>> getDealItems(String organizationId, String dealId) async {
    final snap = await _dealItems
        .where('organizationId', isEqualTo: organizationId)
        .where('dealId', isEqualTo: dealId)
        .get();
    final list = snap.docs.map((d) => BHCrmDealItem.fromMap(d.data() as Map<String, dynamic>)).toList();
    list.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return list;
  }

  Future<void> deleteDealItem(String id) async {
    await _dealItems.doc(id).delete();
  }

  // ── CRM Tasks ────────────────────────────────────────────────

  Future<BHCrmTask> createCrmTask({
    required String organizationId,
    required String title,
    String? description,
    String? dealId,
    String? leadId,
    required String assignedTo,
    required DateTime dueDate,
    String? priority,
    String? createdBy,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final t = BHCrmTask(
      id: id,
      organizationId: organizationId,
      title: title,
      description: description,
      dealId: dealId,
      leadId: leadId,
      assignedTo: assignedTo,
      dueDate: dueDate,
      priority: priority,
      createdBy: createdBy,
      createdAt: now,
      updatedAt: now,
    );
    await _crmTasks.doc(id).set(t.toMap());
    return t;
  }

  Future<List<BHCrmTask>> getCrmTasks(String organizationId, {String? assignedTo, int limit = 100}) async {
    Query q = _crmTasks.where('organizationId', isEqualTo: organizationId);
    if (assignedTo != null) q = q.where('assignedTo', isEqualTo: assignedTo);
    final snap = await q.limit(limit).get();
    final list = snap.docs.map((d) => BHCrmTask.fromMap(d.data() as Map<String, dynamic>)).toList();
    list.sort((a, b) => a.dueDate.compareTo(b.dueDate));
    return list;
  }

  Future<void> updateCrmTask(BHCrmTask t) async {
    final u = t.copyWith(updatedAt: DateTime.now());
    await _crmTasks.doc(t.id).set(u.toMap(), SetOptions(merge: true));
  }

  // ── Subscriptions ────────────────────────────────────────────

  Future<BHCrmSubscription> createSubscription({
    required String organizationId,
    required String dealId,
    required String plan,
    double price = 0,
    String currency = 'UZS',
    required DateTime startDate,
    required DateTime endDate,
    bool autoRenew = false,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final s = BHCrmSubscription(
      id: id,
      organizationId: organizationId,
      dealId: dealId,
      plan: plan,
      price: price,
      currency: currency,
      startDate: startDate,
      endDate: endDate,
      autoRenew: autoRenew,
      createdAt: now,
      updatedAt: now,
    );
    await _subscriptions.doc(id).set(s.toMap());
    return s;
  }

  Future<List<BHCrmSubscription>> getSubscriptions(String organizationId) async {
    final snap = await _subscriptions.where('organizationId', isEqualTo: organizationId).get();
    final list = snap.docs.map((d) => BHCrmSubscription.fromMap(d.data() as Map<String, dynamic>)).toList();
    list.sort((a, b) => b.endDate.compareTo(a.endDate));
    return list;
  }

  Future<void> updateSubscription(BHCrmSubscription s) async {
    final u = s.copyWith(updatedAt: DateTime.now());
    await _subscriptions.doc(s.id).set(u.toMap(), SetOptions(merge: true));
  }

  // ── Deal documents ───────────────────────────────────────────

  Future<BHCrmDealDocument> addDealDocument({
    required String organizationId,
    required String dealId,
    required String title,
    required String url,
    required String createdBy,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final doc = BHCrmDealDocument(
      id: id,
      organizationId: organizationId,
      dealId: dealId,
      title: title,
      url: url,
      createdBy: createdBy,
      createdAt: now,
    );
    await _dealDocs.doc(id).set(doc.toMap());
    return doc;
  }

  Future<List<BHCrmDealDocument>> getDealDocuments(String organizationId, String dealId) async {
    final snap = await _dealDocs
        .where('organizationId', isEqualTo: organizationId)
        .where('dealId', isEqualTo: dealId)
        .get();
    final list = snap.docs.map((d) => BHCrmDealDocument.fromMap(d.data() as Map<String, dynamic>)).toList();
    list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return list;
  }

  Future<void> deleteDealDocument(String id) async {
    await _dealDocs.doc(id).delete();
  }

  // ── In-app notifications ─────────────────────────────────────

  Future<void> createCrmNotification({
    required String organizationId,
    required String userId,
    required BHCrmNotificationType type,
    required String title,
    required String body,
    String? dealId,
    String? leadId,
  }) async {
    final id = _uuid.v4();
    final n = BHCrmNotification(
      id: id,
      organizationId: organizationId,
      userId: userId,
      type: type,
      title: title,
      body: body,
      dealId: dealId,
      leadId: leadId,
      createdAt: DateTime.now(),
    );
    await _crmNotifs.doc(id).set(n.toMap());
  }

  Future<List<BHCrmNotification>> getCrmNotifications(String organizationId, String userId, {int limit = 50}) async {
    final snap = await _crmNotifs
        .where('organizationId', isEqualTo: organizationId)
        .where('userId', isEqualTo: userId)
        .limit(100)
        .get();
    final list = snap.docs.map((d) => BHCrmNotification.fromMap(d.data() as Map<String, dynamic>)).toList();
    list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    if (list.length > limit) return list.sublist(0, limit);
    return list;
  }

  Future<void> markCrmNotificationRead(String id) async {
    await _crmNotifs.doc(id).update({'read': true});
  }

  Future<int> unreadCrmNotificationCount(String organizationId, String userId) async {
    final list = await getCrmNotifications(organizationId, userId, limit: 100);
    return list.where((n) => !n.read).length;
  }

  // ── Analytics ────────────────────────────────────────────────

  Future<Map<String, dynamic>> getCrmAnalytics(String organizationId) async {
    final leads = await _bh.getLeads(organizationId, limit: 500);
    final deals = await _bh.getDeals(organizationId, limit: 500);
    final activities = await _bh.getActivities(organizationId, limit: 500);
    final now = DateTime.now();
    final monthAgo = now.subtract(const Duration(days: 30));

    final leads30 = leads.where((l) => l.createdAt.isAfter(monthAgo)).length;
    final won = deals.where((d) => d.stage == BHDealStage.won).toList();
    final lost = deals.where((d) => d.stage == BHDealStage.lost).length;
    final wonSum = won.fold<double>(0, (s, d) => s + d.amount);
    final avgCheck = won.isEmpty ? 0.0 : wonSum / won.length;
    final closed = won.length + lost;
    final conversionClosed = closed == 0 ? 0.0 : won.length / closed;

    final active = deals.where((d) => !d.stage.isClosed).toList();
    double forecast = 0;
    for (final d in active) {
      forecast += d.amount * (d.probability.clamp(0, 100) / 100.0);
    }

    final Set<String> userIds = {};
    for (final l in leads) {
      if (l.assignedTo != null) userIds.add(l.assignedTo!);
    }
    for (final d in deals) {
      if (d.assignedTo != null) userIds.add(d.assignedTo!);
    }

    final List<Map<String, dynamic>> managerKpi = [];
    for (final uid in userIds) {
      final lc = leads.where((l) => l.assignedTo == uid).length;
      final dc = deals.where((d) => d.assignedTo == uid).length;
      final w = deals.where((d) => d.assignedTo == uid && d.stage == BHDealStage.won).toList();
      final ws = w.fold<double>(0, (s, d) => s + d.amount);
      final dl = deals.where((d) => d.assignedTo == uid && d.stage.isClosed).length;
      final conv = dl == 0 ? 0.0 : w.length / dl;
      managerKpi.add({
        'userId': uid,
        'leads': lc,
        'deals': dc,
        'won': w.length,
        'sum': ws,
        'conversion': conv,
      });
    }

    return {
      'leadsTotal': leads.length,
      'leads30d': leads30,
      'dealsTotal': deals.length,
      'wonCount': won.length,
      'lostCount': lost,
      'wonSum': wonSum,
      'avgCheck': avgCheck,
      'conversionClosed': conversionClosed,
      'forecast': forecast,
      'managerKpi': managerKpi,
    };
  }

  /// Сделки без активности > [days] — создаёт уведомления (идемпотентность по dealId за сутки — упрощённо без дедупа).
  Future<void> runStaleDealCheck(String organizationId, String notifyUserId, {int days = 3}) async {
    final deals = await _bh.getDeals(organizationId, limit: 200);
    final activities = await _bh.getActivities(organizationId, limit: 500);
    final threshold = DateTime.now().subtract(Duration(days: days));
    for (final d in deals) {
      if (d.stage.isClosed) continue;
      final last = activities.where((a) => a.dealId == d.id).map((a) => a.activityDate).fold<DateTime?>(
            null,
            (p, e) => p == null || e.isAfter(p) ? e : p,
          );
      final effective = last ?? d.createdAt;
      if (effective.isBefore(threshold)) {
        await createCrmNotification(
          organizationId: organizationId,
          userId: notifyUserId,
          type: BHCrmNotificationType.staleDeal,
          title: 'Нет активности по сделке',
          body: d.title,
          dealId: d.id,
        );
      }
    }
  }

  // ── Automations ──────────────────────────────────────────────

  Future<void> afterLeadCreated(BHLead lead, String actorId) async {
    final assignee = lead.assignedTo ?? actorId;
    await createCrmTask(
      organizationId: lead.organizationId,
      title: 'Позвонить: ${lead.name}',
      leadId: lead.id,
      assignedTo: assignee,
      dueDate: DateTime.now().add(const Duration(days: 1)),
      createdBy: actorId,
    );
    await createCrmNotification(
      organizationId: lead.organizationId,
      userId: assignee,
      type: BHCrmNotificationType.newLead,
      title: 'Новый лид',
      body: lead.name,
      leadId: lead.id,
    );
  }

  Future<void> afterDealCreated(BHDeal deal, String actorId) async {
    final assignee = deal.assignedTo ?? actorId;
    await createCrmNotification(
      organizationId: deal.organizationId,
      userId: assignee,
      type: BHCrmNotificationType.newDeal,
      title: 'Новая сделка',
      body: deal.title,
      dealId: deal.id,
    );
  }

  Future<void> afterDealStageChanged(BHDeal prev, BHDeal next, String actorId) async {
    final assignee = next.assignedTo ?? actorId;
    if (next.stage == BHDealStage.proposal && prev.stage != BHDealStage.proposal) {
      await createCrmTask(
        organizationId: next.organizationId,
        title: 'Отправить КП: ${next.title}',
        dealId: next.id,
        assignedTo: assignee,
        dueDate: DateTime.now().add(const Duration(days: 2)),
        createdBy: actorId,
      );
    }
    if (next.stage == BHDealStage.won && prev.stage != BHDealStage.won) {
      await createCrmNotification(
        organizationId: next.organizationId,
        userId: assignee,
        type: BHCrmNotificationType.dealWon,
        title: 'Сделка выиграна',
        body: next.title,
        dealId: next.id,
      );
      if (next.operationId == null && next.amount > 0) {
        await createCrmNotification(
          organizationId: next.organizationId,
          userId: assignee,
          type: BHCrmNotificationType.dealWon,
          title: 'Создайте операцию',
          body: 'Сделка «${next.title}» без операции дохода',
          dealId: next.id,
        );
      }
    }
  }
}
