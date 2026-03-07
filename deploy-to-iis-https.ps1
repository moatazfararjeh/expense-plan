# ======================================
# Deploy to IIS with HTTPS Support
# ======================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "IIS HTTPS Deployment Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# Configuration
$projectRoot = "C:\Mutaz\Expense Plan"
$backendSource = "$projectRoot\backend"
$frontendSource = "$projectRoot\frontend"
$iisBackendPath = "C:\inetpub\wwwroot\expense-plan-api"
$iisFrontendPath = "C:\inetpub\wwwroot\expense-plan-app"
$backendSiteName = "ExpensePlanAPI"
$frontendSiteName = "ExpensePlanApp"
$backendPort = 1001
$frontendPort = 2001
$certPath = "$backendSource\ssl\localhost.pfx"
$certPassword = "dev-cert-password"

Write-Host "Step 1: Checking SSL Certificate..." -ForegroundColor Yellow
if (-not (Test-Path $certPath)) {
    Write-Host "ERROR: SSL certificate not found at $certPath" -ForegroundColor Red
    Write-Host "Please run .\setup-https.ps1 first" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}
Write-Host "[OK] SSL certificate found!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Installing SSL Certificate to Windows..." -ForegroundColor Yellow
try {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath, $certPassword)
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "LocalMachine")
    $store.Open("ReadWrite")
    $store.Add($cert)
    $store.Close()
    $certThumbprint = $cert.Thumbprint
    Write-Host "[OK] Certificate installed! Thumbprint: $certThumbprint" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not install certificate: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "You may need to install it manually" -ForegroundColor Yellow
}
Write-Host ""

# Run standard deployment
Write-Host "Step 3: Running standard IIS deployment..." -ForegroundColor Yellow
& "$projectRoot\deploy-to-iis.ps1"

Write-Host ""
Write-Host "Step 4: Configuring HTTPS Bindings..." -ForegroundColor Yellow
Import-Module WebAdministration

# Add HTTPS binding for Backend
try {
    $existingBinding = Get-WebBinding -Name $backendSiteName -Protocol "https" -Port $backendPort -ErrorAction SilentlyContinue
    if ($existingBinding) {
        Remove-WebBinding -Name $backendSiteName -Protocol "https" -Port $backendPort
    }
    
    New-WebBinding -Name $backendSiteName -Protocol "https" -Port $backendPort -SslFlags 0
    
    # Bind SSL certificate
    if ($certThumbprint) {
        $binding = Get-WebBinding -Name $backendSiteName -Protocol "https" -Port $backendPort
        $binding.AddSslCertificate($certThumbprint, "Root")
    }
    Write-Host "[OK] Backend HTTPS binding created on port $backendPort" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not configure backend HTTPS: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Add HTTPS binding for Frontend
try {
    $existingBinding = Get-WebBinding -Name $frontendSiteName -Protocol "https" -Port $frontendPort -ErrorAction SilentlyContinue
    if ($existingBinding) {
        Remove-WebBinding -Name $frontendSiteName -Protocol "https" -Port $frontendPort
    }
    
    New-WebBinding -Name $frontendSiteName -Protocol "https" -Port $frontendPort -SslFlags 0
    
    # Bind SSL certificate
    if ($certThumbprint) {
        $binding = Get-WebBinding -Name $frontendSiteName -Protocol "https" -Port $frontendPort
        $binding.AddSslCertificate($certThumbprint, "Root")
    }
    Write-Host "[OK] Frontend HTTPS binding created on port $frontendPort" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not configure frontend HTTPS: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Green
Write-Host "HTTPS Deployment Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access your application (HTTPS):" -ForegroundColor Cyan
Write-Host "  Frontend: https://localhost:$frontendPort" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host "  Backend:  https://localhost:$backendPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "1. Browser will show security warning for self-signed certificate" -ForegroundColor White
Write-Host "2. Click 'Advanced' and 'Proceed to localhost (unsafe)'" -ForegroundColor White
Write-Host "3. Make sure PostgreSQL is running" -ForegroundColor White
Write-Host ""

$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.*"}).IPAddress | Select-Object -First 1
if ($ipAddress) {
    Write-Host "Network Access:" -ForegroundColor Cyan
    Write-Host "  Frontend: https://${ipAddress}:$frontendPort" -ForegroundColor Gray
    Write-Host "  Backend:  https://${ipAddress}:$backendPort" -ForegroundColor Gray
    Write-Host ""
}

Read-Host "Press Enter to exit"
