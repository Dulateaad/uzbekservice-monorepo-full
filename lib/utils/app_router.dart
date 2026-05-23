import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/firestore_models.dart';
import '../models/business_hub/operation.dart';
import '../providers/firestore_auth_provider.dart';
import '../config/firebase_config.dart';
import '../screens/splash_screen.dart';
import '../screens/onboarding/splash_screen.dart' as onboarding;
import '../screens/onboarding/onboarding_screen.dart';
import '../screens/auth/phone_auth_screen.dart';
import '../screens/auth/beautiful_login_screen.dart';
import '../screens/auth/sms_verification_screen.dart';
import '../screens/auth/create_profile_screen.dart';
import '../screens/auth/oneid_auth_screen.dart';
import '../screens/auth/specialist_registration_screen.dart';
import '../screens/auth/specialist_oneid_login_screen.dart';
import '../screens/auth/onboarding_intent_screen.dart';
import '../screens/auth/intent_selection_screen.dart';
import '../screens/main/main_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/home/new_client_home_screen.dart';
import '../screens/home/categories_screen.dart';
import '../screens/search/search_screen.dart';
import '../screens/specialist/specialist_detail_screen.dart';
import '../screens/specialist/enhanced_specialist_detail_screen.dart';
import '../screens/booking/service_selection_screen.dart';
import '../screens/booking/date_time_screen.dart';
import '../screens/booking/address_screen.dart';
import '../screens/booking/confirmation_screen.dart';
import '../screens/booking/success_screen.dart';
import '../screens/chat/chat_list_screen.dart';
import '../screens/chat/chat_screen.dart';
import '../screens/maps/maps_screen.dart';
import '../screens/maps/find_nearby_screen.dart';
import '../screens/orders/orders_screen.dart';
import '../screens/specialist/specialist_list_screen.dart';
import '../screens/specialist/specialist_detail_screen.dart';
import '../screens/order/order_creation_screen.dart';
import '../screens/order/order_detail_screen.dart';
import '../screens/order/order_history_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/profile/specialist_profile_screen.dart';
import '../screens/profile/edit_profile_screen.dart';
import '../screens/profile/fixed_edit_profile_screen.dart';
import '../screens/profile/favorites_screen.dart';
import '../screens/profile/payment_methods_screen.dart';
import '../screens/analytics/city_ratings_screen.dart';
import '../screens/payment/payment_selection_screen.dart';
import '../screens/payment/click_payment_screen.dart';
import '../screens/payment/payment_success_screen.dart';
import '../screens/legal/privacy_policy_screen.dart';
import '../screens/legal/terms_of_service_screen.dart';
import '../screens/tools/tool_detail_screen.dart';
import '../screens/services/services_screen.dart';
import '../screens/business_hub/bh_main_screen.dart';
import '../screens/business_hub/onboarding/bh_onboarding_screen.dart';
import '../screens/business_hub/onboarding/bh_core_flow_wizard_screen.dart';
import '../screens/business_hub/operations/bh_operations_list_screen.dart';
import '../screens/business_hub/operations/bh_operation_form_screen.dart';
import '../screens/business_hub/counterparties/bh_counterparties_screen.dart';
import '../screens/business_hub/reports/bh_reports_screen.dart';
import '../screens/business_hub/ocr/bh_ocr_scan_screen.dart';
import '../screens/business_hub/tax/bh_tax_screen.dart';
import '../screens/business_hub/hr/bh_hr_screen.dart';
import '../screens/business_hub/members/bh_members_screen.dart';
import '../screens/business_hub/import/bh_import_screen.dart';
import '../screens/business_hub/tasks/bh_tasks_screen.dart';
import '../screens/business_hub/crm/bh_crm_screen.dart';
import '../screens/business_hub/crm/bh_crm_extras_screens.dart';
import '../screens/business_hub/crm/bh_lead_detail_screen.dart';
import '../screens/business_hub/crm/bh_deal_detail_screen.dart';
import '../models/business_hub/lead.dart';
import '../models/business_hub/deal.dart';
import '../models/work.dart';
import '../screens/business_hub/work/bh_works_screen.dart';
import '../screens/business_hub/work/bh_work_detail_screen.dart';
import '../screens/business_hub/finance/bh_finance_hub_screen.dart';
import '../screens/business_hub/finance/bh_accounting_screen.dart';
import '../screens/vacancy/vacancy_list_screen.dart';
import '../screens/vacancy/vacancy_detail_screen.dart';
import '../screens/vacancy/create_vacancy_screen.dart';
import '../screens/vacancy/company_dashboard_screen.dart';
import '../screens/vacancy/my_applications_screen.dart';
import '../screens/service_ads/my_service_ads_screen.dart';
import '../screens/service_ads/create_service_ad_screen.dart';
import '../services/analytics_service.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/intent-selection',
    observers: [AnalyticsService.observer],
    redirect: (context, state) {
      final container = ProviderScope.containerOf(context);
      final authState = container.read(firestoreAuthProvider);
      
      print('Redirect check: path=${state.uri.path}, firestoreAuth=${authState.isAuthenticated}, isLoading=${authState.isLoading}');
      
      // Не редиректим пока идет загрузка
      if (authState.isLoading) {
        print('Skipping redirect - loading in progress');
        return null;
      }
      
      // Используем только Firestore Auth (Firebase Auth удален)
      final isAuthenticated = authState.isAuthenticated;
      
      // Если пользователь не аутентифицирован и не на экранах аутентификации или онбординга
      // Исключаем публичные маршруты: vacancy (список вакансий доступен всем)
      if (!isAuthenticated && 
          !state.uri.path.startsWith('/auth') && 
          state.uri.path != '/splash' &&
          state.uri.path != '/onboarding' &&
          state.uri.path != '/intent-selection' &&
          !state.uri.path.startsWith('/vacancy')) {
        print('Redirecting to /intent-selection - user not authenticated');
        return '/intent-selection';
      }
      
      // Аутентифицированный пользователь на create-profile — всегда на главную
      // (профиль уже есть в Firestore, редактирование в разделе «Профиль»)
      if (isAuthenticated && state.uri.path == '/auth/create-profile') {
        print('Redirecting to /home - authenticated user, skip create-profile');
        return '/home';
      }
      
      // Разрешаем доступ к экранам аутентификации для неаутентифицированных пользователей
      if (!isAuthenticated && state.uri.path.startsWith('/auth')) {
        return null;
      }
      
      // Если пользователь полностью аутентифицирован и на экране аутентификации (кроме /auth/sms для завершения верификации)
      if (isAuthenticated && state.uri.path.startsWith('/auth') && state.uri.path != '/auth/sms') {
        print('Redirecting to /home - user authenticated but on auth screen');
        return '/home';
      }
      
      return null;
    },
    routes: [
      // Splash Screen
      GoRoute(
        path: '/splash',
        builder: (context, state) => const onboarding.SplashScreen(),
      ),
      
      // Intent Selection (новый первый экран)
      GoRoute(
        path: '/intent-selection',
        builder: (context, state) => const IntentSelectionScreen(),
      ),
      
      // Onboarding
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      
      // Auth Routes
      GoRoute(
        path: '/auth/phone',
        builder: (context, state) {
          // Получаем intent из extra
          final extra = state.extra as Map<String, dynamic>?;
          return BeautifulLoginScreen(
            intentId: extra?['intent'] as String?,
            role: extra?['role'] as String?,
          );
        },
      ),
      GoRoute(
        path: '/auth/onboarding-intent',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return OnboardingIntentScreen(
            userType: extra?['userType'] ?? 'client',
            phoneNumber: extra?['phoneNumber'] ?? '',
            name: extra?['name'],
            isRegistration: extra?['isRegistration'] ?? false,
          );
        },
      ),
      GoRoute(
        path: '/auth/sms',
        builder: (context, state) {
          // Поддерживаем как старый формат (String), так и новый (Map)
          String phoneNumber = '';
          String? verificationId;
          String? name;
          String? userType;
          List<String>? intents;
          Map<String, String>? answers;
          
          if (state.extra is Map) {
            final extra = state.extra as Map<String, dynamic>;
            phoneNumber = extra['phoneNumber'] as String? ?? '';
            verificationId = extra['verificationId'] as String?;
            name = extra['name'] as String?;
            userType = extra['userType'] as String?;
            intents = extra['intents'] != null 
                ? List<String>.from(extra['intents']) 
                : null;
            answers = extra['answers'] != null
                ? Map<String, String>.from(extra['answers'])
                : null;
          } else if (state.extra is String) {
            phoneNumber = state.extra as String;
          }
          
          return SmsVerificationScreen(
            phoneNumber: phoneNumber,
            verificationId: verificationId,
            name: name,
            userType: userType,
            intents: intents,
            answers: answers,
          );
        },
      ),
      GoRoute(
        path: '/auth/oneid',
        builder: (context, state) {
          final phoneNumber = state.extra as String?;
          return OneIdAuthScreen(phoneNumber: phoneNumber ?? '');
        },
      ),
      GoRoute(
        path: '/auth/oneid/callback',
        builder: (context, state) {
          final code = state.uri.queryParameters['code'];
          final stateParam = state.uri.queryParameters['state'];
          final phoneNumber = state.extra as String?;
          return OneIdAuthScreen(
            phoneNumber: phoneNumber ?? '',
            code: code,
            state: stateParam,
          );
        },
      ),
      GoRoute(
        path: '/auth/create-profile',
        builder: (context, state) => const CreateProfileScreen(),
      ),
      GoRoute(
        path: '/auth/specialist-registration',
        builder: (context, state) => const SpecialistRegistrationScreen(),
      ),
      GoRoute(
        path: '/auth/specialist-oneid-login',
        builder: (context, state) => const SpecialistOneIdLoginScreen(),
      ),
      
      // Vacancy routes (публичные, доступны без авторизации)
      GoRoute(
        path: '/vacancy',
        builder: (context, state) => const VacancyListScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return VacancyDetailScreen(vacancyId: id);
            },
          ),
          GoRoute(
            path: 'create',
            builder: (context, state) => const CreateVacancyScreen(),
          ),
          GoRoute(
            path: 'applications',
            builder: (context, state) => const MyApplicationsScreen(),
          ),
        ],
      ),
      
      // Main App Routes
      GoRoute(
        path: '/home',
        builder: (context, state) => const MainScreen(),
        routes: [
          // Categories
          GoRoute(
            path: 'categories',
            builder: (context, state) => const CategoriesScreen(),
          ),
          
          // Search
          GoRoute(
            path: 'search',
            builder: (context, state) => const SearchScreen(),
          ),

          // Все специалисты (без категории) — совпадает с context.go('/home/specialists')
          GoRoute(
            path: 'specialists',
            builder: (context, state) => const SpecialistListScreen(categoryId: 'all'),
          ),

            // Specialists по категории
            GoRoute(
              path: 'specialists/:categoryId',
              builder: (context, state) {
                final categoryId = state.pathParameters['categoryId']!;
                return SpecialistListScreen(categoryId: categoryId);
              },
            ),

            // Specialist Detail
            GoRoute(
              path: 'specialist/:specialistId',
              builder: (context, state) {
                final specialistId = state.pathParameters['specialistId']!;
                // Используем улучшенный экран с табами
                return EnhancedSpecialistDetailScreen(specialistId: specialistId);
              },
            ),

            // Booking Flow
            GoRoute(
              path: 'booking/service-selection/:specialistId',
              builder: (context, state) {
                final specialistId = state.pathParameters['specialistId']!;
                return ServiceSelectionScreen(specialistId: specialistId);
              },
            ),
            GoRoute(
              path: 'booking/date-time/:specialistId',
              builder: (context, state) {
                final specialistId = state.pathParameters['specialistId']!;
                return DateTimeScreen(specialistId: specialistId);
              },
            ),
            GoRoute(
              path: 'booking/address/:specialistId',
              builder: (context, state) {
                final specialistId = state.pathParameters['specialistId']!;
                return AddressScreen(specialistId: specialistId);
              },
            ),
            GoRoute(
              path: 'booking/confirmation/:specialistId',
              builder: (context, state) {
                final specialistId = state.pathParameters['specialistId']!;
                return ConfirmationScreen(specialistId: specialistId);
              },
            ),
            GoRoute(
              path: 'booking/success/:specialistId',
              builder: (context, state) {
                final specialistId = state.pathParameters['specialistId']!;
                final order = state.extra as FirestoreOrder?;
                if (order == null) {
                  return const Scaffold(
                    body: Center(
                      child: Text('Заказ не найден'),
                    ),
                  );
                }
                return BookingSuccessScreen(
                  specialistId: specialistId,
                  order: order,
                );
              },
            ),
          
          // Orders
          GoRoute(
            path: 'order-create/:specialistId',
            redirect: (context, state) =>
                '/home/order/create/${state.pathParameters['specialistId']!}',
          ),
          GoRoute(
            path: 'order/create/:specialistId',
            builder: (context, state) {
              final specialistId = state.pathParameters['specialistId']!;
              return OrderCreationScreen(specialistId: specialistId);
            },
          ),
          GoRoute(
            path: 'order/:orderId',
            builder: (context, state) {
              final orderId = state.pathParameters['orderId']!;
              return OrderDetailScreen(orderId: orderId);
            },
          ),
          GoRoute(
            path: 'orders',
            builder: (context, state) => const OrdersScreen(),
          ),

          // Maps
          GoRoute(
            path: 'maps',
            builder: (context, state) => const MapsScreen(),
          ),
          GoRoute(
            path: 'maps/find-nearby',
            builder: (context, state) => const FindNearbyScreen(),
          ),
          
          // Chats
          GoRoute(
            path: 'chats',
            builder: (context, state) => const ChatListScreen(),
          ),
          GoRoute(
            path: 'chat/:chatId',
            builder: (context, state) {
              final chatId = state.pathParameters['chatId']!;
              return ChatScreen(chatId: chatId);
            },
          ),
          // Services
          GoRoute(
            path: 'services',
            builder: (context, state) => const ServicesScreen(),
            routes: [
              GoRoute(
                path: 'business-hub',
                builder: (context, state) => const BHMainScreen(),
                routes: [
                  GoRoute(
                    path: 'onboarding',
                    builder: (context, state) => const BHOnboardingScreen(),
                  ),
                  GoRoute(
                    path: 'core-onboarding',
                    builder: (context, state) => const BHCoreFlowWizardScreen(),
                  ),
                  GoRoute(
                    path: 'operations',
                    builder: (context, state) => const BHOperationsListScreen(),
                  ),
                  GoRoute(
                    path: 'operation/new',
                    builder: (context, state) => const BHOperationFormScreen(),
                  ),
                  GoRoute(
                    path: 'operation/:id',
                    builder: (context, state) {
                      final op = state.extra as BHOperation?;
                      return BHOperationFormScreen(existing: op);
                    },
                  ),
                  GoRoute(
                    path: 'counterparties',
                    builder: (context, state) => const BHCounterpartiesScreen(),
                  ),
                  GoRoute(
                    path: 'reports',
                    builder: (context, state) => const BHReportsScreen(),
                  ),
                  GoRoute(
                    path: 'ocr-scan',
                    builder: (context, state) => const BHOcrScanScreen(),
                  ),
                  GoRoute(
                    path: 'tax',
                    builder: (context, state) => const BHTaxScreen(),
                  ),
                  GoRoute(
                    path: 'hr',
                    builder: (context, state) => const BHHRScreen(),
                  ),
                  GoRoute(
                    path: 'members',
                    builder: (context, state) => const BHMembersScreen(),
                  ),
                  GoRoute(
                    path: 'import',
                    builder: (context, state) => const BHImportScreen(),
                  ),
                  GoRoute(
                    path: 'tasks',
                    builder: (context, state) => const BHTasksScreen(),
                  ),
                  GoRoute(
                    path: 'crm',
                    builder: (context, state) {
                      final tab = state.uri.queryParameters['tab'];
                      var idx = 0;
                      if (tab == 'leads') {
                        idx = 1;
                      } else if (tab == 'deals') {
                        idx = 2;
                      } else if (tab == 'tasks') {
                        idx = 3;
                      }
                      return BHCRMScreen(initialTabIndex: idx);
                    },
                    routes: [
                      GoRoute(
                        path: 'companies',
                        builder: (context, state) => const BHCrmCompaniesScreen(),
                      ),
                      GoRoute(
                        path: 'contacts',
                        builder: (context, state) => const BHCrmContactsScreen(),
                      ),
                      GoRoute(
                        path: 'products',
                        builder: (context, state) => const BHCrmProductsScreen(),
                      ),
                      GoRoute(
                        path: 'subscriptions',
                        builder: (context, state) => const BHCrmSubscriptionsScreen(),
                      ),
                      GoRoute(
                        path: 'notifications',
                        builder: (context, state) => const BHCrmNotificationsScreen(),
                      ),
                      GoRoute(
                        path: 'pipelines',
                        builder: (context, state) => const BHCrmPipelinesScreen(),
                      ),
                      GoRoute(
                        path: 'lead/:id',
                        builder: (context, state) {
                          final lead = state.extra as BHLead;
                          return BHLeadDetailScreen(lead: lead);
                        },
                      ),
                      GoRoute(
                        path: 'deal/:id',
                        builder: (context, state) {
                          final deal = state.extra as BHDeal;
                          return BHDealDetailScreen(deal: deal);
                        },
                      ),
                    ],
                  ),
                  GoRoute(
                    path: 'works',
                    builder: (context, state) => const BHWorksScreen(),
                    routes: [
                      GoRoute(
                        path: 'detail',
                        builder: (context, state) {
                          final w = state.extra as Work;
                          return BHWorkDetailScreen(work: w);
                        },
                      ),
                    ],
                  ),
                  GoRoute(
                    path: 'finance',
                    builder: (context, state) => const BHFinanceHubScreen(),
                  ),
                  GoRoute(
                    path: 'accounting',
                    builder: (context, state) => const BHAccountingScreen(),
                  ),
                ],
              ),
              GoRoute(
                path: 'odo-vacancy',
                builder: (context, state) => const VacancyListScreen(),
              ),
            ],
          ),
          // Company dashboard
          GoRoute(
            path: 'company/dashboard',
            builder: (context, state) => const CompanyDashboardScreen(),
          ),
          // Tool / item detail
          GoRoute(
            path: 'tool-detail',
            builder: (context, state) {
              final item = state.extra as FirestoreToolItem;
              return ToolDetailScreen(item: item);
            },
          ),
          
          // Profile
          GoRoute(
            path: 'profile',
            builder: (context, state) => const ProfileScreen(),
            routes: [
              GoRoute(
                path: 'edit',
                builder: (context, state) => const EditProfileScreen(),
              ),
          GoRoute(
            path: 'edit-with-photo',
            builder: (context, state) => const FixedEditProfileScreen(),
          ),
              GoRoute(
                path: 'specialist',
                builder: (context, state) => const SpecialistProfileScreen(),
              ),
              GoRoute(
                path: 'favorites',
                builder: (context, state) => const FavoritesScreen(),
              ),
              GoRoute(
                path: 'payment-methods',
                builder: (context, state) => const PaymentMethodsScreen(),
              ),
              GoRoute(
                path: 'analytics-city-ratings',
                builder: (context, state) => const CityRatingsScreen(),
              ),
              GoRoute(
                path: 'service-ads',
                builder: (context, state) => const MyServiceAdsScreen(),
                routes: [
                  GoRoute(
                    path: 'create',
                    builder: (context, state) {
                      final ad = state.extra as ServiceAd?;
                      return CreateServiceAdScreen(existingAd: ad);
                    },
                  ),
                ],
              ),
            ],
          ),
          
          // Legal
          GoRoute(
            path: 'privacy-policy',
            builder: (context, state) => const PrivacyPolicyScreen(),
          ),
          GoRoute(
            path: 'terms-of-service',
            builder: (context, state) => const TermsOfServiceScreen(),
          ),
        ],
      ),
      
      // Payment Routes
      GoRoute(
        path: '/payment/select',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return PaymentSelectionScreen(
            orderId: extra?['orderId'] ?? '',
            amount: (extra?['amount'] ?? 0).toDouble(),
            specialistName: extra?['specialistName'] ?? '',
          );
        },
      ),
      GoRoute(
        path: '/payment/click',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return ClickPaymentScreen(
            orderId: extra?['orderId'] ?? '',
            amount: (extra?['amount'] ?? 0).toDouble(),
            specialistName: extra?['specialistName'] ?? '',
          );
        },
      ),
      GoRoute(
        path: '/payment/success',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return PaymentSuccessScreen(
            orderId: extra?['orderId'] ?? '',
            paymentMethod: extra?['paymentMethod'] ?? 'click',
            amount: extra?['amount']?.toDouble(),
          );
        },
      ),
      
      // Orders direct route
      GoRoute(
        path: '/orders/:orderId',
        builder: (context, state) {
          final orderId = state.pathParameters['orderId']!;
          return OrderDetailScreen(orderId: orderId);
        },
      ),
      
      // Specialist direct route (для совместимости)
      GoRoute(
        path: '/specialist/:specialistId',
        builder: (context, state) {
          final specialistId = state.pathParameters['specialistId']!;
          return EnhancedSpecialistDetailScreen(specialistId: specialistId);
        },
      ),
      
      // Chat direct route
      GoRoute(
        path: '/chat/:chatId',
        builder: (context, state) {
          final chatId = state.pathParameters['chatId']!;
          return ChatScreen(chatId: chatId);
        },
      ),
    ],
    errorBuilder: (context, state) => _ErrorScreen(state: state),
  );
}

