# Примеры кода: Группировка товаров по поставкам

## 📝 Содержание

1. Backend примеры (API)
2. Frontend примеры (React)
3. Примеры интеграции с существующим кодом
4. Примеры синхронизации данных
5. Примеры фильтрации и сортировки

---

## 1️⃣ Backend примеры (Node.js + Express)

### Пример 1.1: Простой запрос партий

```javascript
// GET /api/catalog/batches
fetch("http://localhost:5000/api/catalog/batches?limit=10")
  .then((r) => r.json())
  .then((data) => {
    console.log("Партии:", data.batches);
    console.log("Всего партий:", data.total_count);
    data.batches.forEach((batch) => {
      console.log(`${batch.batch_date}: ${batch.total_items} товаров`);
      batch.items.forEach((item) => {
        console.log(
          `  - ${item.name}: ${item.quantity} шт @ ${item.selling_price}₽`,
        );
      });
    });
  });
```

**Результат:**

```
Партии: [...]
Всего партий: 15
2026-02-22: 120 товаров
  - Роза: 50 шт @ 120₽
  - Гвоздика: 70 шт @ 80₽
```

### Пример 1.2: Запрос только свежих партий

```javascript
// Получить только партии, поступившие в последние 3 дня
fetch("http://localhost:5000/api/catalog/batches?includeFresh=true")
  .then((r) => r.json())
  .then((data) => {
    console.log(`Свежих партий: ${data.batches.length}`);
    data.batches.forEach((batch) => {
      const label = batch.is_new
        ? "🆕 НОВОЕ"
        : batch.is_fresh
          ? "✨ СВЕЖЕЕ"
          : "🔄 СТАРОЕ";
      console.log(
        `${label} | ${batch.batch_date} | ${batch.age_days} дней назад`,
      );
    });
  });
```

### Пример 1.3: Получить одну партию

```javascript
// GET /api/catalog/batch/1 - получить партию с ID 1
async function getBatch(batchId) {
  const res = await fetch(`http://localhost:5000/api/catalog/batch/${batchId}`);
  const data = await res.json();

  if (data.success) {
    const batch = data.batch;
    console.log(`Партия от ${batch.batch_date}`);
    console.log(`Товаров: ${batch.total_items}`);
    console.log(
      `${batch.is_new ? "Новая ✨" : batch.is_fresh ? "Свежая" : "Старая"}`,
    );

    // Применить скидку для старых партий
    if (batch.age_days > 3) {
      console.log("💰 Возможна скидка для этой партии!");
    }
  }
}

getBatch(1);
```

### Пример 1.4: Сегодняшние поставки

```javascript
// Получить только партии, пришедшие сегодня
fetch("http://localhost:5000/api/catalog/today-deliveries")
  .then((r) => r.json())
  .then((data) => {
    console.log(`Сегодня поступило: ${data.count} партий`);
    data.batches.forEach((batch) => {
      console.log(`✨ ${batch.supplier_name} - ${batch.total_items} товаров`);
    });
  });
```

---

## 2️⃣ Frontend примеры (React + TypeScript)

### Пример 2.1: Использование навигации по партиям

```typescript
// components/my-catalog.tsx
import React, { useState } from 'react';
import { DeliveryBatchesNav } from '@/components/store/delivery-batches-nav';
import { BatchProductsGrid } from '@/components/store/batch-products-grid';

