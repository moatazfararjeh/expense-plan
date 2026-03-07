import React, { useState } from 'react';

function SalarySettings({ salary, openingBalance, planStartDate, onUpdate, currency = 'SAR' }) {
  const [salaryInput, setSalaryInput] = useState(salary);
  const [balanceInput, setBalanceInput] = useState(openingBalance);
  const [startDateInput, setStartDateInput] = useState(planStartDate || new Date().toISOString().split('T')[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (salaryInput && salaryInput >= 0) {
      onUpdate(parseFloat(salaryInput), parseFloat(balanceInput || 0), startDateInput);
    } else {
      alert('Please enter a valid salary amount');
    }
  };

  const formatMoney = (value) => `${parseFloat(value || 0).toLocaleString()} ${currency}`;

  return (
    <div className="card finance-module">
      <div className="section-header">
        <div>
          <h2>💼 Salary & Plan Settings</h2>
          <p className="section-subtitle">Frame the baseline income, liquidity, and tracking start date.</p>
        </div>
        <div className="header-pill">
          <span>Monthly Salary</span>
          <strong>{formatMoney(salary)}</strong>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <p className="summary-label">Opening Balance</p>
          <p className="summary-value">{formatMoney(openingBalance)}</p>
          <span className="summary-subvalue">Funds before the plan</span>
        </div>
        <div className="summary-card">
          <p className="summary-label">Plan Start Date</p>
          <p className="summary-value">
            {planStartDate ? new Date(planStartDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Select date'}
          </p>
          <span className="summary-subvalue">Controls the 12-month projection</span>
        </div>
      </div>

      <div className="module-banner">
        <div>
          <p className="insight-title">Baseline Setup</p>
          <p className="insight-copy">
            Keep these values current so every projection, summary, and alert reflects your latest salary and liquidity.
          </p>
        </div>
        <div className="insight-metric">
          <span>Plan Anchor</span>
          <strong>{planStartDate ? new Date(planStartDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Not set'}</strong>
          <small>Tracking period start</small>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-form">
        <div className="form-group">
          <label htmlFor="salary">Monthly Salary</label>
          <input
            type="number"
            id="salary"
            value={salaryInput}
            onChange={(e) => setSalaryInput(e.target.value)}
            placeholder="e.g., 30000"
            step="0.01"
            min="0"
          />
        </div>
        <div className="form-group">
          <label htmlFor="opening-balance">Opening Balance</label>
          <input
            type="number"
            id="opening-balance"
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
            placeholder="e.g., 5000"
            step="0.01"
            min="0"
          />
          <small className="help-text">المبلغ الموجود لديك قبل بدء الخطة</small>
        </div>
        <div className="form-group">
          <label htmlFor="plan-start-date">Plan Start Date </label>
          <div className="date-input-wrapper" onClick={() => document.getElementById('plan-start-date').showPicker()}>
            <span className="date-icon">📅</span>
            <input
              type="date"
              id="plan-start-date"
              className="date-input-field"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
            />
          </div>
          <small className="help-text">تاريخ بدء تتبع المصروفات والمدخرات</small>
        </div>
        <button type="submit" className="btn btn-primary full-width">
          Update Settings
        </button>
      </form>

      {salary > 0 && (
        <div className="module-highlight positive">
          Tracking salary of {formatMoney(salary)} with starting balance {formatMoney(openingBalance)}
        </div>
      )}
    </div>
  );
}

export default SalarySettings;
