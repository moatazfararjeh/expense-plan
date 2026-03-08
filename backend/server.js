const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const pool = require('./db');
const authRoutes = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');
const { encryptValue, decryptValue, decryptFields, decryptArray } = require('./encryption');

const app = express();
const PORT = process.env.PORT || 1000;

const defaultAllowedOrigins = [
  'http://localhost:2000',
  'http://localhost:2002',
  'https://localhost:2001',
  'http://localhost:1000',
  'https://localhost:1001',
  'https://expense.ardalsharq.com'
];

const envAllowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (/^https?:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }

    // Allow any subdomain of ardalsharq.com in production
    if (/^https?:\/\/.*\.ardalsharq\.com$/.test(origin)) {
      return callback(null, true);
    }

    console.log('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Protected Routes (require authentication)

// Get user settings
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [req.user.id]);
    if (result.rows[0]) {
      // Parse categories if it's a string
      const settings = result.rows[0];
      
      // Decrypt sensitive fields
      settings.monthly_salary = decryptValue(settings.monthly_salary) || 0;
      settings.opening_balance = decryptValue(settings.opening_balance) || 0;
      
      if (typeof settings.categories === 'string') {
        settings.categories = JSON.parse(settings.categories);
      }
      // Format plan_start_date to YYYY-MM-DD if it exists
      if (settings.plan_start_date) {
        const date = new Date(settings.plan_start_date);
        settings.plan_start_date = date.toISOString().split('T')[0];
      }
      res.json(settings);
    } else {
      // Return default settings
      res.json({
        monthly_salary: 0,
        opening_balance: 0,
        plan_start_date: new Date().toISOString().split('T')[0],
        currency: 'SAR',
        categories: ['Jordan Family Expense', 'Our Expense', 'Loan Sabb', 'Other']
      });
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user settings
app.post('/api/settings', authenticateToken, async (req, res) => {
  const { monthly_salary, opening_balance, plan_start_date, currency, categories } = req.body;
  
  try {
    const checkResult = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [req.user.id]);
    
    // Convert categories array to JSON string for storage
    const categoriesJson = categories ? JSON.stringify(categories) : null;
    
    // Encrypt sensitive values before storing
    const encryptedSalary = encryptValue(monthly_salary);
    const encryptedBalance = encryptValue(opening_balance !== undefined ? opening_balance : 0);
    
    let result;
    if (checkResult.rows.length > 0) {
      result = await pool.query(
        'UPDATE user_settings SET monthly_salary = $1, opening_balance = $2, plan_start_date = $3, currency = $4, categories = $5, updated_at = CURRENT_TIMESTAMP WHERE user_id = $6 RETURNING *',
        [encryptedSalary, encryptedBalance, plan_start_date, currency || 'SAR', categoriesJson, req.user.id]
      );
    } else {
      result = await pool.query(
        'INSERT INTO user_settings (user_id, monthly_salary, opening_balance, plan_start_date, currency, categories) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [req.user.id, encryptedSalary, encryptedBalance, plan_start_date || new Date().toISOString().split('T')[0], currency || 'SAR', categoriesJson]
      );
    }
    
    // Decrypt values for response
    const settings = result.rows[0];
    settings.monthly_salary = decryptValue(settings.monthly_salary);
    settings.opening_balance = decryptValue(settings.opening_balance);
    
    if (typeof settings.categories === 'string') {
      settings.categories = JSON.parse(settings.categories);
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all monthly expenses
app.get('/api/monthly-expenses', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM monthly_expenses WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
    // Decrypt amount field
    const decryptedRows = decryptArray(result.rows, ['amount']);
    res.json(decryptedRows);
  } catch (error) {
    console.error('Error fetching monthly expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add monthly expense
app.post('/api/monthly-expenses', authenticateToken, async (req, res) => {
  const { name, amount, category, start_month, end_month, start_year, end_year } = req.body;
  
  try {
    const currentYear = new Date().getFullYear();
    // Encrypt amount before storing
    const encryptedAmount = encryptValue(amount);
    const result = await pool.query(
      'INSERT INTO monthly_expenses (user_id, name, amount, category, start_month, end_month, start_year, end_year) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [req.user.id, name, encryptedAmount, category || 'Other', start_month || 1, end_month || 12, start_year || currentYear, end_year || currentYear]
    );
    // Decrypt for response
    const expense = decryptFields(result.rows[0], ['amount']);
    res.json(expense);
  } catch (error) {
    console.error('Error adding monthly expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete monthly expense
app.delete('/api/monthly-expenses/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query('DELETE FROM monthly_expenses WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting monthly expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update monthly expense
app.put('/api/monthly-expenses/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, amount, category, start_month, end_month, start_year, end_year } = req.body;
  
  try {
    const currentYear = new Date().getFullYear();
    // Encrypt amount before updating
    const encryptedAmount = encryptValue(amount);
    const result = await pool.query(
      'UPDATE monthly_expenses SET name = $1, amount = $2, category = $3, start_month = $4, end_month = $5, start_year = $6, end_year = $7 WHERE id = $8 AND user_id = $9 RETURNING *',
      [name, encryptedAmount, category || 'Other', start_month || 1, end_month || 12, start_year || currentYear, end_year || currentYear, id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    // Decrypt for response
    const expense = decryptFields(result.rows[0], ['amount']);
    res.json(expense);
  } catch (error) {
    console.error('Error updating monthly expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all daily transactions
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM daily_transactions WHERE user_id = $1 ORDER BY transaction_date DESC, id DESC', [req.user.id]);
    // Decrypt amount field
    const decryptedRows = decryptArray(result.rows, ['amount']);
    res.json(decryptedRows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add daily transaction
app.post('/api/transactions', authenticateToken, async (req, res) => {
  const { description, amount, transaction_date, category } = req.body;
  
  try {
    // Encrypt amount before storing
    const encryptedAmount = encryptValue(amount);
    const result = await pool.query(
      'INSERT INTO daily_transactions (user_id, description, amount, transaction_date, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, description, encryptedAmount, transaction_date, category || 'Other']
    );
    // Decrypt for response
    const transaction = decryptFields(result.rows[0], ['amount']);
    res.json(transaction);
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update daily transaction
app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { description, amount, transaction_date, category } = req.body;
  
  try {
    // Encrypt amount before updating
    const encryptedAmount = encryptValue(amount);
    const result = await pool.query(
      'UPDATE daily_transactions SET description = $1, amount = $2, transaction_date = $3, category = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
      [description, encryptedAmount, transaction_date, category || 'Other', id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    // Decrypt for response
    const transaction = decryptFields(result.rows[0], ['amount']);
    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete daily transaction
app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query('DELETE FROM daily_transactions WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all additional income sources
app.get('/api/additional-income', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM additional_income WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
    // Decrypt amount field
    const decryptedRows = decryptArray(result.rows, ['amount']);
    res.json(decryptedRows);
  } catch (error) {
    console.error('Error fetching additional income:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add additional income
app.post('/api/additional-income', authenticateToken, async (req, res) => {
  const { name, amount, frequency, category, income_month } = req.body;
  
  try {
    // Encrypt amount before storing
    const encryptedAmount = encryptValue(amount);
    const result = await pool.query(
      'INSERT INTO additional_income (user_id, name, amount, frequency, category, income_month) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, name, encryptedAmount, frequency || 'Monthly', category || 'Other', income_month || null]
    );
    // Decrypt for response
    const income = decryptFields(result.rows[0], ['amount']);
    res.json(income);
  } catch (error) {
    console.error('Error adding additional income:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete additional income
app.delete('/api/additional-income/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query('DELETE FROM additional_income WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ message: 'Additional income deleted successfully' });
  } catch (error) {
    console.error('Error deleting additional income:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get summary/statistics
app.get('/api/summary', authenticateToken, async (req, res) => {
  try {
    const settingsResult = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [req.user.id]);
    const monthlyExpensesResult = await pool.query('SELECT * FROM monthly_expenses WHERE user_id = $1', [req.user.id]);
    const transactionsResult = await pool.query('SELECT SUM(amount::numeric) as total FROM daily_transactions WHERE user_id = $1', [req.user.id]);
    const additionalIncomeResult = await pool.query('SELECT * FROM additional_income WHERE user_id = $1', [req.user.id]);
    
    // Decrypt salary and calculate totals
    const salary = decryptValue(settingsResult.rows[0]?.monthly_salary) || 0;
    
    // Decrypt daily transactions - handle encrypted values
    let dailyTransactions = 0;
    if (transactionsResult.rows[0]?.total) {
      // If we have aggregated result, we need to fetch and decrypt individual rows
      const individualTransactions = await pool.query('SELECT amount FROM daily_transactions WHERE user_id = $1', [req.user.id]);
      dailyTransactions = individualTransactions.rows.reduce((sum, row) => {
        return sum + (decryptValue(row.amount) || 0);
      }, 0);
    }
    
    // Calculate monthly expenses considering date ranges - decrypt amounts
    let totalYearlyRecurringExpenses = 0;
    monthlyExpensesResult.rows.forEach(expense => {
      const amount = decryptValue(expense.amount) || 0;
      const startMonth = expense.start_month || 1;
      const endMonth = expense.end_month || 12;
      const monthsActive = endMonth >= startMonth ? (endMonth - startMonth + 1) : (12 - startMonth + endMonth + 1);
      totalYearlyRecurringExpenses += amount * monthsActive;
    });
    
    // Calculate average monthly expenses
    const avgMonthlyExpenses = totalYearlyRecurringExpenses / 12;
    
    // Calculate additional income (convert to monthly) - decrypt amounts
    let totalAdditionalMonthlyIncome = 0;
    additionalIncomeResult.rows.forEach(income => {
      const amount = decryptValue(income.amount) || 0;
      switch(income.frequency) {
        case 'Weekly':
          totalAdditionalMonthlyIncome += amount * 4.33; // avg weeks per month
          break;
        case 'Bi-weekly':
          totalAdditionalMonthlyIncome += amount * 2.17; // avg bi-weeks per month
          break;
        case 'Monthly':
          totalAdditionalMonthlyIncome += amount;
          break;
        case 'Yearly':
          totalAdditionalMonthlyIncome += amount / 12;
          break;
        default:
          totalAdditionalMonthlyIncome += amount;
      }
    });
    
    const totalMonthlyIncome = salary + totalAdditionalMonthlyIncome;
    const yearlySalary = salary * 12;
    const yearlyAdditionalIncome = totalAdditionalMonthlyIncome * 12;
    const totalYearlyIncome = totalMonthlyIncome * 12;
    const yearlyDailyExpenses = dailyTransactions;
    const totalYearlyExpenses = totalYearlyRecurringExpenses + yearlyDailyExpenses;
    const yearlySavings = totalYearlyIncome - totalYearlyExpenses;
    
    res.json({
      monthly_salary: salary,
      additional_monthly_income: totalAdditionalMonthlyIncome,
      total_monthly_income: totalMonthlyIncome,
      monthly_recurring_expenses: avgMonthlyExpenses,
      monthly_net: totalMonthlyIncome - avgMonthlyExpenses,
      yearly_salary: yearlySalary,
      yearly_additional_income: yearlyAdditionalIncome,
      total_yearly_income: totalYearlyIncome,
      yearly_recurring_expenses: totalYearlyRecurringExpenses,
      yearly_daily_expenses: yearlyDailyExpenses,
      total_yearly_expenses: totalYearlyExpenses,
      yearly_savings: yearlySavings
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get salary changes
app.get('/api/salary-changes', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM salary_changes WHERE user_id = $1 ORDER BY effective_date ASC',
      [req.user.id]
    );
    // Decrypt amount field
    const decryptedRows = decryptArray(result.rows, ['amount']);
    res.json(decryptedRows);
  } catch (error) {
    console.error('Error fetching salary changes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add salary change
app.post('/api/salary-changes', authenticateToken, async (req, res) => {
  const { amount, effective_date, notes } = req.body;
  
  try {
    // Encrypt amount before storing
    const encryptedAmount = encryptValue(amount);
    const result = await pool.query(
      'INSERT INTO salary_changes (user_id, amount, effective_date, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, encryptedAmount, effective_date, notes || '']
    );
    // Decrypt for response
    const salaryChange = decryptFields(result.rows[0], ['amount']);
    res.json(salaryChange);
  } catch (error) {
    console.error('Error adding salary change:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete salary change
app.delete('/api/salary-changes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query('DELETE FROM salary_changes WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ message: 'Salary change deleted successfully' });
  } catch (error) {
    console.error('Error deleting salary change:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Global error handler - must be before catch-all route
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  console.error('Error stack:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
    details: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// Serve React app for any other route (must be after API routes)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// Export app for HTTPS server
module.exports = app;

// Start HTTP server only if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
