# 🎯 Визуальная архитектура системы партий

## Общий flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    ГЛАВНАЯ СТРАНИЦА (/)                          │
│                 http://localhost:3000                            │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
        ┌───────────────────────────────────┐
        │    ProductsSection.tsx             │
        │  (интегрирует групповой вид)      │
        └───────────┬───────────────────────┘
                    │
        ┌───────────┴──────────────┐
        │                          │
        ▼                          ▼
   ✅ API доступен          ❌ API не доступен
        │                          │
        ▼                          ▼
┌─────────────────────┐    ┌────────────────┐
│  GroupedView        │    │  LegacyView    │
│ (с партиями)        │    │(просто список) │
└─┬───────────────────┘    └────────────────┘
  │
  ├──────────────────────┬──────────────────┐
  │                      │                  │
  ▼                      ▼                  ▼
┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
│DeliveryBatches  │  │BatchProducts │  │DeliverySync  │
│Nav.tsx          │  │Grid.tsx      │  │(Polling)     │
│(Навигация ←→)  │  │(Товары)      │  │(30 сек)      │
└────────┬────────┘  └──────────────┘  └──────────────┘
         │
         ▼
    GET /api/catalog/batches
         │
         ▼
┌─────────────────────────────────────────────┐
│           BACKEND API (Node.js)             │
│   products-by-deliveries.js                 │
│                                             │
│  /api/catalog/batches       ← получить     │
│  /api/catalog/batch/:id     ← одну партию  │
│  /api/catalog/today-deliveries ← сегодня  │
└─────────────┬───────────────────────────────┘
              │
        ┌─────┴──────┐
        │             │
        ▼             ▼
   ┌────────────┐  ┌──────────────┐
   │inventory_  │  │inventory_    │
   │batches     │  │items         │
   ├────────────┤  ├──────────────┤
   │id          │  │id            │
   │batch_date  │  │batch_id (FK) │
   │supplier    │  │product_name  │
   │status      │  │quantity      │
   │...         │  │selling_price │
   └────────────┘  │photo_url     │
                   │category      │
                   │color         │
                   └──────────────┘
```

---

## Frontend компоненты (детали)

```
ProductsSection
│
├─ Проверка доступности API
│  │
│  ├─ YES → GroupedView
│  │        │
│  │        ├─ DeliveryBatchesNav
│  │        │  ├─ Загружает batches
│  │        │  ├─ Отображает навигацию (← дата →)
│  │        │  ├─ Кнопки: Prev | Date Selector | Next
│  │        │  ├─ Горизонтальный список партий
│  │        │  └─ Эмитирует: onBatchChange(batch)
│  │        │
│  │        └─ BatchProductsGrid
│  │           ├─ Получает batch от батч-нава
│  │           ├─ Фильтрует по selectedCategory
│  │           ├─ Отображает items в виде карточек
│  │           └─ Каждая карточка → ProductCard
│  │
│  └─ NO → LegacyView
│          └─ ProductCard список (без партий)
│
└─ useDeliverySyncWatch(batchId)
   ├─ Polling каждые 30 сек
   ├─ Проверяет изменилась ли партия
   ├─ Если да → перезагружает данные
   └─ UI обновляется автоматически
```

---

## Flow синхронизации

```
СЦЕНАРИЙ 1: Polling (фоновая синхронизация каждые 30 сек)
═════════════════════════════════════════════════════════

Фронтенд                          Backend
    │                                │
    ├── GET /api/catalog/batch/1 ──>│
    │                                ├─ SELECT FROM inventory_items
    │                                │  WHERE batch_id = 1
    │                                │
    │<─ JSON (товары) ───────────────┤
    │
    └─ Сравнивает с локальным состоянием
       Если изменилось → обновляет UI


СЦЕНАРИЙ 2: Event-based (при изменении на складе)
═════════════════════════════════════════════════════════

Работник на складе              Фронтенд           Backend
(TruckTabs)                         │                  │
    │                               │                  │
    ├─ Добавляет товар ────────────>│                  │
    │  (POST /api/inventory-items)  │                  │
    │                               │                  │
    │                               │ POST───────────>│
    │                               │                  ├─ Сохраняет
    │                               │                  │
    │                               │<──OK─────────────┤
    │                               │
    │                  notifyInventoryUpdate()
    │                   (эмитирует событие)
    │                               │
    │                    window.dispatchEvent
    │                    ("inventory:changed")
    │                               │
    │                  useDeliverySyncWatch
    │                  (слушает событие)
    │                               │
    │                    GET /api/catalog/batch/id
    │                               │ ────────────────>│
    │                               │<── JSON ────────│
    │                               │
    │                    Перерендер UI
    │                    Новый товар появляется!
    │
