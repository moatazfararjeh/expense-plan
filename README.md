# Expense Planning Application

A full-stack web application for managing and planning your expenses over a year.

## Features

- Set monthly salary
- Define monthly recurring expenses (school, housing, loans, etc.)
- Plan expenses for one year
- Track daily transactions
- View projected savings
- Visual dashboard with charts

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js with Express
- **Database**: PostgreSQL

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Database Setup

1. Install PostgreSQL and create a database:
```sql
CREATE DATABASE expense_plan;
```

2. Update database credentials in `backend/.env`

### Installation

1. Install all dependencies:
```bash
npm run install-all
```

2. Set up the database:
```bash
cd backend
node initDb.js
```

3. Start the backend server:
```bash
npm run server
```

4. In a new terminal, start the frontend:
```bash
npm run client
```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Set Your Salary**: Enter your monthly salary
2. **Add Monthly Expenses**: Add recurring expenses like school fees, housing, loans
3. **Track Daily Transactions**: Add daily expenses as they occur
4. **View Projections**: See your yearly savings projection and expense breakdown
