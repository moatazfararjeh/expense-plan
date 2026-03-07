@echo off
echo ====================================
echo Starting Expense Plan with HTTPS
echo ====================================
echo.
echo This will configure and start the application with HTTPS.
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo.
    echo Right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo Running HTTPS configuration...
echo.

PowerShell -ExecutionPolicy Bypass -File "%~dp0fix-iis-https.ps1"

pause