export function MyCatalog() {
  const [activeBatch, setActiveBatch] = useState(null);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Навигация по партиям */}
      <DeliveryBatchesNav
        onBatchChange={setActiveBatch}
        showOnlyFresh={false}
      />

      {/* Товары текущей партии */}
      <BatchProductsGrid
        batch={activeBatch}
        selectedCategory={null}
      />
    </div>
  );
}
```

### Пример 2.2: Обработка выбора партии

```typescript
export function CatalogWithInfo() {
  const [batch, setBatch] = useState(null);

  const handleBatchChange = (newBatch) => {
    setBatch(newBatch);

    // Логирование для аналитики
    if (newBatch) {
      console.log(`Пользователь выбрал партию ${newBatch.batch_date}`);
      console.log(`Товаров: ${newBatch.total_items}`);
      console.log(`Возраст: ${newBatch.age_days} дней`);

      // Отправить событие в аналитику
      gtag('event', 'view_batch', {
        batch_id: newBatch.id,
        batch_date: newBatch.batch_date,
        is_fresh: newBatch.is_fresh,
        item_count: newBatch.total_items,
      });
    }
  };

  return <DeliveryBatchesNav onBatchChange={handleBatchChange} />;
}
```

### Пример 2.3: Фильтрация товаров по типу

```typescript
export function FilteredBatchCatalog() {
  const [batch, setBatch] = useState(null);
  const [selectedType, setSelectedType] = useState('Розы');

  // Фильтр только из текущей партии
  const filteredItems = batch?.items.filter(
    item => item.category === selectedType
  ) || [];

  return (
    <div>
      <DeliveryBatchesNav onBatchChange={setBatch} />

      <div className="grid grid-cols-3 gap-4 mt-6">
        {['Розы', 'Гвоздики', 'Альстромерия'].map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`p-2 rounded ${
              selectedType === type ? 'bg-blue-600 text-white' : 'bg-gray-100'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <p>Товаров категории "{selectedType}": {filteredItems.length}</p>
        <ul>
          {filteredItems.map(item => (
            <li key={item.id}>
              {item.name} ({item.variety}) - {item.quantity} шт @ {item.selling_price}₽
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

### Пример 2.4: Отображение статуса свежести

```typescript
export function BatchStatusBadge({ batch }) {
  if (!batch) return null;

  const getStatus = () => {
    if (batch.is_new) {
      return { label: '🆕 Новое поступление', color: 'bg-green-500', text: 'Сегодня или вчера' };
    }
    if (batch.is_fresh) {
      return { label: '✨ Свежее', color: 'bg-blue-500', text: 'До 3 дней' };
    }
    return { label: '🔄 Старые цветы', color: 'bg-gray-500', text: `${batch.age_days} дней назад` };
  };

  const status = getStatus();

  return (
    <div className={`${status.color} text-white p-4 rounded`}>
      <h3 className="font-bold">{status.label}</h3>
      <p className="text-sm">{status.text}</p>
      {batch.age_days > 3 && (
        <p className="text-sm mt-2">💰 Рекомендуется скидка для этой партии</p>
      )}
    </div>
  );
}
```

---

## 3️⃣ Интеграция с существующим кодом

### Пример 3.1: Обновление главной страницы (page.tsx)

```typescript
// app/page.tsx - ДО
export default function Home() {
  return (
    <div className="max-w-7xl mx-auto">
      <StoreBanner />
      <div className="grid grid-cols-3 gap-6">
        <StoreFilters />
        <ProductsSection />  {/* Просто список товаров */}
      </div>
    </div>
  );
}

// app/page.tsx - ПОСЛЕ
export default function Home() {
  return (
    <div className="max-w-7xl mx-auto">
      <StoreBanner />
      <div className="grid grid-cols-3 gap-6">
        <StoreFilters />
        {/* ProductsSection теперь автоматически использует партии */}
        <ProductsSection />
      </div>
    </div>
  );
}

// Никаких изменений не требуется - ProductsSection автоматически
// проверяет доступность API партий и переключается на новый режим
```

### Пример 3.2: Добавление товара на складе (синхронизация)

```typescript
// components/inventory/add-item-modal.tsx
import { notifyInventoryUpdate } from '@/hooks/use-delivery-sync';

export function AddItemModal() {
  const handleSubmit = async (formData) => {
    try {
      const res = await api.request('POST', '/api/inventory-items', {
        batch_id: selectedBatch.id,
        name: formData.name,
        variety: formData.variety,
        quantity: formData.quantity,
        selling_price: formData.price,
        photo_url: formData.photo,
      });

      if (res.success) {
        // 🔑 Уведомить каталог на главной что надо обновиться
        notifyInventoryUpdate();

        toast.success('Товар добавлен в партию');
        closeModal();
      }
    } catch (err) {
      toast.error('Ошибка добавления товара');
    }
  };

  return <form onSubmit={handleSubmit} {...} />;
}
```

### Пример 3.3: Удаление товара (синхронизация)

```typescript
// components/inventory/delete-item.tsx
import { notifyInventoryUpdate } from '@/hooks/use-delivery-sync';

export function DeleteItemButton({ itemId }) {
  const handleDelete = async () => {
    if (confirm('Удалить товар?')) {
      try {
        const res = await api.request('DELETE', `/api/inventory-items/${itemId}`);

        if (res.success) {
          // 🔑 Уведомить что товар удален
          notifyInventoryUpdate();

          toast.success('Товар удален');
        }
      } catch (err) {
        toast.error('Ошибка удаления');
      }
    }
  };

  return (
    <button onClick={handleDelete} className="px-3 py-1 bg-red-500 text-white rounded">
      Удалить
    </button>
  );
}
```

---

## 4️⃣ Примеры синхронизации данных

### Пример 4.1: Auto-refresh при обновлении везде

```typescript
export function BatchProductsGridWithSync() {
  const [batch, setBatch] = useState(null);
  const [items, setItems] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Синхронизация: каждые 30 сек или при изменении инвентаря
  useDeliverySyncWatch(batch?.id, async () => {
    console.log('Синхронизация: проверка обновлений партии...');
    const res = await api.request(`/catalog/batch/${batch.id}`);

    if (res?.success) {
      setItems(res.batch.items);
      setLastUpdate(Date.now());
      console.log('✅ Синхронизация завершена');
    }
  });

  // Слушать события обновления инвентаря
  useInventoryUpdates(() => {
    console.log('📢 Инвентарь обновлен, перезагружаем...');
    // Перезагрузить данные немедленно (не ждать 30 сек)
    useDeliverySyncWatch(batch?.id, async () => {
      // ...
    });
  });

  return (
    <div>
      <div className="text-xs text-gray-500">
        Последнее обновление: {new Date(lastUpdate).toLocaleTimeString('ru-RU')}
      </div>
      {/* Товары */}
    </div>
  );
}
```

### Пример 4.2: Кастомный интервал синхронизации

```typescript
export function useCustomSyncInterval(intervalMs = 60000) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const syncData = async () => {
      try {
        const res = await api.request("/catalog/batches?limit=10");
        if (res?.success) {
          setData(res.batches);
          console.log(
            "🔄 Синхронизация в",
            new Date().toLocaleTimeString("ru-RU"),
          );
        }
      } catch (err) {
        console.error("Ошибка синхронизации:", err);
      }
    };

    // Синхронизировать сразу при монтировании
    syncData();

    // Потом каждые N миллисекунд
    const interval = setInterval(syncData, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return data;
}

// Использование:
const batches = useCustomSyncInterval(60000); // каждую минуту
```

### Пример 4.3: WebSocket синхронизация (опционально)

```typescript
// hooks/use-websocket-sync.ts - для будущего использования

export function useWebSocketSync(batchId) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    // Connection к WebSocket серверу (если будет реализован)
    // const ws = new WebSocket(`ws://localhost:5000/sync/batch/${batchId}`);
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   if (data.type === 'batch_updated') {
    //     setItems(data.items);
    //     console.log('📡 Real-time обновление из WebSocket');
    //   }
    // };
    // return () => ws.close();
  }, [batchId]);

  return items;
}
```

---

## 5️⃣ Примеры фильтрации и сортировки

### Пример 5.1: Фильтрация только определенных видов

```typescript
export function FilterByVariety() {
  const [batch, setBatch] = useState(null);
  const [varieties, setVarieties] = useState(new Set());

  // Извлечь все уникальные виды из партии
  const allVarieties = useMemo(() => {
    if (!batch) return [];
    return [...new Set(batch.items.map(i => i.variety))].filter(Boolean);
  }, [batch]);

  // Отфильтровать товары по выбранным видам
  const filtered = useMemo(() => {
    if (!batch || varieties.size === 0) return batch?.items || [];
    return batch.items.filter(i => varieties.has(i.variety));
  }, [batch, varieties]);

  const toggleVariety = (variety) => {
    const newSet = new Set(varieties);
    if (newSet.has(variety)) {
      newSet.delete(variety);
    } else {
      newSet.add(variety);
    }
    setVarieties(newSet);
  };

  return (
    <div>
      <h3>Выберите виды:</h3>
      <div className="grid grid-cols-3 gap-2">
        {allVarieties.map(variety => (
          <label key={variety}>
            <input
              type="checkbox"
              checked={varieties.has(variety)}
              onChange={() => toggleVariety(variety)}
            />
            {variety}
          </label>
        ))}
      </div>
      <p>Найдено: {filtered.length} товаров</p>
    </div>
  );
}
```

### Пример 5.2: Фильтрация по цене

```typescript
export function FilterByPrice() {
  const [batch, setBatch] = useState(null);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(500);

  const filtered = useMemo(() => {
    if (!batch) return [];
    return batch.items.filter(
      i => i.selling_price >= minPrice && i.selling_price <= maxPrice
    );
  }, [batch, minPrice, maxPrice]);

  return (
    <div>
      <h3>Диапазон цен:</h3>
      <input
        type="range"
        min={0}
        max={500}
        value={minPrice}
        onChange={e => setMinPrice(Number(e.target.value))}
      />
      <span>{minPrice}₽</span>

      <input
        type="range"
        min={0}
        max={500}
        value={maxPrice}
        onChange={e => setMaxPrice(Number(e.target.value))}
      />
      <span>{maxPrice}₽</span>

      <p>Найдено: {filtered.length} товаров в диапазоне {minPrice}-{maxPrice}₽</p>
    </div>
  );
}
```

### Пример 5.3: Сортировка товаров

```typescript
export function SortedBatchProducts() {
  const [batch, setBatch] = useState(null);
  const [sortBy, setSortBy] = useState('name'); // name | price | quantity

  const sorted = useMemo(() => {
    if (!batch) return [];

    const items = [...batch.items];

    switch (sortBy) {
      case 'name':
        return items.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      case 'price':
        return items.sort((a, b) => a.selling_price - b.selling_price);
      case 'quantity':
        return items.sort((a, b) => b.quantity - a.quantity);
      default:
        return items;
    }
  }, [batch, sortBy]);

  return (
    <div>
      <h3>Сортировка:</h3>
      <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
        <option value="name">По названию (А-Я)</option>
        <option value="price">По цене (возрастание)</option>
        <option value="quantity">По количеству (убывание)</option>
      </select>

      <table className="mt-4 w-full">
        <thead>
          <tr>
            <th>Название</th>
            <th>Количество</th>
            <th>Цена</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>{item.selling_price}₽</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🎯 Практический workflow

Полный пример интеграции:

```typescript
// app/storefront/page.tsx
import { DeliveryBatchesNav } from '@/components/store/delivery-batches-nav';
import { BatchProductsGrid } from '@/components/store/batch-products-grid';

export default async function StorefrontPage() {
  // 1️⃣ Загрузить партии на сервере (SSR)
  const batchesRes = await fetch('http://localhost:5000/api/catalog/batches?limit=5');
  const batchesData = await batchesRes.json();

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Заголовок */}
      <h1 className="text-4xl font-bold mb-6">Каталог цветов</h1>

      {/* Навигация по партиям (client component) */}
      <DeliveryBatchesNav showOnlyFresh={false} />

      {/* Товары (client component) */}
      <BatchProductsGrid batch={null} />
    </div>
  );
}
```

---

## ✨ Итого

Все примеры показывают:

- ✅ Как получить данные о партиях
- ✅ Как использовать компоненты фронтенда
- ✅ Как ингегрировать с существующим кодом
- ✅ Как синхронизировать данные в реальном времени
- ✅ Как фильтровать и сортировать товары