```

---

## Статусы и возраст партии

```
TODAY ────────────────── TIMELINE ─────────────────►

[Поступила             [Поступила               [Поступила
 сегодня]             2-3 дня назад]           >3 дней назад]

      ↓                      ↓                       ↓

   age_days = 0          age_days = 2              age_days = 5
   is_new = true         is_fresh = true          is_fresh = false

   🆕 НОВОЕ             ✨ СВЕЖЕЕ               🔄 СТАРЫЕ
   bg-green-100         bg-blue-100              bg-gray-100

   "Цветы пришли      "Неплохое               "Рекомендуется
    сегодня или        состояние,               скидка или
    вчера. Отличное    можно скидку"           срочно распродать"
    состояние"
```

---

## Взаимосвязь с другими компонентами

```
┌─────────────────────────────────────────────────────┐
│              ГЛАВНАЯ СТРАНИЦА (/)                   │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
    Header    StoreBanner  StoreFilters
                             │
                             │ (эмитирует)
                             │ gf:filters:changed
                             │
                             ▼
                    ┌─────────────────┐
                    │ ProductsSection │◄── (слушает)
                    │ (обновлена)     │
                    └────────┬────────┘
                             │
         ┌───────────────────┼────────────────┐
         │                   │                │
         ▼                   ▼                ▼
    DeliveryBatchesNav  BatchProductsGrid  useDeliverySyncWatch

    ↓ (этапы)

    DeliveryBatchesNav (навигация)
    │
    ├─ Загружает batches (GET /api/catalog/batches)
    ├─ Отображает календарь (← дата →)
    ├─ Кнопки для навигации
    ├─ Список партий для быстрого выбора
    └─ Эмитирует batch change → (onBatchChange)

    │
    ▼

    BatchProductsGrid (товары)
    │
    ├─ Получает batch от батч-нава
    ├─ Получает selectedCategory от фильтров
    ├─ Фильтрует items: batch.items.filter(category)
    ├─ Рендерит каждый item → ProductCard
    └─ ProductCard показывает фото, цену, кнопку "В корзину"
```

---

## Database schema (иерархия)

```
┌─────────────────────────────────────┐
│   PostgreSQL: greenflowers_db       │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
inventory_batches  inventory_items
(партии)           (товары в партиях)
│                  │
├─ id (PK)         ├─ id (PK)
├─ batch_date      ├─ batch_id (FK)
├─ supplier_name   ├─ product_id (FK, optional)
├─ status          ├─ product_name
├─ total_items     ├─ variety
├─ notes           ├─ quantity
├─ created_by      ├─ selling_price
├─ created_at      ├─ color
├─ updated_at      ├─ category
│                  ├─ photo_url
│                  ├─ stem_length
│                  ├─ packaging_type
│                  ├─ created_at
│                  └─ updated_at
│
└─── Связь: 1 batch : M items
     (Одна партия содержит много товаров)
```

---

## API endpoints (иерархия запросов)

```
/api/catalog
│
├─ batches
│  │ GET (получить все партии)
│  │ ├─ params: limit=10, offset=0, sortBy=date_desc
│  │ ├─ response: { batches: [...], total_count: N, today: date }
│  │ └─ примеры:
│  │    GET /api/catalog/batches?limit=5&includeFresh=true
│  │    → только партии < 3 дней
│  │
│  │ batch/:id
│  │ │ GET (получить одну партию)
│  │ │ └─ response: { batch: { id, date, items: [...] } }
│  │
│  └─ today-deliveries
│     │ GET (получить сегодняшние поставки)
│     └─ response: { batches: [...], count: N }
│
```

---

## Component lifecycle

```
МОНТИРОВАНИЕ (Component Mount)
══════════════════════════════

ProductsSection
    ├─ Проверяет /api/catalog/batches доступен?
    └─ Если ДА → монтирует GroupedView
              ├─ DeliveryBatchesNav
              │  ├─ useEffect() → GET /api/catalog/batches
              │  ├─ setActiveBatchIndex(0)
              │  └─ setState(batches)
              │
              └─ BatchProductsGrid
                 └─ useEffect() → слушает batch change

    └─ Если НЕТ → монтирует LegacyView


ВЗАИМОДЕЙСТВИЕ (Interaction)
════════════════════════════

Пользователь кликает < или >
    ↓
handlePrev() / handleNext() срабатывает
    ↓
setActiveBatchIndex(newIndex)
    ↓
useEffect() в DeliveryBatchesNav detects change
    ↓
