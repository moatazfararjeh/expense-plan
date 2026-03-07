# ======================================
# Database Restore Script
# ======================================

$backupDir = "C:\Mutaz\Expense Plan\backups"
$dbName = "expense_plan"
$dbUser = "postgres"

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Database Restore Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if backup directory exists
if (-not (Test-Path $backupDir)) {
    Write-Host "ERROR: Backup directory not found!" -ForegroundColor Red
    Write-Host "Path: $backupDir" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# List available backups
Write-Host "Available backups:" -ForegroundColor Yellow
Write-Host ""
$backups = Get-ChildItem $backupDir -Filter "expense_plan_*.sql" | Sort-Object CreationTime -Descending

if ($backups.Count -eq 0) {
    Write-Host "No backups found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

for ($i = 0; $i -lt $backups.Count; $i++) {
    $backup = $backups[$i]
    $fileSize = [math]::Round($backup.Length / 1KB, 2)
    $creationTime = $backup.CreationTime.ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "[$($i+1)] $($backup.Name)" -ForegroundColor White
    Write-Host "    Created: $creationTime | Size: $fileSize KB" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Enter the number of the backup to restore (or 0 to cancel): " -ForegroundColor Yellow -NoNewline
$selection = Read-Host

if ([string]::IsNullOrWhiteSpace($selection) -or $selection -eq "0") {
    Write-Host "Restore cancelled." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

$selectedIndex = [int]$selection - 1
if ($selectedIndex -lt 0 -or $selectedIndex -ge $backups.Count) {
    Write-Host "Invalid selection!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

$backupFile = $backups[$selectedIndex].FullName

Write-Host ""
Write-Host "WARNING: This will OVERWRITE the current database!" -ForegroundColor Red
Write-Host "Database: $dbName" -ForegroundColor Yellow
Write-Host "Backup file: $($backups[$selectedIndex].Name)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Type 'YES' to confirm: " -ForegroundColor Red -NoNewline
$confirm = Read-Host

if ($confirm -ne "YES") {
    Write-Host "Restore cancelled." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# Check if psql is available
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Host "ERROR: psql not found!" -ForegroundColor Red
    Write-Host "Make sure PostgreSQL bin folder is in your PATH" -ForegroundColor Yellow
    Write-Host "Usually: C:\Program Files\PostgreSQL\[version]\bin" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""
Write-Host "Restoring database..." -ForegroundColor Yellow

# Set password environment variable
$env:PGPASSWORD = "P@ssw0rd"

try {
    # Drop existing database
    Write-Host "Dropping existing database..." -ForegroundColor Gray
    & psql -U $dbUser -c "DROP DATABASE IF EXISTS $dbName;" 2>$null

    # Create new database
    Write-Host "Creating new database..." -ForegroundColor Gray
    & psql -U $dbUser -c "CREATE DATABASE $dbName;" 2>$null

    # Restore from backup
    Write-Host "Restoring from backup..." -ForegroundColor Gray
    & psql -U $dbUser -d $dbName -f $backupFile 2>$null

    Write-Host ""
    Write-Host "[OK] Database restored successfully!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "[ERROR] Error during restore: $($_.Exception.Message)" -ForegroundColor Red
}

# Clear password from environment
$env:PGPASSWORD = $null

Write-Host ""
Read-Host "Press Enter to exit"
