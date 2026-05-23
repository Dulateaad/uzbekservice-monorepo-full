-- Migration: Add address field to users table
-- Date: 2026-02-15

ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
