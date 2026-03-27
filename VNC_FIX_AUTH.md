# Исправление ошибки аутентификации PostgreSQL

## Проблема: Peer authentication failed

PostgreSQL требует, чтобы локальные подключения выполнялись от имени пользователя postgres.

## Решение: Выполнить SQL от имени postgres

### Вариант 1: Выполнить SQL скрипт от имени postgres (рекомендуется)

```bash
su - postgres -c "psql -d uzbekservice_db -f /root/setup/vps_create_tables.sql"
```

Это выполнит скрипт от имени postgres, который имеет все права.

---

### Вариант 2: Выполнить SQL команды напрямую

```bash
su - postgres
psql -d uzbekservice_db
```

Затем внутри psql выполните команды из файла вручную, или:

```bash
su - postgres -c "psql -d uzbekservice_db <<'SQLEOF'
CREATE TABLE IF NOT EXISTS users_sensitive (
    id VARCHAR(50) PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    address TEXT,
    location JSONB,
    is_uzbek_citizen BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users_sensitive(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_location ON users_sensitive USING GIN(location);
CREATE INDEX IF NOT EXISTS idx_users_created ON users_sensitive(created_at);
CREATE TABLE IF NOT EXISTS orders_sensitive (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users_sensitive(id),
    address TEXT,
    location JSONB,
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders_sensitive(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders_sensitive(created_at);
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER update_users_sensitive_updated_at 
    BEFORE UPDATE ON users_sensitive 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_sensitive_updated_at 
    BEFORE UPDATE ON orders_sensitive 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
SQLEOF
"
```

---

### Вариант 3: Изменить права доступа к файлу

```bash
chmod 644 /root/setup/vps_create_tables.sql
su - postgres -c "psql -d uzbekservice_db -f /root/setup/vps_create_tables.sql"
```

---

## Проверка создания таблиц

После выполнения проверьте:

```bash
su - postgres -c "psql -d uzbekservice_db -c '\dt'"
```

Должны быть видны таблицы `users_sensitive` и `orders_sensitive`.

