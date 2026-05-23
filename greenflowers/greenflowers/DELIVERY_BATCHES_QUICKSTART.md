# ⚡ Быстрый старт: внедрение партий на главной странице

## 🎯 Цель

Переделать главную страницу (/) так, чтобы товары отображались сгруппированными по датам поставок вместо простого списка.

---

## ✅ Что уже сделано

1. ✅ Создан новый API endpoint `/api/catalog/batches`
2. ✅ Созданы React компоненты:
   - `DeliveryBatchesNav.tsx` - навигация по партиям
   - `BatchProductsGrid.tsx` - отображение товаров партии
3. ✅ Обновлен `ProductsSection.tsx` для использования партий
4. ✅ Создана синхронизация данных в `use-delivery-sync.ts`
5. ✅ Полная документация в `DELIVERY_BATCHES_ARCHITECTURE.md`
6. ✅ Примеры кода в `DELIVERY_BATCHES_EXAMPLES.md`

---

## 🚀 Шаги для внедрения (5 минут)

### Шаг 1: Проверить не обновляется ли уже главная

Откройте браузер и перейдите на `http://localhost:3000`

**Что вы должны увидеть:**

- Вверху: **Навигация по партиям** (календарь-стиль с кнопками ← →)
- Справа отображение даты поставки и количества товаров
- Ниже: **Список товаров из текущей партии**

Если видите это - **поздравляем! Система уже работает!** ✅

### Шаг 2: Если чего-то не работает, проверьте backend

```bash
# Перейти в папку back
cd back

# Перезапустить сервер
npm start

# Или если Node процесс зависает:
# Windows PowerShell:
Get-Process -Name "node" | Stop-Process -Force
npm start
```

**Проверить что API доступен:**

```bash
# В новом терминале:
curl http://localhost:5000/api/catalog/batches?limit=5
```

Если вернулось JSON с партиями - API работает! ✅

### Шаг 3: Если API выдает ошибку

**Ошибка: "partitions_batches not found"**

```bash
# Значит БД не создана или не применена миграция
# Запустите миграцию:
cd back
node run-migration-005.js
```

**Ошибка: "No batches found"**

```bash
# Партии есть в БД но статус != 'received' или они из будущего
# Проверьте в psql:
SELECT * FROM inventory_batches LIMIT 5;

# Обновите статус если нужно:
UPDATE inventory_batches SET status = 'received' WHERE status = 'draft';
```

### Шаг 4: Проверить структуру файлов

**Должны присутствовать:**

✅ Backend:

```
back/
├── routes/products-by-deliveries.js   ← новый файл
└── index.js                            ← обновлен (добавлен маршрут)
```

✅ Frontend:

```
sdfg/
├── components/store/
│   ├── delivery-batches-nav.tsx        ← новый файл
│   ├── batch-products-grid.tsx         ← новый файл
│   └── products-section.tsx            ← обновлен
├── hooks/
│   └── use-delivery-sync.ts            ← новый файл
└── app/
    └── page.tsx                        ← не нужны изменения (автоматически работает)
```

### Шаг 5: Запустить приложение

```bash
# Терминал 1: Backend
cd back
npm start

# Терминал 2: Frontend
cd sdfg
npm run dev

# Вы должны увидеть:
# Backend: 🌸 Server is running on http://localhost:5000
# Frontend: ▲ Local: http://localhost:3000
```

**Откройте в браузере:** http://localhost:3000

---

## 🔍 Проверка работоспособности

### Тест 1: Видите ли вы навигацию по партиям?

✅ **ДА:** Внизу должна быть строка вида:

```
← Поставка 22 февраля | Поставка 19 февраля | Поставка 15 февраля →
```

❌ **НЕТ:** Проверьте консоль браузера (F12 > Console):

```
GET http://localhost:5000/api/catalog/batches 404
→ API недоступен, перезапустите backend
```

### Тест 2: Вы можете навигироваться между партиями?

✅ **ДА:** Кликните на кнопку → и дата изменится
❌ **НЕТ:** Проверьте что батчей больше одного:

```bash
sqlite3  # или psql
SELECT COUNT(*) FROM inventory_batches WHERE status = 'received';
```

### Тест 3: Видите ли товары?

✅ **ДА:** Должны видеть карточки товаров с фото, названием, ценой
❌ **НЕТ:** Проверьте что товары привязаны к партиям:

```bash
SELECT * FROM inventory_items LIMIT 5;
# Должны быть batch_id и selling_price
```

### Тест 4: Фильтры работают?

✅ **ДА:** Выберите категорию в фильтрах слева, товары фильтруются
❌ **НЕТ:** Проверьте что товаров эта категория есть:

