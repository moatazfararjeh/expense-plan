# Apply CORS fix to IIS

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-File", $PSCommandPath
    exit
}

Write-Host "=== Applying CORS Fix ===" -ForegroundColor Cyan
Write-Host ""

Import-Module WebAdministration

# Restart the app pool to reload web.config
Write-Host "[1] Restarting ExpensePlanAPI app pool..." -ForegroundColor Yellow
Restart-WebAppPool -Name "ExpensePlanAPI"
Write-Host "[OK] App pool restarted" -ForegroundColor Green
Write-Host ""

# Wait for restart
Write-Host "Waiting for IIS to apply configuration..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# Test CORS headers
Write-Host "[2] Testing CORS headers..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/" -UseBasicParsing -ErrorAction SilentlyContinue
} catch {
    $response = $_.Exception.Response
}

$corsHeaders = @()
if ($response) {
    if ($response.Headers) {
        $response.Headers.GetEnumerator() | Where-Object {$_.Key -like "*Access-Control*"} | ForEach-Object {
            $corsHeaders += "$($_.Key): $($_.Value)"
            Write-Host "  [OK] $($_.Key): $($_.Value)" -ForegroundColor Green
        }
    }
}

if ($corsHeaders.Count -eq 0) {
    Write-Host "  [WARNING] No CORS headers found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Checking web.config syntax..." -ForegroundColor Yellow
    $webConfig = "C:\inetpub\wwwroot\expense-plan-api\web.config"
    if (Test-Path $webConfig) {
        Write-Host "  [OK] web.config exists" -ForegroundColor Green
        
        # Try to load as XML to check syntax
        try {
            [xml]$xml = Get-Content $webConfig
            Write-Host "  [OK] web.config XML is valid" -ForegroundColor Green
        } catch {
            Write-Host "  [ERROR] web.config has XML errors: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host ""
    Write-Host "[OK] CORS headers are working!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Testing from browser ===" -ForegroundColor Cyan
Write-Host "Refresh your browser at http://localhost:3000" -ForegroundColor White
Write-Host "Try to register/login again" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
