# ======================================
# Fix IISNode Configuration Issues
# ======================================

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-File", $PSCommandPath
    exit
}

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "IISNode Configuration Checker" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check iisnode module is globally registered
Write-Host "[1] Checking iisnode module registration..." -ForegroundColor Yellow
Import-Module WebAdministration

$iisnodeModule = Get-WebGlobalModule | Where-Object {$_.Name -eq "iisnode"}
if ($iisnodeModule) {
    Write-Host "[OK] iisnode module is globally registered" -ForegroundColor Green
} else {
    Write-Host "[ERROR] iisnode module NOT registered globally" -ForegroundColor Red
    Write-Host "    Attempting to register iisnode..." -ForegroundColor Yellow
    
    $iisnodePath = "$env:ProgramFiles\iisnode\iisnode.dll"
    if (Test-Path $iisnodePath) {
        try {
            New-WebGlobalModule -Name "iisnode" -Image $iisnodePath
            Write-Host "[OK] iisnode module registered successfully" -ForegroundColor Green
        } catch {
            Write-Host "[ERROR] Failed to register iisnode: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "[ERROR] iisnode.dll not found at: $iisnodePath" -ForegroundColor Red
    }
}
Write-Host ""

# Step 2: Check handler mappings for the site
Write-Host "[2] Checking handler mappings for ExpensePlanAPI..." -ForegroundColor Yellow
$handler = Get-WebHandler -PSPath "IIS:\Sites\ExpensePlanAPI" -Name "iisnode" -ErrorAction SilentlyContinue
if ($handler) {
    Write-Host "[OK] iisnode handler is configured for the site" -ForegroundColor Green
    Write-Host "    Path: $($handler.Path)" -ForegroundColor Gray
    Write-Host "    Verb: $($handler.Verb)" -ForegroundColor Gray
} else {
    Write-Host "[WARNING] iisnode handler not found for site" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Check if web.config exists and is valid
Write-Host "[3] Checking web.config..." -ForegroundColor Yellow
$webConfigPath = "C:\inetpub\wwwroot\expense-plan-api\web.config"
if (Test-Path $webConfigPath) {
    Write-Host "[OK] web.config exists" -ForegroundColor Green
    
    # Check if it contains iisnode handler
    $webConfigContent = Get-Content $webConfigPath -Raw
    if ($webConfigContent -match 'modules="iisnode"') {
        Write-Host "[OK] web.config contains iisnode handler" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] web.config missing iisnode handler" -ForegroundColor Red
    }
} else {
    Write-Host "[ERROR] web.config not found" -ForegroundColor Red
}
Write-Host ""

# Step 4: Check permissions on the application folder
Write-Host "[4] Checking folder permissions..." -ForegroundColor Yellow
$apiPath = "C:\inetpub\wwwroot\expense-plan-api"
try {
    $acl = Get-Acl $apiPath
    $iisUsers = $acl.Access | Where-Object {$_.IdentityReference -match "IIS_IUSRS|IUSR"}
    if ($iisUsers) {
        Write-Host "[OK] IIS users have permissions on the folder" -ForegroundColor Green
        foreach ($user in $iisUsers) {
            Write-Host "    $($user.IdentityReference): $($user.FileSystemRights)" -ForegroundColor Gray
        }
    } else {
        Write-Host "[WARNING] IIS users might not have proper permissions" -ForegroundColor Yellow
        Write-Host "    Adding permissions..." -ForegroundColor Yellow
        
        $acl = Get-Acl $apiPath
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
        $acl.SetAccessRule($rule)
        Set-Acl $apiPath $acl
        Write-Host "[OK] Permissions added" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] Failed to check permissions: $_" -ForegroundColor Red
}
Write-Host ""

# Step 5: Recycle application pool
Write-Host "[5] Recycling ExpensePlanAPI application pool..." -ForegroundColor Yellow
try {
    Restart-WebAppPool -Name "ExpensePlanAPI"
    Write-Host "[OK] Application pool recycled" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Could not recycle app pool: $_" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Clear any existing iisnode logs
Write-Host "[6] Clearing old iisnode logs..." -ForegroundColor Yellow
$logPath = "C:\inetpub\wwwroot\expense-plan-api\iisnode"
if (Test-Path $logPath) {
    Remove-Item "$logPath\*" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Old logs cleared" -ForegroundColor Green
} else {
    Write-Host "[INFO] No existing logs directory" -ForegroundColor Gray
}
Write-Host ""

# Step 7: Test the site
Write-Host "[7] Testing backend endpoint..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK] Backend is responding!" -ForegroundColor Green
    Write-Host "    Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Backend error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Check for iisnode logs now
    Write-Host ""
    Write-Host "Checking for iisnode logs..." -ForegroundColor Yellow
    if (Test-Path $logPath) {
        $logs = Get-ChildItem $logPath -Filter "*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($logs) {
            Write-Host "[INFO] Latest log file: $($logs.Name)" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "--- Log Contents (last 30 lines) ---" -ForegroundColor Cyan
            Get-Content $logs.FullName -Tail 30
        } else {
            Write-Host "[WARNING] No log files found - iisnode may not be starting Node.js" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[WARNING] No iisnode logs directory - iisnode is not being invoked" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "TROUBLESHOOTING:" -ForegroundColor Red
        Write-Host "  1. Verify iisnode is installed: $env:ProgramFiles\iisnode\iisnode.dll" -ForegroundColor Yellow
        Write-Host "  2. Check IIS application pool is NOT using '.NET CLR Version'" -ForegroundColor Yellow
        Write-Host "  3. Ensure server.js exists in: C:\inetpub\wwwroot\expense-plan-api\" -ForegroundColor Yellow
        Write-Host "  4. Try reinstalling iisnode from: https://github.com/azure/iisnode/releases" -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 8: Check application pool settings
Write-Host "[8] Checking application pool configuration..." -ForegroundColor Yellow
$appPool = Get-Item "IIS:\AppPools\ExpensePlanAPI"
Write-Host "    Managed Runtime Version: $($appPool.managedRuntimeVersion)" -ForegroundColor Gray
Write-Host "    Enable 32-Bit Apps: $($appPool.enable32BitAppOnWin64)" -ForegroundColor Gray
Write-Host "    Pipeline Mode: $($appPool.managedPipelineMode)" -ForegroundColor Gray

if ($appPool.managedRuntimeVersion -ne "") {
    Write-Host "[WARNING] App pool should have 'No Managed Code' for Node.js" -ForegroundColor Yellow
    Write-Host "    Updating to 'No Managed Code'..." -ForegroundColor Yellow
    Set-ItemProperty "IIS:\AppPools\ExpensePlanAPI" -Name managedRuntimeVersion -Value ""
    Write-Host "[OK] Updated application pool" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Recycling app pool again..." -ForegroundColor Yellow
    Restart-WebAppPool -Name "ExpensePlanAPI"
    Start-Sleep -Seconds 2
    
    Write-Host "Testing again..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing -ErrorAction Stop
        Write-Host "[OK] Backend is now responding!" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Still getting error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Configuration check complete!" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check http://localhost:5000 in browser" -ForegroundColor White
Write-Host "2. If still failing, check logs at:" -ForegroundColor White
Write-Host "   C:\inetpub\wwwroot\expense-plan-api\iisnode\" -ForegroundColor White
Write-Host "3. Try frontend at http://localhost:3000" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
