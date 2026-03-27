import 'bh_firestore_service.dart';
import '../../models/business_hub/operation.dart';
import '../../models/business_hub/task.dart';

/// Workflow Engine — создаёт задачи при смене статуса доставки
class BHWorkflowService {
  BHWorkflowService(this._firestore);

  final BHFirestoreService _firestore;

  /// Вызывается после обновления deliveryStatus операции.
  /// Создаёт задачи по триггерам.
  Future<void> onDeliveryStatusChanged({
    required BHOperation operation,
    required DeliveryStatus newStatus,
    String? comment,
  }) async {
    if (!operation.type.hasDelivery) return;

    final tasks = <Future<BHTask>>[];

    switch (newStatus) {
      case DeliveryStatus.notEnoughMoney:
        tasks.add(_createTask(
          organizationId: operation.organizationId,
          operationId: operation.id,
          assignedTo: operation.createdBy, // Manager
          title: 'Связаться с клиентом и предложить скидку',
          description: comment != null ? 'Комментарий: $comment' : null,
          triggeredByDeliveryStatus: newStatus.firestoreValue,
        ));
        break;
      case DeliveryStatus.clientRefused:
        tasks.add(_createTask(
          organizationId: operation.organizationId,
          operationId: operation.id,
          assignedTo: operation.createdBy,
          title: 'Выяснить причину отказа',
          description: comment,
          triggeredByDeliveryStatus: newStatus.firestoreValue,
        ));
        break;
      case DeliveryStatus.notAvailable:
        tasks.add(_createTask(
          organizationId: operation.organizationId,
          operationId: operation.id,
          assignedTo: operation.createdBy,
          title: 'Перезвонить клиенту',
          description: comment,
          triggeredByDeliveryStatus: newStatus.firestoreValue,
        ));
        break;
      case DeliveryStatus.reschedule:
        if (operation.assignedTo != null) {
          tasks.add(_createTask(
            organizationId: operation.organizationId,
            operationId: operation.id,
            assignedTo: operation.assignedTo!,
            title: 'Доставить в новую дату',
            description: comment,
            triggeredByDeliveryStatus: newStatus.firestoreValue,
          ));
        }
        break;
      case DeliveryStatus.delivered:
      case DeliveryStatus.pending:
      case DeliveryStatus.inProgress:
        break;
    }

    await Future.wait(tasks);
  }

  Future<BHTask> _createTask({
    required String organizationId,
    required String operationId,
    required String assignedTo,
    required String title,
    String? description,
    required String triggeredByDeliveryStatus,
  }) async {
    return _firestore.createTask(
      organizationId: organizationId,
      operationId: operationId,
      assignedTo: assignedTo,
      title: title,
      description: description,
      triggeredBy: BHTaskTrigger.deliveryStatus,
      triggeredByDeliveryStatus: triggeredByDeliveryStatus,
    );
  }
}
