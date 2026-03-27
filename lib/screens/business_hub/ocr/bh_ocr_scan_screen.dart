import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../constants/app_constants.dart';
import '../../../models/business_hub/operation.dart';
import '../../../services/business_hub/bh_ai_service.dart';
import '../../../providers/business_hub/bh_providers.dart';
import '../../../providers/firestore_auth_provider.dart';

class BHOcrScanScreen extends ConsumerStatefulWidget {
  const BHOcrScanScreen({super.key});

  @override
  ConsumerState<BHOcrScanScreen> createState() => _BHOcrScanScreenState();
}

class _BHOcrScanScreenState extends ConsumerState<BHOcrScanScreen> {
  final _aiService = BHAiService();
  bool _processing = false;
  String? _error;
  OcrResult? _result;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(firestoreAuthProvider).user;
      final org = ref.read(bhOrganizationProvider).valueOrNull;
      if (user != null && org != null) {
        ref.read(bhOperationsProvider.notifier).load(org.id);
      }
    });
  }

  Future<void> _pickAndProcess() async {
    if (!_aiService.isAvailable) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'AI не настроен. Добавьте GEMINI_API_KEY в index.html или при сборке.',
            ),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 5),
          ),
        );
      }
      return;
    }

    setState(() {
      _processing = true;
      _error = null;
      _result = null;
    });

    try {
      final picker = ImagePicker();
      final xFile = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        imageQuality: 85,
      );

      if (xFile == null) {
        setState(() => _processing = false);
        return;
      }

      final bytes = await xFile.readAsBytes();
      final result = await _aiService.extractFromReceiptImage(bytes);

      if (!mounted) return;
      setState(() {
        _result = result;
        _processing = false;
      });
      if (result == null && mounted) {
        setState(() {
          _error = 'Не удалось распознать данные. Проверьте фото или API ключ.';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Ошибка: $e';
          _processing = false;
        });
      }
    }
  }

  Future<void> _createOperation() async {
    final result = _result;
    if (result == null || result.amount == null) return;

    final user = ref.read(firestoreAuthProvider).user;
    final org = ref.read(bhOrganizationProvider).valueOrNull;
    if (user == null || org == null) return;

    setState(() => _processing = true);

    try {
      var type = OperationType.purchase;
      if (result.category != null && _aiService.isAvailable) {
        type = await _aiService.categorizeExpense(result.category!);
      }
      await ref.read(bhOperationsProvider.notifier).addOperation(
        type: type,
        date: result.date ?? DateTime.now(),
        amount: result.amount!,
        createdBy: user.id,
        counterpartyName: result.counterparty,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Операция создана'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _processing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Сканировать чек'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!_aiService.isAvailable)
              Container(
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber, color: Colors.orange.shade700),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'AI не настроен. Добавьте GEMINI_API_KEY в index.html (получите ключ на aistudio.google.com/apikey)',
                        style: TextStyle(fontSize: 13, color: Colors.orange.shade900),
                      ),
                    ),
                  ],
                ),
              ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Icon(
                      Icons.document_scanner_outlined,
                      size: 64,
                      color: AppConstants.primaryColor,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Сфотографируйте чек или накладную',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _aiService.isAvailable
                          ? 'AI извлечёт сумму, дату и контрагента'
                          : 'Настройте GEMINI_API_KEY для работы',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: AppConstants.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 52,
              child: ElevatedButton.icon(
                onPressed: (_processing || !_aiService.isAvailable) ? null : _pickAndProcess,
                icon: _processing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.photo_library),
                label: Text(_processing ? 'Обработка...' : 'Выбрать фото'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppConstants.primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(Icons.error_outline, color: Colors.red.shade700),
                    const SizedBox(width: 12),
                    Expanded(child: Text(_error!, style: TextStyle(color: Colors.red.shade700))),
                  ],
                ),
              ),
            ],
            if (_result != null) ...[
              const SizedBox(height: 24),
              const Text('Распознанные данные', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              _ResultCard(result: _result!),
              const SizedBox(height: 16),
              SizedBox(
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _result!.amount != null ? _createOperation : null,
                  icon: const Icon(Icons.check),
                  label: const Text('Создать операцию'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  final OcrResult result;

  const _ResultCard({required this.result});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _row('Сумма', result.amount != null ? '${result.amount!.toStringAsFixed(0)} UZS' : '—'),
            _row('Дата', result.date != null ? '${result.date!.day}.${result.date!.month}.${result.date!.year}' : '—'),
            _row('Контрагент', result.counterparty ?? '—'),
            _row('Категория', result.category ?? '—'),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 100, child: Text(label, style: TextStyle(color: AppConstants.textSecondary, fontSize: 13))),
        Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500))),
      ],
    ),
  );
}
