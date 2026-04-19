# ======================================
# Expense Plan - IIS Deployment Script
# ======================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Expense Plan - IIS Deployment" -ForegroundColor Cyan
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

Write-Host "Step 1: Building Frontend..." -ForegroundColor Yellow
Write-Host "TIP: To avoid CPU throttling on VPS, use build-local.ps1 + deploy-files-only.ps1 instead." -ForegroundColor DarkYellow
Set-Location $frontendSource
Write-Host "Running npm install..." -ForegroundColor Gray
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

# Limit Node heap to reduce CPU/memory spike on VPS; disable source maps to speed up build
$env:NODE_OPTIONS       = "--max-old-space-size=512"
$env:GENERATE_SOURCEMAP = "false"
$env:CI                 = "false"

Write-Host "Running npm build (low-CPU mode)..." -ForegroundColor Gray
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm build failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}
Write-Host "[OK] Frontend built successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Installing Backend Dependencies..." -ForegroundColor Yellow
Set-Location $backendSource
Write-Host "Running npm install..." -ForegroundColor Gray
npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Backend npm install failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}
Write-Host "[OK] Backend dependencies installed!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Creating IIS Directories..." -ForegroundColor Yellow
# Create Backend directory
if (Test-Path $iisBackendPath) {
    Write-Host "Backend directory exists, cleaning..." -ForegroundColor Gray
    Remove-Item "$iisBackendPath\*" -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $iisBackendPath -Force | Out-Null
}

# Create Frontend directory
if (Test-Path $iisFrontendPath) {
    Write-Host "Frontend directory exists, cleaning..." -ForegroundColor Gray
    Remove-Item "$iisFrontendPath\*" -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $iisFrontendPath -Force | Out-Null
}
Write-Host "[OK] Directories created!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Copying Backend Files..." -ForegroundColor Yellow
# Copy backend files
$backendFiles = @(
    "*.js",
    "package*.json",
    ".env",
    "web.config"
)

foreach ($pattern in $backendFiles) {
    Get-ChildItem -Path $backendSource -Filter $pattern | Copy-Item -Destination $iisBackendPath -Force
}

# Copy folders
if (Test-Path "$backendSource\routes") {
    Copy-Item "$backendSource\routes" -Destination "$iisBackendPath\routes" -Recurse -Force
}
if (Test-Path "$backendSource\middleware") {
    Copy-Item "$backendSource\middleware" -Destination "$iisBackendPath\middleware" -Recurse -Force
}
if (Test-Path "$backendSource\node_modules") {
    Write-Host "Copying node_modules (this may take a while)..." -ForegroundColor Gray
    Copy-Item "$backendSource\node_modules" -Destination "$iisBackendPath\node_modules" -Recurse -Force
}
Write-Host "[OK] Backend files copied!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 5: Copying Frontend Files..." -ForegroundColor Yellow
# Copy frontend build
Copy-Item "$frontendSource\build\*" -Destination $iisFrontendPath -Recurse -Force
Write-Host "[OK] Frontend files copied!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 6: Configuring IIS..." -ForegroundColor Yellow
Import-Module WebAdministration

# Check if sites exist and remove them
if (Get-Website -Name $backendSiteName -ErrorAction SilentlyContinue) {
    Write-Host "Removing existing backend site..." -ForegroundColor Gray
    Remove-Website -Name $backendSiteName
}
if (Get-Website -Name $frontendSiteName -ErrorAction SilentlyContinue) {
    Write-Host "Removing existing frontend site..." -ForegroundColor Gray
    Remove-Website -Name $frontendSiteName
}

# Create Backend site
Write-Host "Creating Backend site on port $backendPort..." -ForegroundColor Gray
New-Website -Name $backendSiteName -Port $backendPort -PhysicalPath $iisBackendPath -Force

# Create Frontend site
Write-Host "Creating Frontend site on port $frontendPort..." -ForegroundColor Gray
New-Website -Name $frontendSiteName -Port $frontendPort -PhysicalPath $iisFrontendPath -Force

# Configure Backend Application Pool
$backendAppPool = "ExpensePlanAPI"
if (Test-Path "IIS:\AppPools\$backendAppPool") {
    Set-ItemProperty "IIS:\AppPools\$backendAppPool" -Name managedRuntimeVersion -Value ""
    Set-ItemProperty "IIS:\AppPools\$backendAppPool" -Name enable32BitAppOnWin64 -Value $false
    Write-Host "[OK] Backend Application Pool configured (No Managed Code)" -ForegroundColor Green
}

Write-Host "[OK] IIS sites created!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 7: Setting Permissions..." -ForegroundColor Yellow
# Set permissions for Backend
$acl = Get-Acl $iisBackendPath
$identities = @("IIS_IUSRS", "IUSR")
foreach ($identity in $identities) {
    try {
        $permission = "$identity","ReadAndExecute","ContainerInherit,ObjectInherit","None","Allow"
        $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
        $acl.SetAccessRule($accessRule)
    } catch {
        Write-Host "Warning: Could not set permission for $identity" -ForegroundColor Yellow
    }
}
Set-Acl $iisBackendPath $acl

# Set permissions for Frontend
$acl = Get-Acl $iisFrontendPath
foreach ($identity in $identities) {
    try {
        $permission = "$identity","Read","ContainerInherit,ObjectInherit","None","Allow"
        $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
        $acl.SetAccessRule($accessRule)
    } catch {
        Write-Host "Warning: Could not set permission for $identity" -ForegroundColor Yellow
    }
}
Set-Acl $iisFrontendPath $acl
Write-Host "[OK] Permissions set!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 8: Starting Sites..." -ForegroundColor Yellow
Start-Website -Name $backendSiteName
Start-Website -Name $frontendSiteName
Write-Host "[OK] Sites started!" -ForegroundColor Green
Write-Host ""

Write-Host "=================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend URL: http://localhost:$frontendPort" -ForegroundColor Cyan
Write-Host "Backend URL:  http://localhost:$backendPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "To access from other devices on your network:" -ForegroundColor Yellow
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.*"}).IPAddress | Select-Object -First 1
if ($ipAddress) {
    Write-Host "Frontend: http://${ipAddress}:$frontendPort" -ForegroundColor Cyan
    Write-Host "Backend:  http://${ipAddress}:$backendPort" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "IMPORTANT NOTES:" -ForegroundColor Yellow
Write-Host "1. Make sure PostgreSQL is running" -ForegroundColor White
Write-Host "2. Check firewall allows ports $frontendPort and $backendPort" -ForegroundColor White
Write-Host "3. Backend logs: $iisBackendPath\iisnode" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"
