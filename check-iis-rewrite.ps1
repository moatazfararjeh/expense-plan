# Check IIS URL Rewrite Module Installation
Write-Host "Checking IIS URL Rewrite Module..." -ForegroundColor Cyan

$rewriteDLL = "C:\Windows\System32\inetsrv\rewrite.dll"
if (Test-Path $rewriteDLL) {
    Write-Host "✓ URL Rewrite DLL found at $rewriteDLL" -ForegroundColor Green
    $version = (Get-Item $rewriteDLL).VersionInfo.FileVersion
    Write-Host "  Version: $version" -ForegroundColor Gray
} else {
    Write-Host "✗ URL Rewrite DLL NOT found!" -ForegroundColor Red
    Write-Host "  Download from: https://www.iis.net/downloads/microsoft/url-rewrite" -ForegroundColor Yellow
}

Write-Host "`nChecking IIS configuration..." -ForegroundColor Cyan
try {
    Import-Module WebAdministration -ErrorAction Stop
    $globalModules = Get-WebGlobalModule
    $rewriteModule = $globalModules | Where-Object {$_.Name -like "*rewrite*"}
    if ($rewriteModule) {
        Write-Host "✓ URL Rewrite module is registered in IIS" -ForegroundColor Green
        $rewriteModule | Format-Table Name, Image
    } else {
        Write-Host "✗ URL Rewrite module NOT registered!" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Cannot access IIS configuration (requires admin)" -ForegroundColor Yellow
}

Write-Host "`nPress Enter to exit..."
Read-Host
