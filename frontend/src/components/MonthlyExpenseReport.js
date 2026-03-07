import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import './MonthlyExpenseReport.css';

function MonthlyExpenseReport({ 
  monthlyExpenses, 
  transactions, 
  salary,
  salaryChanges,
  additionalIncomes = [],
  currency = 'SAR',
  salaryVisible = true,
  toggleSalaryVisibility,
  openingBalance = 0,
  planStartDate
}) {
  // Helper function to check if expense applies to a specific month/year
  const isExpenseActiveInMonth = (expense, month, year) => {
    const startMonth = expense.start_month || 1;
    const endMonth = expense.end_month || 12;
    const startYear = expense.start_year || new Date().getFullYear();
    const endYear = expense.end_year || new Date().getFullYear();
    
    // Create date objects for comparison (using day 1 of each month)
    const checkDate = new Date(year, month - 1, 1);
    const expenseStartDate = new Date(startYear, startMonth - 1, 1);
    const expenseEndDate = new Date(endYear, endMonth - 1, 1);
    
    return checkDate >= expenseStartDate && checkDate <= expenseEndDate;
  };

  // Group expenses by month/year
  const groupExpensesByMonth = () => {
    const grouped = {};
    
    // Parse plan start date
    const startDate = planStartDate ? new Date(planStartDate) : new Date();
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1; // 1-12
    
    // Generate 12 months starting from plan start date
    for (let i = 0; i < 12; i++) {
      let currentMonth = startMonth + i;
      let currentYear = startYear;
      
      // Handle year wrap-around
      if (currentMonth > 12) {
        currentMonth = currentMonth - 12;
        currentYear = currentYear + 1;
      }
      
      const key = `${currentMonth}/${currentYear}`;
      grouped[key] = {
        date: key,
        expenses: [],
        dailyTransactions: []
      };
    }
    
    // Add recurring expenses for each month
    monthlyExpenses.forEach(expense => {
      // Check each of the 12 months
      for (let i = 0; i < 12; i++) {
        let currentMonth = startMonth + i;
        let currentYear = startYear;
        
        if (currentMonth > 12) {
          currentMonth = currentMonth - 12;
          currentYear = currentYear + 1;
        }
        
        const key = `${currentMonth}/${currentYear}`;
        
        // Check if this expense applies to this month/year
        if (isExpenseActiveInMonth(expense, currentMonth, currentYear)) {
          grouped[key].expenses.push({
            cashFor: expense.category || expense.description,
            amount: parseFloat(expense.amount) || 0,
            type: 'recurring'
          });
        }
      }
    });

    // Add daily transactions with full details
    transactions.forEach(trans => {
      if (trans.transaction_date) {
        const date = new Date(trans.transaction_date);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const key = `${month}/${year}`;
        
        if (grouped[key]) {
          grouped[key].dailyTransactions.push({
            date: trans.transaction_date,
            cashFor: trans.category || trans.description || 'Daily Transaction',
            amount: parseFloat(trans.amount) || 0,
            type: 'daily'
          });
        }
      }
    });

    // Convert to array and sort by date (already in order)
    return Object.values(grouped).sort((a, b) => {
      const [monthA, yearA] = a.date.split('/').map(Number);
      const [monthB, yearB] = b.date.split('/').map(Number);
      return yearA !== yearB ? yearA - yearB : monthA - monthB;
    });
  };

  const getSalaryForMonth = (dateStr) => {
    const numericSalary = parseFloat(salary) || 0;

    if (!salaryChanges || salaryChanges.length === 0) {
      return numericSalary;
    }

    // dateStr format is "month/year", e.g. "3/2026"
    const [monthStr, yearStr] = dateStr.split('/');
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    const monthDate = new Date(year, month - 1, 1);

    // Find the most recent salary change on or before this month
    const applicableChanges = salaryChanges
      .filter(change => new Date(change.effective_date) <= monthDate)
      .sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));

    if (applicableChanges.length > 0) {
      return parseFloat(applicableChanges[0].amount) || numericSalary;
    }

    return numericSalary;
  };

  // Calculate additional income converted to monthly amount
  const calculateMonthlyIncome = (income) => {
    const amount = parseFloat(income.amount) || 0;
    switch (income.frequency) {
      case 'One-time':
        return 0; // handled separately per month
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

  // Get additional income for a specific month number
  const getAdditionalIncomeForMonth = (monthNumber) => {
    let total = 0;
    additionalIncomes.forEach(income => {
      if (income.frequency === 'One-time') {
        if (income.income_month && parseInt(income.income_month) === monthNumber) {
          total += parseFloat(income.amount) || 0;
        }
      } else {
        total += calculateMonthlyIncome(income);
      }
    });
    return total;
  };

  const formatSalary = (amount) => {
    return salaryVisible ? amount.toLocaleString() : '••••••';
  };

  // Calculate percentage of salary
  const calculatePercentage = (amount, salary) => {
    if (!salary || salary === 0) return 0;
    return ((amount / salary) * 100).toFixed(1);
  };

  // Get percentage color coding
  const getPercentageColor = (percentage) => {
    const pct = parseFloat(percentage);
    if (pct < 30) return '#0a9b73'; // low utilization
    if (pct < 60) return '#1f75d6'; // moderate utilization
    if (pct < 80) return '#d8970a'; // elevated utilization
    return '#d64545'; // critical utilization
  };

  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleResize = (event) => setIsMobileView(event.matches);
    setIsMobileView(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleResize);
    } else {
      mediaQuery.addListener(handleResize);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleResize);
      } else {
        mediaQuery.removeListener(handleResize);
      }
    };
  }, []);

  const monthlyData = groupExpensesByMonth();

  const reportStats = useMemo(() => {
    return monthlyData.reduce(
      (acc, month) => {
        const recurring = month.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const daily = month.dailyTransactions.reduce((sum, trans) => sum + trans.amount, 0);
        const salaryForMonth = getSalaryForMonth(month.date);
        const [mStr] = month.date.split('/');
        const monthAdditional = getAdditionalIncomeForMonth(parseInt(mStr, 10));
        const totalIncome = salaryForMonth + monthAdditional;
        const utilization = totalIncome ? ((recurring + daily) / totalIncome) * 100 : 0;

        acc.totalRecurring += recurring;
        acc.totalDaily += daily;
        acc.totalSalary += salaryForMonth;
        acc.totalAdditionalIncome += monthAdditional;
        acc.monthsCovered += 1;
        acc.highestUtilization = Math.max(acc.highestUtilization, utilization);
        return acc;
      },
      {
        totalRecurring: 0,
        totalDaily: 0,
        totalSalary: 0,
        totalAdditionalIncome: 0,
        monthsCovered: 0,
        highestUtilization: 0
      }
    );
  }, [monthlyData]);

  const aggregatedTotal = reportStats.totalRecurring + reportStats.totalDaily;
  const totalIncome = reportStats.totalSalary + reportStats.totalAdditionalIncome;
  const averageUtilization = totalIncome
    ? ((aggregatedTotal / totalIncome) * 100)
    : 0;
  const savingsPower = totalIncome - aggregatedTotal;

  // Calculate cumulative balance (carry forward from previous months)
  // Initialize with opening balance
  let cumulativeBalance = parseFloat(openingBalance) || 0;

  const handleExportExcel = () => {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Summary sheet data
    const summaryData = [
      ['Detailed Monthly Expense Report'],
      ['Generated on:', new Date().toLocaleString()],
      [],
      ['Summary Statistics'],
      ['Total Salary Covered', reportStats.totalSalary.toLocaleString(), currency],
      ['Months Covered', reportStats.monthsCovered],
      ['Total Additional Income', reportStats.totalAdditionalIncome.toLocaleString(), currency],
      ['Total Recurring Expenses', reportStats.totalRecurring.toLocaleString(), currency],
      ['Total Daily Spending', reportStats.totalDaily.toLocaleString(), currency],
      ['Total Spending', aggregatedTotal.toLocaleString(), currency],
      ['Average Utilization', `${averageUtilization.toFixed(1)}%`],
      ['Highest Utilization', `${reportStats.highestUtilization.toFixed(1)}%`],
      ['Savings Power', savingsPower.toLocaleString(), currency],
      [],
    ];
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    
    // Reset cumulative balance for export
    let exportCumulativeBalance = parseFloat(openingBalance) || 0;
    
    // Create detailed monthly sheets
    monthlyData.forEach((monthData, index) => {
      const currentSalary = getSalaryForMonth(monthData.date);
      const [expMonthStr] = monthData.date.split('/');
      const expMonthAdditional = getAdditionalIncomeForMonth(parseInt(expMonthStr, 10));
      const expMonthTotalIncome = currentSalary + expMonthAdditional;
      const recurringTotal = monthData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const dailyTotal = monthData.dailyTransactions.reduce((sum, trans) => sum + trans.amount, 0);
      const grandTotal = recurringTotal + dailyTotal;
      
      const broughtForward = exportCumulativeBalance;
      const monthlyNet = expMonthTotalIncome - grandTotal;
      const remaining = monthlyNet + broughtForward;
      exportCumulativeBalance = remaining;
      
      const allItems = [
        ...monthData.expenses,
        ...monthData.dailyTransactions
      ];
      
      // Build sheet data
      const sheetData = [
        ['Month:', monthData.date],
        [],
        ['Date', 'Cash For', `Amount (${currency})`, '% From Salary', `Total (${currency})`, 'Financial Summary'],
      ];
      
      // Add brought forward if applicable
      if (broughtForward !== 0) {
        sheetData.push([
          monthData.date,
          'Brought Forward (from previous month)',
          '',
          '',
          '',
          `${broughtForward >= 0 ? '+' : ''}${broughtForward.toFixed(2)} ${currency}`
        ]);
      }
      
      // Add items
      allItems.forEach((item, idx) => {
        const percentage = currentSalary > 0 ? calculatePercentage(item.amount, currentSalary) : '0';
        const row = [
          idx === 0 ? monthData.date : '',
          `${item.type === 'daily' ? '[Daily] ' : ''}${item.cashFor}`,
          item.amount.toFixed(2),
          salaryVisible && currentSalary > 0 ? `${percentage}%` : '-',
          idx === 0 ? grandTotal.toFixed(2) : '',
          ''
        ];
        
        // Add financial summary in the right column
        if (idx === 0) {
          row[5] = `Salary: ${salaryVisible ? currentSalary.toFixed(2) : '******'} ${currency}`;
        } else if (idx === 1 && expMonthAdditional > 0) {
          row[5] = `Additional Income: +${expMonthAdditional.toFixed(2)} ${currency}`;
        } else if (idx === (expMonthAdditional > 0 ? 2 : 1)) {
          row[5] = `Monthly Net: ${monthlyNet.toFixed(2)} ${currency}`;
        } else if (idx === (expMonthAdditional > 0 ? 3 : 2) && broughtForward !== 0) {
          row[5] = `Brought Forward: ${broughtForward >= 0 ? '+' : ''}${broughtForward.toFixed(2)} ${currency}`;
        } else if (idx === (broughtForward !== 0 ? (expMonthAdditional > 0 ? 4 : 3) : (expMonthAdditional > 0 ? 3 : 2))) {
          row[5] = `Final Balance: ${remaining.toFixed(2)} ${currency}`;
        }
        
        sheetData.push(row);
      });
      
      // If no items, add placeholder
      if (allItems.length === 0) {
        sheetData.push([
          monthData.date,
          'No expenses',
          '0.00',
          '-',
          '0.00',
          `Salary: ${salaryVisible ? currentSalary.toFixed(2) : '******'} ${currency}`
        ]);
      }
      
      // Add total percentage row
      const totalPercentage = currentSalary > 0 ? calculatePercentage(grandTotal, currentSalary) : '0';
      sheetData.push(
        [],
        [
          'Total % of Salary:',
          '',
          '',
          salaryVisible && currentSalary > 0 ? `${totalPercentage}%` : '-',
          '',
          salaryVisible && currentSalary > 0 ? `${grandTotal.toLocaleString()} / ${currentSalary.toLocaleString()} ${currency}` : ''
        ],
        []
      );
      
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 12 },  // Date
        { wch: 35 },  // Cash For
        { wch: 15 },  // Amount
        { wch: 15 },  // % From Salary
        { wch: 15 },  // Total
        { wch: 30 }   // Financial Summary
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, `Month ${index + 1} - ${monthData.date.replace('/', '-')}`);
    });
    
    // Generate Excel file
    const fileName = `Expense_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="monthly-expense-report">
      <div className="report-header">
        <div>
          <h2>📋 Detailed Monthly Expense Report</h2>
          <p className="report-subtitle">Excel-Style View with Daily Transaction Details & Balance Carry Forward</p>
        </div>
        <div className="report-actions">
          <button
            type="button"
            className="export-pdf-btn"
            onClick={handleExportExcel}
            title="Export report to Excel"
          >
            <span className="export-icon">📊</span>
            <span>Export Excel</span>
          </button>
          {toggleSalaryVisibility && (
            <button 
              onClick={toggleSalaryVisibility}
              className="salary-toggle-btn"
              title={salaryVisible ? 'Hide Salary' : 'Show Salary'}
              style={{
                background: 'var(--primary-gradient)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '999px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(5, 19, 39, 0.35)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <span style={{ fontSize: '1.2rem' }}>{salaryVisible ? '🙈' : '👁️'}</span>
              <span>{salaryVisible ? 'Hide Salary' : 'Show Salary'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="report-summary-grid">
        <div className="report-summary-card">
          <p className="summary-label">Total Salary Covered</p>
          <p className="summary-value">
            {reportStats.totalSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
          </p>
          <span className="summary-subvalue">Across {reportStats.monthsCovered} months</span>
        </div>
        <div className="report-summary-card">
          <p className="summary-label">Recurring Expenses</p>
          <p className="summary-value accent">
            {reportStats.totalRecurring.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
          </p>
          <span className="summary-subvalue">Fixed commitments</span>
        </div>
        <div className="report-summary-card">
          <p className="summary-label">Daily Spending</p>
          <p className="summary-value">
            {reportStats.totalDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
          </p>
          <span className="summary-subvalue">Variable lifestyle costs</span>
        </div>
        <div className="report-summary-card">
          <p className="summary-label">Average Utilization</p>
          <p className="summary-value accent">
            {averageUtilization.toFixed(1)}%
          </p>
          <span className="summary-subvalue">Peak {reportStats.highestUtilization.toFixed(1)}%</span>
        </div>
        <div className="report-summary-card wide">
          <p className="summary-label">Savings Power</p>
          <p className={`summary-value ${savingsPower >= 0 ? 'positive' : 'negative'}`}>
            {savingsPower >= 0 ? '+' : ''}{savingsPower.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
          </p>
          <span className="summary-subvalue">Total income minus all spending</span>
        </div>
      </div>

      <div className="report-insight-banner">
        <div>
          <p className="insight-title">Strategic Insight</p>
          <p className="insight-copy">
            Your plan covers {reportStats.monthsCovered} months with an average utilization of
            <span className="insight-highlight"> {averageUtilization.toFixed(1)}%</span>.
            Peak spending reached <span className="insight-highlight">{reportStats.highestUtilization.toFixed(1)}%</span> of total income.
          </p>
        </div>
        <div className="insight-metric">
          <span>Net Cushion</span>
          <strong className={savingsPower >= 0 ? 'positive' : 'negative'}>
            {savingsPower >= 0 ? '+' : ''}{savingsPower.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
          </strong>
        </div>
      </div>

      {isMobileView ? (
        <div className="mobile-report-placeholder">
          <h3>📱 Full Ledger via Excel</h3>
          <p>
            Detailed tables are optimized for wider screens. Tap <strong>Export Excel</strong> to download the complete
            Excel file (.xlsx) and review it in Excel, Google Sheets, or any spreadsheet application.
          </p>
          <ul>
            <li>Includes all months, transactions, and carry-forward math.</li>
            <li>Best experienced in landscape orientation.</li>
            <li>Ideal for sharing with advisors or archiving.</li>
          </ul>
        </div>
      ) : (
        monthlyData.map((monthData, index) => {
        const currentSalary = getSalaryForMonth(monthData.date);
        const [mStrDisplay] = monthData.date.split('/');
        const monthAdditionalIncome = getAdditionalIncomeForMonth(parseInt(mStrDisplay, 10));
        const monthTotalIncome = currentSalary + monthAdditionalIncome;
        const recurringTotal = monthData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const dailyTotal = monthData.dailyTransactions.reduce((sum, trans) => sum + trans.amount, 0);
        const grandTotal = recurringTotal + dailyTotal;
        
        // Brought forward from previous month
        const broughtForward = cumulativeBalance;
        
        // Calculate remaining for this month
        const monthlyNet = monthTotalIncome - grandTotal;
        const remaining = monthlyNet + broughtForward;
        
        // Update cumulative balance for next month
        cumulativeBalance = remaining;
        
        // Combine all items for display
        const allItems = [
          ...monthData.expenses,
          ...monthData.dailyTransactions
        ];
        
        const totalRows = allItems.length;

        // Determine month financial health status
        const utilization = monthTotalIncome > 0 ? (grandTotal / monthTotalIncome) * 100 : 0;
        const healthStatus = remaining < 0 ? 'critical' : utilization >= 80 ? 'warning' : utilization >= 60 ? 'elevated' : 'healthy';

        return (
          <div key={index} className={`month-report-section month-status-${healthStatus}${index % 2 === 1 ? ' month-alt' : ''}`}>
            <div className="month-section-header">
              <span className="month-section-badge">{monthData.date}</span>
              <span className={`month-status-pill status-${healthStatus}`}>
                {healthStatus === 'healthy' ? '● Healthy' : healthStatus === 'elevated' ? '● Moderate' : healthStatus === 'warning' ? '▲ High' : '⬤ Over Budget'}
              </span>
              <span className="month-utilization-tag">{utilization.toFixed(0)}% used</span>
            </div>
            <div className="table-responsive">
            <table className="excel-table">
              <thead>
                <tr className="header-row">
                  <th className="col-date">Date</th>
                  <th className="col-cashfor">Cash For</th>
                  <th className="col-amount">Amount ({currency})</th>
                  <th className="col-percentage">% From Salary</th>
                  <th className="col-total">Total</th>
                  <th className="col-currency">Currency</th>
                  <th className="col-totals">Totals</th>
                </tr>
              </thead>
              <tbody>
                {/* Brought Forward row (if applicable) */}
                {broughtForward !== 0 && (
                  <tr className="brought-forward-row">
                    <td className="date-cell">{monthData.date}</td>
                    <td className="brought-forward-label" colSpan="2">
                      💼 Brought Forward (from previous month)
                    </td>
                    <td className="percentage-cell">-</td>
                    <td className="brought-forward-amount" colSpan="3">
                      <span className={broughtForward >= 0 ? 'positive' : 'negative'}>
                        {broughtForward >= 0 ? '+' : ''}{broughtForward.toLocaleString(undefined, { minimumFractionDigits: 1 })} {currency}
                      </span>
                    </td>
                  </tr>
                )}
                
                {/* First row with date */}
                {allItems.length > 0 ? (
                  <>
                    <tr>
                      <td className="date-cell" rowSpan={totalRows + (broughtForward !== 0 ? 0 : 1)}>
                        {broughtForward !== 0 ? '' : monthData.date}
                      </td>
                      <td className={`expense-name ${allItems[0].type === 'daily' ? 'daily-item' : ''}`}>
                        {allItems[0].type === 'daily' && (
                          <span className="daily-badge">Daily</span>
                        )}
                        {allItems[0].cashFor}
                      </td>
                      <td className="expense-amount">{allItems[0].amount.toLocaleString()}</td>
                      <td className="percentage-cell">
                        {salaryVisible && monthTotalIncome > 0 && (
                          <span style={{ color: getPercentageColor(calculatePercentage(allItems[0].amount, monthTotalIncome)), fontWeight: 'bold' }}>
                            {calculatePercentage(allItems[0].amount, monthTotalIncome)}%
                          </span>
                        )}
                      </td>
                      <td className="total-cell" rowSpan={totalRows}>
                        {grandTotal.toLocaleString()}
                      </td>
                      <td className="currency-label">Salary</td>
                      <td className="salary-value">{formatSalary(currentSalary)}</td>
                    </tr>

                    {/* Remaining item rows */}
                    {allItems.slice(1).map((item, idx) => (
                      <tr key={idx}>
                        <td className={`expense-name ${item.type === 'daily' ? 'daily-item' : ''}`}>
                          {item.type === 'daily' && (
                            <span className="daily-badge">Daily</span>
                          )}
                          {item.cashFor}
                        </td>
                        <td className="expense-amount">{item.amount.toLocaleString()}</td>
                        <td className="percentage-cell">
                          {salaryVisible && monthTotalIncome > 0 && (
                            <span style={{ color: getPercentageColor(calculatePercentage(item.amount, monthTotalIncome)), fontWeight: 'bold' }}>
                              {calculatePercentage(item.amount, monthTotalIncome)}%
                            </span>
                          )}
                        </td>
                        {idx === 0 && monthAdditionalIncome > 0 && (
                          <>
                            <td className="currency-label">Additional Income</td>
                            <td className="salary-value" style={{ color: '#10b981' }}>
                              +{monthAdditionalIncome.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                            </td>
                          </>
                        )}
                        {idx === (monthAdditionalIncome > 0 ? 1 : 0) && (
                          <>
                            <td className="currency-label">Monthly Net</td>
                            <td className={`date-cell ${monthlyNet >= 0 ? 'positive' : 'negative'}`}>
                              {monthlyNet.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                            </td>
                          </>
                        )}
                        {idx === (monthAdditionalIncome > 0 ? 2 : 1) && broughtForward !== 0 && (
                          <>
                            <td className="currency-label">Brought Forward</td>
                            <td className={`date-cell ${broughtForward >= 0 ? 'positive' : 'negative'}`}>
                              {broughtForward >= 0 ? '+' : ''}{broughtForward.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                            </td>
                          </>
                        )}
                        {idx === (broughtForward !== 0 ? (monthAdditionalIncome > 0 ? 3 : 2) : (monthAdditionalIncome > 0 ? 2 : 1)) && (
                          <>
                            <td className="currency-label final-balance-label">Final Balance</td>
                            <td className={`remaining-value final-balance ${remaining >= 0 ? 'positive' : 'negative'}`}>
                              {remaining.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                            </td>
                          </>
                        )}
                        {(idx > (broughtForward !== 0 ? (monthAdditionalIncome > 0 ? 3 : 2) : (monthAdditionalIncome > 0 ? 2 : 1))) && (
                          <>
                            <td></td>
                            <td></td>
                          </>
                        )}
                      </tr>
                    ))}
                  </>
                ) : (
                  <tr>
                    <td className="date-cell">{monthData.date}</td>
                    <td className="expense-name">No expenses</td>
                    <td className="expense-amount">0</td>
                    <td className="percentage-cell">-</td>
                    <td className="total-cell">0</td>
                    <td className="currency-label">Salary</td>
                    <td className="salary-value">{formatSalary(currentSalary)}</td>
                  </tr>
                )}

                {/* Total Percentage Row */}
                <tr className="total-percentage-row">
                  <td colSpan="3" className="total-percentage-label">
                    📊 Total % of Income
                  </td>
                  <td className="total-percentage-value">
                    {salaryVisible && monthTotalIncome > 0 ? (
                      <span style={{ 
                        color: getPercentageColor(calculatePercentage(grandTotal, monthTotalIncome)), 
                        fontWeight: 'bold',
                        fontSize: '1.1rem'
                      }}>
                        {calculatePercentage(grandTotal, monthTotalIncome)}%
                      </span>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td colSpan="3" className="total-percentage-info">
                    {salaryVisible && monthTotalIncome > 0 && (
                      <span className="percentage-breakdown">
                        {grandTotal.toLocaleString()} / {monthTotalIncome.toLocaleString()} {currency}
                      </span>
                    )}
                  </td>
                </tr>

                {/* Grand total separator row */}
                <tr className="separator-row">
                  <td colSpan="7"></td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        );
        })
      )}
    </div>
  );
}

export default MonthlyExpenseReport;
