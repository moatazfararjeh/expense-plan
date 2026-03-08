-- Supabase Database Migration Script for Expense Plan Application
-- Run this script in Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  encryption_key_wrapped TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  monthly_salary DECIMAL(10, 2) NOT NULL,
  opening_balance DECIMAL(10, 2) DEFAULT 0,
  plan_start_date DATE,
  currency VARCHAR(10) DEFAULT 'SAR',
  categories TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create monthly_expenses table
CREATE TABLE IF NOT EXISTS monthly_expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),
  start_month INTEGER DEFAULT 1,
  end_month INTEGER DEFAULT 12,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create daily_transactions table
CREATE TABLE IF NOT EXISTS daily_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create salary_changes table
CREATE TABLE IF NOT EXISTS salary_changes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  effective_date DATE NOT NULL,
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create additional_income table
CREATE TABLE IF NOT EXISTS additional_income (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  frequency VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_expenses_user_id ON monthly_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_transactions_user_id ON daily_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_transactions_date ON daily_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_salary_changes_user_id ON salary_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_additional_income_user_id ON additional_income(user_id);

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'Database migration completed successfully!';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '  - users';
  RAISE NOTICE '  - user_settings';
  RAISE NOTICE '  - monthly_expenses';
  RAISE NOTICE '  - daily_transactions';
  RAISE NOTICE '  - salary_changes';
  RAISE NOTICE '  - additional_income';
END $$;
