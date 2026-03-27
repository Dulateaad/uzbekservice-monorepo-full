# QA-отчёт: Основное приложение ODO.UZ

## 1. Точка входа и роутинг

| Аспект | Статус | Комментарий |
|--------|--------|-------------|
| initialLocation | ✅ | `/intent-selection` |
| redirect при неавторизованном | ✅ | → `/intent-selection` |
| redirect при авторизованном на /auth | ✅ | → `/home` |
| Публичные маршруты | ✅ | `/vacancy` доступен без auth |
| `/auth/sms` | ✅ | Исключён из redirect (верификация) |

## 2. Флоу аутентификации

### 2.1. Intent Selection → Auth
1. Intent Selection → выбор цели (клиент, специалист, компания и т.д.)
2. `context.go('/auth/phone', extra: {intent, role})`
3. BeautifulLoginScreen — ввод телефона, отправка SMS
4. SmsVerificationScreen — ввод кода
5. После успеха: `/auth/create-profile` (новый) или `/home` (есть профиль)

### 2.2. Провайдеры

| Провайдер | Использование | Проблема |
|-----------|----------------|----------|
| firestoreAuthProvider | Роутер, большинство экранов | ✅ Основной |
| authProvider | Splash (legacy), home_screen, beautiful_home_screen, specialist_profile_screen, edit_profile_with_photo_screen | ⚠️ Не синхронизирован с auth flow |

**authProvider** — старый провайдер (UserModel, SimpleSmsService). Текущий auth flow использует **firestoreAuthProvider**. Экраны с authProvider могут показывать пустые/неверные данные.

## 3. MainScreen и навигация

| Роль | Экраны | Источник |
|------|--------|----------|
| client | NewClientHomeScreen, Favorites, Services, Chat, Profile, Orders | ✅ |
| specialist | SpecialistHomeScreen, MyTools, Services, Chat, Profile, Orders | ✅ |
| company | BHMainScreen, CompanyDashboard, Services, Profile | ✅ |

## 4. Дублирование и неиспользуемый код

- **HomeScreen**, **BeautifulHomeScreen**, **ClientHomeScreen** — не используются в MainScreen (используется NewClientHomeScreen)
- **SpecialistHomeScreen** — два варианта: `home/specialist_home_screen.dart` и `specialist/specialist_home_screen.dart`; MainScreen импортирует из `home/`
- **SplashScreen** (lib/screens/splash_screen.dart) — использует authProvider; в роутере используется onboarding.SplashScreen (без auth)

## 5. Критичные проблемы

### 5.1. SpecialistProfileScreen — authProvider
- Маршрут: `/profile/specialist`
- Использует `authProvider` — user будет null при авторизации через firestore
- **Рекомендация:** заменить на `firestoreAuthProvider`

### 5.2. Print в production
- В `app_router.dart` redirect: `print('Redirect check...')` — лишний вывод в консоль
- В `profile_screen.dart`: `print('🔐 Кнопка "Войти" нажата')` и др.

### 5.3. _openBusinessHub — устаревший URL
- В MainScreen: `https://studio--studio-122846357-42699.us-central1.hosted.app/`
- Актуальный: `https://odo-business-hub.web.app`
- Кнопка закомментирована/удалена, но метод остался

## 6. Флоу создания заказа

1. NewClientHomeScreen → поиск/категория
2. Поиск специалистов → SpecialistDetail
3. Service selection → Date/Time → Address → Confirmation
4. Success → Orders

## 7. Заказы (OrdersScreen)

- Использует `firestoreAuthProvider` ✅
- Разделение по ролям: client vs specialist
- Табы: Активные, История, Отменённые

## 8. Профиль (ProfileScreen)

- Использует `firestoreAuthProvider` ✅
- При отсутствии auth — экран «Войти в аккаунт»
- Кнопка «Войти» → `/auth/phone` (но без intent — пользователь может потерять контекст)

## 9. Рекомендации

1. **Заменить authProvider на firestoreAuthProvider** в SpecialistProfileScreen, edit_profile_with_photo_screen
2. **Удалить или заменить** print в redirect и ключевых экранах
3. **Очистить** неиспользуемые HomeScreen, BeautifulHomeScreen, ClientHomeScreen или пометить как deprecated
4. **Проверить** userType `company` — при intent manageBusiness/postVacancy роль `company-hr` или `company-full` маппится в `company` в BeautifulLoginScreen
