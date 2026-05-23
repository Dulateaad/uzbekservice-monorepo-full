# 🔧 Отладка и решение проблем

## Типичные проблемы и решения

### 1. Кнопка "Оформить" не реагирует

**Проблема**: При клике на кнопку "Оформить" ничего не происходит

**Решение**:

```bash
# 1. Проверьте консоль браузера (F12 → Console)
# Должна быть информация о проверке авторизации

# 2. Убедитесь, что пользователь залогинен
# - Откройте DevTools → Storage → localStorage
# - Проверьте наличие ключа "greenflowers_user"

# 3. Убедитесь, что в корзине есть товары
# - localStorage → "temp_cart" должна содержать товары

# 4. Перезагрузите страницу (Ctrl+Shift+R) для очистки кэша
```

### 2. Форма доставки не отправляется

**Проблема**: При клике на "Подтвердить и оформить" форма не отправляется

**Решение**:

```bash
# 1. Проверьте консоль браузера
# - Должны быть видны сообщения об ошибках

# 2. Убедитесь, что заполнены все обязательные поля
# - Адрес доставки (не пустой)
# - Город (не пустой)
# - Телефон (минимум 8 символов: цифры, пробелы, +, дефисы)

# 3. Проверьте формат телефона
# ✓ Правильно: +7 (999) 123-45-67
# ✓ Правильно: +7-999-123-4567
# ✗ Неправильно: 9991234567 (меньше 8 символов с учетом пробелов и спецсимволов)

# 4. Проверьте соединение с API
# - DevTools → Network → XHR
# - При клике должна быть POST заявка на http://localhost:5000/api/orders
```

### 3. Заказ создаётся, но страница успеха не загружается

**Проблема**: API возвращает 201, но страница не показывает "Заказ успешно оформлен!"

**Решение**:

```typescript
// В checkout/page.tsx проверьте handleFormSubmit:

if (resp?.success && resp?.order?.id) {
  // Убедитесь, что:
  // 1. setCreatedOrderId(resp.order.id) выполняется
  // 2. clearCart() выполняется (не выкидывает ошибку)
  // 3. setStep("success") выполняется последней
  setCreatedOrderId(resp.order.id);
  if (clearCart) await clearCart();
  setStep("success");
}
```

### 4. Корзина не очищается после заказа

**Проблема**: После оформления заказа товары остаются в корзине

**Решение**:

```typescript
// В contexts/cart-context.tsx проверьте clearCart():

const clearCart = async () => {
  if (userId) {
    // Для авторизованных пользователей
    try {
      await api.clearCart(userId);
      setCart([]);
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  } else {
    // Для гостей
    localStorage.removeItem("temp_cart");
    setCart([]);
  }
};

// В checkout/page.tsx:
if (clearCart) await clearCart();
```

### 5. API возвращает ошибку 400/500

**Проблема**: При отправке заказа API возвращает ошибку

**Решение**:

```bash
# 1. Проверьте логи backend
# - DevTools → Network → XHR → /api/orders → Request Payload
# - Убедитесь, что все поля используют snake_case:
#   ✓ user_id, customer_name, delivery_city
#   ✗ userId, customerName, deliveryCity

# 2. Проверьте, что все обязательные поля присутствуют:
user_id: number (required)
customer_name: string (required)
customer_phone: string (required)
customer_email: string (optional)
total_amount: number (required)
delivery_city: string (required)
delivery_address: string (required)
delivery_date: string ISO format (required)
payment_method: "cash" | "kaspi_qr" (required)
payment_status: "pending" | "paid" (required)
status: "pending" | "confirmed" (required)
items: Array<{ product_id, quantity, unit_price }> (required)

# 3. Проверьте backend логи
cd back
# В консоли должны быть логи POST запроса
```

### 6. Неправильный расчёт итоговой суммы

**Проблема**: Итоговая сумма на странице checkout отличается от суммы в корзине

**Решение**:

```typescript
// В checkout/page.tsx проверьте getDisplayPrice:

const getDisplayPrice = (item: any) => {
  return item.price ?? item.price_per_box ?? item.price_per_unit ?? 0;
};

// Расчёт должен быть:
// 1. Если price - используем price
// 2. Если нет - используем price_per_box
// 3. Если нет - используем price_per_unit * 50
// 4. Если ничего нет - 0

// При создании заказа (handleFormSubmit):
unit_price: Number(
  item.price_per_box ||
    Number(item.price_per_unit || item.price || 0) * 50 ||
    item.price ||
    0,
);
```

### 7. Проблемы с localStorage

**Проблема**: Данные пользователя не загружаются

**Решение**:

