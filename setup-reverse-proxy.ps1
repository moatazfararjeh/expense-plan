# Setup IIS as reverse proxy to native Node.js
# This is better than iisnode for modern Node.js versions

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-File", $PSCommandPath
    exit
}

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Setup IIS Reverse Proxy" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

Import-Module WebAdministration

# Step 1: Check if Application Request Routing is installed
Write-Host "[1] Checking Application Request Routing..." -ForegroundColor Yellow
$arrModule = Get-Module -ListAvailable -Name "WebAdministration" -ErrorAction SilentlyContinue
$arrInstalled = Test-Path "C:\Windows\System32\inetsrv\proxymod.dll"

if ($arrInstalled) {
    Write-Host "[OK] ARR module found" -ForegroundColor Green
} else {
    Write-Host "[WARNING] ARR not found - will create simple reverse proxy" -ForegroundColor Yellow
    Write-Host "    For better performance, install ARR from:" -ForegroundColor Gray
    Write-Host "    https://www.iis.net/downloads/microsoft/application-request-routing" -ForegroundColor Gray
}
Write-Host ""

# Step 2: Create new backend web.config for reverse proxy
Write-Host "[2] Creating reverse proxy web.config..." -ForegroundColor Yellow

$webConfigContent = @'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="ReverseProxyToNodeJS" stopProcessing="true">
                    <match url="(.*)" />
                    <action type="Rewrite" url="http://localhost:5001/{R:1}" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
'@

$apiPath = "C:\inetpub\wwwroot\expense-plan-api"
$webConfigBackup = "$apiPath\web.config.iisnode.backup"
$webConfigPath = "$apiPath\web.config"

# Backup old config
if (Test-Path $webConfigPath) {
    Copy-Item $webConfigPath $webConfigBackup -Force
    Write-Host "[OK] Backed up old web.config" -ForegroundColor Green
}

# Write new config
$webConfigContent | Out-File -FilePath $webConfigPath -Encoding UTF8 -Force
Write-Host "[OK] New web.config created (reverse proxy to localhost:5001)" -ForegroundColor Green
Write-Host ""

# Step 3: Update .env to use port 5001 instead of 5000
Write-Host "[3] Updating backend to use port 5001..." -ForegroundColor Yellow
$envPath = "C:\Mutaz\Expense Plan\backend\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    $envContent = $envContent -replace 'PORT=5000', 'PORT=5001'
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force -NoNewline
    Write-Host "[OK] Updated .env (PORT=5001)" -ForegroundColor Green
}

# Also update deployed .env
$envDeployedPath = "$apiPath\.env"
if (Test-Path $envDeployedPath) {
    $envContent = Get-Content $envDeployedPath -Raw
    $envContent = $envContent -replace 'PORT=5000', 'PORT=5001'
    $envContent | Out-File -FilePath $envDeployedPath -Encoding UTF8 -Force -NoNewline
    Write-Host "[OK] Updated deployed .env (PORT=5001)" -ForegroundColor Green
}
Write-Host ""

# Step 4: Recycle IIS app pool
Write-Host "[4] Recycling IIS application pool..." -ForegroundColor Yellow
Restart-WebAppPool -Name "ExpensePlanAPI" -ErrorAction SilentlyContinue
Write-Host "[OK] App pool recycled" -ForegroundColor Green
Write-Host ""

# Step 5: Create Node.js startup script
Write-Host "[5] Creating Node.js startup script..." -ForegroundColor Yellow
$startScript = @'
# Start Node.js backend server
Write-Host "Starting Expense Plan Backend..." -ForegroundColor Cyan
Write-Host ""

Set-Location "C:\Mutaz\Expense Plan\backend"

# Check if already running
$existing = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -and (Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue | Where-Object {$_.LocalPort -eq 5001})
}

if ($existing) {
    Write-Host "Node.js server already running on port 5001 (PID: $($existing.Id))" -ForegroundColor Yellow
    $response = Read-Host "Kill and restart? (y/n)"
    if ($response -eq 'y') {
        Stop-Process -Id $existing.Id -Force
        Write-Host "Stopped existing process" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "Keeping existing process" -ForegroundColor Green
        exit
    }
}

Write-Host "Starting server on port 5001..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Server will run in this window" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""
Write-Host "Access via:" -ForegroundColor Green
Write-Host "  - Direct: http://localhost:5001" -ForegroundColor White
Write-Host "  - Via IIS: http://localhost:5000 (proxies to 5001)" -ForegroundColor White
Write-Host ""

node server.js
'@

$startScriptPath = "C:\Mutaz\Expense Plan\start-backend.ps1"
$startScript | Out-File -FilePath $startScriptPath -Encoding UTF8 -Force
Write-Host "[OK] Created start-backend.ps1" -ForegroundColor Green
Write-Host ""

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: .\start-backend.ps1" -ForegroundColor White
Write-Host "   This starts Node.js on port 5001" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test direct access: http://localhost:5001" -ForegroundColor White
Write-Host ""
Write-Host "3. Test via IIS proxy: http://localhost:5000" -ForegroundColor White
Write-Host "   (IIS will forward to Node.js on 5001)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Access frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Benefits of this approach:" -ForegroundColor Cyan
Write-Host "  - Uses native Node.js (no iisnode compatibility issues)" -ForegroundColor Green
Write-Host "  - Supports any Node.js version" -ForegroundColor Green
Write-Host "  - Easier to debug and maintain" -ForegroundColor Green  
Write-Host "  - IIS handles SSL/certificates if needed" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to exit"
