-- Обновление ограничения статусов заказа

-- Удаляем старое ограничение
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Добавляем новое ограничение с дополнительными статусами
ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled'));

-- Комментарий к статусам
COMMENT ON COLUMN orders.status IS 'Статусы: pending (ожидает), confirmed (подтвержден), processing (в обработке), shipped (отправлен), in_transit (в пути), delivered (доставлен), cancelled (отменен)';
