# Quick Security Test Script
# This script runs basic security tests on your application

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Security Quick Test Suite             " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "http://localhost:5002"
$testResults = @()

function Test-SecurityCheck {
    param(
        [string]$TestName,
        [scriptblock]$TestCode,
        [string]$ExpectedResult
    )
    
    Write-Host "Testing: $TestName..." -ForegroundColor Yellow
    
    try {
        $result = & $TestCode
        
        if ($result -match $ExpectedResult) {
            Write-Host "  ✓ PASSED" -ForegroundColor Green
            $script:testResults += [PSCustomObject]@{
                Test = $TestName
                Status = "PASS"
                Details = $result
            }
        } else {
            Write-Host "  ✗ FAILED" -ForegroundColor Red
            Write-Host "  Expected: $ExpectedResult" -ForegroundColor Gray
            Write-Host "  Got: $result" -ForegroundColor Gray
            $script:testResults += [PSCustomObject]@{
                Test = $TestName
                Status = "FAIL"
                Details = $result
            }
        }
    } catch {
        Write-Host "  ✗ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $script:testResults += [PSCustomObject]@{
            Test = $TestName
            Status = "ERROR"
            Details = $_.Exception.Message
        }
    }
    Write-Host ""
}

# Check if server is running
Write-Host "Checking if server is running..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/api/auth/me" -Method GET -ErrorAction Stop
    Write-Host "✓ Server is running" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Server is not running!" -ForegroundColor Red
    Write-Host "Please start the backend server first:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor White
    Write-Host "  npm start" -ForegroundColor White
    Write-Host ""
    pause
    exit 1
}

Write-Host "Running security tests..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Security Headers
Test-SecurityCheck -TestName "Security Headers (X-Content-Type-Options)" -TestCode {
    $response = Invoke-WebRequest -Uri "$apiUrl/api/auth/me" -Method GET -ErrorAction Stop
    $response.Headers['X-Content-Type-Options']
} -ExpectedResult "nosniff"

# Test 2: CORS Configuration
Test-SecurityCheck -TestName "CORS Configuration (Access-Control-Allow-Origin)" -TestCode {
    try {
        $response = Invoke-WebRequest -Uri "$apiUrl/api/auth/me" -Method OPTIONS -Headers @{
            "Origin" = "http://malicious-site.com"
        } -ErrorAction Stop
        "VULNERABLE"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 'Forbidden') {
            "PROTECTED"
        } else {
            "VULNERABLE"
        }
    }
} -ExpectedResult "PROTECTED"

# Test 3: SQL Injection Protection (Basic)
Test-SecurityCheck -TestName "SQL Injection Protection" -TestCode {
    try {
        $body = @{
            email = "admin'--"
            password = "test"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$apiUrl/api/auth/login" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
        "VULNERABLE"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 'Unauthorized' -or $_.Exception.Response.StatusCode -eq 'BadRequest') {
            "PROTECTED"
        } else {
            "VULNERABLE"
        }
    }
} -ExpectedResult "PROTECTED"

# Test 4: Rate Limiting (Login)
Test-SecurityCheck -TestName "Rate Limiting on Login" -TestCode {
    $attempts = 0
    $blocked = $false
    
    for ($i = 1; $i -le 7; $i++) {
        try {
            $body = @{
                email = "test@test.com"
                password = "wrongpassword$i"
            } | ConvertTo-Json
            
            Invoke-RestMethod -Uri "$apiUrl/api/auth/login" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
            $attempts++
        } catch {
            if ($_.Exception.Response.StatusCode -eq 429) {
                $blocked = $true
                break
            }
            $attempts++
        }
        Start-Sleep -Milliseconds 200
    }
    
    if ($blocked) { "PROTECTED (Blocked after $attempts attempts)" } 
    else { "VULNERABLE (Allowed $attempts attempts)" }
} -ExpectedResult "PROTECTED"

# Test 5: XSS Protection
Test-SecurityCheck -TestName "XSS Protection Headers" -TestCode {
    $response = Invoke-WebRequest -Uri "$apiUrl/api/auth/me" -Method GET -ErrorAction Stop
    $csp = $response.Headers['Content-Security-Policy']
    if ($csp) { "PROTECTED" } else { "VULNERABLE" }
} -ExpectedResult "PROTECTED"

# Test 6: HTTPS/SSL (if production)
Test-SecurityCheck -TestName "HTTPS/TLS Configuration" -TestCode {
    if ($apiUrl -match "^https://") {
        try {
            $response = Invoke-WebRequest -Uri $apiUrl -Method GET -ErrorAction Stop
            "PROTECTED (HTTPS Enabled)"
        } catch {
            "VULNERABLE (HTTPS Error)"
        }
    } else {
        "NOT APPLICABLE (Using HTTP - OK for development)"
    }
} -ExpectedResult "(HTTPS|NOT APPLICABLE)"

# Test 7: Authentication Required
Test-SecurityCheck -TestName "Authentication Protection" -TestCode {
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/api/settings" -Method GET -ErrorAction Stop
        "VULNERABLE (No auth required)"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 'Unauthorized') {
            "PROTECTED"
        } else {
            "VULNERABLE"
        }
    }
} -ExpectedResult "PROTECTED"

# Test 8: JWT Token Validation
Test-SecurityCheck -TestName "JWT Token Validation" -TestCode {
    try {
        $headers = @{
            "Authorization" = "Bearer invalid-token-12345"
        }
        $response = Invoke-RestMethod -Uri "$apiUrl/api/settings" -Method GET -Headers $headers -ErrorAction Stop
        "VULNERABLE"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 'Forbidden' -or $_.Exception.Response.StatusCode -eq 'Unauthorized') {
            "PROTECTED"
        } else {
            "VULNERABLE"
        }
    }
} -ExpectedResult "PROTECTED"

# Print Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test Summary                          " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passed = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$errors = ($testResults | Where-Object { $_.Status -eq "ERROR" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Errors: $errors" -ForegroundColor Yellow
Write-Host ""

$score = [math]::Round(($passed / $total) * 100, 0)
Write-Host "Security Score: $score%" -ForegroundColor $(if ($score -ge 80) { "Green" } elseif ($score -ge 60) { "Yellow" } else { "Red" })
Write-Host ""

if ($score -lt 80) {
    Write-Host "⚠️  WARNING:" -ForegroundColor Yellow
    Write-Host "   Your application has security vulnerabilities!" -ForegroundColor Yellow
    Write-Host "   Please review SECURITY_FIXES_GUIDE.md for solutions" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Detailed Results:" -ForegroundColor Cyan
$testResults | Format-Table -AutoSize

Write-Host ""
Write-Host "For more information:" -ForegroundColor Cyan
Write-Host "  - See SECURITY_AUDIT_REPORT.md for full audit" -ForegroundColor White
Write-Host "  - See SECURITY_FIXES_GUIDE.md for solutions" -ForegroundColor White
Write-Host ""

pause
