import 'dart:typed_data';
import 'package:google_generative_ai/google_generative_ai.dart';
import '../../config/gemini_config.dart';
import '../../models/business_hub/business_health_score.dart';
import '../../models/business_hub/operation.dart';

class BHAiService {
  GenerativeModel? _model;
  GenerativeModel? _visionModel;

  GenerativeModel get model {
    _model ??= GenerativeModel(
      model: 'gemini-1.5-flash',
      apiKey: GeminiConfig.apiKey,
    );
    return _model!;
  }

  GenerativeModel get visionModel {
    _visionModel ??= GenerativeModel(
      model: 'gemini-1.5-flash',
      apiKey: GeminiConfig.apiKey,
    );
    return _visionModel!;
  }

  bool get isAvailable => GeminiConfig.isConfigured;

  /// AI объясняет BHS и даёт рекомендации
  Future<String> explainBHS({
    required BusinessHealthScore bhs,
    required String orgName,
    required double totalIncome,
    required double totalExpense,
    required int operationsCount,
  }) async {
    if (!isAvailable) {
      return _fallbackExplanation(bhs);
    }

    try {
      final prompt = '''
Ты — бизнес-ассистент ODO Business Hub. Дай краткий анализ (2-3 предложения на русском).

Данные компании "$orgName":
- Business Health Score: ${bhs.score}/100 (${bhs.status.label})
- Доходы за месяц: $totalIncome UZS
- Расходы за месяц: $totalExpense UZS
- Операций: $operationsCount
- Финансы: ${bhs.components.finance.toStringAsFixed(0)}/100
- Продажи: ${bhs.components.sales.toStringAsFixed(0)}/100
- Операции: ${bhs.components.operations.toStringAsFixed(0)}/100
- Персонал: ${bhs.components.personnel.toStringAsFixed(0)}/100

Объясни простым языком: почему BHS такой, какая главная причина, и дай 1-2 конкретные рекомендации. Без лишних слов.
''';

      final response = await model.generateContent([Content.text(prompt)]);
      return response.text ?? _fallbackExplanation(bhs);
    } catch (e) {
      return _fallbackExplanation(bhs);
    }
  }

  String _fallbackExplanation(BusinessHealthScore bhs) {
    final buf = StringBuffer();
    buf.writeln('BHS: ${bhs.score}/100 — ${bhs.status.label}');
    for (final r in bhs.topReasons) {
      buf.writeln('• $r');
    }
    for (final rec in bhs.recommendations) {
      buf.writeln('💡 $rec');
    }
    return buf.toString();
  }

  /// AI определяет тип операции по тексту (для OCR)
  Future<OperationType> categorizeExpense(String text) async {
    if (!isAvailable) return OperationType.purchase;

    try {
      final prompt = '''
Определи тип расхода по тексту. Ответь ОДНИМ словом из списка:
purchase, logisticsCost, salaryPayment, taxPayment, compensationPenalty, serviceRendered

Текст: "$text"
''';

      final response = await model.generateContent([Content.text(prompt)]);
      final answer = (response.text ?? 'purchase').toLowerCase();
      for (final t in OperationType.values) {
        if (answer.contains(t.name)) return t;
      }
    } catch (_) {}
    return OperationType.purchase;
  }

  /// OCR через Gemini Vision — извлечь данные из изображения чека
  /// Возвращает null если API не настроен или произошла ошибка
  Future<OcrResult?> extractFromReceiptImage(List<int> imageBytes) async {
    if (!isAvailable) {
      print('⚠️ Gemini API не настроен (GEMINI_API_KEY пустой)');
      return null;
    }

    try {
      final prompt = '''
Извлеки данные с чека/накладной. Ответь СТРОГО в формате JSON:
{
  "amount": число (итоговая сумма),
  "date": "YYYY-MM-DD",
  "counterparty": "название продавца",
  "category": "purchase или logisticsCost или другой тип"
}
Если что-то не найдено — используй null. Только JSON, без markdown.
''';

      final imagePart = DataPart('image/jpeg', Uint8List.fromList(imageBytes));
      final response = await visionModel.generateContent([
        Content.multi([TextPart(prompt), imagePart]),
      ]);

      final text = response.text ?? '';
      final jsonStr = text
          .replaceAll('```json', '')
          .replaceAll('```', '')
          .trim();
      return OcrResult.fromJsonString(jsonStr);
    } catch (e, st) {
      print('❌ Gemini OCR ошибка: $e');
      print('$st');
      rethrow;
    }
  }
}

class OcrResult {
  final double? amount;
  final DateTime? date;
  final String? counterparty;
  final String? category;

  OcrResult({
    this.amount,
    this.date,
    this.counterparty,
    this.category,
  });

  factory OcrResult.fromJsonString(String json) {
    try {
      // Простой парсинг без зависимости от dart:convert для минимального кода
      final amountMatch = RegExp(r'"amount"\s*:\s*(\d+\.?\d*)').firstMatch(json);
      final dateMatch = RegExp(r'"date"\s*:\s*"([^"]+)"').firstMatch(json);
      final cpMatch = RegExp(r'"counterparty"\s*:\s*"([^"]*)"').firstMatch(json);
      final catMatch = RegExp(r'"category"\s*:\s*"([^"]*)"').firstMatch(json);

      return OcrResult(
        amount: amountMatch != null ? double.tryParse(amountMatch.group(1)!) : null,
        date: dateMatch != null ? DateTime.tryParse(dateMatch.group(1)!) : null,
        counterparty: cpMatch?.group(1),
        category: catMatch?.group(1),
      );
    } catch (_) {
      return OcrResult();
    }
  }
}
