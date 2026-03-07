# Fix frontend IIS site

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-File", $PSCommandPath
    exit
}

Write-Host "=== Frontend Site Check ===" -ForegroundColor Cyan
Write-Host ""

Import-Module WebAdministration

# Check if site exists and is running
$site = Get-Website -Name "ExpensePlanApp" -ErrorAction SilentlyContinue

if ($site) {
    Write-Host "Site Status: $($site.State)" -ForegroundColor $(if ($site.State -eq 'Started') { 'Green' } else { 'Yellow' })
    Write-Host "Physical Path: $($site.PhysicalPath)" -ForegroundColor White
    Write-Host "App Pool: $($site.ApplicationPool)" -ForegroundColor Gray
    Write-Host ""
    
    # Check if index.html exists
    $indexPath = Join-Path $site.PhysicalPath "index.html"
    if (Test-Path $indexPath) {
        Write-Host "[OK] index.html found" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] index.html NOT found!" -ForegroundColor Red
        Write-Host "Frontend may not be built" -ForegroundColor Yellow
    }
    
    # Restart site
    Write-Host ""
    Write-Host "Restarting site..." -ForegroundColor Yellow
    if ($site.State -eq 'Started') {
        Stop-Website -Name "ExpensePlanApp"
        Start-Sleep -Seconds 1
    }
    Start-Website -Name "ExpensePlanApp"
    Write-Host "[OK] Site restarted" -ForegroundColor Green
    
    # Restart app pool
    Write-Host "Restarting app pool..." -ForegroundColor Yellow
    Restart-WebAppPool -Name $site.ApplicationPool
    Write-Host "[OK] App pool restarted" -ForegroundColor Green
} else {
    Write-Host "[ERROR] ExpensePlanApp site not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing frontend..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    Write-Host "[OK] Frontend responding! Status: $($r.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Frontend not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit"
