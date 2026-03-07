# Run Frontend Directly (No IIS) - Requires Admin to stop IIS

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-File", $PSCommandPath
    exit
}

Write-Host "=== Starting Frontend Directly ===" -ForegroundColor Cyan
Write-Host ""

# Stop IIS to free port 3000
Write-Host "[1] Stopping IIS..." -ForegroundColor Yellow
try {
    Stop-Service W3SVC -Force -ErrorAction Stop
    Write-Host "    [OK] IIS stopped" -ForegroundColor Green
} catch {
    Write-Host "    [INFO] IIS already stopped or not running" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[2] Starting frontend server on port 3000..." -ForegroundColor Yellow
Write-Host ""

# Change to frontend directory and run serve
Set-Location "C:\Mutaz\Expense Plan\frontend"

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Frontend is now running at:" -ForegroundColor Green
Write-Host "  http://localhost:3000" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Run serve
npx serve -s build -l 3000
