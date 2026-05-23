-- SQL команды для тестирования системы партий (delivery batches)
-- Используйте для проверки данных в PostgreSQL

-- ================================================================
-- 1. ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦ
-- ================================================================

-- Проверить что таблица inventory_batches существует
\dt inventory_batches

-- Проверить что таблица inventory_items существует
\dt inventory_items

-- Проверить структуру inventory_batches
\d inventory_batches

-- Проверить структуру inventory_items
\d inventory_items


-- ================================================================
-- 2. ПРОВЕРКА ДАННЫХ
-- ================================================================

-- Сколько всего партий?
SELECT COUNT(*) as total_batches FROM inventory_batches;

-- Сколько партий со статусом 'received'?
SELECT COUNT(*) as received_batches FROM inventory_batches WHERE status = 'received';

-- Все партии с количеством товаров в каждой
SELECT 
  ib.id,
  ib.batch_date,
  ib.supplier_name,
  ib.status,
  COUNT(ii.id) as item_count
FROM inventory_batches ib
LEFT JOIN inventory_items ii ON ib.id = ii.batch_id
GROUP BY ib.id
ORDER BY ib.batch_date DESC;

-- Сколько товаров всего?
SELECT COUNT(*) as total_items FROM inventory_items;

-- Сколько товаров в каждой партии?
SELECT 
  batch_id,
  COUNT(*) as count,
  SUM(quantity) as total_quantity
FROM inventory_items
GROUP BY batch_id
ORDER BY batch_id;


-- ================================================================
-- 3. ПОКАЗАТЬ ТОВАРЫ ПО ПАРТИЯМ (как видит клиент)
-- ================================================================

-- Самую НОВУЮ партию со всеми товарами
SELECT 
  ib.id,
  ib.batch_date,
  ib.supplier_name,
  CURRENT_DATE - ib.batch_date as age_days,
  ii.id as item_id,
  ii.product_name as name,
  ii.variety,
  ii.quantity,
  ii.selling_price,
  ii.color,
  ii.category
FROM inventory_batches ib
LEFT JOIN inventory_items ii ON ib.id = ii.batch_id
WHERE ib.status = 'received'
ORDER BY ib.batch_date DESC, ii.product_name ASC
LIMIT 50;

-- Товары только со статусом 'received' и quantity > 0
SELECT 
  ib.batch_date,
  ii.product_name,
  ii.quantity,
  ii.selling_price
FROM inventory_batches ib
JOIN inventory_items ii ON ib.id = ii.batch_id
WHERE ib.status = 'received' AND ii.quantity > 0
ORDER BY ib.batch_date DESC, ii.product_name ASC;


-- ================================================================
-- 4. СТАТИСТИКА ДЛЯ АНАЛИЗА
-- ================================================================

-- Партии по возрасту (НОВЫЕ / СВЕЖИЕ / СТАРЫЕ)
SELECT 
  CASE 
    WHEN CURRENT_DATE - batch_date <= 1 THEN '🆕 Новое'
    WHEN CURRENT_DATE - batch_date <= 3 THEN '✨ Свежее'
    ELSE '🔄 Старое'
  END as freshness,
  COUNT(*) as count,
  SUM(
    SELECT COUNT(*) FROM inventory_items WHERE batch_id = ib.id
  ) as total_items
FROM inventory_batches ib
GROUP BY freshness;

-- Товары в разбивке по категориям в каждой партии
SELECT 
  ib.batch_date,
  ii.category,
  COUNT(*) as item_types,
  SUM(ii.quantity) as total_quantity,
  ROUND(AVG(ii.selling_price), 2) as avg_price
FROM inventory_batches ib
JOIN inventory_items ii ON ib.id = ii.batch_id
WHERE ib.status = 'received'
GROUP BY ib.batch_date, ii.category
ORDER BY ib.batch_date DESC, ii.category;

-- Поставщики и количество партий от каждого
SELECT 
  supplier_name,
  COUNT(*) as batch_count,
  SUM(
    SELECT COUNT(*) FROM inventory_items WHERE batch_id = ib.id
  ) as total_items
FROM inventory_batches ib
GROUP BY supplier_name
ORDER BY batch_count DESC;


-- ================================================================
-- 5. ПОИСК ПРОБЛЕМ
-- ================================================================

-- Партии без товаров
SELECT 
  ib.id,
  ib.batch_date,
  (SELECT COUNT(*) FROM inventory_items WHERE batch_id = ib.id) as item_count
FROM inventory_batches ib
HAVING (SELECT COUNT(*) FROM inventory_items WHERE batch_id = ib.id) = 0;

-- Товары с нулевым количеством
SELECT 
  ib.batch_date,
  ii.id,
  ii.product_name,
  ii.quantity,
  ii.status
FROM inventory_batches ib
JOIN inventory_items ii ON ib.id = ii.batch_id
WHERE ii.quantity = 0
ORDER BY ib.batch_date DESC;

-- Товары без цены
SELECT 
  ib.batch_date,
  ii.product_name,
  ii.quantity,
  ii.selling_price
FROM inventory_batches ib
JOIN inventory_items ii ON ib.id = ii.batch_id
WHERE ii.selling_price IS NULL OR ii.selling_price = 0;

