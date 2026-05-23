import 'package:flutter/material.dart';
import '../../constants/app_constants.dart';
import '../../models/business_hub/business_vertical.dart';

/// Сетка выбора типа бизнеса (универсальные вертикали).
class BusinessVerticalPickerGrid extends StatelessWidget {
  final String selectedId;
  final ValueChanged<String> onSelect;

  const BusinessVerticalPickerGrid({
    super.key,
    required this.selectedId,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final w = c.maxWidth;
        final cross = w > 500 ? 3 : 2;
        return GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: cross,
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.15,
          children: BusinessVerticalSpec.all.map((spec) {
            final on = spec.id == selectedId;
            return Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => onSelect(spec.id),
                borderRadius: BorderRadius.circular(14),
                child: Ink(
                  decoration: BoxDecoration(
                    color: on ? const Color(0xFFEFF6FF) : Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: on ? AppConstants.primaryColor : AppConstants.borderColor,
                      width: on ? 2 : 1,
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(10),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          spec.icon,
                          size: 28,
                          color: on ? AppConstants.primaryColor : AppConstants.textSecondary,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          spec.title,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: on ? AppConstants.primaryColor : AppConstants.textPrimary,
                            height: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }
}
