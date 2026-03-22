import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import './responsive.css';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Settings from './components/Settings';
import AdditionalIncome from './components/AdditionalIncome';
import MonthlyExpenses from './components/MonthlyExpenses';
import DailyTransactions from './components/DailyTransactions';
import ExpenseChart from './components/ExpenseChart';
import MonthlyProjection from './components/MonthlyProjection';
import MonthlyExpenseReport from './components/MonthlyExpenseReport';
import Layout from './components/Layout';

const API_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'http://localhost:3001/api';

function App() {
  const { isAuthenticated, loading: authLoading, logout, user, getAuthHeader } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, transactions, reports, settings
  const [transactionSubTab, setTransactionSubTab] = useState('income'); // income, expenses, daily
  const [salary, setSalary] = useState(0);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('SAR');
  const [categories, setCategories] = useState(['Family Expense', 'My Expense', 'Loan', 'Other']);
  const [salaryChanges, setSalaryChanges] = useState([]);
  const [additionalIncomes, setAdditionalIncomes] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salaryVisible, setSalaryVisible] = useState(true); // Toggle salary visibility
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showSetupRequired, setShowSetupRequired] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  const closeMobileNav = () => setIsMobileNavOpen(false);

  // Fetch all data
  const fetchData = async () => {
    try {
      const headers = getAuthHeader();
      const [settingsRes, salaryChangesRes, incomesRes, expensesRes, transactionsRes] = await Promise.all([
        axios.get(`${API_URL}/settings`, { headers }),
        axios.get(`${API_URL}/salary-changes`, { headers }),
        axios.get(`${API_URL}/additional-income`, { headers }),
        axios.get(`${API_URL}/monthly-expenses`, { headers }),
        axios.get(`${API_URL}/transactions`, { headers })
      ]);

      setSalary(settingsRes.data.monthly_salary || 0);
      setOpeningBalance(settingsRes.data.opening_balance || 0);
      setPlanStartDate(settingsRes.data.plan_start_date || new Date().toISOString().split('T')[0]);
      setCurrency(settingsRes.data.currency || 'SAR');
      setCategories(settingsRes.data.categories || ['Family Expense', 'My Expense', 'Loan', 'Other']);
      setSalaryChanges(salaryChangesRes.data);
      setAdditionalIncomes(incomesRes.data);
      setMonthlyExpenses(expensesRes.data);
      setTransactions(transactionsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
      setLoading(false);
    }
  };

  // Check if initial setup is complete
  const checkSetupComplete = () => {
    const hasSalary = salary && salary > 0;
    const hasPlanStartDate = planStartDate && planStartDate !== '';
    const setupCompleted = hasSalary && hasPlanStartDate;
    
    setIsSetupComplete(setupCompleted);
    setShowSetupRequired(!setupCompleted && !loading);
    
    // Auto-redirect to settings if setup not complete
    if (!setupCompleted && !loading && activeTab !== 'settings') {
      setActiveTab('settings');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Check setup completion whenever salary or planStartDate changes
  useEffect(() => {
    if (!loading) {
      checkSetupComplete();
    }
  }, [salary, planStartDate, loading]);

  // Handle tab changes with setup check
  const handleTabChange = (newTab) => {
    // Allow access to settings even if setup is not complete
    if (newTab === 'settings' || isSetupComplete) {
      setActiveTab(newTab);
    } else {
      // Show warning if trying to navigate without completing setup
      setShowSetupRequired(true);
      setActiveTab('settings');
    }
  };

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileNavOpen) {
        setIsMobileNavOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileNavOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isMobileNavOpen) {
        setIsMobileNavOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileNavOpen]);

  // Update settings (salary, opening balance, and plan start date)
  const updateSettings = async (newSalary, newOpeningBalance, newPlanStartDate) => {
    try {
      const headers = getAuthHeader();
      await axios.post(`${API_URL}/settings`, { 
        monthly_salary: newSalary, 
        opening_balance: newOpeningBalance,
        plan_start_date: newPlanStartDate
      }, { headers });
      setSalary(newSalary);
      setOpeningBalance(newOpeningBalance);
      setPlanStartDate(newPlanStartDate);
      
      // Check if setup is now complete
      const hasSalary = newSalary && newSalary > 0;
      const hasPlanStartDate = newPlanStartDate && newPlanStartDate !== '';
      if (hasSalary && hasPlanStartDate) {
        setIsSetupComplete(true);
        setShowSetupRequired(false);
      }
      
      fetchData();
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Failed to update settings');
    }
  };

  // Add additional income
  const addAdditionalIncome = async (income) => {
    try {
      const headers = getAuthHeader();
      const response = await axios.post(`${API_URL}/additional-income`, income, { headers });
      setAdditionalIncomes([response.data, ...additionalIncomes]);
      fetchData();
    } catch (error) {
      console.error('Error adding additional income:', error);
      alert('Failed to add income source');
    }
  };

  // Delete additional income
  const deleteAdditionalIncome = async (id) => {
    try {
      const headers = getAuthHeader();
      await axios.delete(`${API_URL}/additional-income/${id}`, { headers });
      setAdditionalIncomes(additionalIncomes.filter(inc => inc.id !== id));
      fetchData();
    } catch (error) {
      console.error('Error deleting additional income:', error);
      alert('Failed to delete income source');
    }
  };

  // Add salary change
  const addSalaryChange = async (change) => {
    try {
      const headers = getAuthHeader();
      const response = await axios.post(`${API_URL}/salary-changes`, change, { headers });
      setSalaryChanges([...salaryChanges, response.data]);
      fetchData();
    } catch (error) {
      console.error('Error adding salary change:', error);
      alert('Failed to add salary change');
    }
  };

  // Delete salary change
  const deleteSalaryChange = async (id) => {
    try {
      const headers = getAuthHeader();
      await axios.delete(`${API_URL}/salary-changes/${id}`, { headers });
      setSalaryChanges(salaryChanges.filter(change => change.id !== id));
      fetchData();
    } catch (error) {
      console.error('Error deleting salary change:', error);
      alert('Failed to delete salary change');
    }
  };

  // Add monthly expense
  const addMonthlyExpense = async (expense) => {
    try {
      const headers = getAuthHeader();
      const response = await axios.post(`${API_URL}/monthly-expenses`, expense, { headers });
      setMonthlyExpenses([response.data, ...monthlyExpenses]);
      fetchData();
    } catch (error) {
      console.error('Error adding monthly expense:', error);
      alert('Failed to add expense');
    }
  };

  // Delete monthly expense
  const deleteMonthlyExpense = async (id) => {
    try {
      const headers = getAuthHeader();
      await axios.delete(`${API_URL}/monthly-expenses/${id}`, { headers });
      setMonthlyExpenses(monthlyExpenses.filter(exp => exp.id !== id));
      fetchData();
    } catch (error) {
      console.error('Error deleting monthly expense:', error);
      alert('Failed to delete expense');
    }
  };

  // Update monthly expense
  const updateMonthlyExpense = async (id, expense) => {
    try {
      const headers = getAuthHeader();
      const response = await axios.put(`${API_URL}/monthly-expenses/${id}`, expense, { headers });
      setMonthlyExpenses(monthlyExpenses.map(exp => exp.id === id ? response.data : exp));
      fetchData();
    } catch (error) {
      console.error('Error updating monthly expense:', error);
      alert('Failed to update expense');
    }
  };

  // Add transaction
  const addTransaction = async (transaction) => {
    try {
      const headers = getAuthHeader();
      if (transaction.isUpdate && transaction.id) {
        // Update existing transaction
        const response = await axios.put(`${API_URL}/transactions/${transaction.id}`, {
          description: transaction.description,
          amount: transaction.amount,
          transaction_date: transaction.transaction_date,
          category: transaction.category
        }, { headers });
        setTransactions(transactions.map(t => t.id === transaction.id ? response.data : t));
      } else {
        // Add new transaction
        const response = await axios.post(`${API_URL}/transactions`, transaction, { headers });
        setTransactions([response.data, ...transactions]);
      }
      fetchData();
    } catch (error) {
      console.error('Error adding/updating transaction:', error);
      alert('Failed to add/update transaction');
      throw error;
    }
  };

  // Delete transaction
  const deleteTransaction = async (id) => {
    try {
      const headers = getAuthHeader();
      await axios.delete(`${API_URL}/transactions/${id}`, { headers });
      setTransactions(transactions.filter(trans => trans.id !== id));
      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  if (authLoading) {
    return (
      <div className="App">
        <div className="header">
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return showRegister ? (
      <Register onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <Login onSwitchToRegister={() => setShowRegister(true)} />
    );
  }

  if (loading) {
    return (
      <div className="App">
        <div className="header">
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      isMobileNavOpen={isMobileNavOpen}
      setIsMobileNavOpen={setIsMobileNavOpen}
    >
      {/* Setup Required Banner */}
      {showSetupRequired && !isSetupComplete && (
        <div className="setup-required-banner" style={{
          position: 'sticky',
          top: '70px',
          zIndex: 100,
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          padding: '1.25rem 2rem',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
          borderBottom: '3px solid #b45309',
          animation: 'slideDown 0.4s ease-out'
        }}>
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '2rem' }}>⚠️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
              Initial Setup Required
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', opacity: 0.95 }}>
                  {!salary || salary <= 0 ? '❌ Please enter your monthly salary' : ''}
                  {(!salary || salary <= 0) && (!planStartDate || planStartDate === '') ? ' • ' : ''}
                  {!planStartDate || planStartDate === '' ? '❌ Please enter plan start date' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSetupRequired(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '2px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '0.9rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
      
      {activeTab === 'dashboard' && (
        <div className="tab-content fade-in content-container">
          <div className="content-header">
            <div>
              <h1>Dashboard Overview</h1>
              <p className="content-subtitle">Track your financial health at a glance</p>
            </div>
          </div>
          
          <div className="dashboard-column">
            <MonthlyProjection
              salary={salary}
              openingBalance={openingBalance}
              planStartDate={planStartDate}
              salaryChanges={salaryChanges}
              additionalIncomes={additionalIncomes}
              monthlyExpenses={monthlyExpenses}
              transactions={transactions}
              currency={currency}
            />
            <ExpenseChart 
              monthlyExpenses={monthlyExpenses}
              transactions={transactions}
              salary={salary}
              additionalIncomes={additionalIncomes}
              currency={currency}
              planStartDate={planStartDate}
            />
          </div>
        </div>
      )}
      {activeTab === 'transactions' && (
        <div className="tab-content fade-in content-container">
          <div className="content-header">
            <div>
              <h1>Transactions Manager</h1>
              <p className="content-subtitle">Manage your income and expenses</p>
            </div>
          </div>
          
          {/* Sub-tabs for transaction sections */}
          <div className="sub-tabs">
            <button
              className={`sub-tab-btn ${transactionSubTab === 'income' ? 'active income-tab' : ''}`}
              onClick={() => setTransactionSubTab('income')}
            >
              <span className="tab-emoji">💵</span>
              <span>Additional Income Sources</span>
            </button>
            
            <button
              className={`sub-tab-btn ${transactionSubTab === 'expenses' ? 'active expenses-tab' : ''}`}
              onClick={() => setTransactionSubTab('expenses')}
            >
              <span className="tab-emoji">📝</span>
              <span>Monthly Recurring Expenses</span>
            </button>
            
            <button
              className={`sub-tab-btn ${transactionSubTab === 'daily' ? 'active daily-tab' : ''}`}
              onClick={() => setTransactionSubTab('daily')}
            >
              <span className="tab-emoji">💳</span>
              <span>Daily Transactions</span>
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="transaction-sub-content">
            {transactionSubTab === 'income' && (
              <div className="fade-in">
                <AdditionalIncome 
                  incomes={additionalIncomes}
                  onAdd={addAdditionalIncome}
                  onDelete={deleteAdditionalIncome}
                  currency={currency}
                />
              </div>
            )}
            
            {transactionSubTab === 'expenses' && (
              <div className="fade-in">
                <MonthlyExpenses 
                  expenses={monthlyExpenses} 
                  onAdd={addMonthlyExpense}
                  onUpdate={updateMonthlyExpense}
                  onDelete={deleteMonthlyExpense}
                  categories={categories}
                  currency={currency}
                />
              </div>
            )}
            
            {transactionSubTab === 'daily' && (
              <div className="fade-in">
                <DailyTransactions 
                  transactions={transactions}
                  onAdd={addTransaction}
                  onDelete={deleteTransaction}
                  categories={categories}
                  currency={currency}
                />
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'reports' && (
        <div className="tab-content fade-in content-container">
          <div className="content-header">
            <div>
              <h1>Financial Reports</h1>
              <p className="content-subtitle">Analyze your spending patterns</p>
            </div>
          </div>
          
          <div className="charts-grid">
            
            <MonthlyExpenseReport
              monthlyExpenses={monthlyExpenses}
              transactions={transactions}
              salary={salary}
              salaryChanges={salaryChanges}
              additionalIncomes={additionalIncomes}
              currency={currency}
              salaryVisible={salaryVisible}
              toggleSalaryVisibility={() => setSalaryVisible(!salaryVisible)}
              openingBalance={openingBalance}
              planStartDate={planStartDate}
            />
          </div>
        </div>
      )}
      {activeTab === 'settings' && (
        <div className="tab-content fade-in content-container">
          <Settings 
            salary={salary}
            openingBalance={openingBalance}
            planStartDate={planStartDate}
            onUpdateSettings={updateSettings}
            salaryChanges={salaryChanges}
            onAddSalaryChange={addSalaryChange}
            onDeleteSalaryChange={deleteSalaryChange}
          />
        </div>
      )}
    </Layout>
  );
}

export default App;
