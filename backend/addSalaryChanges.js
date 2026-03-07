const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'expense_plan',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function addSalaryChangesTable() {
  try {
    console.log('Creating salary_changes table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS salary_changes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        effective_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Creating index on salary_changes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_salary_changes_user_date 
      ON salary_changes(user_id, effective_date DESC);
    `);
    
    console.log('✅ Salary changes table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating salary changes table:', error);
    process.exit(1);
  }
}

addSalaryChangesTable();
