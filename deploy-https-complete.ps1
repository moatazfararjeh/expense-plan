# ======================================
# Complete HTTPS Deployment to IIS
# ======================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Complete HTTPS Deployment" -ForegroundColor Cyan
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
$backendSource = "C:\Mutaz\Expense Plan\backend"
$frontendSource = "C:\Mutaz\Expense Plan\frontend\build"
$backendDest = "C:\inetpub\wwwroot\expense-plan-api"
$frontendDest = "C:\inetpub\wwwroot\expense-plan-app"
$backendPort = 1001
$frontendPort = 2001
$certPath = "$backendSource\ssl\localhost.pfx"
$certPassword = "dev-cert-password"

Write-Host "Step 1: Stopping IIS..." -ForegroundColor Yellow
iisreset /stop | Out-Null
Write-Host "[OK] IIS stopped" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Deploying Backend..." -ForegroundColor Yellow

if (Test-Path $backendDest) {
    Write-Host "  Updating backend files..." -ForegroundColor Gray
} else {
    Write-Host "  Creating backend directory..." -ForegroundColor Gray
    New-Item -ItemType Directory -Path $backendDest -Force | Out-Null
}

# Copy backend files (excluding node_modules, we'll use the existing one)
$filesToCopy = @(
    "server.js",
    "server-iis.js",
    "db.js",
    "encryption.js",
    ".env",
    "package.json",
    "web.config",
    "iisnode.yml"
)

foreach ($file in $filesToCopy) {
    $source = Join-Path $backendSource $file
    if (Test-Path $source) {
        Copy-Item $source $backendDest -Force
        Write-Host "    Copied: $file" -ForegroundColor Gray
    }
}

# Copy directories
$dirsToCopy = @("middleware", "routes")
foreach ($dir in $dirsToCopy) {
    $source = Join-Path $backendSource $dir
    $dest = Join-Path $backendDest $dir
    if (Test-Path $source) {
        robocopy $source $dest /MIR /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
        Write-Host "    Copied: $dir\" -ForegroundColor Gray
    }
}

Write-Host "[OK] Backend files deployed" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Deploying Frontend..." -ForegroundColor Yellow

if (-not (Test-Path $frontendSource)) {
    Write-Host "[ERROR] Frontend build not found!" -ForegroundColor Red
    Write-Host "Please run 'npm run build' in the frontend folder first" -ForegroundColor Yellow
    iisreset /start | Out-Null
    Read-Host "Press Enter to exit"
    exit
}

robocopy $frontendSource $frontendDest /MIR /XD node_modules /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
Write-Host "[OK] Frontend deployed" -ForegroundColor Green

Write-Host ""
Write-Host "Step 4: Configuring SSL Certificate..." -ForegroundColor Yellow

try {
    # Remove old certificates
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "LocalMachine")
    $store.Open("ReadWrite")
    $store.Certificates | Where-Object { $_.Subject -eq "CN=localhost" } | ForEach-Object {
        $store.Remove($_)
    }
    $store.Close()
    
    # Import with proper flags
    $certFlags = [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::MachineKeySet `
                -bor [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::PersistKeySet `
                -bor [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable
    
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath, $certPassword, $certFlags)
    
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "LocalMachine")
    $store.Open("ReadWrite")
    $store.Add($cert)
    $store.Close()
    
    $certThumbprint = $cert.Thumbprint
    Write-Host "[OK] Certificate installed: $certThumbprint" -ForegroundColor Green
    
    # Set permissions
    $rsaCert = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
    $fileName = $rsaCert.Key.UniqueName
    
    if ($fileName) {
        $keyPath = "$env:ProgramData\Microsoft\Crypto\RSA\MachineKeys\$fileName"
        
        if (Test-Path $keyPath) {
            $acl = Get-Acl -Path $keyPath
            
            $permission = "NT AUTHORITY\NETWORK SERVICE", "Read", "Allow"
            $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
            $acl.AddAccessRule($accessRule)
            
            $permission = "IIS_IUSRS", "Read", "Allow"
            $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
            $acl.AddAccessRule($accessRule)
            
            Set-Acl -Path $keyPath -AclObject $acl
            Write-Host "[OK] Private key permissions set" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "[ERROR] Failed to configure certificate: $($_.Exception.Message)" -ForegroundColor Red
    iisreset /start | Out-Null
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""
Write-Host "Step 5: Configuring SSL Bindings..." -ForegroundColor Yellow

# Remove old bindings
netsh http delete sslcert ipport=0.0.0.0:$backendPort 2>$null
netsh http delete sslcert ipport=0.0.0.0:$frontendPort 2>$null

# Add backend binding
$guid = [guid]::NewGuid().ToString("B")
netsh http add sslcert ipport=0.0.0.0:$backendPort certhash=$certThumbprint appid=$guid certstorename=MY | Out-Null

# Add frontend binding
$guid = [guid]::NewGuid().ToString("B")
netsh http add sslcert ipport=0.0.0.0:$frontendPort certhash=$certThumbprint appid=$guid certstorename=MY | Out-Null

Write-Host "[OK] SSL bindings configured" -ForegroundColor Green

Write-Host ""
Write-Host "Step 6: Starting IIS..." -ForegroundColor Yellow
iisreset /start | Out-Null
Start-Sleep -Seconds 2
Write-Host "[OK] IIS started" -ForegroundColor Green

Write-Host ""
Write-Host "Step 7: Verifying Sites..." -ForegroundColor Yellow

$backendSite = Get-Website -Name "ExpensePlanAPI" -ErrorAction SilentlyContinue
$frontendSite = Get-Website -Name "ExpensePlanApp" -ErrorAction SilentlyContinue

if ($backendSite -and $backendSite.State -eq "Started") {
    Write-Host "[OK] Backend site running" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Backend site not started" -ForegroundColor Yellow
}

if ($frontendSite -and $frontendSite.State -eq "Started") {
    Write-Host "[OK] Frontend site running" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Frontend site not started" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Frontend: https://localhost:$frontendPort" -ForegroundColor White
Write-Host "  Backend:  https://localhost:$backendPort" -ForegroundColor White
Write-Host ""
Write-Host "Note: Click 'Advanced' -> 'Proceed to localhost' to accept" -ForegroundColor Yellow
Write-Host "the self-signed certificate in your browser." -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit"
