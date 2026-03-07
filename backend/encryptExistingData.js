const pool = require('./db');
const { encryptValue, decryptValue } = require('./encryption');
require('dotenv').config();

/**
 * This script encrypts existing plain numeric values in the database
 * Run this script ONCE after deploying the encryption feature
 */

async function encryptExistingData() {
  console.log('Starting data encryption process...');
  
  try {
    // Start a transaction
    await pool.query('BEGIN');
    
    // 1. Encrypt user_settings amounts
    console.log('\n1. Encrypting user_settings...');
    const settingsResult = await pool.query('SELECT id, monthly_salary, opening_balance FROM user_settings');
    let settingsCount = 0;
    
    for (const row of settingsResult.rows) {
      // Check if already encrypted (contains ':')
      const salaryAlreadyEncrypted = row.monthly_salary && String(row.monthly_salary).includes(':');
      const balanceAlreadyEncrypted = row.opening_balance && String(row.opening_balance).includes(':');
      
      if (!salaryAlreadyEncrypted || !balanceAlreadyEncrypted) {
        const encryptedSalary = salaryAlreadyEncrypted ? row.monthly_salary : encryptValue(row.monthly_salary);
        const encryptedBalance = balanceAlreadyEncrypted ? row.opening_balance : encryptValue(row.opening_balance);
        
        await pool.query(
          'UPDATE user_settings SET monthly_salary = $1, opening_balance = $2 WHERE id = $3',
          [encryptedSalary, encryptedBalance, row.id]
        );
        settingsCount++;
        console.log(`   - Encrypted settings for ID ${row.id}`);
      }
    }
    console.log(`   ✓ Encrypted ${settingsCount} user settings records`);
    
    // 2. Encrypt monthly_expenses amounts
    console.log('\n2. Encrypting monthly_expenses...');
    const expensesResult = await pool.query('SELECT id, amount FROM monthly_expenses');
    let expensesCount = 0;
    
    for (const row of expensesResult.rows) {
      const alreadyEncrypted = row.amount && String(row.amount).includes(':');
      
      if (!alreadyEncrypted) {
        const encryptedAmount = encryptValue(row.amount);
        await pool.query(
          'UPDATE monthly_expenses SET amount = $1 WHERE id = $2',
          [encryptedAmount, row.id]
        );
        expensesCount++;
      }
    }
    console.log(`   ✓ Encrypted ${expensesCount} monthly expenses records`);
    
    // 3. Encrypt daily_transactions amounts
    console.log('\n3. Encrypting daily_transactions...');
    const transactionsResult = await pool.query('SELECT id, amount FROM daily_transactions');
    let transactionsCount = 0;
    
    for (const row of transactionsResult.rows) {
      const alreadyEncrypted = row.amount && String(row.amount).includes(':');
      
      if (!alreadyEncrypted) {
        const encryptedAmount = encryptValue(row.amount);
        await pool.query(
          'UPDATE daily_transactions SET amount = $1 WHERE id = $2',
          [encryptedAmount, row.id]
        );
        transactionsCount++;
      }
    }
    console.log(`   ✓ Encrypted ${transactionsCount} daily transactions records`);
    
    // 4. Encrypt additional_income amounts
    console.log('\n4. Encrypting additional_income...');
    const incomeResult = await pool.query('SELECT id, amount FROM additional_income');
    let incomeCount = 0;
    
    for (const row of incomeResult.rows) {
      const alreadyEncrypted = row.amount && String(row.amount).includes(':');
      
      if (!alreadyEncrypted) {
        const encryptedAmount = encryptValue(row.amount);
        await pool.query(
          'UPDATE additional_income SET amount = $1 WHERE id = $2',
          [encryptedAmount, row.id]
        );
        incomeCount++;
      }
    }
    console.log(`   ✓ Encrypted ${incomeCount} additional income records`);
    
    // 5. Encrypt salary_changes amounts
    console.log('\n5. Encrypting salary_changes...');
    const salaryChangesResult = await pool.query('SELECT id, amount FROM salary_changes');
    let salaryChangesCount = 0;
    
    for (const row of salaryChangesResult.rows) {
      const alreadyEncrypted = row.amount && String(row.amount).includes(':');
      
      if (!alreadyEncrypted) {
        const encryptedAmount = encryptValue(row.amount);
        await pool.query(
          'UPDATE salary_changes SET amount = $1 WHERE id = $2',
          [encryptedAmount, row.id]
        );
        salaryChangesCount++;
      }
    }
    console.log(`   ✓ Encrypted ${salaryChangesCount} salary changes records`);
    
    // Commit the transaction
    await pool.query('COMMIT');
    
    console.log('\n✓ Data encryption completed successfully!');
    console.log('\nSummary:');
    console.log(`  - User settings: ${settingsCount} records`);
    console.log(`  - Monthly expenses: ${expensesCount} records`);
    console.log(`  - Daily transactions: ${transactionsCount} records`);
    console.log(`  - Additional income: ${incomeCount} records`);
    console.log(`  - Salary changes: ${salaryChangesCount} records`);
    console.log(`  - Total: ${settingsCount + expensesCount + transactionsCount + incomeCount + salaryChangesCount} records encrypted`);
    
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error('\n✗ Error during encryption:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the encryption
encryptExistingData()
  .then(() => {
    console.log('\nProcess completed. You can now restart your server.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nProcess failed:', error);
    process.exit(1);
  });
