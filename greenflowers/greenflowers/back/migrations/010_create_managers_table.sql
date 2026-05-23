-- Migration 010: Create managers table
-- Таблица для управления менеджерами

CREATE TABLE IF NOT EXISTS managers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data
INSERT INTO managers (name, email) VALUES
  ('Ali', 'ali@test.com'),
  ('Dana', 'dana@test.com'),
  ('John', 'john@test.com')
ON CONFLICT (email) DO NOTHING;
