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
    required String createdBy,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
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
      metadata: metadata,
      createdBy: createdBy,
      createdAt: now,
      updatedAt: now,
    );
    await _works.doc(id).set(work.toMap());
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
    if (wonDealsCount >= 5) salesScore = (salesScore + 10).clamp(0, 100).toDouble();
    else if (wonDealsCount >= 2) salesScore = (salesScore + 5).clamp(0, 100).toDouble();
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
