// Basic Flutter widget test for ODO.UZ app

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:odo_uz_app/main.dart';

void main() {
  testWidgets('App launches successfully', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: UzbekistanServiceApp(),
      ),
    );

    // Wait for the app to initialize
    await tester.pumpAndSettle();

    // Verify that the app has loaded
    // (This is a basic smoke test - adjust based on your app's initial screen)
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
