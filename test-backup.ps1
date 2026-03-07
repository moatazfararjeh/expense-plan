# ======================================
# Test Backup System
# ======================================

$backupDir = "C:\Mutaz\Expense Plan\backups"
$dbName = "expense_plan"
$dbUser = "postgres"

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Backup System Test" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# Test 1: Check backup directory
Write-Host "[1] Checking backup directory..." -ForegroundColor Yellow
if (Test-Path $backupDir) {
    Write-Host "    [OK] Backup directory exists: $backupDir" -ForegroundColor Green
} else {
    Write-Host "    [ERROR] Backup directory not found!" -ForegroundColor Red
    Write-Host "    Creating directory..." -ForegroundColor Yellow
    try {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        Write-Host "    [OK] Directory created successfully" -ForegroundColor Green
    } catch {
        Write-Host "    [ERROR] Failed to create directory" -ForegroundColor Red
        $allPassed = $false
    }
}

# Test 2: Check pg_dump
Write-Host ""
Write-Host "[2] Checking pg_dump..." -ForegroundColor Yellow
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if ($pgDump) {
    Write-Host "    [OK] pg_dump found: $($pgDump.Source)" -ForegroundColor Green
} else {
    Write-Host "    [ERROR] pg_dump not found in PATH!" -ForegroundColor Red
    Write-Host "    Add PostgreSQL bin to PATH:" -ForegroundColor Yellow
    Write-Host "    C:\Program Files\PostgreSQL\16\bin" -ForegroundColor Gray
    $allPassed = $false
}

# Test 3: Check psql
Write-Host ""
Write-Host "[3] Checking psql..." -ForegroundColor Yellow
$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($psql) {
    Write-Host "    [OK] psql found: $($psql.Source)" -ForegroundColor Green
} else {
    Write-Host "    [ERROR] psql not found in PATH!" -ForegroundColor Red
    $allPassed = $false
}

# Test 4: Check PostgreSQL service
Write-Host ""
Write-Host "[4] Checking PostgreSQL service..." -ForegroundColor Yellow
$pgService = Get-Service postgresql* -ErrorAction SilentlyContinue
if ($pgService) {
    if ($pgService.Status -eq "Running") {
        Write-Host "    [OK] PostgreSQL service is running" -ForegroundColor Green
    } else {
        Write-Host "    [WARNING] PostgreSQL service exists but not running" -ForegroundColor Yellow
        Write-Host "    Start it with: Start-Service $($pgService.Name)" -ForegroundColor Gray
    }
} else {
    Write-Host "    [ERROR] PostgreSQL service not found!" -ForegroundColor Red
    $allPassed = $false
}

# Test 5: Check database connection
Write-Host ""
Write-Host "[5] Testing database connection..." -ForegroundColor Yellow
if ($psql) {
    $env:PGPASSWORD = "P@ssw0rd"
    try {
        $testConnection = & psql -U $dbUser -d $dbName -c "SELECT 1;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    [OK] Successfully connected to database '$dbName'" -ForegroundColor Green
        } else {
            Write-Host "    [ERROR] Failed to connect to database" -ForegroundColor Red
            Write-Host "    Error: $testConnection" -ForegroundColor Gray
            $allPassed = $false
        }
    } catch {
        Write-Host "    [ERROR] Connection error: $($_.Exception.Message)" -ForegroundColor Red
        $allPassed = $false
    }
    $env:PGPASSWORD = $null
} else {
    Write-Host "    [SKIPPED] (psql not available)" -ForegroundColor Gray
}

# Test 6: Check backup scripts
Write-Host ""
Write-Host "[6] Checking backup scripts..." -ForegroundColor Yellow

$scripts = @(
    "backup-database.ps1",
    "restore-database.ps1",
    "schedule-backup.ps1"
)

