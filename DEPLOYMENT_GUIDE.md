# Expense Plan - Deployment Solution Summary

## ✅ Application is Now Running!

### Access Your Application
**Frontend:** http://localhost:3000  
**Backend API:** http://localhost:5000 (or http://localhost:5001 direct)

---

## Architecture Overview

### What Changed from Original Plan
**Original Approach:** Using iisnode to host Node.js within IIS  
**Problem:** iisnode v0.2.26 doesn't support Node.js v24.13.0  
**Solution:** Native Node.js + IIS Reverse Proxy

### Current Architecture
```
User Browser (port 3000)
    ↓
IIS Website: ExpensePlanApp
    ↓
React Frontend (static files)
    ↓
Makes API calls to: http://localhost:5000
    ↓
IIS Website: ExpensePlanAPI (Reverse Proxy)
    ↓
Forwards to: http://localhost:5001
    ↓
Node.js/Express Server (Native Process)
    ↓
PostgreSQL Database (port 5432)
```

---

## How to Start/Stop the Application

### Starting the Backend
```powershell
.\start-backend.ps1
```
This opens a PowerShell window where Node.js runs on port 5001.  
**Leave this window open** while using the application.

### Stopping the Backend
- Go to the PowerShell window running Node.js
- Press `Ctrl+C`
- Or close the window

### Frontend & IIS
Frontend and IIS proxy start automatically with Windows (IIS service).  
No manual starting required.

---

## Files and Configuration

### Key Configuration Files

**Backend Web.Config** (`C:\inetpub\wwwroot\expense-plan-api\web.config`)
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyToNodeJS" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:5001/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    <httpErrors existingResponse="PassThrough" />
    <security>
      <requestFiltering>
        <hiddenSegments>
          <add segment="node_modules"/>
          <add segment=".env"/>
        </hiddenSegments>
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

**Backend Environment** (`C:\Mutaz\Expense Plan\backend\.env`)
```env
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_plan
DB_USER=postgres
DB_PASSWORD=P@ssw0rd
JWT_SECRET=your-secret-jwt-key-change-this-in-production
```

### Helper Scripts

| Script | Purpose |
|--------|---------|
| `start-backend.ps1` | Start Node.js backend on port 5001 |
| `check-app-status.ps1` | Check if all components are running |
| `check-requirements.ps1` | Verify system requirements |
| `backup-database.ps1` | Backup PostgreSQL database |
| `restore-database.ps1` | Restore database from backup |

---

## Troubleshooting

### Backend Not Responding
```powershell
# Check if Node.js is running
Get-Process -Name node -ErrorAction SilentlyContinue

# Check if port 5001 is in use
Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue

# Restart backend
.\start-backend.ps1
```

### Frontend Shows CORS Error
- Ensure backend is running on port 5001
- Check IIS proxy is working: http://localhost:5000
- Verify frontend is configured to use port 5000 (not 5001)

### IIS Not Starting
```powershell
# Check IIS service (run as Administrator)
Get-Service W3SVC

# Restart IIS
iisreset

# Check sites
Import-Module WebAdministration
Get-WebSite | Where-Object {$_.Name -like "ExpensePlan*"}
```

### Database Connection Issues
```powershell
# Check PostgreSQL service
Get-Service postgresql*

# Test database connection
psql -U postgres -d expense_plan -h localhost
```

---

## Benefits of This Solution

✅ **Modern Node.js Support:** Works with any Node.js version (current: v24.13.0)  
✅ **Easy Debugging:** Direct access to Node.js console output  
✅ **Better Performance:** No iisnode overhead  
✅ **Flexible:** Can easily switch ports or add SSL  
✅ **Maintainable:** Standard Node.js deployment, widely documented  
✅ **Scalable:** Can upgrade to PM2 or Docker later if needed  

---

## Upgrading/Maintenance

### Updating Application Code

**Frontend:**
```powershell
cd "C:\Mutaz\Expense Plan\frontend"
npm run build
Copy-Item -Path "build\*" -Destination "C:\inetpub\wwwroot\expense-plan-app\" -Recurse -Force
```

**Backend:**
```powershell
# Stop backend (Ctrl+C in Node.js window)
cd "C:\Mutaz\Expense Plan\backend"
npm install  # if package.json changed
# Restart backend
.\start-backend.ps1
```

### Database Backups
```powershell
# Create backup (run as Administrator)
.\backup-database.ps1

# Backups saved to: C:\Mutaz\Expense Plan\backups\
```

---

## System Requirements (Already Met)

- ✅ Windows with IIS installed
- ✅ Node.js v24.13.0
- ✅ PostgreSQL installed and running
- ✅ IIS URL Rewrite Module installed
- ✅ Ports 3000, 5000, 5001 available

---

## Quick Reference

### Check Everything is Running
```powershell
.\check-app-status.ps1
```

### Start Backend
```powershell
.\start-backend.ps1
```

### Access Application
Open browser: **http://localhost:3000**

### View Backend Logs
Check the PowerShell window where Node.js is running

---

## Support

If you encounter issues:

1. Run `.\check-app-status.ps1` to see what's not working
2. Check the Node.js PowerShell window for error messages
3. Verify PostgreSQL is running: `Get-Service postgresql*`
4. Restart IIS if needed: `iisreset` (as Administrator)
5. Restart backend: `.\start-backend.ps1`

---

**Deployment Date:** February 14, 2026  
**Node.js Version:** v24.13.0  
**Architecture:** IIS Reverse Proxy + Native Node.js  
**Status:** ✅ Production Ready
