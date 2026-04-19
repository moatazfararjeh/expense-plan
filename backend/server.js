const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const supabase = require('./supabase');
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
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {  // PGRST116 is "not found" error
      throw error;
    }

    if (settings) {
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
        categories: [
          'Housing / Rent', 'Utilities', 'Groceries', 'Transportation', 'Fuel',
          'Car Maintenance', 'Insurance', 'Medical', 'Pharmacy', 'Education',
          'Kids Expenses', 'Entertainment', 'Dining Out', 'Shopping', 'Clothing',
          'Travel', 'Savings', 'Investments', 'Credit Card Payments', 'Internet & Mobile',
          'Subscriptions', 'Gifts', 'Charity', 'Household Items', 'Personal Care',
          'Gym / Fitness', 'Pets', 'Maintenance & Repairs', 'Business Expenses',
          'Emergency Fund', 'Taxes', 'Parking & Tolls', 'Electronics', 'Furniture',
          'Coffee & Snacks', 'Miscellaneous'
        ]
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
    // Check if settings exist
    const { data: existing, error: checkError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    // Convert categories array to JSON string for storage
    const categoriesJson = categories ? JSON.stringify(categories) : null;
    
    // Encrypt sensitive values before storing
    const encryptedSalary = encryptValue(monthly_salary);
    const encryptedBalance = encryptValue(opening_balance !== undefined ? opening_balance : 0);
    
    let result;
    if (existing) {
      // Update existing settings
      result = await supabase
        .from('user_settings')
        .update({
          monthly_salary: encryptedSalary,
          opening_balance: encryptedBalance,
          plan_start_date,
          currency: currency || 'SAR',
          categories: categoriesJson,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', req.user.id)
        .select()
        .single();
    } else {
      // Insert new settings
      result = await supabase
        .from('user_settings')
        .insert([{
          user_id: req.user.id,
          monthly_salary: encryptedSalary,
          opening_balance: encryptedBalance,
          plan_start_date: plan_start_date || new Date().toISOString().split('T')[0],
          currency: currency || 'SAR',
          categories: categoriesJson
        }])
        .select()
        .single();
    }
    
    if (result.error) throw result.error;
    
    // Decrypt values for response
    const settings = result.data;
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
    const { data, error } = await supabase
      .from('monthly_expenses')
      .select('*')
      .eq('user_id', req.user.id)
      .order('id', { ascending: false });
    
    if (error) throw error;
    
    // Decrypt amount field
    const decryptedRows = decryptArray(data || [], ['amount']);
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
    
    const { data, error } = await supabase
      .from('monthly_expenses')
      .insert([{
        user_id: req.user.id,
        name,
        amount: encryptedAmount,
        category: category || 'Other',
        start_month: start_month || 1,
        end_month: end_month || 12,
        start_year: start_year || currentYear,
        end_year: end_year || currentYear
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Decrypt for response
    const expense = decryptFields(data, ['amount']);
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
    const { error } = await supabase
      .from('monthly_expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
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
    
    const { data, error } = await supabase
      .from('monthly_expenses')
      .update({
        name,
        amount: encryptedAmount,
        category: category || 'Other',
        start_month: start_month || 1,
        end_month: end_month || 12,
        start_year: start_year || currentYear,
        end_year: end_year || currentYear
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Expense not found' });
      }
      throw error;
    }
    
    // Decrypt for response
    const expense = decryptFields(data, ['amount']);
    res.json(expense);
  } catch (error) {
    console.error('Error updating monthly expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all daily transactions
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('daily_transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('transaction_date', { ascending: false })
      .order('id', { ascending: false });
    
    if (error) throw error;
    
    // Decrypt amount field
    const decryptedRows = decryptArray(data || [], ['amount']);
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
    
    const { data, error } = await supabase
      .from('daily_transactions')
      .insert([{
        user_id: req.user.id,
        description,
        amount: encryptedAmount,
        transaction_date,
        category: category || 'Other'
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Decrypt for response
    const transaction = decryptFields(data, ['amount']);
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
    
    const { data, error } = await supabase
      .from('daily_transactions')
      .update({
        description,
        amount: encryptedAmount,
        transaction_date,
        category: category || 'Other'
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      throw error;
    }
    
    // Decrypt for response
    const transaction = decryptFields(data, ['amount']);
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
    const { error } = await supabase
      .from('daily_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all additional income sources
app.get('/api/additional-income', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('additional_income')
      .select('*')
      .eq('user_id', req.user.id)
      .order('id', { ascending: false });
    
    if (error) throw error;
    
    // Decrypt amount field
    const decryptedRows = decryptArray(data || [], ['amount']);
    res.json(decryptedRows);
  } catch (error) {
    console.error('Error fetching additional income:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add additional income
app.post('/api/additional-income', authenticateToken, async (req, res) => {
  const { name, amount, frequency, category, income_month, income_year } = req.body;
  
  try {
    // Encrypt amount before storing
    const encryptedAmount = encryptValue(amount);
    
    const { data, error } = await supabase
      .from('additional_income')
      .insert([{
        user_id: req.user.id,
        name,
        amount: encryptedAmount,
        frequency: frequency || 'Monthly',
        category: category || 'Other',
        income_month: income_month || null,
        income_year: income_year || null
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Decrypt for response
    const income = decryptFields(data, ['amount']);
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
    const { error } = await supabase
      .from('additional_income')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
    res.json({ message: 'Additional income deleted successfully' });
  } catch (error) {
    console.error('Error deleting additional income:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get summary/statistics
app.get('/api/summary', authenticateToken, async (req, res) => {
  try {
    // Fetch all data in parallel using Supabase
    const [settingsResult, monthlyExpensesResult, transactionsResult, additionalIncomeResult] = await Promise.all([
      supabase.from('user_settings').select('*').eq('user_id', req.user.id).single(),
      supabase.from('monthly_expenses').select('*').eq('user_id', req.user.id),
      supabase.from('daily_transactions').select('amount').eq('user_id', req.user.id),
      supabase.from('additional_income').select('*').eq('user_id', req.user.id)
    ]);
    
    // Decrypt salary and calculate totals
    const salary = decryptValue(settingsResult.data?.monthly_salary) || 0;
    
    // Decrypt daily transactions
    let dailyTransactions = 0;
    if (transactionsResult.data && transactionsResult.data.length > 0) {
      dailyTransactions = transactionsResult.data.reduce((sum, row) => {
        return sum + (decryptValue(row.amount) || 0);
      }, 0);
    }
    
    // Calculate monthly expenses considering date ranges - decrypt amounts
    let totalYearlyRecurringExpenses = 0;
    if (monthlyExpensesResult.data) {
      monthlyExpensesResult.data.forEach(expense => {
        const amount = decryptValue(expense.amount) || 0;
        const startMonth = expense.start_month || 1;
        const endMonth = expense.end_month || 12;
        const monthsActive = endMonth >= startMonth ? (endMonth - startMonth + 1) : (12 - startMonth + endMonth + 1);
        totalYearlyRecurringExpenses += amount * monthsActive;
      });
    }
    
    // Calculate average monthly expenses
    const avgMonthlyExpenses = totalYearlyRecurringExpenses / 12;
    
    // Calculate additional income (convert to monthly) - decrypt amounts
    let totalAdditionalMonthlyIncome = 0;
    if (additionalIncomeResult.data) {
      additionalIncomeResult.data.forEach(income => {
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
    }
    
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
    const { data, error } = await supabase
      .from('salary_changes')
      .select('*')
      .eq('user_id', req.user.id)
      .order('effective_date', { ascending: true });
    
    if (error) throw error;
    
    // Decrypt amount field
    const decryptedRows = decryptArray(data || [], ['amount']);
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
    
    const { data, error } = await supabase
      .from('salary_changes')
      .insert([{
        user_id: req.user.id,
        amount: encryptedAmount,
        effective_date,
        notes: notes || ''
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Decrypt for response
    const salaryChange = decryptFields(data, ['amount']);
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
    const { error } = await supabase
      .from('salary_changes')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
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
  app.listen(PORT);
}
