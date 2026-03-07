# ======================================
# Fix SSL Certificate Binding
# ======================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Fix SSL Certificate Binding" -ForegroundColor Cyan
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
$backendPort = 1001
$frontendPort = 2001
$sslPath = "C:\Mutaz\Expense Plan\backend\ssl"
$certPath = "$sslPath\localhost.pfx"
$certPassword = "dev-cert-password"

Write-Host "Step 1: Removing old certificate from store..." -ForegroundColor Yellow
try {
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "LocalMachine")
    $store.Open("ReadWrite")
    
    # Remove any localhost certificates
    $store.Certificates | Where-Object { $_.Subject -eq "CN=localhost" } | ForEach-Object {
        Write-Host "  Removing: $($_.Thumbprint)" -ForegroundColor Gray
        $store.Remove($_)
    }
    
    $store.Close()
    Write-Host "[OK] Old certificates removed" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Could not remove old certificates: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 2: Importing certificate with private key..." -ForegroundColor Yellow

try {
    # Import with proper flags to make private key accessible
    $certFlags = [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::MachineKeySet `
                -bor [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::PersistKeySet `
                -bor [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable
    
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath, $certPassword, $certFlags)
    
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "LocalMachine")
    $store.Open("ReadWrite")
    $store.Add($cert)
    $store.Close()
    
    $certThumbprint = $cert.Thumbprint
    Write-Host "[OK] Certificate imported with private key" -ForegroundColor Green
    Write-Host "  Thumbprint: $certThumbprint" -ForegroundColor White
    Write-Host "  Has Private Key: $($cert.HasPrivateKey)" -ForegroundColor White
} catch {
    Write-Host "[ERROR] Failed to import certificate: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""
Write-Host "Step 3: Setting private key permissions..." -ForegroundColor Yellow

try {
    # Give NETWORK SERVICE access to the private key
    $rsaCert = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
    $fileName = $rsaCert.Key.UniqueName
    
    if ($fileName) {
        $keyPath = "$env:ProgramData\Microsoft\Crypto\RSA\MachineKeys\$fileName"
        
        if (Test-Path $keyPath) {
            $acl = Get-Acl -Path $keyPath
            
            # Add NETWORK SERVICE permission
            $permission = "NT AUTHORITY\NETWORK SERVICE", "Read", "Allow"
            $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
            $acl.AddAccessRule($accessRule)
            
            # Add IIS_IUSRS permission
            $permission = "IIS_IUSRS", "Read", "Allow"
            $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
            $acl.AddAccessRule($accessRule)
            
            Set-Acl -Path $keyPath -AclObject $acl
            Write-Host "[OK] Private key permissions set" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Private key file not found at: $keyPath" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "[WARNING] Could not set permissions: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 4: Removing old SSL bindings..." -ForegroundColor Yellow
netsh http delete sslcert ipport=0.0.0.0:$backendPort 2>$null
netsh http delete sslcert ipport=0.0.0.0:$frontendPort 2>$null
Write-Host "[OK] Old bindings removed" -ForegroundColor Green

Write-Host ""
Write-Host "Step 5: Adding SSL binding for Backend (port $backendPort)..." -ForegroundColor Yellow

$guid = [guid]::NewGuid().ToString("B")
$addResult = netsh http add sslcert ipport=0.0.0.0:$backendPort certhash=$certThumbprint appid=$guid certstorename=MY

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Backend SSL binding added successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to add backend SSL binding" -ForegroundColor Red
    Write-Host "Result: $addResult" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 6: Adding SSL binding for Frontend (port $frontendPort)..." -ForegroundColor Yellow

$guid = [guid]::NewGuid().ToString("B")
$addResult = netsh http add sslcert ipport=0.0.0.0:$frontendPort certhash=$certThumbprint appid=$guid certstorename=MY

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Frontend SSL binding added successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to add frontend SSL binding" -ForegroundColor Red
    Write-Host "Result: $addResult" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 7: Restarting IIS..." -ForegroundColor Yellow
iisreset /noforce | Out-Null
Write-Host "[OK] IIS restarted" -ForegroundColor Green

Write-Host ""
Write-Host "Step 8: Verifying bindings..." -ForegroundColor Yellow
Write-Host ""

$bindings = netsh http show sslcert | Select-String -Pattern "IP:port\s+:\s+0\.0\.0\.0:($backendPort|$frontendPort)" -Context 0,3

if ($bindings) {
    Write-Host "SSL Bindings for our ports:" -ForegroundColor Cyan
    $bindings | ForEach-Object {
        Write-Host $_.Line -ForegroundColor White
        $_.Context.PostContext | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
    }
    Write-Host ""
    Write-Host "=================================" -ForegroundColor Green
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
} else {
    Write-Host "=================================" -ForegroundColor Red
    Write-Host "WARNING: Bindings not found" -ForegroundColor Red
    Write-Host "=================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Showing all bindings:" -ForegroundColor Yellow
    netsh http show sslcert
}

Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Frontend: https://localhost:$frontendPort" -ForegroundColor White
Write-Host "  Backend:  https://localhost:$backendPort" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
