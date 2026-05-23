import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_core/firebase_core.dart';

/// Обёртки над HTTPS callable ERP из `functions/src/erp/callable.ts`
/// (регион как у остальных функций проекта).
class ErpCloudService {
  ErpCloudService({FirebaseFunctions? functions})
      : _fn = functions ??
            FirebaseFunctions.instanceFor(
              app: Firebase.app(),
              region: 'us-central1',
            );

  final FirebaseFunctions _fn;

  Future<Map<String, dynamic>> _call(String name, Map<String, dynamic> payload) async {
    final result = await _fn.httpsCallable(name).call(payload);
    final data = result.data;
    if (data == null) {
      throw StateError('Пустой ответ Cloud Function $name');
    }
    if (data is! Map) {
      throw StateError('Неверный формат ответа $name');
    }
    return data.map((k, v) => MapEntry(k.toString(), v));
  }

  /// Тело: companyId, contact_id?, items: [{ product_id, qty }]
  Future<Map<String, dynamic>> createOrder({
    required String companyId,
    String? contactId,
    required List<Map<String, dynamic>> items,
  }) =>
      _call('erpCreateOrder', {
        'companyId': companyId,
        if (contactId != null) 'contact_id': contactId,
        'items': items,
      });

  /// companyId, orderId, amount, method?, status?
  Future<Map<String, dynamic>> recordPayment({
    required String companyId,
    required String orderId,
    required double amount,
    String method = 'cash',
    String status = 'paid',
  }) =>
      _call('erpRecordPayment', {
        'companyId': companyId,
        'orderId': orderId,
        'amount': amount,
        'method': method,
        'status': status,
      });

  Future<Map<String, dynamic>> patchOrderStatus({
    required String companyId,
    required String orderId,
    required String status,
  }) =>
      _call('erpPatchOrderStatus', {
        'companyId': companyId,
        'orderId': orderId,
        'status': status,
      });

  /// direction: in | out
  Future<Map<String, dynamic>> stockMove({
    required String companyId,
    required String productId,
    required double qty,
    required String direction,
    String? note,
  }) =>
      _call('erpStockMove', {
        'companyId': companyId,
        'productId': productId,
        'qty': qty,
        'direction': direction,
        if (note != null) 'note': note,
      });

  /// action: open | close
  Future<Map<String, dynamic>> posShift({
    required String action,
    required String companyId,
    double? openingCash,
    double? closingCash,
  }) =>
      _call('erpPosShift', {
        'action': action,
        'companyId': companyId,
        if (openingCash != null) 'openingCash': openingCash,
        if (closingCash != null) 'closingCash': closingCash,
      });

  /// Статусы: assigned | accepted | in_delivery | delivered | completed
  Future<Map<String, dynamic>> patchDeliveryStatus({
    required String companyId,
    required String deliveryId,
    required String status,
    String? note,
  }) =>
      _call('erpPatchDeliveryStatus', {
        'companyId': companyId,
        'deliveryId': deliveryId,
        'status': status,
        if (note != null) 'note': note,
      });
}
