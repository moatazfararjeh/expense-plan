# ======================================
# Build Locally Before Deploying to VPS
# Run this on your LOCAL machine, not the VPS
# This avoids CPU spikes on the VPS during deploy
# ======================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Local Pre-Build Script" -ForegroundColor Cyan
Write-Host "Run this BEFORE deploying to VPS" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "C:\Mutaz\Expense Plan"
$frontendSource = "$projectRoot\frontend"
$backendSource  = "$projectRoot\backend"

# ---- Frontend Build ----
Write-Host "Step 1: Building Frontend (locally)..." -ForegroundColor Yellow
Set-Location $frontendSource

Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: npm install failed!" -ForegroundColor Red; exit 1 }

# Disable source maps to cut build time/CPU in half
$env:GENERATE_SOURCEMAP = "false"
$env:CI = "false"   # Treat warnings as warnings, not errors

Write-Host "Building frontend (no source maps)..." -ForegroundColor Gray
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: npm build failed!" -ForegroundColor Red; exit 1 }

Write-Host "[OK] Frontend built at: $frontendSource\build" -ForegroundColor Green
Write-Host ""

# ---- Backend Dependencies ----
Write-Host "Step 2: Installing backend dependencies (production only)..." -ForegroundColor Yellow
Set-Location $backendSource
npm install --omit=dev
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Backend npm install failed!" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Backend node_modules ready." -ForegroundColor Green
Write-Host ""

Write-Host "=================================" -ForegroundColor Green
Write-Host "Build complete! Now run:" -ForegroundColor Green
Write-Host "  deploy-files-only.ps1" -ForegroundColor White
Write-Host "on the VPS to deploy without rebuilding." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
