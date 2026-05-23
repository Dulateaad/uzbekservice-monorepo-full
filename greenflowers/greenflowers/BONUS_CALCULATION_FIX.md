/\*\*

- БОНУСЫ ВЫСЧИТЫВАЮТСЯ НЕВЕРНО - АНАЛИЗ И РЕШЕНИЕ
-
- ПРОБЛЕМА ИДЕНТИФИЦИРОВАНА:
- К лучший fix для бонусов - это обеспечить что:
-
- 1.  ✅ КОРРЕКТНО: When status → "delivered", seller_id = assigned_to (работник)
- - уже РАБОТАЕТ согласно коду в /orders/:orderId/status
-
- 2.  ✅ КОРРЕКТНО: shift_sales.sale_amount = order.total_amount
- - проверено, соответствует
-
- 3.  ⚠️ ПРОБЛЕМА: Комиссионные расчеты используют формулу:
- A = sum(quantity \* unit_price) из order_items
-
- Но unit_price может быть неправильным если:
- - товар был добавлен в заказ с неправильной ценой
- - цена не обновилась в order_items после изменения в products
-
- РЕШЕНИЕ:
- Проверить что unit_price в order_items соответствует actual price товара.
-
- Команды для диагностики:
  \*/

// 1. SQL запрос для проверки соответствия цен:
`SELECT 
  oi.order_id,
  oi.product_id,
  oi.unit_price as order_item_price,
  p.price_per_unit as product_price,
  oi.quantity,
  (oi.unit_price * oi.quantity) as order_item_total,
  (p.price_per_unit * oi.quantity) as expected_total,
  CASE WHEN oi.unit_price != p.price_per_unit THEN 'MISMATCH' ELSE 'OK' END as status
FROM order_items oi
JOIN products p ON oi.product_id = p.id
WHERE oi.order_id IN (
  SELECT id FROM orders WHERE status = 'delivered' LIMIT 20
)
ORDER BY oi.order_id;`;

// 2. Проверить A метрику для конкретного грузовика:
// commission-calculator.js уже делает это, но нужно просмотреть логи

// 3. Проверить что shift_sales имеет правильные суммы (V метрика):
`SELECT 
  ss.shift_id,
  SUM(ss.sale_amount) as total_from_shift_sales,
  (SELECT SUM(total_amount) FROM orders WHERE id IN (
    SELECT order_id FROM shift_sales WHERE shift_id = ss.shift_id
  )) as total_from_orders,
  CASE WHEN SUM(ss.sale_amount) = (SELECT SUM(total_amount) FROM orders WHERE id IN (
    SELECT order_id FROM shift_sales WHERE shift_id = ss.shift_id
  )) THEN 'MATCH' ELSE 'MISMATCH' END as status
FROM shift_sales ss
GROUP BY ss.shift_id;`;

// 4. Если все совпадает, то бонусы должны рассчитываться правильно.
// Проверить commission-calculator.js логику расчета E = V - B
