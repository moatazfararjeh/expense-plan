# Rebuild and redeploy frontend with port 5001

Write-Host "=== Rebuilding Frontend ===" -ForegroundColor Cyan
Write-Host ""

Set-Location "C:\Mutaz\Expense Plan\frontend"

# Build frontend
Write-Host "[1] Building frontend..." -ForegroundColor Yellow
Write-Host "    This may take a minute..." -ForegroundColor Gray
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "    [OK] Build completed" -ForegroundColor Green
} else {
    Write-Host "    [ERROR] Build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Copy to IIS
Write-Host "[2] Deploying to IIS..." -ForegroundColor Yellow
$destination = "C:\inetpub\wwwroot\expense-plan-app"

try {
    Copy-Item -Path "build\*" -Destination $destination -Recurse -Force
    Write-Host "    [OK] Files copied to IIS" -ForegroundColor Green
} catch {
    Write-Host "    [ERROR] Copy failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "    You may need to run as Administrator" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Frontend Updated!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend now calls backend directly on port 5001" -ForegroundColor White
Write-Host "(bypassing IIS proxy CORS issue)" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Refresh your browser (Ctrl+F5 to clear cache)" -ForegroundColor White
Write-Host "2. Try registration/login again" -ForegroundColor White
Write-Host "3. CORS error should be gone!" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to exit"
