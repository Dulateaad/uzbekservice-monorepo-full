import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/business_hub/business_vertical.dart';
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
import '../../services/business_hub/bh_firestore_service.dart';
import '../../services/business_hub/bh_crm_service.dart';
import '../../services/business_hub/bh_workflow_service.dart';
// ── Service singleton ──────────────────────────────────────────
final bhFirestoreServiceProvider = Provider<BHFirestoreService>((ref) {
  return BHFirestoreService();
});

final bhCrmServiceProvider = Provider<BHCrmService>((ref) {
  return BHCrmService(ref.watch(bhFirestoreServiceProvider));
});

final bhWorkflowServiceProvider = Provider<BHWorkflowService>((ref) {
  return BHWorkflowService(ref.watch(bhFirestoreServiceProvider));
});

// ── Organization ───────────────────────────────────────────────
final bhOrganizationProvider =
    StateNotifierProvider<BHOrganizationNotifier, AsyncValue<BHOrganization?>>((ref) {
  return BHOrganizationNotifier(ref.watch(bhFirestoreServiceProvider));
});

/// Текущий профиль вертикали (термины под тип бизнеса).
final bhBusinessVerticalSpecProvider = Provider<BusinessVerticalSpec>((ref) {
  final org = ref.watch(bhOrganizationProvider).valueOrNull;
  return BusinessVerticalSpec.byId(org?.businessVerticalId);
});

class BHOrganizationNotifier extends StateNotifier<AsyncValue<BHOrganization?>> {
  final BHFirestoreService _service;

  BHOrganizationNotifier(this._service) : super(const AsyncValue.loading());

