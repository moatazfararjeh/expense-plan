# Expense Plan - Supabase Migration: Add Missing Columns
# Adds start_year, end_year to monthly_expenses and income_month to additional_income
# Run this script from the root of the project directory

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Expense Plan - Supabase Migration" -ForegroundColor Cyan
Write-Host "  Adding Missing Columns" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Load .env values
$envFile = Join-Path $PSScriptRoot "backend\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
        }
    }
    Write-Host "Loaded .env from $envFile" -ForegroundColor Green
} else {
    Write-Host "ERROR: backend\.env not found. Please ensure it exists with SUPABASE_URL and SUPABASE_SERVICE_KEY set." -ForegroundColor Red
    exit 1
}

$supabaseUrl = [System.Environment]::GetEnvironmentVariable("SUPABASE_URL")
$serviceKey  = [System.Environment]::GetEnvironmentVariable("SUPABASE_SERVICE_KEY")

if (-not $supabaseUrl -or -not $serviceKey) {
    Write-Host "ERROR: SUPABASE_URL or SUPABASE_SERVICE_KEY not set in backend\.env" -ForegroundColor Red
    exit 1
}

$sql = @"
ALTER TABLE monthly_expenses
  ADD COLUMN IF NOT EXISTS start_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER,
  ADD COLUMN IF NOT EXISTS end_year   INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER;

ALTER TABLE additional_income
  ADD COLUMN IF NOT EXISTS income_month INTEGER;
"@

Write-Host "Running migration against: $supabaseUrl" -ForegroundColor Yellow
Write-Host ""

$headers = @{
    "apikey"        = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type"  = "application/json"
}

$body = @{ query = $sql } | ConvertTo-Json

try {
    $response = Invoke-RestMethod `
        -Uri "$supabaseUrl/rest/v1/rpc/query" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop

    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host $response
} catch {
    Write-Host "Direct RPC call not available. Please run the SQL manually." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "===== MANUAL STEPS =====" -ForegroundColor Cyan
    Write-Host "1. Go to your Supabase Dashboard"
    Write-Host "2. Navigate to: SQL Editor"
    Write-Host "3. Paste and run the contents of: supabase-add-missing-columns.sql"
    Write-Host ""
    Write-Host "SQL file location: $(Join-Path $PSScriptRoot 'supabase-add-missing-columns.sql')" -ForegroundColor White
    Write-Host ""
    Write-Host "Or paste this SQL directly:" -ForegroundColor Cyan
    Write-Host $sql -ForegroundColor White
}

Write-Host ""
Write-Host "After running the migration, restart the backend server." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
