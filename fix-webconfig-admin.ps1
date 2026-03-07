# ======================================
# Fix web.config - Run as Administrator
# ======================================

# This script will request elevation if needed
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", "cd 'C:\Mutaz\Expense Plan'; Copy-Item 'frontend\public\web.config' -Destination 'C:\inetpub\wwwroot\expense-plan-app\' -Force; Write-Host ''; Write-Host 'web.config updated successfully!' -ForegroundColor Green; Write-Host 'Now refresh your browser: http://localhost:3000' -ForegroundColor Cyan; Write-Host ''"
    exit
}

# If already admin, just copy the file
Copy-Item "C:\Mutaz\Expense Plan\frontend\public\web.config" -Destination "C:\inetpub\wwwroot\expense-plan-app\" -Force
Write-Host ""
Write-Host "web.config updated successfully!" -ForegroundColor Green
Write-Host "Now refresh your browser: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
