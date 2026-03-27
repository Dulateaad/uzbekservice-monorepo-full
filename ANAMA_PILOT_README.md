# Anama — Flutter Web пилот

## Сборка и запуск

Пилот по умолчанию подхватывает общий [`web/index.html`](web/index.html) приложения **ODO.UZ** (заставка «ODO.UZ», синий фон, manifest ODO). Для Anama используйте копии из [`web_anama/`](web_anama/).

**Локально (Chrome):**

```bash
flutter pub get
./scripts/run_anama_web.sh
```

**Прод-сборка и деплой Hosting:**

```bash
./scripts/deploy_anama_hosting.sh
```

Или вручную:

```bash
./scripts/build_anama_web.sh
firebase deploy --only hosting:anama-app --project anama-app
```

**Важно:** не собирайте пилот командой вроде `flutter build web -t lib/main_anama_pilot.dart --output build/web_anama` без скрипта — Flutter возьмёт [`web/index.html`](web/index.html) **ODO** (Twilio, Turnstile, Google Maps, заставка ODO), и именно это вы увидите на `anama-app.web.app`.

Скрипты временно подменяют `web/index.html`, `web/manifest.json`, `web/favicon.png` и файлы в `web/icons/` копиями из [`web_anama/`](web_anama/) (иконки генерируются скриптом [`scripts/gen_anama_web_assets.py`](scripts/gen_anama_web_assets.py), при желании замените на свои PNG), затем всё восстанавливается.

### Если в консоли «share-modal.js» / `addEventListener` на `null`

Это почти всегда **расширение браузера** (не код приложения). Отключите расширения для вкладки с пилотом или проверьте в режиме инкогнито без расширений.

### Ошибка Flutter `prepareServiceWorker took more…`

Сборка пилота идёт с `--pwa-strategy=none`, чтобы реже ловить таймаут SW на медленной сети.

После деплоя:

- **Главная (Anama Web):** `https://anama-app.web.app/`
- **Ссылка только на пилот:** `https://anama-app.web.app/pilot`  
  Старые пути `/anama/...` редиректятся на `/pilot/...`.

Объединение опроса и пульса — callable **`anamaMergePilotSession`** в регионе **us-central1**:

```bash
cd functions && npm run build && cd .. && firebase deploy --only functions:anamaMergePilotSession --project anama-app
```

## Конфигурация Firebase (anama-app)

1. **Файл:** в [Firebase Console](https://console.firebase.google.com/) откройте проект **anama-app** → шестерёнка **Project settings** → вкладка **General** → блок **Your apps**.

   **Важно:** если у вас зарегистрированы только Android и iOS, для пилота в браузере всё равно нужно **добавить приложение Web**: **Add app** → иконка **`</>` Web** → зарегистрировать. Конфиг из `google-services.json` / iOS plist **не заменяет** веб-конфиг: Flutter Web использует те же поля, что в объекте `firebaseConfig` для Web.

   Скопируйте `apiKey`, `appId`, `messagingSenderId`, `projectId`, `authDomain`, `storageBucket` в `assets/config/anama_web_config.json` (шаблон: `anama_web_config.example.json`). Поле `databaseURL` возьмите из **Realtime Database** (например `https://anama-app-default-rtdb.firebaseio.com`).

2. **Без правки файла (локально):** передайте те же значения через `--dart-define` (они перекрывают JSON):

```bash
flutter run -d chrome -t lib/main_anama_pilot.dart \
  --dart-define=ANAMA_WEB_API_KEY=ВАШ_API_KEY \
  --dart-define=ANAMA_WEB_APP_ID=1:xxxx:web:xxxx \
  --dart-define=ANAMA_MESSAGING_SENDER_ID=123456789 \
  --dart-define=ANAMA_PROJECT_ID=anama-app \
  --dart-define=ANAMA_AUTH_DOMAIN=anama-app.firebaseapp.com \
  --dart-define=ANAMA_STORAGE_BUCKET=anama-app.firebasestorage.app \
  --dart-define=ANAMA_DATABASE_URL=https://anama-app-default-rtdb.firebaseio.com
```

Для `flutter build web` используйте те же `--dart-define=...`, иначе в релизной сборке снова возьмётся только JSON.

3. В консоли **anama-app**: включите **Anonymous** в Authentication, **Realtime Database**, **Cloud Firestore**.
4. Задеплойте правила: `firebase deploy --only firestore:rules,database --project anama-app`
5. Задеплойте функцию: `firebase deploy --only functions:anamaMergePilotSession --project anama-app`  
   (или полный `functions` на этот проект.)

Функция `anamaMergePilotSession` должна жить в **том же проекте**, где включён RTDB, иначе чтение `admin.database()` не сработает без отдельной инициализации.

## Документы

- Контракт для ESP32: [TECH_SPEC_ESP32_ANAMA_RTDB.md](TECH_SPEC_ESP32_ANAMA_RTDB.md)
- Пояснение открытых правил RTDB: [database.rules.PILOT_NOTE.md](database.rules.PILOT_NOTE.md)
- Статическая политика для хостинга: [web/anama-pilot-privacy.html](web/anama-pilot-privacy.html)
