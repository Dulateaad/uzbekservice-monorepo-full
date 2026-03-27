import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

class IslandNavigation extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int>? onTap;
  final List<NavigationItem> items;

  const IslandNavigation({
    super.key,
    required this.currentIndex,
    required this.items,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Получаем безопасную зону снизу для правильного позиционирования
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    
    return Positioned(
      bottom: AppConstants.spacingMD + bottomPadding,
      left: AppConstants.spacingMD,
      right: AppConstants.spacingMD,
      child: SafeArea(
        top: false,
        child: Container(
        decoration: BoxDecoration(
          color: AppConstants.surfaceColor,
          borderRadius: BorderRadius.circular(AppConstants.radiusXXL),
          border: Border.all(
            color: AppConstants.primaryColor.withOpacity(0.12),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: AppConstants.primaryColor.withOpacity(0.15),
              blurRadius: 20,
              offset: const Offset(0, 6),
              spreadRadius: 0,
            ),
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.symmetric(
          vertical: AppConstants.spacingXS + 2,
          horizontal: AppConstants.spacingXS + 2,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: items.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;
            final isSelected = currentIndex == index;

            return Expanded(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => onTap?.call(index),
                  borderRadius: BorderRadius.circular(AppConstants.radiusLG),
                  splashColor: AppConstants.primaryColor.withOpacity(0.1),
                  highlightColor: AppConstants.primaryColor.withOpacity(0.05),
                  child: AnimatedContainer(
                    constraints: const BoxConstraints(
                      minHeight: 60,
                      maxHeight: 70,
                    ),
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeOut,
                    padding: const EdgeInsets.symmetric(
                      vertical: AppConstants.spacingSM - 2,
                      horizontal: AppConstants.spacingXS,
                    ),
                    decoration: BoxDecoration(
                      gradient: isSelected 
                          ? AppConstants.primaryGradient
                          : null,
                      color: isSelected 
                          ? null
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(AppConstants.radiusLG),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: AppConstants.primaryColor.withOpacity(0.25),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ]
                          : null,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 150),
                          switchInCurve: Curves.easeOut,
                          switchOutCurve: Curves.easeIn,
                          transitionBuilder: (child, animation) {
                            return FadeTransition(
                              opacity: animation,
                              child: ScaleTransition(
                                scale: Tween<double>(begin: 0.8, end: 1.0).animate(
                                  CurvedAnimation(
                                    parent: animation,
                                    curve: Curves.easeOut,
                                  ),
                                ),
                                child: child,
                              ),
                            );
                          },
                          child: Icon(
                            isSelected ? item.selectedIcon : item.icon,
                            key: ValueKey('${item.label}_$isSelected'),
                            color: isSelected 
                                ? AppConstants.primaryContrastColor 
                                : AppConstants.textSecondary,
                            size: 20,
                          ),
                        ),
                        const SizedBox(height: 4),
                        AnimatedDefaultTextStyle(
                          duration: const Duration(milliseconds: 150),
                          curve: Curves.easeOut,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: isSelected 
                                ? FontWeight.w600 
                                : FontWeight.w500,
                            color: isSelected 
                                ? AppConstants.primaryContrastColor 
                                : AppConstants.textSecondary,
                            fontFamily: AppConstants.fontFamily,
                            letterSpacing: isSelected ? 0.2 : 0,
                            height: 1.2,
                          ),
                          child: Text(
                            item.label,
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            softWrap: false,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        ),
      ),
    );
  }
}

class NavigationItem {
  final IconData icon;
  final IconData selectedIcon;
  final String label;

  const NavigationItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });
}
