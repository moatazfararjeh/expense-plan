# ======================================
# Add HTTPS Bindings to Existing IIS Sites
# ======================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Add HTTPS to IIS Sites" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
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
$crtPath = "$sslPath\localhost.crt"
$keyPath = "$sslPath\localhost.key"
$certPassword = "dev-cert-password"

# Check if PFX exists, if not create it from CRT and KEY
Write-Host "Checking for SSL certificate..." -ForegroundColor Yellow
if (-not (Test-Path $certPath)) {
    if ((Test-Path $crtPath) -and (Test-Path $keyPath)) {
        Write-Host "Creating PFX from CRT and KEY files..." -ForegroundColor Yellow
        try {
            # Use OpenSSL to create PFX if available
            $opensslPath = Get-Command openssl -ErrorAction SilentlyContinue
            if ($opensslPath) {
                & openssl pkcs12 -export -out $certPath -inkey $keyPath -in $crtPath -password pass:$certPassword
                Write-Host "[OK] PFX certificate created" -ForegroundColor Green
            } else {
                Write-Host "[ERROR] OpenSSL not found and PFX file doesn't exist" -ForegroundColor Red
                Write-Host "Please run: .\setup-https.ps1" -ForegroundColor Yellow
                Read-Host "Press Enter to exit"
                exit
            }
        } catch {
            Write-Host "[ERROR] Failed to create PFX: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "Please run: .\setup-https.ps1" -ForegroundColor Yellow
            Read-Host "Press Enter to exit"
            exit
        }
    } else {
        Write-Host "[ERROR] SSL certificate files not found" -ForegroundColor Red
        Write-Host "Please run: .\setup-https.ps1" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit
    }
} else {
    Write-Host "[OK] PFX certificate found" -ForegroundColor Green
}

Write-Host ""

# Install certificate to LocalMachine store (IIS requires this)
Write-Host "Installing SSL certificate to LocalMachine..." -ForegroundColor Yellow
try {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath, $certPassword)
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "LocalMachine")
    $store.Open("ReadWrite")
    $store.Add($cert)
    $store.Close()
    $certThumbprint = $cert.Thumbprint
    Write-Host "[OK] Certificate installed: $certThumbprint" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to install certificate: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""

# Configure Backend HTTPS
Write-Host "Configuring Backend HTTPS on port $backendPort..." -ForegroundColor Yellow
if (Get-Website -Name $backendSiteName -ErrorAction SilentlyContinue) {
    # Remove existing HTTPS binding if exists
    Get-WebBinding -Name $backendSiteName -Protocol "https" -ErrorAction SilentlyContinue | Remove-WebBinding
    
    # Add new HTTPS binding
    New-WebBinding -Name $backendSiteName -Protocol "https" -Port $backendPort -IPAddress "*"
    
    # Bind certificate using netsh
    try {
        $guid = [guid]::NewGuid().ToString("B")
        netsh http add sslcert ipport=0.0.0.0:$backendPort certhash=$certThumbprint appid=$guid | Out-Null
        Write-Host "[OK] Backend HTTPS configured" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Certificate binding may need manual configuration" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARNING] Backend site not found" -ForegroundColor Yellow
}

Write-Host ""

# Configure Frontend HTTPS
Write-Host "Configuring Frontend HTTPS on port $frontendPort..." -ForegroundColor Yellow
if (Get-Website -Name $frontendSiteName -ErrorAction SilentlyContinue) {
    # Remove existing HTTPS binding if exists
    Get-WebBinding -Name $frontendSiteName -Protocol "https" -ErrorAction SilentlyContinue | Remove-WebBinding
    
    # Add new HTTPS binding
    New-WebBinding -Name $frontendSiteName -Protocol "https" -Port $frontendPort -IPAddress "*"
    
    # Bind certificate using netsh
    try {
        $guid = [guid]::NewGuid().ToString("B")
        netsh http add sslcert ipport=0.0.0.0:$frontendPort certhash=$certThumbprint appid=$guid | Out-Null
        Write-Host "[OK] Frontend HTTPS configured" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Certificate binding may need manual configuration" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARNING] Frontend site not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Green
Write-Host "HTTPS Configuration Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Frontend: https://localhost:$frontendPort" -ForegroundColor White
Write-Host "  Backend:  https://localhost:$backendPort" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
