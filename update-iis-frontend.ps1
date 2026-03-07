# ======================================
# Update IIS Frontend Build
# ======================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Update IIS Frontend" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

$sourcePath = "C:\Mutaz\Expense Plan\frontend\build"
$destPath = "C:\inetpub\wwwroot\expense-plan-app"

Write-Host "Source: $sourcePath" -ForegroundColor Yellow
Write-Host "Destination: $destPath" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path $sourcePath)) {
    Write-Host "[ERROR] Source build folder not found!" -ForegroundColor Red
    Write-Host "Please run 'npm run build' in the frontend folder first" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "Copying files to IIS..." -ForegroundColor Yellow
try {
    robocopy $sourcePath $destPath /MIR /XD node_modules /R:3 /W:1
    if ($LASTEXITCODE -le 7) {
        Write-Host ""
        Write-Host "[OK] Frontend deployed to IIS" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Robocopy exit code: $LASTEXITCODE" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Failed to copy files: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""
Write-Host "Restarting IIS..." -ForegroundColor Yellow
iisreset /noforce | Out-Null
Write-Host "[OK] IIS restarted" -ForegroundColor Green

Write-Host ""
Write-Host "=================================" -ForegroundColor Green
Write-Host "Frontend Updated!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access the app at: https://localhost:2001" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