Вызывает onBatchChange(newBatch)
    ↓
ProductsSection.setBatch(newBatch)
    ↓
BatchProductsGrid получает новый batch через props
    ↓
useEffect() перезапускает (batch зависимость)
    ↓
Компонент перерендерится с новыми товарами


СИНХРОНИЗАЦИЯ (Background Sync)
═══════════════════════════════

useDeliverySyncWatch(batchId)
    ├─ useEffect() → setInterval(checkForUpdates, 30000)
    │
    └─ Каждые 30 сек:
       ├─ GET /api/catalog/batch/:id
       ├─ Сравнивает response с текущим state
       ├─ Если изменилось → onUpdate() callback
       └─ BatchProductsGrid перезагружает

Пользователь добавляет товар на складе
    ├─ notifyInventoryUpdate()
    ├─ window.dispatchEvent("inventory:changed")
    └─ useInventoryUpdates() слышит событие
       └─ Немедленно перезагружает данные
          (не ждет 30 сек)
```

---

## Error handling & Fallbacks

```
ГРУППИРОВКА ПО ПАРТИЯМ НЕ РАБОТАЕТ
═════════════════════════════════════

API /api/catalog/batches выдает ошибку
    ├─ 404 (endpoint не существует)
    ├─ 500 (ошибка на сервере)
    ├─ Network error (сервер недоступен)
    │
    └─ ProductsSection обнаруживает:
       if (!res?.success || !res.batches) {
           setUseGroupedView(false)
       }

       Переключается на LegacyView
       └─ Показывает просто список товаров
          (как было раньше)


ТОВАРЫ НЕ ЗАГРУЖАЮТСЯ
═════════════════════════════════════

Причины:
├─ Партии пусты (нет товаров)
│  └─ Сообщение: "Товары не найдены"
│
├─ Товары с quantity = 0
│  └─ Фильтруются (не показываются)
│
├─ Фото товара не существует
│  └─ ProductCard показывает placeholder
│
└─ Ошибка API
   └─ Показывает error сообщение


СИНХРОНИЗАЦИЯ НЕ РАБОТАЕТ
═════════════════════════════════════

Polling не срабатывает?
├─ Проверить что useDeliverySyncWatch вызван
├─ Проверить interval: 30000ms = 30 сек
└─ Может быть network error

notifyInventoryUpdate() не срабатывает?
├─ Проверить что функция вызвана после добавления товара
├─ Проверить что window.dispatchEvent поддерживается
└─ Смотреть console.log() в браузере
```

---

## Performance optimizations

```
ОПТИМИЗАЦИЯ ЗАПРОСОВ
═════════════════════════════════════

1. Limit товаров в батче
   GET /api/catalog/batches?limit=50
   ↑ Ограничиваем 50 партий максимум

2. Пагинация
   GET /api/catalog/batches?limit=10&offset=0
   ↑ Можно загружать партиями

3. Lazy loading товаров
   Инициально загружаем только батчи
   Товары загружаются при выборе партии

4. Кэширование
   - Frontend: useState(batches) запоминает батчи
   - Polling обновляет только если изменилось

5. Debouncing
   - Не обновлять UI при каждом поллинге
   - Только если действительно изменилось


ОПТИМИЗАЦИЯ КОМПОНЕНТОВ
═════════════════════════════════════

1. useMemo()
   - Фильтрация товаров только при изменении batch/category

2. useCallback()
   - Обработчики событий мемоизированы

3. React.memo()
   - ProductCard обернут в memo чтобы не перерисовывать

4. Condition rendering
   - Загрузка UI еще до полной загрузки
```

---

## Summary

| Компонент                 | Функция       | Статус      |
| ------------------------- | ------------- | ----------- |
| **Backend**               |               |             |
| products-by-deliveries.js | API endpoints | ✅ Новый    |
| **Frontend**              |               |             |
| DeliveryBatchesNav.tsx    | Навигация ← → | ✅ Новый    |
| BatchProductsGrid.tsx     | Товары        | ✅ Новый    |
| ProductsSection.tsx       | Интеграция    | ✏️ Обновлен |
| use-delivery-sync.ts      | Синхр.        | ✅ Новый    |
| **Документация**          |               |             |
| ARCHITECTURE.md           | Архитектура   | ✅ 15KB     |
| EXAMPLES.md               | Примеры       | ✅ 20KB     |
| QUICKSTART.md             | Быстрый старт | ✅ 10KB     |
| SQL_TESTS.sql             | SQL тесты     | ✅ 8KB      |

---

**Полная система:** ✅ Готова к использованию
