-- =============================================
-- Green Flowers - Миграция: Добавление категории и высоты в inventory_items
-- =============================================

-- Добавить столбцы категория и высота в таблицу позиций
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS category VARCHAR(255),
ADD COLUMN IF NOT EXISTS height DECIMAL(10, 2);

-- Добавить индекс по категории для быстрого фильтра
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);

-- Создать таблицу для хранения доступных категорий
CREATE TABLE IF NOT EXISTS flower_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс по имени категории
CREATE INDEX IF NOT EXISTS idx_flower_categories_name ON flower_categories(name);

-- Триггер для обновления updated_at в flower_categories
CREATE OR REPLACE FUNCTION update_flower_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_flower_categories_updated_at ON flower_categories;
CREATE TRIGGER trigger_update_flower_categories_updated_at
BEFORE UPDATE ON flower_categories
FOR EACH ROW
EXECUTE FUNCTION update_flower_categories_updated_at();
