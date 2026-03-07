# Settings Feature - Currency and Category Management

## Overview
The Settings feature allows users to customize their expense planning application with their own currency and expense categories. All changes are saved per user and applied across all components of the application.

## Features

### 1. Currency Customization
- **Set Custom Currency**: Users can set any currency symbol or code (SAR, USD, EUR, £, ¥, etc.)
- **Global Application**: The currency is displayed consistently across:
  - Monthly Expenses
  - Daily Transactions
  - Monthly Projection
  - Financial Summary
  - Expense Charts
- **Default Currency**: SAR (Saudi Riyal)

### 2. Category Management
- **Add Categories**: Create custom expense categories that match your financial structure
- **Delete Categories**: Remove categories you no longer need
- **Reorder Categories**: Use up/down arrows to organize categories in your preferred order
- **Default Categories**: 
  - Jordan Family Expense
  - Our Expense
  - Loan Sabb
  - Other

## How to Use

### Accessing Settings
1. Log in to your expense planning application
2. Click the **"Settings"** button in the header (next to Logout)
3. The Settings page will open, replacing the dashboard view

### Changing Currency
1. Open Settings
2. Find the "Currency" section
3. Enter your preferred currency symbol or code in the input field
   - Examples: SAR, USD, EUR, GBP, £, ¥, ₹
   - Maximum 10 characters
4. Click **"Save Settings"** at the bottom
5. Page will reload automatically with your new currency

### Managing Categories

#### Adding a Category
1. Open Settings
2. Scroll to "Expense Categories" section
3. Type the category name in the "Add new category" input field
4. Press Enter or click **"Add Category"** button
5. The category appears in the list

#### Deleting a Category
1. Find the category in the list
2. Click the **✕** (X) button on the right side
3. Category is removed immediately

#### Reordering Categories
1. Use the **▲** (up arrow) to move a category higher in the list
2. Use the **▼** (down arrow) to move a category lower in the list
3. The order affects how categories appear in dropdown menus throughout the app

#### Saving Changes
1. After making all desired changes
2. Click **"Save Settings"** button at the bottom
3. A success message will appear
4. Page will automatically reload to apply settings

## Technical Details

### Database Schema
```sql
-- user_settings table structure
CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  monthly_salary DECIMAL(10, 2) NOT NULL,
  opening_balance DECIMAL(10, 2),
  plan_start_date DATE,
  currency VARCHAR(10) DEFAULT 'SAR',
  categories TEXT DEFAULT '["Jordan Family Expense","Our Expense","Loan Sabb","Other"]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

#### GET /api/settings
- **Purpose**: Retrieve user settings including currency and categories
- **Authentication**: Required (Bearer token)
- **Response**:
```json
{
  "id": 1,
  "user_id": 1,
  "monthly_salary": 10000,
  "opening_balance": 5000,
  "plan_start_date": "2026-01-01",
  "currency": "SAR",
  "categories": ["Jordan Family Expense", "Our Expense", "Loan Sabb", "Other"],
  "created_at": "2026-02-14T00:00:00.000Z",
  "updated_at": "2026-02-14T00:00:00.000Z"
}
```

#### POST /api/settings
- **Purpose**: Update user settings (creates if not exists)
- **Authentication**: Required (Bearer token)
- **Request Body**:
```json
{
  "monthly_salary": 10000,
  "opening_balance": 5000,
  "plan_start_date": "2026-01-01",
  "currency": "USD",
  "categories": ["Housing", "Food", "Transportation", "Entertainment"]
}
```
- **Response**: Same as GET /api/settings

### Component Updates

All the following components have been updated to support dynamic currency and categories:

1. **App.js**
   - Loads currency and categories on startup
   - Passes them as props to child components
   - Adds Settings button to header

2. **Settings.js** (New)
   - Complete settings management interface
   - Currency input
   - Category management (add/delete/reorder)
   - Save functionality with page reload

3. **MonthlyExpenses.js**
   - Uses `currency` prop for display
   - Uses `categories` prop for dropdown
   - Dynamic default category (first in list)

4. **DailyTransactions.js**
   - Uses `currency` prop for all amount displays
   - Uses `categories` prop for dropdowns (add and edit)
   - Currency shown in form labels and transaction list

5. **MonthlyProjection.js**
   - `formatCurrency()` function uses dynamic currency
   - All projections display with user's currency

6. **Summary.js**
   - All financial summary values display with dynamic currency

7. **ExpenseChart.js**
   - Chart tooltips and labels use dynamic currency

### Files Modified
```
backend/
  ├── server.js (updated settings endpoints)
  └── addCurrencyAndCategories.js (new migration script)

