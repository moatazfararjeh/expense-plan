# Test iisnode with minimal configuration

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$logFile = "C:\Mutaz\Expense Plan\iisnode-test-log.txt"

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Write-Host "Output will be saved to: $logFile" -ForegroundColor Cyan
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", "& '$PSCommandPath' | Tee-Object -FilePath '$logFile'"
    
    # Wait for log file and display it
    Start-Sleep -Seconds 3
    $timeout = 15
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        if (Test-Path $logFile) {
            Write-Host ""
            Write-Host "=== Test Output ===" -ForegroundColor Cyan
            Get-Content $logFile
            break
        }
        Start-Sleep -Seconds 1
        $elapsed++
    }
    exit
}

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "IISNode Test" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$apiPath = "C:\inetpub\wwwroot\expense-plan-api"

# Backup current web.config
Write-Host "[1] Backing up current web.config..." -ForegroundColor Yellow
Copy-Item "$apiPath\web.config" "$apiPath\web.config.backup" -Force
Write-Host "[OK] Backup created" -ForegroundColor Green
Write-Host ""

# Use test web.config
Write-Host "[2] Installing test configuration..." -ForegroundColor Yellow
Copy-Item "$apiPath\test-web.config" "$apiPath\web.config" -Force
Write-Host "[OK] Test config installed" -ForegroundColor Green
Write-Host ""

# Restart IIS
Write-Host "[3] Recycling app pool..." -ForegroundColor Yellow
Import-Module WebAdministration
Restart-WebAppPool -Name "ExpensePlanAPI"
Start-Sleep -Seconds 2
Write-Host "[OK] App pool recycled" -ForegroundColor Green
Write-Host ""

# Test the endpoint
Write-Host "[4] Testing with minimal configuration..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK] SUCCESS! iisnode is working!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host $response.Content
} catch {
    Write-Host "[ERROR] Still failing: $($_.Exception.Message)" -ForegroundColor Red
    
    # Check for logs
    Write-Host ""
    Write-Host "Checking for iisnode logs..." -ForegroundColor Yellow
    $logPath = "$apiPath\iisnode"
    if (Test-Path $logPath) {
        $logs = Get-ChildItem $logPath -Filter "*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($logs) {
            Write-Host "Found log: $($logs.Name)" -ForegroundColor Cyan
            Write-Host "--- Last 50 lines ---" -ForegroundColor Cyan
            Get-Content $logs.FullName -Tail 50
        } else {
            Write-Host "[ERROR] No log files - iisnode is not creating logs" -ForegroundColor Red
        }
    } else {
        Write-Host "[ERROR] No iisnode directory - iisnode not being invoked" -ForegroundColor Red
        
        Write-Host ""
        Write-Host "Checking Windows Event Log for errors..." -ForegroundColor Yellow
        Get-EventLog -LogName Application -Source "iisnode*" -Newest 5 -ErrorAction SilentlyContinue | Format-List TimeGenerated, EntryType, Message
    }
}
Write-Host ""

# Restore original web.config
Write-Host "[5] Restoring original web.config..." -ForegroundColor Yellow
Copy-Item "$apiPath\web.config.backup" "$apiPath\web.config" -Force
Write-Host "[OK] Original config restored" -ForegroundColor Green
Write-Host ""

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Test complete!" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
