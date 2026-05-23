# 🖼️ Полное решение проблемы с изображениями товаров

## Диагностика проблемы

На основе анализа вашего кода выявлены следующие проблемы:

### 1. **Backend (Express + PostgreSQL)**

- ✅ Express.static(`/uploads`) настроен правильно
- ✅ API возвращает `image_url` с абсолютными URL
- ⚠️ Проблема: Не все товары имеют `image_url` (некоторые NULL)
- ⚠️ Проблема: Файл может быть удален, но ссылка остается в БД

### 2. **Frontend (Next.js + React)**

- ✅ RemotePatterns настроены правильно для localhost:5000
- ⚠️ Проблема: ProductCard использует Next.js Image без обработки ошибок
- ⚠️ Проблема: Нет fallback для отсутствующих изображений
- ⚠️ Проблема: Нет логирования загрузки изображений

## Решение

### Шаг 1: Исправить Backend (Express)

**Файл: `back/index.js`** - проверить express.static:

```javascript
// Убедитесь, что это есть (должно быть):
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
```

**Файл: `back/routes/products.js`** - обновить возврат URL:

```javascript
// Функция для преобразования относительного пути в абсолютный URL
const getAbsoluteImageUrl = (imageUrl, req) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return imageUrl; // Уже абсолютный

  const hostBase =
    process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;

  return `${hostBase}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
};

// Обновить GET /products:
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.category, p.color, p.variety, 
              p.description, p.price_per_unit, p.price_per_box, 
              p.stock_quantity, p.min_order_quantity, p.stem_length,
              p.packaging_type, p.image_url, p.next_delivery_date, p.created_at
       FROM products
       ORDER BY p.created_at DESC`,
    );

    // Преобразуем все image_url в абсолютные URL
    const products = result.rows.map((p) => ({
      ...p,
      image_url: getAbsoluteImageUrl(p.image_url, req),
    }));

    res.json({ success: true, products });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ error: error.message });
  }
});
```

### Шаг 2: Исправить Frontend - ProductCard

**Файл: `sdfg/components/store/product-card.tsx`**

Замените существующий компонент на версию с fallback и обработкой ошибок:

```typescript
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useCart } from "@/contexts/cart-context";
import { ImageOff } from "lucide-react";

export function ProductCard({ product }: { product: any }) {
  const { addToCart } = useCart();
  const [adding, setAdding] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const onAdd = async () => {
    if (product.stock_quantity <= 0) {
      alert("Товар отсутствует на складе");
      return;
    }
    setAdding(true);
    try {
      await addToCart(product, 1);
    } catch (e) {
      console.error(e);
      alert("Ошибка при добавлении в корзину");
    } finally {
      setAdding(false);
    }
  };

  // Получить правильный URL изображения
  const getImageUrl = (): string | null => {
    if (!product.image_url) return null;

    // Если уже абсолютный URL, используем как есть
    if (product.image_url.startsWith("http")) {
      return product.image_url;
    }

    // Если относительный URL, добавляем базовый хост
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const backendHost = apiBase.replace(/\/api\/?$/, "");
    return `${backendHost}${product.image_url}`;
  };

  const imageUrl = getImageUrl();

  return (
    <div className="w-full bg-white rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow flex gap-3 sm:gap-4">
      {/* Image section - fixed width */}
      <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 relative rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
        {imageUrl && !imageError ? (
          <>
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              style={{ objectFit: "cover" }}
              onError={() => {
                console.warn(`❌ Image failed to load for product ${product.id}:`, imageUrl);
                setImageError(true);
              }}
              onLoadingComplete={() => {
                console.log(`✅ Image loaded for product ${product.id}`);
                setImageLoaded(true);
              }}
              unoptimized // Для локальной разработки
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-100 animate-pulse" />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50 gap-1">
            <ImageOff className="w-6 h-6" />
            <div className="text-xs">Нет фото</div>
          </div>
        )}
      </div>

      {/* Info section - flex 1 */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-semibold text-sm sm:text-base text-gray-800 line-clamp-2">
            {product.name}
          </h4>
          <div className="text-xs text-gray-500 mt-1">
            Высота: {product.stem_length || "—"}
          </div>
          <div className="text-xs text-gray-500">
            Упаковка:{" "}
            {product.packaging_type || `${product.min_order_quantity} шт`}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div>
            <div className="text-sm font-bold text-gray-900">
              {product.price_per_box
                ? `${product.price_per_box} ₸/ящ`
                : `${product.price_per_unit || "-"} ₸/шт`}
            </div>
            <div className="text-xs text-gray-500">
              В наличии: {product.stock_quantity}
            </div>
          </div>
          <button
            onClick={onAdd}
            disabled={adding}
            className="ml-2 bg-[#2f6f4a] hover:bg-[#1f4a33] disabled:bg-gray-300 text-white px-3 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Шаг 3: Обновить загрузку файлов (multer)

**Файл: `back/routes/products.js`** - при загрузке фото:

```javascript
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Папка для загрузок
const uploadDir = path.join(__dirname, "../public/uploads");

