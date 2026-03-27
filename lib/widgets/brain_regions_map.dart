import 'package:flutter/material.dart';
import 'package:path_drawing/path_drawing.dart';

/// Зоны мозга из SVG (viewBox 0 0 400 320) — только контуры лепестков, без декора.
enum BrainLobe {
  frontal,
  parietal,
  temporal,
  occipital,
  stem,
  stemBase,
}

/// Карта мозга: неактивные зоны серые; при выполнении задания добавьте лоб в [activeLobes].
class BrainRegionsMap extends StatelessWidget {
  const BrainRegionsMap({
    super.key,
    required this.activeLobes,
    this.height = 200,
  });

  final Set<BrainLobe> activeLobes;
  final double height;

  static const double _vbW = 400;
  static const double _vbH = 320;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth.isFinite && constraints.maxWidth > 0
            ? constraints.maxWidth
            : _vbW * height / _vbH;
        return SizedBox(
          width: w,
          height: height,
          child: CustomPaint(
            painter: _BrainRegionsPainter(activeLobes: activeLobes),
            size: Size(w, height),
          ),
        );
      },
    );
  }
}

class _BrainRegionsPainter extends CustomPainter {
  _BrainRegionsPainter({required this.activeLobes});

  final Set<BrainLobe> activeLobes;

  static final Map<BrainLobe, Path> _paths = {
    BrainLobe.frontal: parseSvgPathData(
      'M120,40 C180,15 260,30 290,75 C310,105 305,145 270,175 C240,195 190,185 160,165 C130,145 100,100 120,40',
    ),
    BrainLobe.parietal: parseSvgPathData(
      'M290,75 C330,95 365,135 355,185 C345,225 315,235 285,235 C255,235 245,205 265,175 C295,145 300,105 290,75',
    ),
    BrainLobe.temporal: parseSvgPathData(
      'M160,165 C190,185 240,195 270,175 C250,205 260,235 240,255 C210,275 150,255 130,215 C120,185 140,165 160,165',
    ),
    BrainLobe.occipital: parseSvgPathData(
      'M355,185 C375,215 365,255 335,275 C305,295 285,275 285,235 C315,235 345,225 355,185',
    ),
    BrainLobe.stem: parseSvgPathData(
      'M240,255 C260,275 290,285 300,305 C280,315 230,315 210,295 C200,275 220,255 240,255',
    ),
  };

  static final RRect _stemBase = RRect.fromRectAndRadius(
    const Rect.fromLTWH(195, 270, 20, 40),
    const Radius.circular(4),
  );

  static Color _inactiveFill() => const Color(0xFF64748B);

  static Color _activeColor(BrainLobe l) {
    switch (l) {
      case BrainLobe.frontal:
        return const Color(0xFF22D3EE);
      case BrainLobe.parietal:
        return const Color(0xFFC084FC);
      case BrainLobe.temporal:
        return const Color(0xFF34D399);
      case BrainLobe.occipital:
        return const Color(0xFFFBBF24);
      case BrainLobe.stem:
        return const Color(0xFFF87171);
      case BrainLobe.stemBase:
        return const Color(0xFF94A3B8);
    }
  }

  @override
  void paint(Canvas canvas, Size size) {
    const vbW = BrainRegionsMap._vbW;
    final scale = size.width / vbW;
    canvas.save();
    canvas.scale(scale);

    const order = [
      BrainLobe.frontal,
      BrainLobe.parietal,
      BrainLobe.temporal,
      BrainLobe.occipital,
      BrainLobe.stem,
    ];

    for (final lobe in order) {
      final path = _paths[lobe]!;
      final active = activeLobes.contains(lobe);
      final fill = active ? _activeColor(lobe) : _inactiveFill();
      final paint = Paint()
        ..style = PaintingStyle.fill
        ..color = fill.withValues(alpha: active ? 0.95 : 0.55);
      if (active) {
        paint.maskFilter = const MaskFilter.blur(BlurStyle.normal, 2.5);
      }
      canvas.drawPath(path, paint);
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = active ? 1.2 : 0.8
          ..color = active
              ? Colors.white.withValues(alpha: 0.35)
              : Colors.white.withValues(alpha: 0.08),
      );
    }

    final baseActive = activeLobes.contains(BrainLobe.stemBase);
    final basePaint = Paint()
      ..style = PaintingStyle.fill
      ..color = (baseActive ? _activeColor(BrainLobe.stemBase) : _inactiveFill())
          .withValues(alpha: baseActive ? 0.95 : 0.55);
    if (baseActive) {
      basePaint.maskFilter = const MaskFilter.blur(BlurStyle.normal, 2);
    }
    canvas.drawRRect(_stemBase, basePaint);
    canvas.drawRRect(
      _stemBase,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = baseActive ? 1.2 : 0.8
        ..color = baseActive
            ? Colors.white.withValues(alpha: 0.35)
            : Colors.white.withValues(alpha: 0.08),
    );

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _BrainRegionsPainter oldDelegate) {
    return oldDelegate.activeLobes != activeLobes;
  }
}
