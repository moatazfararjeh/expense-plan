@echo off
echo ====================================
echo   Expense Plan - Database Migration
echo   Adding Encryption Key Column
echo ====================================
echo.

cd backend

echo Running migration script...
node addEncryptionKeyColumn.js

echo.
echo ====================================
echo Migration completed!
echo.
echo Next steps:
echo 1. Check the output above for any errors
echo 2. Restart your backend server
echo 3. Test user registration
echo ====================================
echo.

pause