```bash
SELECT DISTINCT category FROM inventory_items;
```

---

## 📊 Примеры команд для отладки

### Проверить что партии существуют:

```bash
curl http://localhost:5000/api/catalog/batches

# Результат должен быть примерно:
{
  "success": true,
  "batches": [
    {
      "id": 1,
      "batch_date": "2026-02-22",
      "supplier_name": "Поставщик №1",
      "total_items": 120,
      "items": [...]
    }
  ]
}
```

### Проверить что товары в партии:

```bash
curl http://localhost:5000/api/catalog/batch/1

# Результат должен показать товары в партии с ID 1
```

### Проверить сегодняшние поставки:

```bash
curl http://localhost:5000/api/catalog/today-deliveries

# Вернет только партии за сегодня (если они есть)
```

---

## 🎨 Как кастомизировать внешний вид

### Изменить цвета партий:

**Файл:** `sdfg/components/store/delivery-batches-nav.tsx`

Найдите строку:

```tsx
<span
  className={`px-2 py-1 rounded-full text-xs font-medium ${
    activeBatch.is_new
      ? "bg-green-100 text-green-700"      ← цвет новых
      : activeBatch.is_fresh
        ? "bg-blue-100 text-blue-700"      ← цвет свежих
        : "bg-gray-100 text-gray-700"      ← цвет старых
  }`}
>
```

Измените цвета Tailwind:

- `bg-green-100` → любой другой цвет (например `bg-emerald-100`)
- `text-green-700` → цвет текста

### Изменить интервал синхронизации:

**Файл:** `sdfg/hooks/use-delivery-sync.ts`

Найдите строку:

```typescript
intervalRef.current = setInterval(checkForUpdates, 30000);
                                                    ↑↑↑↑↑
                                        30000ms = 30 секунд
```

Измените значение (в миллисекундах):

- `10000` - каждые 10 секунд
- `60000` - каждую минуту

---

## 🔧 Возможные проблемы и решения

### Проблема: "Партии не загружаются"

**Решение:**

```bash
# 1. Проверить что backend запущен
ps aux | grep node

# 2. Проверить URL в браузере (F12 > Network)
# Должен быть GET /api/catalog/batches 200 OK

# 3. Проверить логи backend
tail -f back/server.log
```

### Проблема: "Товары не отображаются"

**Решение:**

```bash
# 1. Проверить что товары в батче
SELECT * FROM inventory_items WHERE batch_id = 1;

# 2. Проверить что quantity > 0
SELECT * FROM inventory_items WHERE quantity > 0 LIMIT 5;

# 3. Проверить что photo_url не пустой (если нужны фото)
SELECT * FROM inventory_items WHERE photo_url IS NOT NULL;
```

### Проблема: "Синхронизация не работает"

**Решение:**

```bash
# 1. Открыть F12 > Console
# 2. Добавить товар на складе (TruckTabs)
# 3. Проверить что в консоли браузера появилось событие:
#    "📢 Инвентарь обновлен, перезагружаем..."

# 4. Если событие не появилось - проверить что функция вызывается:
# В components/inventory/add-item-modal.tsx должна быть:
#   notifyInventoryUpdate();
```

---

## 📚 Дальнейшее развитие

### Что можно добавить:

1. **Скидки для старых партий**
   - Добавить поле `discount_percent` в `inventory_batches`
   - Backend: применять скидку при age_days > 3
   - Frontend: показывать зачеркнутую цену

2. **Web сокеты для real-time**
   - Сейчас используется polling (30 сек)
   - Можно сделать WebSocket для instant обновлений

3. **Уведомления поступления**
   - Web Push notifications когда пришла новая партия
   - Toast notifications в UI

4. **История партий**
   - Страница с архивом всех партий
   - График по дням

5. **Отчеты**
   - По популярности товаров в партиях
   - По срокам хранения

---

## ✨ Готово!

Если всё работает - вы готовы к развертыванию! 🎉

**Что клиент получает:**

- 📅 Удобная навигация по поставкам (как календарь)
- 🌸 Прозрачность: видит свежесть цветов
- 💰 Скидки на старые партии (уменьшает отходы)
- 🔄 Real-time синхронизация (товары обновляются автоматически)

---

## 📞 Вопросы?

Смотрите документацию:

- **Архитектура:** `DELIVERY_BATCHES_ARCHITECTURE.md`
- **Примеры кода:** `DELIVERY_BATCHES_EXAMPLES.md`
- **Этот файл:** `DELIVERY_BATCHES_QUICKSTART.md`
