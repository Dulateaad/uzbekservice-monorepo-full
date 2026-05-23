# Архитектура: Группировка товаров по поставкам (партиям)

## 📋 Обзор

Система переработана для отображения товаров не просто списком, а **сгруппированными по датам поставки**. Это позволяет:

- ✅ Показать клиентам "свежие" и "старые" цветы
- ✅ Синхронизировать данные со складом (изменения в реальном времени)
- ✅ Удобная навигация между партиями (как календарь)
- ✅ Автоматическое управление скидками для старых партий

---

## 🏗️ Архитектура системы

```
┌─────────────────────────────────────────────────────────────┐
│                    ГЛАВНАЯ СТРАНИЦА (/)                     │
└─────────────────────────────────────────────────────────────┘
                             │
                             ├─ ProductsSection
                             │  (новый компонент)
                             │
                             ├─ DeliveryBatchesNav
                             │  (навигация по партиям)
                             │  (календарь-стиль)
                             │
                             └─ BatchProductsGrid
                                (сетка товаров партии)

┌─────────────────────────────────────────────────────────────┐
│                 BACKEND: /api/catalog/batches                │
│              (новый API endpoint для партий)                 │
└─────────────────────────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
         inventory_batches          inventory_items
         (партии поставок)         (товары в партии)
         ├─ batch_date             ├─ product_name
         ├─ supplier_name          ├─ quantity
         ├─ status                 ├─ selling_price
         └─ created_at             └─ photo_url
```

---

## 🗄️ Модель базы данных

### Существующие таблицы (используются):

```sql
-- Партии поставок (еженедельный приход товара)
CREATE TABLE inventory_batches (
  id SERIAL PRIMARY KEY,
  batch_date DATE NOT NULL,        -- дата поступления партии
  supplier_name VARCHAR(255),      -- поставщик
  total_items INTEGER DEFAULT 0,
  status VARCHAR(20)               -- 'draft', 'received', 'processed'
  created_at TIMESTAMP
);

-- Товары в партии поставки
CREATE TABLE inventory_items (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES inventory_batches(id),
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,       -- остаток товара
  selling_price DECIMAL(10,2),     -- цена на продажу
  photo_url VARCHAR(500),          -- изображение товара
  color VARCHAR(50),
  category VARCHAR(100),
  created_at TIMESTAMP
);
```

**Важное замечание**: Система автоматически показывает товары со статусом `status = 'received'` и `quantity > 0`.

---

## 🔌 Backend API

### 1. GET `/api/catalog/batches` - Получить все партии

**Параметры запроса:**

```
?limit=10           // количество партий (max 50, default 10)
&offset=0           // смещение для пагинации
&sortBy=date_desc   // сортировка: date_asc | date_desc
&includeFresh=true  // показать только партии старше 3 дней (optional)
```

**Ответ:**

```json
{
  "success": true,
  "batches": [
    {
      "id": 1,
      "batch_date": "2026-02-22",
      "supplier_name": "Поставщик №1",
      "total_items": 120,
      "age_days": 0,
      "is_fresh": true,
      "is_new": true,
      "status": "received",
      "items": [
        {
          "id": 101,
          "name": "Роза",
          "variety": "Red Deep",
          "quantity": 50,
          "selling_price": 120.0,
          "photo_url": "http://localhost:5000/uploads/...",
          "color": "красный",
          "category": "Розы"
        }
      ]
    }
  ],
  "total_count": 25,
  "today": "2026-02-22",
  "pagination": {
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

### 2. GET `/api/catalog/batch/:batchId` - Получить одну партию

**Ответ:** одна партия с полным списком товаров

### 3. GET `/api/catalog/today-deliveries` - Сегодняшние поставки

**Возвращает:** только партии, поступившие сегодня

---

## 🎨 Frontend компоненты

### 1. `DeliveryBatchesNav` - Навигация по партиям

**Использование:**

```tsx
import { DeliveryBatchesNav } from "@/components/store/delivery-batches-nav";

export function MyComponent() {
  const [activeBatch, setActiveBatch] = useState(null);

  return (
    <DeliveryBatchesNav
      onBatchChange={setActiveBatch}
      showOnlyFresh={false} // показать все партии или только свежие
    />
  );
}
```

**Функционал:**

- 🔘 Кнопки "← Пред." и "Сед. →" для навигации
- 📅 Отображение текущей партии с датой
- ⭐ Указание статуса: "🆕 Новое" (0-1 день), "✨ Свежее" (2-3 дня), "🔄 Старые" (более 3 дней)
- 📊 Горизонтальный список всех партий для быстрого выбора
- 🎯 Счетчик позиции (N из M)

### 2. `BatchProductsGrid` - Сетка товаров

**Использование:**

```tsx
import { BatchProductsGrid } from "@/components/store/batch-products-grid";

