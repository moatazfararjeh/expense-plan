# Generate Secure Keys Script
# This script generates cryptographically secure random keys

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Secure Keys Generator                 " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  IMPORTANT:" -ForegroundColor Yellow
Write-Host "   Keep these keys SAFE and PRIVATE!" -ForegroundColor Yellow
Write-Host "   Save them in a secure location before using" -ForegroundColor Yellow
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
} catch {
    Write-Host "✗ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Generating secure keys..." -ForegroundColor Cyan
Write-Host ""

# Generate JWT_SECRET (64 bytes = 128 hex characters)
Write-Host "1. JWT_SECRET (for authentication tokens):" -ForegroundColor White
Write-Host "   Length: 64 bytes (128 hex chars)" -ForegroundColor Gray
$jwtSecret = node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
Write-Host "   $jwtSecret" -ForegroundColor Green
Write-Host ""

# Generate ENCRYPTION_KEY (32 bytes = 64 hex characters for AES-256)
Write-Host "2. ENCRYPTION_KEY (for financial data encryption):" -ForegroundColor White
Write-Host "   Length: 32 bytes (64 hex chars)" -ForegroundColor Gray
$encryptionKey = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Write-Host "   $encryptionKey" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to update .env file
$updateEnv = Read-Host "Do you want to update backend/.env file automatically? (yes/no)"

if ($updateEnv -eq "yes") {
    Write-Host ""
    Write-Host "Backing up current .env file..." -ForegroundColor Yellow
    
    $envPath = "backend\.env"
    $backupPath = "backend\.env.backup." + (Get-Date -Format "yyyyMMdd_HHmmss")
    
    if (Test-Path $envPath) {
        Copy-Item $envPath $backupPath
        Write-Host "✓ Backup created: $backupPath" -ForegroundColor Green
    }
    
    Write-Host "Updating .env file..." -ForegroundColor Yellow
    
    # Read current .env
    $envContent = Get-Content $envPath -Raw
    
    # Replace JWT_SECRET
    $envContent = $envContent -replace "JWT_SECRET=.*", "JWT_SECRET=$jwtSecret"
    
    # Replace ENCRYPTION_KEY
    $envContent = $envContent -replace "ENCRYPTION_KEY=.*", "ENCRYPTION_KEY=$encryptionKey"
    
    # Write back
    Set-Content $envPath $envContent
    
    Write-Host "✓ .env file updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT:" -ForegroundColor Yellow
    Write-Host "  - Your old .env is backed up at: $backupPath" -ForegroundColor White
    Write-Host "  - Keep the backup safe in case you need to restore" -ForegroundColor White
    Write-Host "  - If you have existing encrypted data, DO NOT change ENCRYPTION_KEY" -ForegroundColor Red
    Write-Host "    or you will lose access to your encrypted data!" -ForegroundColor Red
    Write-Host ""
    
} else {
    Write-Host ""
    Write-Host "Manual Setup Instructions:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Add these lines to your backend/.env file:" -ForegroundColor White
    Write-Host ""
    Write-Host "JWT_SECRET=$jwtSecret" -ForegroundColor Yellow
    Write-Host "ENCRYPTION_KEY=$encryptionKey" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Additional Recommendations:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 📝 Save these keys in a password manager" -ForegroundColor White
Write-Host "2. 🔒 Never commit .env file to Git" -ForegroundColor White
Write-Host "3. 💾 Keep offline backups of your keys" -ForegroundColor White
Write-Host "4. 🔄 Rotate keys periodically (every 6-12 months)" -ForegroundColor White
Write-Host "5. 📧 Use different keys for development and production" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  WARNING:" -ForegroundColor Red
Write-Host "   If you already have encrypted data in your database," -ForegroundColor Red
Write-Host "   changing ENCRYPTION_KEY will make that data unreadable!" -ForegroundColor Red
Write-Host ""

pause
