# ======================================
# Create PFX Certificate from CRT and KEY
# ======================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Create PFX Certificate" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$sslPath = "C:\Mutaz\Expense Plan\backend\ssl"
$crtPath = "$sslPath\localhost.crt"
$keyPath = "$sslPath\localhost.key"
$pfxPath = "$sslPath\localhost.pfx"
$password = "dev-cert-password"

# Check if CRT and KEY exist
if (-not (Test-Path $crtPath)) {
    Write-Host "[ERROR] Certificate file not found: $crtPath" -ForegroundColor Red
    Write-Host "Please run: .\setup-https.ps1" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

if (-not (Test-Path $keyPath)) {
    Write-Host "[ERROR] Key file not found: $keyPath" -ForegroundColor Red
    Write-Host "Please run: .\setup-https.ps1" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "Found certificate files:" -ForegroundColor Green
Write-Host "  CRT: $crtPath" -ForegroundColor Gray
Write-Host "  KEY: $keyPath" -ForegroundColor Gray
Write-Host ""

# Check for OpenSSL
Write-Host "Checking for OpenSSL..." -ForegroundColor Yellow
$openssl = Get-Command openssl -ErrorAction SilentlyContinue

if ($openssl) {
    Write-Host "[OK] OpenSSL found at: $($openssl.Source)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Creating PFX certificate..." -ForegroundColor Yellow
    
    $cmd = "openssl pkcs12 -export -out `"$pfxPath`" -inkey `"$keyPath`" -in `"$crtPath`" -password pass:$password"
    Write-Host "Command: $cmd" -ForegroundColor Gray
    
    & openssl pkcs12 -export -out "$pfxPath" -inkey "$keyPath" -in "$crtPath" -password "pass:$password"
    
    if ($LASTEXITCODE -eq 0 -and (Test-Path $pfxPath)) {
        Write-Host ""
        Write-Host "[OK] PFX certificate created successfully!" -ForegroundColor Green
        Write-Host "Location: $pfxPath" -ForegroundColor Cyan
    } else {
        Write-Host "[ERROR] Failed to create PFX certificate" -ForegroundColor Red
    }
} else {
    Write-Host "[WARNING] OpenSSL not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Trying PowerShell method..." -ForegroundColor Yellow
    
    try {
        # Read certificate and create PFX using .NET
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($crtPath)
        
        # This method doesn't include the private key, so we need OpenSSL
        Write-Host "[ERROR] PowerShell method requires private key support" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install OpenSSL:" -ForegroundColor Yellow
        Write-Host "1. Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor White
        Write-Host "2. Install 'Win64 OpenSSL v3.x.x Light'" -ForegroundColor White
        Write-Host "3. Add to PATH: C:\Program Files\OpenSSL-Win64\bin" -ForegroundColor White
        Write-Host ""
        Write-Host "Or run: .\setup-https.ps1 to regenerate with PFX" -ForegroundColor Cyan
    } catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Read-Host "Press Enter to exit"
