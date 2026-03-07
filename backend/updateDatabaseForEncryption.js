const pool = require('./db');
require('dotenv').config();

/**
 * This script updates the database schema to support encrypted values
 * It converts numeric columns to text columns to store encrypted strings
 * Run this script BEFORE encrypting the data
 */

async function updateDatabaseSchema() {
  console.log('Starting database schema update for encryption...');
  
  try {
    // Start a transaction
    await pool.query('BEGIN');
    
    console.log('\n1. Converting user_settings columns...');
    
    // Convert monthly_salary to text
    await pool.query(`
      ALTER TABLE user_settings 
      ALTER COLUMN monthly_salary TYPE TEXT USING monthly_salary::TEXT
    `);
    console.log('   ✓ monthly_salary converted to TEXT');
    
    // Convert opening_balance to text
    await pool.query(`
      ALTER TABLE user_settings 
      ALTER COLUMN opening_balance TYPE TEXT USING opening_balance::TEXT
    `);
    console.log('   ✓ opening_balance converted to TEXT');
    
    console.log('\n2. Converting monthly_expenses columns...');
    
    // Convert amount to text
    await pool.query(`
      ALTER TABLE monthly_expenses 
      ALTER COLUMN amount TYPE TEXT USING amount::TEXT
    `);
    console.log('   ✓ amount converted to TEXT');
    
    console.log('\n3. Converting daily_transactions columns...');
    
    // Convert amount to text
    await pool.query(`
      ALTER TABLE daily_transactions 
      ALTER COLUMN amount TYPE TEXT USING amount::TEXT
    `);
    console.log('   ✓ amount converted to TEXT');
    
    console.log('\n4. Converting additional_income columns...');
    
    // Convert amount to text
    await pool.query(`
      ALTER TABLE additional_income 
      ALTER COLUMN amount TYPE TEXT USING amount::TEXT
    `);
    console.log('   ✓ amount converted to TEXT');
    
    console.log('\n5. Converting salary_changes columns...');
    
    // Convert amount to text
    await pool.query(`
      ALTER TABLE salary_changes 
      ALTER COLUMN amount TYPE TEXT USING amount::TEXT
    `);
    console.log('   ✓ amount converted to TEXT');
    
    // Commit the transaction
    await pool.query('COMMIT');
    
    console.log('\n✓ Database schema updated successfully!');
    console.log('\nAll amount columns have been converted to TEXT type.');
    console.log('You can now run the encryption script.');
    
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error('\n✗ Error during schema update:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the update
updateDatabaseSchema()
  .then(() => {
    console.log('\nProcess completed. You can now run encryptExistingData.js');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nProcess failed:', error);
    process.exit(1);
  });
