# Implementation Pack v1 — Firebase / Firestore

Реляционный DDL из шаблона **не используется**. Ниже — эквивалент для **Firestore + Cloud Functions** (проект ODO / Business Hub может расширять существующие `bh_*` коллекции или вводить новые префиксы).

---

## 0. Структура репозитория (логическая)

```
functions/
  src/
    modules/
      core/           # общие триггеры, утилиты
      contacts/
      catalog/
      orders/
      payments/
      finance/
      inventory/
      production/
      delivery/
      pos/
      analytics/
      automation/
```

Клиент (Flutter): сервисы + модели под те же пути документов.

---

## 1. Коллекции Firestore (вместо таблиц)

Имена — **snake_case в идентификаторах полей**, коллекции — **camelCase или kebab-case** (ниже вариант для единообразия с текущим BH).

| Сущность (DDL) | Коллекция Firestore | Комментарий |
|----------------|---------------------|-------------|
| users | `erp_users` или расширение `users` | Связка с Firebase Auth: поле `authUid` |
| companies | `erp_companies` или расширение `bh_organizations` | Добавить `businessType` если ещё нет |
| contacts | `erp_contacts` | `companyId`, индекс по `companyId` + `type` |
| products | `erp_products` | `companyId`, `sku`, `barcode` |
| product_variants | подколлекция `erp_products/{id}/variants` **или** отдельная `erp_product_variants` с `productId` |
| orders | `erp_orders` | Центр; подколлекция `items` или отдельная `erp_order_items` |
| order_items | `erp_order_items` с полем `orderId` **или** `erp_orders/{id}/items/{itemId}` |
| payments | `erp_payments` | `orderId`, статус |
| operations (P&L) | `erp_operations` или переиспользовать BH operations при миграции |
| cash_movements | `erp_cash_movements` | |
| stock | `erp_stock` документ на пару `(companyId, productId)` или `erp_stock/{compositeId}` |
| stock_moves | `erp_stock_moves` | append-only журнал |
| BOM | `erp_boms` + `erp_bom_items` (или подколлекция items) |
| deliveries | `erp_deliveries` | |

**Составной ключ склада:** документ `erp_stock/{companyId}_{productId}` или поля + уникальный индекс.

---

## 2. Примеры документов (JSON-подобно)

### `erp_companies/{companyId}`

