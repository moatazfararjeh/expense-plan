import React, { useMemo, useState } from 'react';

function MonthlyExpenses({ expenses, onAdd, onUpdate, onDelete, categories = ['Family Expense', 'My Expense', 'Loan', 'Other'], currency = 'SAR' }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Other');
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(12);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Generate year options (2024-2030)
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 2; i <= currentYear + 4; i++) {
    years.push(i);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && amount && amount > 0) {
      if (isEditing) {
        // Update existing expense
        onUpdate(editingId, { 
          name, 
          amount: parseFloat(amount), 
          category,
          start_month: parseInt(startMonth),
          end_month: parseInt(endMonth),
          start_year: parseInt(startYear),
          end_year: parseInt(endYear)
        });
        setIsEditing(false);
        setEditingId(null);
      } else {
        // Add new expense
        onAdd({ 
          name, 
          amount: parseFloat(amount), 
          category,
          start_month: parseInt(startMonth),
          end_month: parseInt(endMonth),
          start_year: parseInt(startYear),
          end_year: parseInt(endYear)
        });
      }
      // Reset form
      setName('');
      setAmount('');
      setCategory(categories[0] || 'Other');
      setStartMonth(1);
      setEndMonth(12);
      setStartYear(new Date().getFullYear());
      setEndYear(new Date().getFullYear());
    } else {
      alert('Please fill in all fields correctly');
    }
  };

  const handleEdit = (expense) => {
    setIsEditing(true);
    setEditingId(expense.id);
    setName(expense.name);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setStartMonth(expense.start_month || 1);
    setEndMonth(expense.end_month || 12);
    setStartYear(expense.start_year || new Date().getFullYear());
    setEndYear(expense.end_year || new Date().getFullYear());
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setAmount('');
    setCategory(categories[0] || 'Other');
    setStartMonth(1);
    setEndMonth(12);
    setStartYear(new Date().getFullYear());
    setEndYear(new Date().getFullYear());
  };

  const getMonthName = (monthNum) => {
    const month = months.find(m => m.value === parseInt(monthNum));
    return month ? month.label : '';
  };

  const calculateMonthsActive = (expense) => {
    const startMonth = expense.start_month || 1;
    const endMonth = expense.end_month || 12;
    const startYear = expense.start_year || new Date().getFullYear();
    const endYear = expense.end_year || new Date().getFullYear();
    
    if (startYear === endYear) {
      // Same year
      if (endMonth >= startMonth) {
        return endMonth - startMonth + 1;
      } else {
        return 12 - startMonth + endMonth + 1; // wraps around year
      }
    } else {
      // Different years
      const monthsInStartYear = 12 - startMonth + 1;
      const monthsInEndYear = endMonth;
      const fullYears = endYear - startYear - 1;
      return monthsInStartYear + (fullYears * 12) + monthsInEndYear;
    }
  };

  // Check if expense is active now
  const getExpenseStatus = (expense) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const startYear = expense.start_year || currentYear;
    const startMonth = expense.start_month || 1;
    const endYear = expense.end_year || currentYear;
    const endMonth = expense.end_month || 12;
    
    const startDate = new Date(startYear, startMonth - 1);
    const endDate = new Date(endYear, endMonth - 1);
    const nowDate = new Date(currentYear, currentMonth - 1);
    
    if (nowDate < startDate) return 'upcoming';
    if (nowDate > endDate) return 'expired';
    return 'active';
  };

  const expenseStats = useMemo(() => {
    if (expenses.length === 0) {
      return { totalAnnual: 0, avgMonthly: 0, active: 0, upcoming: 0, expired: 0, maxMonthly: 0 };
    }

    const stats = expenses.reduce((acc, expense) => {
      const monthsActive = calculateMonthsActive(expense);
      const totalValue = (parseFloat(expense.amount) || 0) * monthsActive;
      const monthlyAmount = parseFloat(expense.amount) || 0;
      const status = getExpenseStatus(expense);

      acc.totalAnnual += totalValue;
      acc.maxMonthly = Math.max(acc.maxMonthly, monthlyAmount);

      if (status === 'active') acc.active += 1;
      if (status === 'upcoming') acc.upcoming += 1;
      if (status === 'expired') acc.expired += 1;

      return acc;
    }, { totalAnnual: 0, active: 0, upcoming: 0, expired: 0, maxMonthly: 0 });

    return {
      ...stats,
      avgMonthly: stats.totalAnnual / 12
    };
  }, [expenses]);

  const { totalAnnual, avgMonthly, active, upcoming, expired, maxMonthly } = expenseStats;

  // Category icons and colors
  const getCategoryIcon = (category) => {
    const icons = {
      'Family Expense': '👨‍👩‍👧‍👦',
      'My Expense': '🏠',
      'Loan': '🏦',
      'Other': '📦'
    };
    return icons[category] || '💰';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Family Expense': '#FF6B6B',
      'My Expense': '#4ECDC4',
      'Loan': '#FFD93D',
      'Other': '#95E1D3'
    };
    return colors[category] || '#A8DADC';
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': { label: '✓ Active', color: '#10B981', bg: '#D1FAE5' },
      'upcoming': { label: '⏱️ Upcoming', color: '#F59E0B', bg: '#FEF3C7' },
      'expired': { label: '✕ Expired', color: '#EF4444', bg: '#FEE2E2' }
    };
    return badges[status] || badges.active;
  };

  return (
    <div className="monthly-expense-report">
      <div className="report-header">
        <div>
          <h2>📝 Monthly Recurring Expenses</h2>
          <p className="report-subtitle">Audit fixed obligations, their dates, and lifetime values</p>
        </div>
        <div className="header-pill">
          <span>Avg Monthly Outflow</span>
          <strong>{avgMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</strong>
        </div>
      </div>

      <div className="report-summary-grid">
        <div className="report-summary-card">
          <p className="summary-label">Total Annual</p>
          <p className="summary-value">{totalAnnual.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</p>
          <span className="summary-subvalue">Recurring coverage</span>
        </div>
        <div className="report-summary-card accent">
          <p className="summary-label">Avg Monthly</p>
          <p className="summary-value accent">{avgMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</p>
          <span className="summary-subvalue">Smoothed spend load</span>
        </div>
        <div className="report-summary-card">
          <p className="summary-label">Active Plans</p>
          <p className="summary-value">{active}</p>
          <span className="summary-subvalue">{upcoming} upcoming · {expired} completed</span>
        </div>
        <div className="report-summary-card">
          <p className="summary-label">Peak Obligation</p>
          <p className="summary-value">{maxMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</p>
          <span className="summary-subvalue">Largest single monthly bill</span>
        </div>
      </div>

      <div className="report-insight-banner">
        <div>
          <p className="insight-title">Spending Trajectory</p>
          <p className="insight-copy">
            Managing {expenses.length || 0} commitments with <span className="insight-highlight">{active}</span> active today. {upcoming} renewals scheduled and {expired} plans already completed.
          </p>
        </div>
        <div className="insight-metric">
          <span>Yearly Load</span>
          <strong>{totalAnnual.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</strong>
          <small>Peak monthly {maxMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</small>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-form">
        {isEditing && (
          <div className="module-alert warning">
            <span>✏️ Editing: {name || 'Expense'}</span>
            <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
              Cancel
            </button>
          </div>
        )}
        <div className="form-group">
          <label htmlFor="expense-name">Expense Name</label>
          <input
            type="text"
            id="expense-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., School fees"
          />
        </div>
        <div className="form-group">
          <label htmlFor="expense-amount">Amount</label>
          <input
            type="number"
            id="expense-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 2000"
            step="0.01"
            min="0"
          />
        </div>
        <div className="form-group">
          <label htmlFor="expense-category">Category</label>
          <select
            id="expense-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="start-month">Start Month</label>
          <select
            id="start-month"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="start-year">Start Year</label>
          <select
            id="start-year"
            value={startYear}
            onChange={(e) => setStartYear(e.target.value)}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="end-month">End Month</label>
          <select
            id="end-month"
            value={endMonth}
            onChange={(e) => setEndMonth(e.target.value)}
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="end-year">End Year</label>
          <select
            id="end-year"
            value={endYear}
            onChange={(e) => setEndYear(e.target.value)}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary full-width">
          {isEditing ? 'Update Expense' : 'Add Expense'}
        </button>
      </form>

      <div className="expense-list">
        {expenses.length > 0 ? (
          <>
            {expenses.map((expense) => {
              const monthsActive = calculateMonthsActive(expense);
              const yearlyTotal = parseFloat(expense.amount) * monthsActive;
              const status = getExpenseStatus(expense);
              const statusBadge = getStatusBadge(status);
              const categoryColor = getCategoryColor(expense.category);
              const categoryIcon = getCategoryIcon(expense.category);

              const showDateRange = expense.start_year && expense.end_year && 
                                   (expense.start_year !== expense.end_year || 
                                    expense.start_month !== expense.end_month || 
                                    expense.start_month !== 1 || 
                                    expense.end_month !== 12);

              return (
                <div 
                  key={expense.id} 
                  className="finance-list-card expense-card"
                  style={{ '--category-color': categoryColor }}
                >
                  <div>
                    <div className="expense-card-header">
                      <div className="income-icon" style={{ background: `${categoryColor}22`, color: categoryColor }}>
                        {categoryIcon}
                      </div>
                      <div>
                        <p className="income-name">{expense.name}</p>
                        <div className="expense-meta">
                          <span className="category-chip">{expense.category}</span>
                          <span className={`status-pill ${status}`}>{statusBadge.label}</span>
                        </div>
                      </div>
                    </div>

                    <div className="expense-details-grid">
                      <div>
                        <p className="detail-label">Monthly Amount</p>
                        <p className="detail-value">{parseFloat(expense.amount).toLocaleString()} {currency}</p>
                      </div>
                      <div>
                        <p className="detail-label">Months Covered</p>
                        <p className="detail-value">{monthsActive}</p>
                      </div>
                      <div>
                        <p className="detail-label">Lifetime Value</p>
                        <p className="detail-value">{yearlyTotal.toLocaleString()} {currency}</p>
                      </div>
                    </div>

                    {showDateRange && (
                      <div className="date-range-card">
                        <p className="detail-label">Schedule</p>
                        <p className="detail-value">
                          {getMonthName(expense.start_month)} {expense.start_year} → {getMonthName(expense.end_month)} {expense.end_year}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="card-actions">
                    <button 
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => handleEdit(expense)}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="btn btn-danger"
                      type="button"
                      onClick={() => onDelete(expense.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="module-highlight positive">
              Total Yearly Recurring: {totalAnnual.toLocaleString()} {currency}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>No monthly expenses added yet</p>
            <span>Log subscriptions, tuition, housing, and other commitments to project your cash flow.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default MonthlyExpenses;
