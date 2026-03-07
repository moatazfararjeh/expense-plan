# Quick Start Script for PowerShell
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Setting up Expense Planner" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Prompt for PostgreSQL password
$DB_PASSWORD = Read-Host "Enter your PostgreSQL password"

# Update .env file
Set-Location backend
@"
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_plan
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=your-secret-jwt-key-change-this-in-production
"@ | Out-File -FilePath .env -Encoding UTF8

Write-Host ""
Write-Host "✅ Database configuration updated!" -ForegroundColor Green
Write-Host ""
Write-Host "Initializing database tables..." -ForegroundColor Yellow
node initDbWithAuth.js

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Database initialization failed!" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "1. PostgreSQL is installed and running" -ForegroundColor Yellow
    Write-Host "2. Database 'expense_plan' exists" -ForegroundColor Yellow
    Write-Host "3. Password is correct" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "✅ Database initialized successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node server.js"

Set-Location ..
Write-Host ""
Write-Host "Starting frontend..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm start"

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:5000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit setup..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