-- Товары без изображения
SELECT 
  ib.batch_date,
  ii.product_name,
  ii.photo_url
FROM inventory_batches ib
JOIN inventory_items ii ON ib.id = ii.batch_id
WHERE ii.photo_url IS NULL OR ii.photo_url = '';


-- ================================================================
-- 6. ДАННЫЕ ДЛЯ ФРОНТЕНДА (как их видит API)
-- ================================================================

-- Получить партии как JSON (примерно как /api/catalog/batches)
SELECT 
  json_build_object(
    'id', ib.id,
    'batch_date', ib.batch_date,
    'supplier_name', ib.supplier_name,
    'total_items', COUNT(ii.id),
    'age_days', CURRENT_DATE - ib.batch_date,
    'is_fresh', CURRENT_DATE - ib.batch_date <= 3,
    'is_new', CURRENT_DATE - ib.batch_date <= 1,
    'status', ib.status,
    'items', json_agg(
      json_build_object(
        'id', ii.id,
        'name', ii.product_name,
        'variety', ii.variety,
        'quantity', ii.quantity,
        'selling_price', ii.selling_price,
        'color', ii.color,
        'category', ii.category
      )
    )
  ) as batch
FROM inventory_batches ib
LEFT JOIN inventory_items ii ON ib.id = ii.batch_id
WHERE ib.status = 'received'
GROUP BY ib.id
ORDER BY ib.batch_date DESC;


-- ================================================================
-- 7. ТЕСТОВЫЕ ДАННЫЕ (если нужны)
-- ================================================================

-- Добавить тестовую партию (если её нет)
INSERT INTO inventory_batches (batch_date, supplier_name, status)
SELECT CURRENT_DATE, 'Тестовый поставщик', 'received'
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_batches WHERE batch_date = CURRENT_DATE
);

-- Добавить тестовые товары в последнюю партию
INSERT INTO inventory_items (
  batch_id, product_name, variety, quantity, selling_price, category, color
)
SELECT 
  (SELECT id FROM inventory_batches ORDER BY batch_date DESC LIMIT 1),
  name, variety, quantity, price, category, color
FROM (
  VALUES
    ('Роза', 'Red Deep', 100, 120.00, 'Розы', 'красный'),
    ('Тюльпан', 'Yellow', 80, 90.00, 'Тюльпаны', 'жёлтый'),
    ('Гвоздика', 'Pink', 150, 50.00, 'Гвоздики', 'розовый'),
    ('Альстромерия', 'Mix', 200, 60.00, 'Альстромерия', 'микс')
) AS t(name, variety, quantity, price, category, color)
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_items 
  WHERE batch_id = (SELECT id FROM inventory_batches ORDER BY batch_date DESC LIMIT 1)
    AND product_name = t.name
);


-- ================================================================
-- 8. ОЧИСТКА И СБРОС ДАННЫХ
-- ================================================================

-- ⚠️ ОСТОРОЖНО! Удалить все товары из партии
-- DELETE FROM inventory_items WHERE batch_id = 1;

-- ⚠️ ОСТОРОЖНО! Удалить всю партию
-- DELETE FROM inventory_batches WHERE id = 1;

-- ⚠️ ОСТОРОЖНО! Очистить все партии
-- DELETE FROM inventory_batches;

-- Восстановить статус 'received' для всех партий
-- UPDATE inventory_batches SET status = 'received' WHERE status = 'draft';


-- ================================================================
-- 9. ПОЛЕЗНЫЕ ЗАПРОСЫ ДЛЯ МЕНЕДЖЕРА
-- ================================================================

-- Какие товары заканчиваются (мало осталось)?
SELECT 
  ib.batch_date,
  ii.product_name,
  ii.quantity,
  CASE 
    WHEN ii.quantity < 10 THEN '🔴 СРОЧНО заказать'
    WHEN ii.quantity < 30 THEN '🟡 Мало осталось'
    ELSE '🟢 Достаточно'
  END as alert
FROM inventory_batches ib
JOIN inventory_items ii ON ib.id = ii.batch_id
WHERE ib.status = 'received'
ORDER BY ii.quantity ASC;

-- Какие партии самые старые?
SELECT 
  id,
  batch_date,
  CURRENT_DATE - batch_date as days_old,
  CASE 
    WHEN CURRENT_DATE - batch_date > 7 THEN '🔴 Очень старая, срочно распродать'
    WHEN CURRENT_DATE - batch_date > 3 THEN '🟡 Старая, применить скидку'
    ELSE '🟢 Новая'
  END as recommendation
FROM inventory_batches
WHERE status = 'received'
ORDER BY batch_date ASC;

-- Доход по партиям (сколько потенциально заработаем)
SELECT 
  ib.batch_date,
  COUNT(ii.id) as item_types,
  SUM(ii.quantity) as total_items,
  ROUND(SUM(ii.quantity * ii.selling_price), 2) as total_revenue
FROM inventory_batches ib
JOIN inventory_items ii ON ib.id = ii.batch_id
WHERE ib.status = 'received'
GROUP BY ib.batch_date
ORDER BY total_revenue DESC;

