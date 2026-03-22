import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';
import './Settings.css';
import './MonthlyExpenseReport.css';

const API_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'http://localhost:3001/api';

const Settings = ({ salary = 0, openingBalance = 0, planStartDate = '', onUpdateSettings, salaryChanges = [], onAddSalaryChange, onDeleteSalaryChange }) => {
  const [currency, setCurrency] = useState('SAR');
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [message, setMessage] = useState('');
  
  // Salary settings state
  const [salaryInput, setSalaryInput] = useState(salary);
  const [balanceInput, setBalanceInput] = useState(openingBalance);
  const [startDateInput, setStartDateInput] = useState(planStartDate || new Date().toISOString().split('T')[0]);
  
  // Salary changes state
  const [showSalaryChangeForm, setShowSalaryChangeForm] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [changeNotes, setChangeNotes] = useState('');

  useEffect(() => {
    fetchSettings();
    // Update local state when props change
    setSalaryInput(salary);
    setBalanceInput(openingBalance);
    setStartDateInput(planStartDate || new Date().toISOString().split('T')[0]);
  }, [salary, openingBalance, planStartDate]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setCurrency(response.data.currency || 'SAR');
        setCategories(response.data.categories || ['Family Expense', 'My Expense', 'Loan', 'Other']);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const settingsResponse = await axios.get(`${API_URL}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const currentSettings = settingsResponse.data;
      
      await axios.post(`${API_URL}/settings`, {
        ...currentSettings,
        currency,
        categories
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
      
      // Trigger a page reload to apply settings across all components
      window.location.reload();
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const removeCategory = (index) => {
    const updated = categories.filter((_, i) => i !== index);
    setCategories(updated);
  };

  const moveCategory = (index, direction) => {
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newCategories.length) {
      [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
      setCategories(newCategories);
    }
  };

  const handleSalaryUpdate = (e) => {
    e.preventDefault();
    if (salaryInput && salaryInput >= 0) {
      onUpdateSettings(parseFloat(salaryInput), parseFloat(balanceInput || 0), startDateInput);
      setMessage('Salary settings updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Error: Please enter a valid salary amount.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleAddSalaryChange = (e) => {
    e.preventDefault();
    if (changeAmount && changeAmount > 0 && effectiveDate) {
      onAddSalaryChange({ 
        amount: parseFloat(changeAmount), 
        effective_date: effectiveDate,
        notes: changeNotes 
      });
      setChangeAmount('');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setChangeNotes('');
      setShowSalaryChangeForm(false);
      setMessage('Salary change added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Error: Please enter a valid amount and date.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="settings-page">

      {/* ── Header ── */}
      <div className="settings-page-header">
        <div>
          <h2>⚙️ Settings</h2>
          <p className="settings-page-subtitle">Configure your application and financial parameters</p>
        </div>
      </div>

      {/* ── Toast ── */}
      {message && (
        <div className={`settings-toast ${message.includes('Error') ? 'error' : 'success'}`}>
          {message.includes('Error') ? '✕' : '✓'} {message}
        </div>
      )}

      {/* ── 1. Salary & Plan ── */}
      <div className="s-card">
        <div className="s-card-header">
          <h3 className="s-card-title">💼 Salary &amp; Plan Settings</h3>
        </div>
        <p className="s-card-desc">
          Configure your monthly salary, opening balance, and plan start date.
        </p>

        <form onSubmit={handleSalaryUpdate}>
          <div className="s-form-group">
            <label className="s-label">Monthly Salary</label>
            <input
              className="s-input"
              type="number"
              value={salaryInput}
              onChange={(e) => setSalaryInput(e.target.value)}
              placeholder="e.g., 30000"
              step="0.01"
              min="0"
            />
          </div>

          <div className="s-form-group">
            <label className="s-label">Opening Balance</label>
            <input
              className="s-input"
              type="number"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              placeholder="e.g., 5000"
              step="0.01"
              min="0"
            />
            <span className="s-help">The amount you have before starting the plan</span>
          </div>

          <div className="s-form-group">
            <label className="s-label">Plan Start Date</label>
            <div
              className="s-date-wrapper"
              onClick={() => document.getElementById('planStartDateInput').showPicker?.()}
            >
              <input
                id="planStartDateInput"
                type="date"
                className="s-date-field"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
              />
              <span className="s-date-icon">📅</span>
            </div>
            <span className="s-help">Start date for tracking expenses and savings</span>
          </div>

          <button type="submit" className="s-btn-primary full-width">
            Update Salary Settings
          </button>
        </form>

        {salary > 0 && (
          <div className="s-info-box">
            <div className="s-info-item">
              <span className="s-info-label">Current Salary</span>
              <span className="s-info-value">{salary.toLocaleString()} {currency}</span>
            </div>
            {openingBalance > 0 && (
              <div className="s-info-item">
                <span className="s-info-label">Opening Balance</span>
                <span className="s-info-value">{openingBalance.toLocaleString()} {currency}</span>
              </div>
            )}
            {planStartDate && (
              <div className="s-info-item">
                <span className="s-info-label">Plan Start</span>
                <span className="s-info-value">
                  {new Date(planStartDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 2. Salary Changes ── */}
      <div className="s-card">
        <div className="s-card-header">
          <h3 className="s-card-title">📈 Salary Changes</h3>
          <button
            type="button"
            onClick={() => setShowSalaryChangeForm(!showSalaryChangeForm)}
            className={showSalaryChangeForm ? 's-btn-outline cancel' : 's-btn-primary'}
          >
            {showSalaryChangeForm ? 'Cancel' : '+ Add Change'}
          </button>
        </div>
        <p className="s-card-desc">
          Track salary changes over time. These will be automatically applied in projections based on the effective date.
        </p>

        {showSalaryChangeForm && (
          <div className="s-inline-form">
            <form onSubmit={handleAddSalaryChange}>
              <div className="s-form-group">
                <label className="s-label">New Salary Amount</label>
                <input
                  className="s-input"
                  type="number"
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(e.target.value)}
                  placeholder="e.g., 35000"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="s-form-group">
                <label className="s-label">Effective Date</label>
                <div
                  className="s-date-wrapper"
                  onClick={() => document.getElementById('effectiveDateInput').showPicker?.()}
                >
                  <input
                    id="effectiveDateInput"
                    type="date"
                    className="s-date-field"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                  <span className="s-date-icon">📅</span>
                </div>
              </div>
              <div className="s-form-group">
                <label className="s-label">Notes <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
                <input
                  className="s-input"
                  type="text"
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  placeholder="e.g., Annual raise, Promotion"
                />
              </div>
              <button type="submit" className="s-btn-primary full-width">
                Add Salary Change
              </button>
            </form>
          </div>
        )}

        {salaryChanges.length > 0 ? (
          <>
            <p className="s-list-summary">{salaryChanges.length} change{salaryChanges.length !== 1 ? 's' : ''} recorded</p>
            <div className="s-change-list">
              {salaryChanges.map((change) => (
                <div key={change.id} className="s-change-card">
                  <div className="s-change-info">
                    <div className="s-change-amount">{parseFloat(change.amount).toLocaleString()} {currency}</div>
                    <div className="s-change-date">📅 Effective: {formatDate(change.effective_date)}</div>
                    {change.notes && <div className="s-change-notes">{change.notes}</div>}
                  </div>
                  <button className="s-btn-danger" onClick={() => onDeleteSalaryChange(change.id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <div className="s-tip">
              💡 Salary changes are automatically applied in monthly projections based on the effective date.
            </div>
          </>
        ) : (
          <div className="s-empty">No salary changes recorded yet. Current salary will be used for all months.</div>
        )}
      </div>

      {/* ── 3. Currency ── */}
      <div className="s-card">
        <div className="s-card-header">
          <h3 className="s-card-title">💱 Currency</h3>
        </div>
        <p className="s-card-desc">
          Set the currency symbol or code displayed with all amounts across the app.
        </p>
        <div className="s-currency-row">
          <div className="s-currency-group">
            <label className="s-label">Currency Symbol / Code</label>
            <input
              className="s-input"
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="e.g., SAR, USD, EUR, £, ¥"
              maxLength={10}
            />
            <span className="s-help">Shown next to every monetary value in the app</span>
          </div>
          {currency && (
            <div>
              <div className="s-label" style={{ visibility: 'hidden' }}>preview</div>
              <div className="s-currency-preview">{currency}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Expense Categories ── */}
      <div className="s-card">
        <div className="s-card-header">
          <h3 className="s-card-title">🏷️ Expense Categories</h3>
          <span className="s-badge">{categories.length} {categories.length === 1 ? 'category' : 'categories'}</span>
        </div>
        <p className="s-card-desc">
          Manage your custom expense categories. These will be available when adding monthly expenses and daily transactions.
        </p>

        <div className="s-category-list">
          {categories.length === 0 && (
            <div className="s-empty">No categories yet — add your first one below.</div>
          )}
          {categories.map((category, index) => (
            <div key={index} className="s-category-card">
              <span className="s-cat-index">{index + 1}</span>
              <span className="s-cat-label">{category}</span>
              <div className="s-cat-actions">
                <button
                  onClick={() => moveCategory(index, 'up')}
                  disabled={index === 0}
                  className="s-cat-btn move"
                  title="Move up"
                >↑</button>
                <button
                  onClick={() => moveCategory(index, 'down')}
                  disabled={index === categories.length - 1}
                  className="s-cat-btn move"
                  title="Move down"
                >↓</button>
                <button
                  onClick={() => removeCategory(index)}
                  className="s-cat-btn del"
                  title="Remove"
                >✕</button>
              </div>
            </div>
          ))}
        </div>

        <div className="s-cat-add-row">
          <input
            type="text"
            className="s-cat-input"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCategory()}
            placeholder="Type a new category name…"
          />
          <button onClick={addCategory} className="s-btn-primary">+ Add</button>
        </div>
      </div>

      {/* ── Save bar ── */}
      <div className="s-actions-bar">
        <button onClick={saveSettings} className="s-save-btn">
          💾 Save All Settings
        </button>
      </div>

    </div>
  );
};

export default Settings;
