# Restart Backend Server
Write-Host "Restarting Backend Server..." -ForegroundColor Cyan

# Find and kill any Node.js process on port 1000
Write-Host "Checking for processes on port 1000..." -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort 1000 -ErrorAction SilentlyContinue

if ($connections) {
    foreach ($conn in $connections) {
        $pid = $conn.OwningProcess
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Stopping process: $($proc.Name) (PID: $pid)" -ForegroundColor Yellow
            Stop-Process -Id $pid -Force
        }
    }
    Write-Host "Old processes stopped" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "No process found on port 1000" -ForegroundColor Gray
}

# Start the backend
Write-Host ""
Write-Host "Starting backend server..." -ForegroundColor Green
Set-Location "C:\Mutaz\Expense Plan\backend"

Write-Host "Backend will run on port 1000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

node server.js
