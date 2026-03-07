# ======================================
# Recreate IIS Configuration
# ======================================

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    $logFile = "C:\Mutaz\Expense Plan\iis-recreate-log.txt"
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", "& '$PSCommandPath' | Tee-Object -FilePath '$logFile'"
    exit
}

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "IIS Configuration Recreator" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

Import-Module WebAdministration

# Step 1: Check existing sites and app pools
Write-Host "[1] Checking existing IIS configuration..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Existing Websites:" -ForegroundColor Cyan
Get-WebSite | Format-Table Name, Id, State, @{Name="Bindings";Expression={$_.Bindings.Collection.bindingInformation}} -AutoSize
Write-Host ""
Write-Host "Existing Application Pools:" -ForegroundColor Cyan
Get-ChildItem IIS:\AppPools | Format-Table Name, State, @{Name="Runtime";Expression={$_.managedRuntimeVersion}} -AutoSize
Write-Host ""

# Step 2: Check if our sites exist
$apiSite = Get-WebSite -Name "ExpensePlanAPI" -ErrorAction SilentlyContinue
$appSite = Get-WebSite -Name "ExpensePlanApp" -ErrorAction SilentlyContinue

if ($apiSite) {
    Write-Host "[INFO] ExpensePlanAPI site exists" -ForegroundColor Green
} else {
    Write-Host "[WARNING] ExpensePlanAPI site does NOT exist" -ForegroundColor Yellow
}

