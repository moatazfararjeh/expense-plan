# ✅ قائمة التحقق - نظام التشفير الجديد

## 📋 خطوات التفعيل (اتبعها بالترتيب)

### ☐ الخطوة 1: اختبار نظام التشفير
```powershell
cd backend
npm run test:encryption
```
**المتوقع**: رؤية ✅ لجميع الاختبارات

---

### ☐ الخطوة 2: تشغيل ترحيل قاعدة البيانات
**اختر طريقة واحدة:**

```powershell
# الطريقة الأسهل - PowerShell
.\run-migration.ps1

# أو - Command Line
run-migration.bat

# أو - npm
cd backend
npm run migrate:encryption
```

**المتوقع**: رسالة "✅ Migration completed successfully!"

---

### ☐ الخطوة 3: إعادة تشغيل Backend
```powershell
cd backend
node server.js
```

**المتوقع**: Backend يعمل على المنفذ المحدد (مثلاً 5000)

---

### ☐ الخطوة 4: اختبار تسجيل مستخدم جديد

#### باستخدام Frontend:
1. افتح تطبيق Frontend
2. اذهب لصفحة التسجيل
3. سجل مستخدم جديد
4. **المتوقع**: تسجيل ناجح

#### باستخدام curl/Postman:
```powershell
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"username\":\"testuser\",\"email\":\"test@test.com\",\"password\":\"test123456\"}'
```

**المتوقع**: 
```json
{
  "message": "User registered successfully",
  "token": "...",
  "user": {...}
}
```

---

### ☐ الخطوة 5: التحقق من قاعدة البيانات

```sql
-- تحقق من وجود عمود encryption_key_wrapped
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users';

-- تحقق من المستخدم الجديد
SELECT id, username, email, 
       CASE 
         WHEN encryption_key_wrapped IS NOT NULL THEN 'Has DEK ✅'
         ELSE 'No DEK ❌'
       END as dek_status
FROM users;
```

**المتوقع**: المستخدم الجديد لديه DEK ✅

---

### ☐ الخطوة 6: اختبار تغيير كلمة المرور

```powershell
# 1. سجل دخول أولاً واحصل على token
$token = "YOUR_TOKEN_HERE"

# 2. غير كلمة المرور
curl -X POST http://localhost:5000/api/auth/change-password `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{\"oldPassword\":\"test123456\",\"newPassword\":\"newpass789\"}'
```

**المتوقع**: 
```json
{
  "message": "Password changed successfully"
}
```

---

### ☐ الخطوة 7: اختبار تسجيل دخول بكلمة المرور الجديدة

```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@test.com\",\"password\":\"newpass789\"}'
```

**المتوقع**: تسجيل دخول ناجح ✅

---

## 🔍 استكشاف الأخطاء

### ❌ "Column encryption_key_wrapped already exists"
**الحل**: التحديث تم مسبقاً، تخطى خطوة الترحيل ✅

### ❌ "Failed to unwrap DEK"
**السبب**: كلمة مرور خاطئة أو DEK معطوب
**الحل**: تحقق من كلمة المرور أو استخدم reset password

### ❌ "User not found" بعد الترحيل
**السبب**: مشكلة في قاعدة البيانات
**الحل**: تحقق من اتصال قاعدة البيانات

### ❌ Backend لا يبدأ
**الحل**: 
```powershell
# تحقق من dependencies
cd backend
npm install

# تحقق من .env
# تأكد من وجود DATABASE_URL و JWT_SECRET
```

---

## ✨ ميزات إضافية (اختياري)

### ☐ تفعيل HTTPS (للأمان الكامل)
```powershell
# استخدم أحد السكريبتات الموجودة
.\setup-https.ps1
```

### ☐ إعداد Backup للقاعدة
```powershell
.\backup-database.ps1
```

### ☐ تفعيل Session Management (للإنتاج)
- راجع [ENCRYPTION_SYSTEM.md](ENCRYPTION_SYSTEM.md) قسم Session Management

---

## 📊 التحقق النهائي

### ✅ قائمة التحقق النهائية:

- [ ] نظام التشفير يعمل (test:encryption)
- [ ] قاعدة البيانات محدثة (عمود encryption_key_wrapped موجود)
- [ ] Backend يعمل بدون أخطاء
- [ ] تسجيل مستخدم جديد ينجح
- [ ] المستخدم الجديد لديه DEK
- [ ] تغيير كلمة المرور يعمل
- [ ] تسجيل الدخول بكلمة المرور الجديدة ينجح
- [ ] البيانات المشفرة تُقرأ بشكل صحيح

---

## 🎯 عند اكتمال جميع الخطوات:

### ✅✅✅ **تهانينا!** ✅✅✅

لديك الآن:
- 🔐 نظام أمان من الدرجة الأولى
- 👤 تشفير خاص بكل مستخدم
- 🔄 إمكانية تغيير كلمة المرور
- 🛡️ حماية كاملة من الوصول غير المصرح

**النظام جاهز للإنتاج!** 🚀

---

## 📚 مراجع إضافية

- [QUICK_START_ENCRYPTION.md](QUICK_START_ENCRYPTION.md) - دليل البداية السريعة
- [ENCRYPTION_SETUP_GUIDE.md](ENCRYPTION_SETUP_GUIDE.md) - دليل الإعداد الكامل
- [ENCRYPTION_SYSTEM.md](ENCRYPTION_SYSTEM.md) - التوثيق التقني
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - ملخص التنفيذ

---

**آخر تحديث**: فبراير 18، 2026  
**الحالة**: ✅ جاهز للتنفيذ
