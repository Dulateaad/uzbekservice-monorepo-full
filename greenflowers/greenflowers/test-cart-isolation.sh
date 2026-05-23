#!/bin/bash
# Тестирование архитектуры корзины и заказов

echo "🧪 Тест 1: Изоляция корзин пользователей"
echo "=========================================="

# Пользователь 1
echo "1. Пользователь с ID=1 добавляет товар ID=5 (количество=3)"
curl -X POST http://localhost:5000/api/cart \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "product_id": 5,
    "quantity": 3
  }'

echo ""
echo "2. Получаем корзину пользователя 1:"
curl http://localhost:5000/api/cart/user/1

echo ""
echo "3. Пользователь с ID=2 добавляет товар ID=10 (количество=2)"
curl -X POST http://localhost:5000/api/cart \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 2,
    "product_id": 10,
    "quantity": 2
  }'

echo ""
echo "4. Получаем корзину пользователя 2:"
curl http://localhost:5000/api/cart/user/2

echo ""
echo "5. Проверяем, что корзины изолированы:"
echo "   - Пользователь 1 видит только товар 5"
echo "   - Пользователь 2 видит только товар 10"

echo ""
echo ""
echo "🧪 Тест 2: Создание заказа и очистка корзины"
echo "=============================================="

echo "1. Пользователь 1 оформляет заказ"
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "customer_name": "Иван Петров",
    "customer_phone": "+7 999 123 45 67",
    "customer_email": "ivan@example.com",
    "total_amount": 15000,
    "delivery_city": "Алматы",
    "delivery_address": "Ул. Абая, 155",
    "delivery_date": "2026-02-22",
    "payment_method": "cash",
    "status": "pending",
    "items": [
      {
        "product_id": 5,
        "quantity": 3,
        "unit_price": 5000
      }
    ]
  }'

echo ""
echo "2. Очищаем корзину пользователя 1"
curl -X DELETE http://localhost:5000/api/cart/user/1/clear

echo ""
echo "3. Проверяем, что корзина пуста:"
curl http://localhost:5000/api/cart/user/1

echo ""
echo ""
echo "🧪 Тест 3: Получение заказов пользователя"
echo "=========================================="

echo "1. Заказы пользователя 1:"
curl http://localhost:5000/api/orders/user/1

echo ""
echo "2. Заказы пользователя 2 (должны быть пусты):"
curl http://localhost:5000/api/orders/user/2

echo ""
echo "✅ Все тесты завершены!"
echo ""
echo "Ожидаемые результаты:"
echo "- Каждый пользователь видит только свою корзину"
echo "- Каждый пользователь видит только свои заказы"
echo "- После оформления заказа корзина очищается"
