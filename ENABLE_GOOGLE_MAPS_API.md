# 🗺️ Включение Google Maps API

## ✅ Пошаговая инструкция:

### 1. Откройте Google Cloud Console

Перейдите по ссылке:
**https://console.cloud.google.com/apis/library?project=odo-uz-1f4d9**

Или:
1. Откройте https://console.cloud.google.com
2. Выберите проект **odo-uz-1f4d9** (вверху слева)

### 2. Включите необходимые API

#### A. Maps JavaScript API (обязательно)
1. Перейдите: **https://console.cloud.google.com/apis/library/maps-javascript-api.googleapis.com?project=odo-uz-1f4d9**
2. Нажмите кнопку **"Enable"** (Включить)
3. Дождитесь активации (обычно несколько секунд)

#### B. Places API (обязательно)
1. Перейдите: **https://console.cloud.google.com/apis/library/places-backend.googleapis.com?project=odo-uz-1f4d9**
2. Нажмите кнопку **"Enable"** (Включить)
3. Дождитесь активации

#### C. Geocoding API (рекомендуется)
1. Перейдите: **https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com?project=odo-uz-1f4d9**
2. Нажмите кнопку **"Enable"** (Включить)

#### D. Geolocation API (опционально, если используется)
1. Перейдите: **https://console.cloud.google.com/apis/library/geolocation.googleapis.com?project=odo-uz-1f4d9**
2. Нажмите кнопку **"Enable"** (Включить)

### 3. Быстрый способ - включить все сразу

Или включите все через поиск:

1. В Google Cloud Console найдите **"APIs & Services"** → **"Library"**
2. В поиске введите **"Maps JavaScript API"**
3. Нажмите **"Enable"**
4. Повторите для **"Places API"**
5. Повторите для **"Geocoding API"**

### 4. Проверьте, что API включены

1. Перейдите: **https://console.cloud.google.com/apis/dashboard?project=odo-uz-1f4d9**
2. В разделе **"API & Services"** → **"Enabled APIs"**
3. Убедитесь, что включены:
   - ✅ Maps JavaScript API
   - ✅ Places API
   - ✅ Geocoding API (опционально)

### 5. Проверьте API ключ

1. Перейдите: **https://console.cloud.google.com/apis/credentials?project=odo-uz-1f4d9**
2. Найдите ключ: `AIzaSyChdT2U33lGtXsUa92_D8NauTNALaSaN0I`
3. Убедитесь, что ключ активен
4. (Опционально) Проверьте ограничения ключа

### 6. Настройте ограничения API ключа (рекомендуется)

1. В **APIs & Services** → **Credentials**
2. Нажмите на ключ `AIzaSyChdT2U33lGtXsUa92_D8NauTNALaSaN0I`
3. В разделе **"API restrictions"**:
   - Выберите **"Restrict key"**
   - Выберите только нужные API:
     - ✅ Maps JavaScript API
     - ✅ Places API
     - ✅ Geocoding API
4. В разделе **"Application restrictions"** → **"HTTP referrers"**:
   - Добавьте домены:
     - `https://odo-uz-1f4d9.web.app/*`
     - `https://odo-uz-1f4d9.firebaseapp.com/*`
     - `http://localhost:*` (для разработки)
     - `http://127.0.0.1:*` (для разработки)
5. Нажмите **"Save"**

## ✅ После включения:

1. Карты должны работать на https://odo-uz-1f4d9.web.app
2. Проверьте экран карт в приложении
3. Проверьте консоль браузера на ошибки

## 🔗 Прямые ссылки для включения:

- **Maps JavaScript API**: https://console.cloud.google.com/apis/library/maps-javascript-api.googleapis.com?project=odo-uz-1f4d9
- **Places API**: https://console.cloud.google.com/apis/library/places-backend.googleapis.com?project=odo-uz-1f4d9
- **Geocoding API**: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com?project=odo-uz-1f4d9

## 💰 Квоты и лимиты:

- **Бесплатный план**: 
  - 28,000 загрузок карт в месяц
  - После лимита: $7 за 1000 загрузок
- **Places API**: 
  - $17 за 1000 запросов (после бесплатного лимита)

## ❓ Проблемы?

Если карты не работают после включения:
1. Подождите 2-5 минут (API нужно время для активации)
2. Очистите кеш браузера
3. Проверьте консоль браузера на ошибки
4. Убедитесь, что домены добавлены в ограничения ключа

