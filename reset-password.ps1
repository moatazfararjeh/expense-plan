# Reset User Password
# This script resets a user's password in the database

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Reset User Password                   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to backend directory
Push-Location backend

try {
    # Run the reset script
    node resetPassword.js
} catch {
    Write-Host ""
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Pop-Location
}

Write-Host ""
pause
