# ======================================
# Schedule Automatic Database Backup
# ======================================

# Requires Administrator privileges
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

$scriptPath = "C:\Mutaz\Expense Plan\backup-database.ps1"
$taskName = "ExpensePlan-DatabaseBackup"

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Schedule Automatic Backup" -ForegroundColor Cyan  
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Verify backup script exists
if (-not (Test-Path $scriptPath)) {
    Write-Host "ERROR: Backup script not found!" -ForegroundColor Red
    Write-Host "Expected path: $scriptPath" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "Select backup schedule:" -ForegroundColor Yellow
Write-Host ""
Write-Host "[1] Daily at midnight" -ForegroundColor White
Write-Host "[2] Daily at specific time" -ForegroundColor White
Write-Host "[3] Weekly (every Sunday at midnight)" -ForegroundColor White
Write-Host "[4] Remove scheduled backup" -ForegroundColor Red
Write-Host "[0] Cancel" -ForegroundColor Gray
Write-Host ""
Write-Host "Enter your choice: " -ForegroundColor Yellow -NoNewline
$choice = Read-Host

if ($choice -eq "0" -or [string]::IsNullOrWhiteSpace($choice)) {
    Write-Host "Cancelled." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# Remove existing task if present
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host ""
    Write-Host "Removing existing scheduled task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

if ($choice -eq "4") {
    Write-Host "[OK] Scheduled backup removed successfully!" -ForegroundColor Green
    Read-Host "Press Enter to exit"
    exit
}

$trigger = $null

switch ($choice) {
    "1" {
        # Daily at midnight
        $trigger = New-ScheduledTaskTrigger -Daily -At "00:00"
        Write-Host "Schedule: Daily at midnight" -ForegroundColor Cyan
    }
    "2" {
        # Daily at specific time
        Write-Host ""
        Write-Host "Enter time (HH:MM format, e.g., 14:30): " -ForegroundColor Yellow -NoNewline
        $time = Read-Host
        
        try {
            $trigger = New-ScheduledTaskTrigger -Daily -At $time
            Write-Host "Schedule: Daily at $time" -ForegroundColor Cyan
        } catch {
            Write-Host "Invalid time format!" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit
        }
    }
    "3" {
        # Weekly on Sunday
        $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "00:00"
        Write-Host "Schedule: Weekly (Sunday at midnight)" -ForegroundColor Cyan
    }
    default {
        Write-Host "Invalid choice!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit
    }
}

Write-Host ""
Write-Host "Creating scheduled task..." -ForegroundColor Yellow

# Create action
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""

# Create settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Create principal (run as SYSTEM)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Register task
try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Automatic backup for Expense Plan database" | Out-Null
    
    Write-Host ""
    Write-Host "[OK] Scheduled backup created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Name: $taskName" -ForegroundColor Gray
    Write-Host "  Script: $scriptPath" -ForegroundColor Gray
    Write-Host "  Backup location: C:\Mutaz\Expense Plan\backups" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To view/manage this task:" -ForegroundColor Yellow
    Write-Host "  1. Open Task Scheduler (taskschd.msc)" -ForegroundColor Gray
    Write-Host "  2. Go to Task Scheduler Library" -ForegroundColor Gray
    Write-Host "  3. Find '$taskName'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To manually run backup now:" -ForegroundColor Yellow
    Write-Host "  .\backup-database.ps1" -ForegroundColor Gray
    
} catch {
    Write-Host ""
    Write-Host "[ERROR] Error creating scheduled task: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit"
