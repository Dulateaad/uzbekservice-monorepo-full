-- Insert sample delivery zones
insert into public.delivery_zones (city_name, delivery_fee, delivery_days, is_active) values
  ('Almaty', 50, 2, true),
  ('Astana', 75, 3, true),
  ('Shymkent', 60, 3, true),
  ('Karaganda', 70, 3, true),
  ('Aktau', 100, 4, true)
on conflict do nothing;

-- Insert sample delivery schedule
insert into public.delivery_schedules (shipment_date, expected_arrival_date, quantity_available, status) values
  (now()::date, (now() + interval '5 days')::date, 1000, 'planned'),
  ((now() + interval '7 days')::date, (now() + interval '12 days')::date, 1500, 'planned'),
  ((now() + interval '14 days')::date, (now() + interval '19 days')::date, 2000, 'planned')
on conflict do nothing;
