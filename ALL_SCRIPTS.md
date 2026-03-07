# 📜 دليل جميع السكريبتات / All Scripts Guide

## نظرة عامة / Overview

هذا الدليل يوضح جميع السكريبتات المتوفرة في المشروع وكيفية استخدامها.

---

## 🚀 سكريبتات الاستضافة / Hosting Scripts

### 1. `check-requirements.ps1`
**الوظيفة:** يتحقق من توفر جميع المتطلبات للاستضافة على IIS

**الاستخدام:**
```powershell
.\check-requirements.ps1
```

**يتحقق من:**
- ✅ صلاحيات المسؤول
- ✅ IIS مثبت وقيد التشغيل
- ✅ Node.js و npm
- ✅ iisnode module
- ✅ URL Rewrite Module
- ✅ PostgreSQL service
- ✅ ملفات المشروع
- ✅ المنافذ 3000 و 5000 متاحة
- ✅ حالة Firewall

**متى تستخدمه:** قبل النشر على IIS لأول مرة

---

### 2. `deploy-to-iis.ps1`
**الوظيفة:** نشر تلقائي كامل للتطبيق على IIS

**الاستخدام:**
```powershell
# يجب التشغيل كمسؤول (Run as Administrator)
.\deploy-to-iis.ps1
```

**ماذا يفعل:**
1. ✅ بناء Frontend (npm run build)
2. ✅ تثبيت Backend dependencies
3. ✅ إنشاء مجلدات IIS
4. ✅ نسخ الملفات
5. ✅ إنشاء IIS sites
6. ✅ ضبط Application Pools
7. ✅ تعيين الصلاحيات
8. ✅ تشغيل الخدمات
9. ✅ عرض عناوين الوصول

**متى تستخدمه:** للنشر الأولي أو بعد تحديثات كبيرة

---

## 💾 سكريبتات النسخ الاحتياطي / Backup Scripts

### 3. `test-backup.ps1`
**الوظيفة:** اختبار شامل لنظام النسخ الاحتياطي

**الاستخدام:**
```powershell
.\test-backup.ps1
```

**يختبر:**
1. ✅ مجلد backups موجود
2. ✅ pg_dump متوفر
3. ✅ psql متوفر
4. ✅ PostgreSQL service يعمل
5. ✅ اتصال قاعدة البيانات
6. ✅ ملفات السكريبتات موجودة
7. ✅ النسخ الاحتياطية الموجودة
8. ✅ المهمة المجدولة (إن وُجدت)
9. ✅ مساحة القرص

**متى تستخدمه:** قبل استخدام النسخ الاحتياطي لأول مرة

---

### 4. `add-postgres-path.ps1`
**الوظيفة:** إضافة PostgreSQL إلى PATH تلقائياً

**الاستخدام:**
```powershell
.\add-postgres-path.ps1
```

**ماذا يفعل:**
1. ✅ يبحث عن PostgreSQL في المسارات المعتادة
2. ✅ يضيفه للـ PATH الحالي
3. ✅ يعطيك تعليمات لإضافته بشكل دائم
4. ✅ يختبر pg_dump و psql

**متى تستخدمه:** إذا حصلت على خطأ "pg_dump not found"

---

### 5. `backup-database.ps1`
**الوظيفة:** إنشاء نسخة احتياطية فورية من قاعدة البيانات

**الاستخدام:**
```powershell
.\backup-database.ps1
```

