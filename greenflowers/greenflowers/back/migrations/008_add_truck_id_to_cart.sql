-- =============================================
-- Green Flowers - Миграция 008: Добавить truck_id в cart_items
-- =============================================
-- Причина: Один товар из разных фур должен быть разными позициями в корзине.
-- С этой миграцией сможем отслеживать из какой фуры (truck) товар.

-- Добавляем колонку truck_id
ALTER TABLE cart_items
ADD COLUMN truck_id UUID REFERENCES trucks(id) ON DELETE SET NULL;

-- Добавляем индекс для производительности
CREATE INDEX IF NOT EXISTS idx_cart_items_truck_id ON cart_items(truck_id);

-- Обновляем UNIQUE constraint: теперь товар уникален по (user_id, product_id, truck_id)
-- Сначала удаляем старый constraint
ALTER TABLE cart_items
DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;

-- Добавляем новый constraint с учётом truck_id
ALTER TABLE cart_items
ADD CONSTRAINT cart_items_user_id_product_id_truck_id_key 
UNIQUE (user_id, product_id, truck_id);

-- Добавляем колонку batch_date для удобства (дата прибытия фуры)
ALTER TABLE cart_items
ADD COLUMN batch_date DATE;
