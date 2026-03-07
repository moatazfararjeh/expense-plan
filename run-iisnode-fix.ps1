# This wrapper runs the fix script and captures output to a log file
$logFile = "C:\Mutaz\Expense Plan\iisnode-fix-log.txt"
$scriptPath = "C:\Mutaz\Expense Plan\fix-iisnode-config.ps1"

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Write-Host "Output will be saved to: $logFile" -ForegroundColor Cyan
    
    # Run elevated and output to log file
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", "& '$scriptPath' | Tee-Object -FilePath '$logFile'"
    
    # Wait a moment then tail the log
    Start-Sleep -Seconds 3
    Write-Host ""
    Write-Host "Monitoring output..." -ForegroundColor Yellow
    Write-Host "=================================" -ForegroundColor Cyan
    
    # Monitor the log file
    $timeout = 30
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        if (Test-Path $logFile) {
            Get-Content $logFile
            break
        }
        Start-Sleep -Seconds 1
        $elapsed++
    }
    
    if (Test-Path $logFile) {
        Write-Host ""
        Write-Host "Full output saved to: $logFile" -ForegroundColor Green
        Write-Host "Check the Administrator window for completion" -ForegroundColor Yellow
    }
} else {
    # Already admin, just run it
    & $scriptPath | Tee-Object -FilePath $logFile
}
