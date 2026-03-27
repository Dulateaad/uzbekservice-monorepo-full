import 'package:flutter/material.dart';
import '../../models/firestore_models.dart';
import '../../constants/app_constants.dart';

class ToolDetailScreen extends StatelessWidget {
  final FirestoreToolItem item;

  const ToolDetailScreen({
    super.key,
    required this.item,
  });

  @override
  Widget build(BuildContext context) {
    final isRent = item.type == 'rent';
    final priceLabel = isRent
        ? '${item.price.toStringAsFixed(0)} сум / ${item.priceUnit ?? 'день'}'
        : '${item.price.toStringAsFixed(0)} сум';

    return Scaffold(
      appBar: AppBar(
        title: Text(isRent ? 'Инструмент в аренду' : 'Товар мастера'),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Основное фото
            Container(
              height: 260,
              width: double.infinity,
              color: Colors.grey[100],
              child: item.imageUrls.isNotEmpty
                  ? PageView(
                      children: item.imageUrls
                          .map(
                            (url) => Image.network(
                              url,
                              fit: BoxFit.cover,
                            ),
                          )
                          .toList(),
                    )
                  : Center(
                      child: Icon(
                        isRent
                            ? Icons.construction
                            : Icons.shopping_bag_outlined,
                        size: 64,
                        color: AppConstants.primaryColor,
                      ),
                    ),
            ),
            const SizedBox(height: 16),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppConstants.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    priceLabel,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppConstants.primaryColor,
                    ),
                  ),
                  if (isRent && item.deposit != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Залог: ${item.deposit!.toStringAsFixed(0)} сум',
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppConstants.textSecondary,
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  if (item.description != null &&
                      item.description!.trim().isNotEmpty) ...[
                    const Text(
                      'Описание',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppConstants.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      item.description!,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppConstants.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  const Text(
                    'Как работает',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppConstants.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    isRent
                        ? 'Свяжитесь с мастером, чтобы уточнить условия аренды, залог и время использования.'
                        : 'Свяжитесь с мастером, чтобы договориться о покупке и передаче товара.',
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppConstants.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        // TODO: открыть чат с мастером или экран заказа
                      },
                      icon: const Icon(Icons.chat),
                      label: Text(
                        isRent ? 'Обсудить аренду' : 'Обсудить покупку',
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}


