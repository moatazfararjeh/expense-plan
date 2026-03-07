# Fix IIS to forward CORS headers from backend

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-File", $PSCommandPath
    exit
}

Write-Host "=== Fixing IIS CORS Header Forwarding ===" -ForegroundColor Cyan
Write-Host ""

Import-Module WebAdministration

# Remove existing custom headers and add new ones at site level
Write-Host "[1] Configuring CORS at IIS site level..." -ForegroundColor Yellow

$siteName = "ExpensePlanAPI"

# Clear existing CORS headers if any
Write-Host "    Removing old CORS headers..." -ForegroundColor Gray
try {
    Clear-WebConfiguration -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/httpProtocol/customHeaders" -Force -ErrorAction SilentlyContinue
} catch {
    # Ignore errors
}

# Add CORS headers
Write-Host "    Adding CORS headers..." -ForegroundColor Gray
Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/httpProtocol/customHeaders" -Name "." -Value @{name='Access-Control-Allow-Origin';value='*'}
Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/httpProtocol/customHeaders" -Name "." -Value @{name='Access-Control-Allow-Methods';value='GET, POST, PUT, DELETE, OPTIONS'}
Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/httpProtocol/customHeaders" -Name "." -Value @{name='Access-Control-Allow-Headers';value='Content-Type, Authorization'}
Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/httpProtocol/customHeaders" -Name "." -Value @{name='Access-Control-Allow-Credentials';value='true'}

Write-Host "    [OK] CORS headers configured" -ForegroundColor Green
Write-Host ""

# Restart app pool
Write-Host "[2] Restarting application pool..." -ForegroundColor Yellow
Restart-WebAppPool -Name $siteName
Start-Sleep -Seconds 3
Write-Host "    [OK] App pool restarted" -ForegroundColor Green
Write-Host ""

# Test
Write-Host "[3] Testing CORS headers..." -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "http://localhost:5000/" -UseBasicParsing -ErrorAction SilentlyContinue
} catch {
    $r = $_.Exception.Response
}

$corsFound = $false
if ($r -and $r.Headers) {
    $r.Headers.GetEnumerator() | Where-Object {$_.Key -like "*Access-Control*"} | ForEach-Object {
        Write-Host "    $($_.Key): $($_.Value)" -ForegroundColor Green
        $corsFound = $true
    }
}

if ($corsFound) {
    Write-Host ""
    Write-Host "[SUCCESS] CORS headers are now working!" -ForegroundColor Green -BackgroundColor DarkGreen
} else {
    Write-Host "    [WARNING] Headers not visible yet - may need a moment" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Refresh your browser and try again!" -ForegroundColor White
Write-Host "URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
