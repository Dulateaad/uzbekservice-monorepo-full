# 📊 Архитектура функционала оформления заказа

## Структура страницы /checkout

```
CheckoutPage
├── State Management
│   ├── step: "summary" | "form" | "success"
│   ├── userData: { id, email, phone, name }
│   ├── createdOrderId: number
│   └── isSubmitting: boolean
│
├── useCart() Hook
│   ├── cart: CartItem[]
│   ├── getCartTotal(): number
│   └── clearCart(): Promise<void>
│
├── useCity() Hook
│   └── city: string
│
└── UI Sections
    ├── Header (заголовок с кнопкой "Вернуться")
    ├── Main Content (Grid 3 columns)
    │   ├── Left Column (col-span-2)
    │   │   ├── Step 1: OrderSummary (initial view)
    │   │   │   └── Shows cart items
    │   │   │   └── Button: "Перейти к доставке"
    │   │   │
    │   │   ├── Step 2: DeliveryForm (form view)
    │   │   │   ├── Fields: name, address, city, phone
    │   │   │   ├── Validation errors
    │   │   │   └── Button: "Подтвердить и оформить"
    │   │   │
    │   │   └── Step 3: Success Message (success view)
    │   │       ├── Checkmark icon
    │   │       ├── Order ID
    │   │       ├── Next steps info
    │   │       └── Buttons: "Мои заказы", "На главную"
    │   │
    │   └── Right Column (Sticky)
    │       └── OrderSummary Component
    │           ├── Items list (scrollable)
    │           ├── Totals
    │           ├── Payment method
    │           └── Success banner (optional)
    │
    └── Logic
        ├── Load user data (localStorage)
        ├── Handle form submit
        ├── Create order (API call)
        ├── Clear cart
        └── Redirect to /orders
```

## Компонент DeliveryForm

```
DeliveryForm Props
├── initialCity: string
├── initialPhone: string
├── onSubmit: (data) => Promise<void>
└── isSubmitting: boolean

DeliveryForm State
├── formData
│   ├── customerName: string
│   ├── deliveryAddress: string
│   ├── deliveryCity: string
│   └── customerPhone: string
│
└── errors
    ├── deliveryAddress?: string
    ├── deliveryCity?: string
    └── customerPhone?: string

Form Fields
├── Name Input (optional)
│   └── Placeholder: "Введите ваше имя"
│
├── Address Input (required)
│   ├── Placeholder: "Введите адрес доставки"
│   └── Error: "Адрес доставки обязателен"
│
├── City Input (required)
│   ├── Placeholder: "Введите город"
│   └── Error: "Город обязателен"
│
└── Phone Input (required)
    ├── Placeholder: "+7 (000) 000-00-00"
    ├── Validation: /^[\d\s\-\+\(\)]{8,}$/
    ├── Error: "Неверный формат телефона"
    └── Hint: "Минимум 8 символов"

Submit Button
├── Label: "Подтвердить и оформить →"
├── Loading state: Shows spinner
└── Disabled during submission
```

## Компонент OrderSummary

```
OrderSummary Props
├── items: OrderItem[]
├── total: number
└── showSuccess?: boolean

OrderSummary Structure
├── Success Banner (conditional)
│   └── Shows when showSuccess=true
│
├── Title
│   └── "Сводка заказа"
│
├── Items List (scrollable, max-height)
│   └── For each item:
│       ├── Product name
│       ├── Quantity × Unit Price
│       └── Subtotal
│
├── Totals Section
│   ├── Sum: {total}
│   └── Delivery: Free
│
├── Total Amount
│   └── Large green text: {total} KZT
│
└── Payment Method
    └── Card: "Наличными при доставке"
```

## Поток данных (Data Flow)

```
User Actions
│
├─ Add to cart
│  └─ CartContext.addToCart()
│     ├─ If logged in: API call
│     └─ If guest: localStorage temp_cart
│
├─ Navigate to cart
│  └─ /cart page
│
├─ Click "Оформить"
│  └─ CheckoutPage.handleCheckout()
│     ├─ Check auth (localStorage)
│     ├─ Redirect if not logged in
│     └─ Go to /checkout
│
├─ Fill delivery form
│  └─ DeliveryForm.handleSubmit()
│     ├─ Validate fields
│     ├─ Show errors if invalid
│     └─ If valid → call onSubmit
│
├─ Submit order
│  └─ CheckoutPage.handleFormSubmit()
│     ├─ Get user data
│     ├─ Get cart items
│     ├─ Build API payload
│     ├─ POST /api/orders
│     ├─ If success:
│     │  ├─ CartContext.clearCart()
│     │  ├─ Set createdOrderId
│     │  └─ Change step to "success"
│     └─ If error:
│        └─ Show alert
│
└─ View success page
   └─ Options:
      ├─ Click "Мои заказы" → /orders
      └─ Click "На главную" → /
```

