# Stop process running on port 7070
Write-Host "Checking for process on port 7070..." -ForegroundColor Yellow

$connection = Get-NetTCPConnection -LocalPort 7070 -ErrorAction SilentlyContinue | Select-Object -First 1

if ($connection) {
    $pid = $connection.OwningProcess
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    
    Write-Host "Found process: $($proc.Name) (PID: $pid)" -ForegroundColor Cyan
    Write-Host "Stopping process..." -ForegroundColor Yellow
    
    Stop-Process -Id $pid -Force
    Start-Sleep -Seconds 1
    
    Write-Host "Process stopped successfully!" -ForegroundColor Green
} else {
    Write-Host "No process found running on port 7070" -ForegroundColor Green
}

Write-Host ""
Read-Host "Press Enter to exit"