/// Экран ошибки с возможностью копирования
class _ErrorScreen extends StatelessWidget {
  final GoRouterState state;

  const _ErrorScreen({required this.state});

  @override
  Widget build(BuildContext context) {
    final errorInfo = '''
🚨 ОШИБКА НАВИГАЦИИ

📍 Путь: ${state.uri.path}
🔗 Полный URL: ${state.uri}
📦 Query параметры: ${state.uri.queryParameters}
🏷️ Path параметры: ${state.pathParameters}
📝 Extra данные: ${state.extra}
⚠️ Ошибка: ${state.error}

📱 Время: ${DateTime.now()}
''';

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: Colors.red.shade600,
        title: const Text(
          'Ошибка',
          style: TextStyle(color: Colors.white),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.home, color: Colors.white),
          onPressed: () => context.go('/home'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.copy, color: Colors.white),
            onPressed: () => _copyError(context, errorInfo),
            tooltip: 'Копировать ошибку',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Иконка ошибки
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.error_outline,
                size: 64,
                color: Colors.red.shade400,
              ),
            ),
            const SizedBox(height: 24),
            
            // Заголовок
            Text(
              'Страница не найдена',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: Colors.red.shade700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            
            Text(
              'Запрошенный путь не существует',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: Colors.grey.shade600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            
            // Детали ошибки
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline, 
                        size: 20, 
                        color: Colors.grey.shade600,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Детали ошибки',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  _buildInfoRow('Путь', state.uri.path),
                  _buildInfoRow('Полный URL', state.uri.toString()),
                  if (state.uri.queryParameters.isNotEmpty)
                    _buildInfoRow('Query', state.uri.queryParameters.toString()),
                  if (state.pathParameters.isNotEmpty)
                    _buildInfoRow('Path параметры', state.pathParameters.toString()),
                  if (state.extra != null)
                    _buildInfoRow('Extra', state.extra.toString()),
                  if (state.error != null)
                    _buildInfoRow('Ошибка', state.error.toString()),
                ],
              ),
            ),
            const SizedBox(height: 24),
            
            // Кнопка копирования
            ElevatedButton.icon(
              onPressed: () => _copyError(context, errorInfo),
              icon: const Icon(Icons.copy),
              label: const Text('Скопировать ошибку'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 12),
            
            // Кнопка на главную
            ElevatedButton.icon(
              onPressed: () => context.go('/home'),
              icon: const Icon(Icons.home),
              label: const Text('На главную'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 12),
            
            // Кнопка назад
            OutlinedButton.icon(
              onPressed: () {
                if (Navigator.canPop(context)) {
                  Navigator.pop(context);
                } else {
                  context.go('/home');
                }
              },
              icon: const Icon(Icons.arrow_back),
              label: const Text('Назад'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade500,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          SelectableText(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontFamily: 'monospace',
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  void _copyError(BuildContext context, String errorInfo) {
    Clipboard.setData(ClipboardData(text: errorInfo));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.white),
            SizedBox(width: 12),
            Text('Ошибка скопирована в буфер обмена'),
          ],
        ),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }
}
