# Simple Deploy - Must run as Administrator
# Right-click and select "Run as Administrator"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "       تحديث الموقع / Update Website" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ERROR] This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host ""
    Write-Host "❌ هذا السكريبت يحتاج صلاحيات المسؤول!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Right-click on this file: update-website-simple.ps1" -ForegroundColor White
    Write-Host "2. Select 'Run as Administrator' / اختر 'تشغيل كمسؤول'" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit / اضغط Enter للخروج"
    exit
}

Write-Host "[✓] Running as Administrator" -ForegroundColor Green
Write-Host ""

$source = "C:\Mutaz\Expense Plan\frontend\build"
$destination = "C:\inetpub\wwwroot\expense-plan-app"

try {
    # Step 1: Stop IIS
    Write-Host "[1] Stopping IIS..." -ForegroundColor Yellow
    Stop-Service W3SVC -Force -ErrorAction Stop
    Start-Sleep -Seconds 2
    Write-Host "    [✓] IIS stopped" -ForegroundColor Green
    Write-Host ""

    # Step 2: Delete old files
    Write-Host "[2] Deleting old files..." -ForegroundColor Yellow
    
    if (Test-Path "$destination\static") {
        Remove-Item "$destination\static" -Recurse -Force
        Write-Host "    [✓] Old static files deleted" -ForegroundColor Green
    }
    
    if (Test-Path "$destination\asset-manifest.json") {
        Remove-Item "$destination\asset-manifest.json" -Force
        Write-Host "    [✓] Old manifest deleted" -ForegroundColor Green
    }
    
    if (Test-Path "$destination\index.html") {
        Remove-Item "$destination\index.html" -Force
        Write-Host "    [✓] Old index.html deleted" -ForegroundColor Green
    }
    Write-Host ""

    # Step 3: Copy new files
    Write-Host "[3] Copying new files..." -ForegroundColor Yellow
    Write-Host "    From: $source" -ForegroundColor Gray
    Write-Host "    To: $destination" -ForegroundColor Gray
    
    if (-not (Test-Path $source)) {
        Write-Host "    [ERROR] Build folder not found!" -ForegroundColor Red
        Write-Host "    Please run: npm run build" -ForegroundColor Yellow
        throw "Build folder missing"
    }
    
    Copy-Item -Path "$source\*" -Destination $destination -Recurse -Force
    Write-Host "    [✓] Files copied" -ForegroundColor Green
    Write-Host ""

    # Step 4: Verify
    Write-Host "[4] Verifying..." -ForegroundColor Yellow
    
    $manifestPath = "$destination\asset-manifest.json"
    if (Test-Path $manifestPath) {
        $manifest = Get-Content $manifestPath | ConvertFrom-Json
        Write-Host "    Main JS: $($manifest.files.'main.js')" -ForegroundColor Cyan
        Write-Host "    Main CSS: $($manifest.files.'main.css')" -ForegroundColor Cyan
        Write-Host "    [✓] Verification passed" -ForegroundColor Green
    } else {
        Write-Host "    [WARNING] Manifest not found" -ForegroundColor Yellow
    }
    Write-Host ""

    # Step 5: Start IIS
    Write-Host "[5] Starting IIS..." -ForegroundColor Yellow
    Start-Service W3SVC -ErrorAction Stop
    Write-Host "    [✓] IIS started" -ForegroundColor Green
    Write-Host ""

    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "       [SUCCESS] Deployment Complete!" -ForegroundColor Green
    Write-Host "       اكتمل التحديث بنجاح!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Open browser at: " -NoNewline
    Write-Host "http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANT: Press " -NoNewline -ForegroundColor Yellow
    Write-Host "Ctrl+F5 " -NoNewline -ForegroundColor White -BackgroundColor DarkRed
    Write-Host "to refresh!" -ForegroundColor Yellow
    Write-Host "           اضغط Ctrl+F5 للتحديث!" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "[ERROR] Deployment failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    
    # Try to restart IIS even if there was an error
    try {
        Start-Service W3SVC -ErrorAction SilentlyContinue
    } catch {}
}

Write-Host ""
Read-Host "Press Enter to exit / اضغط Enter للخروج"
