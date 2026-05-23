-- Обновление таблицы orders для хранения дополнительных данных заказа

-- Добавляем поля для контактов клиента (если заказ без регистрации)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending';

-- Добавляем комментарий к таблице
COMMENT ON COLUMN orders.customer_name IS 'Имя клиента (для заказов без регистрации)';
COMMENT ON COLUMN orders.customer_phone IS 'Телефон клиента (WhatsApp)';
COMMENT ON COLUMN orders.customer_email IS 'Email клиента';
COMMENT ON COLUMN orders.delivery_time IS 'Желаемое время доставки';
COMMENT ON COLUMN orders.payment_status IS 'Статус оплаты';
