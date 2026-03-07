# Expense Plan - Database Migration Script
# Adds encryption_key_wrapped column to users table

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Expense Plan - Database Migration" -ForegroundColor Cyan
Write-Host "  Adding Encryption Key Column" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to backend directory
Set-Location -Path "backend"

Write-Host "Running migration script..." -ForegroundColor Yellow
Write-Host ""

# Run the migration
node addEncryptionKeyColumn.js

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "Migration completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check the output above for any errors" -ForegroundColor White
Write-Host "2. Restart your backend server" -ForegroundColor White
Write-Host "3. Test user registration" -ForegroundColor White
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Return to root directory
Set-Location -Path ".."

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
