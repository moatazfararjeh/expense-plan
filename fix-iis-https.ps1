# ======================================
# Fix IIS HTTPS Configuration
# ======================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Fix IIS HTTPS Configuration" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor White
    Write-Host "2. Navigate to: cd 'C:\Mutaz\Expense Plan'" -ForegroundColor White
    Write-Host "3. Run: .\fix-iis-https.ps1" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit
}

Import-Module WebAdministration

# Configuration
$backendSiteName = "ExpensePlanAPI"
$frontendSiteName = "ExpensePlanApp"
$backendPort = 1001
$frontendPort = 2001
$sslPath = "C:\Mutaz\Expense Plan\backend\ssl"
$certPath = "$sslPath\localhost.pfx"
$certPassword = "dev-cert-password"

Write-Host "Step 1: Checking IIS Sites..." -ForegroundColor Yellow
Write-Host ""

# Check Backend Site
$backendSite = Get-Website -Name $backendSiteName -ErrorAction SilentlyContinue
if ($backendSite) {
    Write-Host "Backend Site ($backendSiteName):" -ForegroundColor Cyan
    Write-Host "  Status: $($backendSite.State)" -ForegroundColor White
    Write-Host "  Physical Path: $($backendSite.PhysicalPath)" -ForegroundColor White
    Get-WebBinding -Name $backendSiteName | ForEach-Object {
        Write-Host "  Binding: $($_.protocol)://$($_.bindingInformation)" -ForegroundColor White
    }
} else {
    Write-Host "[ERROR] Backend site '$backendSiteName' not found!" -ForegroundColor Red
}

Write-Host ""

