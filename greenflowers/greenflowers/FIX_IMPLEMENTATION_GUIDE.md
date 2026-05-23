# ✅ Пошаговый план исправления проблемы с изображениями

## Ввертка программы

У вас есть приложение GreenFlowers с React + Express + PostgreSQL.
**Проблема:** Товары не показывают изображения (404 или placeholder).

## План исправления

### ✨ Этап 1: Проверка текущего состояния (5 минут)

#### Шаг 1.1: Запустить тест API

```bash
cd back
node test-images-api.js
```

**Что нужно увидеть:**

```
✅ Got X products
✅ Image URL: http://localhost:5000/uploads/...
✅ Image is accessible (HTTP 200)
```

**Если что-то неправильно:**

- Сервер не запущен → запустить `npm start`
- Ошибка 404 на изображении → файл удален, проверить БД
- Нет image_url в товарах → товары созданы без фото

#### Шаг 1.2: Запустить диагностику

```bash
cd back
node diagnose-photos.js
```

**Что нужно увидеть:** Все файлы на диске соответствуют ссылкам в БД

### ✨ Этап 2: Исправить Backend (10 минут)

#### Шаг 2.1: Обновить `back/routes/products.js`

Ключевые изменения:

1. ✅ Добавить helper функцию `getAbsoluteImageUrl()`
2. ✅ Обновить GET `/` endpoint чтобы возвращал абсолютные URL
3. ✅ Обновить GET `/:id` endpoint
4. ✅ Добавить логирование

**Что изменилось в коде:**

```javascript
// БЫЛО (неправильно):
image_url: r.image_url
  ? r.image_url.startsWith("http")
    ? r.image_url
    : hostBase + r.image_url
  : null;

// СТАЛО (правильно):
image_url: getAbsoluteImageUrl(r.image_url, req);
```

#### Шаг 2.2: Проверить `back/index.js`

Убедиться что есть these строки:

```javascript
// Раздача статических файлов
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
```

#### Шаг 2.3: Проверить `.env` в папке back

Убедиться что установлены переменные:

```env
PORT=5000
PUBLIC_BASE_URL=http://localhost:5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=greenflowers
DB_USER=postgres
DB_PASSWORD=posyposypsy
```

#### Шаг 2.4: Перезагрузить backend

```bash
cd back
npm start
```

### ✨ Этап 3: Исправить Frontend (10 минут)

#### Шаг 3.1: Обновить `sdfg/components/store/product-card.tsx`

Ключевые изменения:

1. ✅ Добавить состояния: `imageError`, `imageLoaded`
2. ✅ Добавить функцию `getImageUrl()` для преобразования URL
3. ✅ Обновить Image компонент с обработкой ошибок
4. ✅ Добавить fallback для отсутствующих изображений

**Что изменилось:**

```typescript
// БЫЛО (неправильно):
<Image src={product.image_url} alt={product.name} fill />

// СТАЛО (правильно):
const imageUrl = getImageUrl();
<Image
  src={imageUrl}
  alt={product.name}
  fill
  onError={() => setImageError(true)}
  onLoadingComplete={() => setImageLoaded(true)}
  unoptimized
/>
{/* Fallback если нет изображения */}
{!imageUrl && (
  <div className="flex items-center justify-center h-full">
    <ImageOff /> Нет фото
  </div>
)}
```

#### Шаг 3.2: Проверить `sdfg/.env.local`

Убедиться что есть:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

#### Шаг 3.3: Проверить `sdfg/next.config.mjs`

Должны быть remote patterns для localhost:5000:

```javascript
remotePatterns: [
  {
    protocol: "http",
    hostname: "localhost",
    port: "5000",
    pathname: "/uploads/**",
  },
  ...
]
```

#### Шаг 3.4: Перезагрузить frontend

```bash
cd sdfg
npm run dev
```

### ✨ Этап 4: Очистить Database (5 минут)

#### Шаг 4.1: Удалить orphaned ссылки

```bash
cd back
node cleanup-orphaned-photos.js
```

**Что нужно увидеть:**

```
✅ Cleaned 0 orphaned photos from inventory_items
✅ Cleaned 0 orphaned images from products
```

Если видите цифры > 0:

- Это значит что были broken ссылки
- Они удалены из БД
- Все OK!

### ✨ Этап 5: Тестирование (10 минут)

#### Шаг 5.1: Проверить в браузере

1. Открить http://localhost:3000
2. Посмотреть главную страницу товаров
3. **Что должно быть:** Все товары показывают изображения или красивый placeholder

#### Шаг 5.2: Проверить DevTools

