import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../constants/app_constants.dart';

class OdoVacancyWebViewScreen extends StatefulWidget {
  const OdoVacancyWebViewScreen({super.key});

  static const String vacancyUrl = 'https://odo-vacancy.web.app';

  @override
  State<OdoVacancyWebViewScreen> createState() => _OdoVacancyWebViewScreenState();
}

class _OdoVacancyWebViewScreenState extends State<OdoVacancyWebViewScreen> {
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
            onPageStarted: (String url) {
              // Можно добавить логику при загрузке страницы
            },
            onPageFinished: (String url) {
              // Можно добавить логику после загрузки
            },
          ),
        )
        ..addJavaScriptChannel(
          'FlutterChannel',
          onMessageReceived: (JavaScriptMessage message) {
            // Обработка сообщений от React приложения
            debugPrint('Message from React: ${message.message}');
          },
        )
        ..loadRequest(Uri.parse(OdoVacancyWebViewScreen.vacancyUrl));
    } else {
      _openInBrowser();
    }
  }

  Future<void> _openInBrowser() async {
    final uri = Uri.parse(OdoVacancyWebViewScreen.vacancyUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('ODO Vacancy'),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppConstants.spacingLG),
            child: Text(
              'Веб-версия открыта в новой вкладке браузера.\n'
              'Если вкладка не открылась автоматически, перейдите по адресу:\n'
              '${OdoVacancyWebViewScreen.vacancyUrl}',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('ODO Vacancy'),
        backgroundColor: AppConstants.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        bottom: _progress > 0 && _progress < 1
            ? PreferredSize(
                preferredSize: const Size.fromHeight(3),
                child: LinearProgressIndicator(
                  value: _progress,
                  backgroundColor: AppConstants.borderColor,
                  valueColor: const AlwaysStoppedAnimation<Color>(
                    Colors.white,
                  ),
                ),
              )
            : null,
      ),
      body: WebViewWidget(controller: _controller),
    );
  }
}


