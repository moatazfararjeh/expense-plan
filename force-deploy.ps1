# Force Deploy Frontend to IIS - Requires Admin

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-File", $PSCommandPath
    exit
}

Write-Host "=== Force Deploy Frontend to IIS ===" -ForegroundColor Cyan
Write-Host ""

$source = "C:\Mutaz\Expense Plan\frontend\build"
$destination = "C:\inetpub\wwwroot\expense-plan-app"

# Step 1: Delete old static files
Write-Host "[1] Deleting old static files..." -ForegroundColor Yellow
try {
    if (Test-Path "$destination\static") {
        Remove-Item "$destination\static" -Recurse -Force -ErrorAction Stop
        Write-Host "    [OK] Old static files deleted" -ForegroundColor Green
    }
    if (Test-Path "$destination\asset-manifest.json") {
        Remove-Item "$destination\asset-manifest.json" -Force -ErrorAction Stop
        Write-Host "    [OK] Old manifest deleted" -ForegroundColor Green
    }
    if (Test-Path "$destination\index.html") {
        Remove-Item "$destination\index.html" -Force -ErrorAction Stop
        Write-Host "    [OK] Old index.html deleted" -ForegroundColor Green
    }
} catch {
    Write-Host "    [ERROR] Could not delete old files: $_" -ForegroundColor Red
    Write-Host "    Attempting to continue anyway..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2] Copying new files..." -ForegroundColor Yellow
Write-Host "    From: $source" -ForegroundColor Gray
Write-Host "    To: $destination" -ForegroundColor Gray

if (Test-Path $source) {
    try {
        Copy-Item -Path "$source\*" -Destination $destination -Recurse -Force -ErrorAction Stop
        Write-Host "    [OK] Files copied successfully" -ForegroundColor Green
    } catch {
        Write-Host "    [ERROR] Failed to copy files: $_" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "[ERROR] Build folder not found!" -ForegroundColor Red
    Write-Host "Please run: npm run build" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[3] Verifying deployment..." -ForegroundColor Yellow

# Check asset-manifest.json
$manifestPath = "$destination\asset-manifest.json"
if (Test-Path $manifestPath) {
    $manifest = Get-Content $manifestPath | ConvertFrom-Json
    Write-Host "    Main JS: $($manifest.files.'main.js')" -ForegroundColor Cyan
    Write-Host "    Main CSS: $($manifest.files.'main.css')" -ForegroundColor Cyan
    
    # Check if files actually exist
    $jsFile = "$destination$($manifest.files.'main.js')"
    $cssFile = "$destination$($manifest.files.'main.css')"
    
    if ((Test-Path $jsFile) -and (Test-Path $cssFile)) {
        Write-Host "    [OK] All files verified" -ForegroundColor Green
    } else {
        Write-Host "    [WARNING] Some files missing" -ForegroundColor Yellow
    }
} else {
    Write-Host "    [ERROR] asset-manifest.json not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Deployment Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow -BackgroundColor DarkRed
Write-Host "  Press Ctrl+F5 in your browser to refresh!" -ForegroundColor White
Write-Host "  (Hard refresh clears cache)" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to exit"
