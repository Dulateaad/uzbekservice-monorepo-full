import 'dart:typed_data';
import 'package:csv/csv.dart';
import 'package:excel/excel.dart';
import '../../models/business_hub/operation.dart';

class BHImportResult {
  final List<BHImportRow> rows;
  final int skipped;
  final List<String> errors;

  const BHImportResult({
    required this.rows,
    required this.skipped,
    required this.errors,
  });

  int get imported => rows.length;
}

class BHImportRow {
  final DateTime date;
  final OperationType type;
  final double amount;
  final String currency;
  final String? counterpartyName;
  final String? notes;

  BHImportRow({
    required this.date,
    required this.type,
    required this.amount,
    this.currency = 'UZS',
    this.counterpartyName,
    this.notes,
  });
}

class BHImportService {
  /// Импорт операций из CSV
  /// Ожидаемые колонки: date,type,amount,currency,counterpartyName,notes
  /// date: DD.MM.YYYY или YYYY-MM-DD
  /// type: sale, purchase, serviceRendered, etc.
  Future<BHImportResult> importFromCsv(Uint8List bytes) async {
    final errors = <String>[];
    final importedRows = <BHImportRow>[];
    int skipped = 0;

    try {
      final content = String.fromCharCodes(bytes);
      final rows = const CsvToListConverter().convert(content);

      if (rows.isEmpty) {
        return BHImportResult(rows: [], skipped: 0, errors: ['Файл пуст']);
      }

      final header = rows.first.map((e) => e.toString().toLowerCase()).toList();
      final dateIdx = _findIndex(header, ['date', 'дата', 'дата']);
      final typeIdx = _findIndex(header, ['type', 'тип', 'type']);
      final amountIdx = _findIndex(header, ['amount', 'сумма', 'amount']);
      final currencyIdx = _findIndex(header, ['currency', 'валюта', 'currency']);
      final counterpartyIdx = _findIndex(header, ['counterparty', 'контрагент', 'counterparty']);
      final notesIdx = _findIndex(header, ['notes', 'примечание', 'notes']);

      if (dateIdx < 0 || typeIdx < 0 || amountIdx < 0) {
        return BHImportResult(
          rows: [],
          skipped: 0,
          errors: ['Не найдены обязательные колонки: date, type, amount'],
        );
      }

      for (var i = 1; i < rows.length; i++) {
        final row = rows[i];
        if (row.length < 3) {
          skipped++;
          continue;
        }

        try {
          final dateStr = _getStr(row, dateIdx);
          final typeStr = _getStr(row, typeIdx).toLowerCase();
          final amountStr = _getStr(row, amountIdx);

          final date = _parseDate(dateStr);
          if (date == null) {
            errors.add('Строка ${i + 1}: неверная дата "$dateStr"');
            skipped++;
            continue;
          }

          final type = _parseOperationType(typeStr);
          if (type == null) {
            errors.add('Строка ${i + 1}: неверный тип "$typeStr"');
            skipped++;
            continue;
          }

          final amount = double.tryParse(amountStr.replaceAll(',', '.')) ?? 0;
          if (amount <= 0) {
            errors.add('Строка ${i + 1}: сумма должна быть > 0');
            skipped++;
            continue;
          }

          final currency = currencyIdx >= 0 ? _getStr(row, currencyIdx) : 'UZS';
          final counterpartyName = counterpartyIdx >= 0 ? _getStr(row, counterpartyIdx) : null;
          final notes = notesIdx >= 0 ? _getStr(row, notesIdx) : null;

          importedRows.add(BHImportRow(
            date: date,
            type: type,
            amount: amount,
            currency: currency,
            counterpartyName: counterpartyName,
            notes: notes,
          ));
        } catch (e) {
          errors.add('Строка ${i + 1}: $e');
          skipped++;
        }
      }
    } catch (e) {
      errors.add('Ошибка чтения CSV: $e');
    }

    return BHImportResult(rows: importedRows, skipped: skipped, errors: errors);
  }

  int _findIndex(List<String> header, List<String> variants) {
    for (var i = 0; i < header.length; i++) {
      final h = header[i].toLowerCase().trim();
      for (final v in variants) {
        if (h.contains(v.toLowerCase())) return i;
      }
    }
    return -1;
  }

  String _getStr(List row, int idx) =>
      idx < row.length ? row[idx].toString().trim() : '';

