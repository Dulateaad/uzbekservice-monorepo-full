# 📚 Справка: Правильные примеры кода для загрузки и отображения изображений

## 1. Backend - Express Server

### ✅ Правильная настройка Express

```javascript
// back/index.js

const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ГЛАВНОЕ: раздача статических файлов с изображениями
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Остальная конфигурация...
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API маршруты...
app.use("/api/products", require("./routes/products")(pool, logger));

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Uploads available at http://localhost:${PORT}/uploads`);
});
```

### ✅ Backend: Multer для загрузки файлов

```javascript
// back/routes/products.js

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../public/uploads");

// Создать папку если её нет
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Confog Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Сохранить с уникальным именем и расширением
    const ext = path.extname(file.originalname);
    const name = `product-${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB макс
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, GIF allowed"));
    }
  },
});

// Helper функция
const getAbsoluteImageUrl = (imageUrl, req) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return imageUrl;

  const hostBase =
    process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${hostBase}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
};

// ✅ ПРАВИЛЬНО: POST с загрузкой файла
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, category, price_per_unit, stock_quantity } = req.body;

    // Проверка обязательных полей
    if (!name || !category) {
      return res.status(400).json({ error: "Name and category required" });
    }

    // Если файл загружен
    let image_url = null;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
      console.log(`✅ Image uploaded: ${image_url}`);
    }

    const result = await pool.query(
      `INSERT INTO products (name, category, price_per_unit, image_url, stock_quantity, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [name, category, price_per_unit, image_url, stock_quantity || 0],
    );

    res.json({ success: true, product: result.rows[0] });
  } catch (error) {
    // Удалить файл если ошибка
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("File delete error:", err);
      });
    }
    console.error("❌ Create product error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ ПРАВИЛЬНО: GET товара с правильным image_url
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM products WHERE id = $1`, [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = result.rows[0];

    // Преобразовать image_url в абсолютный URL
    product.image_url = getAbsoluteImageUrl(product.image_url, req);

    console.log(`🖼️  Product ${product.id}: image_url = ${product.image_url}`);
    res.json({ success: true, product });
  } catch (error) {
    console.error("❌ Get product error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ ПРАВИЛЬНО: GET всех товаров с image_url
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM products ORDER BY created_at DESC`,
    );

    const products = result.rows.map((p) => ({
      ...p,
      image_url: getAbsoluteImageUrl(p.image_url, req),
    }));

    console.log(`📦 Returning ${products.length} products`);
    res.json({ success: true, products });
  } catch (error) {
    console.error("❌ Get products error:", error);
    res.status(500).json({ error: error.message });
  }
});
```

## 2. Database Schema (PostgreSQL)

### ✅ Правильная таблица products

```sql
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),

  -- Поле для хранения пути к изображению (относительный путь)
  image_url VARCHAR(500),  -- Хранится как: /uploads/product-123.jpg

  description TEXT,
  price_per_unit DECIMAL(10, 2),
  price_per_box DECIMAL(10, 2),
  stock_quantity INT DEFAULT 0,
  min_order_quantity INT DEFAULT 1,
  stem_length INT,
  packaging_type VARCHAR(100),
  variety VARCHAR(100),
  color VARCHAR(100),
  next_delivery_date DATE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
```

## 3. Frontend - React/Next.js

### ✅ Правильное использование Image компонента

```typescript
// components/ProductCard.tsx - ПРАВИЛЬНЫЙ ВАРИАНТ

"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

interface Product {
  id: number;
  name: string;
  image_url?: string; // Может быть null, /uploads/... или http://...
  price_per_unit?: number;
  stock_quantity: number;
}