```javascript
// В DevTools → Storage → localStorage проверьте:

// Должны быть ключи:
greenflowers_user: {
  id: 1,
  email: "user@example.com",
  phone: "+7 999...",
  name: "Name"
}

temp_cart: [
  {
    id: 1,
    product_id: 1,
    quantity: 5,
    name: "Product Name",
    price_per_box: 5000,
    image_url: "..."
  }
]

// Для очистки (если нужно):
localStorage.removeItem("greenflowers_user");
localStorage.removeItem("temp_cart");
location.reload();
```

### 8. Стили некорректно отображаются

**Проблема**: Кнопки, цвета, отступы выглядят неправильно

**Решение**:

```bash
# 1. Убедитесь, что используется Tailwind CSS
# - В globals.css должны быть директивы:
#   @tailwind base;
#   @tailwind components;
#   @tailwind utilities;

# 2. Пересчитайте Tailwind классы
npm run build

# 3. Перезагрузите страницу (Ctrl+Shift+R)

# 4. Проверьте, что tailwind.config.ts включает правильные пути:
content: [
  "./app/**/*.{js,ts,jsx,tsx}",
  "./components/**/*.{js,ts,jsx,tsx}",
]
```

### 9. Форма показывает ошибки, но данные правильные

**Проблема**: Валидация работает неправильно

**Решение**:

```typescript
// В components/checkout/delivery-form.tsx:

const validatePhone = (value: string): boolean => {
  // Регулярное выражение:
  // ^[\d\s\-\+\(\)]{8,}$
  // ✓ Минимум 8 символов из: цифр, пробелов, -, +, скобок

  return /^[\d\s\-\+\(\)]{8,}$/.test(value);
};

// Примеры:
// ✓ "+7 (999) 123-45-67" - 19 символов, подходит
// ✓ "99912345678" - 11 символов (цифры), подходит
// ✗ "999 123 45" - 10 символов, но может быть проблема с парсингом
```

### 10. API недоступен

**Проблема**: Ошибка CORS или соединение не установлено

**Решение**:

```bash
# 1. Убедитесь, что backend запущен
cd back
npm start
# Должно вывести: "✅ Database connected successfully"

# 2. Проверьте API URL в lib/api-client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

# 3. Проверьте CORS в backend index.js
# Должно быть:
cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
  ],
  credentials: true,
})

# 4. Проверьте, что frontend может достучаться
# В консоли браузера:
fetch("http://localhost:5000/api/orders", { method: "GET" })
  .then(r => r.json())
  .then(d => console.log(d))
```

## 📋 Контрольный список отладки

При возникновении проблем проверьте по порядку:

- [ ] Backend запущен (`npm start` в /back)
- [ ] Frontend запущен (`npm run dev` в /sdfg)
- [ ] Пользователь авторизован (localStorage → greenflowers_user)
- [ ] Есть товары в корзине (localStorage → temp_cart)
- [ ] Все обязательные поля формы заполнены
- [ ] Телефон в правильном формате (минимум 8 символов с +, -, скобками, пробелами)
- [ ] DevTools Console очищена от старых ошибок
- [ ] Страница перезагружена (Ctrl+Shift+R)
- [ ] Network tab показывает POST /api/orders
- [ ] API возвращает статус 201 (успешно создано)
- [ ] Response содержит order.id

## 🔍 Команды для отладки

```bash
# 1. Просмотр логов backend
tail -f back/logs.txt

# 2. Проверка database
psql -U postgres -d greenflowers -c "SELECT * FROM orders LIMIT 5;"

# 3. Тестирование API с curl
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{...order payload...}'

# 4. Очистка temp файлов frontend
cd sdfg
rm -rf .next node_modules
npm install
npm run dev

# 5. Rebuild Tailwind styles
npm run build
```

## 📝 Логирование

### Frontend (Browser Console)

```javascript
// Добавьте в checkout/page.tsx для отладки:
console.debug("Creating order with data:", orderData);
console.debug("Order creation response:", resp);

// Смотрите в DevTools → Console
```

### Backend (Terminal)

```javascript
// Добавьте в back/routes/orders.js:
console.log("[POST /orders]", req.body);
console.log("[Order Created]", result);

// Смотрите в терминале, где запущен backend
```

## 🆘 Получение помощи

Если ничего не помогло:

1. Проверьте все логи (frontend + backend)
2. Попробуйте тестовый скрипт:
   ```bash
   node test-checkout-integration.js
   ```
3. Проверьте этот файл снова (может быть пропущен шаг)
4. Перезагрузите компьютер (хотя бы backend и frontend)
5. Удалите node_modules и переустановите:
   ```bash
   cd back && npm install
   cd ../sdfg && npm install
   ```

---

**Дата создания**: 13.02.2026
**Версия**: 1.0
**Статус**: ✅ Полностью рабочий
