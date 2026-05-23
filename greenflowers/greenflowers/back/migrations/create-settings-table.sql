-- Миграция для таблицы settings
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(64) PRIMARY KEY,
    value VARCHAR(255) NOT NULL
);

-- Инициализация базового процента менеджера
INSERT INTO settings (key, value)
VALUES ('baseManagerPercent', '3.0')
ON CONFLICT (key) DO NOTHING;