export function CatalogPage() {
  const [batch, setBatch] = useState(null);

  return (
    <BatchProductsGrid
      batch={batch}
      loading={isLoading}
      selectedCategory={category} // фильтрация по категории
    />
  );
}
```

**Функционал:**

- Отображение товаров выбранной партии
- Фильтрация по категории
- Сортировка по названию
- Показ информации партии и поставщика

### 3. `ProductsSection` - Интегрированный компонент (главная страница)

**Что делает:**

```tsx
export function ProductsSection() {
  // Проверяет доступность API партий
  // Если есть - использует GroupedView (с партиями)
  // Если нет - fallback на LegacyView (просто список товаров)

  return (
    <div>
      <DeliveryBatchesNav ... />
      <BatchProductsGrid ... />
    </div>
  );
}
```

---

## 🔄 Real-time синхронизация

**Файл:** `/sdfg/hooks/use-delivery-sync.ts`

### Как работает:

1. **Polling (30 сек)** - каждые 30 секунд проверяем версию партии на сервере
2. **Event-based** - эмитируем события при изменении инвентаря
3. **Auto-update** - UI автоматически перезагружает данные

### Использование в компонентах:

```tsx
import { useDeliverySyncWatch } from "@/hooks/use-delivery-sync";

export function BatchProductsGrid({ batch }) {
  const [items, setItems] = useState(batch?.items || []);

  // Автоматически обновлять данные каждые 30 сек
  useDeliverySyncWatch(batch?.id, async () => {
    // Перезагрузить данные партии
    const res = await api.request(`/catalog/batch/${batch.id}`);
    if (res?.success) {
      setItems(res.batch.items);
    }
  });

  return <div>{/* товары */}</div>;
}
```

### Уведомление об обновлении инвентаря:

```typescript
// После добавления/изменения товара на складе:
import { notifyInventoryUpdate } from "@/hooks/use-delivery-sync";

async function addItemToWarehouse() {
  // ... API запрос

  // Уведомить фронтенд что что-то изменилось
  notifyInventoryUpdate();
}
```

---

## 📊 Статусы партий и логика

| Статус    | Возраст  | CSS класс                     | Описание                                    |
| --------- | -------- | ----------------------------- | ------------------------------------------- |
| 🆕 Новое  | 0-1 день | `bg-green-100 text-green-700` | Свежая поставка, цветы в отличном состоянии |
| ✨ Свежее | 2-3 дня  | `bg-blue-100 text-blue-700`   | Еще хорошее состояние, можна скидка 5%      |
| 🔄 Старые | >3 дней  | `bg-gray-100 text-gray-700`   | Рекомендуются скидки или рас дача           |

**Где используется:**

- Визуальное выделение в навигации (DeliveryBatchesNav)
- Сортировка (новые сверху)
- Применение скидок (backend: логика для старых партий)

---

## 🔗 Связь со складом

### Как данные синхронизируются:

```
Участник зал → Добавляет товар на складе (TruckTabs)
     ↓
POST /api/inventory-items
     ↓
Сохранено в inventory_items с batch_id
     ↓
Фронтенд получает событие (notifyInventoryUpdate)
     ↓
GET /api/catalog/batches (перезагрузить)
     ↓
UI обновляется автоматически
```

### Изменение количества:

```
Работник меняет quantity на складе
     ↓
PUT /api/inventory-items/:itemId
     ↓
Синхронизация через polling каждые 30 секунд
     ↓
Если quantity = 0 → товар исчезает из каталога
```

### Удаление товара:

```
DELETE /api/inventory-items/:itemId
     ↓
polling обнаруживает изменение
     ↓
Товар исчезает из каталога автоматически
```

---

## 📌 Примеры использования

### Пример 1: Отображение только "свежих" поставок на главной

```tsx
// На главной странице
<DeliveryBatchesNav
  showOnlyFresh={true} // только партии последних 3 дней
  onBatchChange={setBatch}
/>
```

### Пример 2: Фильтрация по категории

```tsx
// StoreFilters эмитирует событие:
window.dispatchEvent(
  new CustomEvent("gf:filters:changed", {
    detail: { category: "Розы" },
  }),
);

