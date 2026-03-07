# Setup Encryption System
# This script performs all necessary steps to enable encryption

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Encryption System Setup Wizard       " -ForegroundColor Cyan
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
Write-Host "This wizard will:" -ForegroundColor White
Write-Host "  1. Update database schema (change NUMERIC to TEXT)" -ForegroundColor White
Write-Host "  2. Encrypt all existing financial data" -ForegroundColor White
Write-Host "  3. Make your data secure in the database" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Before proceeding, make sure you have:" -ForegroundColor Yellow
Write-Host "  ✓ Set a secure ENCRYPTION_KEY in backend\.env" -ForegroundColor White
Write-Host "  ✓ Created a backup of your database" -ForegroundColor White
Write-Host "  ✓ Stopped the backend server" -ForegroundColor White
Write-Host ""

$confirmation = Read-Host "Do you want to proceed? (yes/no)"

if ($confirmation -ne "yes") {
    Write-Host ""
    Write-Host "Operation cancelled by user" -ForegroundColor Yellow
    pause
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Step 1: Update Database Schema       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Converting database columns to support encrypted values..." -ForegroundColor Yellow
Write-Host ""

# Change to backend directory
Push-Location backend

try {
    # Step 1: Update database schema
    node updateDatabaseForEncryption.js
    
    if ($LASTEXITCODE -ne 0) {
        throw "Database schema update failed"
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Step 2: Encrypt Existing Data       " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Encrypting all financial amounts..." -ForegroundColor Yellow
    Write-Host ""
    
    # Step 2: Encrypt existing data
    node encryptExistingData.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Setup completed successfully! ✓      " -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your encryption system is now active!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Restart your backend server" -ForegroundColor White
        Write-Host "  2. Test the application to verify everything works" -ForegroundColor White
        Write-Host "  3. Keep a secure backup of your ENCRYPTION_KEY" -ForegroundColor White
        Write-Host "  4. All financial data is now encrypted in the database" -ForegroundColor White
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Keep your ENCRYPTION_KEY safe!" -ForegroundColor Yellow
        Write-Host "   Without it, you cannot decrypt your data." -ForegroundColor Yellow
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
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Setup failed!                        " -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Your database has NOT been modified." -ForegroundColor Yellow
    Write-Host ""
} finally {
    # Return to original directory
    Pop-Location
}

Write-Host ""
pause
