const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'expense_plan',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function addOpeningBalance() {
  try {
    console.log('Adding opening_balance column to user_settings...');
    
    await pool.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(10, 2) DEFAULT 0;
    `);
    
    console.log('✅ Opening balance column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding opening balance column:', error);
    process.exit(1);
  }
}

addOpeningBalance();