if ($appSite) {
    Write-Host "[INFO] ExpensePlanApp site exists" -ForegroundColor Green
} else {
    Write-Host "[WARNING] ExpensePlanApp site does NOT exist" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Check if app pools exist
$apiPool = Get-Item "IIS:\AppPools\ExpensePlanAPI" -ErrorAction SilentlyContinue
$appPool = Get-Item "IIS:\AppPools\ExpensePlanApp" -ErrorAction SilentlyContinue

if ($apiPool) {
    Write-Host "[INFO] ExpensePlanAPI app pool exists" -ForegroundColor Green
} else {
    Write-Host "[WARNING] ExpensePlanAPI app pool does NOT exist - will create" -ForegroundColor Yellow
}

if ($appPool) {
    Write-Host "[INFO] ExpensePlanApp app pool exists" -ForegroundColor Green
} else {
    Write-Host "[WARNING] ExpensePlanApp app pool does NOT exist - will create" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Create missing app pools
Write-Host "[2] Creating missing application pools..." -ForegroundColor Yellow

if (-not $apiPool) {
    Write-Host "    Creating ExpensePlanAPI app pool..." -ForegroundColor Gray
    New-WebAppPool -Name "ExpensePlanAPI"
    Set-ItemProperty "IIS:\AppPools\ExpensePlanAPI" -Name managedRuntimeVersion -Value ""
    Set-ItemProperty "IIS:\AppPools\ExpensePlanAPI" -Name enable32BitAppOnWin64 -Value $false
    Write-Host "    [OK] ExpensePlanAPI app pool created" -ForegroundColor Green
} else {
    Write-Host "    [OK] ExpensePlanAPI app pool already exists" -ForegroundColor Green
    # Ensure it has correct settings
    Set-ItemProperty "IIS:\AppPools\ExpensePlanAPI" -Name managedRuntimeVersion -Value ""
    Write-Host "    [OK] Updated to 'No Managed Code'" -ForegroundColor Green
}

if (-not $appPool) {
    Write-Host "    Creating ExpensePlanApp app pool..." -ForegroundColor Gray
    New-WebAppPool -Name "ExpensePlanApp"
    Set-ItemProperty "IIS:\AppPools\ExpensePlanApp" -Name managedRuntimeVersion -Value ""
    Set-ItemProperty "IIS:\AppPools\ExpensePlanApp" -Name enable32BitAppOnWin64 -Value $false
    Write-Host "    [OK] ExpensePlanApp app pool created" -ForegroundColor Green
} else {
    Write-Host "    [OK] ExpensePlanApp app pool already exists" -ForegroundColor Green
}
Write-Host ""

# Step 5: Create or update backend API site
Write-Host "[3] Configuring ExpensePlanAPI site..." -ForegroundColor Yellow
$apiPath = "C:\inetpub\wwwroot\expense-plan-api"

if ($apiSite) {
    Write-Host "    Site exists, checking configuration..." -ForegroundColor Gray
    # Update app pool binding
    Set-ItemProperty "IIS:\Sites\ExpensePlanAPI" -Name applicationPool -Value "ExpensePlanAPI"
    Write-Host "    [OK] Updated app pool binding" -ForegroundColor Green
} else {
    Write-Host "    Creating ExpensePlanAPI site..." -ForegroundColor Gray
    New-WebSite -Name "ExpensePlanAPI" -PhysicalPath $apiPath -Port 5000 -ApplicationPool "ExpensePlanAPI"
    Write-Host "    [OK] Site created" -ForegroundColor Green
}

# Start the site
Start-WebSite -Name "ExpensePlanAPI" -ErrorAction SilentlyContinue
Write-Host "[OK] ExpensePlanAPI site configured and started" -ForegroundColor Green
Write-Host ""

# Step 6: Create or update frontend site
Write-Host "[4] Configuring ExpensePlanApp site..." -ForegroundColor Yellow
$appPath = "C:\inetpub\wwwroot\expense-plan-app"

if ($appSite) {
    Write-Host "    Site exists, checking configuration..." -ForegroundColor Gray
    Set-ItemProperty "IIS:\Sites\ExpensePlanApp" -Name applicationPool -Value "ExpensePlanApp"
    Write-Host "    [OK] Updated app pool binding" -ForegroundColor Green
} else {
    Write-Host "    Creating ExpensePlanApp site..." -ForegroundColor Gray
    New-WebSite -Name "ExpensePlanApp" -PhysicalPath $appPath -Port 3000 -ApplicationPool "ExpensePlanApp"
    Write-Host "    [OK] Site created" -ForegroundColor Green
}

# Start the site
Start-WebSite -Name "ExpensePlanApp" -ErrorAction SilentlyContinue
Write-Host "[OK] ExpensePlanApp site configured and started" -ForegroundColor Green
Write-Host ""

# Step 7: Unlock handlers section (this is critical for iisnode)
Write-Host "[5] Unlocking handlers configuration section..." -ForegroundColor Yellow
try {
    & $env:windir\system32\inetsrv\appcmd.exe unlock config -section:system.webServer/handlers
    Write-Host "[OK] Handlers section unlocked" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Could not unlock handlers: $_" -ForegroundColor Yellow
}
Write-Host ""

# Step 8: Restart IIS
Write-Host "[6] Restarting IIS..." -ForegroundColor Yellow
iisreset
Write-Host "[OK] IIS restarted" -ForegroundColor Green
Write-Host ""

# Step 9: Test backend
Write-Host "[7] Testing backend endpoint..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK] Backend is responding!" -ForegroundColor Green
    Write-Host "    Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Backend error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Check for logs
    $logPath = "C:\inetpub\wwwroot\expense-plan-api\iisnode"
    if (Test-Path $logPath) {
        $logs = Get-ChildItem $logPath -Filter "*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($logs) {
            Write-Host ""
            Write-Host "Latest iisnode log:" -ForegroundColor Cyan
            Get-Content $logs.FullName -Tail 30
        }
    } else {
        Write-Host ""
        Write-Host "[WARNING] No iisnode logs - Node.js not starting" -ForegroundColor Yellow
        Write-Host "Checking if web.config is valid..." -ForegroundColor Yellow
        if (Test-Path "$apiPath\web.config") {
            Write-Host "[OK] web.config exists" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] web.config missing!" -ForegroundColor Red
        }
    }
}
Write-Host ""

# Step 10: Final status
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Configuration Summary" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Sites:" -ForegroundColor Yellow
Get-WebSite | Where-Object {$_.Name -like "ExpensePlan*"} | Format-Table Name, State, @{Name="Port";Expression={$_.Bindings.Collection.bindingInformation}} -AutoSize
Write-Host ""
Write-Host "Application Pools:" -ForegroundColor Yellow
Get-ChildItem IIS:\AppPools | Where-Object {$_.Name -like "ExpensePlan*"} | Format-Table Name, State, @{Name="Runtime";Expression={$_.managedRuntimeVersion}} -AutoSize
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test backend: http://localhost:5000" -ForegroundColor White
Write-Host "2. Test frontend: http://localhost:3000" -ForegroundColor White
Write-Host "3. If issues persist, check: C:\inetpub\wwwroot\expense-plan-api\iisnode\" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
