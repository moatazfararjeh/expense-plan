const pool = require('./db');

const migrateDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration to Supabase...');
    await client.query('BEGIN');

    // Create users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_settings table
    console.log('Creating user_settings table...');
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

    // Create monthly_expenses table
    console.log('Creating monthly_expenses table...');
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

    // Create daily_transactions table
    console.log('Creating daily_transactions table...');
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

    // Create salary_changes table
    console.log('Creating salary_changes table...');
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

    // Create additional_income table
    console.log('Creating additional_income table...');
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
    console.log('✅ Database migration to Supabase completed successfully!');
    console.log('All tables created:');
    console.log('  - users');
    console.log('  - user_settings');
    console.log('  - monthly_expenses');
    console.log('  - daily_transactions');
    console.log('  - salary_changes');
    console.log('  - additional_income');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error migrating database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

migrateDatabase()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
