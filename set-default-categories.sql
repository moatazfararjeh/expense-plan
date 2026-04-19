-- ============================================================
-- Set default categories for all users in user_settings
-- Run this in Supabase SQL Editor
-- ============================================================

-- The new default category list
DO $$
DECLARE
  new_categories TEXT := '["Housing / Rent","Utilities","Groceries","Transportation","Fuel","Car Maintenance","Insurance","Medical","Pharmacy","Education","Kids Expenses","Entertainment","Dining Out","Shopping","Clothing","Travel","Savings","Investments","Credit Card Payments","Internet & Mobile","Subscriptions","Gifts","Charity","Household Items","Personal Care","Gym / Fitness","Pets","Maintenance & Repairs","Business Expenses","Emergency Fund","Taxes","Parking & Tolls","Electronics","Furniture","Coffee & Snacks","Miscellaneous"]';
BEGIN

  -- Update all existing users who have no categories set (NULL or empty)
  UPDATE user_settings
  SET categories = new_categories
  WHERE categories IS NULL OR categories = '' OR categories = '[]';

  RAISE NOTICE 'Updated % rows with no categories.', ROW_COUNT;

  -- Optional: update ALL users (overwrite existing categories too)
  -- Uncomment the lines below only if you want to replace everyone's categories
  -- UPDATE user_settings SET categories = new_categories;
  -- RAISE NOTICE 'Overwrote categories for all users.';

END $$;

-- Also update the column default so new users get these categories automatically
ALTER TABLE user_settings
  ALTER COLUMN categories
  SET DEFAULT '["Housing / Rent","Utilities","Groceries","Transportation","Fuel","Car Maintenance","Insurance","Medical","Pharmacy","Education","Kids Expenses","Entertainment","Dining Out","Shopping","Clothing","Travel","Savings","Investments","Credit Card Payments","Internet & Mobile","Subscriptions","Gifts","Charity","Household Items","Personal Care","Gym / Fitness","Pets","Maintenance & Repairs","Business Expenses","Emergency Fund","Taxes","Parking & Tolls","Electronics","Furniture","Coffee & Snacks","Miscellaneous"]';

-- Verify
SELECT id, user_id, categories FROM user_settings;
