import React from 'react';

function Summary({ summary, currency = 'SAR' }) {
  const {
    monthly_salary = 0,
    additional_monthly_income = 0,
    total_monthly_income = 0,
    monthly_recurring_expenses = 0,
    monthly_net = 0,
    yearly_salary = 0,
    yearly_additional_income = 0,
    total_yearly_income = 0,
    yearly_recurring_expenses = 0,
    yearly_daily_expenses = 0,
    total_yearly_expenses = 0,
    yearly_savings = 0
  } = summary;

  const formatMoney = (value) => `${value.toLocaleString()} ${currency}`;
  const savingsRate = total_yearly_income > 0 ? (yearly_savings / total_yearly_income) * 100 : 0;

  const summaryCards = [
    {
      label: 'Total Monthly Income',
      value: formatMoney(total_monthly_income),
      subvalue: 'Salary + additional inflows',
      accent: true
    },
    {
      label: 'Recurring Expenses',
      value: formatMoney(monthly_recurring_expenses),
      subvalue: 'Fixed monthly obligations'
    },
    {
      label: 'Monthly Net',
      value: formatMoney(monthly_net),
      subvalue: monthly_net >= 0 ? 'Surplus after recurring' : 'Deficit vs. inflow'
    },
    {
      label: 'Projected Savings',
      value: formatMoney(yearly_savings),
      subvalue: `${savingsRate.toFixed(1)}% of yearly income`
    }
  ];

  const monthlyMetrics = [
    { label: 'Monthly Salary', value: formatMoney(monthly_salary) },
    { label: 'Additional Income', value: `+${formatMoney(additional_monthly_income)}`, positive: additional_monthly_income > 0 },
    { label: 'Total Monthly Income', value: formatMoney(total_monthly_income) },
    { label: 'Recurring Expenses', value: formatMoney(monthly_recurring_expenses) },
    { label: 'Monthly Net', value: formatMoney(monthly_net), positive: monthly_net >= 0, negative: monthly_net < 0 }
  ];

  const yearlyMetrics = [
    { label: 'Yearly Salary', value: formatMoney(yearly_salary) },
    { label: 'Yearly Additional', value: `+${formatMoney(yearly_additional_income)}`, positive: yearly_additional_income > 0 },
    { label: 'Total Yearly Income', value: formatMoney(total_yearly_income) },
    { label: 'Recurring Expenses', value: formatMoney(yearly_recurring_expenses) },
    { label: 'Daily Transactions', value: formatMoney(yearly_daily_expenses) },
    { label: 'Total Yearly Expenses', value: formatMoney(total_yearly_expenses) }
  ];

  const deficit = yearly_savings < 0;

  return (
    <div className="card finance-module summary-module">
      <div className="section-header">
        <div>
          <h2>📊 Financial Summary</h2>
          <p className="section-subtitle">One-year projection across earnings, obligations, and liquidity.</p>
        </div>
        <div className="header-pill">
          <span>Projected Savings</span>
          <strong>{formatMoney(yearly_savings)}</strong>
        </div>
      </div>


      <div className="summary-grid">
        {summaryCards.map((card) => (
          <div key={card.label} className={`summary-card${card.accent ? ' accent' : ''}`}>
            <p className="summary-label">{card.label}</p>
            <p className={`summary-value${card.accent ? ' accent' : ''}`}>{card.value}</p>
            <span className="summary-subvalue">{card.subvalue}</span>
          </div>
        ))}
      </div>

      <div className="module-banner">
        <div>
          <p className="insight-title">Outlook</p>
          <p className="insight-copy">
            Monthly inflow totals <span className="insight-highlight">{formatMoney(total_monthly_income)}</span> with a net of
            {' '}
            <span className="insight-highlight">{formatMoney(monthly_net)}</span>. Year-end outlook points to
            {' '}
            {deficit ? 'overspending of' : 'savings of'} <span className="insight-highlight">{formatMoney(Math.abs(yearly_savings))}</span>.
          </p>
        </div>
        <div className="insight-metric">
          <span>Savings Rate</span>
          <strong>{savingsRate.toFixed(1)}%</strong>
          <small>of yearly income</small>
        </div>
      </div>

      <div className="summary-breakdown">
        <div className="summary-breakdown-group">
          <p className="group-title">Monthly View</p>
          {monthlyMetrics.map((metric) => (
            <div key={metric.label} className="metric-row">
              <span className="metric-label">{metric.label}</span>
              <span className={`metric-value${metric.positive ? ' positive' : ''}${metric.negative ? ' negative' : ''}${metric.muted ? ' muted' : ''}`}>
                {metric.value}
              </span>
            </div>
          ))}
        </div>
        <div className="summary-breakdown-group">
          <p className="group-title">Yearly Outlook</p>
          {yearlyMetrics.map((metric) => (
            <div key={metric.label} className="metric-row">
              <span className="metric-label">{metric.label}</span>
              <span className={`metric-value${metric.positive ? ' positive' : ''}${metric.muted ? ' muted' : ''}`}>
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={`module-alert ${deficit ? 'warning' : 'success'}`}>
        <span>
          {deficit
            ? '⚠️ Expenses are exceeding income. Tighten recurring costs or boost income streams.'
            : `✅ On track to save ${formatMoney(yearly_savings)} this year.`}
        </span>
        {deficit && (
          <button type="button" className="btn btn-secondary">
            Review Expenses
          </button>
        )}
      </div>
    </div>
  );
}

export default Summary;
