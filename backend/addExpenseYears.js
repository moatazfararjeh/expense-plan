const pool = require('./db');

async function addExpenseYears() {
  try {
    console.log('Adding start_year and end_year columns to monthly_expenses...');
    
    // Check if columns already exist
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'monthly_expenses' 
      AND column_name IN ('start_year', 'end_year')
    `;
    
    const existingColumns = await pool.query(checkQuery);
    
    if (existingColumns.rows.length === 0) {
      // Add start_year and end_year columns with current year as default
      const currentYear = new Date().getFullYear();
      
      await pool.query(`
        ALTER TABLE monthly_expenses 
        ADD COLUMN IF NOT EXISTS start_year INTEGER DEFAULT ${currentYear},
        ADD COLUMN IF NOT EXISTS end_year INTEGER DEFAULT ${currentYear}
      `);
      
      console.log('✓ Columns start_year and end_year added successfully');
      console.log(`✓ Default year set to: ${currentYear}`);
    } else {
      console.log('✓ Columns already exist');
    }
    
    // Show sample data
    const sampleQuery = await pool.query(
      'SELECT id, name, start_month, end_month, start_year, end_year FROM monthly_expenses LIMIT 3'
    );
    
    console.log('\nSample data:');
    console.table(sampleQuery.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

addExpenseYears();
