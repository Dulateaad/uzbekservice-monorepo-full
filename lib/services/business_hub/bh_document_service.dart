import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import '../../models/business_hub/operation.dart';
import '../../models/business_hub/organization.dart';
import '../../models/business_hub/counterparty.dart';

class BHDocumentService {
  String _formatDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';

  /// Генерация счёта на оплату (Invoice)
  Future<pw.Document> generateInvoice({
    required BHOrganization org,
    required BHCounterparty counterparty,
    required List<BHOperation> items,
    required String documentNumber,
    DateTime? issueDate,
  }) async {
    final date = issueDate ?? DateTime.now();
    double total = 0;
    for (final op in items) {
      if (op.type.isIncome) total += op.amount;
    }

    final pdf = pw.Document();
    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Center(
              child: pw.Text(
                'СЧЁТ НА ОПЛАТУ № $documentNumber',
                style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold),
              ),
            ),
            pw.SizedBox(height: 24),
            pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Продавец:', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
                      pw.Text(org.name, style: const pw.TextStyle(fontSize: 11)),
                      if (org.inn != null) pw.Text('ИНН: ${org.inn}', style: const pw.TextStyle(fontSize: 10)),
                      if (org.address != null) pw.Text(org.address!, style: const pw.TextStyle(fontSize: 10)),
                    ],
                  ),
                ),
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Покупатель:', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
                      pw.Text(counterparty.name, style: const pw.TextStyle(fontSize: 11)),
                      if (counterparty.inn != null) pw.Text('ИНН: ${counterparty.inn}', style: const pw.TextStyle(fontSize: 10)),
                      if (counterparty.address != null) pw.Text(counterparty.address!, style: const pw.TextStyle(fontSize: 10)),
                    ],
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 16),
            pw.Text('Дата: ${_formatDate(date)}', style: const pw.TextStyle(fontSize: 10)),
            pw.SizedBox(height: 16),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey400),
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.grey300),
                  children: [
                    _cell('№', isHeader: true),
                    _cell('Наименование', isHeader: true),
                    _cell('Сумма (UZS)', isHeader: true),
                  ],
                ),
                ...items.asMap().entries.map((e) {
                  final i = e.key + 1;
                  final op = e.value;
                  return pw.TableRow(
                    children: [
                      _cell('$i'),
                      _cell(op.type.label + (op.notes != null ? ': ${op.notes}' : '')),
                      _cell(op.amount.toStringAsFixed(2)),
                    ],
                  );
                }),
              ],
            ),
            pw.SizedBox(height: 16),
            pw.Align(
              alignment: pw.Alignment.centerRight,
              child: pw.Text(
                'Итого: ${total.toStringAsFixed(2)} UZS',
                style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
    return pdf;
  }

  /// Генерация акта выполненных работ
  Future<pw.Document> generateAct({
    required BHOrganization org,
    required BHCounterparty counterparty,
    required List<BHOperation> items,
    required String documentNumber,
    DateTime? issueDate,
  }) async {
    final date = issueDate ?? DateTime.now();
    double total = 0;
    for (final op in items) {
      if (op.type.isIncome) total += op.amount;
    }

    final pdf = pw.Document();
    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Center(
              child: pw.Text(
                'АКТ ВЫПОЛНЕННЫХ РАБОТ № $documentNumber',
                style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
              ),
            ),
            pw.SizedBox(height: 8),
            pw.Center(
              child: pw.Text('от ${_formatDate(date)}', style: const pw.TextStyle(fontSize: 12)),
            ),
            pw.SizedBox(height: 24),
            pw.Text(
              'Исполнитель: ${org.name}${org.inn != null ? ' (ИНН: ${org.inn})' : ''}',
              style: const pw.TextStyle(fontSize: 11),
            ),
            pw.SizedBox(height: 4),
            pw.Text(
              'Заказчик: ${counterparty.name}${counterparty.inn != null ? ' (ИНН: ${counterparty.inn})' : ''}',
              style: const pw.TextStyle(fontSize: 11),
            ),
            pw.SizedBox(height: 20),
            pw.Text(
              'Нижеподписавшиеся стороны составили настоящий акт о том, что следующие работы (услуги) выполнены в полном объёме:',
              style: const pw.TextStyle(fontSize: 10),
            ),
            pw.SizedBox(height: 12),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey400),
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.grey300),
                  children: [
                    _cell('№', isHeader: true),
                    _cell('Описание', isHeader: true),
                    _cell('Сумма (UZS)', isHeader: true),
                  ],
                ),
                ...items.asMap().entries.map((e) {
                  final i = e.key + 1;
                  final op = e.value;
                  return pw.TableRow(
                    children: [
                      _cell('$i'),
                      _cell(op.type.label + (op.notes != null ? ': ${op.notes}' : '')),
                      _cell(op.amount.toStringAsFixed(2)),
                    ],
                  );
                }),
              ],
            ),
            pw.SizedBox(height: 16),
            pw.Text(
              'Всего на сумму: ${total.toStringAsFixed(2)} (сумма прописью) UZS',
              style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold),
            ),
            pw.SizedBox(height: 24),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Исполнитель:', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                    pw.Text(org.name, style: const pw.TextStyle(fontSize: 10)),
                    pw.Text('_________________', style: pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Заказчик:', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                    pw.Text(counterparty.name, style: const pw.TextStyle(fontSize: 10)),
                    pw.Text('_________________', style: pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
    return pdf;
  }

  pw.Widget _cell(String text, {bool isHeader = false}) => pw.Padding(
    padding: const pw.EdgeInsets.all(6),
    child: pw.Text(
      text,
      style: pw.TextStyle(
        fontSize: isHeader ? 10 : 9,
        fontWeight: isHeader ? pw.FontWeight.bold : pw.FontWeight.normal,
      ),
    ),
  );

  Future<void> sharePdf(pw.Document pdf, String filename) async {
    final bytes = await pdf.save();
    await Share.shareXFiles(
      [XFile.fromData(bytes, name: filename, mimeType: 'application/pdf')],
      text: 'Документ из ODO Business Hub',
    );
  }

  Future<void> printPdf(pw.Document pdf) async {
    await Printing.layoutPdf(onLayout: (_) async => pdf.save());
  }

  Future<Uint8List> pdfToBytes(pw.Document pdf) async => pdf.save();
}
