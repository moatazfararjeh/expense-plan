const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function addIncomeMonth() {
  try {
    console.log('Adding income_month column to additional_income table...');
    
    // Add income_month column (for one-time income to specify which month)
    await pool.query(`
      ALTER TABLE additional_income
      ADD COLUMN IF NOT EXISTS income_month INTEGER;
    `);

    console.log('✅ income_month column added successfully!');
    console.log('This column stores the month number (1-12) for one-time income entries.');
    
  } catch (error) {
    console.error('Error adding income_month column:', error);
  } finally {
    await pool.end();
  }
}

addIncomeMonth();
