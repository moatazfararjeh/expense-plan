const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'expense_plan',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function addPlanStartDate() {
  try {
    console.log('Adding plan_start_date column to user_settings...');
    
    await pool.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS plan_start_date DATE DEFAULT CURRENT_DATE;
    `);
    
    console.log('✅ Plan start date column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding plan start date column:', error);
    process.exit(1);
  }
}

addPlanStartDate();
