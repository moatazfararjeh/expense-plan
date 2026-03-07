import React, { useState } from 'react';

function SalaryChanges({ salaryChanges, onAdd, onDelete, currency = 'SAR' }) {
  const [amount, setAmount] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (amount && amount > 0 && effectiveDate) {
      onAdd({ 
        amount: parseFloat(amount), 
        effective_date: effectiveDate,
        notes 
      });
      setAmount('');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setShowForm(false);
    } else {
      alert('Please enter a valid amount and date');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatMoney = (value) => `${parseFloat(value || 0).toLocaleString()} ${currency}`;
  const totalChanges = salaryChanges.length;
  const orderedChanges = [...salaryChanges].sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
  const latestChange = orderedChanges[0];

  return (
    <div className="card finance-module">
      <div className="section-header">
        <div>
          <h2>📈 Salary Changes</h2>
          <p className="section-subtitle">Track future raises, promotions, and adjustments powering your projections.</p>
        </div>
        <div className="header-actions">
          <button 
            type="button"
            className="chip-button"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Close Form' : '+ Add Change'}
          </button>
          <div className="header-pill">
            <span>Recorded</span>
            <strong>{totalChanges}</strong>
          </div>
        </div>
      </div>

      <div className="module-banner">
        <div>
          <p className="insight-title">Compensation Timeline</p>
          <p className="insight-copy">
            {totalChanges > 0
              ? `Last update set salary to ${formatMoney(latestChange.amount)} effective ${formatDate(latestChange.effective_date)}.`
              : 'Log your first salary change to see future months adapt automatically.'}
          </p>
        </div>
        <div className="insight-metric">
          <span>Next Change</span>
          <strong>{latestChange ? formatMoney(latestChange.amount) : '—'}</strong>
          <small>{latestChange ? formatDate(latestChange.effective_date) : 'Add an upcoming change'}</small>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-form">
          <div className="form-group">
            <label htmlFor="salary-amount">New Salary Amount</label>
            <input
              type="number"
              id="salary-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 35000"
              step="0.01"
              min="0"
            />
          </div>
          <div className="form-group">
            <label htmlFor="effective-date">Effective Date (تاريخ التطبيق)</label>
            <div className="date-input-wrapper" onClick={() => document.getElementById('effective-date').showPicker()}>
              <span className="date-icon">📅</span>
              <input
                type="date"
                id="effective-date"
                className="date-input-field"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="salary-notes">Notes (Optional)</label>
            <input
              type="text"
              id="salary-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Annual raise, Promotion"
            />
          </div>
          <button type="submit" className="btn btn-primary full-width">
            Save Change
          </button>
        </form>
      )}

      <div className="salary-changes-list">
        {totalChanges > 0 ? (
          <>
            <div className="filter-note">
              {totalChanges} salary change{totalChanges !== 1 ? 's' : ''} recorded
            </div>
            {orderedChanges.map((change) => (
              <div key={change.id} className="finance-list-card salary-change-card">
                <div>
                  <p className="income-name">{formatMoney(change.amount)}</p>
                  <div className="income-meta">
                    <span className="category-chip">Effective {formatDate(change.effective_date)}</span>
                    {change.notes && <span className="category-chip muted">{change.notes}</span>}
                  </div>
                </div>
                <div className="card-actions">
                  <button 
                    type="button"
                    className="btn btn-danger"
                    onClick={() => onDelete(change.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="empty-state">
            <p>No salary changes yet</p>
            <span>Recording promotions or raises keeps your projections precise.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default SalaryChanges;