  DateTime? _parseDate(String s) {
    if (s.isEmpty) return null;
    // DD.MM.YYYY
    final parts = s.split(RegExp(r'[./\-]'));
    if (parts.length == 3) {
      int d, m, y;
      if (parts[0].length == 4) {
        y = int.tryParse(parts[0]) ?? 0;
        m = int.tryParse(parts[1]) ?? 0;
        d = int.tryParse(parts[2]) ?? 0;
      } else {
        d = int.tryParse(parts[0]) ?? 0;
        m = int.tryParse(parts[1]) ?? 0;
        y = int.tryParse(parts[2]) ?? 0;
      }
      if (d > 0 && m > 0 && y > 0) {
        return DateTime(y, m, d);
      }
    }
    return DateTime.tryParse(s);
  }

  OperationType? _parseOperationType(String s) {
    if (s.isEmpty) return null;
    for (final t in OperationType.values) {
      if (t.name == s || t.label.toLowerCase() == s) return t;
    }
    final lower = s.toLowerCase();
    if (lower.contains('продаж') || lower == 'sale') return OperationType.sale;
    if (lower.contains('закуп') || lower == 'purchase') return OperationType.purchase;
    if (lower.contains('услуг') || lower.contains('service')) return OperationType.serviceRendered;
    if (lower.contains('зарплат') || lower.contains('salary')) return OperationType.salaryPayment;
    if (lower.contains('налог') || lower.contains('tax')) return OperationType.taxPayment;
    return null;
  }

  /// Импорт операций из Excel
  Future<BHImportResult> importFromExcel(Uint8List bytes) async {
    final errors = <String>[];
    final importedRows = <BHImportRow>[];
    int skipped = 0;

    try {
      final excel = Excel.decodeBytes(bytes);

      for (final table in excel.tables.values) {
        if (table.rows.isEmpty) continue;

        final header = table.rows.first.map((c) => c?.value?.toString().toLowerCase() ?? '').toList();
        final dateIdx = _findIndex(header, ['date', 'дата']);
        final typeIdx = _findIndex(header, ['type', 'тип']);
        final amountIdx = _findIndex(header, ['amount', 'сумма']);
        final currencyIdx = _findIndex(header, ['currency', 'валюта']);
        final counterpartyIdx = _findIndex(header, ['counterparty', 'контрагент']);
        final notesIdx = _findIndex(header, ['notes', 'примечание']);

        if (dateIdx < 0 || typeIdx < 0 || amountIdx < 0) continue;

        for (var i = 1; i < table.rows.length; i++) {
          final row = table.rows[i];
          if (row.length < 3) {
            skipped++;
            continue;
          }

          try {
            final dateStr = _getStrFromCell(row, dateIdx);
            final typeStr = _getStrFromCell(row, typeIdx).toLowerCase();
            final amountStr = _getStrFromCell(row, amountIdx);

            final date = _parseDate(dateStr);
            if (date == null) {
              errors.add('Строка ${i + 1}: неверная дата "$dateStr"');
              skipped++;
              continue;
            }

            final type = _parseOperationType(typeStr);
            if (type == null) {
              errors.add('Строка ${i + 1}: неверный тип "$typeStr"');
              skipped++;
              continue;
            }

            final amount = double.tryParse(amountStr.replaceAll(',', '.')) ?? 0;
            if (amount <= 0) {
              errors.add('Строка ${i + 1}: сумма должна быть > 0');
              skipped++;
              continue;
            }

            final currency = currencyIdx >= 0 ? _getStrFromCell(row, currencyIdx) : 'UZS';
            final counterpartyName = counterpartyIdx >= 0 ? _getStrFromCell(row, counterpartyIdx) : null;
            final notes = notesIdx >= 0 ? _getStrFromCell(row, notesIdx) : null;

            importedRows.add(BHImportRow(
              date: date,
              type: type,
              amount: amount,
              currency: currency,
              counterpartyName: counterpartyName,
              notes: notes,
            ));
          } catch (e) {
            errors.add('Строка ${i + 1}: $e');
            skipped++;
          }
        }
      }
    } catch (e) {
      errors.add('Ошибка чтения Excel: $e');
    }

    return BHImportResult(rows: importedRows, skipped: skipped, errors: errors);
  }

  String _getStrFromCell(List row, int idx) {
    if (idx >= row.length) return '';
    final c = row[idx];
    if (c == null) return '';
    return c.value?.toString().trim() ?? '';
  }
}
