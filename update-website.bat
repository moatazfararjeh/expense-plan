@echo off
echo =============================================
echo    تحديث الموقع / Update Website
echo =============================================
echo.

cd /d "C:\Mutaz\Expense Plan"

echo [1] Building frontend...
cd frontend
call npm run build
cd ..

echo.
echo [2] Stopping IIS...
net stop W3SVC /y

echo.
echo [3] Deleting old files...
del /q "C:\inetpub\wwwroot\expense-plan-app\static\*.*"
rmdir /s /q "C:\inetpub\wwwroot\expense-plan-app\static"
del /q "C:\inetpub\wwwroot\expense-plan-app\asset-manifest.json"
del /q "C:\inetpub\wwwroot\expense-plan-app\index.html"

echo.
echo [4] Copying new files...
xcopy /E /I /Y "C:\Mutaz\Expense Plan\frontend\build\*" "C:\inetpub\wwwroot\expense-plan-app\"

echo.
echo [5] Starting IIS...
net start W3SVC

echo.
echo =============================================
echo    [SUCCESS] Complete / انتهى
echo =============================================
echo.
echo Open browser at: http://localhost:3000
echo Press Ctrl+F5 to refresh!
echo.
pause