# Check Frontend Site
$frontendSite = Get-Website -Name $frontendSiteName -ErrorAction SilentlyContinue
if ($frontendSite) {
    Write-Host "Frontend Site ($frontendSiteName):" -ForegroundColor Cyan
    Write-Host "  Status: $($frontendSite.State)" -ForegroundColor White
    Write-Host "  Physical Path: $($frontendSite.PhysicalPath)" -ForegroundColor White
    Get-WebBinding -Name $frontendSiteName | ForEach-Object {
        Write-Host "  Binding: $($_.protocol)://$($_.bindingInformation)" -ForegroundColor White
    }
} else {
    Write-Host "[ERROR] Frontend site '$frontendSiteName' not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 2: Checking SSL Certificate..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path $certPath) {
    Write-Host "[OK] Certificate file found: $certPath" -ForegroundColor Green
    
    # Load certificate
    try {
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath, $certPassword)
        Write-Host "[OK] Certificate loaded successfully" -ForegroundColor Green
        Write-Host "  Subject: $($cert.Subject)" -ForegroundColor White
        Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor White
        Write-Host "  Expires: $($cert.NotAfter)" -ForegroundColor White
        $certThumbprint = $cert.Thumbprint
    } catch {
        Write-Host "[ERROR] Failed to load certificate: $($_.Exception.Message)" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit
    }
} else {
    Write-Host "[ERROR] Certificate file not found: $certPath" -ForegroundColor Red
    Write-Host "Please run: .\setup-https-simple.ps1 first" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""
Write-Host "Step 3: Installing Certificate to LocalMachine..." -ForegroundColor Yellow

try {
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "LocalMachine")
    $store.Open("ReadWrite")
    
    # Check if certificate already exists
    $existingCert = $store.Certificates | Where-Object { $_.Thumbprint -eq $certThumbprint }
    if ($existingCert) {
        Write-Host "[OK] Certificate already installed in LocalMachine\My" -ForegroundColor Green
    } else {
        $store.Add($cert)
        Write-Host "[OK] Certificate installed to LocalMachine\My" -ForegroundColor Green
    }
    
    $store.Close()
} catch {
    Write-Host "[ERROR] Failed to install certificate: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""
Write-Host "Step 4: Checking SSL Certificate Bindings..." -ForegroundColor Yellow
Write-Host ""

# Check existing bindings
$existingBindings = netsh http show sslcert | Select-String "IP:port" -Context 0,5
if ($existingBindings) {
    Write-Host "Existing SSL bindings:" -ForegroundColor Cyan
    $existingBindings | ForEach-Object { Write-Host $_.Line -ForegroundColor White }
    Write-Host ""
}

Write-Host "Step 5: Removing old SSL bindings..." -ForegroundColor Yellow
# Remove existing bindings for our ports
netsh http delete sslcert ipport=0.0.0.0:$backendPort 2>$null
netsh http delete sslcert ipport=0.0.0.0:$frontendPort 2>$null
Write-Host "[OK] Old bindings removed" -ForegroundColor Green

Write-Host ""
Write-Host "Step 6: Configuring Backend HTTPS (port $backendPort)..." -ForegroundColor Yellow

if ($backendSite) {
    # Remove existing HTTPS binding
    Get-WebBinding -Name $backendSiteName -Protocol "https" -ErrorAction SilentlyContinue | Remove-WebBinding
    
    # Add new HTTPS binding
    New-WebBinding -Name $backendSiteName -Protocol "https" -Port $backendPort -IPAddress "*" -ErrorAction SilentlyContinue
    
    # Bind certificate using netsh
    $guid = [guid]::NewGuid().ToString("B")
    $result = netsh http add sslcert ipport=0.0.0.0:$backendPort certhash=$certThumbprint appid=$guid
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Backend SSL certificate bound to port $backendPort" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] SSL binding result: $result" -ForegroundColor Yellow
    }
    
    # Start the site if it's stopped
    if ($backendSite.State -ne "Started") {
        Start-Website -Name $backendSiteName
        Write-Host "[OK] Backend site started" -ForegroundColor Green
    }
} else {
    Write-Host "[SKIP] Backend site not configured" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 7: Configuring Frontend HTTPS (port $frontendPort)..." -ForegroundColor Yellow

if ($frontendSite) {
    # Remove existing HTTPS binding
    Get-WebBinding -Name $frontendSiteName -Protocol "https" -ErrorAction SilentlyContinue | Remove-WebBinding
    
    # Add new HTTPS binding
    New-WebBinding -Name $frontendSiteName -Protocol "https" -Port $frontendPort -IPAddress "*" -ErrorAction SilentlyContinue
    
    # Bind certificate using netsh
    $guid = [guid]::NewGuid().ToString("B")
    $result = netsh http add sslcert ipport=0.0.0.0:$frontendPort certhash=$certThumbprint appid=$guid
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Frontend SSL certificate bound to port $frontendPort" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] SSL binding result: $result" -ForegroundColor Yellow
    }
    
    # Start the site if it's stopped
    if ($frontendSite.State -ne "Started") {
        Start-Website -Name $frontendSiteName
        Write-Host "[OK] Frontend site started" -ForegroundColor Green
    }
} else {
    Write-Host "[SKIP] Frontend site not configured" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 8: Verifying Configuration..." -ForegroundColor Yellow
Write-Host ""

# Show final bindings
Write-Host "SSL Certificate Bindings:" -ForegroundColor Cyan
netsh http show sslcert | Select-String "IP:port|Certificate Hash" | ForEach-Object { Write-Host $_.Line -ForegroundColor White }

Write-Host ""
Write-Host "IIS Sites Status:" -ForegroundColor Cyan
Get-Website | Where-Object { $_.Name -eq $backendSiteName -or $_.Name -eq $frontendSiteName } | ForEach-Object {
    Write-Host "  $($_.Name): $($_.State)" -ForegroundColor White
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Green
Write-Host "Configuration Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Frontend: https://localhost:$frontendPort" -ForegroundColor White
Write-Host "  Backend:  https://localhost:$backendPort" -ForegroundColor White
Write-Host ""
Write-Host "Note: Your browser will show a security warning because" -ForegroundColor Yellow
Write-Host "this is a self-signed certificate. Click 'Advanced' and" -ForegroundColor Yellow
Write-Host "'Proceed to localhost' to access the site." -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit"