  Future<void> loadByOwner(String ownerId) async {
    state = const AsyncValue.loading();
    try {
      final org = await _service.getOrganizationByOwner(ownerId);
      state = AsyncValue.data(org);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<BHOrganization> create({
    required String ownerId,
    required String name,
    required String industry,
    String businessVerticalId = BusinessVerticalIds.services,
    String? inn,
    String? legalForm,
    int employeeCount = 1,
    String? ownerName,
    String? ownerEmail,
  }) async {
    final org = await _service.createOrganization(
      ownerId: ownerId,
      name: name,
      industry: industry,
      businessVerticalId: businessVerticalId,
      inn: inn,
      legalForm: legalForm,
      employeeCount: employeeCount,
      ownerName: ownerName,
      ownerEmail: ownerEmail,
    );
    state = AsyncValue.data(org);
    return org;
  }

  Future<void> update(BHOrganization org) async {
    await _service.updateOrganization(org);
    state = AsyncValue.data(org);
  }
}

// ── Operations ─────────────────────────────────────────────────
final bhOperationsProvider =
    StateNotifierProvider<BHOperationsNotifier, AsyncValue<List<BHOperation>>>((ref) {
  return BHOperationsNotifier(
    ref.watch(bhFirestoreServiceProvider),
    ref.watch(bhWorkflowServiceProvider),
  );
});

class BHOperationsNotifier extends StateNotifier<AsyncValue<List<BHOperation>>> {
  final BHFirestoreService _service;
  final BHWorkflowService _workflow;
  String? _orgId;

  BHOperationsNotifier(this._service, this._workflow) : super(const AsyncValue.data([]));

  Future<void> load(String organizationId) async {
    _orgId = organizationId;
    state = const AsyncValue.loading();
    try {
      final ops = await _service.getOperations(organizationId);
      state = AsyncValue.data(ops);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> addOperation({
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
  }) async {
    if (_orgId == null) return;
    try {
      final op = await _service.createOperation(
        organizationId: _orgId!,
        type: type,
        date: date,
        amount: amount,
        createdBy: createdBy,
        currency: currency,
        counterpartyId: counterpartyId,
        counterpartyName: counterpartyName,
        isTaxable: isTaxable,
        notes: notes,
        category: category,
        assignedTo: assignedTo,
        parentOperationId: parentOperationId,
      );
      final current = state.valueOrNull ?? [];
      state = AsyncValue.data([op, ...current]);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> updateOp(BHOperation op) async {
    await _service.updateOperation(op);
    _updateLocal(op.id, (o) => op);
  }

  Future<void> confirmOp(String id) async {
    await _service.confirmOperation(id);
    _updateLocal(id, (op) => op.copyWith(status: OperationStatus.confirmed));
  }

  /// Обновляет статус доставки и запускает триггеры Workflow Engine
  Future<void> updateDeliveryStatus(
    BHOperation op,
    DeliveryStatus status, {
    String? comment,
  }) async {
    final updated = op.copyWith(
      deliveryStatus: status,
      deliveryComment: comment ?? op.deliveryComment,
      updatedAt: DateTime.now(),
    );
    await _service.updateOperation(updated);
    _updateLocal(op.id, (_) => updated);
    await _workflow.onDeliveryStatusChanged(
      operation: updated,
      newStatus: status,
      comment: comment,
    );
  }

  void _updateLocal(String id, BHOperation Function(BHOperation) updater) {
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(
      current.map((o) => o.id == id ? updater(o) : o).toList(),
    );
  }

  Future<void> deleteOp(String id) async {
    await _service.deleteOperation(id);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(current.where((o) => o.id != id).toList());
  }

}

// ── Tasks (Workflow) ───────────────────────────────────────────
final bhTasksProvider =
    StateNotifierProvider<BHTasksNotifier, AsyncValue<List<BHTask>>>((ref) {
  return BHTasksNotifier(ref.watch(bhFirestoreServiceProvider));
});

class BHTasksNotifier extends StateNotifier<AsyncValue<List<BHTask>>> {
  final BHFirestoreService _service;
  String? _orgId;
  String? _assignedToFilter;

  BHTasksNotifier(this._service) : super(const AsyncValue.data([]));

  Future<void> load(String organizationId, {String? assignedTo}) async {
    _orgId = organizationId;
    _assignedToFilter = assignedTo;
    state = const AsyncValue.loading();
    try {
      final list = await _service.getTasks(organizationId, assignedTo: assignedTo);
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> completeTask(String taskId) async {
    await _service.completeTask(taskId);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(
      current.map((t) => t.id == taskId ? t.copyWith(status: BHTaskStatus.done, completedAt: DateTime.now()) : t).toList(),
    );
  }
}

// ── Counterparties ─────────────────────────────────────────────
final bhCounterpartiesProvider =
    StateNotifierProvider<BHCounterpartiesNotifier, AsyncValue<List<BHCounterparty>>>((ref) {
  return BHCounterpartiesNotifier(ref.watch(bhFirestoreServiceProvider));
});

class BHCounterpartiesNotifier extends StateNotifier<AsyncValue<List<BHCounterparty>>> {
  final BHFirestoreService _service;
  String? _orgId;

  BHCounterpartiesNotifier(this._service) : super(const AsyncValue.data([]));

  Future<void> load(String organizationId) async {
    _orgId = organizationId;
    state = const AsyncValue.loading();
    try {
      final list = await _service.getCounterparties(organizationId);
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> add({
    required String name,
    CounterpartyType type = CounterpartyType.legalEntity,
    String? inn,
    String? phone,
    String? email,
    String? address,
  }) async {
    if (_orgId == null) return;
    final cp = await _service.createCounterparty(
      organizationId: _orgId!,
      name: name,
      type: type,
      inn: inn,
      phone: phone,
      email: email,
      address: address,
    );
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data([...current, cp]);
  }

  /// Создаёт контрагента из лида (при конвертации в сделку)
  Future<BHCounterparty?> createFromLead(BHLead lead) async {
    if (_orgId == null) return null;
    final cp = await _service.createCounterparty(
      organizationId: _orgId!,
      name: lead.name,
      type: CounterpartyType.individual,
      phone: lead.phone,
      email: lead.email,
      address: lead.company,
    );
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data([...current, cp]);
    return cp;
  }

  Future<void> remove(String id) async {
    await _service.deleteCounterparty(id);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(current.where((c) => c.id != id).toList());
  }
}

// ── Business Health Score ──────────────────────────────────────
final bhHealthScoreProvider =
    StateNotifierProvider<BHHealthScoreNotifier, AsyncValue<BusinessHealthScore?>>((ref) {
  return BHHealthScoreNotifier(ref.watch(bhFirestoreServiceProvider));
});

class BHHealthScoreNotifier extends StateNotifier<AsyncValue<BusinessHealthScore?>> {
  final BHFirestoreService _service;

  BHHealthScoreNotifier(this._service) : super(const AsyncValue.loading());

  Future<void> load(String organizationId) async {
    state = const AsyncValue.loading();
    try {
      final bhs = await _service.getLatestBHS(organizationId);
      state = AsyncValue.data(bhs ?? BusinessHealthScore.empty(organizationId));
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> recalculate(String organizationId) async {
    state = const AsyncValue.loading();
    try {
      final bhs = await _service.calculateBHS(organizationId);
      state = AsyncValue.data(bhs);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

// ── Dashboard Stats ────────────────────────────────────────────
final bhDashboardStatsProvider =
    StateNotifierProvider<BHDashboardStatsNotifier, AsyncValue<Map<String, dynamic>>>((ref) {
  return BHDashboardStatsNotifier(ref.watch(bhFirestoreServiceProvider));
});

class BHDashboardStatsNotifier extends StateNotifier<AsyncValue<Map<String, dynamic>>> {
  final BHFirestoreService _service;

  BHDashboardStatsNotifier(this._service) : super(const AsyncValue.data({}));

  Future<void> load(String organizationId) async {
    state = const AsyncValue.loading();
    try {
      final stats = await _service.getDashboardStats(organizationId);
      state = AsyncValue.data(stats);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

// ── Employees (HR) ─────────────────────────────────────────────
final bhEmployeesProvider =
    StateNotifierProvider<BHEmployeesNotifier, AsyncValue<List<BHEmployee>>>((ref) {
  return BHEmployeesNotifier(ref.watch(bhFirestoreServiceProvider));
});

class BHEmployeesNotifier extends StateNotifier<AsyncValue<List<BHEmployee>>> {
  final BHFirestoreService _service;
  String? _orgId;

  BHEmployeesNotifier(this._service) : super(const AsyncValue.data([]));

  Future<void> load(String organizationId) async {
    _orgId = organizationId;
    state = const AsyncValue.loading();
    try {
      final list = await _service.getEmployees(organizationId);
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> add({
    required String fullName,
    String? position,
    String? inn,
    String? phone,
    String? email,
    double? salary,
    DateTime? hireDate,
  }) async {
    if (_orgId == null) return;
    final emp = await _service.createEmployee(
      organizationId: _orgId!,
      fullName: fullName,
      position: position,
      inn: inn,
      phone: phone,
      email: email,
      salary: salary,
      hireDate: hireDate,
    );
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data([...current, emp]);
  }

  Future<void> update(BHEmployee emp) async {
    await _service.updateEmployee(emp);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(
      current.map((e) => e.id == emp.id ? emp : e).toList(),
    );
  }

  Future<void> remove(String id) async {
    await _service.deleteEmployee(id);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(current.where((e) => e.id != id).toList());
  }
}

// ── Organization Members (RBAC) ───────────────────────────────────
final bhMembersProvider =
    StateNotifierProvider<BHMembersNotifier, AsyncValue<List<BHOrganizationMember>>>((ref) {
  return BHMembersNotifier(ref.watch(bhFirestoreServiceProvider));
});

class BHMembersNotifier extends StateNotifier<AsyncValue<List<BHOrganizationMember>>> {
  final BHFirestoreService _service;
  String? _orgId;

  BHMembersNotifier(this._service) : super(const AsyncValue.data([]));

  Future<void> load(String organizationId) async {
    _orgId = organizationId;
    state = const AsyncValue.loading();
    try {
      final list = await _service.getMembers(organizationId);
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> addMember({
    required String userId,
    required BHMemberRole role,
    String? userEmail,
    String? userName,
    String? managerId,
  }) async {
    if (_orgId == null) return;
    final member = await _service.addMember(
      organizationId: _orgId!,
      userId: userId,
      role: role,
      userEmail: userEmail,
      userName: userName,
      managerId: managerId,
    );
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data([...current, member]);
  }

  Future<void> updateRole(String memberId, BHMemberRole role) async {
    await _service.updateMemberRole(memberId, role);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(
      current.map((m) => m.id == memberId ? m.copyWith(role: role) : m).toList(),
    );
  }

  Future<void> remove(String id) async {
    await _service.removeMember(id);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(current.where((m) => m.id != id).toList());
  }
}

// ── CRM: Leads ─────────────────────────────────────────────────
final bhLeadsProvider =
    StateNotifierProvider<BHLeadsNotifier, AsyncValue<List<BHLead>>>((ref) {
  return BHLeadsNotifier(ref.watch(bhFirestoreServiceProvider), ref.watch(bhCrmServiceProvider));
});

class BHLeadsNotifier extends StateNotifier<AsyncValue<List<BHLead>>> {
  final BHFirestoreService _service;
  final BHCrmService _crm;
  String? _orgId;

  BHLeadsNotifier(this._service, this._crm) : super(const AsyncValue.data([]));

  Future<void> load(String organizationId, {BHLeadStatus? status, String? assignedTo}) async {
    _orgId = organizationId;
    state = const AsyncValue.loading();
    try {
      final list = await _service.getLeads(organizationId, status: status, assignedTo: assignedTo);
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> add({
    required String name,
    required String createdBy,
    String? phone,
    String? email,
    String? company,
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
    if (_orgId == null) return;
    final lead = await _service.createLead(
      organizationId: _orgId!,
      name: name,
      phone: phone,
      email: email,
      company: company,
      source: source,
      notes: notes,
      assignedTo: assignedTo,
      campaign: campaign,
      utmSource: utmSource,
      utmMedium: utmMedium,
      utmCampaign: utmCampaign,
      contactId: contactId,
      companyId: companyId,
    );
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data([lead, ...current]);
    try {
      await _crm.afterLeadCreated(lead, createdBy);
    } catch (_) {}
  }

  Future<void> update(BHLead lead) async {
    await _service.updateLead(lead);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(current.map((l) => l.id == lead.id ? lead : l).toList());
  }

  Future<void> remove(String id) async {
    await _service.deleteLead(id);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(current.where((l) => l.id != id).toList());
  }
}

// ── CRM: Deals ─────────────────────────────────────────────────
final bhDealsProvider =
    StateNotifierProvider<BHDealsNotifier, AsyncValue<List<BHDeal>>>((ref) {
  return BHDealsNotifier(ref.watch(bhFirestoreServiceProvider), ref.watch(bhCrmServiceProvider));
});

class BHDealsNotifier extends StateNotifier<AsyncValue<List<BHDeal>>> {
  final BHFirestoreService _service;
  final BHCrmService _crm;
  String? _orgId;

  BHDealsNotifier(this._service, this._crm) : super(const AsyncValue.data([]));

  Future<void> load(String organizationId, {BHDealStage? stage, String? assignedTo}) async {
    _orgId = organizationId;
    state = const AsyncValue.loading();
    try {
      final list = await _service.getDeals(organizationId, stage: stage, assignedTo: assignedTo);
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> add({
    required String title,
    required String createdBy,
    double amount = 0,
    String? counterpartyId,
    String? counterpartyName,
    String? leadId,
    String? assignedTo,
    DateTime? expectedCloseDate,
    String? notes,
    String? pipelineId,
    String? companyId,
    String? contactId,
    Map<String, dynamic>? saleContext,
  }) async {
    if (_orgId == null) return;
    await _crm.ensureDefaultPipelines(_orgId!);
    final pid = pipelineId ?? await _crm.getDefaultPipelineId(_orgId!);

    // Apply pipeline template defaults where user hasn't provided values.
    final tmpl = await _crm.resolvePipelineTemplate(pid, userTitle: title, userNotes: notes);

    final deal = await _service.createDeal(
      organizationId: _orgId!,
      title: tmpl.title ?? title,
      amount: amount,
      counterpartyId: counterpartyId,
      counterpartyName: counterpartyName,
      leadId: leadId,
      assignedTo: assignedTo,
      expectedCloseDate: expectedCloseDate,
      notes: tmpl.notes ?? notes,
      pipelineId: pid,
      companyId: companyId,
      contactId: contactId,
      dealType: tmpl.dealType,
      saleContext: saleContext ?? tmpl.saleContext,
    );
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data([deal, ...current]);
    try {
      await _crm.afterDealCreated(deal, createdBy);
    } catch (_) {}
  }

  Future<void> update(BHDeal deal) async {
    await _service.updateDeal(deal);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(current.map((d) => d.id == deal.id ? deal : d).toList());
  }

  Future<void> updateStage(String id, BHDealStage stage, {String? createdBy}) async {
    final current = state.valueOrNull ?? [];
    final prev = current.firstWhere((d) => d.id == id);
    final wasWon = prev.stage == BHDealStage.won;
    var newDeal = prev.copyWith(
      stage: stage,
      clearLostReason: stage != BHDealStage.lost,
    );
    await update(newDeal);

    var after = newDeal;
    if (stage == BHDealStage.won &&
        !wasWon &&
        createdBy != null &&
        createdBy.isNotEmpty &&
        newDeal.amount > 0) {
      try {
        final op = await _service.createOperationFromWonDeal(newDeal, createdBy);
        after = newDeal.copyWith(operationId: op.id);
        await update(after);
      } catch (_) {
        // Пользователь может нажать «Создать операцию» вручную
      }
    }
    try {
      await _crm.afterDealStageChanged(prev, after, createdBy ?? '');
    } catch (_) {}
  }

  /// Ручная операция продажи для выигранной сделки (сумма > 0, ещё нет operationId).
  Future<void> createSaleOperationForDeal(String dealId, String createdBy) async {
    final current = state.valueOrNull ?? [];
    final deal = current.firstWhere((d) => d.id == dealId);
    if (deal.stage != BHDealStage.won) return;
    if (deal.operationId != null) return;
    if (deal.amount <= 0) return;
    final op = await _service.createOperationFromWonDeal(deal, createdBy);
    await update(deal.copyWith(operationId: op.id));
  }

  /// Заказ Work из выигранной сделки.
  Future<void> createWorkOrderForDeal(String dealId, String createdBy) async {
    final current = state.valueOrNull ?? [];
    final deal = current.firstWhere((d) => d.id == dealId);
    if (deal.stage != BHDealStage.won) return;
    if (deal.workId != null) return;
    final work = await _service.createWorkFromWonDeal(deal, createdBy);
    await update(deal.copyWith(workId: work.id));
  }

  Future<void> createSubscriptionForDeal(
    String dealId, {
    required String plan,
    required DateTime startDate,
    required DateTime endDate,
    double? price,
    bool autoRenew = false,
  }) async {
    final current = state.valueOrNull ?? [];
    final deal = current.firstWhere((d) => d.id == dealId);
    if (deal.subscriptionId != null) return;
    final sub = await _crm.createSubscription(
      organizationId: deal.organizationId,
      dealId: dealId,
      plan: plan,
      price: price ?? deal.amount,
      currency: deal.currency,
      startDate: startDate,
      endDate: endDate,
      autoRenew: autoRenew,
    );
    await update(deal.copyWith(subscriptionId: sub.id));
  }

  Future<void> remove(String id) async {
    await _service.deleteDeal(id);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(current.where((d) => d.id != id).toList());
  }
}

// ── CRM: Activities ────────────────────────────────────────────
final bhActivitiesProvider =
    StateNotifierProvider<BHActivitiesNotifier, AsyncValue<List<BHActivity>>>((ref) {
  return BHActivitiesNotifier(ref.watch(bhFirestoreServiceProvider));
});

class BHActivitiesNotifier extends StateNotifier<AsyncValue<List<BHActivity>>> {
  final BHFirestoreService _service;
  String? _orgId;

  BHActivitiesNotifier(this._service) : super(const AsyncValue.data([]));

  Future<void> load(String organizationId, {String? counterpartyId, String? dealId, String? leadId}) async {
    _orgId = organizationId;
    state = const AsyncValue.loading();
    try {
      final list = await _service.getActivities(
        organizationId,
        counterpartyId: counterpartyId,
        dealId: dealId,
        leadId: leadId,
      );
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> add({
    required BHActivityType type,
    required String subject,
    String? description,
    required DateTime activityDate,
    required String createdBy,
    String? counterpartyId,
    String? dealId,
    String? leadId,
  }) async {
    if (_orgId == null) return;
    final activity = await _service.createActivity(
      organizationId: _orgId!,
      type: type,
      subject: subject,
      description: description,
      activityDate: activityDate,
      createdBy: createdBy,
      counterpartyId: counterpartyId,
      dealId: dealId,
      leadId: leadId,
    );
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data([activity, ...current]);
  }

  Future<void> update(BHActivity activity) async {
    await _service.updateActivity(activity);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(current.map((a) => a.id == activity.id ? activity : a).toList());
  }

  Future<void> remove(String id) async {
    await _service.deleteActivity(id);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(current.where((a) => a.id != id).toList());
  }
}

// ── Universal Work ──────────────────────────────────────────────
final bhWorksProvider =
    StateNotifierProvider<BHWorksNotifier, AsyncValue<List<Work>>>((ref) {
  return BHWorksNotifier(ref.watch(bhFirestoreServiceProvider));
});

class BHWorksNotifier extends StateNotifier<AsyncValue<List<Work>>> {
  final BHFirestoreService _service;
  String? _orgId;

  BHWorksNotifier(this._service) : super(const AsyncValue.data([]));

  Future<void> load(
    String organizationId, {
    WorkType? type,
    WorkStatus? status,
    String? assignedTo,
    String? parentWorkId,
  }) async {
    _orgId = organizationId;
    state = const AsyncValue.loading();
    try {
      final list = await _service.getWorks(
        organizationId,
        type: type,
        status: status,
        assignedTo: assignedTo,
        parentWorkId: parentWorkId,
      );
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<Work> add({
    required WorkType type,
    required String title,
    String? description,
    String? clientId,
    String? clientName,
    String? assignedTo,
    String? parentWorkId,
    double? price,
    required String createdBy,
    Map<String, dynamic>? metadata,
  }) async {
    if (_orgId == null) throw StateError('Organization not loaded');
    final work = await _service.createWork(
      organizationId: _orgId!,
      type: type,
      title: title,
      description: description,
      clientId: clientId,
      clientName: clientName,
      assignedTo: assignedTo,
      parentWorkId: parentWorkId,
      price: price,
      createdBy: createdBy,
      metadata: metadata,
    );
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data([work, ...current]);
    return work;
  }

  Future<void> updateStatus(String workId, WorkStatus status) async {
    await _service.updateWorkStatus(workId, status);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(
      current.map((w) => w.id == workId ? w.copyWith(status: status) : w).toList(),
    );
  }

  Future<void> update(Work work) async {
    await _service.updateWork(work);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(current.map((w) => w.id == work.id ? work : w).toList());
  }

  Future<void> remove(String id) async {
    await _service.deleteWork(id);
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(current.where((w) => w.id != id).toList());
  }
}

// ── CRM: аналитика дашборда ────────────────────────────────────
final bhCrmAnalyticsProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, orgId) async {
  final crm = ref.watch(bhCrmServiceProvider);
  await crm.ensureDefaultPipelines(orgId);
  return crm.getCrmAnalytics(orgId);
});

// ── Ядро ТЗ: «Сегодня» и сводка финансов (Business Mode) ─────────
final bhCoreTodayProvider =
    FutureProvider.autoDispose.family<({int pipelineDeals, int openTasks, int duePayments}), String>((ref, orgId) async {
  final svc = ref.watch(bhFirestoreServiceProvider);
  return svc.getCoreTodaySnapshot(orgId);
});

final bhFinanceSummaryProvider =
    FutureProvider.autoDispose.family<({double balance, double receivables}), String>((ref, orgId) async {
  final svc = ref.watch(bhFirestoreServiceProvider);
  return svc.getFinanceSummary(orgId);
});

final bhExtendedFinanceProvider =
    FutureProvider.autoDispose.family<({double balance, double receivables, double payables}), String>(
        (ref, orgId) async {
  final svc = ref.watch(bhFirestoreServiceProvider);
  return svc.getExtendedFinanceSummary(orgId);
});
