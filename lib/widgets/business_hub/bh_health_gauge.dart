import 'dart:math';
import 'package:flutter/material.dart';
import '../../models/business_hub/business_health_score.dart';

class BHHealthGauge extends StatelessWidget {
  final BusinessHealthScore? bhs;
  final double size;

  const BHHealthGauge({super.key, this.bhs, this.size = 180});

  @override
  Widget build(BuildContext context) {
    final score = bhs?.score ?? -1;
    final hasData = score >= 0;

    Color statusColor;
    String statusText;
    if (!hasData) {
      statusColor = Colors.grey;
      statusText = '—';
    } else if (score >= 80) {
      statusColor = const Color(0xFF10B981);
      statusText = 'Healthy';
    } else if (score >= 50) {
      statusColor = const Color(0xFFF59E0B);
      statusText = 'Attention';
    } else {
      statusColor = const Color(0xFFEF4444);
      statusText = 'Critical';
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: size,
          height: size,
          child: CustomPaint(
            painter: _GaugePainter(
              score: hasData ? score : 0,
              color: statusColor,
              hasData: hasData,
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    hasData ? '$score' : '—',
                    style: TextStyle(
                      fontSize: size * 0.28,
                      fontWeight: FontWeight.w800,
                      color: statusColor,
                    ),
                  ),
                  Text(
                    hasData ? '/ 100' : '',
                    style: TextStyle(
                      fontSize: size * 0.09,
                      color: Colors.grey.shade400,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            color: statusColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            hasData ? statusText : 'Нет данных',
            style: TextStyle(
              color: statusColor,
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
        ),
      ],
    );
  }
}

class _GaugePainter extends CustomPainter {
  final int score;
  final Color color;
  final bool hasData;

  _GaugePainter({required this.score, required this.color, required this.hasData});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 14;
    const startAngle = 135 * pi / 180;
    const totalSweep = 270 * pi / 180;

    // Background arc
    final bgPaint = Paint()
      ..color = Colors.grey.shade200
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      totalSweep,
      false,
      bgPaint,
    );

    if (!hasData) return;

    // Score arc
    final scoreSweep = totalSweep * (score / 100);
    final scorePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      scoreSweep,
      false,
      scorePaint,
    );
  }

  @override
  bool shouldRepaint(covariant _GaugePainter old) =>
      old.score != score || old.color != color || old.hasData != hasData;
}
