@echo off
echo ====================================
echo Setting up Expense Planner
echo ====================================
echo.

REM Prompt for PostgreSQL password
set /p DB_PASSWORD="Enter your PostgreSQL password: "

REM Update .env file
cd backend
(
echo PORT=5000
echo DB_HOST=localhost
echo DB_PORT=5432
echo DB_NAME=expense_plan
echo DB_USER=postgres
echo DB_PASSWORD=%DB_PASSWORD%
echo JWT_SECRET=your-secret-jwt-key-change-this-in-production
) > .env

echo.
echo ✅ Database configuration updated!
echo.
echo Initializing database tables...
node initDbWithAuth.js

if %errorlevel% neq 0 (
    echo.
    echo ❌ Database initialization failed!
    echo Please check:
    echo 1. PostgreSQL is installed and running
    echo 2. Database 'expense_plan' exists
    echo 3. Password is correct
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Database initialized successfully!
echo.
echo Starting backend server...
start cmd /k "cd /d %cd% && node server.js"

cd ..
echo.
echo Starting frontend...
timeout /t 3
start cmd /k "cd /d %cd%\frontend && npm start"

echo.
echo ====================================
echo ✅ Setup Complete!
echo ====================================
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit setup...
pause > nul
