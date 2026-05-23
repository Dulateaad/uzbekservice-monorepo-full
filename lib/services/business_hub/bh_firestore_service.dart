import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:uuid/uuid.dart';
import '../../models/business_hub/organization.dart';
import '../../models/business_hub/operation.dart';
import '../../models/business_hub/counterparty.dart';
import '../../models/business_hub/business_health_score.dart';
import '../../models/business_hub/employee.dart';
import '../../models/business_hub/organization_member.dart';
import '../../models/business_hub/task.dart';
import '../../models/business_hub/lead.dart';
import '../../models/business_hub/deal.dart';
import '../../models/business_hub/activity.dart';
import '../../models/work.dart';
import '../../models/business_hub/bh_installment.dart';
import '../../models/business_hub/bh_finance_transaction.dart';
import '../../models/business_hub/bh_chart_account.dart';
import '../../models/business_hub/bh_journal_entry.dart';

class BHFirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  static const _uuid = Uuid();

  // ── Collections ──────────────────────────────────────────────
  CollectionReference get _orgs => _db.collection('bh_organizations');
  CollectionReference get _ops => _db.collection('bh_operations');
  CollectionReference get _counterparties => _db.collection('bh_counterparties');
  CollectionReference get _bhsCollection => _db.collection('bh_health_scores');
  CollectionReference get _employees => _db.collection('bh_employees');
  CollectionReference get _members => _db.collection('bh_organization_members');
  CollectionReference get _tasks => _db.collection('bh_tasks');
  CollectionReference get _leads => _db.collection('bh_leads');
  CollectionReference get _deals => _db.collection('bh_deals');
  CollectionReference get _activities => _db.collection('bh_activities');
  CollectionReference get _works => _db.collection('works');
  CollectionReference get _installments => _db.collection('bh_installments');
  CollectionReference get _financeTx => _db.collection('bh_finance_transactions');
  CollectionReference get _chartAccounts => _db.collection('bh_chart_accounts');
  CollectionReference get _journalEntries => _db.collection('bh_journal_entries');

  // ── Universal Work ───────────────────────────────────────────

  Future<Work> createWork({
    required String organizationId,
    required WorkType type,
    required String title,
    String? description,
    WorkStatus status = WorkStatus.created,
    String? clientId,
    String? clientName,
    String? executorId,
    String? executorName,
    String? assignedTo,
    String? parentWorkId,
    double? price,
    String currency = 'UZS',
    Map<String, dynamic>? metadata,
    String? dealId,
    required String createdBy,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final mergedMeta = {
      if (metadata != null) ...metadata,
      if (dealId != null) 'dealId': dealId,
    };
    final work = Work(
      id: id,
      organizationId: organizationId,
      type: type,
      title: title,
      description: description,
      status: status,
      clientId: clientId,
      clientName: clientName,
      executorId: executorId,
      executorName: executorName,
      assignedTo: assignedTo,
      parentWorkId: parentWorkId,
      price: price,
      currency: currency,
      metadata: mergedMeta.isEmpty ? null : mergedMeta,
      dealId: dealId,
      createdBy: createdBy,
      createdAt: now,
      updatedAt: now,
    );
    await _works.doc(id).set(work.toMap());
    return work;
  }

  /// Заказ (Work) из выигранной сделки — связь 1:1, поля подтягиваются из сделки.
  Future<Work> createOrderFromDeal({
    required BHDeal deal,
    required String createdBy,
    WorkType orderType = WorkType.order,
  }) async {
    final work = await createWork(
      organizationId: deal.organizationId,
      type: orderType,
      title: 'Заказ: ${deal.title}',
      description: deal.notes,
      status: WorkStatus.created,
      clientId: deal.contactId ?? deal.counterpartyId,
      clientName: deal.counterpartyName,
      price: deal.amount,
      currency: deal.currency,
      dealId: deal.id,
      metadata: {'pipelineId': deal.pipelineId, 'source': 'deal_won'},
      createdBy: createdBy,
    );
    await updateDeal(deal.copyWith(workId: work.id));
    return work;
  }

  Future<List<Work>> getWorks(
    String organizationId, {
    WorkType? type,
    WorkStatus? status,
    String? assignedTo,
    String? createdBy,
    String? parentWorkId,
    int limit = 100,
  }) async {
    Query query = _works
        .where('organizationId', isEqualTo: organizationId)
        .orderBy('updatedAt', descending: true);
    if (type != null) query = query.where('type', isEqualTo: type.firestoreValue);
    if (status != null) query = query.where('status', isEqualTo: status.firestoreValue);
    if (assignedTo != null) query = query.where('assignedTo', isEqualTo: assignedTo);
    if (createdBy != null) query = query.where('createdBy', isEqualTo: createdBy);
    if (parentWorkId != null) query = query.where('parentWorkId', isEqualTo: parentWorkId);
    final snap = await query.limit(limit).get();
    return snap.docs.map((d) => Work.fromMap(d.data() as Map<String, dynamic>)).toList();
  }

  Future<void> updateWork(Work work) async {
    await _works.doc(work.id).update(
      work.copyWith(updatedAt: DateTime.now()).toMap(),
    );
  }

  Future<void> updateWorkStatus(String workId, WorkStatus status) async {
    await _works.doc(workId).update({
      'status': status.firestoreValue,
      'updatedAt': Timestamp.fromDate(DateTime.now()),
    });
  }

  Future<void> deleteWork(String id) async {
    await _works.doc(id).delete();
  }

  // ── Organization ─────────────────────────────────────────────

  Future<BHOrganization> createOrganization({
    required String ownerId,
    required String name,
    required String industry,
    String businessVerticalId = 'services',
    String? inn,
    String? legalForm,
    int employeeCount = 1,
    String? ownerName,
    String? ownerEmail,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final org = BHOrganization(
      id: id,
      ownerId: ownerId,
      name: name,
      industry: industry,
      businessVerticalId: businessVerticalId,
      inn: inn,
      legalForm: legalForm,
      employeeCount: employeeCount,
      createdAt: now,
      updatedAt: now,
    );
    await _orgs.doc(id).set(org.toMap());
    await addMember(
      organizationId: id,
      userId: ownerId,
      role: BHMemberRole.owner,
      userName: ownerName,
      userEmail: ownerEmail,
    );
    return org;
  }

  Future<BHOrganization?> getOrganizationByOwner(String ownerId) async {
    final snap = await _orgs.where('ownerId', isEqualTo: ownerId).limit(1).get();
    if (snap.docs.isEmpty) return null;
    return BHOrganization.fromMap(snap.docs.first.data() as Map<String, dynamic>);
  }

  Future<BHOrganization?> getOrganization(String id) async {
    final doc = await _orgs.doc(id).get();
    if (!doc.exists) return null;
    return BHOrganization.fromMap(doc.data() as Map<String, dynamic>);
  }

  Future<void> updateOrganization(BHOrganization org) async {
    await _orgs.doc(org.id).update(org.copyWith(updatedAt: DateTime.now()).toMap());
  }

  // ── Operations ───────────────────────────────────────────────

  Future<BHOperation> createOperation({
    required String organizationId,
    required OperationType type,
    required DateTime date,
    required double amount,
    required String createdBy,
    String currency = 'UZS',
    String? counterpartyId,
    String? counterpartyName,
    bool isTaxable = true,
    String? notes,
    String? category,
    String? assignedTo,
    String? parentOperationId,
    String? dealId,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final op = BHOperation(
      id: id,
      organizationId: organizationId,
      type: type,
      date: date,
      amount: amount,
      currency: currency,
      counterpartyId: counterpartyId,
      counterpartyName: counterpartyName,
      isTaxable: isTaxable,
      notes: notes,
      category: category,
      createdBy: createdBy,
      createdAt: now,
      updatedAt: now,
      deliveryStatus: type.hasDelivery ? DeliveryStatus.pending : null,
      assignedTo: assignedTo,
      parentOperationId: parentOperationId,
      dealId: dealId,
    );
    await _ops.doc(id).set(op.toMap());
    return op;
  }

  Future<BHOperation?> getOperationById(String organizationId, String id) async {
    final doc = await _ops.doc(id).get();
    if (!doc.exists) return null;
    final map = doc.data() as Map<String, dynamic>?;
    if (map == null || map['organizationId'] != organizationId) return null;
    return BHOperation.fromMap(map);
  }

  /// Создаёт операцию продажи из выигранной сделки CRM (`source: CRM` в примечании).
  Future<BHOperation> createOperationFromWonDeal(BHDeal deal, String createdBy) async {
    final noteLines = <String>[
      'Источник: CRM',
      'Сделка: ${deal.title}',
      if (deal.notes != null && deal.notes!.trim().isNotEmpty) deal.notes!.trim(),
    ];
    return createOperation(
      organizationId: deal.organizationId,
      type: OperationType.sale,
      date: DateTime.now(),
      amount: deal.amount,
      createdBy: createdBy,
      currency: deal.currency,
      counterpartyId: deal.counterpartyId,
      counterpartyName: deal.counterpartyName,
      notes: noteLines.join('\n'),
      dealId: deal.id,
    );
  }

  /// Заказ Work из выигранной сделки (`metadata.crmDealId`).
  Future<Work> createWorkFromWonDeal(BHDeal deal, String createdBy) async {
    return createWork(
      organizationId: deal.organizationId,
      type: WorkType.order,
      title: deal.title,
      description: deal.notes,
      price: deal.amount > 0 ? deal.amount : null,
      currency: deal.currency,
      assignedTo: deal.assignedTo ?? createdBy,
      clientId: deal.counterpartyId,
      clientName: deal.counterpartyName,
      metadata: {
        'crmDealId': deal.id,
        'source': 'CRM',
      },
      createdBy: createdBy,
    );
  }

  Future<List<BHOperation>> getOperations(
    String organizationId, {
    OperationType? type,
    OperationStatus? status,
    DateTime? from,
    DateTime? to,
    int limit = 50,
  }) async {
    Query query = _ops
        .where('organizationId', isEqualTo: organizationId)
        .orderBy('date', descending: true);

    if (type != null) {
      query = query.where('type', isEqualTo: type.firestoreValue);
    }
    if (status != null) {
      query = query.where('status', isEqualTo: status.firestoreValue);
    }
    if (from != null) {
      query = query.where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(from));
    }
    if (to != null) {
      query = query.where('date', isLessThanOrEqualTo: Timestamp.fromDate(to));
    }

    final snap = await query.limit(limit).get();
    return snap.docs
        .map((d) => BHOperation.fromMap(d.data() as Map<String, dynamic>))
        .toList();
  }

  Stream<List<BHOperation>> watchOperations(String organizationId) {
    return _ops
        .where('organizationId', isEqualTo: organizationId)
        .orderBy('date', descending: true)
        .limit(100)
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => BHOperation.fromMap(d.data() as Map<String, dynamic>))
            .toList());
  }

  Future<void> updateOperation(BHOperation op) async {
    await _ops.doc(op.id).update(op.copyWith(updatedAt: DateTime.now()).toMap());
  }

  Future<void> deleteOperation(String id) async {
    await _ops.doc(id).delete();
  }

  Future<void> confirmOperation(String id) async {
    await _ops.doc(id).update({
      'status': OperationStatus.confirmed.firestoreValue,
      'updatedAt': Timestamp.fromDate(DateTime.now()),
    });
  }

  Future<void> closeOperation(String id) async {
    await _ops.doc(id).update({
      'status': OperationStatus.closed.firestoreValue,
      'updatedAt': Timestamp.fromDate(DateTime.now()),
    });
  }

  // ── Counterparties ───────────────────────────────────────────

  Future<BHCounterparty> createCounterparty({
    required String organizationId,
    required String name,
    CounterpartyType type = CounterpartyType.legalEntity,
    String? inn,
    String? phone,
    String? email,
    String? address,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final cp = BHCounterparty(
      id: id,
      organizationId: organizationId,
      name: name,
      type: type,
      inn: inn,
      phone: phone,
      email: email,
      address: address,
      createdAt: now,
      updatedAt: now,
    );
    await _counterparties.doc(id).set(cp.toMap());
    return cp;
  }

  Future<List<BHCounterparty>> getCounterparties(String organizationId) async {
    final snap = await _counterparties
        .where('organizationId', isEqualTo: organizationId)
        .orderBy('name')
        .get();
    return snap.docs
        .map((d) => BHCounterparty.fromMap(d.data() as Map<String, dynamic>))
        .toList();
  }

  Stream<List<BHCounterparty>> watchCounterparties(String organizationId) {
    return _counterparties
        .where('organizationId', isEqualTo: organizationId)
        .orderBy('name')
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => BHCounterparty.fromMap(d.data() as Map<String, dynamic>))
            .toList());
  }

  Future<void> updateCounterparty(BHCounterparty cp) async {
    await _counterparties.doc(cp.id).update(
      cp.copyWith(updatedAt: DateTime.now()).toMap(),
    );
  }

  Future<void> deleteCounterparty(String id) async {
    await _counterparties.doc(id).delete();
  }

  // ── Business Health Score ────────────────────────────────────

  Future<BusinessHealthScore> calculateBHS(String organizationId) async {
    final now = DateTime.now();
    final monthAgo = now.subtract(const Duration(days: 30));

    final ops = await getOperations(organizationId, from: monthAgo, to: now, limit: 500);
    final deals = await getDeals(organizationId, limit: 200);
    final leads = await getLeads(organizationId, limit: 200);

    double totalIncome = 0;
    double totalExpense = 0;
    int confirmedOps = 0;
    int draftOps = 0;
    int salaryOps = 0;

    for (final op in ops) {
      if (op.type.isIncome) totalIncome += op.amount;
      if (op.type.isExpense) totalExpense += op.amount;
      if (op.status == OperationStatus.confirmed || op.status == OperationStatus.closed) {
        confirmedOps++;
      } else {
        draftOps++;
      }
      if (op.type == OperationType.salaryAccrual || op.type == OperationType.salaryPayment) {
        salaryOps++;
      }
    }

    // CRM: воронка и лиды
    final activeStages = [BHDealStage.new_, BHDealStage.qualification, BHDealStage.proposal, BHDealStage.negotiation];
    double pipelineValue = 0;
    int wonDealsCount = 0;
    for (final d in deals) {
      if (activeStages.contains(d.stage)) pipelineValue += d.amount;
      if (d.stage == BHDealStage.won) wonDealsCount++;
    }
    final recentLeads = leads.where((l) => l.createdAt.isAfter(monthAgo)).length;
    final dealsInFunnel = deals.where((d) => activeStages.contains(d.stage)).length;

    // Finance score: profit margin
    double financeScore = 50.0;
    if (totalIncome > 0) {
      final margin = (totalIncome - totalExpense) / totalIncome;
      financeScore = (margin * 100).clamp(0, 100).toDouble();
      if (totalExpense > totalIncome) financeScore = (20 + margin * 50).clamp(0, 40).toDouble();
    }

    // Sales score: операции + CRM (лиды, сделки, воронка)
    double salesScore = 50.0;
    final salesOps = ops.where((o) => o.type.isIncome).length;
    // Базовый балл от операций дохода
    if (salesOps > 10) {
      salesScore = 90;
    } else if (salesOps > 5) {
      salesScore = 70;
    } else if (salesOps > 0) {
      salesScore = 50;
    } else {
      salesScore = 20;
    }
    // Бонус от CRM: выигранные сделки
    if (wonDealsCount >= 5) {
      salesScore = (salesScore + 10).clamp(0, 100).toDouble();
    } else if (wonDealsCount >= 2) {
      salesScore = (salesScore + 5).clamp(0, 100).toDouble();
    }
    // Бонус от воронки (потенциал)
    if (dealsInFunnel >= 5 && pipelineValue > 0) salesScore = (salesScore + 5).clamp(0, 100).toDouble();
    // Бонус от лидов
    if (recentLeads >= 10) salesScore = (salesScore + 5).clamp(0, 100).toDouble();

    // Operations score: confirmed vs draft ratio
    double opsScore = 50.0;
    final totalOps = confirmedOps + draftOps;
    if (totalOps > 0) {
      opsScore = (confirmedOps / totalOps * 100).clamp(0, 100).toDouble();
    }

    // Personnel score: salary regularity
    double personnelScore = 50.0;
    if (salaryOps > 0) personnelScore = 80;

    final components = BHSComponents(
      finance: financeScore,
      sales: salesScore,
      operations: opsScore,
      personnel: personnelScore,
    );

    final score = components.totalScore;
    final reasons = <String>[];
    final recommendations = <String>[];

    if (financeScore < 50) {
      reasons.add('Расходы превышают доходы');
      recommendations.add('Пересмотрите структуру расходов');
    }
    if (salesScore < 50) {
      reasons.add('Мало продаж за месяц');
      if (recentLeads == 0 && dealsInFunnel == 0) {
        recommendations.add('Добавьте лиды и сделки в CRM');
      } else {
        recommendations.add('Увеличьте активность продаж');
      }
    }
    if (opsScore < 50) {
      reasons.add('Много неподтверждённых операций');
      recommendations.add('Подтвердите черновики операций');
    }
    if (totalIncome > 0 && totalExpense > totalIncome) {
      reasons.add('Возможен кассовый разрыв');
      recommendations.add('Сократите расходы или увеличьте доходы');
    }

    if (reasons.isEmpty) reasons.add('Бизнес работает стабильно');
    if (recommendations.isEmpty) recommendations.add('Продолжайте в том же духе');

    final bhs = BusinessHealthScore(
      organizationId: organizationId,
      score: score,
      status: BHSStatusX.fromScore(score),
      components: components,
      calculatedAt: now,
      topReasons: reasons,
      recommendations: recommendations,
    );

    await _bhsCollection.doc(organizationId).set(bhs.toMap());
    return bhs;
  }

  Future<BusinessHealthScore?> getLatestBHS(String organizationId) async {
    final doc = await _bhsCollection.doc(organizationId).get();
    if (!doc.exists) return null;
    return BusinessHealthScore.fromMap(doc.data() as Map<String, dynamic>);
  }

  // ── Aggregated stats for dashboard ───────────────────────────

  Future<Map<String, dynamic>> getDashboardStats(String organizationId) async {
    final now = DateTime.now();
    final monthAgo = now.subtract(const Duration(days: 30));
    final ops = await getOperations(organizationId, from: monthAgo, to: now, limit: 500);
    final deals = await getDeals(organizationId, limit: 200);
    final leads = await getLeads(organizationId, limit: 200);

    double totalIncome = 0;
    double totalExpense = 0;
    double taxAccrued = 0;
    double taxPaid = 0;
    double salaryAccrued = 0;
    double salaryPaid = 0;
    int totalOps = ops.length;
    int draftCount = 0;

    for (final op in ops) {
      if (op.type.isIncome) totalIncome += op.amount;
      if (op.type.isExpense) totalExpense += op.amount;
      if (op.type == OperationType.taxAccrual) taxAccrued += op.amount;
      if (op.type == OperationType.taxPayment) taxPaid += op.amount;
      if (op.type == OperationType.salaryAccrual) salaryAccrued += op.amount;
      if (op.type == OperationType.salaryPayment) salaryPaid += op.amount;
      if (op.status == OperationStatus.draft) draftCount++;
    }

    // CRM: воронка и лиды
    final activeStages = [BHDealStage.new_, BHDealStage.qualification, BHDealStage.proposal, BHDealStage.negotiation];
    double pipelineValue = 0;
    int wonDealsCount = 0;
    for (final d in deals) {
      if (activeStages.contains(d.stage)) pipelineValue += d.amount;
      if (d.stage == BHDealStage.won) wonDealsCount++;
    }
    final recentLeads = leads.where((l) => l.createdAt.isAfter(monthAgo)).length;

    return {
      'totalIncome': totalIncome,
      'totalExpense': totalExpense,
      'profit': totalIncome - totalExpense,
      'totalOperations': totalOps,
      'draftOperations': draftCount,
      'taxAccrued': taxAccrued,
      'taxPaid': taxPaid,
      'taxOwed': taxAccrued - taxPaid,
      'salaryAccrued': salaryAccrued,
      'salaryPaid': salaryPaid,
      'pipelineValue': pipelineValue,
      'wonDealsCount': wonDealsCount,
      'leadsCount': recentLeads,
      'dealsInFunnel': deals.where((d) => activeStages.contains(d.stage)).length,
    };
  }

  // ── Employees (HR) ───────────────────────────────────────────

  Future<BHEmployee> createEmployee({
    required String organizationId,
    required String fullName,
    String? position,
    String? inn,
    String? phone,
    String? email,
    double? salary,
    DateTime? hireDate,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final emp = BHEmployee(
      id: id,
      organizationId: organizationId,
      fullName: fullName,
      position: position,
      inn: inn,
      phone: phone,
      email: email,
      salary: salary,
      hireDate: hireDate,
      createdAt: now,
      updatedAt: now,
    );
    await _employees.doc(id).set(emp.toMap());
    return emp;
  }

  Future<List<BHEmployee>> getEmployees(String organizationId) async {
    final snap = await _employees
        .where('organizationId', isEqualTo: organizationId)
        .orderBy('fullName')
        .get();
    return snap.docs
        .map((d) => BHEmployee.fromMap(d.data() as Map<String, dynamic>))
        .toList();
  }

  Future<void> updateEmployee(BHEmployee emp) async {
    await _employees.doc(emp.id).update(
      emp.copyWith(updatedAt: DateTime.now()).toMap(),
    );
  }

  Future<void> deleteEmployee(String id) async {
    await _employees.doc(id).delete();
  }

  // ── Organization Members (RBAC) ───────────────────────────────

  Future<BHOrganizationMember> addMember({
    required String organizationId,
    required String userId,
    required BHMemberRole role,
    String? userEmail,
    String? userName,
    String? managerId,
  }) async {
    final existing = await getMemberByUser(organizationId, userId);
    if (existing != null) return existing;

    final id = _uuid.v4();
    final now = DateTime.now();
    final member = BHOrganizationMember(
      id: id,
      organizationId: organizationId,
      userId: userId,
      userEmail: userEmail,
      userName: userName,
      role: role,
      managerId: managerId,
      createdAt: now,
      updatedAt: now,
    );
    await _members.doc(id).set(member.toMap());
    return member;
  }

  Future<List<BHOrganizationMember>> getMembers(String organizationId) async {
    final snap = await _members
        .where('organizationId', isEqualTo: organizationId)
        .get();
    return snap.docs
        .map((d) => BHOrganizationMember.fromMap(d.data() as Map<String, dynamic>))
        .toList();
  }

  Future<BHOrganizationMember?> getMemberByUser(
    String organizationId,
    String userId,
  ) async {
    final snap = await _members
        .where('organizationId', isEqualTo: organizationId)
        .where('userId', isEqualTo: userId)
        .limit(1)
        .get();
    if (snap.docs.isEmpty) return null;
    return BHOrganizationMember.fromMap(
      snap.docs.first.data() as Map<String, dynamic>,
    );
  }

  Future<void> updateMemberRole(String memberId, BHMemberRole role) async {
    await _members.doc(memberId).update({
      'role': role.firestoreValue,
      'updatedAt': Timestamp.fromDate(DateTime.now()),
    });
  }

  Future<void> removeMember(String id) async {
    await _members.doc(id).delete();
  }

  // ── Tasks (Workflow) ─────────────────────────────────────────

  Future<BHTask> createTask({
    required String organizationId,
    required String operationId,
    required String assignedTo,
    required String title,
    String? description,
    BHTaskTrigger triggeredBy = BHTaskTrigger.manual,
    String? triggeredByDeliveryStatus,
    DateTime? dueAt,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final task = BHTask(
      id: id,
      organizationId: organizationId,
      operationId: operationId,
      title: title,
      description: description,
      assignedTo: assignedTo,
      triggeredBy: triggeredBy,
      triggeredByDeliveryStatus: triggeredByDeliveryStatus,
      createdAt: now,
      dueAt: dueAt,
    );
    await _tasks.doc(id).set(task.toMap());
    return task;
  }

  Future<List<BHTask>> getTasks(
    String organizationId, {
    String? assignedTo,
    BHTaskStatus? status,
    int limit = 50,
  }) async {
    Query query = _tasks
        .where('organizationId', isEqualTo: organizationId)
        .orderBy('createdAt', descending: true);

    if (assignedTo != null) {
      query = query.where('assignedTo', isEqualTo: assignedTo);
    }
    if (status != null) {
      query = query.where('status', isEqualTo: status.firestoreValue);
    }

    final snap = await query.limit(limit).get();
    return snap.docs
        .map((d) => BHTask.fromMap(d.data() as Map<String, dynamic>))
        .toList();
  }

  Future<void> updateTask(BHTask task) async {
    final updates = <String, dynamic>{
      'status': task.status.firestoreValue,
    };
    if (task.status == BHTaskStatus.done && task.completedAt == null) {
      updates['completedAt'] = Timestamp.fromDate(DateTime.now());
    }
    await _tasks.doc(task.id).update(updates);
  }

  Future<void> completeTask(String taskId) async {
    await _tasks.doc(taskId).update({
      'status': BHTaskStatus.done.firestoreValue,
      'completedAt': Timestamp.fromDate(DateTime.now()),
    });
  }

  // ── CRM: Leads ──────────────────────────────────────────────

  Future<BHLead> createLead({
    required String organizationId,
    required String name,
    String? phone,
    String? email,
    String? company,
    BHLeadStatus status = BHLeadStatus.new_,
    BHLeadSource source = BHLeadSource.other,
    String? notes,
    String? assignedTo,
    String? campaign,
    String? utmSource,
    String? utmMedium,
    String? utmCampaign,
    String? contactId,
    String? companyId,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final lead = BHLead(
      id: id,
      organizationId: organizationId,
      name: name,
      phone: phone,
      email: email,
      company: company,
      status: status,
      source: source,
      notes: notes,
      assignedTo: assignedTo,
      campaign: campaign,
      utmSource: utmSource,
      utmMedium: utmMedium,
      utmCampaign: utmCampaign,
      contactId: contactId,
      companyId: companyId,
      createdAt: now,
      updatedAt: now,
    );
    await _leads.doc(id).set(lead.toMap());
    return lead;
  }

  Future<List<BHLead>> getLeads(
    String organizationId, {
    BHLeadStatus? status,
    String? assignedTo,
    int limit = 100,
  }) async {
    Query query = _leads
        .where('organizationId', isEqualTo: organizationId)
        .orderBy('updatedAt', descending: true);
    if (status != null) query = query.where('status', isEqualTo: status.firestoreValue);
    if (assignedTo != null) query = query.where('assignedTo', isEqualTo: assignedTo);
    final snap = await query.limit(limit).get();
    return snap.docs.map((d) => BHLead.fromMap(d.data() as Map<String, dynamic>)).toList();
  }

  Future<void> updateLead(BHLead lead) async {
    await _leads.doc(lead.id).update(lead.copyWith(updatedAt: DateTime.now()).toMap());
    await _ensureDealForQualifiedLead(lead);
  }

  /// ТЗ: лид «Квалифицирован» → автосоздание сделки (если ещё нет по этому лиду).
  Future<void> _ensureDealForQualifiedLead(BHLead lead) async {
    if (lead.status != BHLeadStatus.qualified) return;
    final snap = await _deals.where('leadId', isEqualTo: lead.id).limit(1).get();
    if (snap.docs.isNotEmpty) return;
    await createDeal(
      organizationId: lead.organizationId,
      title: 'Сделка: ${lead.name}',
      amount: 0,
      currency: 'UZS',
      stage: BHDealStage.new_,
      counterpartyName: lead.company ?? lead.name,
      leadId: lead.id,
      assignedTo: lead.assignedTo,
      notes: lead.notes,
    );
  }

  Future<void> deleteLead(String id) async {
    await _leads.doc(id).delete();
  }

  // ── CRM: Deals ───────────────────────────────────────────────

  Future<BHDeal> createDeal({
    required String organizationId,
    required String title,
    double amount = 0,
    String currency = 'UZS',
    BHDealStage stage = BHDealStage.new_,
    String? counterpartyId,
    String? counterpartyName,
    String? leadId,
    String? assignedTo,
    DateTime? expectedCloseDate,
    String? notes,
    String? pipelineId,
    String? companyId,
    String? contactId,
    BHDealType? dealType,
    Map<String, dynamic>? saleContext,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final deal = BHDeal(
      id: id,
      organizationId: organizationId,
      title: title,
      amount: amount,
      currency: currency,
      stage: stage,
      counterpartyId: counterpartyId,
      counterpartyName: counterpartyName,
      leadId: leadId,
      assignedTo: assignedTo,
      expectedCloseDate: expectedCloseDate,
      notes: notes,
      pipelineId: pipelineId,
      companyId: companyId,
      contactId: contactId,
      dealType: dealType ?? BHDealType.new_,
      saleContext: saleContext,
      createdAt: now,
      updatedAt: now,
    );
    await _deals.doc(id).set(deal.toMap());
    return deal;
  }

  Future<BHDeal?> getDeal(String organizationId, String dealId) async {
    final doc = await _deals.doc(dealId).get();
    if (!doc.exists) return null;
    final d = doc.data() as Map<String, dynamic>?;
    if (d == null || (d['organizationId'] as String?) != organizationId) return null;
    return BHDeal.fromMap(d);
  }

  Future<List<BHDeal>> getDeals(
    String organizationId, {
    BHDealStage? stage,
    String? assignedTo,
    int limit = 100,
  }) async {
    Query query = _deals
        .where('organizationId', isEqualTo: organizationId)
        .orderBy('updatedAt', descending: true);
    if (stage != null) query = query.where('stage', isEqualTo: stage.firestoreValue);
    if (assignedTo != null) query = query.where('assignedTo', isEqualTo: assignedTo);
    final snap = await query.limit(limit).get();
    return snap.docs.map((d) => BHDeal.fromMap(d.data() as Map<String, dynamic>)).toList();
  }

  Future<void> updateDeal(BHDeal deal) async {
    await _deals.doc(deal.id).update(deal.copyWith(updatedAt: DateTime.now()).toMap());
  }

  Future<void> deleteDeal(String id) async {
    await _deals.doc(id).delete();
  }

  // ── График оплат и финансы (Business Hub ядро, ТЗ этап 1) ───────

  /// Равные платежи на [months] (3 / 6 / 12).
  Future<List<BHInstallment>> createEqualInstallmentSchedule({
    required String organizationId,
    required String workId,
    required double totalAmount,
    String currency = 'UZS',
    required int months,
    DateTime? firstDue,
  }) async {
    if (months <= 0 || totalAmount <= 0) return [];
    final groupId = _uuid.v4();
    final per = totalAmount / months;
    final start = firstDue ?? DateTime.now().add(const Duration(days: 1));
    final now = DateTime.now();
    final list = <BHInstallment>[];
    for (var i = 0; i < months; i++) {
      final due = DateTime(start.year, start.month + i, start.day);
      final id = _uuid.v4();
      final row = BHInstallment(
        id: id,
        organizationId: organizationId,
        workId: workId,
        scheduleGroupId: groupId,
        sequenceIndex: i,
        dueDate: due,
        amount: per,
        paidAmount: 0,
        status: BHInstallmentStatus.unpaid,
        currency: currency,
        createdAt: now,
        updatedAt: now,
      );
      await _installments.doc(id).set(row.toMap());
      list.add(row);
    }
    return list;
  }

  Future<List<BHInstallment>> getInstallmentsForWork(String workId) async {
    final snap = await _installments
        .where('workId', isEqualTo: workId)
        .get();
    return snap.docs
        .map((d) => BHInstallment.fromMap(d.data() as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => a.sequenceIndex.compareTo(b.sequenceIndex));
  }

  Future<BHInstallment?> getInstallment(String id) async {
    final doc = await _installments.doc(id).get();
    if (!doc.exists) return null;
    return BHInstallment.fromMap(doc.data() as Map<String, dynamic>);
  }

  /// Частичная/полная оплата по строке графика.
  Future<BHInstallment> applyInstallmentPayment({
    required String installmentId,
    required double amount,
    required String organizationId,
  }) async {
    final docRef = _installments.doc(installmentId);
    final snap = await docRef.get();
    if (!snap.exists) throw StateError('Installment not found');
    var row = BHInstallment.fromMap(snap.data() as Map<String, dynamic>);
    if (row.organizationId != organizationId) {
      throw StateError('Organization mismatch');
    }
    final newPaid = (row.paidAmount + amount).clamp(0.0, row.amount);
    BHInstallmentStatus st;
    if (newPaid <= 0) {
      st = BHInstallmentStatus.unpaid;
    } else if (newPaid + 0.001 < row.amount) {
      st = BHInstallmentStatus.partial;
    } else {
      st = BHInstallmentStatus.paid;
    }
    row = row.copyWith(paidAmount: newPaid, status: st, updatedAt: DateTime.now());
    await docRef.update(row.toMap());

    await _appendFinanceTransaction(
      organizationId: organizationId,
      kind: BHFinanceTxKind.income,
      amount: amount,
      currency: row.currency,
      refType: 'installment',
      refId: installmentId,
      note: 'Оплата по графику',
    );
    await _postCashReceiptJournalIfAccounting(
      organizationId: organizationId,
      amount: amount,
      currency: row.currency,
      referenceType: 'installment_payment',
      referenceId: installmentId,
      note: 'Оплата клиента (Cash → Revenue)',
    );
    return row;
  }

  Future<void> _appendFinanceTransaction({
    required String organizationId,
    required BHFinanceTxKind kind,
    required double amount,
    String currency = 'UZS',
    String? refType,
    String? refId,
    String? note,
  }) async {
    final id = _uuid.v4();
    final tx = BHFinanceTransaction(
      id: id,
      organizationId: organizationId,
      kind: kind,
      amount: amount,
      currency: currency,
      refType: refType,
      refId: refId,
      note: note,
      createdAt: DateTime.now(),
    );
    await _financeTx.doc(id).set(tx.toMap());
  }

  Future<List<BHFinanceTransaction>> getFinanceTransactions(
    String organizationId, {
    int limit = 200,
  }) async {
    final snap = await _financeTx
        .where('organizationId', isEqualTo: organizationId)
        .orderBy('createdAt', descending: true)
        .limit(limit)
        .get();
    return snap.docs
        .map((d) => BHFinanceTransaction.fromMap(d.data() as Map<String, dynamic>))
        .toList();
  }

  /// Сегодня: сделки в воронке, открытые задачи, платежи (сегодня или просрочка).
  Future<({int pipelineDeals, int openTasks, int duePayments})> getCoreTodaySnapshot(
    String organizationId,
  ) async {
    final deals = await getDeals(organizationId, limit: 200);
    const activeStages = [
      BHDealStage.new_,
      BHDealStage.qualification,
      BHDealStage.proposal,
      BHDealStage.negotiation,
    ];
    var pipelineDeals = 0;
    for (final d in deals) {
      if (activeStages.contains(d.stage)) {
        pipelineDeals++;
      }
    }

    final taskSnap = await _tasks.where('organizationId', isEqualTo: organizationId).limit(120).get();
    var openTasks = 0;
    for (final doc in taskSnap.docs) {
      final t = BHTask.fromMap(doc.data() as Map<String, dynamic>);
      if (t.status != BHTaskStatus.done) {
        openTasks++;
      }
    }

    final instSnap = await _installments.where('organizationId', isEqualTo: organizationId).limit(400).get();
    final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
    var duePayments = 0;
    for (final doc in instSnap.docs) {
      final r = BHInstallment.fromMap(doc.data() as Map<String, dynamic>);
      if (r.status == BHInstallmentStatus.paid) {
        continue;
      }
      final due = DateTime(r.dueDate.year, r.dueDate.month, r.dueDate.day);
      if (!due.isAfter(today)) {
        duePayments++;
      }
    }

    return (pipelineDeals: pipelineDeals, openTasks: openTasks, duePayments: duePayments);
  }

  Future<BHDeal?> getDealByLeadId(String leadId) async {
    final snap = await _deals.where('leadId', isEqualTo: leadId).limit(1).get();
    if (snap.docs.isEmpty) {
      return null;
    }
    return BHDeal.fromMap(snap.docs.first.data() as Map<String, dynamic>);
  }

  /// Сводка Business Mode: баланс по транзакциям и открытая дебиторка по графику.
  Future<({double balance, double receivables})> getFinanceSummary(String organizationId) async {
    final txs = await getFinanceTransactions(organizationId, limit: 500);
    var balance = 0.0;
    for (final t in txs) {
      switch (t.kind) {
        case BHFinanceTxKind.income:
        case BHFinanceTxKind.arDecrease:
          balance += t.amount;
          break;
        case BHFinanceTxKind.expense:
        case BHFinanceTxKind.apIncrease:
        case BHFinanceTxKind.apDecrease:
          balance -= t.amount;
          break;
        default:
          break;
      }
    }
    final instSnap =
        await _installments.where('organizationId', isEqualTo: organizationId).limit(500).get();
    var receivables = 0.0;
    for (final d in instSnap.docs) {
      final r = BHInstallment.fromMap(d.data() as Map<String, dynamic>);
      if (r.status != BHInstallmentStatus.paid) {
        receivables += r.remaining;
      }
    }
    return (balance: balance, receivables: receivables);
  }

  /// Дебиторка + кредиторка (нетто по BHFinanceTxKind apIncrease − apDecrease).
  Future<({double balance, double receivables, double payables})> getExtendedFinanceSummary(
    String organizationId,
  ) async {
    final base = await getFinanceSummary(organizationId);
    final txs = await getFinanceTransactions(organizationId, limit: 800);
    var apNet = 0.0;
    for (final t in txs) {
      switch (t.kind) {
        case BHFinanceTxKind.apIncrease:
          apNet += t.amount;
          break;
        case BHFinanceTxKind.apDecrease:
          apNet -= t.amount;
          break;
        default:
          break;
      }
    }
    if (apNet < 0) {
      apNet = 0;
    }
    return (balance: base.balance, receivables: base.receivables, payables: apNet);
  }

  Future<List<BHInstallment>> getInstallmentsForOrganization(String organizationId, {int limit = 500}) async {
    final snap = await _installments.where('organizationId', isEqualTo: organizationId).limit(limit).get();
    return snap.docs
        .map((d) => BHInstallment.fromMap(d.data() as Map<String, dynamic>))
        .toList();
  }

  /// Начисление обязательства перед поставщиком + при Accounting — Dr Expense / Cr AP.
  Future<void> recordVendorBill({
    required String organizationId,
    required double amount,
    String currency = 'UZS',
    String? note,
  }) async {
    await _appendFinanceTransaction(
      organizationId: organizationId,
      kind: BHFinanceTxKind.apIncrease,
      amount: amount,
      currency: currency,
      refType: 'vendor_bill',
      note: note ?? 'Кредиторка (обязательство)',
    );
    final org = await getOrganization(organizationId);
    if (org != null && org.accountingModeEnabled && org.financeMode == 'accounting') {
      await ensureDefaultChartAccounts(organizationId);
      await createJournalEntry(
        organizationId: organizationId,
        date: DateTime.now(),
        debitAccountId: _acctId(organizationId, 'expense'),
        creditAccountId: _acctId(organizationId, 'ap'),
        amount: amount,
        currency: currency,
        referenceType: 'vendor_bill',
        note: note,
      );
    }
  }

  /// Погашение кредиторки: Dr AP / Cr Cash.
  Future<void> recordVendorPayment({
    required String organizationId,
    required double amount,
    String currency = 'UZS',
    String? note,
  }) async {
    await _appendFinanceTransaction(
      organizationId: organizationId,
      kind: BHFinanceTxKind.apDecrease,
      amount: amount,
      currency: currency,
      refType: 'vendor_payment',
      note: note ?? 'Оплата поставщику',
    );
    final org = await getOrganization(organizationId);
    if (org != null && org.accountingModeEnabled && org.financeMode == 'accounting') {
      await ensureDefaultChartAccounts(organizationId);
      await createJournalEntry(
        organizationId: organizationId,
        date: DateTime.now(),
        debitAccountId: _acctId(organizationId, 'ap'),
        creditAccountId: _acctId(organizationId, 'cash'),
        amount: amount,
        currency: currency,
        referenceType: 'vendor_payment',
        note: note,
      );
    }
  }

  String _acctId(String organizationId, String code) => '${organizationId}_acct_$code';

  Future<void> ensureDefaultChartAccounts(String organizationId) async {
    final defs = <(String code, String name, BHChartAccountKind kind)>[
      ('cash', 'Деньги', BHChartAccountKind.cash),
      ('ar', 'Дебиторка', BHChartAccountKind.ar),
      ('ap', 'Кредиторка', BHChartAccountKind.ap),
      ('revenue', 'Доход', BHChartAccountKind.revenue),
      ('expense', 'Расход', BHChartAccountKind.expense),
    ];
    final now = DateTime.now();
    for (final d in defs) {
      final id = _acctId(organizationId, d.$1);
      final ref = _chartAccounts.doc(id);
      final doc = await ref.get();
      if (doc.exists) continue;
      await ref.set(
        BHChartAccount(
          id: id,
          organizationId: organizationId,
          code: d.$1,
          name: d.$2,
          kind: d.$3,
          createdAt: now,
        ).toMap(),
      );
    }
  }

  Future<List<BHChartAccount>> getChartAccounts(String organizationId) async {
    final snap = await _chartAccounts.where('organizationId', isEqualTo: organizationId).get();
    final list =
        snap.docs.map((d) => BHChartAccount.fromMap(d.data() as Map<String, dynamic>)).toList();
    list.sort((a, b) => a.code.compareTo(b.code));
    return list;
  }

  Future<BHJournalEntry> createJournalEntry({
    required String organizationId,
    required DateTime date,
    required String debitAccountId,
    required String creditAccountId,
    required double amount,
    String currency = 'UZS',
    String? referenceType,
    String? referenceId,
    String? note,
  }) async {
    final id = _uuid.v4();
    final row = BHJournalEntry(
      id: id,
      organizationId: organizationId,
      date: date,
      debitAccountId: debitAccountId,
      creditAccountId: creditAccountId,
      amount: amount,
      currency: currency,
      referenceType: referenceType,
      referenceId: referenceId,
      note: note,
      createdAt: DateTime.now(),
    );
    await _journalEntries.doc(id).set(row.toMap());
    return row;
  }

  Future<List<BHJournalEntry>> getJournalEntries(
    String organizationId, {
    int limit = 500,
  }) async {
    final snap =
        await _journalEntries.where('organizationId', isEqualTo: organizationId).limit(limit * 2).get();
    final list =
        snap.docs.map((d) => BHJournalEntry.fromMap(d.data() as Map<String, dynamic>)).toList()
          ..sort((a, b) => b.date.compareTo(a.date));
    if (list.length > limit) {
      return list.sublist(0, limit);
    }
    return list;
  }

  Future<void> _postCashReceiptJournalIfAccounting({
    required String organizationId,
    required double amount,
    required String currency,
    required String referenceType,
    required String referenceId,
    String? note,
  }) async {
    final org = await getOrganization(organizationId);
    if (org == null || !org.accountingModeEnabled || org.financeMode != 'accounting') {
      return;
    }
    await ensureDefaultChartAccounts(organizationId);
    await createJournalEntry(
      organizationId: organizationId,
      date: DateTime.now(),
      debitAccountId: _acctId(organizationId, 'cash'),
      creditAccountId: _acctId(organizationId, 'revenue'),
      amount: amount,
      currency: currency,
      referenceType: referenceType,
      referenceId: referenceId,
      note: note,
    );
  }

  /// Упрощённый P&L по проводкам (доход = кредит Revenue, расход = дебет Expense).
  Future<({double revenue, double expense, double net})> getAccountingPnL(
    String organizationId, {
    DateTime? from,
    DateTime? to,
  }) async {
    await ensureDefaultChartAccounts(organizationId);
    final accounts = await getChartAccounts(organizationId);
    BHChartAccount? rev;
    BHChartAccount? exp;
    for (final a in accounts) {
      if (a.kind == BHChartAccountKind.revenue) {
        rev = a;
      }
      if (a.kind == BHChartAccountKind.expense) {
        exp = a;
      }
    }
    if (rev == null || exp == null) {
      return (revenue: 0.0, expense: 0.0, net: 0.0);
    }
    final journals = await getJournalEntries(organizationId, limit: 2000);
    final start = from ?? DateTime(2000);
    final end = to ?? DateTime(2100);
    var revenue = 0.0;
    var expense = 0.0;
    for (final j in journals) {
      if (j.date.isBefore(start) || j.date.isAfter(end)) {
        continue;
      }
      if (j.creditAccountId == rev.id) {
        revenue += j.amount;
      }
      if (j.debitAccountId == exp.id) {
        expense += j.amount;
      }
    }
    return (revenue: revenue, expense: expense, net: revenue - expense);
  }

  /// Упрощённый баланс по остаткам счетов после проводок.
  Future<Map<String, double>> getAccountingBalanceSheet(String organizationId) async {
    await ensureDefaultChartAccounts(organizationId);
    final accounts = await getChartAccounts(organizationId);
    final journals = await getJournalEntries(organizationId, limit: 4000);
    final bal = <String, double>{};
    for (final a in accounts) {
      bal[a.id] = 0;
    }
    for (final j in journals) {
      bal[j.debitAccountId] = (bal[j.debitAccountId] ?? 0) + j.amount;
      bal[j.creditAccountId] = (bal[j.creditAccountId] ?? 0) - j.amount;
    }
    double pick(BHChartAccountKind k) {
      double s = 0;
      for (final a in accounts) {
        if (a.kind == k) {
          s += bal[a.id] ?? 0;
        }
      }
      return s;
    }

    return {
      'cash': pick(BHChartAccountKind.cash),
      'ar': pick(BHChartAccountKind.ar),
      'ap': pick(BHChartAccountKind.ap),
      'revenue': pick(BHChartAccountKind.revenue),
      'expense': pick(BHChartAccountKind.expense),
    };
  }

  // ── CRM: Activities ───────────────────────────────────────────

  Future<BHActivity> createActivity({
    required String organizationId,
    required BHActivityType type,
    required String subject,
    String? description,
    required DateTime activityDate,
    required String createdBy,
    String? counterpartyId,
    String? dealId,
    String? leadId,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final activity = BHActivity(
      id: id,
      organizationId: organizationId,
      type: type,
      counterpartyId: counterpartyId,
      dealId: dealId,
      leadId: leadId,
      subject: subject,
      description: description,
      activityDate: activityDate,
      createdBy: createdBy,
      createdAt: now,
      status: BHActivityStatus.planned,
    );
    await _activities.doc(id).set(activity.toMap());
    return activity;
  }

  Future<List<BHActivity>> getActivities(
    String organizationId, {
    String? counterpartyId,
    String? dealId,
    String? leadId,
    int limit = 50,
  }) async {
    Query query = _activities
        .where('organizationId', isEqualTo: organizationId)
        .orderBy('activityDate', descending: true);
    if (counterpartyId != null) query = query.where('counterpartyId', isEqualTo: counterpartyId);
    if (dealId != null) query = query.where('dealId', isEqualTo: dealId);
    if (leadId != null) query = query.where('leadId', isEqualTo: leadId);
    final snap = await query.limit(limit).get();
    return snap.docs.map((d) => BHActivity.fromMap(d.data() as Map<String, dynamic>)).toList();
  }

  Future<void> updateActivity(BHActivity activity) async {
    await _activities.doc(activity.id).update({
      'type': activity.type.firestoreValue,
      'subject': activity.subject,
      'description': activity.description,
      'activityDate': Timestamp.fromDate(activity.activityDate),
      'status': activity.status.firestoreValue,
    });
  }

  Future<void> deleteActivity(String id) async {
    await _activities.doc(id).delete();
  }
}
