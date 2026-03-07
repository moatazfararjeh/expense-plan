const pool = require('./db');

const addCurrencyAndCategories = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Adding currency and categories columns to user_settings...');
    
    // Add currency column
    await client.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'SAR'
    `);
    
    // Add categories column (JSON array)
    await client.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS categories TEXT DEFAULT '["Jordan Family Expense","Our Expense","Loan Sabb","Other"]'
    `);
    
    console.log('Successfully added currency and categories columns!');
    console.log('Default currency: SAR');
    console.log('Default categories: Jordan Family Expense, Our Expense, Loan Sabb, Other');
    
  } catch (error) {
    console.error('Error adding columns:', error);
    
    // Check if columns already exist
    if (error.message && error.message.includes('already exists')) {
      console.log('Columns already exist. No changes needed.');
    }
  } finally {
    client.release();
    pool.end();
  }
};

addCurrencyAndCategories();
