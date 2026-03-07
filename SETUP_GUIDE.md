# Complete Setup Guide for Expense Planning Application

## Step-by-Step Installation

### 1. Install PostgreSQL

**Download and Install:**
- Visit https://www.postgresql.org/download/windows/
- Download and run the installer
- During installation, remember the password you set for the 'postgres' user
- Default port is 5432 (keep this)

**Create Database:**
After installation, open pgAdmin or SQL Shell (psql) and run:
```sql
CREATE DATABASE expense_plan;
```

### 2. Configure Backend

**Update Database Credentials:**
Edit `backend/.env` file and update with your PostgreSQL password:
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_plan
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE
```

### 3. Install Dependencies

**Open PowerShell or Command Prompt in the project root folder:**

```bash
# Install backend dependencies
cd backend
npm install

# Go back and install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### 4. Initialize Database Tables

```bash
cd backend
node initDb.js
```

You should see: "Database tables created successfully!"

### 5. Start the Application

**Terminal 1 - Start Backend Server:**
```bash
cd backend
node server.js
```

You should see: "Server is running on port 5000"

**Terminal 2 - Start Frontend (open a new terminal):**
```bash
cd frontend
npm start
```

The app will automatically open in your browser at http://localhost:3000

## Using the Application

### 1. Set Your Monthly Salary
- Enter your monthly salary (e.g., 30000)
- Click "Update Salary"

### 2. Add Monthly Recurring Expenses
- Enter expense name (e.g., "School fees")
- Enter amount (e.g., 2000)
- Select category
- Click "Add Expense"

Common examples:
- School: 2000
- Housing: 3000
- Loan: 3500

### 3. Track Daily Transactions
- Add daily expenses as they occur
- Enter description, amount, date, and category
- Click "Add Transaction"

### 4. View Your Projections
The app automatically calculates:
- Monthly net income
- Yearly projections
- Total savings for the year
- Visual charts and breakdowns

## Troubleshooting

### Database Connection Error
- Make sure PostgreSQL is running
- Check that the credentials in `backend/.env` are correct
- Verify the database 'expense_plan' exists

### Port Already in Use
If port 5000 or 3000 is already in use:
- Backend: Change PORT in `backend/.env`
- Frontend: It will prompt you to use a different port automatically

### Module Not Found Errors
Run `npm install` again in the respective folder (backend or frontend)

## Example Data to Get Started

Here's some sample data to test:

**Monthly Salary:** 30000

**Monthly Expenses:**
- School fees: 2000 (School)
- Housing rent: 3000 (Housing)
- Car loan: 3500 (Loan)
- Electricity: 200 (Utilities)
- Internet: 100 (Utilities)

**Daily Transactions:**
- Grocery shopping: 150 (Food)
- Gas: 50 (Transportation)
- Restaurant: 75 (Food)
- Movie tickets: 40 (Entertainment)

After entering this data, you'll see:
- Monthly recurring: 8800
- Monthly net: 21200
- Yearly salary: 360000
- Yearly savings will depend on your daily transactions

## Features Overview

✅ Set and update monthly salary
✅ Manage recurring monthly expenses
✅ Track daily transactions with dates
✅ Automatic yearly savings calculation
✅ Visual charts and graphs
✅ Category-based expense breakdown
✅ Responsive design for mobile and desktop

## Technology Stack

- **Frontend:** React.js with Recharts for visualizations
- **Backend:** Node.js with Express
- **Database:** PostgreSQL
- **API:** RESTful API architecture

Enjoy planning your expenses! 💰
