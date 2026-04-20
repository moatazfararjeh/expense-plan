import React, { useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

function DailyTransactions({ transactions, onAdd, onDelete, categories = ['  Family Expense', 'My Expense', 'Loan', 'Other'], currency = 'SAR' }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(categories[0] || 'Other');
  
  // Edit mode state
  const [editingId, setEditingId] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const DAYS_PER_PAGE = 7;

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (description && amount && amount > 0 && date) {
      onAdd({ 
        description, 
        amount: parseFloat(amount), 
        transaction_date: date,
        category 
      });
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory(categories[0] || 'Other');
    } else {
      alert('Please fill in all fields correctly');
    }
  };

  const startEdit = (transaction) => {
    setEditingId(transaction.id);
    setEditDescription(transaction.description);
    setEditAmount(transaction.amount);
    setEditDate(transaction.transaction_date);
    setEditCategory(transaction.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDescription('');
    setEditAmount('');
    setEditDate('');
    setEditCategory('');
  };

  const updateTransaction = async (id) => {
    if (editDescription && editAmount && editAmount > 0 && editDate) {
      // Call backend API to update (you'll need to add this to App.js)
      try {
        await onAdd({ 
          id,
          description: editDescription, 
          amount: parseFloat(editAmount), 
          transaction_date: editDate,
          category: editCategory,
          isUpdate: true
        });
        cancelEdit();
      } catch (error) {
        alert('Failed to update transaction');
      }
    } else {
      alert('Please fill in all fields correctly');
    }
  };

  // Filter transactions by selected month and year
  const filteredTransactions = transactions.filter(trans => {
    const transDate = new Date(trans.transaction_date);
    const monthMatch = selectedMonth === 'all' || transDate.getMonth() + 1 === parseInt(selectedMonth);
    const yearMatch = selectedYear === 'all' || transDate.getFullYear() === parseInt(selectedYear);
    return monthMatch && yearMatch;
  });

  // Group transactions by date
  const groupedByDate = filteredTransactions.reduce((groups, trans) => {
    const date = new Date(trans.transaction_date).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(trans);
    return groups;
  }, {});

  // Sort dates in descending order (most recent first)
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    return new Date(b) - new Date(a);
  });

  const monthStats = useMemo(() => {
    const total = filteredTransactions.reduce((sum, trans) => sum + parseFloat(trans.amount), 0);
    const categoriesSet = new Set(filteredTransactions.map(trans => trans.category || 'Uncategorized'));
    const daySet = new Set(filteredTransactions.map(trans => new Date(trans.transaction_date).toDateString()));
    const daysTracked = daySet.size;

    return {
      total,
      categories: categoriesSet.size,
      entries: filteredTransactions.length,
      daysTracked,
      averageDaily: daysTracked ? total / daysTracked : 0
    };
  }, [filteredTransactions]);

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Expense Plan';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Daily Transactions');

    // Column definitions
    sheet.columns = [
      { header: 'Date',        key: 'date',        width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Category',    key: 'category',    width: 22 },
      { header: `Amount (${currency})`, key: 'amount', width: 18 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C81' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    // Add data rows — sorted descending by date (matches UI)
    const sorted = [...filteredTransactions].sort(
      (a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)
    );

    sorted.forEach((t, idx) => {
      const row = sheet.addRow({
        date: new Date(t.transaction_date).toLocaleDateString('en-GB'),
        description: t.description,
        category: t.category || 'Uncategorized',
        amount: parseFloat(t.amount),
      });
      // Alternate row shading
      if (idx % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
      }
      row.getCell('amount').numFmt = '#,##0.00';
      row.getCell('amount').alignment = { horizontal: 'right' };
    });

    // Totals row
    const totalRow = sheet.addRow({
      date: '',
      description: 'TOTAL',
      category: '',
      amount: monthStats.total,
    });
    totalRow.font = { bold: true };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBF0FF' } };
    totalRow.getCell('amount').numFmt = '#,##0.00';
    totalRow.getCell('amount').alignment = { horizontal: 'right' };

    // Border on header
    sheet.getRow(1).eachCell(cell => {
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF12A7D4' } }
      };
    });

    const filename = `Daily_Transactions_${monthLabel.replace(/ /g, '_')}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), filename);
  };

  const totalTransactions = monthStats.total;

  // Get available years from transactions
  const availableYears = [...new Set(transactions.map(trans => 
    new Date(trans.transaction_date).getFullYear()
  ))].sort((a, b) => b - a);
  
  if (availableYears.length === 0) {
    availableYears.push(currentDate.getFullYear());
  }

  const setFilterMonth = (v) => { setSelectedMonth(v); setCurrentPage(1); };
  const setFilterYear  = (v) => { setSelectedYear(v);  setCurrentPage(1); };

  // Pagination over day groups
  const totalPages = Math.ceil(sortedDates.length / DAYS_PER_PAGE);
  const pagedDates = sortedDates.slice((currentPage - 1) * DAYS_PER_PAGE, currentPage * DAYS_PER_PAGE);

  const monthLabel = selectedMonth === 'all' && selectedYear === 'all'
    ? 'All Time'
    : selectedMonth === 'all'
    ? `All Months ${selectedYear}`
    : selectedYear === 'all'
    ? `${months[selectedMonth - 1].label} (All Years)`
    : `${months[selectedMonth - 1].label} ${selectedYear}`;

  return (
    <div className="monthly-expense-report">
      <div className="report-header">
        <div>
          <h2>💳 Daily Transactions</h2>
          <p className="report-subtitle">Monitor discretionary spend by day and category</p>
        </div>
        <div className="header-pill">
          <span>{monthLabel}</span>
          <strong>{totalTransactions.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</strong>
        </div>
      </div>

      <div className="report-summary-grid">
        <div className="report-summary-card">
          <p className="summary-label">Entries Logged</p>
          <p className="summary-value">{monthStats.entries}</p>
          <span className="summary-subvalue">Transactions this month</span>
        </div>
        <div className="report-summary-card accent">
          <p className="summary-label">Average Daily Spend</p>
          <p className="summary-value accent">{monthStats.averageDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</p>
          <span className="summary-subvalue">Across {monthStats.daysTracked || 0} tracked days</span>
        </div>
        <div className="report-summary-card">
          <p className="summary-label">Categories</p>
          <p className="summary-value">{monthStats.categories}</p>
          <span className="summary-subvalue">Diverse spending groups</span>
        </div>
        <div className="report-summary-card">
          <p className="summary-label">Month Total</p>
          <p className="summary-value">{totalTransactions.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</p>
          <span className="summary-subvalue">Cumulative spend</span>
        </div>
      </div>

      <div className="report-insight-banner">
        <div>
          <p className="insight-title">Current Focus</p>
          <p className="insight-copy">
            Tracking {monthStats.entries} entries across {monthStats.categories} categories for {monthLabel}. Keep daily inputs flowing to maintain accurate projections.
          </p>
        </div>
        <div className="insight-metric">
          <span>Avg / Day</span>
          <strong>{monthStats.averageDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</strong>
          <small>{monthStats.daysTracked || 0} days logged</small>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-form">
        <div className="form-group">
          <label htmlFor="trans-desc">Description</label>
          <input
            type="text"
            id="trans-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Grocery shopping"
          />
        </div>
        <div className="form-group">
          <label htmlFor="trans-amount">Amount</label>
          <input
            type="number"
            id="trans-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 50"
            step="0.01"
            min="0"
          />
        </div>
        <div className="form-group">
          <label htmlFor="trans-date">Date</label>
          <div className="date-input-wrapper" onClick={() => document.getElementById('trans-date').showPicker()}>
            <span className="date-icon">📅</span>
            <input
              type="date"
              id="trans-date"
              className="date-input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="trans-category">Category</label>
          <select
            id="trans-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary full-width">
          Add Transaction
        </button>
      </form>

      <div className="filter-panel">
        <div className="filter-field">
          <label htmlFor="filter-month">Month</label>
          <select
            id="filter-month"
            value={selectedMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">All Months</option>
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="filter-year">Year</label>
          <select
            id="filter-year"
            value={selectedYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="all">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <button 
          type="button"
          className="chip-button"
          onClick={() => {
            setSelectedMonth(currentDate.getMonth() + 1);
            setSelectedYear(String(currentDate.getFullYear()));
          }}
        >
          Jump to Current Month
        </button>
        <button
          type="button"
          className="chip-button export-btn"
          onClick={exportToExcel}
          disabled={filteredTransactions.length === 0}
          title="Export visible transactions to Excel"
        >
          📥 Export to Excel
        </button>
      </div>
      <p className="filter-note">
        Showing {filteredTransactions.length} transaction(s) for {monthLabel}
      </p>

      <div className="transaction-list">
        {filteredTransactions.length > 0 ? (
          <>
            {pagedDates.map(date => (
              <div key={date} className="transaction-day-card">
                <div className="transaction-day-header">
                  <div>
                    <p className="day-title">{date}</p>
                    <span>{groupedByDate[date].length} transaction{groupedByDate[date].length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="day-total">
                    Day Total: {groupedByDate[date].reduce((sum, t) => sum + parseFloat(t.amount), 0).toLocaleString()} {currency}
                  </div>
                </div>

                {/* Compact table for transactions */}
                <table className="trans-compact-table">
                  <tbody>
                    {groupedByDate[date].map((transaction) => (
                      <tr key={transaction.id}>
                        {editingId === transaction.id ? (
                          <td colSpan={4}>
                            <div className="transaction-edit-card">
                              <div className="transaction-edit-grid">
                                <div>
                                  <label>Description</label>
                                  <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                                </div>
                                <div>
                                  <label>Amount ({currency})</label>
                                  <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} step="0.01" min="0" />
                                </div>
                                <div>
                                  <label>Date</label>
                                  <div className="date-input-wrapper" onClick={() => document.getElementById('edit-trans-date').showPicker()}>
                                    <span className="date-icon">📅</span>
                                    <input type="date" id="edit-trans-date" className="date-input-field" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                                  </div>
                                </div>
                                <div>
                                  <label>Category</label>
                                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div className="transaction-edit-actions">
                                <button type="button" className="btn btn-primary" onClick={() => updateTransaction(transaction.id)}>Save</button>
                                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
                              </div>
                            </div>
                          </td>
                        ) : (
                          <>
                            <td className="trans-cell-desc" title={transaction.description}>
                              {transaction.description.length > 38
                                ? transaction.description.substring(0, 38) + '…'
                                : transaction.description}
                            </td>
                            <td className="trans-cell-cat">
                              <span className="category-chip">{transaction.category}</span>
                            </td>
                            <td className="trans-cell-amount">
                              {parseFloat(transaction.amount).toLocaleString()} {currency}
                            </td>
                            <td className="trans-cell-actions">
                              <button className="trans-icon-btn" type="button" onClick={() => startEdit(transaction)} title="Edit">✏️</button>
                              <button className="trans-icon-btn danger" type="button" onClick={() => {
                                if (window.confirm(`Delete "${transaction.description}"?\nAmount: ${parseFloat(transaction.amount).toLocaleString()} ${currency}`)) {
                                  onDelete(transaction.id);
                                }
                              }} title="Delete">🗑️</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="trans-pagination">
                <button className="trans-page-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</button>
                <button className="trans-page-btn" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>‹</button>
                <span className="trans-page-info">Page {currentPage} of {totalPages}</span>
                <button className="trans-page-btn" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>›</button>
                <button className="trans-page-btn" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</button>
              </div>
            )}

            <div className="module-highlight positive">
              {monthLabel} Total: {totalTransactions.toLocaleString()} {currency}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>No transactions found for {monthLabel}</p>
            <span>Start logging daily spend to unlock trends and averages.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyTransactions;
