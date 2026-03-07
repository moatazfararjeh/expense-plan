# Check what's using port 9090
Write-Host "Checking port 9090..." -ForegroundColor Yellow

$connection = Get-NetTCPConnection -LocalPort 9090 -ErrorAction SilentlyContinue

if ($connection) {
    $pid = $connection.OwningProcess
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    Write-Host "Port 9090 is in use by: $($proc.Name) (PID: $pid)" -ForegroundColor Red
} else {
    Write-Host "Port 9090 is not in use" -ForegroundColor Green
    Write-Host "The EACCES error suggests you need to run PowerShell as Administrator" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
