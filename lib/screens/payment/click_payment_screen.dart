import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../constants/app_constants.dart';
import '../../services/click_payment_service.dart';
import '../../models/payment_model.dart';
import '../../providers/firestore_auth_provider.dart';

class ClickPaymentScreen extends ConsumerStatefulWidget {
  final String orderId;
  final double amount;
  final String specialistName;

  const ClickPaymentScreen({
    super.key,
    required this.orderId,
    required this.amount,
    required this.specialistName,
  });

  @override
  ConsumerState<ClickPaymentScreen> createState() => _ClickPaymentScreenState();
}

class _ClickPaymentScreenState extends ConsumerState<ClickPaymentScreen> {
  late final WebViewController _controller;
  final ClickPaymentService _paymentService = ClickPaymentService();
  
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';
  double _loadingProgress = 0;
  ClickTransaction? _transaction;

  @override
  void initState() {
    super.initState();
    _initPayment();
  }

  Future<void> _initPayment() async {
    try {
      // Получаем текущего пользователя из auth state
      final authState = ref.read(firestoreAuthProvider);
      final user = authState.user;
      
      if (user == null) {
        throw Exception('Пользователь не авторизован');
      }
      
      // Создаем транзакцию
      _transaction = await _paymentService.createTransaction(
        orderId: widget.orderId,
        amount: widget.amount,
        userId: user.id,
      );

      // Получаем URL для оплаты (через серверный endpoint или прямой URL)
      String paymentUrl;
      try {
        // Пытаемся использовать серверный endpoint (рекомендуемый способ)
        paymentUrl = await _paymentService.createPaymentViaServer(
          orderId: widget.orderId,
          amount: widget.amount,
          userId: user.id,
        );
      } catch (e) {
        // Fallback к прямому URL если сервер недоступен
        print('⚠️ Серверный endpoint недоступен, используем прямой URL: $e');
        paymentUrl = _paymentService.getPaymentUrl(
          orderId: widget.orderId,
          amount: widget.amount,
        );
      }

      // Инициализируем WebView
      _controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.white)
        ..setNavigationDelegate(
          NavigationDelegate(
            onProgress: (progress) {
              setState(() {
                _loadingProgress = progress / 100;
              });
            },
            onPageStarted: (url) {
              setState(() {
                _isLoading = true;
              });
            },
            onPageFinished: (url) {
              setState(() {
                _isLoading = false;
              });
              _checkPaymentResult(url);
            },
            onWebResourceError: (error) {
              setState(() {
                _hasError = true;
                _errorMessage = error.description;
                _isLoading = false;
              });
            },
            onNavigationRequest: (request) {
              // Проверяем callback URL
              if (request.url.startsWith('odouzapp://')) {
                _handleCallback(request.url);
                return NavigationDecision.prevent;
              }
              return NavigationDecision.navigate;
            },
          ),
        )
        ..loadRequest(Uri.parse(paymentUrl));

      setState(() {});
    } catch (e) {
      setState(() {
        _hasError = true;
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  void _checkPaymentResult(String url) {
    // Проверяем URL на наличие параметров успешной оплаты
    final uri = Uri.parse(url);
    
    if (url.contains('success') || url.contains('payment_complete')) {
      _onPaymentSuccess();
    } else if (url.contains('error') || url.contains('failed')) {
      final error = uri.queryParameters['error'] ?? 'Ошибка оплаты';
      _onPaymentError(error);
    } else if (url.contains('cancel')) {
      _onPaymentCancelled();
    }
  }

  void _handleCallback(String url) {
    final uri = Uri.parse(url);
    final path = uri.host;
    
    switch (path) {
      case 'success':
        _onPaymentSuccess();
        break;
      case 'error':
        _onPaymentError(uri.queryParameters['message'] ?? 'Ошибка оплаты');
        break;
      case 'cancel':
        _onPaymentCancelled();
        break;
    }
  }

  void _onPaymentSuccess() {
    if (_transaction != null) {
      _paymentService.updatePaymentStatus(
        transactionId: _transaction!.transactionId,
        status: PaymentStatus.completed,
      );
    }

    context.go('/payment/success', extra: {
      'orderId': widget.orderId,
      'paymentMethod': 'click',
      'amount': widget.amount,
    });
  }

  void _onPaymentError(String error) {
    if (_transaction != null) {
      _paymentService.updatePaymentStatus(
        transactionId: _transaction!.transactionId,
        status: PaymentStatus.failed,
        errorMessage: error,
      );
    }

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.radiusLG),
        ),
        title: const Row(
          children: [
            Icon(Icons.error_outline, color: AppConstants.errorColor),
            SizedBox(width: 12),
            Text('Ошибка оплаты'),
          ],
        ),
        content: Text(error),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.pop();
            },
            child: const Text('Отмена'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _initPayment();
            },
            child: const Text('Повторить'),
          ),
        ],
      ),
    );
  }

  void _onPaymentCancelled() {
    if (_transaction != null) {
      _paymentService.cancelPayment(_transaction!.transactionId);
    }
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        backgroundColor: AppConstants.surfaceColor,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: _showCancelDialog,
        ),
        title: Column(
          children: [
            const Text('Оплата через Click'),
            Text(
              '${_formatPrice(widget.amount)} сум',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppConstants.textSecondary,
              ),
            ),
          ],
        ),
        centerTitle: true,
        bottom: _isLoading
            ? PreferredSize(
                preferredSize: const Size.fromHeight(3),
                child: LinearProgressIndicator(
                  value: _loadingProgress > 0 ? _loadingProgress : null,
                  backgroundColor: AppConstants.borderColor,
                  valueColor: const AlwaysStoppedAnimation<Color>(
                    AppConstants.primaryColor,
                  ),
                ),
              )
            : null,
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_hasError) {
      return _buildErrorState();
    }

    if (_transaction == null) {
      return _buildLoadingState();
    }

    return Stack(
      children: [
        WebViewWidget(controller: _controller),
        if (_isLoading && _loadingProgress < 0.9)
          Container(
            color: Colors.white,
            child: _buildLoadingState(),
          ),
      ],
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF00B4E6), Color(0xFF0099CC)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF00B4E6).withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: const Center(
              child: Text(
                'Click',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          const CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00B4E6)),
          ),
          const SizedBox(height: 16),
          Text(
            'Подготовка платежа...',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: AppConstants.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${_formatPrice(widget.amount)} сум',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: AppConstants.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppConstants.spacingXL),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppConstants.errorColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.error_outline,
                size: 50,
                color: AppConstants.errorColor,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Ошибка загрузки',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              _errorMessage,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppConstants.textSecondary,
              ),
            ),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton(
                  onPressed: () => context.pop(),
                  child: const Text('Назад'),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _hasError = false;
                      _errorMessage = '';
                    });
                    _initPayment();
                  },
                  child: const Text('Повторить'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showCancelDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.radiusLG),
        ),
        title: const Text('Отменить оплату?'),
        content: const Text(
          'Вы уверены, что хотите отменить оплату? Вы сможете оплатить позже.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Продолжить оплату'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _onPaymentCancelled();
            },
            style: TextButton.styleFrom(
              foregroundColor: AppConstants.errorColor,
            ),
            child: const Text('Отменить'),
          ),
        ],
      ),
    );
  }

  String _formatPrice(double price) {
    return price.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]} ',
    );
  }
}