// Создать папку если её нет
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Сохранить с оригинальным расширением
    const ext = path.extname(file.originalname);
    const name = `product-${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP allowed"));
    }
  },
});

// POST для создания товара с фото
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, category, price_per_unit, stock_quantity } = req.body;

    // Если файл загружен, сохранить путь
    let image_url = null;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
      console.log(`✅ Image uploaded: ${image_url}`);
    }

    const result = await pool.query(
      `INSERT INTO products (name, category, price_per_unit, image_url, stock_quantity, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [name, category, price_per_unit, image_url, stock_quantity],
    );

    res.json({ success: true, product: result.rows[0] });
  } catch (error) {
    // Удалить файл если ошибка
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("File delete error:", err);
      });
    }
    console.error("Create product error:", error);
    res.status(500).json({ error: error.message });
  }
});
```

### Шаг 4: Добавить переменные окружения

**Файл: `back/.env`** - добавить/обновить:

```env
# Backend
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=greenflowers
DB_USER=postgres
DB_PASSWORD=posyposypsy

# Абсолютный URL для изображений (опционально, для продакшена)
PUBLIC_BASE_URL=http://localhost:5000
```

**Файл: `sdfg/.env.local`** - добавить/обновить:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Тестирование

### 1. Проверить логи backend при загрузке товара:

```bash
cd back
npm start
# Должны видеть: ✅ Image uploaded: /uploads/product-xxx.jpg
```

### 2. Проверить API ответ:

```bash
curl http://localhost:5000/api/products

# Должны видеть image_url вроде:
{
  "image_url": "http://localhost:5000/uploads/product-1234567890.jpg"
}
```

### 3. Проверить в браузере консоль:

- DevTools → Network → посмотреть запросы к /uploads/xxx
- DevTools → Console → логи "✅ Image loaded" или "❌ Image failed to load"

### 4. Очистить orphaned ссылки:

```bash
cd back
node cleanup-orphaned-photos.js
```

## Чек-лист

- [ ] Express.static `/uploads` путь настроен
- [ ] Backend возвращает абсолютные URL для image_url
- [ ] RemotePatterns в next.config.mjs включают localhost:5000
- [ ] ProductCard имеет fallback для отсутствующих изображений
- [ ] Логирование добавлено для отладки
- [ ] Multer сохраняет файлы в public/uploads/
- [ ] .env переменные установлены в обоих сервисах
- [ ] Orphaned ссылки очищены из БД

## Примеры кода

### Правильная структура базы данных (PostgreSQL)

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  price_per_unit DECIMAL(10, 2),
  price_per_box DECIMAL(10, 2),
  stock_quantity INT DEFAULT 0,
  min_order_quantity INT DEFAULT 1,
  stem_length INT,
  packaging_type VARCHAR(100),

  -- ГЛАВНОЕ: поле для хранения пути к изображению
  image_url VARCHAR(500),

  description TEXT,
  next_delivery_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Правильное использование Front-end

```typescript
// ✅ ПРАВИЛЬНО: Используем Image из next/image с обработкой ошибок
import Image from "next/image";

export function ProductImage({ imageUrl, productName }) {
  const [error, setError] = useState(false);

  if (!imageUrl || error) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <span>Нет фото</span>
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={productName}
      fill
      style={{ objectFit: "cover" }}
      onError={() => setError(true)}
    />
  );
}

// ❌ НЕПРАВИЛЬНО: Использовать обычный <img> без обработки ошибок
// <img src={product.image_url} />
```

## Дополнительные советы

1. **Для продакшена** установите `PUBLIC_BASE_URL` на реальный домен:

   ```env
   PUBLIC_BASE_URL=https://api.yourdomain.com
   ```

2. **Для оптимизации изображений** используйте:

   ```typescript
   // Установить unoptimized=false для обработки на сервере Next.js
   // Но убедитесь, что Next.js может доступиться до backend
   ```

3. **Для кэширования** добавьте заголовки в Express:
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

## Когда проблема решена

✅ Все товары должны показывать изображения
✅ Нет 404 ошибок для изображений в DevTools
✅ Есть красивый placeholder для товаров без фото
✅ Логирование показывает загрузку всех изображений
