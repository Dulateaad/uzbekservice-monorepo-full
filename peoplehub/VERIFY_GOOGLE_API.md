# Исправление 401/403 при верификации (Document AI и Vision API)

Если при загрузке фото для верификации в консоли появляются **401** (Document AI) и **403** (Vision API), сделайте следующее.

## 1. Project ID для Document AI

Document AI в URL принимает **Project ID** (строка, например `taxi-eb8b7`), а не номер проекта (`914129232231`).

**Вариант А.** В `.env` задать ID проекта:
- `VITE_GCP_PROJECT_ID=taxi-eb8b7` (подставьте свой ID из Firebase)

**Вариант Б.** Оставить `VITE_GCP_PROJECT_ID=914129232231`, но обязательно задать:
- `VITE_FIREBASE_PROJECT_ID=taxi-eb8b7`  
Тогда в коде для Document AI будет использоваться ID из Firebase.

Узнать Project ID: [Firebase Console](https://console.firebase.google.com) → ⚙️ Настройки проекта → «ID проекта».

## 2. Включённые API

В [Google Cloud Console](https://console.cloud.google.com/apis/library) для этого проекта включите:

- **Cloud Document AI API**
- **Cloud Vision API**

## 3. Ограничения API-ключа (часто причина 403 Vision)

В [API Keys](https://console.cloud.google.com/apis/credentials) откройте ключ из `VITE_GOOGLE_API_KEY`:

1. **Ограничения приложений**  
   - **403 Forbidden** чаще всего из‑за этого: ключ привязан к домену, а запрос идёт с другого (Telegram Web App, Firebase и т.п.).  
   - Для проверки: поставьте **«Нет»** (без ограничений).  
   - Для продакшена: добавьте свои домены, например:
     - `https://taxi-eb8b7.web.app`
     - `https://*.web.app`
     - при открытии из Telegram может понадобиться `https://*.telegram.org` или оставить «Нет».

2. **Ограничения API**  
   - Либо «Не ограничивать»,  
   - Либо явно включите **Cloud Document AI API** и **Cloud Vision API**.

3. Убедитесь, что ключ создан в том же GCP-проекте, где включены эти API.

После изменений подождите 1–2 минуты и пересоберите/задеплойте приложение с правильным `.env`.
