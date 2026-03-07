# Start Backend Server with HTTPS
# This script starts the HTTPS version of the backend server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting HTTPS Backend Server         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if SSL certificate exists
if (-not (Test-Path "backend\ssl\localhost.crt") -and -not (Test-Path "backend\ssl\localhost.pfx")) {
    Write-Host "❌ SSL certificate not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run the HTTPS setup script first:" -ForegroundColor Yellow
    Write-Host "  .\setup-https.ps1" -ForegroundColor White
    Write-Host ""
    pause
    exit 1
}

# Check if Node.js is installed
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host ""
Write-Host "Starting HTTPS server..." -ForegroundColor Cyan
Write-Host ""

# Change to backend directory and start server
Set-Location "C:\Mutaz\Expense Plan\backend"

try {
    # Start the HTTPS server
    node server-https.js
} catch {
    Write-Host ""
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
pause
