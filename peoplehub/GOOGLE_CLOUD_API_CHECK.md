# Как проверить настройки API в Google Cloud Console

## 1. Выбрать правильный проект

1. Откройте [Google Cloud Console](https://console.cloud.google.com).
2. Вверху страницы нажмите **выбор проекта** (название проекта или «Select a project»).
3. Выберите тот же проект, что и в Firebase (например **taxi-eb8b7**).  
   Важно: в списке должен быть **Project ID** (строка типа `taxi-eb8b7`), не только номер.

---

## 2. Включённые API

1. Перейдите: **APIs & Services** → [**Library**](https://console.cloud.google.com/apis/library) (Библиотека API).
2. В поиске введите **Cloud Vision API** → откройте → нажмите **Enable** (Включить), если ещё не включён.
3. Вернитесь в Library, введите **Document AI API** → откройте → нажмите **Enable**, если ещё не включён.

Проверка: **APIs & Services** → [**Dashboard**](https://console.cloud.google.com/apis/dashboard). В списке «Enabled APIs» должны быть:
- Cloud Vision API  
- Cloud Document AI API  

---

## 3. API-ключ и его ограничения

1. Перейдите: **APIs & Services** → [**Credentials**](https://console.cloud.google.com/apis/credentials) (Учётные данные).
2. В блоке **API Keys** найдите ключ, который прописан у вас в `VITE_GOOGLE_API_KEY` (тот же ключ, что в запросах в консоли браузера).
3. Нажмите на название ключа (или иконку редактирования).

Проверьте:

| Поле | Что проверить |
|------|----------------|
| **Application restrictions** (Ограничения приложений) | Для проверки лучше **None**. Если стоит «HTTP referrers» — добавьте ваш домен, например `https://taxi-eb8b7.web.app/*` или `https://*.web.app/*`. |
| **API restrictions** (Ограничения API) | Либо **Don’t restrict key**, либо «Restrict key» и в списке отмечены **Cloud Vision API** и **Cloud Document AI API**. |

Сохраните изменения (Save).

---

## 4. Document AI: проект и процессор

1. Перейдите в [Document AI](https://console.cloud.google.com/ai/document-ai).
2. Убедитесь, что вы в том же проекте (сверху выбран правильный проект).
3. В меню слева: **Processors** (Процессоры).  
   Должны быть созданы процессоры, ID которых вы подставляете в:
   - `VITE_DOCAI_DOC_PROCESSOR_ID` (для документов)
   - `VITE_DOCAI_OCR_PROCESSOR_ID` (если используете для фото/OCR)

ID процессора виден в карточке процессора или в URL при его открытии.

---

## 5. Быстрая проверка ключа (Vision)

1. В [Credentials](https://console.cloud.google.com/apis/credentials) скопируйте ваш API-ключ.
2. В браузере откройте (подставьте свой `KEY`):
   ```
   https://vision.googleapis.com/v1/images:annotate?key=KEY
   ```
   Методом **POST** с телом, например:
   ```json
   {
     "requests": [{
       "image": { "content": "/9j/4AAQSkZJRg==" },
       "features": [{ "type": "TEXT_DETECTION", "maxResults": 1 }]
     }]
   }
   ```
   Можно через вкладку «Network» в DevTools: если в ответе **403** — проблема в ограничениях ключа или включении Vision API; **401** — ключ не подходит или отключён.

---

## 5. OCR через Cloud Function (рекомендуется — без 401/403)

Приложение сначала вызывает OCR через **Cloud Function** `processVerificationImageCallable`. Document AI и Vision тогда работают на сервере с учётными данными проекта (без API-ключа в браузере), поэтому 401/403 от ключа не возникают.

После деплоя функций задайте переменные окружения для Cloud Function:

1. [Firebase Console](https://console.firebase.google.com) → проект → **Functions** → вкладка функции или **Environment variables**.
2. В Google Cloud Console: **Cloud Functions** → выберите функцию `processVerificationImageCallable` → **Edit** → **Runtime, build, connections and security** → **Runtime environment variables**.
3. Добавьте:
   - `DOCAI_DOC_PROCESSOR_ID` — ID процессора Document AI для документов (например `46613d9e889f9f63`).
   - `DOCAI_OCR_PROCESSOR_ID` — (опционально) ID для фото; можно оставить пустым.
   - `DOCAI_LOCATION` — регион процессора, например `us`.

Деплой: из корня `peoplehub` выполните `firebase deploy --only functions`, затем пересоберите и задеплойте клиент.

---

## Итоговый чеклист

- [ ] В консоли выбран проект с **Project ID** = вашему Firebase (например `taxi-eb8b7`).
- [ ] В **APIs & Services → Dashboard** включены **Cloud Vision API** и **Cloud Document AI API**.
- [ ] В **Credentials** ключ из `VITE_GOOGLE_API_KEY` не ограничен по приложениям (или добавлен ваш домен) и разрешён для Vision и Document AI.
- [ ] В **Document AI → Processors** есть процессоры, их ID прописаны в `VITE_DOCAI_DOC_PROCESSOR_ID` (и при необходимости в `VITE_DOCAI_OCR_PROCESSOR_ID`).
- [ ] В `.env` (или в переменных сборки) задан **Project ID**: `VITE_GCP_PROJECT_ID=taxi-eb8b7` или `VITE_FIREBASE_PROJECT_ID=taxi-eb8b7`.

После этого пересоберите и задеплойте приложение и снова проверьте верификацию.
