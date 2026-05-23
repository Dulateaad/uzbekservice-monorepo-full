-- =============================================
-- Green Flowers - Миграция 009: Добавить unit_price в cart_items
-- =============================================
-- Причина: cart_items не сохраняет цену товара на момент добавления в корзину.
-- Сейчас цена берется из products таблицы, но она может измениться.
-- Нужно сохранять фактическую цену на момент добавления.

-- Добавляем колонку unit_price для сохранения цены товара
ALTER TABLE cart_items
ADD COLUMN unit_price DECIMAL(10,2) DEFAULT 0;

-- Добавляем индекс
CREATE INDEX IF NOT EXISTS idx_cart_items_unit_price ON cart_items(unit_price);

-- Обновляем существующие позиции - берем цену из products таблицы
UPDATE cart_items ci
SET unit_price = COALESCE(p.price_per_unit, 0)
FROM products p
WHERE ci.product_id = p.id AND ci.unit_price = 0;
