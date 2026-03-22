-- Supabase Migration: Add Missing Columns
-- Run this in Supabase Dashboard > SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS / checks before adding)

-- Add start_year and end_year to monthly_expenses
-- These columns are required by the backend POST/PUT /api/monthly-expenses endpoints
ALTER TABLE monthly_expenses
  ADD COLUMN IF NOT EXISTS start_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER,
  ADD COLUMN IF NOT EXISTS end_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER;

-- Add income_month and income_year to additional_income
ALTER TABLE additional_income
  ADD COLUMN IF NOT EXISTS income_month INTEGER,
  ADD COLUMN IF NOT EXISTS income_year INTEGER;

-- Confirm
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: start_year, end_year, income_month columns added (if missing).';
END $$;