1. Открить F12 → Console
2. Должны видеть логи:
   - ✅ Image loaded for product 1
   - ✅ Image loaded for product 2
   - ...или...
   - ❌ Image failed to load for product X

3. Открить F12 → Network
4. Фильтр по "product" или "uploads"
5. Все запросы должны быть HTTP 200 OK

#### Шаг 5.3: Создать новый товар с фото

1. Открить admin панель (если есть)
2. Создать товар с загрузкой изображения
3. Проверить что товар появился на главной с правильным фото

### ✨ Этап 6: Оптимизация (опционально)

#### Шаг 6.1: Добавить кэширование (опционально)

В `back/index.js`:

```javascript
app.use(
  "/uploads",
  (req, res, next) => {
    res.set("Cache-Control", "public, max-age=86400"); // 1 день
    next();
  },
  express.static(path.join(__dirname, "public/uploads")),
);
```

#### Шаг 6.2: Для продакшена

Обновить `back/.env`:

```env
PUBLIC_BASE_URL=https://api.yourdomain.com
```

Обновить `sdfg/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

## Финальная проверка ✅

### Чек-лист:

- [ ] Backend запущен и логирует: `✅ Image uploaded:`
- [ ] API возвращает: `"image_url": "http://localhost:5000/uploads/product-123.jpg"`
- [ ] Frontend показывает изображения товаров
- [ ] DevTools → Console показывает: `✅ Image loaded for product X`
- [ ] DevTools → Network показывает: 200 OK для `/uploads/...`
- [ ] Fallback показывается для товаров без фото
- [ ] Orphaned ссылки удалены из БД (cleanup-orphaned-photos.js)
- [ ] Создание нового товара сохраняет фото

## Если что-то не работает

### Проблема: Изображения всё ещё не загружаются

**Решение:**

```bash
# 1. Проверить логи сервера
cd back && npm start
# Должен вывести логи о загрузке изображений

# 2. Проверить что файлы на диске
ls -la back/public/uploads/

# 3. Проверить что backend раздаёт файлы
curl -I http://localhost:5000/uploads/product-123.jpg
# Должно вернуть: HTTP/1.1 200 OK

# 4. Проверить ConsoleLog в браузере (F12)
# Должен быть message: Image failed to load for product X
# Это скажет какой конкретно товар имеет проблему
```

### Проблема: API возвращает NULL для image_url

**Решение:**

```bash
# 1. Проверить БД
psql -h localhost -U postgres -d greenflowers
SELECT id, name, image_url FROM products LIMIT 5;

# 2. Если всё NULL - это нормально для старых товаров
# Создать новый товар с фото - это должно сработать

# 3. Если даже новые товары имеют NULL -
# Проблема в multer, проверить back/routes/products.js
```

### Проблема: CORS ошибка при загрузке

**Решение:**

```javascript
// back/index.js - убедиться что этот код есть
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
```

## Дополнительные файлы для помощи

В вашем проекте созданы файлы для помощи:

- `IMAGE_FIX_COMPLETE_GUIDE.md` - полное объяснение проблемы
- `CODE_EXAMPLES.md` - примеры для всех частей приложение
- `back/test-images-api.js` - тест API
- `back/cleanup-orphaned-photos.js` - очистка orphaned ссылок
- `back/diagnose-photos.js` - диагностика файлов

## Вопросы и ответы

**В: Почему только у одного товара фото отображается?**
О: Потому что остальные товары созданы без фото, или файлы удалены с диска. Запустить cleanup-orphaned-photos.js

**В: Как я узнаю что всё работает правильно?**
О: Откройте DevTools (F12) в браузере. В Console должны видеть "✅ Image loaded for product X" для каждого товара с фото

**В: Нужно ли менять код в других компонентах?**
О: Нет, если они используют ProductCard компонент. Если где-то ещё отображаются товары - нужно применить те же исправления

**В: Можно ли загружать другие форматы файлов?**
О: Да, в multer измените fileFilter. По умолчанию разрешены: JPEG, PNG, WebP, GIF

**В: Как работает cleanup-orphaned-photos.js?**
О: Проверяет каждый image_url в БД. Если файл не существует на диске - удаляет ссылку из БД

## Когда нужна дополнительная помощь

Если после следования этому плану изображения всё ещё не работают:

1. Запустить все диагностические скрипты:

   ```bash
   node back/test-images-api.js
   node back/diagnose-photos.js
   ```

2. Проверить логи консоли браузера (F12)

3. Проверить Network tab в DevTools - что возвращает API и backend

4. Если всё ещё не ясно - предоставить вывод диагностических скриптов и скриншот DevTools
