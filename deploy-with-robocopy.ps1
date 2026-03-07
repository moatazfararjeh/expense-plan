# Deploy using Robocopy - Requires Admin

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-File", $PSCommandPath
    exit
}

Write-Host "=== Deploy with Robocopy ===" -ForegroundColor Cyan
Write-Host ""

$source = "C:\Mutaz\Expense Plan\frontend\build"
$destination = "C:\inetpub\wwwroot\expense-plan-app"

# Step 1: Stop IIS to release file locks
Write-Host "[1] Stopping IIS..." -ForegroundColor Yellow
try {
    Stop-Service W3SVC -Force -ErrorAction Stop
    Write-Host "    [OK] IIS stopped" -ForegroundColor Green
    Start-Sleep -Seconds 2
} catch {
    Write-Host "    [ERROR] Could not stop IIS: $_" -ForegroundColor Red
}

# Step 2: Delete static folder
Write-Host ""
Write-Host "[2] Deleting old files..." -ForegroundColor Yellow
try {
    if (Test-Path "$destination\static") {
        Remove-Item "$destination\static" -Recurse -Force -ErrorAction Stop
        Write-Host "    [OK] Static folder deleted" -ForegroundColor Green
    }
} catch {
    Write-Host "    [ERROR] Could not delete: $_" -ForegroundColor Red
}

# Step 3: Use Robocopy
Write-Host ""
Write-Host "[3] Copying with Robocopy..." -ForegroundColor Yellow
Write-Host "    From: $source" -ForegroundColor Gray
Write-Host "    To: $destination" -ForegroundColor Gray

if (Test-Path $source) {
    # Robocopy returns 0-7 as success codes
    robocopy $source $destination /E /IS /IT /NFL /NDL /NP /MT:8
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -le 7) {
        Write-Host "    [OK] Files copied successfully" -ForegroundColor Green
    } else {
        Write-Host "    [ERROR] Robocopy failed with code: $exitCode" -ForegroundColor Red
    }
} else {
    Write-Host "[ERROR] Build folder not found!" -ForegroundColor Red
}

# Step 4: Start IIS
Write-Host ""
Write-Host "[4] Starting IIS..." -ForegroundColor Yellow
try {
    Start-Service W3SVC -ErrorAction Stop
    Write-Host "    [OK] IIS started" -ForegroundColor Green
} catch {
    Write-Host "    [ERROR] Could not start IIS: $_" -ForegroundColor Red
}

# Step 5: Verify
Write-Host ""
Write-Host "[5] Verifying deployment..." -ForegroundColor Yellow

$manifestPath = "$destination\asset-manifest.json"
if (Test-Path $manifestPath) {
    $manifest = Get-Content $manifestPath | ConvertFrom-Json
    Write-Host "    Main JS: $($manifest.files.'main.js')" -ForegroundColor Cyan
    Write-Host "    Main CSS: $($manifest.files.'main.css')" -ForegroundColor Cyan
} else {
    Write-Host "    [ERROR] asset-manifest.json not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Deployment Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow -BackgroundColor DarkRed
Write-Host "  Press Ctrl+F5 in your browser!" -ForegroundColor White
Write-Host "  URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