foreach ($script in $scripts) {
    $scriptPath = "C:\Mutaz\Expense Plan\$script"
    if (Test-Path $scriptPath) {
        Write-Host "    [OK] $script exists" -ForegroundColor Green
    } else {
        Write-Host "    [ERROR] $script not found!" -ForegroundColor Red
        $allPassed = $false
    }
}

# Test 7: Check existing backups
Write-Host ""
Write-Host "[7] Checking existing backups..." -ForegroundColor Yellow
if (Test-Path $backupDir) {
    $backups = Get-ChildItem $backupDir -Filter "expense_plan_*.sql" -ErrorAction SilentlyContinue
    if ($backups.Count -gt 0) {
        Write-Host "    [OK] Found $($backups.Count) backup(s)" -ForegroundColor Green
        $latestBackup = $backups | Sort-Object CreationTime -Descending | Select-Object -First 1
        Write-Host "    Latest: $($latestBackup.Name)" -ForegroundColor Gray
        Write-Host "    Created: $($latestBackup.CreationTime)" -ForegroundColor Gray
        $fileSize = [math]::Round($latestBackup.Length / 1KB, 2)
        Write-Host "    Size: $fileSize KB" -ForegroundColor Gray
    } else {
        Write-Host "    [WARNING] No backups found (run backup-database.ps1)" -ForegroundColor Yellow
    }
} else {
    Write-Host "    [SKIPPED] Backup directory not found" -ForegroundColor Gray
}

# Test 8: Check scheduled task
Write-Host ""
Write-Host "[8] Checking scheduled backup task..." -ForegroundColor Yellow
$scheduledTask = Get-ScheduledTask -TaskName "ExpensePlan-DatabaseBackup" -ErrorAction SilentlyContinue
if ($scheduledTask) {
    Write-Host "    [OK] Scheduled task exists" -ForegroundColor Green
    Write-Host "    Status: $($scheduledTask.State)" -ForegroundColor Gray
    $trigger = $scheduledTask.Triggers[0]
    if ($trigger.Repetition) {
        Write-Host "    Schedule: $($trigger.Repetition.Interval)" -ForegroundColor Gray
    } else {
        Write-Host "    Trigger: $($trigger.CimClass.CimClassName)" -ForegroundColor Gray
    }
} else {
    Write-Host "    [WARNING] No scheduled task configured" -ForegroundColor Yellow
    Write-Host "    Run: .\schedule-backup.ps1 (as Administrator)" -ForegroundColor Gray
}

# Test 9: Check disk space
Write-Host ""
Write-Host "[9] Checking disk space..." -ForegroundColor Yellow
$drive = "C:"
$disk = Get-PSDrive -Name C -ErrorAction SilentlyContinue
if ($disk) {
    $freeSpaceGB = [math]::Round($disk.Free / 1GB, 2)
    $totalSpaceGB = [math]::Round(($disk.Free + $disk.Used) / 1GB, 2)
    $usedPercent = [math]::Round(($disk.Used / ($disk.Free + $disk.Used)) * 100, 1)
    
    Write-Host "    Free space: $freeSpaceGB GB / $totalSpaceGB GB ($usedPercent% used)" -ForegroundColor Gray
    
    if ($freeSpaceGB -gt 1) {
        Write-Host "    [OK] Sufficient disk space" -ForegroundColor Green
    } else {
        Write-Host "    [WARNING] Low disk space!" -ForegroundColor Yellow
        $allPassed = $false
    }
}

# Summary
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

if ($allPassed) {
    Write-Host "[OK] All critical tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your backup system is ready to use:" -ForegroundColor White
    Write-Host "  - To create backup: .\backup-database.ps1" -ForegroundColor Gray
    Write-Host "  - To restore backup: .\restore-database.ps1" -ForegroundColor Gray
    Write-Host "  - To schedule automatic: .\schedule-backup.ps1" -ForegroundColor Gray
} else {
    Write-Host "[WARNING] Some tests failed!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please fix the issues above before using backup system." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Backup location: $backupDir" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
