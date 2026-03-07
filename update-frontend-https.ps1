# Update Frontend for HTTPS
# This script updates frontend configuration to use HTTPS

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Update Frontend for HTTPS             " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AuthContext.js exists
$authContextPath = "frontend\src\context\AuthContext.js"
if (-not (Test-Path $authContextPath)) {
    Write-Host "❌ AuthContext.js not found!" -ForegroundColor Red
    Write-Host "Path: $authContextPath" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Current API configuration:" -ForegroundColor Yellow
Write-Host ""

# Read current file
$content = Get-Content $authContextPath -Raw

# Extract current API URLs
$httpMatches = [regex]::Matches($content, "http://localhost:\d+")
if ($httpMatches.Count -gt 0) {
    Write-Host "Found HTTP URLs:" -ForegroundColor White
    $httpMatches | ForEach-Object { Write-Host "  - $($_.Value)" -ForegroundColor Gray }
} else {
    Write-Host "No HTTP URLs found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Do you want to update to HTTPS?" -ForegroundColor Yellow
Write-Host "  Current: http://localhost:5002" -ForegroundColor Red
Write-Host "  New:     https://localhost:5003" -ForegroundColor Green
Write-Host ""

$confirmation = Read-Host "Update to HTTPS? (yes/no)"

if ($confirmation -ne "yes") {
    Write-Host "Update cancelled" -ForegroundColor Yellow
    pause
    exit 0
}

Write-Host ""
Write-Host "Creating backup..." -ForegroundColor Yellow
$backupPath = $authContextPath + ".backup." + (Get-Date -Format "yyyyMMdd_HHmmss")
Copy-Item $authContextPath $backupPath
Write-Host "✓ Backup created: $backupPath" -ForegroundColor Green

Write-Host ""
Write-Host "Updating API URLs..." -ForegroundColor Yellow

# Replace all occurrences of http://localhost:5002 with https://localhost:5003
$newContent = $content -replace "http://localhost:5002", "https://localhost:5003"

# Also update any other common HTTP references
$newContent = $newContent -replace "http://localhost:5000", "https://localhost:5003"

Set-Content $authContextPath $newContent

Write-Host "✓ Updated AuthContext.js" -ForegroundColor Green

# Create or update .env file
Write-Host ""
Write-Host "Creating frontend .env file..." -ForegroundColor Yellow

$frontendEnvPath = "frontend\.env"
$envContent = @"
# API Configuration
REACT_APP_API_URL=https://localhost:5003

# HTTPS Configuration for Development
HTTPS=true

# Browser Configuration
BROWSER=none

# Note: SSL certificates are in ../backend/ssl/
"@

Set-Content $frontendEnvPath $envContent
Write-Host "✓ Created/Updated frontend\.env" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Frontend Updated Successfully!        " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Changes made:" -ForegroundColor Cyan
Write-Host "  ✓ API URLs changed to HTTPS" -ForegroundColor White
Write-Host "  ✓ Backup created: $backupPath" -ForegroundColor White
Write-Host "  ✓ .env file created with HTTPS config" -ForegroundColor White
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start HTTPS backend server:" -ForegroundColor White
Write-Host "     .\start-backend-https.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Rebuild and restart frontend:" -ForegroundColor White
Write-Host "     cd frontend" -ForegroundColor Gray
Write-Host "     npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Access app at:" -ForegroundColor White
Write-Host "     https://localhost:3000" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  Important:" -ForegroundColor Yellow
Write-Host "   You may need to accept security warnings" -ForegroundColor Yellow
Write-Host "   for both backend (5003) and frontend (3000)" -ForegroundColor Yellow
Write-Host ""

Write-Host "To revert changes:" -ForegroundColor Cyan
Write-Host "  Copy-Item `"$backupPath`" `"$authContextPath`" -Force" -ForegroundColor Gray
Write-Host ""

pause
