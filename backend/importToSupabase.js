const pool = require('./db');
const fs = require('fs');
const path = require('path');

const importData = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting data import to Supabase...');
    
    // Read exported data
    const exportPath = path.join(__dirname, 'exported-data.json');
    if (!fs.existsSync(exportPath)) {
      throw new Error('exported-data.json not found! Please run exportCurrentData.js first.');
    }
    
    const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    
    await client.query('BEGIN');

    // Import users
    console.log('Importing users...');
    for (const user of data.users) {
      await client.query(
        `INSERT INTO users (id, username, email, password, created_at) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (username) DO NOTHING`,
        [user.id, user.username, user.email, user.password, user.created_at]
      );
    }
    console.log(`  ✓ Imported ${data.users.length} users`);

    // Import user_settings
    console.log('Importing user_settings...');
    for (const setting of data.user_settings) {
      await client.query(
        `INSERT INTO user_settings (id, user_id, monthly_salary, opening_balance, plan_start_date, currency, categories, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         ON CONFLICT (user_id) DO UPDATE SET
           monthly_salary = EXCLUDED.monthly_salary,
           opening_balance = EXCLUDED.opening_balance,
           plan_start_date = EXCLUDED.plan_start_date,
           currency = EXCLUDED.currency,
           categories = EXCLUDED.categories,
           updated_at = EXCLUDED.updated_at`,
        [setting.id, setting.user_id, setting.monthly_salary, setting.opening_balance, 
         setting.plan_start_date, setting.currency, setting.categories, 
         setting.created_at, setting.updated_at]
      );
    }
    console.log(`  ✓ Imported ${data.user_settings.length} user settings`);

    // Import monthly_expenses
    console.log('Importing monthly_expenses...');
    for (const expense of data.monthly_expenses) {
      await client.query(
        `INSERT INTO monthly_expenses (id, user_id, name, amount, category, start_month, end_month, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [expense.id, expense.user_id, expense.name, expense.amount, 
         expense.category, expense.start_month, expense.end_month, expense.created_at]
      );
    }
    console.log(`  ✓ Imported ${data.monthly_expenses.length} monthly expenses`);

    // Import daily_transactions
    console.log('Importing daily_transactions...');
    for (const transaction of data.daily_transactions) {
      await client.query(
        `INSERT INTO daily_transactions (id, user_id, description, amount, transaction_date, category, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [transaction.id, transaction.user_id, transaction.description, 
         transaction.amount, transaction.transaction_date, transaction.category, 
         transaction.created_at]
      );
    }
    console.log(`  ✓ Imported ${data.daily_transactions.length} daily transactions`);

    // Import salary_changes
    console.log('Importing salary_changes...');
    for (const salary of data.salary_changes) {
      await client.query(
        `INSERT INTO salary_changes (id, user_id, amount, effective_date, notes, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [salary.id, salary.user_id, salary.amount, salary.effective_date, 
         salary.notes, salary.created_at]
      );
    }
    console.log(`  ✓ Imported ${data.salary_changes.length} salary changes`);

    // Import additional_income
    console.log('Importing additional_income...');
    for (const income of data.additional_income) {
      await client.query(
        `INSERT INTO additional_income (id, user_id, name, amount, frequency, category, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [income.id, income.user_id, income.name, income.amount, 
         income.frequency, income.category, income.created_at]
      );
    }
    console.log(`  ✓ Imported ${data.additional_income.length} additional income records`);

    // Update sequences to match imported IDs
    console.log('\nUpdating sequences...');
    if (data.users.length > 0) {
      const maxUserId = Math.max(...data.users.map(u => u.id));
      await client.query(`SELECT setval('users_id_seq', $1)`, [maxUserId]);
    }
    if (data.user_settings.length > 0) {
      const maxSettingId = Math.max(...data.user_settings.map(s => s.id));
      await client.query(`SELECT setval('user_settings_id_seq', $1)`, [maxSettingId]);
    }
    if (data.monthly_expenses.length > 0) {
      const maxExpenseId = Math.max(...data.monthly_expenses.map(e => e.id));
      await client.query(`SELECT setval('monthly_expenses_id_seq', $1)`, [maxExpenseId]);
    }
    if (data.daily_transactions.length > 0) {
      const maxTransactionId = Math.max(...data.daily_transactions.map(t => t.id));
      await client.query(`SELECT setval('daily_transactions_id_seq', $1)`, [maxTransactionId]);
    }
    if (data.salary_changes.length > 0) {
      const maxSalaryId = Math.max(...data.salary_changes.map(s => s.id));
      await client.query(`SELECT setval('salary_changes_id_seq', $1)`, [maxSalaryId]);
    }
    if (data.additional_income.length > 0) {
      const maxIncomeId = Math.max(...data.additional_income.map(i => i.id));
      await client.query(`SELECT setval('additional_income_id_seq', $1)`, [maxIncomeId]);
    }
    console.log('  ✓ Sequences updated');

    await client.query('COMMIT');
    
    console.log('\n✅ Data import to Supabase completed successfully!');
    console.log('\nImported:');
    console.log(`  - Users: ${data.users.length}`);
    console.log(`  - User Settings: ${data.user_settings.length}`);
    console.log(`  - Monthly Expenses: ${data.monthly_expenses.length}`);
    console.log(`  - Daily Transactions: ${data.daily_transactions.length}`);
    console.log(`  - Salary Changes: ${data.salary_changes.length}`);
    console.log(`  - Additional Income: ${data.additional_income.length}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error importing data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

importData()
  .then(() => {
    console.log('\n✅ Import completed!');
    console.log('\nNext steps:');
    console.log('1. Verify data in Supabase Table Editor');
    console.log('2. Update Coolify environment variables with Supabase credentials');
    console.log('3. Redeploy your application');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
