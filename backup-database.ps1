# ======================================
# Database Backup Script
# ======================================

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "C:\Mutaz\Expense Plan\backups"
$backupFile = "$backupDir\expense_plan_$timestamp.sql"
$dbName = "expense_plan"
$dbUser = "postgres"

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Database Backup Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Create backup directory if it doesn't exist
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "Created backup directory: $backupDir" -ForegroundColor Green
}

# Check if pg_dump is available
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
    Write-Host "ERROR: pg_dump not found!" -ForegroundColor Red
    Write-Host "Make sure PostgreSQL bin folder is in your PATH" -ForegroundColor Yellow
    Write-Host "Usually: C:\Program Files\PostgreSQL\[version]\bin" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "Creating backup..." -ForegroundColor Yellow
Write-Host "Database: $dbName" -ForegroundColor Gray
Write-Host "Backup file: $backupFile" -ForegroundColor Gray
Write-Host ""

# Set password environment variable (will be prompted if not in .env)
$env:PGPASSWORD = "P@ssw0rd"

# Perform backup
try {
    & pg_dump -U $dbUser -d $dbName -f $backupFile
    
    if (Test-Path $backupFile) {
        $fileSize = (Get-Item $backupFile).Length / 1KB
        Write-Host "[OK] Backup completed successfully!" -ForegroundColor Green
        Write-Host "File size: $([math]::Round($fileSize, 2)) KB" -ForegroundColor Gray
        Write-Host ""
        
        # Clean old backups (keep last 10)
        Write-Host "Cleaning old backups (keeping last 10)..." -ForegroundColor Yellow
        $backups = Get-ChildItem $backupDir -Filter "expense_plan_*.sql" | Sort-Object CreationTime -Descending
        if ($backups.Count -gt 10) {
            $toDelete = $backups | Select-Object -Skip 10
            foreach ($file in $toDelete) {
                Remove-Item $file.FullName -Force
                Write-Host "Deleted old backup: $($file.Name)" -ForegroundColor Gray
            }
        }
        Write-Host "[OK] Cleanup completed!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Backup failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Error during backup: $($_.Exception.Message)" -ForegroundColor Red
}

# Clear password from environment
$env:PGPASSWORD = $null

Write-Host ""
Write-Host "Backup location: $backupFile" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
