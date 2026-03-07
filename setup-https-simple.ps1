# ======================================
# Simple HTTPS Setup - Generate PFX Certificate
# ======================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "HTTPS Certificate Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Warning: Running without Administrator privileges" -ForegroundColor Yellow
    Write-Host "This may limit certificate installation options" -ForegroundColor Yellow
    Write-Host ""
}

# Setup paths
$sslDir = "backend\ssl"
if (-not (Test-Path $sslDir)) {
    New-Item -ItemType Directory -Path $sslDir -Force | Out-Null
}

$pfxPath = Join-Path $sslDir "localhost.pfx"
$crtPath = Join-Path $sslDir "localhost.crt"
$password = "dev-cert-password"

Write-Host "Generating SSL certificate..." -ForegroundColor Yellow
Write-Host ""

try {
    # Create self-signed certificate
    $cert = New-SelfSignedCertificate `
        -DnsName "localhost", "127.0.0.1", "*.localhost" `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -NotAfter (Get-Date).AddYears(2) `
        -FriendlyName "Expense Plan Dev Certificate" `
        -KeyUsage DigitalSignature,KeyEncipherment `
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")

    Write-Host "[OK] Certificate created" -ForegroundColor Green
    Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor Gray
    Write-Host ""

    # Export to PFX with password
    Write-Host "Exporting PFX file..." -ForegroundColor Yellow
    $securePwd = ConvertTo-SecureString -String $password -Force -AsPlainText
    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePwd | Out-Null
    Write-Host "[OK] PFX exported: $pfxPath" -ForegroundColor Green

    # Export CRT (public key)
    Write-Host "Exporting CRT file..." -ForegroundColor Yellow
    Export-Certificate -Cert $cert -FilePath $crtPath -Type CERT | Out-Null
    Write-Host "[OK] CRT exported: $crtPath" -ForegroundColor Green

    Write-Host ""
    Write-Host "=================================" -ForegroundColor Green
    Write-Host "Certificate Generated Successfully!" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files created:" -ForegroundColor Cyan
    Write-Host "  - $pfxPath (Password: $password)" -ForegroundColor White
    Write-Host "  - $crtPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Deploy to IIS: .\add-https-to-iis.ps1" -ForegroundColor White
    Write-Host "  2. Or start backend: .\start-backend-https.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: Browsers will show security warnings for self-signed certs" -ForegroundColor Gray
    Write-Host "      This is normal for development - click Advanced and Proceed" -ForegroundColor Gray
    Write-Host ""

    # Ask to trust certificate
    if ($isAdmin) {
        Write-Host "Do you want to trust this certificate now? (yes/no)" -ForegroundColor Yellow
        $trustNow = Read-Host
        
        if ($trustNow -eq "yes" -or $trustNow -eq "y") {
            Write-Host ""
            Write-Host "Opening certificate..." -ForegroundColor Yellow
            Start-Process $crtPath
            Write-Host ""
            Write-Host "Please install the certificate:" -ForegroundColor Green
            Write-Host "  1. Click 'Install Certificate'" -ForegroundColor White
            Write-Host "  2. Select 'Local Machine' or 'Current User'" -ForegroundColor White
            Write-Host "  3. Browse and select 'Trusted Root Certification Authorities'" -ForegroundColor White
            Write-Host "  4. Click Next and Finish" -ForegroundColor White
            Write-Host ""
        }
    }

} catch {
    Write-Host "[ERROR] Failed to generate certificate: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Read-Host "Press Enter to exit"