**ماذا يفعل:**
1. ✅ ينشئ ملف SQL من قاعدة البيانات
2. ✅ يحفظ في: `C:\Mutaz\Expense Plan\backups\`
3. ✅ اسم الملف: `expense_plan_YYYYMMDD_HHMMSS.sql`
4. ✅ يحذف النسخ القديمة (يبقي آخر 10)

**متى تستخدمه:**
- قبل تحديث التطبيق
- قبل تغييرات كبيرة في البيانات
- حسب الحاجة للحماية

**موقع النسخ:** `C:\Mutaz\Expense Plan\backups\`

---

### 6. `restore-database.ps1`
**الوظيفة:** استعادة قاعدة البيانات من نسخة احتياطية

**الاستخدام:**
```powershell
.\restore-database.ps1
```

**خطوات الاستخدام:**
1. يعرض قائمة بجميع النسخ المتوفرة
2. اختر رقم النسخة
3. اكتب `YES` للتأكيد
4. انتظر حتى تكتمل الاستعادة

**⚠️ تحذير:**
- **يحذف** قاعدة البيانات الحالية بالكامل
- تأكد من إنشاء نسخة احتياطية حديثة أولاً

**متى تستخدمه:**
- عند حدوث مشكلة في البيانات
- للرجوع لحالة سابقة
- لاسترجاع بيانات محذوفة

---

### 7. `schedule-backup.ps1`
**الوظيفة:** جدولة نسخ احتياطية تلقائية

**الاستخدام:**
```powershell
# يجب التشغيل كمسؤول (Run as Administrator)
.\schedule-backup.ps1
```

**خيارات الجدولة:**
1. **يومياً في منتصف الليل** - كل يوم الساعة 12 صباحاً
2. **يومياً في وقت محدد** - تختار الوقت
3. **أسبوعياً** - كل أحد في منتصف الليل
4. **إلغاء الجدولة** - إيقاف النسخ التلقائي

**بعد الإعداد:**
- النسخ يعمل تلقائياً في الخلفية
- لا يحتاج تدخل يدوي
- يمكن المراجعة من Task Scheduler

**متى تستخدمه:** للحماية الدائمة للبيانات

---

## 🗄️ سكريبتات قاعدة البيانات / Database Scripts

### 8. `backend/createDatabase.js`
**الوظيفة:** إنشاء قاعدة بيانات expense_plan

**الاستخدام:**
```powershell
cd backend
node createDatabase.js
```

**متى تستخدمه:** قبل إنشاء الجداول لأول مرة

---

### 9. `backend/initDbWithAuth.js`
**الوظيفة:** إنشاء جدول users وتفعيل المصادقة

**الاستخدام:**
```powershell
cd backend
node initDbWithAuth.js
```

**الجداول التي ينشئها:**
- `users` - المستخدمين

---

### 10. `backend/addAdditionalIncome.js`
**الوظيفة:** إضافة جدول additional_income

**الاستخدام:**
```powershell
cd backend
node addAdditionalIncome.js
```

**الجداول:**
- `additional_income` - مصادر دخل إضافية

---

### 11. `backend/addRecurringExpenses.js`
**الوظيفة:** إضافة جدول monthly_expenses

**الاستخدام:**
```powershell
cd backend
node addRecurringExpenses.js
```

**الجداول:**
- `monthly_expenses` - المصاريف الشهرية المتكررة

---

### 12. `backend/addDailyTransactions.js`
**الوظيفة:** إضافة جدول daily_transactions

**الاستخدام:**
```powershell
cd backend
node addDailyTransactions.js
```

**الجداول:**
- `daily_transactions` - المعاملات اليومية

---

### 13. `backend/addOpeningBalance.js`
**الوظيفة:** إضافة حقل opening_balance

**الاستخدام:**
```powershell
cd backend
node addOpeningBalance.js
```

**التعديلات:**
- يضيف `opening_balance` لجدول user_settings

---

### 14. `backend/addSalaryChanges.js`
**الوظيفة:** إضافة جدول salary_changes

**الاستخدام:**
```powershell
cd backend
node addSalaryChanges.js
```

**الجداول:**
- `salary_changes` - تتبع تغييرات الراتب

---

### 15. `backend/addPlanStartDate.js`
**الوظيفة:** إضافة حقل plan_start_date

**الاستخدام:**
```powershell
cd backend
node addPlanStartDate.js
```

**التعديلات:**
- يضيف `plan_start_date` لجدول user_settings

---

## 📊 دليل سريع للسكريبتات / Quick Reference

### الإعداد الأولي (مرة واحدة):
```powershell
# 1. التحقق من المتطلبات
.\check-requirements.ps1

# 2. اختبار النسخ الاحتياطي
.\test-backup.ps1

# 3. النشر على IIS
.\deploy-to-iis.ps1

# 4. جدولة النسخ التلقائي
.\schedule-backup.ps1
```

### الاستخدام اليومي:
```powershell
# نسخة احتياطية يدوية
.\backup-database.ps1

