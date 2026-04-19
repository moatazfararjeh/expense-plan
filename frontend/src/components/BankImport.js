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
  // Format 2 (cashback card): strip leading 16-digit card number
  const noCard = desc.replace(/^\d{16}/, '').trim();

  // Format 1 (debit): merchant appears after bank code
  const patterns = [
    /(?:ALRAJHI|SABB|NCB|INMA|RIYAD|FRENCH|ALBI|ALINMA)[A-Z0-9 ]*?([A-Za-z][A-Za-z0-9 \-&'.]+?)(?:\u00d7|$)/,
    /682002[A-Za-z0-9 ]*?([A-Za-z][A-Za-z0-9 \-&'.]+?)(?:\u00d7|$)/,
  ];
  for (const re of patterns) {
    const m = desc.match(re);
    if (m && m[1] && m[1].trim().length > 2) {
      return m[1].trim().replace(/\s+/g, ' ');
    }
  }

  // If card number was stripped, use what remains (trim trailing city code like RIY, BUR)
  if (noCard.length > 2) {
    return noCard.replace(/\s+[A-Z]{3}$/, '').replace(/\s+/g, ' ').trim();
  }

  // Fallback: last readable Latin segment
  const latinSegments = desc.match(/[A-Za-z][A-Za-z0-9 \-&'.]{3,}/g);
  if (latinSegments && latinSegments.length > 0) {
    return latinSegments[latinSegments.length - 1].trim();
  }
  return desc.substring(0, 60).trim();
}

/** Auto-detect category from merchant name */
function guessCategory(merchant) {
  const m = merchant.toLowerCase();
  if (/payment received|payment receive|auto db|sabnet|bank transfer/.test(m)) return 'Credit Card Payments';
  if (/hospital|clinic|medical|dallah|doctor/.test(m)) return 'Medical';
  if (/pharmacy|dawaa|nahdi/.test(m)) return 'Pharmacy';
  if (/panda|hyper|market|grocery|supermarket|carrefour|lulu|keemart|nesto|danube/.test(m)) return 'Groceries';
  if (/fuel|petrol|petroly|gas station|aramco|shell|total|petro/.test(m)) return 'Fuel';
  if (/restaurant|rest|burger|shawerma|pizza|coffee|cafe|snack|dining|pepper|barns|fraij|swylah|nada|lantern|karam|jalila|romansiah|hatab|steak|badia/.test(m)) return 'Dining Out';
  if (/amazon|noon|jarir|extra|electronics/.test(m)) return 'Shopping';
  if (/apple\.com|b8ak|stc|mobily|zain|internet|telecom|asharq/.test(m)) return 'Subscriptions';
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

/** Detect CSV format from header line */
function detectFormat(header) {
  const h = header.toLowerCase();
  if (h.includes('amount(sar)') || h.includes('posting date') || h.includes('status')) return 'cashback';
  return 'debit'; // default: Date, Description, Amount SAR, Balance SAR
}

/** Parse cashback bank format: Transaction date, Description, Posting date, Status, Amount(SAR), Amount(Other) */
function parseCashbackLine(parts, lineNum, errors) {
  if (parts.length < 5) { errors.push(`Line ${lineNum}: not enough columns`); return null; }

  const rawDate = parts[0].trim();
  const rawDesc = parts[1].trim();
  // Amount(SAR) is parts[4], format: "-51.00 SAR"
  const rawAmount = parts[4].replace(/[^\d.\-]/g, '').trim();

  const date = parseDate(rawDate);
  if (!date) { errors.push(`Line ${lineNum}: invalid date "${rawDate}"`); return null; }

  const amount = parseFloat(rawAmount);
  if (isNaN(amount)) { errors.push(`Line ${lineNum}: invalid amount "${parts[4]}"`); return null; }
  if (amount === 0) return null;

  return { date, rawDesc, amount };
}

/** Parse debit bank format: Date, Description, Amount SAR, Balance SAR */
function parseDebitLine(parts, lineNum, errors) {
  if (parts.length < 4) { errors.push(`Line ${lineNum}: not enough columns`); return null; }

  const rawDate = parts[0].trim();
  const rawDesc = parts.slice(1, parts.length - 2).join(',').trim();
  const rawAmount = parts[parts.length - 2].replace(/[,]/g, '').trim();

  const date = parseDate(rawDate);
  if (!date) { errors.push(`Line ${lineNum}: invalid date "${rawDate}"`); return null; }

  const amount = parseFloat(rawAmount);
  if (isNaN(amount)) { errors.push(`Line ${lineNum}: invalid amount "${rawAmount}"`); return null; }
  if (amount === 0) return null;

  return { date, rawDesc, amount };
}

/** Parse the entire CSV text into transaction objects */
function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results = [];
  const errors = [];

  const hasHeader = lines[0].toLowerCase().includes('date');
  const format = hasHeader ? detectFormat(lines[0]) : 'debit';
  const dataLines = hasHeader ? lines.slice(1) : lines;

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (!line) continue;

    const parts = parseCSVLine(line);
    const lineNum = i + 2;

    const parsed = format === 'cashback'
      ? parseCashbackLine(parts, lineNum, errors)
      : parseDebitLine(parts, lineNum, errors);

    if (!parsed) continue;
    const { date, rawDesc, amount } = parsed;

    const merchant = extractMerchant(rawDesc);
    const isIncome = amount > 0;
    const category = isIncome ? 'Income' : guessCategory(merchant);

    results.push({
      transaction_date: date,
      description: merchant,
      amount: Math.abs(amount),
      category,
      type: isIncome ? 'income' : 'expense',
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
  const incomeCategories = ['Income', 'Salary', 'Bonus', 'Refund', 'Transfer In', 'Other Income'];

  return (
    <div className="bank-import-container">
      <div className="bank-import-header">
        <h2>🏦 Bank Statement Import</h2>
        <p className="bank-import-subtitle">
          Upload your bank CSV export to automatically add daily transactions. Expenses and income are both imported.
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
            Supports AlRajhi debit, cashback card &amp; advance credit card formats • Auto-detected
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
            <div className="bank-import-count-wrap">
              <span className="bank-import-count">{preview.filter(r => r.type === 'expense').length} expenses</span>
              <span className="bank-import-count bank-import-count-income">{preview.filter(r => r.type === 'income').length} income</span>
            </div>
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
                  <th>Type</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount ({currency})</th>
                  <th>Category</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={row.type === 'income' ? 'bank-import-row-income' : ''}>
                    <td>
                      <span className={`bank-import-type-badge ${row.type === 'income' ? 'badge-income' : 'badge-expense'}`}>
                        {row.type === 'income' ? '💰 Income' : '💸 Expense'}
                      </span>
                    </td>
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
                        {(row.type === 'income' ? incomeCategories : allCategories).map(c => <option key={c} value={c}>{c}</option>)}
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