frontend/src/
  ├── App.js (settings state management)
  ├── App.css (settings button styling)
  └── components/
      ├── Settings.js (NEW)
      ├── MonthlyExpenses.js
      ├── DailyTransactions.js
      ├── MonthlyProjection.js
      ├── Summary.js
      └── ExpenseChart.js
```

## Testing Checklist

### Currency Customization
- [ ] Open Settings and change currency to "USD"
- [ ] Save settings and verify page reloads
- [ ] Check Monthly Expenses show amounts in USD
- [ ] Check Daily Transactions show amounts in USD
- [ ] Check Monthly Projection displays USD throughout
- [ ] Check Summary shows all values in USD
- [ ] Check Expense Charts show USD in tooltips
- [ ] Change currency to "EUR" and verify all displays update

### Category Management
- [ ] Open Settings and add a new category "Healthcare"
- [ ] Verify category appears in the list
- [ ] Save settings and reload
- [ ] Check category appears in Monthly Expenses dropdown
- [ ] Check category appears in Daily Transactions dropdown
- [ ] Check category appears in transaction edit form
- [ ] Add an expense with the new category
- [ ] Verify it saves and displays correctly
- [ ] Delete a category from Settings
- [ ] Save and verify category removed from all dropdowns
- [ ] Reorder categories with up/down arrows
- [ ] Verify new order appears in all dropdown menus

### Edge Cases
- [ ] Try to add duplicate category (should be prevented)
- [ ] Add category with special characters
- [ ] Try very long currency string (10 char limit)
- [ ] Delete all categories except one (ensure at least one remains)
- [ ] Log out and log back in (settings should persist)
- [ ] Create second user account (should have separate settings)

## Troubleshooting

### Settings Not Saving
1. Check browser console for errors
2. Verify backend is running on port 5001
3. Check PostgreSQL database connection
4. Verify JWT token is valid (not expired)

### Categories Not Updating
1. Force refresh browser (Ctrl+F5)
2. Clear browser cache
3. Check that you clicked "Save Settings"
4. Verify the categories column in database has been added

### Currency Not Displaying
1. Ensure you pressed Ctrl+F5 to hard refresh
2. Check that currency prop is being passed to components
3. Verify backend is returning currency in settings API

### Database Migration Issues
If you're upgrading from an older version:
```bash
cd backend
node addCurrencyAndCategories.js
```
This will add the currency and categories columns to existing user_settings table.

## Best Practices

1. **Currency Format**:
   - Use standard currency codes (USD, EUR, GBP) for clarity
   - Or use currency symbols (£, ¥, ₹) if preferred
   - Keep it short (3-4 characters recommended)

2. **Category Organization**:
   - Keep category names clear and descriptive
   - Avoid overly long names (they appear in dropdowns)
   - Order most-used categories at the top
   - Use 4-8 categories for best usability

3. **Data Consistency**:
   - Save settings before adding new expenses
   - Use consistent category names across the application
   - Don't delete categories that have existing data (orphans data)

## Future Enhancements

Potential improvements for future versions:
- Import/export settings feature
- Predefined currency templates by country
- Category usage statistics
- Bulk category operations
- Category color coding
- Currency conversion support
- Multi-currency support for international transactions

## Support

For issues or questions:
1. Check this documentation first
2. Review the Testing Checklist
3. Check browser console for errors
4. Verify database connection and migrations
5. Restart backend server if needed

---

**Last Updated**: February 14, 2026
**Version**: 2.0.0
**Feature**: Settings Management - Currency & Categories
