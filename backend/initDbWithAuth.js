const pool = require('./db');

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Drop existing tables to recreate with user_id foreign keys
    await client.query('DROP TABLE IF EXISTS daily_transactions CASCADE');
    await client.query('DROP TABLE IF EXISTS monthly_expenses CASCADE');
    await client.query('DROP TABLE IF EXISTS salary_changes CASCADE');
    await client.query('DROP TABLE IF EXISTS additional_income CASCADE');
    await client.query('DROP TABLE IF EXISTS user_settings CASCADE');

    // Create user_settings table with user_id
    await client.query(`
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
      )
    `);

    // Create monthly_expenses table with user_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100),
        start_month INTEGER DEFAULT 1,
        end_month INTEGER DEFAULT 12,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create daily_transactions table with user_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        transaction_date DATE NOT NULL,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create salary_changes table with user_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS salary_changes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        effective_date DATE NOT NULL,
        notes VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create additional_income table with user_id
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
    console.log('Database tables with authentication created successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', error);
  } finally {
    client.release();
    pool.end();
  }
};

createTables();
