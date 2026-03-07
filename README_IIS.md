# استضافة تطبيق Expense Plan على IIS

## البداية السريعة ⚡

### 1. التحقق من المتطلبات
افتح **PowerShell كمسؤول** (Run as Administrator) ونفذ:
```powershell
cd "C:\Mutaz\Expense Plan"
.\check-requirements.ps1
```

### 2. النشر التلقائي
إذا كانت جميع المتطلبات متوفرة، نفذ:
```powershell
.\deploy-to-iis.ps1
```

### 3. الوصول للتطبيق
افتح المتصفح واذهب إلى:
```
http://localhost:3000
```

---

## الملفات المهمة

| الملف | الوصف |
|-------|-------|
| `check-requirements.ps1` | يتحقق من توفر جميع المتطلبات |
| `deploy-to-iis.ps1` | نشر تلقائي على IIS |
| `IIS_HOSTING_GUIDE.md` | دليل مفصل للاستضافة اليدوية |
| `backend/web.config` | إعدادات IIS للـ Backend |
| `frontend/public/web.config` | إعدادات IIS للـ Frontend |

---

## المتطلبات الأساسية

قبل البدء، تأكد من تثبيت:

1. **IIS (Internet Information Services)**
   - Control Panel → Programs → Turn Windows features on or off
   - فعّل Internet Information Services

2. **Node.js و npm**
   - حمّل من: https://nodejs.org/

3. **iisnode**
   - حمّل من: https://github.com/azure/iisnode/releases
   - اختر x64 إذا كان نظامك 64-bit

4. **URL Rewrite Module**
   - حمّل من: https://www.iis.net/downloads/microsoft/url-rewrite

5. **PostgreSQL**
   - حمّل من: https://www.postgresql.org/download/windows/

---

## الخطوات اليدوية (إذا لزم الأمر)

إذا لم تنجح السكريبتات التلقائية، اتبع الخطوات في:
```
IIS_HOSTING_GUIDE.md
```

---

## المنافذ المستخدمة

| الخدمة | المنفذ |
|--------|-------|
| Frontend (React App) | 3000 |
| Backend (Node.js API) | 5000 |
| PostgreSQL Database | 5432 |

---

## استكشاف الأخطاء

### Backend لا يعمل؟
تحقق من:
1. PostgreSQL يعمل (services.msc → postgresql)
2. ملف .env به البيانات الصحيحة
3. Logs في: `C:\inetpub\wwwroot\expense-plan-api\iisnode`

### Frontend لا يعمل؟
تحقق من:
1. web.config موجود في مجلد Frontend
2. URL Rewrite Module مثبت
3. Browser Console (F12) للأخطاء

### لا يمكن الوصول من أجهزة أخرى؟
تحقق من:
1. Windows Firewall يسمح بالمنافذ 3000 و 5000
2. جميع الأجهزة على نفس الشبكة

---

## إعادة النشر بعد التعديلات

### تحديث Backend:
```powershell
cd "C:\Mutaz\Expense Plan"
.\deploy-to-iis.ps1
```

### تحديث Frontend فقط:
```powershell
cd "C:\Mutaz\Expense Plan\frontend"
npm run build
Copy-Item "build\*" -Destination "C:\inetpub\wwwroot\expense-plan-app" -Recurse -Force
```

---

## الوصول من الشبكة

لمعرفة IP جهازك:
```powershell
ipconfig
```
ابحث عن **IPv4 Address** (مثلاً: 192.168.1.100)

ثم من أي جهاز على نفس الشبكة:
```
http://192.168.1.100:3000
```

---

## الدعم

للمزيد من التفاصيل، راجع:
- `IIS_HOSTING_GUIDE.md` - دليل شامل
- IIS Logs في Event Viewer
- iisnode logs في مجلد Backend

---

## 💾 النسخ الاحتياطي للبيانات

**مهم جداً:** احتفظ بنسخ احتياطية لقاعدة البيانات بانتظام!

### سكريبتات النسخ الاحتياطي المتوفرة:

| السكريبت | الوظيفة |
|---------|---------|
| `test-backup.ps1` | اختبار نظام النسخ الاحتياطي |
| `backup-database.ps1` | إنشاء نسخة احتياطية فورية |
| `restore-database.ps1` | استعادة نسخة احتياطية |
| `schedule-backup.ps1` | جدولة نسخ احتياطية تلقائية |

### استخدام النسخ الاحتياطي:

```powershell
# 1. اختبر النظام أولاً
.\test-backup.ps1

# 2. أنشئ نسخة احتياطية فورية
.\backup-database.ps1

# 3. فعّل النسخ التلقائي (كمسؤول)
.\schedule-backup.ps1
```

### دليل النسخ الاحتياطي الكامل:
للتفاصيل الكاملة، راجع: **`BACKUP_GUIDE.md`**

---
