import React, { useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import './MonthlyExpenseReport.css';

function MonthlyExpenseReport({ 
  monthlyExpenses, 
  transactions, 
  salary,
  salaryChanges,
  additionalIncomes = [],
  currency = 'SAR',

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
            cashFor: trans.category || 'Daily Transaction',
            description: trans.description || '',
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

  const formatSalary = (amount) => amount.toLocaleString();

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

  const monthlyData = groupExpensesByMonth();

  // Collapse state: set of month keys that are collapsed (month-level)
  const [collapsedMonths, setCollapsedMonths] = useState(new Set());
  const toggleMonth = (key) => setCollapsedMonths(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const collapseAll  = () => setCollapsedMonths(new Set(monthlyData.map(m => m.date)));
  const expandAll    = () => setCollapsedMonths(new Set());

  // Collapse state for type sections within a month: key = "month|type"
  const [collapsedSections, setCollapsedSections] = useState(new Set());
  const toggleSection = (key, e) => {
    e.stopPropagation();
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

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

  const handleExportExcel = async () => {
    // ── Colour palette ──────────────────────────────────────────────
    const C = {
      headerBg:      'FF0F4C81',  // dark navy   – column headers
      headerFg:      'FFFFFFFF',
      monthBg:       'FF1A6BB5',  // mid-blue    – month heading rows
      monthFg:       'FFFFFFFF',
      carryBg:       'FFD6E4F7',  // pale blue   – brought-forward
      carryFg:       'FF0C3B6E',
      itemAlt:       'FFF0F7FF',  // very light blue – alternating rows
      itemBase:      'FFFFFFFF',
      dailyBg:       'FFE8F4FD',  // light sky   – daily transactions
      totalBg:       'FF10B981',  // green       – total % row
      totalFg:       'FFFFFFFF',
      summaryTitleBg:'FF0F4C81',
      summaryHdrBg:  'FF1E3A5F',
      summaryHdrFg:  'FFFFFFFF',
      summaryAlt:    'FFF5F9FF',
      positiveClr:   'FF059669',
      negativeClr:   'FFDC2626',
      borderClr:     'FFB0C4DE',
    };

    const wb = new ExcelJS.Workbook();
    wb.creator  = 'Expense Planner';
    wb.created  = new Date();

    // ── helper: apply thin border to a row ──────────────────────────
    const borderCell = (cell, color = C.borderClr) => {
      const side = { style: 'thin', color: { argb: color } };
      cell.border = { top: side, left: side, bottom: side, right: side };
    };

    // ── helper: fill + font shorthand ────────────────────────────────
    const styleCell = (cell, bgArgb, fgArgb, bold = false, sz = 11) => {
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.font  = { color: { argb: fgArgb }, bold, size: sz, name: 'Calibri' };
      cell.alignment = { vertical: 'middle', wrapText: true };
      borderCell(cell);
    };

    // ════════════════════════════════════════════════════════════════
    //  SHEET 1 – SUMMARY
    // ════════════════════════════════════════════════════════════════
    const ws1 = wb.addWorksheet('Summary');
    ws1.columns = [
      { width: 32 }, { width: 20 }, { width: 12 },
    ];

    // Title
    ws1.mergeCells('A1:C1');
    const titleCell = ws1.getCell('A1');
    titleCell.value = 'Detailed Monthly Expense Report';
    styleCell(titleCell, C.summaryTitleBg, C.headerFg, true, 14);
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws1.getRow(1).height = 28;

    // Sub-title
    ws1.mergeCells('A2:C2');
    const subCell = ws1.getCell('A2');
    subCell.value = `Generated on: ${new Date().toLocaleString()}`;
    subCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    subCell.font  = { color: { argb: 'FFB0C4DE' }, size: 10, name: 'Calibri', italic: true };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws1.addRow([]);

    // Header
    const sHdrRow = ws1.addRow(['Metric', 'Value', 'Currency']);
    sHdrRow.eachCell(cell => styleCell(cell, C.summaryHdrBg, C.summaryHdrFg, true));
    ws1.getRow(sHdrRow.number).height = 20;

    const summaryRows = [
      ['Total Salary Covered',     reportStats.totalSalary.toLocaleString(),                  currency],
      ['Months Covered',           reportStats.monthsCovered,                                  ''],
      ['Total Additional Income',  reportStats.totalAdditionalIncome.toLocaleString(),         currency],
      ['Total Recurring Expenses', reportStats.totalRecurring.toLocaleString(),                currency],
      ['Total Daily Spending',     reportStats.totalDaily.toLocaleString(),                    currency],
      ['Total Spending',           aggregatedTotal.toLocaleString(),                           currency],
      ['Average Utilization',      `${averageUtilization.toFixed(1)}%`,                       ''],
      ['Highest Utilization',      `${reportStats.highestUtilization.toFixed(1)}%`,           ''],
      ['Savings Power',            savingsPower.toLocaleString(),                              currency],
    ];
    summaryRows.forEach((data, i) => {
      const row = ws1.addRow(data);
      const bg = i % 2 === 0 ? C.summaryAlt : 'FFFFFFFF';
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = { name: 'Calibri', size: 11 };
        borderCell(cell);
      });
      // colour Savings Power value
      if (data[0] === 'Savings Power') {
        row.getCell(2).font = {
          bold: true, size: 12, name: 'Calibri',
          color: { argb: savingsPower >= 0 ? C.positiveClr : C.negativeClr }
        };
      }
    });

    // ════════════════════════════════════════════════════════════════
    //  SHEET 2 – ALL MONTHS
    // ════════════════════════════════════════════════════════════════
    const ws2 = wb.addWorksheet('All Months');
    ws2.columns = [
      { key: 'date',    width: 12 },
      { key: 'cashFor', width: 36 },
      { key: 'amount',  width: 16 },
      { key: 'pct',     width: 16 },
      { key: 'total',   width: 16 },
      { key: 'summary', width: 32 },
    ];

    // Column header row
    const colHeaders = ['Date', 'Cash For', `Amount (${currency})`, '% From Salary', `Total (${currency})`, 'Financial Summary'];
    const hdrRow = ws2.addRow(colHeaders);
    hdrRow.eachCell(cell => styleCell(cell, C.headerBg, C.headerFg, true, 11));
    ws2.getRow(hdrRow.number).height = 22;

    let exportCumulativeBalance = parseFloat(openingBalance) || 0;

    monthlyData.forEach((monthData) => {
      const currentSalary    = getSalaryForMonth(monthData.date);
      const [expMonthStr]    = monthData.date.split('/');
      const expMonthAdditional = getAdditionalIncomeForMonth(parseInt(expMonthStr, 10));
      const expMonthTotalIncome = currentSalary + expMonthAdditional;
      const recurringTotal   = monthData.expenses.reduce((s, e) => s + e.amount, 0);
      const dailyTotal       = monthData.dailyTransactions.reduce((s, t) => s + t.amount, 0);
      const grandTotal       = recurringTotal + dailyTotal;
      const broughtForward   = exportCumulativeBalance;
      const monthlyNet       = expMonthTotalIncome - grandTotal;
      const remaining        = monthlyNet + broughtForward;
      exportCumulativeBalance = remaining;

      const allItems = [...monthData.expenses, ...monthData.dailyTransactions];

      // ── blank spacer
      ws2.addRow([]);

      // ── Month heading row
      const monthHeadRow = ws2.addRow([`  ${monthData.date}`, '', '', '', '', '']);
      ws2.mergeCells(`A${monthHeadRow.number}:F${monthHeadRow.number}`);
      const mhCell = ws2.getCell(`A${monthHeadRow.number}`);
      mhCell.value = `  ${monthData.date}`;
      styleCell(mhCell, C.monthBg, C.monthFg, true, 12);
      mhCell.alignment = { horizontal: 'left', vertical: 'middle' };
      ws2.getRow(monthHeadRow.number).height = 20;

      // ── Brought Forward row
      if (broughtForward !== 0) {
        const bfRow = ws2.addRow([
          monthData.date,
          '💼 Brought Forward (from previous month)',
          '', '', '',
          `${broughtForward >= 0 ? '+' : ''}${broughtForward.toFixed(2)} ${currency}`
        ]);
        bfRow.eachCell(cell => styleCell(cell, C.carryBg, C.carryFg, true));
        bfRow.getCell(6).font = {
          bold: true, size: 11, name: 'Calibri',
          color: { argb: broughtForward >= 0 ? C.positiveClr : C.negativeClr }
        };
      }

      // ── Expense / transaction rows
      if (allItems.length === 0) {
        const emptyRow = ws2.addRow([
          monthData.date, 'No expenses', '0.00', '-', '0.00',
          `Salary: ${currentSalary.toFixed(2)} ${currency}`
        ]);
        emptyRow.eachCell(cell => styleCell(cell, C.itemBase, 'FF6B7280'));
      } else {
        allItems.forEach((item, idx) => {
          const pct     = currentSalary > 0 ? calculatePercentage(item.amount, currentSalary) : '0';
          const isDaily = item.type === 'daily';
          const rowBg   = isDaily ? C.dailyBg : (idx % 2 === 0 ? C.itemBase : C.itemAlt);

          let summaryVal = '';
          if (idx === 0)
            summaryVal = `Salary: ${currentSalary.toFixed(2)} ${currency}`;
          else if (idx === 1 && expMonthAdditional > 0)
            summaryVal = `Additional Income: +${expMonthAdditional.toFixed(2)} ${currency}`;
          else if (idx === (expMonthAdditional > 0 ? 2 : 1))
            summaryVal = `Monthly Net: ${monthlyNet.toFixed(2)} ${currency}`;
          else if (idx === (expMonthAdditional > 0 ? 3 : 2) && broughtForward !== 0)
            summaryVal = `Brought Forward: ${broughtForward >= 0 ? '+' : ''}${broughtForward.toFixed(2)} ${currency}`;
          else if (idx === (broughtForward !== 0 ? (expMonthAdditional > 0 ? 4 : 3) : (expMonthAdditional > 0 ? 3 : 2)))
            summaryVal = `Final Balance: ${remaining.toFixed(2)} ${currency}`;

          const exRow = ws2.addRow([
            idx === 0 ? monthData.date : '',
            `${isDaily ? '[Daily] ' : ''}${item.cashFor}`,
            parseFloat(item.amount.toFixed(2)),
            currentSalary > 0 ? `${pct}%` : '-',
            idx === 0 ? parseFloat(grandTotal.toFixed(2)) : '',
            summaryVal
          ]);

          exRow.eachCell(cell => styleCell(cell, rowBg, 'FF1F2937'));
          // Amount in blue
          exRow.getCell(3).font = { color: { argb: 'FF0284C7' }, bold: true, size: 11, name: 'Calibri' };
          // % column
          if (currentSalary > 0) {
            const pctNum = parseFloat(pct);
            const pctClr = pctNum < 30 ? 'FF059669' : pctNum < 60 ? 'FF2563EB' : pctNum < 80 ? 'FFD97706' : 'FFDC2626';
            exRow.getCell(4).font = { color: { argb: pctClr }, bold: true, size: 11, name: 'Calibri' };
          }
          // Summary column: colour Final Balance
          if (summaryVal.startsWith('Final Balance')) {
            exRow.getCell(6).font = {
              bold: true, size: 11, name: 'Calibri',
              color: { argb: remaining >= 0 ? C.positiveClr : C.negativeClr }
            };
          }
        });
      }

      // ── Total % row
      const totalPct = currentSalary > 0 ? calculatePercentage(grandTotal, currentSalary) : '0';
      const totRow = ws2.addRow([
        'Total % of Salary:', '', '',
        currentSalary > 0 ? `${totalPct}%` : '-',
        '',
        currentSalary > 0
          ? `${grandTotal.toLocaleString()} / ${currentSalary.toLocaleString()} ${currency}`
          : ''
      ]);
      totRow.eachCell(cell => styleCell(cell, C.totalBg, C.totalFg, true));
      ws2.getRow(totRow.number).height = 18;
    });

    // ── Download
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `Expense_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
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
          <button type="button" className="collapse-all-btn" onClick={collapseAll} title="Collapse all months">⊖ Collapse All</button>
          <button type="button" className="collapse-all-btn" onClick={expandAll}  title="Expand all months">⊕ Expand All</button>

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

      {monthlyData.map((monthData, index) => {
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

        // Determine month financial health status
        const utilization = monthTotalIncome > 0 ? (grandTotal / monthTotalIncome) * 100 : 0;
        const healthStatus = remaining < 0 ? 'critical' : utilization >= 80 ? 'warning' : utilization >= 60 ? 'elevated' : 'healthy';

        return (
          <div key={index} className={`month-report-section month-status-${healthStatus}${index % 2 === 1 ? ' month-alt' : ''}`}>
            <div className="month-section-header" onClick={() => toggleMonth(monthData.date)} style={{ cursor: 'pointer', userSelect: 'none' }}>
              <span className="month-collapse-icon">{collapsedMonths.has(monthData.date) ? '▶' : '▼'}</span>
              <span className="month-section-badge">{monthData.date}</span>
              <span className={`month-status-pill status-${healthStatus}`}>
                {healthStatus === 'healthy' ? '● Healthy' : healthStatus === 'elevated' ? '● Moderate' : healthStatus === 'warning' ? '▲ High' : '⬤ Over Budget'}
              </span>
              <span className="month-utilization-tag">{utilization.toFixed(0)}% used</span>
              {collapsedMonths.has(monthData.date) && (
                <span className="month-collapsed-summary">
                  Total: {grandTotal.toLocaleString()} {currency} &nbsp;|&nbsp;
                  Balance: <span className={remaining >= 0 ? 'positive' : 'negative'}>{remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</span>
                </span>
              )}
            </div>

            {!collapsedMonths.has(monthData.date) && (<>

            {/* ── Mobile card layout ── */}
            <div className="mobile-month-view">
              {broughtForward !== 0 && (
                <div className="mob-carry-row">
                  <span>💼 Brought Forward</span>
                  <span className={broughtForward >= 0 ? 'positive' : 'negative'}>
                    {broughtForward >= 0 ? '+' : ''}{broughtForward.toLocaleString(undefined, { minimumFractionDigits: 1 })} {currency}
                  </span>
                </div>
              )}

              <div className="mob-items-list">
                {allItems.length === 0 ? (
                  <div className="mob-item-row mob-empty">No expenses this month</div>
                ) : (
                  allItems.map((item, idx) => (
                    <div key={idx} className="mob-item-row">
                      <span className="mob-item-name">
                        {item.type === 'daily' && <span className="daily-badge">Daily</span>}
                        {item.cashFor}
                      </span>
                      <div className="mob-item-right">
                        <span className="mob-item-amount">{item.amount.toLocaleString()} {currency}</span>
                        {monthTotalIncome > 0 && (
                          <span className="mob-item-pct" style={{ color: getPercentageColor(calculatePercentage(item.amount, monthTotalIncome)) }}>
                            {calculatePercentage(item.amount, monthTotalIncome)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mob-summary-section">
                <div className="mob-summary-row">
                  <span>Salary</span>
                  <span>{formatSalary(currentSalary)} {currency}</span>
                </div>
                {monthAdditionalIncome > 0 && (
                  <div className="mob-summary-row">
                    <span>Additional Income</span>
                    <span className="positive">+{monthAdditionalIncome.toLocaleString()} {currency}</span>
                  </div>
                )}
                <div className="mob-summary-row">
                  <span>Total Spent</span>
                  <span>{grandTotal.toLocaleString()} {currency}</span>
                </div>
                {monthTotalIncome > 0 && (
                  <div className="mob-summary-row mob-utilization-row">
                    <span>📊 % of Income</span>
                    <span style={{ color: getPercentageColor(calculatePercentage(grandTotal, monthTotalIncome)), fontWeight: 700 }}>
                      {calculatePercentage(grandTotal, monthTotalIncome)}%
                    </span>
                  </div>
                )}
                <div className="mob-summary-row">
                  <span>Monthly Net</span>
                  <span className={monthlyNet >= 0 ? 'positive' : 'negative'}>
                    {monthlyNet.toLocaleString(undefined, { minimumFractionDigits: 1 })} {currency}
                  </span>
                </div>
                <div className={`mob-summary-row mob-final-balance ${remaining >= 0 ? 'positive' : 'negative'}`}>
                  <span>Final Balance</span>
                  <span>{remaining.toLocaleString(undefined, { minimumFractionDigits: 1 })} {currency}</span>
                </div>
              </div>
            </div>

            {/* ── Desktop table layout ── */}
            <div className="desktop-month-view">
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
                
                {/* ── RECURRING section ── */}
                {monthData.expenses.length > 0 && (() => {
                  const secKey = `${monthData.date}|recurring`;
                  const collapsed = collapsedSections.has(secKey);
                  return (
                    <>
                      <tr className="section-group-header recurring-group" onClick={(e) => toggleSection(secKey, e)}>
                        <td colSpan="7">
                          <span className="section-collapse-icon">{collapsed ? '▶' : '▼'}</span>
                          📋 Recurring Expenses
                          <span className="section-group-total">{recurringTotal.toLocaleString()} {currency}</span>
                        </td>
                      </tr>
                      {!collapsed && monthData.expenses.map((item, idx) => (
                        <tr key={`r-${idx}`} className="expense-row recurring-row">
                          <td className="date-cell"></td>
                          <td className="expense-name">{item.cashFor}</td>
                          <td className="expense-amount">{item.amount.toLocaleString()}</td>
                          <td className="percentage-cell">
                            {monthTotalIncome > 0 && (
                              <span style={{ color: getPercentageColor(calculatePercentage(item.amount, monthTotalIncome)), fontWeight: 'bold' }}>
                                {calculatePercentage(item.amount, monthTotalIncome)}%
                              </span>
                            )}
                          </td>
                          <td></td><td></td><td></td>
                        </tr>
                      ))}
                    </>
                  );
                })()}

                {/* ── DAILY section ── */}
                {monthData.dailyTransactions.length > 0 && (() => {
                  const secKey = `${monthData.date}|daily`;
                  const collapsed = collapsedSections.has(secKey);
                  return (
                    <>
                      <tr className="section-group-header daily-group" onClick={(e) => toggleSection(secKey, e)}>
                        <td colSpan="7">
                          <span className="section-collapse-icon">{collapsed ? '▶' : '▼'}</span>
                          💳 Daily Transactions
                          <span className="section-group-total">{dailyTotal.toLocaleString()} {currency}</span>
                        </td>
                      </tr>
                      {!collapsed && monthData.dailyTransactions.map((item, idx) => (
                        <tr key={`d-${idx}`} className="expense-row daily-row">
                          <td className="date-cell">{item.date ? new Date(item.date).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) : ''}</td>
                          <td className="expense-name daily-item">
                            <span className="daily-badge">Daily</span>
                            <span className="daily-category">{item.cashFor}</span>
                            {item.description && <span className="daily-desc-name">{item.description}</span>}
                          </td>
                          <td className="expense-amount">{item.amount.toLocaleString()}</td>
                          <td className="percentage-cell">
                            {monthTotalIncome > 0 && (
                              <span style={{ color: getPercentageColor(calculatePercentage(item.amount, monthTotalIncome)), fontWeight: 'bold' }}>
                                {calculatePercentage(item.amount, monthTotalIncome)}%
                              </span>
                            )}
                          </td>
                          <td></td><td></td><td></td>
                        </tr>
                      ))}
                    </>
                  );
                })()}

                {allItems.length === 0 && (
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
                    {monthTotalIncome > 0 ? (
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
                    {monthTotalIncome > 0 && (
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
          </>) /* end !collapsed */}
          </div>
        );
        })}
    </div>
  );
}

export default MonthlyExpenseReport;