## API Интеграция

```
Frontend (Checkout)
       │
       ├─ POST /api/orders
       │  └─ Payload:
       │     {
       │       user_id: 1,
       │       customer_name: "Иван Петров",
       │       customer_phone: "+7 (999) 123-45-67",
       │       customer_email: "user@example.com",
       │       total_amount: 37500,
       │       delivery_city: "Almaty",
       │       delivery_address: "Kasym Kampiruly St, 120",
       │       delivery_date: "2026-02-20T...",
       │       payment_method: "cash",
       │       payment_status: "pending",
       │       notes: null,
       │       status: "pending",
       │       items: [
       │         { product_id: 1, quantity: 5, unit_price: 5000 },
       │         { product_id: 2, quantity: 3, unit_price: 3500 }
       │       ]
       │     }
       │
       ├─ Response (Success):
       │  {
       │    success: true,
       │    message: "Заказ успешно создан",
       │    order: {
       │      id: 44,
       │      user_id: 1,
       │      total_amount: "37500.00",
       │      status: "pending",
       │      ... other fields
       │    }
       │  }
       │
       └─ Response (Error):
          {
            success: false,
            error: "Error message"
          }

Backend (Express + PostgreSQL)
       │
       ├─ Validate payload
       ├─ Check user exists
       ├─ Check products exist
       ├─ Create order record
       ├─ Create order items
       ├─ Update inventory (if needed)
       ├─ Send notifications
       └─ Return order with ID
```

## Состояния (States)

```
CheckoutPage.step
├── "summary" (Начальное состояние)
│   └── Показывает сводку заказа и кнопку "Перейти к доставке"
│
├── "form" (При клике на кнопку)
│   └── Показывает форму доставки
│
└── "success" (После успешного создания заказа)
    └── Показывает сообщение об успехе и номер заказа

isSubmitting
├── false (Normal state)
└── true (During API call)
    ├── Button disabled
    ├── Shows spinner
    └── Inputs disabled
```

## Валидация

```
DeliveryForm Validation Rules

deliveryAddress:
├── Required: Yes
├── Rule: Non-empty string
└── Error: "Адрес доставки обязателен"

deliveryCity:
├── Required: Yes
├── Rule: Non-empty string
└── Error: "Город обязателен"

customerPhone:
├── Required: Yes
├── Format: /^[\d\s\-\+\(\)]{8,}$/
│   └── Allows: digits, spaces, hyphens, +, parentheses
├── Min length: 8 characters
└── Error: "Неверный формат телефона"

customerName:
├── Required: No
└── Type: string
```

## Стили и Дизайн

```
Color Palette
├── Primary Green: #568a56
│   └── Used for: Buttons, active states
│
├── Dark Green: #2f6f4a
│   └── Used for: Header, branding
│
├── Hover Green: #457245
│   └── Used for: Button hover states
│
├── Gray 50: #f9fafb
│   └── Used for: Page background
│
├── Gray 200: #e5e7eb
│   └── Used for: Borders
│
└── Gray 600-900: Text colors

Spacing & Layout
├── Main container: max-w-6xl, mx-auto
├── Padding: 8px (p-8)
├── Grid: 3 columns desktop, 1 column mobile
├── Column span: left=2, right=1
└── Gap: 8 units (gap-8)

Typography
├── Headings: text-3xl font-bold
├── Labels: text-sm font-medium
├── Errors: text-sm text-red-600
└── Body: text-base text-gray-900
```

## Возможные улучшения

```
Future Enhancements
├── Адреса с автодополнением (Яндекс.Карты, Google Maps)
├── Выбор слота времени доставки
├── Несколько способов оплаты (Kaspi, ApplePay, etc.)
├── Сохранение часто используемых адресов
├── SMS уведомления при создании заказа
├── Расчёт стоимости доставки по городу
├── Промокоды и скидки при оформлении
├── Печать чека/квитанции
└── История заказов с фильтрацией
```
