import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../constants/app_constants.dart';

class BusinessHubWebViewScreen extends StatefulWidget {
  const BusinessHubWebViewScreen({super.key});

  static const String businessHubUrl = 'https://business.odo.uz'; // URL Business Hub

  @override
  State<BusinessHubWebViewScreen> createState() => _BusinessHubWebViewScreenState();
}

class _BusinessHubWebViewScreenState extends State<BusinessHubWebViewScreen> {
  late final WebViewController _controller;
  double _progress = 0.0;

  @override
  void initState() {
    super.initState();

    if (!kIsWeb) {
      _controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.white)
        ..setNavigationDelegate(
          NavigationDelegate(
            onProgress: (progress) {
              setState(() {
                _progress = progress / 100;
              });
            },
          ),
        )
        ..loadRequest(Uri.parse(BusinessHubWebViewScreen.businessHubUrl));
    } else {
      _openInBrowser();
    }
  }

  Future<void> _openInBrowser() async {
    final uri = Uri.parse(BusinessHubWebViewScreen.businessHubUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Business Hub'),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppConstants.spacingLG),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.business_center,
                  size: 64,
                  color: AppConstants.primaryColor,
                ),
                const SizedBox(height: 24),
                Text(
                  'Business Hub',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Веб-версия открыта в новой вкладке браузера.\n'
                  'Если вкладка не открылась автоматически, нажмите кнопку ниже.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppConstants.textSecondary,
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: _openInBrowser,
                  icon: const Icon(Icons.open_in_new),
                  label: const Text('Открыть Business Hub'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Business Hub'),
        bottom: _progress > 0 && _progress < 1
            ? PreferredSize(
                preferredSize: const Size.fromHeight(3),
                child: LinearProgressIndicator(
                  value: _progress,
                  backgroundColor: AppConstants.borderColor,
                  valueColor: const AlwaysStoppedAnimation<Color>(
                    AppConstants.primaryColor,
                  ),
                ),
              )
            : null,
      ),
      body: WebViewWidget(controller: _controller),
    );
  }
}

