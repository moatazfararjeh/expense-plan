# Encrypt Existing Data in Database
# This script encrypts all existing financial amounts in the database

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Expense Plan - Data Encryption Tool  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "backend\encryptExistingData.js")) {
    Write-Host "Error: This script must be run from the project root directory" -ForegroundColor Red
    Write-Host "Current directory: $PWD" -ForegroundColor Yellow
    pause
    exit 1
}

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}

# Check if .env file exists
if (-not (Test-Path "backend\.env")) {
    Write-Host "✗ .env file not found in backend directory" -ForegroundColor Red
    Write-Host "Please create a .env file with ENCRYPTION_KEY" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host ""
Write-Host "WARNING: This script will encrypt all financial amounts in your database" -ForegroundColor Yellow
Write-Host ""
Write-Host "Before proceeding, make sure you have:" -ForegroundColor White
Write-Host "  1. Set a secure ENCRYPTION_KEY in backend\.env" -ForegroundColor White
Write-Host "  2. Created a backup of your database" -ForegroundColor White
Write-Host "  3. Stopped the backend server" -ForegroundColor White
Write-Host ""

$confirmation = Read-Host "Do you want to proceed? (yes/no)"

if ($confirmation -ne "yes") {
    Write-Host ""
    Write-Host "Operation cancelled by user" -ForegroundColor Yellow
    pause
    exit 0
}

Write-Host ""
Write-Host "Step 1: Updating database schema..." -ForegroundColor Cyan
Write-Host ""

# Change to backend directory
Push-Location backend

try {
    # First, update database schema to support encrypted values
    Write-Host "Converting database columns from NUMERIC to TEXT..." -ForegroundColor Yellow
    node updateDatabaseForEncryption.js
    
    if ($LASTEXITCODE -ne 0) {
        throw "Database schema update failed"
    }
    
    Write-Host ""
    Write-Host "✓ Database schema updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Step 2: Encrypting existing data..." -ForegroundColor Cyan
    Write-Host ""
    
    # Then, run the encryption script
    node encryptExistingData.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Encryption completed successfully!   " -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Restart your backend server" -ForegroundColor White
        Write-Host "  2. Test the application to verify everything works" -ForegroundColor White
        Write-Host "  3. Keep a secure backup of your ENCRYPTION_KEY" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "  Encryption failed!                   " -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please check the error messages above" -ForegroundColor Yellow
        Write-Host ""
    }
} catch {
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
} finally {
    # Return to original directory
    Pop-Location
}

Write-Host ""
pause
