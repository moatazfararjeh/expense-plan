const pool = require('./db');

const addAdditionalIncomeTable = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create additional_income table
    await client.query(`
      CREATE TABLE IF NOT EXISTS additional_income (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        frequency VARCHAR(50) NOT NULL,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('✅ Additional income table created successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating additional income table:', error);
  } finally {
    client.release();
    pool.end();
  }
};

addAdditionalIncomeTable();
