-- =============================================
-- Green Flowers - Миграция: Таблица Фур (Грузовиков)
-- =============================================

-- Таблица фур для отслеживания доставок
CREATE TABLE IF NOT EXISTS trucks (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL UNIQUE,
  arrival_date TIMESTAMP NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'in_transit', 'delivered', 'delayed')) DEFAULT 'pending',
  notes TEXT,
  metrics JSONB DEFAULT '[]'::jsonb,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для лучшей производительности
CREATE INDEX IF NOT EXISTS idx_trucks_status ON trucks(status);
CREATE INDEX IF NOT EXISTS idx_trucks_arrival_date ON trucks(arrival_date);
CREATE INDEX IF NOT EXISTS idx_trucks_identifier ON trucks(identifier);
CREATE INDEX IF NOT EXISTS idx_trucks_created_at ON trucks(created_at);
