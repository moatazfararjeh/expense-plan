# Test Encryption System
# This script runs tests to verify the encryption system is working correctly

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Encryption System Test Suite         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "backend\testEncryption.js")) {
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
Write-Host "Running encryption tests..." -ForegroundColor Cyan
Write-Host ""

# Change to backend directory
Push-Location backend

try {
    # Run the test script
    node testEncryption.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  All tests passed successfully!       " -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your encryption system is working correctly." -ForegroundColor Green
        Write-Host "You can now proceed to encrypt your existing data." -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "  Some tests failed!                   " -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please check the error messages above and fix any issues." -ForegroundColor Yellow
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
