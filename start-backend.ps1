# Start Node.js backend server on port 1000
Write-Host "Starting Expense Plan Backend..." -ForegroundColor Cyan
Write-Host ""

Set-Location "C:\Mutaz\Expense Plan\backend"

# Check if already running
$existing = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $conn = Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue | Where-Object {$_.LocalPort -eq 1000}
    $conn -ne $null
}

if ($existing) {
    Write-Host "Node.js server already running on port 1000 (PID: $($existing.Id))" -ForegroundColor Yellow
    $response = Read-Host "Kill and restart? (y/n)"
    if ($response -eq 'y') {
        Stop-Process -Id $existing.Id -Force
        Write-Host "Stopped existing process" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "Keeping existing process running" -ForegroundColor Green
        Read-Host "Press Enter to exit"
        exit
    }
}

# Update PORT in .env temporarily for this session
$env:PORT = "1000"

Write-Host "Starting server on port 1000..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Server will run in this window" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""
Write-Host "Access via:" -ForegroundColor Green
Write-Host "  - Direct: http://localhost:1000" -ForegroundColor White
Write-Host ""

node server.js
