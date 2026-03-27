import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../constants/app_constants.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';
import '../../../services/business_hub/bh_import_service.dart';

class BHImportScreen extends ConsumerStatefulWidget {
  const BHImportScreen({super.key});

  @override
  ConsumerState<BHImportScreen> createState() => _BHImportScreenState();
}

class _BHImportScreenState extends ConsumerState<BHImportScreen> {
  final _importService = BHImportService();
  bool _loading = false;
  BHImportResult? _result;

  @override
  Widget build(BuildContext context) {
    final orgAsync = ref.watch(bhOrganizationProvider);
    final authState = ref.watch(firestoreAuthProvider);

    return orgAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e')),
      data: (org) {
        if (org == null) {
          return const Center(child: Text('Создайте компанию'));
        }

        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => context.pop(),
              tooltip: 'Назад к Business Hub',
            ),
            title: const Text('Импорт операций'),
          ),
          body: ListView(
            padding: const EdgeInsets.all(20),
            children: [
            const Text(
              'Импорт операций',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              'Загрузите Excel (.xlsx) или CSV с колонками: date, type, amount',
              style: TextStyle(fontSize: 13, color: AppConstants.textSecondary),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Формат файла:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade900)),
                  const SizedBox(height: 4),
                  const Text('date,type,amount,currency,counterpartyName,notes', style: TextStyle(fontFamily: 'monospace', fontSize: 12)),
                  const SizedBox(height: 8),
                  Text('Типы: sale, purchase, serviceRendered, salaryPayment, taxPayment...', style: TextStyle(fontSize: 12, color: Colors.blue.shade800)),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _loading ? null : () => _pickAndImport(context, org.id, authState.user!.id, isExcel: true),
                    icon: _loading ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.table_chart),
                    label: const Text('Excel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _loading ? null : () => _pickAndImport(context, org.id, authState.user!.id, isExcel: false),
                    icon: const Icon(Icons.description),
                    label: const Text('CSV'),
                  ),
                ),
              ],
            ),
            if (_result != null) ...[
              const SizedBox(height: 24),
              _BuildResult(result: _result!, onConfirm: () => _applyImport(context, org.id, authState.user!.id)),
            ],
          ],
        ),
        );
      },
    );
  }

  Future<void> _pickAndImport(BuildContext context, String orgId, String userId, {required bool isExcel}) async {
    final result = await FilePicker.platform.pickFiles(
      type: isExcel ? FileType.custom : FileType.custom,
      allowedExtensions: isExcel ? ['xlsx', 'xls'] : ['csv'],
    );
    if (result == null || result.files.isEmpty) return;

    final bytes = result.files.first.bytes;
    if (bytes == null) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Не удалось прочитать файл')));
      return;
    }

    setState(() {
      _loading = true;
      _result = null;
    });

    BHImportResult importResult;
    if (isExcel) {
      importResult = await _importService.importFromExcel(Uint8List.fromList(bytes));
    } else {
      importResult = await _importService.importFromCsv(Uint8List.fromList(bytes));
    }

    setState(() {
      _loading = false;
      _result = importResult;
    });
  }

  Future<void> _applyImport(BuildContext context, String orgId, String userId) async {
    final result = _result!;
    if (result.rows.isEmpty) return;

    setState(() => _loading = true);

    final notifier = ref.read(bhOperationsProvider.notifier);
    await notifier.load(orgId);
    for (final row in result.rows) {
      await notifier.addOperation(
        type: row.type,
        date: row.date,
        amount: row.amount,
        createdBy: userId,
        currency: row.currency,
        counterpartyName: row.counterpartyName,
        notes: row.notes,
      );
    }

    setState(() {
      _loading = false;
      _result = null;
    });

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Импортировано: ${result.rows.length} операций')));
    }
  }
}

class _BuildResult extends StatelessWidget {
  final BHImportResult result;
  final VoidCallback onConfirm;

  const _BuildResult({required this.result, required this.onConfirm});

  @override
  Widget build(BuildContext context) {
    final hasWarnings = result.errors.isNotEmpty || result.skipped > 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Найдено: ${result.rows.length} операций', style: const TextStyle(fontWeight: FontWeight.bold)),
            if (result.skipped > 0) Text('Пропущено: ${result.skipped}', style: TextStyle(color: Colors.orange.shade800)),
            if (result.errors.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text('Ошибки (${result.errors.length}):', style: TextStyle(color: Colors.red.shade700, fontWeight: FontWeight.w600)),
              ...result.errors.take(5).map((e) => Text(e, style: const TextStyle(fontSize: 12, color: Colors.red))),
              if (result.errors.length > 5) Text('... и ещё ${result.errors.length - 5}', style: TextStyle(fontSize: 12, color: Colors.red.shade300)),
            ],
            if (result.rows.isNotEmpty) ...[
              const SizedBox(height: 16),
              if (hasWarnings)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    'Импортируются только корректные строки. Ошибки можно исправить в файле и загрузить снова.',
                    style: TextStyle(fontSize: 12, color: Colors.orange.shade800),
                  ),
                ),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: onConfirm,
                  style: ElevatedButton.styleFrom(backgroundColor: AppConstants.primaryColor, foregroundColor: Colors.white),
                  child: Text(hasWarnings ? 'Импортировать ${result.rows.length} операций' : 'Импортировать в систему'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
