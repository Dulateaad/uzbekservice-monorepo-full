-- =============================================
-- Green Flowers - Миграция: Смены, Поставки, Календарь
-- =============================================

-- =============================================
-- 1. ЕЖЕНЕДЕЛЬНЫЕ ПОСТАВКИ ТОВАРОВ (Inventory)
-- =============================================

-- Таблица партий поставок (еженедельный приход товара)
CREATE TABLE IF NOT EXISTS inventory_batches (
  id SERIAL PRIMARY KEY,
  batch_date DATE NOT NULL,
  supplier_name VARCHAR(255),
  total_items INTEGER DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) CHECK (status IN ('draft', 'received', 'processed')) DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Товары в партии поставки (детали каждой позиции)
CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES inventory_batches(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  color VARCHAR(50),
  variety VARCHAR(100),
  quantity INTEGER NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2),
  stem_length VARCHAR(50),
  packaging_type VARCHAR(100),
  plantation_country VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. УПРАВЛЕНИЕ СМЕНАМИ ПРОДАВЦОВ
-- =============================================

-- Таблица смен
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  shift_date DATE NOT NULL,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  status VARCHAR(20) CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  opening_cash DECIMAL(10,2) DEFAULT 0,
  closing_cash DECIMAL(10,2),
  total_sales DECIMAL(12,2) DEFAULT 0,
  total_discounts DECIMAL(10,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Продажи за смену (связь заказов со сменами)
CREATE TABLE IF NOT EXISTS shift_sales (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  sale_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR(50),
  sale_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- =============================================
-- 3. КАЛЕНДАРЬ И ВАЖНЫЕ СОБЫТИЯ
-- =============================================

-- Таблица событий календаря
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  event_date DATE NOT NULL,
  event_type VARCHAR(50) CHECK (event_type IN (
    'high_sales', 'low_sales', 'large_discount', 
    'inventory_received', 'shift_issue', 'holiday',
    'custom', 'price_change', 'stock_alert'
  )) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  related_entity_type VARCHAR(50),
  related_entity_id INTEGER,
  is_auto_generated BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Настройки пороговых значений для автоматического анализа
CREATE TABLE IF NOT EXISTS analytics_thresholds (
  id SERIAL PRIMARY KEY,
  threshold_type VARCHAR(50) UNIQUE NOT NULL,
  threshold_value DECIMAL(12,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. ИНДЕКСЫ
-- =============================================

CREATE INDEX IF NOT EXISTS idx_inventory_batches_date ON inventory_batches(batch_date);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_status ON inventory_batches(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_batch_id ON inventory_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_id ON inventory_items(product_id);

CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shift_sales_shift_id ON shift_sales(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_sales_order_id ON shift_sales(order_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_priority ON calendar_events(priority);

-- =============================================
-- 5. ТРИГГЕРЫ
-- =============================================

-- Триггер обновления updated_at для новых таблиц
CREATE TRIGGER update_inventory_batches_updated_at 
  BEFORE UPDATE ON inventory_batches 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at 
  BEFORE UPDATE ON shifts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_thresholds_updated_at 
  BEFORE UPDATE ON analytics_thresholds 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. НАЧАЛЬНЫЕ ДАННЫЕ
-- =============================================

-- Пороговые значения для автоматического анализа
INSERT INTO analytics_thresholds (threshold_type, threshold_value, description) VALUES
('high_sales_daily', 500000, 'Порог высоких продаж за день (тг)'),
('low_sales_daily', 50000, 'Порог низких продаж за день (тг)'),
('large_discount_percent', 20, 'Порог крупной скидки (%)'),
('price_change_percent', 15, 'Порог значимого изменения цены (%)'),
('stock_alert_quantity', 50, 'Минимальное количество для оповещения')
ON CONFLICT (threshold_type) DO NOTHING;

-- =============================================
-- 7. ДОБАВЛЕНИЕ ПОЛЯ discount В orders
-- =============================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_id INTEGER REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES shifts(id);

