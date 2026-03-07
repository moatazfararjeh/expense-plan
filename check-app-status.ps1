# ==============================================
# Expense Plan Application - Startup Guide
# ==============================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host " Expense Plan - Application Status" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check backend on port 1001 (HTTPS)
Write-Host "[1] Checking Backend (Node.js HTTPS on port 1001)..." -ForegroundColor Yellow
$backendRunning = $false
try {
    Invoke-WebRequest -Uri "https://localhost:1001" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop -SkipCertificateCheck | Out-Null
    Write-Host "    [OK] Backend is RUNNING" -ForegroundColor Green
    $backendRunning = $true
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 404) {
        Write-Host "    [OK] Backend is RUNNING (404 response is normal)" -ForegroundColor Green
        $backendRunning = $true
    } else {
        Write-Host "    [ERROR] Backend is NOT running" -ForegroundColor Red
        Write-Host "    Start it with: .\start-backend.ps1" -ForegroundColor Yellow
    }
}
Write-Host ""

# Check frontend on port 2001 (HTTPS)
Write-Host "[2] Checking Frontend (HTTPS on port 2001)..." -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "https://localhost:2001" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop -SkipCertificateCheck
    Write-Host "    [OK] Frontend is RUNNING (Status: $($r.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "    [ERROR] Frontend is NOT running" -ForegroundColor Red
    Write-Host "    Start it with: npm start (in frontend folder)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=================================" -ForegroundColor Cyan
Write-Host " How to Use the Application" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

if ($backendRunning) {
    Write-Host "[OK] Application is READY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access the application:" -ForegroundColor Cyan
    Write-Host "  https://localhost:2001" -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host ""
    Write-Host "API endpoint:" -ForegroundColor Gray
    Write-Host "  https://localhost:1001" -ForegroundColor Gray
} else {
    Write-Host "[NEXT STEP] Start the backend:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  .\start-backend-https.ps1" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host ""
    Write-Host "Then access the application at:" -ForegroundColor Gray
    Write-Host "  https://localhost:2001" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host " Important Information" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Architecture:" -ForegroundColor Yellow
Write-Host "  - Frontend: React SPA on HTTPS port 2001" -ForegroundColor White
Write-Host "  - Backend: Node.js server on HTTPS port 1001" -ForegroundColor White
Write-Host "  - Database: PostgreSQL on localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "Note: The application runs with HTTPS (SSL/TLS encryption)" -ForegroundColor Cyan
Write-Host "      Self-signed certificates are used for development." -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop backend:" -ForegroundColor Yellow
Write-Host "  Go to PowerShell window running Node.js and press Ctrl+C" -ForegroundColor White
Write-Host ""
Write-Host "To restart backend:" -ForegroundColor Yellow
Write-Host "  .\start-backend-https.ps1" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
