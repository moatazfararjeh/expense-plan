import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './MonthlyProjection.css';

function MonthlyProjection({ salary, openingBalance = 0, planStartDate, salaryChanges = [], additionalIncomes = [], monthlyExpenses, transactions, currency = 'SAR' }) {
  const [expandedMonth, setExpandedMonth] = useState(null);
  
  // Convert string values to numbers
  const numericSalary = parseFloat(salary) || 0;
  const numericOpeningBalance = parseFloat(openingBalance) || 0;
  
  // Parse plan start date
  const startDate = planStartDate ? new Date(planStartDate) : new Date();
  const planStartYear = startDate.getFullYear();
  const planStartMonth = startDate.getMonth() + 1; // 1-12
  
  // Helper function to get salary for a specific month
  const getSalaryForMonth = (year, month) => {
    if (salaryChanges.length === 0) {
      return numericSalary; // Use base salary if no changes
    }

    // Find the most recent salary change before or on this month
    const monthDate = new Date(year, month - 1, 1);
    
    const applicableChanges = salaryChanges
      .filter(change => new Date(change.effective_date) <= monthDate)
      .sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
    
    if (applicableChanges.length > 0) {
      return parseFloat(applicableChanges[0].amount);
    }
    
    return numericSalary; // Use base salary if no applicable changes
  };

  // Helper function to check if expense is active in a given month/year
  const isExpenseActiveInMonth = (expense, monthNumber, year) => {
    const startMonth = expense.start_month || 1;
    const endMonth = expense.end_month || 12;
    const startYear = expense.start_year || new Date().getFullYear();
    const endYear = expense.end_year || new Date().getFullYear();
    
    // Create date objects for comparison
    const checkDate = new Date(year, monthNumber - 1, 1);
    const expenseStartDate = new Date(startYear, startMonth - 1, 1);
    const expenseEndDate = new Date(endYear, endMonth - 1, 1);
    
    return checkDate >= expenseStartDate && checkDate <= expenseEndDate;
  };

  // Calculate expenses for a specific month and year
  const calculateMonthExpenses = (monthNumber, year) => {
    return monthlyExpenses.reduce((sum, exp) => {
      if (isExpenseActiveInMonth(exp, monthNumber, year)) {
        return sum + parseFloat(exp.amount);
      }
      return sum;
    }, 0);
  };

  // Calculate total yearly recurring expenses based on actual date ranges
  const totalYearlyRecurringExpenses = monthlyExpenses.reduce((sum, exp) => {
    const startMonth = exp.start_month || 1;
    const endMonth = exp.end_month || 12;
    const startYear = exp.start_year || new Date().getFullYear();
    const endYear = exp.end_year || new Date().getFullYear();
    
    // Calculate months between dates
    let monthsActive;
    if (startYear === endYear) {
      monthsActive = endMonth >= startMonth ? (endMonth - startMonth + 1) : (12 - startMonth + endMonth + 1);
    } else {
      const monthsInStartYear = 12 - startMonth + 1;
      const monthsInEndYear = endMonth;
      const fullYears = endYear - startYear - 1;
      monthsActive = monthsInStartYear + (fullYears * 12) + monthsInEndYear;
    }
    
    return sum + (parseFloat(exp.amount) * monthsActive);
  }, 0);
  
  // Calculate average monthly expenses based on the 12 months of the plan
  // This calculates the actual expenses for each of the 12 months and averages them
  const calculateAvgMonthlyExpenses = () => {
    let totalExpenses = 0;
    for (let i = 0; i < 12; i++) {
      const actualDate = new Date(startDate);
      actualDate.setMonth(actualDate.getMonth() + i);
      const actualMonth = actualDate.getMonth() + 1; // 1-12
      const actualYear = actualDate.getFullYear();
      totalExpenses += calculateMonthExpenses(actualMonth, actualYear);
    }
    return totalExpenses / 12;
  };
  
  const avgMonthlyExpenses = calculateAvgMonthlyExpenses();
  
  // Calculate total daily transactions
  const totalDailyExpenses = transactions.reduce((sum, trans) => sum + parseFloat(trans.amount), 0);
  
  // Calculate daily transactions for a specific month and year
  const calculateMonthDailyExpenses = (year, month) => {
    return transactions.reduce((sum, trans) => {
      const transDate = new Date(trans.transaction_date);
      const transYear = transDate.getFullYear();
      const transMonth = transDate.getMonth() + 1; // 1-12
      
      if (transYear === year && transMonth === month) {
        return sum + parseFloat(trans.amount);
      }
      return sum;
    }, 0);
  };
  
  // Calculate additional income (convert to monthly)
  const calculateMonthlyIncome = (income) => {
    const amount = parseFloat(income.amount);
    switch(income.frequency) {
      case 'One-time':
        return 0; // One-time doesn't count as recurring monthly
      case 'Weekly':
        return amount * 4.33;
      case 'Bi-weekly':
        return amount * 2.17;
      case 'Monthly':
        return amount;
      case 'Yearly':
        return amount / 12;
      default:
        return amount;
    }
  };
  
  // Get additional income for specific month (includes one-time income)
  const getAdditionalIncomeForMonth = (monthNumber) => {
    let total = 0;
    
    additionalIncomes.forEach(income => {
      if (income.frequency === 'One-time') {
        // One-time income applies only to specified month
        if (income.income_month && parseInt(income.income_month) === monthNumber) {
          total += parseFloat(income.amount);
        }
      } else {
        // Recurring income applies to all months
        total += calculateMonthlyIncome(income);
      }
    });
    
    return total;
  };
  
  const totalAdditionalIncome = additionalIncomes.reduce((sum, income) => 
    sum + calculateMonthlyIncome(income), 0
  );
  
  // Note: We removed avgMonthlyDailyExpenses and now calculate per month
  
  // Generate data for 12 months
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Generate monthly data for 12 months starting from plan start date
  const monthlyData = months.map((month, index) => {
    // Calculate the actual month and year for this index based on plan start date
    const actualDate = new Date(startDate);
    actualDate.setMonth(actualDate.getMonth() + index);
    const actualMonth = actualDate.getMonth() + 1; // 1-12
    const actualYear = actualDate.getFullYear();
    const monthName = actualDate.toLocaleDateString('en-US', { month: 'long' });
    
    const monthSalary = getSalaryForMonth(actualYear, actualMonth);
    const monthAdditionalIncome = getAdditionalIncomeForMonth(actualMonth);
    const monthTotalIncome = monthSalary + monthAdditionalIncome;
    const monthRecurringExpenses = calculateMonthExpenses(actualMonth, actualYear);
    const monthDailyExpenses = calculateMonthDailyExpenses(actualYear, actualMonth);
    const monthTotalExpenses = monthRecurringExpenses + monthDailyExpenses;
    const monthNet = monthTotalIncome - monthTotalExpenses;
    
    // Calculate cumulative savings up to this month (including opening balance)
    let cumulativeSavings = numericOpeningBalance;
    
    for (let i = 0; i <= index; i++) {
      const iDate = new Date(startDate);
      iDate.setMonth(iDate.getMonth() + i);
      const iMonth = iDate.getMonth() + 1;
      const iYear = iDate.getFullYear();
      
      const iMonthSalary = getSalaryForMonth(iYear, iMonth);
      const iMonthAdditionalIncome = getAdditionalIncomeForMonth(iMonth);
      const iMonthIncome = iMonthSalary + iMonthAdditionalIncome;
      const iMonthExpenses = calculateMonthExpenses(iMonth, iYear);
      const iMonthDailyExpenses = calculateMonthDailyExpenses(iYear, iMonth);
      const iMonthNet = iMonthIncome - iMonthExpenses - iMonthDailyExpenses;
      cumulativeSavings += iMonthNet;
      
    }
    
    // Determine if month is past, current, or future relative to today
    const isPast = actualDate < currentDate && actualDate.getMonth() !== currentDate.getMonth();
    const isCurrent = actualDate.getMonth() === currentDate.getMonth() && actualDate.getFullYear() === currentDate.getFullYear();
    
    return {
      month: monthName.substring(0, 3), // Short month name
      fullMonth: `${monthName} ${actualYear}`,
      income: monthTotalIncome,
      salary: monthSalary,
      additionalIncome: monthAdditionalIncome,
      recurringExpenses: monthRecurringExpenses,
      estimatedDailyExpenses: monthDailyExpenses,
      totalExpenses: monthTotalExpenses,
      netSavings: monthNet,
      cumulativeSavings: cumulativeSavings,
      status: isPast ? 'past' : isCurrent ? 'current' : 'future'
    };
  });

  // Calculate year-end total savings
  const totalYearlySavings = monthlyData[11].cumulativeSavings;
  
  // Calculate total yearly income (sum of all monthly incomes)
  const totalYearlyIncome = monthlyData.reduce((sum, data) => sum + data.income, 0);
  
  // Calculate average monthly income
  const avgMonthlyIncome = totalYearlyIncome / 12;

  const formatCurrency = (value) => {
    // Round to 2 decimal places first to avoid floating point precision issues
    const rounded = Math.round(value * 100) / 100;
    return `${rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };
  
  // Get detailed expenses for a specific month
  const getMonthExpenseDetails = (monthIndex) => {
    const actualDate = new Date(startDate);
    actualDate.setMonth(actualDate.getMonth() + monthIndex);
    const actualMonth = actualDate.getMonth() + 1; // 1-12
    const actualYear = actualDate.getFullYear();
    
    // Get recurring expenses for this month/year
    const recurringForMonth = monthlyExpenses.filter(exp => 
      isExpenseActiveInMonth(exp, actualMonth, actualYear)
    );
    
    // Get daily transactions for this month
    const monthStart = new Date(actualDate.getFullYear(), actualDate.getMonth(), 1);
    const monthEnd = new Date(actualDate.getFullYear(), actualDate.getMonth() + 1, 0);
    
    const transactionsForMonth = transactions.filter(trans => {
      const transDate = new Date(trans.transaction_date);
      return transDate >= monthStart && transDate <= monthEnd;
    });
    
    return {
      recurringExpenses: recurringForMonth,
      dailyTransactions: transactionsForMonth,
      monthName: actualDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };
  };
  
  // Handle clicking on a month in the expense breakdown chart
  const handleBarClick = (data, index) => {
    if (expandedMonth === index) {
      setExpandedMonth(null); // Collapse if already expanded
    } else {
      setExpandedMonth(index); // Expand clicked month
    }
  };
  
  // Calculate plan end date (12 months from start)
  const planEndDate = new Date(startDate);
  planEndDate.setMonth(planEndDate.getMonth() + 11);
  
  const formatPlanPeriod = () => {
    const startFormatted = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const endFormatted = planEndDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    return `${startFormatted} - ${endFormatted}`;
  };

  return (
    <div className="monthly-projection-container">
      <div className="report-header">
        <div>
          <h2>📅 Monthly Financial Plan</h2>
          <p className="report-subtitle">{formatPlanPeriod()}</p>
        </div>
      </div>
      {openingBalance > 0 && (
        <div className="report-insight-banner" style={{ marginBottom: '2rem', background: 'rgba(10, 155, 115, 0.15)', borderColor: 'rgba(10, 155, 115, 0.4)' }}>
          <div className="insight-metric" style={{ textAlign: 'center', width: '100%' }}>
            <span style={{ fontSize: '1rem' }}>💰 Opening Balance</span>
            <strong style={{ fontSize: '2rem', color: 'var(--success-color)' }}>{openingBalance.toLocaleString()} {currency}</strong>
          </div>
        </div>
      )}
        
        <div className="report-summary-grid">
          <div className="report-summary-card">
            <p className="summary-label">Avg Monthly Recurring</p>
            <p className="summary-value expense">{formatCurrency(avgMonthlyExpenses)}</p>
            <span className="summary-subvalue">(Varies by month)</span>
          </div>
          <div className="report-summary-card">
            <p className="summary-label">Avg. Daily/Month</p>
            <p className="summary-value expense">{formatCurrency(totalDailyExpenses / 12)}</p>
          </div>
          <div className="report-summary-card wide highlight">
            <p className="summary-label">Projected Year-End Savings</p>
            <p className="summary-value">{formatCurrency(totalYearlySavings)}</p>
          </div>
        </div>

        {/* Monthly Breakdown Table */}
        <div className="monthly-table-container">
          <h3>Month-by-Month Breakdown</h3>

          {/* ── Mobile card layout ── */}
          <div className="proj-mobile-cards">
            {monthlyData.map((data, index) => (
              <div key={index} className={`proj-month-card ${data.status === 'current' ? 'proj-card-current' : ''}`}>
                <div className="proj-card-title">
                  {data.status === 'current' && <span className="proj-current-badge">Current</span>}
                  {data.fullMonth}
                </div>
                <div className="proj-card-row">
                  <span className="proj-card-label">Income</span>
                  <span className="proj-card-value">{formatCurrency(data.income)}</span>
                </div>
                <div className="proj-card-row">
                  <span className="proj-card-label">Total Expenses</span>
                  <span className="proj-card-value">{formatCurrency(data.totalExpenses)}</span>
                </div>
                <div className="proj-card-row">
                  <span className="proj-card-label">Net Savings</span>
                  <span className={`proj-card-value ${data.netSavings >= 0 ? 'positive-cell' : 'negative-cell'}`}>{formatCurrency(data.netSavings)}</span>
                </div>
                <div className="proj-card-row proj-card-cumulative">
                  <span className="proj-card-label">Cumulative</span>
                  <span className={`proj-card-value ${data.cumulativeSavings >= 0 ? 'positive-cell' : 'negative-cell'}`}>{formatCurrency(data.cumulativeSavings)}</span>
                </div>
              </div>
            ))}
            <div className="proj-month-card proj-card-footer">
              <div className="proj-card-title">Year Total</div>
              <div className="proj-card-row">
                <span className="proj-card-label">Total Income</span>
                <span className="proj-card-value">{formatCurrency(totalYearlyIncome)}</span>
              </div>
              <div className="proj-card-row">
                <span className="proj-card-label">Total Expenses</span>
                <span className="proj-card-value">{formatCurrency(totalYearlyRecurringExpenses + totalDailyExpenses)}</span>
              </div>
              <div className="proj-card-row">
                <span className="proj-card-label">Net</span>
                <span className="proj-card-value">{formatCurrency(totalYearlyIncome - (totalYearlyRecurringExpenses + totalDailyExpenses))}</span>
              </div>
              <div className="proj-card-row">
                <span className="proj-card-label">Final Balance</span>
                <span className="proj-card-value">{formatCurrency(totalYearlySavings)}</span>
              </div>
            </div>
          </div>

          {/* ── Desktop table layout ── */}
          <div className="proj-desktop-table">
          <div className="monthly-table">
            <table>
              <thead>
                <tr>
                  <th className="month-header">Month</th>
                  <th className="income-header">Income</th>
                  <th className="expense-header">Total Expenses</th>
                  <th className="net-header">Net Savings</th>
                  <th className="cumulative-header">Cumulative Savings</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((data, index) => (
                  <tr key={index} className={`month-row ${data.status}`}>
                    <td className="month-name month-cell" data-label="Month">
                      {data.status === 'current' && '➤ '}
                      {data.fullMonth}
                      {data.status === 'current' && ' (Current)'}
                    </td>
                    <td className="amount-cell income-cell" data-label="Income" title={`Salary: ${formatCurrency(data.salary)} + Additional: ${formatCurrency(data.additionalIncome)}`}>
                      {formatCurrency(data.income)}
                    </td>
                    <td className="amount-cell expense-cell" data-label="Total Expenses" title={`Recurring: ${formatCurrency(data.recurringExpenses)} + Daily: ${formatCurrency(data.estimatedDailyExpenses)}`}>
                      {formatCurrency(data.totalExpenses)}
                    </td>
                    <td className={`amount-cell net-savings-cell ${data.netSavings >= 0 ? 'positive-cell' : 'negative-cell'}`} data-label="Net Savings" title={`${formatCurrency(data.income)} - ${formatCurrency(data.totalExpenses)}`}>
                      {formatCurrency(data.netSavings)}
                    </td>
                    <td className={`amount-cell cumulative-cell ${data.cumulativeSavings >= 0 ? 'positive-cell' : 'negative-cell'}`} data-label="Cumulative">
                      {formatCurrency(data.cumulativeSavings)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td data-label=""><strong>Year Total</strong></td>
                  <td className="amount-cell" data-label="Total Income">
                    <strong>{formatCurrency(totalYearlyIncome)}</strong>
                  </td>
                  <td className="amount-cell" data-label="Total Expenses">
                    <strong>{formatCurrency(totalYearlyRecurringExpenses + totalDailyExpenses)}</strong>
                  </td>
                  <td className="amount-cell" data-label="Net">
                    <strong>{formatCurrency(totalYearlyIncome - (totalYearlyRecurringExpenses + totalDailyExpenses))}</strong>
                  </td>
                  <td className="amount-cell" data-label="Final">
                    <strong>{formatCurrency(totalYearlySavings)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          </div>
        </div>

        {/* Cumulative Savings Chart */}
        <div className="chart-section">
          <h3>Cumulative Savings Projection</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cumulativeSavings" 
                stroke="#0f4c81" 
                strokeWidth={3}
                name="Cumulative Savings"
                dot={{ fill: '#0f4c81', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Income vs Expenses Chart */}
        <div className="chart-section">
          <h3>Monthly Income vs Total Expenses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="income" fill="#2ecc71" name="Income" />
              <Bar dataKey="totalExpenses" fill="#e74c3c" name="Total Expenses" />
              <Bar dataKey="netSavings" fill="#0f4c81" name="Net Savings" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown by Month */}
        <div className="chart-section">
          <h3>Monthly Expense Breakdown</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: '15px' }}>
            👆 Click on any month to see detailed expense breakdown
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData} onClick={(e) => {
              if (e && e.activeTooltipIndex !== undefined) {
                handleBarClick(e.activePayload[0].payload, e.activeTooltipIndex);
              }
            }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar 
                dataKey="recurringExpenses" 
                stackId="a" 
                fill="#12a7d4" 
                name="Recurring Expenses"
                cursor="pointer"
              />
              <Bar 
                dataKey="estimatedDailyExpenses" 
                stackId="a" 
                fill="#f093fb" 
                name="Daily Expenses (Est.)"
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
          
          {/* Expanded month details */}
          {expandedMonth !== null && (
            <div className="expense-details-panel">
              <div className="expense-details-header">
                <h4>📋 Expense Details: {getMonthExpenseDetails(expandedMonth).monthName}</h4>
                <button 
                  onClick={() => setExpandedMonth(null)}
                  className="close-details-btn"
                >
                  ✕ Close
                </button>
              </div>
              
              <div className="expense-details-grid">
                {/* Recurring Expenses */}
                <div className="expense-details-section">
                  <h5>🗓️ Recurring Expenses</h5>
                  {getMonthExpenseDetails(expandedMonth).recurringExpenses.length > 0 ? (
                    <>
                      <div className="expense-items">
                        {getMonthExpenseDetails(expandedMonth).recurringExpenses.map((exp, idx) => (
                          <div key={idx} className="expense-detail-item">
                            <div className="expense-item-info">
                              <span className="expense-item-name">{exp.name}</span>
                              <span className="expense-item-category">{exp.category}</span>
                            </div>
                            <span className="expense-item-amount">{formatCurrency(parseFloat(exp.amount))}</span>
                          </div>
                        ))}
                      </div>
                      <div className="expense-section-total">
                        <strong>Total Recurring:</strong>
                        <strong>{formatCurrency(
                          getMonthExpenseDetails(expandedMonth).recurringExpenses.reduce(
                            (sum, exp) => sum + parseFloat(exp.amount), 0
                          )
                        )}</strong>
                      </div>
                    </>
                  ) : (
                    <div className="no-expenses">No recurring expenses for this month</div>
                  )}
                </div>
                
                {/* Daily Transactions */}
                <div className="expense-details-section">
                  <h5>💳 Daily Transactions</h5>
                  {getMonthExpenseDetails(expandedMonth).dailyTransactions.length > 0 ? (
                    <>
                      <div className="expense-items">
                        {getMonthExpenseDetails(expandedMonth).dailyTransactions.map((trans, idx) => (
                          <div key={idx} className="expense-detail-item">
                            <div className="expense-item-info">
                              <span className="expense-item-name">{trans.description}</span>
                              <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', marginTop: '3px' }}>
                                <span className="expense-item-category">{trans.category}</span>
                                <span className="expense-item-date">
                                  {new Date(trans.transaction_date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </span>
                              </div>
                            </div>
                            <span className="expense-item-amount">{formatCurrency(parseFloat(trans.amount))}</span>
                          </div>
                        ))}
                      </div>
                      <div className="expense-section-total">
                        <strong>Total Daily:</strong>
                        <strong>{formatCurrency(
                          getMonthExpenseDetails(expandedMonth).dailyTransactions.reduce(
                            (sum, trans) => sum + parseFloat(trans.amount), 0
                          )
                        )}</strong>
                      </div>
                    </>
                  ) : (
                    <div className="no-expenses">No daily transactions for this month</div>
                  )}
                </div>
              </div>
              
              <div className="expense-details-grand-total">
                <span>Grand Total for Month:</span>
                <span>{formatCurrency(
                  getMonthExpenseDetails(expandedMonth).recurringExpenses.reduce(
                    (sum, exp) => sum + parseFloat(exp.amount), 0
                  ) + 
                  getMonthExpenseDetails(expandedMonth).dailyTransactions.reduce(
                    (sum, trans) => sum + parseFloat(trans.amount), 0
                  )
                )}</span>
              </div>
            </div>
          )}
        </div>

        {totalYearlySavings < 0 && (
          <div className="warning-message">
            ⚠️ <strong>Warning:</strong> Your expenses exceed your income! 
            You may need to reduce expenses or increase income.
          </div>
        )}

        {totalYearlySavings > 0 && (
          <div className="success-message">
            <span>✅ <strong>Great Planning!</strong> Based on your current plan, you'll save {formatCurrency(totalYearlySavings)} by the end of the year!</span>
            <small>Note: Savings vary by month based on when recurring expenses are active.</small>
          </div>
        )}
    </div>
  );
}

export default MonthlyProjection;
