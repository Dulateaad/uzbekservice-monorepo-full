import 'dart:math' as math;

/// RMSSD по последовательности RR-интервалов в миллисекундах (сырые данные с датчика).
/// Используется для пилотного ориентира, не для медицинской диагностики.
double computeRmssdMs(List<double> rrMs) {
  if (rrMs.length < 2) return 0;
  final slice = rrMs.length > 30 ? rrMs.sublist(rrMs.length - 30) : rrMs;
  var sumSq = 0.0;
  for (var i = 0; i < slice.length - 1; i++) {
    final d = slice[i + 1] - slice[i];
    sumSq += d * d;
  }
  final n = slice.length - 1;
  return math.sqrt(sumSq / n);
}

/// Эвристические пороги для пилота (мс разниц между соседними RR).
String stressStatusFromRmssd(double rmssd) {
  if (rmssd <= 0 || rmssd.isNaN) return 'unknown';
  if (rmssd >= 35) return 'green';
  if (rmssd <= 15) return 'red';
  return 'yellow';
}
