# ======================================
# Fix Backend IIS Issues
# ======================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Fixing Backend API Issues" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", "cd 'C:\Mutaz\Expense Plan'; .\fix-backend-issues.ps1"
    exit
}

Write-Host "[1] Checking recent Windows Event Logs for IIS errors..." -ForegroundColor Yellow
$logs = Get-EventLog -LogName Application -Source "iisnode" -Newest 5 -ErrorAction SilentlyContinue
if ($logs) {
    Write-Host "Recent iisnode errors:" -ForegroundColor Red
    $logs | ForEach-Object {
        Write-Host "Time: $($_.TimeGenerated)" -ForegroundColor Gray
        Write-Host "Message: $($_.Message)" -ForegroundColor White
        Write-Host ""
    }
} else {
    Write-Host "[INFO] No recent iisnode errors found in Event Log" -ForegroundColor Green
}
Write-Host ""

Write-Host "[2] Restarting IIS..." -ForegroundColor Yellow
iisreset /restart
Write-Host "[OK] IIS restarted" -ForegroundColor Green
Write-Host ""

Write-Host "[3] Testing backend endpoint..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK] Backend is responding: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Backend error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Checking for iisnode logs..." -ForegroundColor Yellow
    
    if (Test-Path "C:\inetpub\wwwroot\expense-plan-api\iisnode") {
        $logs = Get-ChildItem "C:\inetpub\wwwroot\expense-plan-api\iisnode" -Filter "*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($logs) {
            Write-Host "Latest log: $($logs.Name)" -ForegroundColor Cyan
            Write-Host ""
            Get-Content $logs.FullName -Tail 30
        }
    } else {
        Write-Host "[INFO] No iisnode logs directory found yet" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "1. If error persists, check: C:\inetpub\wwwroot\expense-plan-api\iisnode" -ForegroundColor White
Write-Host "2. Verify PostgreSQL is running: Get-Service postgresql*" -ForegroundColor White
Write-Host "3. Check backend .env file has correct database credentials" -ForegroundColor White
Write-Host "4. Open browser: http://localhost:3000" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"