// BatchProductsGrid автоматически фильтрует товары:
const filtered = batch.items.filter((i) => i.category === "Розы");
```

### Пример 3: Добавление товара на складе (trigger синхронизации)

```typescript
// В компоненте добавления товара на складе:
async function handleAddItem() {
  const res = await api.request("POST", "/api/inventory-items", {
    batch_id: activeBatch.id,
    name: "Роза",
    quantity: 50,
    selling_price: 120,
  });

  if (res.success) {
    // Уведомить каталог на главной что надо обновиться
    notifyInventoryUpdate();
  }
}
```

---

## 🚀 Flow данных (детально)

```
1. ИНИЦИАЛИЗАЦИЯ
   └─ ProductsSection монтируется
      └─ Проверяет доступность /api/catalog/batches
      └─ Если OK → использует GroupedView
      └─ Если ошибка → fallback на LegacyView (список)

2. ЗАГРУЗКА ПАРТИЙ
   └─ DeliveryBatchesNav → GET /api/catalog/batches?limit=50
      └─ Backend: JOIN inventory_batches с inventory_items
      └─ Преобразует relative URL в absolute (http://...)
      └─ Вычисляет age_days (сегодня - batch_date)
      └─ Возвращает JSON с партиями

3. ВЫБОР ПАРТИИ
   └─ Пользователь кликает на партию в навигации
      └─ setActiveBatchIndex(index)
      └─ BatchProductsGrid получает новую партию
      └─ Товары перерисовываются

4. ФИЛЬТРАЦИЯ
   └─ Пользователь выбирает категорию в фильтрах
      └─ StoreFilters → window.dispatchEvent("gf:filters:changed")
      └─ ProductsSection слушает событие
      └─ BatchProductsGrid фильтрует items по категории
      └─ Показывает только товары выбранной категории

5. СИНХРОНИЗАЦИЯ
   └─ Каждые 30 сек: polling на /api/catalog/batch/:id
      └─ Проверяет изменилась ли партия
      └─ Если изменилось → перезагружает данные
      └─ UI обновляется без refresh страницы

6. ОБНОВЛЕНИЕ СО СКЛАДА
   └─ Работник добавляет товар на складе
      └─ notifyInventoryUpdate() эмитирует событие
      └─ DeliveryBatchesNav и BatchProductsGrid слушают это
      └─ Перезагружают данные через API
      └─ Новый товар появляется в каталоге
```

---

## 🎯 Требуемые миграции БД

**Уже существуют в `001_add_shifts_inventory_calendar.sql`:**

```sql
CREATE TABLE inventory_batches (
  id SERIAL PRIMARY KEY,
  batch_date DATE NOT NULL,
  supplier_name VARCHAR(255),
  total_items INTEGER DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) CHECK (status IN ('draft', 'received', 'processed')) DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_items (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES inventory_batches(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  color VARCHAR(50),
  variety VARCHAR(100),
  quantity INTEGER NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2),
  stem_length VARCHAR(50),
  packaging_type VARCHAR(100),
  plantation_country VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Дополнительно нужно добавить поле для photo_url (если еще нету):**

```sql
ALTER TABLE inventory_items ADD COLUMN photo_url VARCHAR(500);
```

---

## 🔍 Диагностика и отладка

### Проверить доступные партии:

```bash
curl http://localhost:5000/api/catalog/batches?limit=5
```

### Проверить товары в партии:

```bash
curl http://localhost:5000/api/catalog/batch/1
```

### Проверить сегодняшние поставки:

```bash
curl http://localhost:5000/api/catalog/today-deliveries
```

---

## ✅ Чек-лист для внедрения

- [x] Создан новый API endpoint `/api/catalog/batches`
- [x] Создан компонент `DeliveryBatchesNav` (навигация)
- [x] Создан компонент `BatchProductsGrid` (сетка товаров)
- [x] Обновлен `ProductsSection` для группировки
- [x] Добавлена real-time синхронизация (`use-delivery-sync`)
- [ ] Протестирована работа с реальными данными
- [ ] Добавлены скидки для старых партий (backend логика)
- [ ] Добавлены метрики и аналитика по партиям
- [ ] Документация завершена

---

## 📞 Support

Если возникают вопросы:

1. Проверьте логи backend: `back/server.log`
2. Откройте DevTools в браузере (F12) → Console
3. Проверьте что партии существуют: `curl .../api/catalog/batches`
4. Убедитесь что товары связаны с партией: `SELECT * FROM inventory_items WHERE batch_id = 1;`
