# Authentication Setup Guide

## 🎉 User Login System Added!

Your expense planner now has user authentication! Each user will have their own account with separate expense data.

## Quick Setup Steps

### 1. Update Database Password

Open the file: `backend\.env`

Change this line:
```
DB_PASSWORD=your_password_here
```

To your actual PostgreSQL password. For example:
```
DB_PASSWORD=mypassword123
```

### 2. Initialize Database with Authentication

Run this command:
```bash
cd backend
node initDbWithAuth.js
```

You should see: "Database tables with authentication created successfully!"

### 3. Install Dependencies (if not done already)

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
node server.js
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### 5. Use the Application

1. Open http://localhost:3000
2. You'll see the **Login** screen
3. Click "Register here" to create a new account
4. Fill in:
   - Username (e.g., "john")
   - Email (e.g., "john@example.com")
   - Password (minimum 6 characters)
5. Click "Register"
6. You'll be automatically logged in!

## Features Added

✅ **User Registration** - Create your own account
✅ **User Login** - Secure authentication with JWT tokens
✅ **Password Security** - Passwords are encrypted with bcrypt
✅ **Session Management** - Stay logged in for 7 days
✅ **Personal Data** - Each user has their own expenses and transactions
✅ **Logout** - Secure logout functionality

## Database Changes

The database now includes:
- **users** table - Store user accounts
- **user_id** foreign keys - Link all expenses to specific users
- **JWT tokens** - Secure authentication
- **Password hashing** - Encrypted passwords

## API Endpoints

### Public Routes (No login required):
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Protected Routes (Login required):
- `GET /api/auth/me` - Get current user info
- `GET /api/settings` - Get user salary settings
- `POST /api/settings` - Update salary
- `GET /api/monthly-expenses` - Get user's monthly expenses
- `POST /api/monthly-expenses` - Add monthly expense
- `DELETE /api/monthly-expenses/:id` - Delete monthly expense
- `GET /api/transactions` - Get user's transactions
- `POST /api/transactions` - Add transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/summary` - Get user's financial summary

## Security Features

- **Passwords** are hashed using bcrypt (10 rounds)
- **JWT tokens** expire after 7 days
- **Protected routes** require valid authentication token
- **User isolation** - Users can only see their own data

## Testing the Authentication

### Create Test Accounts:

**User 1:**
- Username: john
- Email: john@example.com
- Password: john123

**User 2:**
- Username: jane
- Email: jane@example.com
- Password: jane123

Each user will have completely separate expense data!

## Troubleshooting

### "Password authentication failed"
- Update the `DB_PASSWORD` in `backend/.env` with your PostgreSQL password

### "Cannot find module 'bcrypt'" or "Cannot find module 'jsonwebtoken'"
- Run `npm install` in the backend folder

### "Invalid token" or "Access token required"
- Your session expired, please login again

### Old data disappeared
- The new database schema recreated the tables with user authentication
- Old data was cleared (expected behavior)
- Each user now has their own separate data

## What Changed?

### Backend:
- Added authentication middleware
- Added JWT token generation/verification
- Added bcrypt password hashing
- Updated all routes to require authentication
- Added user_id to all database tables

### Frontend:
- Added Login component
- Added Register component
- Added AuthContext for state management
- Updated all API calls to include JWT token
- Added user info display and logout button

## Next Steps

1. Update your PostgreSQL password in `backend/.env`
2. Run `node initDbWithAuth.js` to create the database tables
3. Start both servers
4. Register your account and start tracking expenses!

Enjoy your personalized expense planning application! 💰
