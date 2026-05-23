-- Green Flowers Database Setup
-- Database: greenflowers_db
-- Run this SQL script after creating the database

-- Users table (для всех: клиенты, работники, админы)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(20) CHECK (role IN ('user', 'worker', 'admin')) DEFAULT 'user',
  company_name VARCHAR(255),
  city VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products/Flowers catalog
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  color VARCHAR(50),
  variety VARCHAR(100),
  description TEXT,
  price_per_unit DECIMAL(10,2) NOT NULL,
  price_per_box DECIMAL(10,2),
  stock_quantity INTEGER DEFAULT 0,
  min_order_quantity INTEGER DEFAULT 10,
  stem_length VARCHAR(50),
  packaging_type VARCHAR(100),
  plantation_country VARCHAR(100) DEFAULT 'China',
  next_delivery_date DATE,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'in_transit', 'delivered', 'cancelled')) DEFAULT 'pending',
  total_amount DECIMAL(12,2) NOT NULL,
  delivery_city VARCHAR(100) NOT NULL,
  delivery_address TEXT,
  delivery_date DATE,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Preorders
CREATE TABLE IF NOT EXISTS preorders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  desired_delivery_date DATE NOT NULL,
  order_type VARCHAR(50) CHECK (order_type IN ('regular_preorder', 'holiday_preorder')),
  holiday_type VARCHAR(50),
  status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery zones
CREATE TABLE IF NOT EXISTS delivery_zones (
  id SERIAL PRIMARY KEY,
  city_name VARCHAR(100) UNIQUE NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  delivery_days INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery schedules
CREATE TABLE IF NOT EXISTS delivery_schedules (
  id SERIAL PRIMARY KEY,
  shipment_date DATE NOT NULL,
  expected_arrival_date DATE NOT NULL,
  quantity_available INTEGER NOT NULL,
  status VARCHAR(20) CHECK (status IN ('planned', 'shipped', 'arrived', 'cancelled')) DEFAULT 'planned',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shopping cart
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  desired_delivery_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- System logs (логи системы)
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  description TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_preorders_user_id ON preorders(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- Insert sample data

-- Sample users (password: 'password123' - hash this in production!)
INSERT INTO users (email, password_hash, name, phone, role, city) VALUES
('admin@greenflowers.kz', '$2b$10$example_hash_here', 'Администратор', '+7 708 235 4533', 'admin', 'Алматы'),
('worker@greenflowers.kz', '$2b$10$example_hash_here', 'Работник Склада', '+7 777 111 2222', 'worker', 'Алматы'),
('user@test.kz', '$2b$10$example_hash_here', 'Иван Петров', '+7 777 333 4444', 'user', 'Алматы')
ON CONFLICT (email) DO NOTHING;

-- Sample products
INSERT INTO products (name, category, color, variety, description, price_per_unit, price_per_box, stock_quantity, min_order_quantity, stem_length, packaging_type, image_url) VALUES
('Red Roses Premium', 'roses', 'red', 'Red Pearl', 'Premium red roses, 60cm stems, fresh from plantation', 0.85, 45.00, 500, 50, '60cm', 'Box of 50', '/red-roses-premium-bouquet.jpg'),
('Pink Roses Deluxe', 'roses', 'pink', 'Pink Lady', 'Soft pink roses, 60cm stems, perfect for arrangements', 0.95, 50.00, 300, 50, '60cm', 'Box of 50', '/pink-roses-deluxe-wedding.jpg'),
('White Roses Classic', 'roses', 'white', 'Avalanche', 'Pure white roses, 70cm stems, premium quality', 1.20, 60.00, 250, 50, '70cm', 'Box of 50', '/white-roses-avalanche-wedding.jpg'),
('Yellow Chrysanthemums', 'chrysanthemums', 'yellow', 'Santini', 'Bright yellow chrysanthemums, 50cm stems', 0.45, 30.00, 600, 100, '50cm', 'Box of 100', '/yellow-chrysanthemums-santini.jpg'),
('White Chrysanthemums', 'chrysanthemums', 'white', 'Daisy', 'Pure white chrysanthemums, fresh and vibrant', 0.40, 25.00, 800, 100, '50cm', 'Box of 100', '/white-spray-chrysanthemums.jpg'),
('Red Carnations', 'carnations', 'red', 'Premium', 'Deep red carnations, 60cm stems, long lasting', 0.30, 20.00, 1000, 100, '60cm', 'Box of 100', '/red-carnations-premium.jpg'),
('Pink Carnations', 'carnations', 'pink', 'Classic', 'Soft pink carnations, 60cm stems', 0.30, 20.00, 800, 100, '60cm', 'Box of 100', '/pink-carnations.jpg'),
('White Lilies', 'lilies', 'white', 'Casablanca', 'Elegant white lilies, 70cm stems', 1.50, 75.00, 200, 50, '70cm', 'Box of 50', '/white-casablanca-lilies.jpg'),
('Gypsophila White', 'gypsophila', 'white', 'Baby''s Breath', 'Delicate white gypsophila, perfect for arrangements', 0.50, 35.00, 400, 100, '50cm', 'Box of 100', '/gypsophila-baby-breath-white.jpg'),
('Gerbera Mix', 'gerberas', 'multi', 'Colorful', 'Colorful gerbera daisies mix', 0.60, 40.00, 350, 100, '45cm', 'Box of 100', '/colorful-gerbera-daisies-mix.jpg')
ON CONFLICT DO NOTHING;

-- Sample delivery zones
INSERT INTO delivery_zones (city_name, delivery_fee, delivery_days) VALUES
('Алматы', 0, 1),
('Астана', 15, 2),
('Шымкент', 20, 2),
('Караганда', 18, 2),
('Актобе', 25, 3)
ON CONFLICT (city_name) DO NOTHING;

-- Sample delivery schedules
INSERT INTO delivery_schedules (shipment_date, expected_arrival_date, quantity_available, status) VALUES
(CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '8 days', 5000, 'planned'),
(CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '13 days', 8000, 'planned'),
(CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '18 days', 6000, 'planned');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_preorders_updated_at BEFORE UPDATE ON preorders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
