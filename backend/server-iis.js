const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const pool = require('./db');
const authRoutes = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');
const { encryptValue, decryptValue, decryptFields, decryptArray } = require('./encryption');

const app = express();

// CORS Configuration for HTTPS
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:2000',
      'https://localhost:2001',
      'http://localhost:1000',
      'https://localhost:1001'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight for all routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running', https: req.protocol === 'https' });
});

// Get income
app.get('/api/income', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM income');
    const decryptedIncome = decryptArray(result.rows, ['description', 'category']);
    res.json(decryptedIncome);
  } catch (error) {
    console.error('Error fetching income:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add income
app.post('/api/income', authenticateToken, async (req, res) => {
  try {
    const { amount, description, category, year, month } = req.body;
    const encryptedDescription = encryptValue(description);
    const encryptedCategory = encryptValue(category);
    
    const result = await pool.query(
 'INSERT INTO income (amount, description, category, year, month) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [amount, encryptedDescription, encryptedCategory, year, month]
    );
    
    const decryptedIncome = decryptFields(result.rows[0], ['description', 'category']);
    res.status(201).json(decryptedIncome);
  } catch (error) {
    console.error('Error adding income:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete income
app.delete('/api/income/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM income WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting income:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get expenses
app.get('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    const decryptedExpenses = decryptArray(result.rows, ['description', 'category']);
    res.json(decryptedExpenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add expense
app.post('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const { amount, description, category, date, isRecurring, year } = req.body;
    const encryptedDescription = encryptValue(description);
    const encryptedCategory = encryptValue(category);
    
    const result = await pool.query(
      'INSERT INTO expenses (amount, description, category, date, is_recurring, year) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [amount, encryptedDescription, encryptedCategory, date, isRecurring || false, year]
    );
    
    const decryptedExpense = decryptFields(result.rows[0], ['description', 'category']);
    res.status(201).json(decryptedExpense);
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update expense
app.put('/api/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, category, date, isRecurring, year } = req.body;
    
    const encryptedDescription = encryptValue(description);
    const encryptedCategory = encryptValue(category);
    
    const result = await pool.query(
      'UPDATE expenses SET amount = $1, description = $2, category = $3, date = $4, is_recurring = $5, year = $6 WHERE id = $7 RETURNING *',
      [amount, encryptedDescription, encryptedCategory, date, isRecurring || false, year, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    const decryptedExpense = decryptFields(result.rows[0], ['description', 'category']);
    res.json(decryptedExpense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete expense
app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get additional income
app.get('/api/additional-income', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM additional_income ORDER BY date DESC');
    const decryptedIncome = decryptArray(result.rows, ['description']);
    res.json(decryptedIncome);
  } catch (error) {
    console.error('Error fetching additional income:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add additional income
app.post('/api/additional-income', authenticateToken, async (req, res) => {
  try {
    const { amount, description, date, year, month } = req.body;
    const encryptedDescription = encryptValue(description);
    
    const result = await pool.query(
      'INSERT INTO additional_income (amount, description, date, year, month) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [amount, encryptedDescription, date, year, month]
    );
    
    const decryptedIncome = decryptFields(result.rows[0], ['description']);
    res.status(201).json(decryptedIncome);
  } catch (error) {
    console.error('Error adding additional income:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete additional income
app.delete('/api/additional-income/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM additional_income WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting additional income:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get settings
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings LIMIT 1');
    const decryptedSettings = result.rows.length > 0 
      ? decryptFields(result.rows[0], ['currency']) 
      : { salary: 0, opening_balance: 0, currency: 'SAR', plan_start_date: new Date().toISOString().split('T')[0] };
    res.json(decryptedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update settings
app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const { salary, openingBalance, currency, planStartDate } = req.body;
    const encryptedCurrency = encryptValue(currency);
    
    const checkResult = await pool.query('SELECT * FROM settings LIMIT 1');
    
    let result;
    if (checkResult.rows.length > 0) {
      result = await pool.query(
        'UPDATE settings SET salary = $1, opening_balance = $2, currency = $3, plan_start_date = $4 WHERE id = $5 RETURNING *',
        [salary, openingBalance, encryptedCurrency, planStartDate, checkResult.rows[0].id]
      );
    } else {
      result = await pool.query(
        'INSERT INTO settings (salary, opening_balance, currency, plan_start_date) VALUES ($1, $2, $3, $4) RETURNING *',
        [salary, openingBalance, encryptedCurrency, planStartDate]
      );
    }
    
    const decryptedSettings = decryptFields(result.rows[0], ['currency']);
    res.json(decryptedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get salary changes
app.get('/api/salary-changes', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM salary_changes ORDER BY effective_date ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching salary changes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add salary change
app.post('/api/salary-changes', authenticateToken, async (req, res) => {
  try {
    const { newSalary, effectiveDate } = req.body;
    
    const result = await pool.query(
      'INSERT INTO salary_changes (new_salary, effective_date) VALUES ($1, $2) RETURNING *',
      [newSalary, effectiveDate]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding salary change:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete salary change
app.delete('/api/salary-changes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM salary_changes WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting salary change:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get categories
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    const decryptedCategories = decryptArray(result.rows, ['name']);
    res.json(decryptedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add category
app.post('/api/categories', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const encryptedName = encryptValue(name);
    
    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [encryptedName]
    );
    
    const decryptedCategory = decryptFields(result.rows[0], ['name']);
    res.status(201).json(decryptedCategory);
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete category
app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// For iisnode, export the app instead of calling listen()
module.exports = app;