# استعادة نسخة
.\restore-database.ps1
```

### بعد التحديثات:
```powershell
# إعادة النشر
.\deploy-to-iis.ps1
```

---

## 🎯 متى تستخدم أي سكريبت؟

### عند البدء لأول مرة:
1. ✅ `check-requirements.ps1`
2. ✅ `deploy-to-iis.ps1`
3. ✅ `test-backup.ps1`
4. ✅ `schedule-backup.ps1`

### قبل تحديث التطبيق:
1. ✅ `backup-database.ps1`
2. ✅ تنفيذ التحديثات
3. ✅ `deploy-to-iis.ps1`

### عند حدوث مشكلة:
1. ✅ `restore-database.ps1`

### بشكل دوري:
- ✅ النسخ التلقائي يعمل بدون تدخل
- ✅ أو شغّل `backup-database.ps1` يدوياً

---

## 📁 مواقع مهمة

| الموقع | المحتوى |
|--------|----------|
| `C:\Mutaz\Expense Plan\` | جميع السكريبتات |
| `C:\Mutaz\Expense Plan\backups\` | النسخ الاحتياطية |
| `C:\inetpub\wwwroot\expense-plan-api\` | Backend على IIS |
| `C:\inetpub\wwwroot\expense-plan-app\` | Frontend على IIS |
| `C:\inetpub\wwwroot\expense-plan-api\iisnode\` | Logs |

---

## 🔍 استكشاف الأخطاء / Troubleshooting

### خطأ: "requires Administrator"
```powershell
# افتح PowerShell كمسؤول (Right-click → Run as Administrator)
```

### خطأ: "pg_dump not found"
```powershell
# أضف PostgreSQL للـ PATH
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"
```

### خطأ: "Cannot connect to database"
```powershell
# تأكد من تشغيل PostgreSQL
Get-Service postgresql*
Start-Service postgresql-x64-16  # استبدل بالإصدار المناسب
```

---

## 📚 أدلة مفصلة

| الدليل | المحتوى |
|--------|---------|
| `README_IIS.md` | دليل سريع للاستضافة |
| `IIS_HOSTING_GUIDE.md` | دليل مفصل للاستضافة اليدوية |
| `BACKUP_GUIDE.md` | دليل شامل للنسخ الاحتياطي |
| `ALL_SCRIPTS.md` | هذا الملف - دليل جميع السكريبتات |

---

## ✅ نصائح مهمة

1. **دائماً** شغّل السكريبتات من مجلد المشروع:
   ```powershell
   cd "C:\Mutaz\Expense Plan"
   ```

2. **سكريبتات تحتاج Administrator:**
   - `deploy-to-iis.ps1`
   - `schedule-backup.ps1`

3. **قبل أي تغيير كبير:**
   ```powershell
   .\backup-database.ps1
   ```

4. **احتفظ بنسخ خارجية:**
   - انسخ `backups\` إلى USB أو Cloud

---

## 🎓 أمثلة عملية

### مثال 1: الإعداد الأولي الكامل
```powershell
cd "C:\Mutaz\Expense Plan"

# تحقق من المتطلبات
.\check-requirements.ps1

# انشر التطبيق
.\deploy-to-iis.ps1

# اختبر النسخ الاحتياطي
.\test-backup.ps1

# انشئ أول نسخة احتياطية
.\backup-database.ps1

# فعّل النسخ التلقائي (كمسؤول)
.\schedule-backup.ps1
```

### مثال 2: تحديث التطبيق بأمان
```powershell
cd "C:\Mutaz\Expense Plan"

# نسخة احتياطية قبل التحديث
.\backup-database.ps1

# إعادة النشر
.\deploy-to-iis.ps1

# إذا حدثت مشكلة - استعد النسخة
.\restore-database.ps1
```

### مثال 3: حل مشكلة
```powershell
cd "C:\Mutaz\Expense Plan"

# استعد نسخة سابقة
.\restore-database.ps1

# أعد تشغيل IIS
iisreset

# تحقق من الخدمات
Get-Service postgresql*
Get-Website
```

---

## ⭐ الخلاصة

| السكريبت | التكرار | الأهمية |
|---------|---------|---------|
| `check-requirements.ps1` | مرة واحدة | ⭐⭐⭐ |
| `deploy-to-iis.ps1` | عند التحديثات | ⭐⭐⭐⭐⭐ |
| `test-backup.ps1` | مرة واحدة | ⭐⭐⭐ |
| `backup-database.ps1` | حسب الحاجة | ⭐⭐⭐⭐⭐ |
| `restore-database.ps1` | عند المشاكل | ⭐⭐⭐⭐ |
| `schedule-backup.ps1` | مرة واحدة | ⭐⭐⭐⭐⭐ |

---

**✨ جاهز لإدارة تطبيقك بكفاءة!**
