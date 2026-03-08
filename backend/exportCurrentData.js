const pool = require('./db');
const fs = require('fs');
const path = require('path');

const exportData = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting data export...');
    
    const exportData = {
      users: [],
      user_settings: [],
      monthly_expenses: [],
      daily_transactions: [],
      salary_changes: [],
      additional_income: []
    };

    // Export users
    console.log('Exporting users...');
    const usersResult = await client.query('SELECT * FROM users ORDER BY id');
    exportData.users = usersResult.rows;
    console.log(`  ✓ Exported ${usersResult.rows.length} users`);

    // Export user_settings
    console.log('Exporting user_settings...');
    const settingsResult = await client.query('SELECT * FROM user_settings ORDER BY id');
    exportData.user_settings = settingsResult.rows;
    console.log(`  ✓ Exported ${settingsResult.rows.length} user settings`);

    // Export monthly_expenses
    console.log('Exporting monthly_expenses...');
    const expensesResult = await client.query('SELECT * FROM monthly_expenses ORDER BY id');
    exportData.monthly_expenses = expensesResult.rows;
    console.log(`  ✓ Exported ${expensesResult.rows.length} monthly expenses`);

    // Export daily_transactions
    console.log('Exporting daily_transactions...');
    const transactionsResult = await client.query('SELECT * FROM daily_transactions ORDER BY id');
    exportData.daily_transactions = transactionsResult.rows;
    console.log(`  ✓ Exported ${transactionsResult.rows.length} daily transactions`);

    // Export salary_changes
    console.log('Exporting salary_changes...');
    const salaryResult = await client.query('SELECT * FROM salary_changes ORDER BY id');
    exportData.salary_changes = salaryResult.rows;
    console.log(`  ✓ Exported ${salaryResult.rows.length} salary changes`);

    // Export additional_income
    console.log('Exporting additional_income...');
    const incomeResult = await client.query('SELECT * FROM additional_income ORDER BY id');
    exportData.additional_income = incomeResult.rows;
    console.log(`  ✓ Exported ${incomeResult.rows.length} additional income records`);

    // Save to JSON file
    const exportPath = path.join(__dirname, 'exported-data.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    
    console.log('\n✅ Data export completed successfully!');
    console.log(`📁 Data saved to: ${exportPath}`);
    console.log('\nSummary:');
    console.log(`  - Users: ${exportData.users.length}`);
    console.log(`  - User Settings: ${exportData.user_settings.length}`);
    console.log(`  - Monthly Expenses: ${exportData.monthly_expenses.length}`);
    console.log(`  - Daily Transactions: ${exportData.daily_transactions.length}`);
    console.log(`  - Salary Changes: ${exportData.salary_changes.length}`);
    console.log(`  - Additional Income: ${exportData.additional_income.length}`);
    
    return exportData;
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

exportData()
  .then(() => {
    console.log('\n✅ Export completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  });
