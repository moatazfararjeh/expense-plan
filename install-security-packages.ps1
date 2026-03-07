# Install Security Packages Script
# This script installs all required security packages

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Security Packages Installation       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "backend\package.json")) {
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

Write-Host ""
Write-Host "This script will install the following security packages:" -ForegroundColor White
Write-Host "  1. express-rate-limit   - Protection against brute force attacks" -ForegroundColor Gray
Write-Host "  2. helmet               - Security headers" -ForegroundColor Gray
Write-Host "  3. express-validator    - Input validation" -ForegroundColor Gray
Write-Host "  4. xss-clean            - XSS protection" -ForegroundColor Gray
Write-Host "  5. express-mongo-sanitize - NoSQL injection protection" -ForegroundColor Gray
Write-Host "  6. winston              - Security logging" -ForegroundColor Gray
Write-Host "  7. morgan               - HTTP request logging" -ForegroundColor Gray
Write-Host ""

$confirmation = Read-Host "Do you want to proceed? (yes/no)"

if ($confirmation -ne "yes") {
    Write-Host ""
    Write-Host "Installation cancelled by user" -ForegroundColor Yellow
    pause
    exit 0
}

Write-Host ""
Write-Host "Starting installation..." -ForegroundColor Cyan
Write-Host ""

# Change to backend directory
Push-Location backend

try {
    Write-Host "Installing security packages..." -ForegroundColor Yellow
    Write-Host ""
    
    # Install all packages at once
    npm install express-rate-limit helmet express-validator xss-clean express-mongo-sanitize winston morgan
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Installation completed successfully!  " -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Installed packages:" -ForegroundColor Cyan
        Write-Host "  ✓ express-rate-limit" -ForegroundColor Green
        Write-Host "  ✓ helmet" -ForegroundColor Green
        Write-Host "  ✓ express-validator" -ForegroundColor Green
        Write-Host "  ✓ xss-clean" -ForegroundColor Green
        Write-Host "  ✓ express-mongo-sanitize" -ForegroundColor Green
        Write-Host "  ✓ winston" -ForegroundColor Green
        Write-Host "  ✓ morgan" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Review SECURITY_FIXES_GUIDE.md for implementation" -ForegroundColor White
        Write-Host "  2. Update your server.js with security configurations" -ForegroundColor White
        Write-Host "  3. Test your application" -ForegroundColor White
        Write-Host "  4. Generate new secret keys for production" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "  Installation failed!                  " -ForegroundColor Red
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
