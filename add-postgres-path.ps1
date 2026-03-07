# ======================================
# Add PostgreSQL to PATH
# ======================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Add PostgreSQL to PATH" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Common PostgreSQL installation paths
$possiblePaths = @(
    "C:\Program Files\PostgreSQL\18\bin",
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin",
    "C:\Program Files\PostgreSQL\13\bin",
    "C:\Program Files (x86)\PostgreSQL\18\bin",
    "C:\Program Files (x86)\PostgreSQL\17\bin",
    "C:\Program Files (x86)\PostgreSQL\16\bin",
    "C:\Program Files (x86)\PostgreSQL\15\bin",
    "C:\Program Files (x86)\PostgreSQL\14\bin",
    "C:\Program Files (x86)\PostgreSQL\13\bin"
)

# Find PostgreSQL installation
$pgPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $pgPath = $path
        break
    }
}

if ($pgPath) {
    Write-Host "[OK] Found PostgreSQL at: $pgPath" -ForegroundColor Green
    Write-Host ""
    
    # Check if already in PATH
    if ($env:Path -like "*$pgPath*") {
        Write-Host "[INFO] PostgreSQL is already in your current session PATH" -ForegroundColor Yellow
        Write-Host ""
    } else {
        # Add to current session
        $env:Path += ";$pgPath"
        Write-Host "[OK] Added PostgreSQL to current session PATH" -ForegroundColor Green
        Write-Host ""
    }
    
    # Check if in system PATH
    $systemPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    
    if ($systemPath -like "*$pgPath*" -or $userPath -like "*$pgPath*") {
        Write-Host "[OK] PostgreSQL is permanently in your PATH" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] PostgreSQL is NOT permanently in your PATH" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To add permanently (requires Administrator):" -ForegroundColor Yellow
        Write-Host "  1. Right-click PowerShell -> Run as Administrator" -ForegroundColor Gray
        Write-Host "  2. Run this command:" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';$pgPath', 'Machine')" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Or manually:" -ForegroundColor Yellow
        Write-Host "  1. Search for 'Environment Variables' in Windows" -ForegroundColor Gray
        Write-Host "  2. Click 'Edit the system environment variables'" -ForegroundColor Gray
        Write-Host "  3. Click 'Environment Variables' button" -ForegroundColor Gray
        Write-Host "  4. Under 'System variables', select 'Path' and click 'Edit'" -ForegroundColor Gray
        Write-Host "  5. Click 'New' and add: $pgPath" -ForegroundColor Gray
        Write-Host "  6. Click 'OK' on all windows" -ForegroundColor Gray
        Write-Host "  7. Restart PowerShell" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Testing commands..." -ForegroundColor Yellow
    
    # Test pg_dump
    $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($pgDump) {
        Write-Host "  [OK] pg_dump is available" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] pg_dump not found" -ForegroundColor Red
    }
    
    # Test psql
    $psql = Get-Command psql -ErrorAction SilentlyContinue
    if ($psql) {
        Write-Host "  [OK] psql is available" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] psql not found" -ForegroundColor Red
    }
    
} else {
    Write-Host "[ERROR] PostgreSQL installation not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL from:" -ForegroundColor Yellow
    Write-Host "https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or if you installed it in a different location," -ForegroundColor Yellow
    Write-Host "add the bin folder to your PATH manually." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
