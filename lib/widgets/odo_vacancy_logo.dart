import 'package:flutter/material.dart';

/// Логотип ODO Vacancy
/// Использует изображение из assets, если доступно, иначе кастомный виджет
class OdoVacancyLogo extends StatelessWidget {
  final double size;
  final Color? blueColor;
  final Color? greenColor;

  const OdoVacancyLogo({
    super.key,
    this.size = 48,
    this.blueColor,
    this.greenColor,
  });

  @override
  Widget build(BuildContext context) {
    // Пытаемся загрузить изображение из assets
    return Image.asset(
      'assets/images/logos/odo_vacancy.png',
      width: size,
      height: size,
      fit: BoxFit.contain,
      errorBuilder: (context, error, stackTrace) {
        // Если изображение не найдено, используем кастомный виджет
        return _CustomVacancyLogo(
          size: size,
          blueColor: blueColor,
          greenColor: greenColor,
        );
      },
    );
  }
}

class _CustomVacancyLogo extends StatelessWidget {
  final double size;
  final Color? blueColor;
  final Color? greenColor;

  const _CustomVacancyLogo({
    required this.size,
    this.blueColor,
    this.greenColor,
  });

  @override
  Widget build(BuildContext context) {
    final blue = blueColor ?? const Color(0xFF3B82F6);
    final green = greenColor ?? const Color(0xFF10B981);

    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _VacancyLogoPainter(blue: blue, green: green),
      ),
    );
  }
}

class _VacancyLogoPainter extends CustomPainter {
  final Color blue;
  final Color green;

  _VacancyLogoPainter({
    required this.blue,
    required this.green,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.fill
      ..strokeWidth = 2;

    // Буква O (первая) - синяя
    paint.color = blue;
    paint.style = PaintingStyle.stroke;
    paint.strokeWidth = size.width * 0.12;
    canvas.drawCircle(
      Offset(size.width * 0.2, size.height * 0.5),
      size.width * 0.12,
      paint,
    );
    // Зеленая дуга под первой O (улыбка)
    paint.color = green;
    paint.strokeWidth = size.width * 0.06;
    paint.strokeCap = StrokeCap.round;
    canvas.drawArc(
      Rect.fromCircle(
        center: Offset(size.width * 0.2, size.height * 0.55),
        radius: size.width * 0.08,
      ),
      0.3,
      0.8,
      false,
      paint,
    );

    // Буква D - синяя
    paint.color = blue;
    paint.style = PaintingStyle.fill;
    final dPath = Path()
      ..moveTo(size.width * 0.38, size.height * 0.25)
      ..lineTo(size.width * 0.52, size.height * 0.25)
      ..quadraticBezierTo(
        size.width * 0.62,
        size.height * 0.25,
        size.width * 0.62,
        size.height * 0.5,
      )
      ..quadraticBezierTo(
        size.width * 0.62,
        size.height * 0.75,
        size.width * 0.52,
        size.height * 0.75,
      )
      ..lineTo(size.width * 0.38, size.height * 0.75)
      ..close();
    canvas.drawPath(dPath, paint);

    // Буква O (вторая) - синяя
    paint.color = blue;
    paint.style = PaintingStyle.stroke;
    paint.strokeWidth = size.width * 0.12;
    canvas.drawCircle(
      Offset(size.width * 0.8, size.height * 0.5),
      size.width * 0.12,
      paint,
    );
    // Зеленая дуга над второй O (бровь)
    paint.color = green;
    paint.strokeWidth = size.width * 0.06;
    paint.strokeCap = StrokeCap.round;
    canvas.drawArc(
      Rect.fromCircle(
        center: Offset(size.width * 0.8, size.height * 0.45),
        radius: size.width * 0.08,
      ),
      3.8,
      0.8,
      false,
      paint,
    );

    // Дополнительный элемент - значок работы (briefcase) в зеленом цвете справа
    paint.color = green;
    paint.style = PaintingStyle.fill;
    final briefcaseSize = size.width * 0.08;
    final briefcaseX = size.width * 0.5;
    final briefcaseY = size.height * 0.5;
    
    // Основная часть портфеля
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(briefcaseX, briefcaseY + briefcaseSize * 0.3),
          width: briefcaseSize * 0.8,
          height: briefcaseSize * 0.5,
        ),
        const Radius.circular(2),
      ),
      paint,
    );
    // Ручка портфеля
    paint.strokeWidth = briefcaseSize * 0.15;
    paint.style = PaintingStyle.stroke;
    paint.strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(briefcaseX - briefcaseSize * 0.2, briefcaseY + briefcaseSize * 0.1),
      Offset(briefcaseX + briefcaseSize * 0.2, briefcaseY + briefcaseSize * 0.1),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

