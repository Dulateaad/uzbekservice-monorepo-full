# Реализация информации о фуре для каждого товара в заказе

## Резюме
Успешно реализована система отслеживания и отображения информации о фуре (грузовике) для каждого отдельного товара в заказе. Ранее система показывала информацию о грузовике для всего заказа целиком, предполагая, что один заказ может быть доставлен только из одного грузовика. Новая система позволяет отслеживать, из какого грузовика пришел каждый конкретный товар.

## Выполненные изменения

### 1. База данных
- **Файл:** `back/add-truck-to-order-items.js`
- **Действие:** Добавлена колонка `truck_id` (UUID) в таблицу `order_items`
- **Статус:** ✅ Выполнено
- **Команда:** `node add-truck-to-order-items.js`
- **Результат:** 
```
Adding truck_id column to order_items...
✅ Successfully added truck_id column to order_items
```

### 2. Backend API
- **Файл:** `back/routes/orders.js`
- **Изменения:** 
  - Обновлены SQL запросы в двух ветках эндпоинта `GET /api/orders/all` (для администратора и рабочего)
  - Добавлены `LEFT JOIN trucks t_item ON oi.truck_id = t_item.id` для чтения информации о грузовике для каждого товара
  - Специфицированы поля `truck_id`, `truck_identifier`, `truck_arrival_date` в `array_agg()` для каждого товара
- **Статус:** ✅ Выполнено (были обновлены в предыдущей сессии)

**Пример возвращаемого JSON:**
```json
{
  "items": [
    {
      "product_id": 1,
      "product_name": "Цветок A",
      "quantity": 10,
      "unit_price": 1000,
      "truck_id": "uuid-here",
      "truck_identifier": "ФУ-001",
      "truck_arrival_date": "2024-03-15"
    }
  ]
}
```

### 3. Frontend типизация

#### Интерфейс OrderItem
Обновлен во всех файлах для включения truck-полей:

- **`sdfg/app/admin/orders/page.tsx`** ✅
  ```typescript
  interface OrderItem {
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    truck_id?: string | null;
    truck_identifier?: string | null;
    truck_arrival_date?: string | null;
  }
  ```

- **`sdfg/app/employee/orders/page.tsx`** ✅
- **`sdfg/app/client/orders/[id]/page.tsx`** ✅
- **`sdfg/app/orders/page.tsx`** ✅
- **`sdfg/app/order-confirmation/[id]/page.tsx`** ✅

### 4. Frontend отображение

#### Админ-панель: `/sdfg/app/admin/orders/page.tsx`
- **Изменение:** Информация о фуре перемещена со уровня заказа на уровень товара
- **Удалено:** Блок с информацией о фуре для всего заказа (lines 458-473)
- **Добавлено:** Для каждого товара добавлен блок с форматом:
  ```
  Фура: [truck_identifier] • [arrival_date]
  ```
- **Стиль:** Минимальный - текст размер xs, серый цвет #6 в оттенках

#### Клиент (детали заказа): `/sdfg/app/client/orders/[id]/page.tsx`
- **Изменение:** Информация о фуре добавлена к каждому товару в разделе "Товары в заказе"
- **Формат:** `Фура: [identifier] • [date]` (размер xs, серый)
- **Условие:** Отображается только если у товара есть truck_identifier

#### Подтверждение заказа: `/sdfg/app/order-confirmation/[id]/page.tsx`
- **Добавлено:** Информация о фуре для каждого товара
- **Место:** Рядом с информацией о товаре в разделе "Товары"
- **Формат:** Аналогично другим страницам

#### Страница заказов (список): `/sdfg/app/orders/page.tsx`
- **Добавлено:** В превью списка товаров (первые 2 товара) показывается информация о фуре
- **Формат:** Под названием товара показывается `Фура: [identifier] • [date]`

#### Рабочая панель: `/sdfg/app/employee/orders/page.tsx`
- **Примечание:** Файл просто возвращает AdminOrdersPage, собственный код отображения не используется
- **Обновлено:** На случай будущего изменения, добавлена информация о фуре в мертвый код

## Архитектура

### Поток данных
```
Database (order_items.truck_id)
    ↓
Backend SQL Query (LEFT JOIN trucks on oi.truck_id)
    ↓
API Response (items with truck_id, truck_identifier, truck_arrival_date)
    ↓
Frontend Component (OrderItem interface)
    ↓
Display (Truck info shown per item)
```

### Логика отображения
- Каждый товар в заказе может иметь свой собственный грузовик
- Если товар не имеет truck_id (NULL), информация о фуре не отображается
- Если товар имеет truck_id, отображается:
  - truck_identifier (название/номер фуры, например "ФУ-001")
  - truck_arrival_date (дата прибытия фуры)

## Тестирование и валидация

### Build Status
- ✅ Next.js build успешно скомпилирован
- ✅ TypeScript валидация пройдена
- ✅ Все интерфейсы типизированы корректно

### Database Migration
- ✅ Колонка truck_id успешно добавлена в order_items
- ✅ Миграция идемпотентна (проверяет существование колонки перед добавлением)

## Оставшиеся задачи

### При заполнении данных
1. Когда создается новый заказ (через `/client/new-order`), нужно убедиться, что для каждого товара устанавливается правильный `truck_id`. Это зависит от логики, когда товары распределяются по грузовикам.

2. При добавлении товара в существующий заказ, нужно также выбрать подходящий грузовик и установить его в `order_items.truck_id`.

### Возможные улучшения
1. Добавить валидацию, что oi.truck_id существует в таблице trucks
2. Добавить индекс на order_items(truck_id) для улучшения производительности запросов
3. Добавить логику автоматического выбора грузовика при создании заказа

## Файлы со ссылками

- Backend API: [back/routes/orders.js](back/routes/orders.js) (lines 200-220 для admin, lines 225+ для worker)
- DB миграция: [back/add-truck-to-order-items.js](back/add-truck-to-order-items.js)
- Frontend компоненты:
  - [sdfg/app/admin/orders/page.tsx](sdfg/app/admin/orders/page.tsx)
  - [sdfg/app/client/orders/[id]/page.tsx](sdfg/app/client/orders/[id]/page.tsx)
  - [sdfg/app/orders/page.tsx](sdfg/app/orders/page.tsx)
  - [sdfg/app/order-confirmation/[id]/page.tsx](sdfg/app/order-confirmation/[id]/page.tsx)