```json
{
  "name": "ТОО Пример",
  "businessType": "retail",
  "ownerUserId": "uid",
  "enabledModules": ["catalog", "orders", "payments", "inventory", "pos"],
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

`businessType`: `service | retail | production | restaurant | construction` — включает модули и поля в UI (см. существующий `BusinessVerticalIds` в приложении).

### `erp_products/{productId}`

```json
{
  "companyId": "uuid",
  "name": "string",
  "sku": "string",
  "barcode": "string|null",
  "type": "product",
  "price": 100000,
  "cost": 80000,
  "category": "string",
  "createdAt": "Timestamp"
}
```

### `erp_orders/{orderId}`

```json
{
  "companyId": "uuid",
  "contactId": "uuid|null",
  "status": "new",
  "totalAmount": 200000,
  "currency": "UZS",
  "createdBy": "uid",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### `erp_order_items/{itemId}`

```json
{
  "orderId": "uuid",
  "companyId": "uuid",
  "productId": "uuid",
  "qty": 2,
  "price": 100000,
  "total": 200000
}
```

### `erp_payments/{paymentId}`

```json
{
  "companyId": "uuid",
  "orderId": "uuid",
  "amount": 200000,
  "method": "cash",
  "status": "paid",
  "paidAt": "Timestamp"
}
```

### `erp_operations/{id}` (P&L)

```json
{
  "companyId": "uuid",
  "type": "income",
  "category": "sales",
  "amount": 200000,
  "linkedType": "payment",
  "linkedId": "uuid",
  "date": "Timestamp"
}
```

### `erp_stock/{stockDocId}`

```json
{
  "companyId": "uuid",
  "productId": "uuid",
  "quantity": 150
}
```

### `erp_stock_moves/{id}`

```json
{
  "companyId": "uuid",
  "productId": "uuid",
  "type": "out",
  "quantity": 5,
  "source": "order_completed",
  "sourceId": "orderId",
  "createdAt": "Timestamp"
}
```

---

## 3. «API» без REST — контракты для клиента и Functions

REST заменяется на:

| Операция | Рекомендация |
|----------|----------------|
| Создать заказ | Flutter: batch write `erp_orders` + N × `erp_order_items`; **или** `POST` HTTPS Cloud Function `createOrder` с транзакцией |
| Оплата | Запись в `erp_payments` + триггер `onCreate` |
| Статус заказа | `updateDoc` по `erp_orders/{id}` поле `status`, триггер `onUpdate` |
| Движение склада | Запись `erp_stock_moves` + транзакция пересчёта `erp_stock` |

### Callable function `createOrder` (контракт тела запроса — как в REST)

```json
{
  "companyId": "uuid",
  "contact_id": "uuid",
  "items": [
    { "product_id": "uuid", "qty": 2 }
  ]
}
```

Ответ: `{ "orderId": "..." }`.

Аналогично: `recordPayment`, `patchOrderStatus`, `stockMove` — либо callable, либо прямой Firestore с rules.

---

## 4. Автоматизация — Cloud Functions (event handlers)

Не SQL-триггеры, а **Firestore triggers**:

| Событие | Триггер | Действия |
|---------|---------|----------|
| PAYMENT_RECEIVED | `onCreate` на `erp_payments` где `status == paid` | Создать `erp_cash_movements` (in), `erp_operations` (income), обновить агрегаты / очередь analytics |
| ORDER_COMPLETED | `onUpdate` на `erp_orders` когда `status` → `done` | Списание склада (если тип товара product), пересчёт прибыли, analytics |
| PRODUCTION_DONE | `onCreate`/`onUpdate` production документа | Списание материалов по BOM, приход готовой продукции |

Идемпотентность: поле `processedAt` или отдельная коллекция `erp_processed_events/{dedupeKey}`.

---

## 5. Аналитика (вместо SQL)

Варианты:

1. **Запросы клиента** с `where` + агрегация на клиенте (только для малых объёмов).
2. **Плановый пересчёт** в `erp_analytics_daily/{companyId_YYYY-MM-DD}` через scheduled function.
3. **BigQuery Export** для Firebase (если включён) — тогда SQL уже в BigQuery, не в приложении.

Примеры полей дневного снимка:

```json
{
  "companyId": "uuid",
  "date": "2026-05-06",
  "revenue": 0,
  "expense": 0,
  "profit": 0,
  "cashBalance": 0
}
```

Запросы из раздела «По товарам» → коллекция `erp_analytics_products` или пересчёт из `erp_order_items` батчем.

---

## 6. POS (смена)

Отдельная коллекция `erp_pos_shifts`:

```json
{
  "companyId": "uuid",
  "openedBy": "uid",
  "openedAt": "Timestamp",
  "closedAt": "Timestamp|null",
  "openingCash": 0,
  "closingCash": null
}
```

Сценарий: открыть смену → корзина → создать заказ → оплата → (опционально) чек через Cloud Function / PDF.

---

## 7. BOM

- `erp_boms/{bomId}`: `{ companyId, productId (finished good), createdAt }`
- `erp_bom_items`: материал + `qty` на единицу выпуска.

При завершении производства — транзакция: читать BOM, писать `stock_moves`, обновлять `stock`.

---

## 8. Связь потока данных

```
Contact → Order → Payment → Finance (operations / cash) → Reports (analytics docs)
```

В Firestore связь только через **ID полей**, без FK — контроль в Rules и Functions.

---

## 9. Security Rules (минимальный принцип)

- Все документы содержат `companyId`.
- Правило: `request.auth.token.companyId == resource.data.companyId` (или membership в `erp_company_members`).
- Запрет произвольной записи в `erp_operations` с клиента, если только через Function.

---

## 10. Чек-лист разработчика (Firebase)

- [ ] Заказ создаётся за 3 клика (один batch или один callable).
- [ ] Оплата создаёт документ оплаты; триггер создаёт доход и движение кассы без дубля.
- [ ] Отчёты читают предагрегированные документы или Functions.
- [ ] Склад: транзакции при списании, журнал `stock_moves`.
- [ ] UI термины через `businessType` / вертикаль.
- [ ] Модули включаются флагами `enabledModules` на компании.

---

## 11. Связь с текущим приложением (ODO)

Уже есть: `bh_organizations`, `businessVerticalId`, частично операции и CRM. Новый ERP-слой можно:

- либо ввести префикс `erp_*` параллельно и постепенно мигрировать;
- либо расширять `BHOrganization` и существующие коллекции полями из этого пакета.

---

**Итог:** тот же продуктовый смысл (заказы, оплаты, склад, BOM, POS), но **контракт хранения — Firestore**, **бизнес-логика стабильности — транзакции + Cloud Functions**, **отчёты — агрегаты или экспорт**, не один большой SQL.
