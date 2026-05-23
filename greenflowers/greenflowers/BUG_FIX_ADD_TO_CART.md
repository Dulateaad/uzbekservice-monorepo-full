# 🔧 ИСПРАВЛЕНИЕ ОШИБКИ "Товар не добавляется в корзину"

## Причина проблемы

Таблица `inventory_items` не была связана с таблицей `products`. Когда фронтенд отправлял `inventory_item_id` в качестве `product_id`, база данных не находила соответствующий товар в таблице `products`.

## Решение (Шаги выполнения)

### 1️⃣ Запустить миграцию (БЕЗ ЭТО ШАГА ВСЁ НЕ БУДЕТ РАБОТАТЬ!)

```bash
# Перейти в папку back
cd back

# Запустить миграцию
node run-migration-007.js
```

**Вывод должен быть:**

```
✅ Migration completed successfully: product_id added to inventory_items

📊 Inventory Items Statistics:
  Total items: X
  Items linked to products: Y
  Items without product_id: Z
```

### 2️⃣ Что произойдёт после миграции

- ✅ В таблицу `inventory_items` добавится поле `product_id`
- ✅ Все товары в `inventory_items` будут автоматически связаны с товарами из `products` по имени
- ✅ API endpoint `/inventory-items/all-available` начнёт возвращать `product_id`
- ✅ Кнопка "+" будет использовать правильный `product_id` для добавления в корзину

### 3️⃣ Тестирование

После миграции:

1. Откройте главную страницу `http://localhost:3001`
2. Нажмите кнопку "+" на любом товаре
3. **КЛЮЧЕВОЙ ТЕСТ:** Откройте F12 → Console
4. Должны появиться логи:

   ```
   [CartContext] Adding to cart: {userId: 1, product_id: 5, product_name: "Red Roses", quantity: 1}
   [CartContext] Sending to API: {endpoint: "/api/cart", userId: 1, product_id: 5, quantity: 1}
   [CartContext] API Response: {success: true, ...}
   [CartContext] ✅ Item added successfully, cart reloaded
   ```

5. Товар должен появиться:
   - В badge корзины (красный кружок с числом в header)
   - На странице `/cart` при клике на корзину

### 4️⃣ Если всё еще не работает

**Проверьте в консоли (F12):**

```javascript
// Скопируйте и выполните в консоли:
localStorage.getItem("greenflowers_user"); // должны быть данные юзера

// Проверьте Network (F12 → Network):
// 1. При нажатии "+" должен быть POST /api/cart
// 2. Response должен быть: {"success": true, "message": "Товар добавлен в корзину"}
// 3. Status должен быть 200 или 201 (не 400 или 500)
```

### 5️⃣ Дополнительная информация

**Файлы которые были изменены:**

- ✅ `back/migrations/007_add_product_id_to_inventory.sql` - миграция для БД
- ✅ `back/run-migration-007.js` - скрипт для запуска миграции
- ✅ `back/routes/inventory-items.js` - API теперь возвращает `product_id`
- ✅ `sdfg/contexts/cart-context.tsx` - добавлено подробное логирование

**Правильный поток данных (после исправления):**

1. API `/inventory-items/all-available` возвращает товары с `product_id`
2. ProductCard отправляет `product.id` при нажатии "+"
3. CartContext использует это как `product_id`
4. API POST `/api/cart` получает правильный `product_id`
5. БД находит товар в таблице `products` и добавляет его в `cart_items`

---

## ⚠️ ВАЖНО: Миграция ОБЯЗАТЕЛЬНА!

Без запуска миграции ни одно из этих изменений не поможет. Сначала:

```bash
cd back
node run-migration-007.js
```

Затем перезагрузите фронтенд и бэкенд.
