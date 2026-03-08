const pool = require('./db');
const fs = require('fs');
const path = require('path');

const exportToSQL = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting SQL export...');
    
    let sqlScript = `-- Data Export from Current Database
-- Generated: ${new Date().toISOString()}
-- Run this script in Supabase SQL Editor after running supabase-migration.sql

BEGIN;

`;

    // Export users
    console.log('Exporting users...');
    const usersResult = await client.query('SELECT * FROM users ORDER BY id');
    if (usersResult.rows.length > 0) {
      sqlScript += `-- Insert users (${usersResult.rows.length} records)\n`;
      for (const user of usersResult.rows) {
        const username = user.username.replace(/'/g, "''");
        const email = user.email.replace(/'/g, "''");
        const password = user.password.replace(/'/g, "''");
        const createdAt = user.created_at ? user.created_at.toISOString() : 'CURRENT_TIMESTAMP';
        
        sqlScript += `INSERT INTO users (id, username, email, password, created_at) VALUES (${user.id}, '${username}', '${email}', '${password}', '${createdAt}') ON CONFLICT (username) DO NOTHING;\n`;
      }
      sqlScript += `\n`;
      console.log(`  ✓ Exported ${usersResult.rows.length} users`);
    }

    // Export user_settings
    console.log('Exporting user_settings...');
    const settingsResult = await client.query('SELECT * FROM user_settings ORDER BY id');
    if (settingsResult.rows.length > 0) {
      sqlScript += `-- Insert user_settings (${settingsResult.rows.length} records)\n`;
      for (const setting of settingsResult.rows) {
        const categories = setting.categories ? `'${setting.categories.replace(/'/g, "''")}'` : 'NULL';
        const planStartDate = setting.plan_start_date ? `'${setting.plan_start_date.toISOString().split('T')[0]}'` : 'NULL';
        const createdAt = setting.created_at ? `'${setting.created_at.toISOString()}'` : 'CURRENT_TIMESTAMP';
        const updatedAt = setting.updated_at ? `'${setting.updated_at.toISOString()}'` : 'CURRENT_TIMESTAMP';
        
        sqlScript += `INSERT INTO user_settings (id, user_id, monthly_salary, opening_balance, plan_start_date, currency, categories, created_at, updated_at) VALUES (${setting.id}, ${setting.user_id}, ${setting.monthly_salary}, ${setting.opening_balance}, ${planStartDate}, '${setting.currency}', ${categories}, ${createdAt}, ${updatedAt}) ON CONFLICT (user_id) DO UPDATE SET monthly_salary = EXCLUDED.monthly_salary, opening_balance = EXCLUDED.opening_balance, plan_start_date = EXCLUDED.plan_start_date, currency = EXCLUDED.currency, categories = EXCLUDED.categories, updated_at = EXCLUDED.updated_at;\n`;
      }
      sqlScript += `\n`;
      console.log(`  ✓ Exported ${settingsResult.rows.length} user settings`);
    }

    // Export monthly_expenses
    console.log('Exporting monthly_expenses...');
    const expensesResult = await client.query('SELECT * FROM monthly_expenses ORDER BY id');
    if (expensesResult.rows.length > 0) {
      sqlScript += `-- Insert monthly_expenses (${expensesResult.rows.length} records)\n`;
      for (const expense of expensesResult.rows) {
        const name = expense.name.replace(/'/g, "''");
        const category = expense.category ? `'${expense.category.replace(/'/g, "''")}'` : 'NULL';
        const createdAt = expense.created_at ? `'${expense.created_at.toISOString()}'` : 'CURRENT_TIMESTAMP';
        
        sqlScript += `INSERT INTO monthly_expenses (id, user_id, name, amount, category, start_month, end_month, created_at) VALUES (${expense.id}, ${expense.user_id}, '${name}', ${expense.amount}, ${category}, ${expense.start_month}, ${expense.end_month}, ${createdAt});\n`;
      }
      sqlScript += `\n`;
      console.log(`  ✓ Exported ${expensesResult.rows.length} monthly expenses`);
    }

    // Export daily_transactions
    console.log('Exporting daily_transactions...');
    const transactionsResult = await client.query('SELECT * FROM daily_transactions ORDER BY id');
    if (transactionsResult.rows.length > 0) {
      sqlScript += `-- Insert daily_transactions (${transactionsResult.rows.length} records)\n`;
      for (const transaction of transactionsResult.rows) {
        const description = transaction.description.replace(/'/g, "''");
        const category = transaction.category ? `'${transaction.category.replace(/'/g, "''")}'` : 'NULL';
        const transactionDate = transaction.transaction_date ? `'${transaction.transaction_date.toISOString().split('T')[0]}'` : 'CURRENT_DATE';
        const createdAt = transaction.created_at ? `'${transaction.created_at.toISOString()}'` : 'CURRENT_TIMESTAMP';
        
        sqlScript += `INSERT INTO daily_transactions (id, user_id, description, amount, transaction_date, category, created_at) VALUES (${transaction.id}, ${transaction.user_id}, '${description}', ${transaction.amount}, ${transactionDate}, ${category}, ${createdAt});\n`;
      }
      sqlScript += `\n`;
      console.log(`  ✓ Exported ${transactionsResult.rows.length} daily transactions`);
    }

    // Export salary_changes
    console.log('Exporting salary_changes...');
    const salaryResult = await client.query('SELECT * FROM salary_changes ORDER BY id');
    if (salaryResult.rows.length > 0) {
      sqlScript += `-- Insert salary_changes (${salaryResult.rows.length} records)\n`;
      for (const salary of salaryResult.rows) {
        const notes = salary.notes ? `'${salary.notes.replace(/'/g, "''")}'` : 'NULL';
        const effectiveDate = salary.effective_date ? `'${salary.effective_date.toISOString().split('T')[0]}'` : 'CURRENT_DATE';
        const createdAt = salary.created_at ? `'${salary.created_at.toISOString()}'` : 'CURRENT_TIMESTAMP';
        
        sqlScript += `INSERT INTO salary_changes (id, user_id, amount, effective_date, notes, created_at) VALUES (${salary.id}, ${salary.user_id}, ${salary.amount}, ${effectiveDate}, ${notes}, ${createdAt});\n`;
      }
      sqlScript += `\n`;
      console.log(`  ✓ Exported ${salaryResult.rows.length} salary changes`);
    }

    // Export additional_income
    console.log('Exporting additional_income...');
    const incomeResult = await client.query('SELECT * FROM additional_income ORDER BY id');
    if (incomeResult.rows.length > 0) {
      sqlScript += `-- Insert additional_income (${incomeResult.rows.length} records)\n`;
      for (const income of incomeResult.rows) {
        const name = income.name.replace(/'/g, "''");
        const frequency = income.frequency.replace(/'/g, "''");
        const category = income.category ? `'${income.category.replace(/'/g, "''")}'` : 'NULL';
        const createdAt = income.created_at ? `'${income.created_at.toISOString()}'` : 'CURRENT_TIMESTAMP';
        
        sqlScript += `INSERT INTO additional_income (id, user_id, name, amount, frequency, category, created_at) VALUES (${income.id}, ${income.user_id}, '${name}', ${income.amount}, '${frequency}', ${category}, ${createdAt});\n`;
      }
      sqlScript += `\n`;
      console.log(`  ✓ Exported ${incomeResult.rows.length} additional income records`);
    }

    // Update sequences
    sqlScript += `-- Update sequences to match imported IDs\n`;
    if (usersResult.rows.length > 0) {
      const maxUserId = Math.max(...usersResult.rows.map(u => u.id));
      sqlScript += `SELECT setval('users_id_seq', ${maxUserId}, true);\n`;
    }
    if (settingsResult.rows.length > 0) {
      const maxSettingId = Math.max(...settingsResult.rows.map(s => s.id));
      sqlScript += `SELECT setval('user_settings_id_seq', ${maxSettingId}, true);\n`;
    }
    if (expensesResult.rows.length > 0) {
      const maxExpenseId = Math.max(...expensesResult.rows.map(e => e.id));
      sqlScript += `SELECT setval('monthly_expenses_id_seq', ${maxExpenseId}, true);\n`;
    }
    if (transactionsResult.rows.length > 0) {
      const maxTransactionId = Math.max(...transactionsResult.rows.map(t => t.id));
      sqlScript += `SELECT setval('daily_transactions_id_seq', ${maxTransactionId}, true);\n`;
    }
    if (salaryResult.rows.length > 0) {
      const maxSalaryId = Math.max(...salaryResult.rows.map(s => s.id));
      sqlScript += `SELECT setval('salary_changes_id_seq', ${maxSalaryId}, true);\n`;
    }
    if (incomeResult.rows.length > 0) {
      const maxIncomeId = Math.max(...incomeResult.rows.map(i => i.id));
      sqlScript += `SELECT setval('additional_income_id_seq', ${maxIncomeId}, true);\n`;
    }

    sqlScript += `
COMMIT;

-- Migration completed!
-- Summary:
--   Users: ${usersResult.rows.length}
--   User Settings: ${settingsResult.rows.length}
--   Monthly Expenses: ${expensesResult.rows.length}
--   Daily Transactions: ${transactionsResult.rows.length}
--   Salary Changes: ${salaryResult.rows.length}
--   Additional Income: ${incomeResult.rows.length}
`;

    // Save to file
    const exportPath = path.join(__dirname, 'supabase-data-import.sql');
    fs.writeFileSync(exportPath, sqlScript);
    
    console.log('\n✅ SQL export completed successfully!');
    console.log(`📁 SQL file created: ${exportPath}`);
    console.log('\nSummary:');
    console.log(`  - Users: ${usersResult.rows.length}`);
    console.log(`  - User Settings: ${settingsResult.rows.length}`);
    console.log(`  - Monthly Expenses: ${expensesResult.rows.length}`);
    console.log(`  - Daily Transactions: ${transactionsResult.rows.length}`);
    console.log(`  - Salary Changes: ${salaryResult.rows.length}`);
    console.log(`  - Additional Income: ${incomeResult.rows.length}`);
    console.log('\nNext steps:');
    console.log('1. Run supabase-migration.sql in Supabase SQL Editor (if not done yet)');
    console.log('2. Run supabase-data-import.sql in Supabase SQL Editor');
    console.log('3. Update Coolify environment variables with Supabase credentials');
    console.log('4. Redeploy your application');
    
  } catch (error) {
    console.error('❌ Error exporting to SQL:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

exportToSQL()
  .then(() => {
    console.log('\n✅ Export completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  });