export function ProductCard({ product }: { product: Product }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // ✅ Получить правильный URL изображения
  const getImageUrl = (): string | null => {
    if (!product.image_url) return null;

    // Если уже абсолютный URL (из API)
    if (product.image_url.startsWith("http")) {
      return product.image_url;
    }

    // Если относительный URL, добавить базовый хост
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const backendHost = apiBase.replace(/\/api\/?$/, "");
    return `${backendHost}${product.image_url}`;
  };

  const imageUrl = getImageUrl();

  return (
    <div className="flex gap-4 p-4 bg-white rounded-lg">
      {/* ✅ Image Container */}
      <div className="w-32 h-32 flex-shrink-0 relative rounded-lg overflow-hidden bg-gray-50">
        {imageUrl && !imageError ? (
          <>
            {/* Next.js Image компонент с правильными настройками */}
            <Image
              src={imageUrl}
              alt={product.name}
              fill // Заполнить контейнер
              style={{ objectFit: "cover" }}
              onError={() => {
                console.warn(
                  `❌ Image failed: ${product.id}`,
                  imageUrl
                );
                setImageError(true);
              }}
              onLoadingComplete={() => {
                console.log(`✅ Image loaded: ${product.id}`);
                setImageLoaded(true);
              }}
              priority={false}
              unoptimized={true} // Для локальной разработки
            />
            {/* Loading skeleton */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-100 animate-pulse" />
            )}
          </>
        ) : (
          /* ✅ Fallback если нет изображения */
          <div className="flex flex-col items-center justify-center h-full bg-gray-100">
            <ImageOff className="w-6 h-6 text-gray-400 mb-1" />
            <span className="text-xs text-gray-500">Нет фото</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1">
        <h4 className="font-semibold text-gray-800">{product.name}</h4>
        <div className="text-sm text-gray-600 mt-2">
          {product.price_per_unit ? `${product.price_per_unit} ₸/шт` : "N/A"}
        </div>
        <div className="text-xs text-gray-500">
          Наличие: {product.stock_quantity}
        </div>
      </div>
    </div>
  );
}
```

### ✅ next.config.js - настройка для Image

```javascript
// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // ✅ Разрешить неоптимизированные изображения для локальной разработки
    unoptimized: true,

    // ✅ Разрешить загрузку изображений с backend сервера
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "5000",
        pathname: "/uploads/**",
      },
      // Для production:
      {
        protocol: "https",
        hostname: "api.yourdomain.com",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
```

### ✅ API Client для загрузки файла

```typescript
// lib/api-client.ts

class ApiClient {
  baseURL: string;

  constructor() {
    this.baseURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  }

  // ✅ Загрузить товар с изображением
  async createProduct(productData: any, imageFile?: File) {
    const formData = new FormData();

    // Добавить текстовые поля
    formData.append("name", productData.name);
    formData.append("category", productData.category);
    formData.append("price_per_unit", productData.price_per_unit);
    formData.append("stock_quantity", productData.stock_quantity || 0);

    // ✅ Добавить файл если выбран
    if (imageFile) {
      formData.append("image", imageFile); // Важно: multer ищет это поле
    }

    try {
      const response = await fetch(`${this.baseURL}/products`, {
        method: "POST",
        body: formData,
        // НЕ устанавливать Content-Type: multipart/form-data
        // браузер установит автоматически с правильным boundary
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Create product failed:", data.error);
        return { success: false, error: data.error };
      }

      console.log("✅ Product created:", data.product);
      return { success: true, product: data.product };
    } catch (error) {
      console.error("❌ API error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ✅ Получить товары
  async getProducts() {
    try {
      const response = await fetch(`${this.baseURL}/products`);
      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Get products failed:", data.error);
        return { success: false, error: data.error };
      }

      console.log(`✅ Got ${data.products?.length || 0} products`);
      return data;
    } catch (error) {
      console.error("❌ API error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const api = new ApiClient();
```

### ✅ Форма для загрузки товара

```typescript
// components/CreateProductForm.tsx

"use client";

import React, { useState } from "react";
import { api } from "@/lib/api-client";
import Image from "next/image";

export function CreateProductForm() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("roses");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      // Создать preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ Вызвать API с файлом
      const result = await api.createProduct(
        {
          name,
          category,
          price_per_unit: parseFloat(price),
          stock_quantity: 100,
        },
        imageFile || undefined
      );

      if (result.success) {
        alert("✅ Товар создан!");
        // Очистить форму
        setName("");
        setPrice("");
        setImageFile(null);
        setPreview(null);
      } else {
        alert(`❌ Ошибка: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Ошибка: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg">
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded"
            placeholder="Product name"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="roses">Roses</option>
            <option value="tulips">Tulips</option>
            <option value="lilies">Lilies</option>
          </select>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium mb-1">Price</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded"
            placeholder="Price per unit"
          />
        </div>

        {/* ✅ Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-1">Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-3 py-2 border rounded"
          />

          {/* Preview */}
          {preview && (
            <div className="mt-3 w-32 h-32 relative rounded overflow-hidden">
              <Image
                src={preview}
                alt="Preview"
                fill
                style={{ objectFit: "cover" }}
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          {loading ? "Uploading..." : "Create Product"}
        </button>
      </div>
    </form>
  );
}
```

## 4. Environment Variables

### ✅ back/.env

```env
# Backend Configuration
PORT=5000
NODE_ENV=development

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=greenflowers
DB_USER=postgres
DB_PASSWORD=your_password

# File Upload
MAX_FILE_SIZE=5242880  # 5MB в байтах

# URLs
PUBLIC_BASE_URL=http://localhost:5000
```

### ✅ sdfg/.env.local

```env
# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 5. Folder Structure

```
project/
├── back/
│   ├── public/
│   │   └── uploads/          # ← Сохраняются загруженные файлы
│   │       ├── product-123.jpg
│   │       ├── product-456.jpg
│   │       └── ...
│   ├── routes/
│   │   └── products.js       # API endpoints
│   ├── index.js              # Express server
│   ├── package.json
│   └── .env
├── sdfg/
│   ├── components/
│   │   └── store/
│   │       ├── product-card.tsx    # Shows products with images
│   │       └── products-section.tsx
│   ├── lib/
│   │   └── api-client.ts           # API requests
│   ├── next.config.mjs             # Image remote patterns
│   ├── package.json
│   └── .env.local
└── README.md
```

## Checklist: Когда всё работает

- ✅ Backend возвращает image_url как абсолютный URL (http://localhost:5000/uploads/...)
- ✅ Frontend получает изображение без 404 ошибок
- ✅ Fallback (placeholder) показывается для товаров без фото
- ✅ Логирование в console показывает "✅ Image loaded" или "❌ Image failed"
- ✅ Network tab в DevTools не показывает 404 для изображений
- ✅ Форма загрузки сохраняет файл в public/uploads/
- ✅ Multer правильно парсит multipart/form-data

## Частые ошибки и решения

### ❌ Ошибка: Image 404

**Причина:** Файл не сохранен в public/uploads/ или путь неправильный

**Решение:**

```bash
# Проверить что папка существует
ls -la back/public/uploads/

# Проверить permissions
chmod 755 back/public/uploads
```

### ❌ Ошибка: "Cannot find module 'multer'"

**Решение:**

```bash
cd back
npm install multer
```

### ❌ Ошибка: "NEXT_PUBLIC_API_URL is not defined"

**Решение:** Добавить в `sdfg/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### ❌ Ошибка: CORS issue при загрузке файла

**Решение:** Убедиться что CORS включен в back/index.js:

```javascript
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
```

## Отладка

```bash
# 1. Проверить что backend запущен и раздает файлы
curl http://localhost:5000/uploads/product-123.jpg

# 2. Проверить API ответ
curl http://localhost:5000/api/products | jq

# 3. Посмотреть логи multer
# Сервер должен вывести: ✅ Image uploaded: /uploads/product-123.jpg

# 4. DevTools в браузере (F12)
# Console: Должны видеть "✅ Image loaded" или "❌ Image failed"
# Network: Должны видеть 200 OK для /uploads/...
```
