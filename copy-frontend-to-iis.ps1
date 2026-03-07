# Copy frontend build to IIS

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-File", $PSCommandPath
    exit
}

Write-Host "=== Copying Frontend to IIS ===" -ForegroundColor Cyan
Write-Host ""

$source = "C:\Mutaz\Expense Plan\frontend\build"
$destination = "C:\inetpub\wwwroot\expense-plan-app"

if (Test-Path $source) {
    Write-Host "[1] Copying files..." -ForegroundColor Yellow
    Write-Host "    From: $source" -ForegroundColor Gray
    Write-Host "    To: $destination" -ForegroundColor Gray
    
    Copy-Item -Path "$source\*" -Destination $destination -Recurse -Force
    Write-Host "    [OK] Files copied" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Build folder not found!" -ForegroundColor Red
    Write-Host "Please run: npm run build" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[2] Verifying..." -ForegroundColor Yellow
$indexPath = "$destination\index.html"
if (Test-Path $indexPath) {
    $lastWrite = (Get-Item $indexPath).LastWriteTime
    Write-Host "    index.html updated: $lastWrite" -ForegroundColor Green
} else {
    Write-Host "    [ERROR] index.html not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Deployment Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend now uses port 5001 (direct to Node.js)" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow -BackgroundColor DarkRed
Write-Host "  Press Ctrl+F5 in your browser to refresh!" -ForegroundColor White
Write-Host "  (Hard refresh clears cache)" -ForegroundColor Gray
Write-Host ""
Write-Host "Then try registration/login again" -ForegroundColor White
Write-Host "CORS error should be resolved!" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to exit"
