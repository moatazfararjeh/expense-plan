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
        setCategories(response.data.categories || ['Jordan Family Expense', 'Our Expense', 'Loan Sabb', 'Other']);
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
    <div className="monthly-expense-report">
      <div className="report-header">
        <div>
          <h2>⚙️ Settings</h2>
          <p className="report-subtitle">Configure your application and financial parameters</p>
        </div>
        <button 
          onClick={() => window.location.href = '/'}
          className="btn-home"
        >
          <span style={{ fontSize: '1.2rem' }}>🏠</span> 
          <span>Home</span>
        </button>
      </div>
      
      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="settings-section">
        <h3>💼 Salary & Plan Settings</h3>
        <p className="section-description">
          Configure your monthly salary, opening balance, and plan start date.
        </p>
        
        <form onSubmit={handleSalaryUpdate} className="glass-form">
          <div className="form-group">
            <label>Monthly Salary:</label>
            <input
              type="number"
              value={salaryInput}
              onChange={(e) => setSalaryInput(e.target.value)}
              placeholder="e.g., 30000"
              step="0.01"
              min="0"
            />
          </div>
          
          <div className="form-group">
            <label>Opening Balance :</label>
            <input
              type="number"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              placeholder="e.g., 5000"
              step="0.01"
              min="0"
            />
            <small className="help-text">
              The amount you have before starting the plan
            </small>
          </div>
          
          <div className="form-group">
            <label>Plan Start Date :</label>
            <div 
              className="date-input-wrapper" 
              onClick={() => document.getElementById('planStartDateInput').showPicker?.()}
            >
              <span className="date-icon">
                📅
              </span>
              <input
                id="planStartDateInput"
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                className="date-input-field"
              />
            </div>
            <small className="help-text">
              Start date for tracking expenses and savings
            </small>
          </div>
          
          <button type="submit" className="btn-add" style={{ marginTop: '10px' }}>
            Update Salary Settings
          </button>
        </form>

        {salary > 0 && (
          <div className="current-info-box">
            <div className="info-item">
              Current Salary: <strong>{salary.toLocaleString()} {currency}</strong>
            </div>
            {openingBalance > 0 && (
              <div className="info-item">
                Opening Balance: <strong>{openingBalance.toLocaleString()} {currency}</strong>
              </div>
            )}
            {planStartDate && (
              <div className="info-item">
                📅 Plan Start: <strong>{new Date(planStartDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="section-header">
          <h3>📈 Salary Changes</h3>
          <button 
            onClick={() => setShowSalaryChangeForm(!showSalaryChangeForm)}
            className="btn btn-primary"
          >
            {showSalaryChangeForm ? 'Cancel' : '+ Add Change'}
          </button>
        </div>
        <p className="section-description">
          Track salary changes over time. These will be automatically applied in projections based on the effective date.
        </p>
        
        {showSalaryChangeForm && (
          <form onSubmit={handleAddSalaryChange} className="glass-form">
            <div className="form-group">
              <label>New Salary Amount:</label>
              <input
                type="number"
                value={changeAmount}
                onChange={(e) => setChangeAmount(e.target.value)}
                placeholder="e.g., 35000"
                step="0.01"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Effective Date (تاريخ التطبيق):</label>
              <div 
                className="date-input-wrapper" 
                onClick={() => document.getElementById('effectiveDateInput').showPicker?.()}
              >
                <span className="date-icon">
                  📅
                </span>
                <input
                  id="effectiveDateInput"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="date-input-field"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Notes (Optional):</label>
              <input
                type="text"
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="e.g., Annual raise, Promotion"
              />
            </div>
            <button type="submit" className="btn-add">
              Add Salary Change
            </button>
          </form>
        )}

        <div className="salary-changes-list">
          {salaryChanges.length > 0 ? (
            <>
              <div className="list-summary">
                {salaryChanges.length} salary change{salaryChanges.length !== 1 ? 's' : ''} recorded
              </div>
              {salaryChanges.map((change) => (
                <div key={change.id} className="list-item-card">
                  <div className="item-details">
                    <div className="item-amount">
                      {parseFloat(change.amount).toLocaleString()} {currency}
                    </div>
                    <div className="item-date">
                      📅 Effective: {formatDate(change.effective_date)}
                    </div>
                    {change.notes && (
                      <div className="item-notes">
                        {change.notes}
                      </div>
                    )}
                  </div>
                  <button 
                    className="btn-icon btn-delete"
                    onClick={() => onDeleteSalaryChange(change.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </>
          ) : (
            <div className="empty-state">
              No salary changes recorded yet. Current salary will be used for all months.
            </div>
          )}
        </div>

        {salaryChanges.length > 0 && (
          <div className="info-tip">
            <strong>💡 Tip:</strong> Salary changes will be automatically applied in the monthly projection based on the effective date.
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Currency</h3>
        <div className="form-group">
          <label>Currency Symbol/Code:</label>
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="e.g., SAR, USD, EUR, £, ¥"
            maxLength={10}
          />
          <small className="help-text">
            This will be displayed with all amounts throughout the application
          </small>
        </div>
      </div>

      <div className="settings-section">
        <h3>Expense Categories</h3>
        <p className="section-description">
          Manage your custom expense categories. These will be available for monthly expenses and daily transactions.
        </p>
        
        <div className="categories-list">
          {categories.map((category, index) => (
            <div key={index} className="category-item">
              <span className="category-name">{category}</span>
              <div className="category-actions">
                <button 
                  onClick={() => moveCategory(index, 'up')} 
                  disabled={index === 0}
                  className="btn-icon"
                  title="Move up"
                >
                  ▲
                </button>
                <button 
                  onClick={() => moveCategory(index, 'down')} 
                  disabled={index === categories.length - 1}
                  className="btn-icon"
                  title="Move down"
                >
                  ▼
                </button>
                <button 
                  onClick={() => removeCategory(index)}
                  className="btn-icon btn-delete"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="add-category">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCategory()}
            placeholder="Add new category"
          />
          <button onClick={addCategory} className="btn-add">
            Add Category
          </button>
        </div>
      </div>

      <div className="settings-actions">
        <button onClick={saveSettings} className="btn-save">
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;
