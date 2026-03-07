@echo off
echo ====================================
echo Starting Expense Plan Application
echo ====================================
echo.
echo Backend: http://localhost:1000
echo Frontend: http://localhost:2000
echo.
echo Press Ctrl+C to stop the servers
echo ====================================
echo.

cd /d "%~dp0"

:: Stop IIS if running (to free ports)
echo Stopping IIS to free ports...
net stop was /y >nul 2>&1

:: Start backend in new window
start "Expense Plan - Backend" cmd /k "cd backend && node server.js"

:: Wait a bit for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in new window
start "Expense Plan - Frontend" cmd /k "cd frontend && npm start"

echo.
echo Servers are starting...
echo Backend window will open first, then frontend.
echo.
echo Once frontend opens, your browser will automatically
echo open to http://localhost:2000
echo.
pause
