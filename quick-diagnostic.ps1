# Direct diagnostic without elevation
Write-Host "=== Quick IIS/iisnode Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# Check 1: iisnode DLL
Write-Host "[1] Checking iisnode DLL..." -ForegroundColor Yellow
$iisnodeDll = "$env:ProgramFiles\iisnode\iisnode.dll"
if (Test-Path $iisnodeDll) {
    $dll = Get-Item $iisnodeDll
    Write-Host "   [OK] Found: $iisnodeDll" -ForegroundColor Green
    Write-Host "   Version: $($dll.VersionInfo.FileVersion)" -ForegroundColor Gray
    Write-Host "   Size: $($dll.Length) bytes" -ForegroundColor Gray
} else {
    Write-Host "   [ERROR] NOT FOUND: $iisnodeDll" -ForegroundColor Red
}
Write-Host ""

# Check 2: Backend files
Write-Host "[2] Checking backend files..." -ForegroundColor Yellow
$apiPath = "C:\inetpub\wwwroot\expense-plan-api"
$files = @("server.js", "web.config", "package.json", ".env")
foreach ($file in $files) {
    if (Test-Path "$apiPath\$file") {
        Write-Host "   [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Missing: $file" -ForegroundColor Red
    }
}
Write-Host ""

# Check 3: Test backend response
Write-Host "[3] Testing http://localhost:5000 ..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   [OK] Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   Content-Type: $($response.Headers['Content-Type'])" -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "   [ERROR] Status: $statusCode" -ForegroundColor Red
    Write-Host "   Message: $($_.Exception.Message)" -ForegroundColor Gray
    
    # Try to get more details
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            if ($responseBody) {
                Write-Host "   Response Body:" -ForegroundColor Yellow
                Write-Host $responseBody -ForegroundColor Gray
            }
        } catch {
            Write-Host "   Could not read response body" -ForegroundColor Gray
        }
    }
}
Write-Host ""

# Check 4: IIS site structure  
Write-Host "[4] Checking if site responds to ANY request..." -ForegroundColor Yellow
$testUrls = @(
    "http://localhost:5000/",
    "http://localhost:5000/server.js",
    "http://localhost:5000/api/test"
)
foreach ($url in $testUrls) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        Write-Host "   [OK] $url - Status: $($r.StatusCode)" -ForegroundColor Green
    } catch {
        $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "timeout/error" }
        Write-Host "   [ERROR] $url - Status: $code" -ForegroundColor Red
    }
}
Write-Host ""

# Check 5: Alternative - try to access server.js directly
Write-Host "[5] Trying to access server.js directly..." -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "http://localhost:5000/server.js" -UseBasicParsing -TimeoutSec 2
    Write-Host "   Status: $($r.StatusCode)" -ForegroundColor Cyan
    Write-Host "   This might indicate iisnode is not intercepting requests" -ForegroundColor Yellow
} catch {
    Write-Host "   Error: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "=== Recommendation ===" -ForegroundColor Cyan
Write-Host "If all requests return 500, iisnode may not be properly configured." -ForegroundColor Yellow
Write-Host "Common fixes:" -ForegroundColor Yellow
Write-Host "1. Reinstall iisnode from: https://github.com/azure/iisnode/releases" -ForegroundColor White
Write-Host "2. Use native Node.js instead of iisnode (reverse proxy with IIS)" -ForegroundColor White
Write-Host "3. Check Windows Event Viewer > Application logs for iisnode errors" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to continue"
