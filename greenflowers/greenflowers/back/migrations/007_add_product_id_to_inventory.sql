-- =============================================
-- Green Flowers - Миграция: Добавить product_id в inventory_items
-- =============================================

-- 1. Добавить колонку product_id
ALTER TABLE IF EXISTS inventory_items 
ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;

-- 2. Заполнить product_id по имени товара (fuzzy match)
UPDATE inventory_items ii
SET product_id = p.id
FROM products p
WHERE LOWER(TRIM(ii.name)) = LOWER(TRIM(p.name));

-- 3. Создать индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_id ON inventory_items(product_id);

-- 4. Добавить уникальный индекс для сочетания truck_id + product_id
-- (если product_id существует, чтобы не было дублей одного товара в одной фуре)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_truck_product 
ON inventory_items(truck_id, product_id) 
WHERE product_id IS NOT NULL;

-- 5. Вывести статистику
SELECT 
  COUNT(*) as total_inventory_items,
  COUNT(product_id) as items_with_product_id,
  COUNT(CASE WHEN product_id IS NULL THEN 1 END) as items_without_product_id
FROM inventory_items;
