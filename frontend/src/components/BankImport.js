import React, { useState, useRef } from 'react';
import axios from 'axios';
import './BankImport.css';

const API_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'http://localhost:3001/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "19 Apr 2026" → "2026-04-19" */
function parseDate(raw) {
  const months = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  const parts = raw.trim().split(' ');
  if (parts.length !== 3) return null;
  const [day, mon, year] = parts;
  const mm = months[mon];
  if (!mm) return null;
  return `${year}-${mm}-${day.padStart(2, '0')}`;
}

/** Extract a readable merchant name from the messy bank description */
function extractMerchant(desc) {
  // The merchant name appears after a city name + bank code block and before ×
  // Pattern: ...CITY  BANKNAME<MerchantName here>× or end
  const patterns = [
    /(?:ALRAJHI|SABB|NCB|INMA|RIYAD|FRENCH|ALBI|ALINMA)[A-Z0-9 ]*?([A-Za-z][A-Za-z0-9 \-&'.]+?)(?:×|$)/,
    /682002[A-Za-z0-9 ]*?([A-Za-z][A-Za-z0-9 \-&'.]+?)(?:×|$)/,
  ];
  for (const re of patterns) {
    const m = desc.match(re);
    if (m && m[1] && m[1].trim().length > 2) {
      return m[1].trim().replace(/\s+/g, ' ');
    }
  }
  // Fallback: grab last readable Latin segment before "بطاقة"
  const latinSegments = desc.match(/[A-Za-z][A-Za-z0-9 \-&'.]{3,}/g);
  if (latinSegments && latinSegments.length > 0) {
    return latinSegments[latinSegments.length - 1].trim();
  }
  return desc.substring(0, 60).trim();
}

/** Auto-detect category from merchant name */
function guessCategory(merchant) {
  const m = merchant.toLowerCase();
  if (/hospital|clinic|medical|pharmacy|dallah|doctor/.test(m)) return 'Medical';
  if (/pharmacy|dawaa|nahdi/.test(m)) return 'Pharmacy';
  if (/panda|hyper|market|grocery|supermarket|carrefour|lulu|keemart|nesto|danube/.test(m)) return 'Groceries';
  if (/fuel|petrol|petroly|gas station|aramco|shell|total|petro/.test(m)) return 'Fuel';
  if (/restaurant|rest|burger|shawerma|pizza|coffee|cafe|snack|dining|pepper|barns|fraij|swylah|nada|lantern|karam/.test(m)) return 'Dining Out';
  if (/amazon|noon|jarir|extra|electronics/.test(m)) return 'Shopping';
  if (/b8ak|stc|mobily|zain|internet|telecom/.test(m)) return 'Internet & Mobile';
  if (/laundry|lamat|dry clean/.test(m)) return 'Household Items';
  if (/smiles|entertain|cinema|fun|play/.test(m)) return 'Entertainment';
  if (/school|education|learning|academy/.test(m)) return 'Education';
  if (/parking|toll|salik/.test(m)) return 'Parking & Tolls';
  if (/insurance/.test(m)) return 'Insurance';
  if (/travel|airline|flight|hotel|booking/.test(m)) return 'Travel';
  return 'Miscellaneous';
}

/** Properly parse a CSV line respecting quoted fields (handles "5,495.57") */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

/** Parse the entire CSV text into transaction objects */
function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results = [];
  const errors = [];

  // Skip header row
  const dataLines = lines[0].toLowerCase().includes('date') ? lines.slice(1) : lines;

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (!line) continue;

    // Properly parse quoted CSV fields
    const parts = parseCSVLine(line);
    if (parts.length < 4) { errors.push(`Line ${i + 2}: not enough columns`); continue; }

    // Columns: Date, Description, Amount SAR, Balance SAR
    const rawDate = parts[0].trim();
    const rawDesc = parts.slice(1, parts.length - 2).join(',').trim();
    const rawAmount = parts[parts.length - 2].replace(/[,]/g, '').trim();

    const date = parseDate(rawDate);
    if (!date) { errors.push(`Line ${i + 2}: invalid date "${rawDate}"`); continue; }

    const amount = parseFloat(rawAmount);
    if (isNaN(amount)) { errors.push(`Line ${i + 2}: invalid amount "${rawAmount}"`); continue; }

    // Only import expenses (negative amounts)
    if (amount >= 0) continue;

    const merchant = extractMerchant(rawDesc);
    const category = guessCategory(merchant);

    results.push({
      transaction_date: date,
      description: merchant,
      amount: Math.abs(amount),
      category,
      _rawDesc: rawDesc
    });
  }

  return { results, errors };
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BankImport({ getAuthHeader, currency = 'SAR', categories = [], onImported }) {
  const fileRef = useRef();
  const [preview, setPreview] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | previewing | importing | done | error
  const [importResult, setImportResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { results, errors } = parseCSV(ev.target.result);
      setPreview(results);
      setParseErrors(errors);
      setStatus('previewing');
      setImportResult(null);
    };
    reader.readAsText(file, 'utf-8');
  };

  const updateRow = (index, field, value) => {
    setPreview(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const removeRow = (index) => {
    setPreview(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setStatus('importing');
    setErrorMsg('');
    try {
      const headers = getAuthHeader();
      const res = await axios.post(`${API_URL}/transactions/bulk-import`, { transactions: preview }, { headers });
      setImportResult(res.data);
      setStatus('done');
      if (onImported) onImported(res.data.transactions);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Import failed');
      setStatus('error');
    }
  };

  const reset = () => {
    setPreview([]);
    setParseErrors([]);
    setStatus('idle');
    setImportResult(null);
    setErrorMsg('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const allCategories = categories.length > 0 ? categories : [
    'Groceries', 'Dining Out', 'Fuel', 'Medical', 'Pharmacy', 'Shopping',
    'Entertainment', 'Internet & Mobile', 'Household Items', 'Miscellaneous'
  ];

  return (
    <div className="bank-import-container">
      <div className="bank-import-header">
        <h2>🏦 Bank Statement Import</h2>
        <p className="bank-import-subtitle">
          Upload your bank CSV export to automatically add daily transactions. Only expenses (negative amounts) are imported.
        </p>
      </div>

      {/* Upload area */}
      {status === 'idle' && (
        <div className="bank-import-drop-area" onClick={() => fileRef.current.click()}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
          <div className="bank-import-drop-icon">📂</div>
          <p className="bank-import-drop-text">Click to select CSV file</p>
          <p className="bank-import-drop-hint">
            Exported from your bank • Format: Date, Description, Amount SAR, Balance SAR
          </p>
        </div>
      )}

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div className="bank-import-warnings">
          <strong>⚠️ {parseErrors.length} rows skipped:</strong>
          <ul>{parseErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {/* Preview table */}
      {status === 'previewing' && preview.length > 0 && (
        <>
          <div className="bank-import-preview-header">
            <span className="bank-import-count">{preview.length} expenses ready to import</span>
            <div className="bank-import-actions">
              <button className="btn-secondary" onClick={reset}>Cancel</button>
              <button className="btn-primary" onClick={handleImport}>
                ✅ Import {preview.length} Transactions
              </button>
            </div>
          </div>

          <div className="bank-import-table-wrap">
            <table className="bank-import-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount ({currency})</th>
                  <th>Category</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        type="date"
                        value={row.transaction_date}
                        onChange={e => updateRow(i, 'transaction_date', e.target.value)}
                        className="bank-import-input"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.description}
                        onChange={e => updateRow(i, 'description', e.target.value)}
                        className="bank-import-input bank-import-desc"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={row.amount}
                        onChange={e => updateRow(i, 'amount', parseFloat(e.target.value))}
                        className="bank-import-input bank-import-amount"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <select
                        value={row.category}
                        onChange={e => updateRow(i, 'category', e.target.value)}
                        className="bank-import-input"
                      >
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="bank-import-remove" onClick={() => removeRow(i)} title="Remove">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {status === 'previewing' && preview.length === 0 && (
        <div className="bank-import-empty">
          <p>No expense transactions found in this file.</p>
          <button className="btn-secondary" onClick={reset}>Try another file</button>
        </div>
      )}

      {/* Importing spinner */}
      {status === 'importing' && (
        <div className="bank-import-status">
          <div className="bank-import-spinner" />
          <p>Importing transactions…</p>
        </div>
      )}

      {/* Success */}
      {status === 'done' && importResult && (
        <div className="bank-import-success">
          <div className="bank-import-success-icon">✅</div>
          <h3>Import Complete!</h3>
          <p>{importResult.imported} transactions added successfully.</p>
          <button className="btn-primary" onClick={reset}>Import Another File</button>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="bank-import-error">
          <p>❌ {errorMsg}</p>
          <button className="btn-secondary" onClick={reset}>Try Again</button>
        </div>
      )}
    </div>
  );
}
