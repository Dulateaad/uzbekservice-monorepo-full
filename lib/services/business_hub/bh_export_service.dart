import 'dart:typed_data';
import 'package:excel/excel.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import '../../models/business_hub/operation.dart';
import '../../models/business_hub/organization.dart';
import '../../models/business_hub/business_health_score.dart';

class BHExportService {
  /// Экспорт операций в Excel
  Future<Uint8List> exportOperationsToExcel({
    required List<BHOperation> operations,
    required BHOrganization org,
  }) async {
    final excel = Excel.createExcel();
    final sheetName = excel.getDefaultSheet() ?? 'Sheet1';

    // Заголовки
    excel.appendRow(sheetName, [
      TextCellValue('Дата'),
      TextCellValue('Тип'),
      TextCellValue('Сумма'),
      TextCellValue('Валюта'),
      TextCellValue('Контрагент'),
      TextCellValue('Статус'),
      TextCellValue('Примечание'),
    ]);

    for (final op in operations) {
      excel.appendRow(sheetName, [
        TextCellValue(_formatDate(op.date)),
        TextCellValue(op.type.label),
        TextCellValue(op.amount.toStringAsFixed(2)),
        TextCellValue(op.currency),
        TextCellValue(op.counterpartyName ?? ''),
        TextCellValue(op.status.label),
        TextCellValue(op.notes ?? ''),
      ]);
    }

    final encoded = excel.encode();
    return encoded != null ? Uint8List.fromList(encoded) : Uint8List(0);
  }

  /// Экспорт операций в PDF
  Future<pw.Document> exportOperationsToPdf({
    required List<BHOperation> operations,
    required BHOrganization org,
  }) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (context) => [
          pw.Header(
            level: 0,
            child: pw.Text(
              'Отчёт по операциям — ${org.name}',
              style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
            ),
          ),
          pw.Table(
            border: pw.TableBorder.all(color: PdfColors.grey300),
            children: [
              pw.TableRow(
                decoration: const pw.BoxDecoration(color: PdfColors.grey200),
                children: [
                  _cell('Дата'),
                  _cell('Тип'),
                  _cell('Сумма'),
                  _cell('Валюта'),
                  _cell('Контрагент'),
                  _cell('Статус'),
                ],
              ),
              ...operations.map((op) => pw.TableRow(
                children: [
                  _cell(_formatDate(op.date)),
                  _cell(op.type.label),
                  _cell(op.amount.toStringAsFixed(2)),
                  _cell(op.currency),
                  _cell(op.counterpartyName ?? ''),
                  _cell(op.status.label),
                ],
              )),
            ],
          ),
        ],
      ),
    );

    return pdf;
  }

  pw.Widget _cell(String text) => pw.Padding(
    padding: const pw.EdgeInsets.all(4),
    child: pw.Text(text, style: const pw.TextStyle(fontSize: 10)),
  );

  String _formatDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';

  /// Экспорт BHS в PDF
  Future<pw.Document> exportBHSToPdf({
    required BusinessHealthScore bhs,
    required BHOrganization org,
  }) async {
    final pdf = pw.Document();
    final statusText = bhs.status == BHSStatus.healthy ? 'Здоровый' :
        bhs.status == BHSStatus.attention ? 'Внимание' : 'Критический';

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text('Business Health Score', style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 8),
            pw.Text(org.name, style: const pw.TextStyle(fontSize: 14)),
            pw.SizedBox(height: 24),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('Оценка: ${bhs.score}/100', style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
                pw.Text(statusText, style: const pw.TextStyle(fontSize: 14)),
              ],
            ),
            pw.SizedBox(height: 16),
            pw.Text('Компоненты:', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 4),
            pw.Text('Финансы: ${bhs.components.finance.toStringAsFixed(0)}/100', style: const pw.TextStyle(fontSize: 11)),
            pw.Text('Продажи: ${bhs.components.sales.toStringAsFixed(0)}/100', style: const pw.TextStyle(fontSize: 11)),
            pw.Text('Операции: ${bhs.components.operations.toStringAsFixed(0)}/100', style: const pw.TextStyle(fontSize: 11)),
            pw.Text('Персонал: ${bhs.components.personnel.toStringAsFixed(0)}/100', style: const pw.TextStyle(fontSize: 11)),
            pw.SizedBox(height: 16),
            pw.Text('Причины:', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
            ...bhs.topReasons.map((r) => pw.Padding(
              padding: const pw.EdgeInsets.only(bottom: 4),
              child: pw.Text('• $r', style: const pw.TextStyle(fontSize: 11)),
            )),
            pw.SizedBox(height: 8),
            pw.Text('Рекомендации:', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
            ...bhs.recommendations.map((r) => pw.Padding(
              padding: const pw.EdgeInsets.only(bottom: 4),
              child: pw.Text('• $r', style: const pw.TextStyle(fontSize: 11)),
            )),
          ],
        ),
      ),
    );

    return pdf;
  }

  /// Сохранить и поделиться файлом
  Future<void> shareFile(Uint8List bytes, String filename, String mimeType) async {
    await Share.shareXFiles(
      [XFile.fromData(bytes, name: filename, mimeType: mimeType)],
      text: 'Экспорт из ODO Business Hub',
    );
  }

  /// Печать PDF
  Future<void> printPdf(pw.Document pdf) async {
    await Printing.layoutPdf(onLayout: (_) async => pdf.save());
  }

  /// Сохранить PDF в bytes
  Future<Uint8List> pdfToBytes(pw.Document pdf) async {
    return pdf.save();
  }
}
