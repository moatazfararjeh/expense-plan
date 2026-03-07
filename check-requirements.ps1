# ======================================
# Requirements Checker for IIS Hosting
# ======================================

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Expense Plan - Requirements Check" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: Administrator privileges
Write-Host "Checking Administrator privileges..." -ForegroundColor Yellow
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Host "[OK] Running as Administrator" -ForegroundColor Green
} else {
    Write-Host "[ERROR] NOT running as Administrator" -ForegroundColor Red
    Write-Host "  Please run PowerShell as Administrator" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Check 2: IIS Installation
Write-Host "Checking IIS Installation..." -ForegroundColor Yellow
$iis = Get-Service W3SVC -ErrorAction SilentlyContinue
if ($iis) {
    if ($iis.Status -eq "Running") {
        Write-Host "[OK] IIS is installed and running" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] IIS is installed but not running" -ForegroundColor Yellow
        Write-Host "  Starting IIS..." -ForegroundColor Gray
        Start-Service W3SVC
    }
} else {
    Write-Host "[ERROR] IIS is NOT installed" -ForegroundColor Red
    Write-Host "  Install IIS from Windows Features" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Check 3: Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "[OK] Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Node.js NOT found" -ForegroundColor Red
    Write-Host "  Download from: https://nodejs.org/" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Check 4: npm
Write-Host "Checking npm..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($npmVersion) {
    Write-Host "[OK] npm installed: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] npm NOT found" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Check 5: iisnode
Write-Host "Checking iisnode..." -ForegroundColor Yellow
if (Test-Path "$env:ProgramFiles\iisnode\iisnode.dll") {
    Write-Host "[OK] iisnode is installed (64-bit)" -ForegroundColor Green
} elseif (Test-Path "${env:ProgramFiles(x86)}\iisnode\iisnode.dll") {
    Write-Host "[OK] iisnode is installed (32-bit)" -ForegroundColor Green
} else {
    Write-Host "[ERROR] iisnode NOT found" -ForegroundColor Red
    Write-Host "  Download from: https://github.com/azure/iisnode/releases" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Check 6: URL Rewrite Module
Write-Host "Checking URL Rewrite Module..." -ForegroundColor Yellow
$rewriteModule = Get-WebConfiguration -Filter "/system.webServer/rewrite/rules" -ErrorAction SilentlyContinue
if ($rewriteModule) {
    Write-Host "[OK] URL Rewrite Module is installed" -ForegroundColor Green
} else {
    Write-Host "[ERROR] URL Rewrite Module NOT found" -ForegroundColor Red
    Write-Host "  Download from: https://www.iis.net/downloads/microsoft/url-rewrite" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Check 7: PostgreSQL
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
$pgService = Get-Service postgresql* -ErrorAction SilentlyContinue
if ($pgService) {
    if ($pgService.Status -eq "Running") {
        Write-Host "[OK] PostgreSQL is installed and running" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] PostgreSQL is installed but not running" -ForegroundColor Yellow
        Write-Host "  Start PostgreSQL service" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] PostgreSQL NOT found" -ForegroundColor Red
    Write-Host "  Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Check 8: Project files
Write-Host "Checking Project Files..." -ForegroundColor Yellow
$projectRoot = "C:\Mutaz\Expense Plan"
if (Test-Path $projectRoot) {
    Write-Host "[OK] Project folder exists: $projectRoot" -ForegroundColor Green
    
    if (Test-Path "$projectRoot\backend\server.js") {
        Write-Host "[OK] Backend files found" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Backend files NOT found" -ForegroundColor Red
        $allGood = $false
    }
    
    if (Test-Path "$projectRoot\frontend\package.json") {
        Write-Host "[OK] Frontend files found" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Frontend files NOT found" -ForegroundColor Red
        $allGood = $false
    }
    
    if (Test-Path "$projectRoot\backend\.env") {
        Write-Host "[OK] .env file found" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] .env file NOT found" -ForegroundColor Yellow
        Write-Host "  You may need to create it" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] Project folder NOT found: $projectRoot" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Check 9: Ports availability
Write-Host "Checking Port Availability..." -ForegroundColor Yellow
$portsToCheck = @(2001, 1001)
foreach ($port in $portsToCheck) {
    $portUsed = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($portUsed) {
        Write-Host "[WARNING] Port $port is already in use" -ForegroundColor Yellow
        Write-Host "  Process: $(Get-Process -Id $portUsed[0].OwningProcess -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)" -ForegroundColor Gray
    } else {
        Write-Host "[OK] Port $port is available" -ForegroundColor Green
    }
}
Write-Host ""

# Check 10: Firewall
Write-Host "Checking Windows Firewall..." -ForegroundColor Yellow
$firewallProfile = Get-NetFirewallProfile -Profile Domain,Public,Private -ErrorAction SilentlyContinue
if ($firewallProfile) {
    $enabled = $firewallProfile | Where-Object {$_.Enabled -eq $true}
    if ($enabled) {
        Write-Host "[WARNING] Windows Firewall is enabled" -ForegroundColor Yellow
        Write-Host "  You may need to add firewall rules for ports 2001 and 1001" -ForegroundColor Yellow
    } else {
        Write-Host "[OK] Windows Firewall is disabled" -ForegroundColor Green
    }
} else {
    Write-Host "[INFO] Could not check firewall status" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "[OK] All requirements are met!" -ForegroundColor Green
    Write-Host "You can proceed with deployment." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Run deploy-to-iis.ps1 as Administrator" -ForegroundColor White
    Write-Host "2. Or follow the manual steps in IIS_HOSTING_GUIDE.md" -ForegroundColor White
} else {
    Write-Host "[ERROR] Some requirements are missing" -ForegroundColor Red
    Write-Host "Please install missing components before deployment." -ForegroundColor Yellow
}
Write-Host ""

# Additional info
Write-Host "For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "  IIS_HOSTING_GUIDE.md" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
