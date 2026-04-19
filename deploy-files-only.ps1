# ======================================
# Expense Plan - Files-Only Deploy (No Build)
# Run on VPS AFTER running build-local.ps1
# on your local machine and uploading files.
# NO npm install, NO build = no CPU spike.
# ======================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Expense Plan - Deploy (No Build)" -ForegroundColor Cyan
Write-Host "CPU-friendly: no compile step" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Run as Administrator!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Configuration
$projectRoot    = "C:\Mutaz\Expense Plan"
$backendSource  = "$projectRoot\backend"
$frontendSource = "$projectRoot\frontend"
$iisBackendPath  = "C:\inetpub\wwwroot\expense-plan-api"
$iisFrontendPath = "C:\inetpub\wwwroot\expense-plan-app"
$backendSiteName  = "ExpensePlanAPI"
$frontendSiteName = "ExpensePlanApp"
$backendPort  = 1001
$frontendPort = 2001

# Verify build output exists
if (-not (Test-Path "$frontendSource\build\index.html")) {
    Write-Host "ERROR: Frontend build not found at $frontendSource\build" -ForegroundColor Red
    Write-Host "Run build-local.ps1 on your LOCAL machine first, then upload the files." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "$backendSource\node_modules")) {
    Write-Host "ERROR: Backend node_modules not found." -ForegroundColor Red
    Write-Host "Run build-local.ps1 on your LOCAL machine first, then upload the files." -ForegroundColor Yellow
    exit 1
}

# Step 1: Stop sites to release file locks
Write-Host "Step 1: Stopping IIS sites..." -ForegroundColor Yellow
Import-Module WebAdministration -ErrorAction SilentlyContinue

foreach ($site in @($backendSiteName, $frontendSiteName)) {
    if (Get-Website -Name $site -ErrorAction SilentlyContinue) {
        Stop-Website -Name $site -ErrorAction SilentlyContinue
        Write-Host "  Stopped: $site" -ForegroundColor Gray
    }
}
Start-Sleep -Seconds 2
Write-Host "[OK] Sites stopped." -ForegroundColor Green
Write-Host ""

# Step 2: Create/clean IIS directories
Write-Host "Step 2: Preparing IIS directories..." -ForegroundColor Yellow
foreach ($dir in @($iisBackendPath, $iisFrontendPath)) {
    if (Test-Path $dir) {
        Remove-Item "$dir\*" -Recurse -Force -ErrorAction SilentlyContinue
    } else {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}
Write-Host "[OK] Directories ready." -ForegroundColor Green
Write-Host ""

# Step 3: Copy backend (no npm install on VPS)
Write-Host "Step 3: Copying backend files..." -ForegroundColor Yellow
$backendFiles = @("*.js","package*.json",".env","web.config","iisnode.yml")
foreach ($pattern in $backendFiles) {
    Get-ChildItem -Path $backendSource -Filter $pattern -ErrorAction SilentlyContinue |
        Copy-Item -Destination $iisBackendPath -Force
}
foreach ($folder in @("routes","middleware","node_modules","ssl")) {
    if (Test-Path "$backendSource\$folder") {
        Write-Host "  Copying $folder..." -ForegroundColor Gray
        Copy-Item "$backendSource\$folder" -Destination "$iisBackendPath\$folder" -Recurse -Force
    }
}
Write-Host "[OK] Backend files copied." -ForegroundColor Green
Write-Host ""

# Step 4: Copy pre-built frontend (no npm build on VPS)
Write-Host "Step 4: Copying pre-built frontend..." -ForegroundColor Yellow
Copy-Item "$frontendSource\build\*" -Destination $iisFrontendPath -Recurse -Force
Write-Host "[OK] Frontend files copied." -ForegroundColor Green
Write-Host ""

# Step 5: Configure IIS sites
Write-Host "Step 5: Configuring IIS..." -ForegroundColor Yellow
foreach ($site in @($backendSiteName, $frontendSiteName)) {
    if (Get-Website -Name $site -ErrorAction SilentlyContinue) {
        Remove-Website -Name $site
    }
}
New-Website -Name $backendSiteName  -Port $backendPort  -PhysicalPath $iisBackendPath  -Force | Out-Null
New-Website -Name $frontendSiteName -Port $frontendPort -PhysicalPath $iisFrontendPath -Force | Out-Null

# Configure backend app pool (No Managed Code for Node.js)
$pool = "ExpensePlanAPI"
if (Test-Path "IIS:\AppPools\$pool") {
    Set-ItemProperty "IIS:\AppPools\$pool" -Name managedRuntimeVersion -Value ""
    Set-ItemProperty "IIS:\AppPools\$pool" -Name enable32BitAppOnWin64 -Value $false
}
Write-Host "[OK] IIS configured." -ForegroundColor Green
Write-Host ""

# Step 6: Set permissions
Write-Host "Step 6: Setting permissions..." -ForegroundColor Yellow
foreach ($path in @($iisBackendPath, $iisFrontendPath)) {
    $acl = Get-Acl $path
    foreach ($identity in @("IIS_IUSRS","IUSR")) {
        try {
            $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
                $identity,"ReadAndExecute","ContainerInherit,ObjectInherit","None","Allow")
            $acl.SetAccessRule($rule)
        } catch {}
    }
    Set-Acl $path $acl
}
Write-Host "[OK] Permissions set." -ForegroundColor Green
Write-Host ""

# Step 7: Start sites
Write-Host "Step 7: Starting IIS sites..." -ForegroundColor Yellow
Start-Website -Name $backendSiteName
Start-Website -Name $frontendSiteName
Write-Host "[OK] Sites started." -ForegroundColor Green
Write-Host ""

Write-Host "=================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend : http://localhost:$frontendPort" -ForegroundColor Cyan
Write-Host "Backend  : http://localhost:$backendPort"  -ForegroundColor Cyan
Write-Host ""
