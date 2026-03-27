import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../constants/app_constants.dart';
import '../../models/business_hub/operation.dart';

class BHOperationRow extends StatelessWidget {
  final BHOperation operation;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  const BHOperationRow({
    super.key,
    required this.operation,
    this.onTap,
    this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    final isIncome = operation.type.isIncome;
    final color = isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final sign = isIncome ? '+' : '-';
    final formatter = NumberFormat('#,###', 'ru');

    return InkWell(
      onTap: onTap,
      onLongPress: onLongPress,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppConstants.borderColor),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(_typeIcon(operation.type), color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    operation.type.label,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      if (operation.counterpartyName != null) ...[
                        Flexible(
                          child: Text(
                            operation.counterpartyName!,
                            style: TextStyle(
                              fontSize: 12,
                              color: AppConstants.textSecondary,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                      _StatusChip(status: operation.status),
                      if (operation.dealId != null) ...[
                        const SizedBox(width: 6),
                        _DealBadge(),
                      ],
                      if (operation.deliveryStatus != null) ...[
                        const SizedBox(width: 6),
                        _DeliveryStatusChip(status: operation.deliveryStatus!),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '$sign${formatter.format(operation.amount)} ${operation.currency}',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: color,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  DateFormat('dd.MM.yyyy').format(operation.date),
                  style: TextStyle(
                    fontSize: 11,
                    color: AppConstants.textHint,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  IconData _typeIcon(OperationType t) {
    switch (t) {
      case OperationType.sale:
      case OperationType.redelivery:
        return Icons.trending_up;
      case OperationType.purchase:
        return Icons.shopping_cart_outlined;
      case OperationType.serviceRendered:
        return Icons.handyman_outlined;
      case OperationType.production:
        return Icons.factory_outlined;
      case OperationType.inventoryWriteOff:
        return Icons.delete_outline;
      case OperationType.salaryAccrual:
      case OperationType.salaryPayment:
        return Icons.people_outline;
      case OperationType.taxAccrual:
      case OperationType.taxPayment:
        return Icons.account_balance_outlined;
      case OperationType.logisticsCost:
        return Icons.local_shipping_outlined;
      case OperationType.b2bDeposit:
        return Icons.lock_outlined;
      case OperationType.compensationPenalty:
        return Icons.gavel_outlined;
    }
  }
}

class _DealBadge extends StatelessWidget {
  const _DealBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFF8B5CF6).withOpacity(0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.handshake_outlined, size: 10, color: const Color(0xFF8B5CF6)),
          const SizedBox(width: 4),
          Text(
            'Из сделки',
            style: TextStyle(fontSize: 10, color: const Color(0xFF8B5CF6), fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final OperationStatus status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case OperationStatus.draft:
        color = Colors.orange;
        break;
      case OperationStatus.confirmed:
        color = Colors.blue;
        break;
      case OperationStatus.closed:
        color = Colors.green;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status.label,
        style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _DeliveryStatusChip extends StatelessWidget {
  final DeliveryStatus status;
  const _DeliveryStatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case DeliveryStatus.delivered:
        color = Colors.green;
        break;
      case DeliveryStatus.pending:
      case DeliveryStatus.inProgress:
        color = Colors.blue;
        break;
      case DeliveryStatus.clientRefused:
      case DeliveryStatus.notEnoughMoney:
      case DeliveryStatus.notAvailable:
        color = Colors.orange;
        break;
      case DeliveryStatus.reschedule:
        color = Colors.purple;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status.label,
        style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}
