const pool = require('./db');

const addExpenseDates = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Add start_month and end_month columns to monthly_expenses
    await client.query(`
      ALTER TABLE monthly_expenses 
      ADD COLUMN IF NOT EXISTS start_month INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS end_month INTEGER DEFAULT 12
    `);

    await client.query('COMMIT');
    console.log('✅ Monthly expense date columns added successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding date columns:', error);
  } finally {
    client.release();
    pool.end();
  }
};

addExpenseDates();
