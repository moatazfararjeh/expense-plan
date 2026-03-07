import React, { useMemo, useState } from 'react';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function AdditionalIncome({ incomes, onAdd, onDelete }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('Monthly');
  const [category, setCategory] = useState('Freelance');
  const [incomeMonth, setIncomeMonth] = useState('1'); // For one-time income

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && amount && amount > 0) {
      const incomeData = { 
        name, 
        amount: parseFloat(amount), 
        frequency, 
        category
      };
      
      // Add income_month only for one-time income
      if (frequency === 'One-time') {
        incomeData.income_month = parseInt(incomeMonth);
      }
      
      onAdd(incomeData);
      setName('');
      setAmount('');
      setFrequency('Monthly');
      setCategory('Freelance');
      setIncomeMonth('1');
    } else {
      alert('Please fill in all fields correctly');
    }
  };

  // Calculate total monthly income from all sources
  const calculateMonthlyIncome = (income) => {
    const amount = parseFloat(income.amount);
    switch(income.frequency) {
      case 'One-time':
        return 0; // One-time doesn't count as recurring monthly income
      case 'Weekly':
        return amount * 4.33; // avg weeks per month
      case 'Bi-weekly':
        return amount * 2.17; // avg bi-weeks per month
      case 'Monthly':
        return amount;
      case 'Yearly':
        return amount / 12;
      default:
        return amount;
    }
  };

  const summaryStats = useMemo(() => {
    const monthlyRecurring = incomes.reduce((sum, income) => sum + calculateMonthlyIncome(income), 0);
    const oneTimeIncomes = incomes.filter((income) => income.frequency === 'One-time');
    const oneTimeValue = oneTimeIncomes.reduce((sum, income) => sum + parseFloat(income.amount || 0), 0);
    const categoryCount = new Set(incomes.map((income) => income.category)).size;
    const diversified = categoryCount > 3 ? 'diversified' : 'building';

    return {
      monthlyRecurring,
      annualizedRecurring: monthlyRecurring * 12,
      oneTimeCount: oneTimeIncomes.length,
      oneTimeValue,
      categoryCount,
      diversificationLabel: diversified
    };
  }, [incomes]);

  const topIncomeStream = useMemo(() => {
    if (!incomes.length) return null;
    return incomes.reduce((top, income) => {
      const amount = parseFloat(income.amount || 0);
      return amount > parseFloat(top.amount || 0) ? income : top;
    }, incomes[0]);
  }, [incomes]);

  const nextOneTimeIncome = useMemo(() => {
    const events = incomes
      .filter((income) => income.frequency === 'One-time' && income.income_month)
      .map((income) => ({
        month: parseInt(income.income_month, 10),
        label: monthNames[(parseInt(income.income_month, 10) || 1) - 1],
        amount: parseFloat(income.amount || 0),
        name: income.name
      }))
      .sort((a, b) => a.month - b.month);
    return events[0] || null;
  }, [incomes]);

  return (
    <div className="monthly-expense-report">
      <div className="report-header">
        <div>
          <h2>💵 Additional Income Sources</h2>
          <p className="report-subtitle">Track diversified revenue streams and one-time boosts</p>
        </div>
        <div className="header-pill">
          <span>Monthly Boost</span>
          <strong>{summaryStats.monthlyRecurring.toLocaleString(undefined, { maximumFractionDigits: 0 })} SAR</strong>
        </div>
      </div>

      <div className="report-summary-grid">
        <div className="report-summary-card">
          <p className="summary-label">Annualized Recurring</p>
          <p className="summary-value">{summaryStats.annualizedRecurring.toLocaleString(undefined, { maximumFractionDigits: 0 })} SAR</p>
          <span className="summary-subvalue">Projected yearly inflow</span>
        </div>
        <div className="report-summary-card accent">
          <p className="summary-label">One-time Boosts</p>
          <p className="summary-value">{summaryStats.oneTimeValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} SAR</p>
          <span className="summary-subvalue">{summaryStats.oneTimeCount} scheduled payouts</span>
        </div>
        <div className="report-summary-card">
          <p className="summary-label">Income Streams</p>
          <p className="summary-value">{incomes.length}</p>
          <span className="summary-subvalue">{summaryStats.categoryCount} categories · {summaryStats.diversificationLabel}</span>
        </div>
        <div className="report-summary-card">
          <p className="summary-label">Recurring Avg.</p>
          <p className="summary-value accent">{incomes.length ? Math.round(summaryStats.monthlyRecurring / Math.max(1, incomes.length)).toLocaleString() : 0} SAR</p>
          <span className="summary-subvalue">Per active stream</span>
        </div>
      </div>

      <div className="report-insight-banner">
        <div>
          <p className="insight-title">Income Outlook</p>
          <p className="insight-copy">
            Recurring sources currently provide <span className="insight-highlight">{summaryStats.monthlyRecurring.toLocaleString(undefined, { maximumFractionDigits: 0 })} SAR</span> per month.
            {nextOneTimeIncome ? (
              <> Next one-time boost arrives in <span className="insight-highlight">{nextOneTimeIncome.label}</span>.</>
            ) : (
              <> Add a one-time payout to plan seasonal inflows.</>
            )}
          </p>
        </div>
        {topIncomeStream && (
          <div className="insight-metric">
            <span>Top Stream</span>
            <strong>{topIncomeStream.name}</strong>
            <small>{parseFloat(topIncomeStream.amount).toLocaleString()} SAR {topIncomeStream.frequency.toLowerCase()}</small>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="glass-form">
        <div className="form-group">
          <label htmlFor="income-name">Income Source Name</label>
          <input
            type="text"
            id="income-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Freelance work"
          />
        </div>
        <div className="form-group">
          <label htmlFor="income-amount">Amount</label>
          <input
            type="number"
            id="income-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 1000"
            step="0.01"
            min="0"
          />
        </div>
        <div className="form-group">
          <label htmlFor="income-frequency">Frequency</label>
          <select
            id="income-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          >
            <option value="One-time">One-time (مرة واحدة)</option>
            <option value="Weekly">Weekly</option>
            <option value="Bi-weekly">Bi-weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
          </select>
        </div>
        
        {/* Show month selector only for one-time income */}
        {frequency === 'One-time' && (
          <div className="form-group">
            <label htmlFor="income-month">Which Month? (أي شهر؟)</label>
            <select
              id="income-month"
              value={incomeMonth}
              onChange={(e) => setIncomeMonth(e.target.value)}
            >
              <option value="1">January (يناير)</option>
              <option value="2">February (فبراير)</option>
              <option value="3">March (مارس)</option>
              <option value="4">April (إبريل)</option>
              <option value="5">May (مايو)</option>
              <option value="6">June (يونيو)</option>
              <option value="7">July (يوليو)</option>
              <option value="8">August (أغسطس)</option>
              <option value="9">September (سبتمبر)</option>
              <option value="10">October (أكتوبر)</option>
              <option value="11">November (نوفمبر)</option>
              <option value="12">December (ديسمبر)</option>
            </select>
          </div>
        )}
        <div className="form-group">
          <label htmlFor="income-category">Category</label>
          <select
            id="income-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Freelance">Freelance</option>
            <option value="Side Business">Side Business</option>
            <option value="Rental Income">Rental Income</option>
            <option value="Investments">Investments</option>
            <option value="Bonuses">Bonuses</option>
            <option value="Commission">Commission</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary full-width">
          Add Income Source
        </button>
      </form>

      <div className="expense-list">
        {incomes.length > 0 ? (
          <>
            {incomes.map((income) => {
              const isOneTime = income.frequency === 'One-time';
              const monthlyEquivalent = calculateMonthlyIncome(income);
              return (
                <div key={income.id} className="finance-list-card income-card">
                  <div>
                    <div className="income-card-header">
                      <div className="income-icon">{isOneTime ? '⚡' : '💼'}</div>
                      <div>
                        <p className="income-name">{income.name}</p>
                        <div className="income-meta">
                          <span className={`frequency-pill ${isOneTime ? 'one-time' : 'recurring'}`}>
                            {income.frequency}
                            {isOneTime && income.income_month && ` · ${monthNames[income.income_month - 1]}`}
                          </span>
                          <span className="category-chip">{income.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="income-details-row">
                      <div>
                        <p className="detail-label">Face Value</p>
                        <p className="detail-value">{parseFloat(income.amount).toLocaleString()} SAR</p>
                      </div>
                      {!isOneTime && (
                        <div>
                          <p className="detail-label">Monthly Equivalent</p>
                          <p className="detail-value positive">{monthlyEquivalent.toLocaleString()} SAR</p>
                        </div>
                      )}
                      {isOneTime && (
                        <div>
                          <p className="detail-label">Applies To</p>
                          <p className="detail-value warning">{income.income_month ? monthNames[income.income_month - 1] : 'Selected month'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="card-actions">
                    {!isOneTime && (
                      <span className="recurring-pill">≈ {(monthlyEquivalent * 12).toLocaleString()} SAR/yr</span>
                    )}
                    <button 
                      className="btn btn-danger"
                      onClick={() => onDelete(income.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="module-highlight positive">
              Total Additional Income: {summaryStats.monthlyRecurring.toLocaleString()} SAR / month
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>No additional income sources yet</p>
            <span>Capture freelance gigs, stipends, side business revenue, and seasonal payouts.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdditionalIncome;
