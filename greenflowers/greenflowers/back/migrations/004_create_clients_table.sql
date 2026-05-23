-- Migration: create clients table for CRM
-- Run with: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f back/migrations/004_create_clients_table.sql

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  comment TEXT,
  balance NUMERIC(14,2) DEFAULT 0,
  last_activity TIMESTAMPTZ,
  total_orders INTEGER DEFAULT 0,
  total_profit NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS clients_name_idx ON clients (lower(name));
CREATE INDEX IF NOT EXISTS clients_phone_idx ON clients (phone);
CREATE INDEX IF NOT EXISTS clients_email_idx ON clients (lower(email));
