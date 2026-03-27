import 'package:flutter/material.dart';
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;
import '../services/cloudflare_turnstile_service.dart';

/// Web реализация Cloudflare Turnstile
class CloudflareTurnstileWidgetImpl extends StatefulWidget {
  final Function(String token)? onVerified;
  final Function()? onError;
  final double height;
  final String siteKey;
  final Function(String)? onTokenReceived;
  final Function()? onExpired;
  
  const CloudflareTurnstileWidgetImpl({
    super.key,
    this.onVerified,
    this.onError,
    this.height = 65,
    this.siteKey = '',
    this.onTokenReceived,
    this.onExpired,
  });

  @override
  State<CloudflareTurnstileWidgetImpl> createState() => _CloudflareTurnstileWidgetImplState();
}

class _CloudflareTurnstileWidgetImplState extends State<CloudflareTurnstileWidgetImpl> {
  String? _viewId;
  bool _isVerified = false;
  bool _isLoading = true;
  
  @override
  void initState() {
    super.initState();
    _initializeTurnstile();
  }
  
  void _initializeTurnstile() {
    _viewId = 'turnstile-container-${DateTime.now().millisecondsSinceEpoch}';
    
    // Регистрируем view factory
    ui_web.platformViewRegistry.registerViewFactory(
      _viewId!,
      (int viewId) {
        final div = html.DivElement()
          ..id = _viewId!
          ..style.width = '100%'
          ..style.height = '100%'
          ..style.display = 'flex'
          ..style.justifyContent = 'center'
          ..style.alignItems = 'center';
        
        // Рендерим Turnstile после небольшой задержки
        Future.delayed(const Duration(milliseconds: 500), () {
          CloudflareTurnstileService.renderWidget(
            _viewId!,
            onSuccess: (token) {
              if (mounted) {
                setState(() {
                  _isVerified = true;
                  _isLoading = false;
                });
                if (widget.onVerified != null) {
                  widget.onVerified!(token);
                }
                if (widget.onTokenReceived != null) {
                  widget.onTokenReceived!(token);
                }
              }
            },
          );
          
          if (mounted) {
            setState(() {
              _isLoading = false;
            });
          }
        });
        
        return div;
      },
    );
    
    setState(() {});
  }
  
  @override
  Widget build(BuildContext context) {
    if (_viewId == null) {
      return SizedBox(
        height: widget.height,
        child: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }
    
    return Column(
      children: [
        Container(
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: _isVerified ? Colors.green : Colors.grey.shade300,
              width: _isVerified ? 2 : 1,
            ),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: HtmlElementView(viewType: _viewId!),
          ),
        ),
        if (_isVerified) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 16),
              const SizedBox(width: 4),
              Text(
                'Верификация пройдена',
                style: TextStyle(
                  color: Colors.green,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
  
  @override
  void dispose() {
    CloudflareTurnstileService.reset();
    super.dispose();
  }
}

