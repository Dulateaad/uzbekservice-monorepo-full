-- =============================================
-- Green Flowers - Миграция: Добавить truck_id и city_id в orders
-- =============================================

-- Добавить truck_id колонку к orders (связь с грузовиком/фурой)
-- Используем UUID так как trucks.id использует UUID
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS truck_id UUID;

-- Добавить city_id для быстрого доступа (нормализация delivery_city)
-- Используем delivery_city как идентификатор города (или можно создать отдельную таблицу cities)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_orders_truck_id ON orders(truck_id);
CREATE INDEX IF NOT EXISTS idx_orders_city ON orders(city);
CREATE INDEX IF NOT EXISTS idx_orders_truck_city ON orders(truck_id, city);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Триггер для автоматического заполнения city из delivery_city при создании заказа
CREATE OR REPLACE FUNCTION update_order_city_from_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.city IS NULL AND NEW.delivery_city IS NOT NULL THEN
    NEW.city := NEW.delivery_city;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_city_sync_insert 
  BEFORE INSERT ON orders 
  FOR EACH ROW EXECUTE FUNCTION update_order_city_from_delivery();

CREATE TRIGGER order_city_sync_update 
  BEFORE UPDATE ON orders 
  FOR EACH ROW EXECUTE FUNCTION update_order_city_from_delivery();

