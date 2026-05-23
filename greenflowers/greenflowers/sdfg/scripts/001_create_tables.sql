-- Users profiles for B2B business information
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  company_name text,
  contact_person text,
  phone text,
  role text check (role in ('customer', 'employee', 'admin')), 
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Products/Flowers catalog
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null, -- roses, chrysanthemums, carnations, seasonal, holiday
  color text,
  description text,
  price_per_unit decimal(10,2),
  price_per_box decimal(10,2),
  min_order_quantity integer default 10,
  stock_quantity integer default 0,
  plantation_country text default 'China',
  variety text,
  stem_length text,
  packaging_type text,
  next_delivery_date timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Product images
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  is_primary boolean default false,
  created_at timestamp default now()
);

-- Shopping cart
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null,
  desired_delivery_date timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text check (status in ('pending', 'confirmed', 'in_transit', 'delivered', 'cancelled')) default 'pending',
  total_amount decimal(12,2),
  delivery_city text not null,
  delivery_address text,
  delivery_date timestamp,
  notes text,
  payment_method text, -- kaspi_qr, kaspi_manual, kaspi_red, cash_on_delivery
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Order line items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null,
  unit_price decimal(10,2) not null,
  created_at timestamp default now()
);

-- Pre-orders
create table if not exists public.preorders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null,
  desired_delivery_date timestamp not null,
  order_type text check (order_type in ('regular_preorder', 'holiday_preorder')), -- regular or holiday
  holiday_type text, -- valentines_day, women_day, nauryz, new_year
  status text check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')) default 'pending',
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Delivery zones/cities
create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  city_name text not null unique,
  delivery_fee decimal(10,2),
  delivery_days integer,
  is_active boolean default true,
  created_at timestamp default now()
);

-- Delivery schedule
create table if not exists public.delivery_schedules (
  id uuid primary key default gen_random_uuid(),
  shipment_date date not null,
  expected_arrival_date date not null,
  quantity_available integer not null,
  status text check (status in ('planned', 'shipped', 'arrived', 'cancelled')) default 'planned',
  created_at timestamp default now()
);

-- Product subscriptions for stock notifications
create table if not exists public.product_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamp default now()
);

-- Enable RLS on all tables
alter table public.user_profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.preorders enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.delivery_schedules enable row level security;
alter table public.product_subscriptions enable row level security;

-- Policies for user_profiles
create policy "users_can_view_own_profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "users_can_update_own_profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- Policies for products (public read, employee/admin write)
create policy "anyone_can_view_products"
  on public.products for select
  using (true);

create policy "employees_can_insert_products"
  on public.products for insert
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('employee', 'admin')
    )
  );

create policy "employees_can_update_products"
  on public.products for update
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('employee', 'admin')
    )
  );

-- Policies for product_images (public read)
create policy "anyone_can_view_product_images"
  on public.product_images for select
  using (true);

create policy "employees_can_manage_product_images"
  on public.product_images for insert
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('employee', 'admin')
    )
  );

-- Policies for cart
create policy "users_can_view_own_cart"
  on public.cart_items for select
  using (auth.uid() = user_id);

create policy "users_can_manage_own_cart"
  on public.cart_items for insert
  with check (auth.uid() = user_id);

create policy "users_can_update_own_cart"
  on public.cart_items for update
  using (auth.uid() = user_id);

create policy "users_can_delete_own_cart"
  on public.cart_items for delete
  using (auth.uid() = user_id);

-- Policies for orders
create policy "users_can_view_own_orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "users_can_create_orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "employees_can_view_all_orders"
  on public.orders for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('employee', 'admin')
    )
  );

create policy "employees_can_update_orders"
  on public.orders for update
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('employee', 'admin')
    )
  );

-- Policies for order items
create policy "users_can_view_own_order_items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id and orders.user_id = auth.uid()
    )
  );

create policy "anyone_can_create_order_items"
  on public.order_items for insert
  with check (true);

-- Policies for preorders
create policy "users_can_view_own_preorders"
  on public.preorders for select
  using (auth.uid() = user_id);

create policy "users_can_create_preorders"
  on public.preorders for insert
  with check (auth.uid() = user_id);

-- Policies for delivery zones (public read)
create policy "anyone_can_view_delivery_zones"
  on public.delivery_zones for select
  using (true);

-- Policies for delivery schedules (public read)
create policy "anyone_can_view_delivery_schedules"
  on public.delivery_schedules for select
  using (true);

-- Policies for product subscriptions
create policy "users_can_view_own_subscriptions"
  on public.product_subscriptions for select
  using (auth.uid() = user_id);

create policy "users_can_manage_subscriptions"
  on public.product_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "users_can_delete_subscriptions"
  on public.product_subscriptions for delete
  using (auth.uid() = user_id);
