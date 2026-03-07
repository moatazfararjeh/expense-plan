# Restart Node.js Backend

Write-Host "=== Restarting Backend ===" -ForegroundColor Cyan
Write-Host ""

# Find and kill Node.js processes on port 5001
Write-Host "[1] Stopping existing Node.js backend..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $connections = Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue
    $connections | Where-Object {$_.LocalPort -eq 5001}
}

if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        Write-Host "    Stopping process $($proc.Id)..." -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force
    }
    Write-Host "    [OK] Backend stopped" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "    [INFO] No backend process running" -ForegroundColor Gray
}
Write-Host ""

# Start backend in new window
Write-Host "[2] Starting backend with updated CORS..." -ForegroundColor Yellow
$startCommand = "cd 'C:\Mutaz\Expense Plan\backend'; `$env:PORT=5001; Write-Host 'Backend starting with CORS fix...' -ForegroundColor Green; Write-Host ''; node server.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $startCommand
Write-Host "    [OK] Backend starting in new window" -ForegroundColor Green
Write-Host ""

# Wait for backend to start
Write-Host "[3] Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

# Test backend
Write-Host "[4] Testing backend CORS headers..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001/api/auth/login" -Method OPTIONS -UseBasicParsing -ErrorAction Stop
    Write-Host "    [OK] Backend responding to OPTIONS" -ForegroundColor Green
    
    $corsHeaders = $response.Headers.GetEnumerator() | Where-Object {$_.Key -like "*Access-Control*"}
    if ($corsHeaders) {
        Write-Host "    [OK] CORS headers present:" -ForegroundColor Green
        $corsHeaders | ForEach-Object {
            Write-Host "        $($_.Key): $($_.Value)" -ForegroundColor White
        }
    } else {
        Write-Host "    [WARNING] No CORS headers in response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Cyan
    Write-Host "    Checking headers anyway..." -ForegroundColor Gray
    
    if ($_.Exception.Response -and $_.Exception.Response.Headers) {
        $corsHeaders = $_.Exception.Response.Headers.GetEnumerator() | Where-Object {$_.Key -like "*Access-Control*"}
        if ($corsHeaders) {
            Write-Host "    [OK] CORS headers present:" -ForegroundColor Green
            $corsHeaders | ForEach-Object {
                Write-Host "        $($_.Key): $($_.Value)" -ForegroundColor White
            }
        } else {
            Write-Host "    [ERROR] No CORS headers found" -ForegroundColor Red
        }
    }
}
Write-Host ""

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check the new PowerShell window shows backend started" -ForegroundColor White
Write-Host "2. Refresh your browser at http://localhost:3000" -ForegroundColor White
Write-Host "3. Try registration/login again" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
