# دليل استضافة تطبيق Expense Planning على IIS

## المتطلبات الأساسية

### 1. تثبيت البرامج المطلوبة
- **IIS (Internet Information Services)**
  - افتح "Control Panel" > "Programs" > "Turn Windows features on or off"
  - فعّل "Internet Information Services"
  - تأكد من تفعيل:
    - Web Management Tools
    - World Wide Web Services
    - Application Development Features (ASP.NET, WebSocket Protocol)

- **Node.js و npm**
  - حمّل من: https://nodejs.org/
  - تأكد من التثبيت: `node --version` و `npm --version`

- **iisnode**
  - حمّل من: https://github.com/azure/iisnode/releases
  - اختر النسخة المناسبة (x64 أو x86)
  - ثبّت iisnode على جهازك

- **URL Rewrite Module**
  - حمّل من: https://www.iis.net/downloads/microsoft/url-rewrite
  - ثبّت الوحدة على IIS

### 2. تثبيت PostgreSQL
- حمّل من: https://www.postgresql.org/download/windows/
- خلال التثبيت، اختر password: `P@ssw0rd` (أو غيّره في ملف .env)
- افتح pgAdmin وأنشئ database اسمها: `expense_plan`

---

## خطوات الاستضافة

### الخطوة 1: إعداد قاعدة البيانات

1. افتح PowerShell في مجلد backend:
```powershell
cd "C:\Mutaz\Expense Plan\backend"
```

2. نفذ سكريبتات قاعدة البيانات:
```powershell
node createDatabase.js
node initDbWithAuth.js
node addIncomeTable.js
node addExpenseDates.js
node addOpeningBalance.js
node addSalaryChanges.js
node addPlanStartDate.js
```

### الخطوة 2: بناء Frontend للإنتاج

1. افتح PowerShell في مجلد frontend:
```powershell
cd "C:\Mutaz\Expense Plan\frontend"
```

2. ثبّت المكتبات (إذا لم تكن مثبتة):
```powershell
npm install
```

3. ابنِ تطبيق React للإنتاج:
```powershell
npm run build
```
سيتم إنشاء مجلد `build` يحتوي على الملفات الجاهزة للاستضافة.

### الخطوة 3: إعداد Backend على IIS

#### أ. نسخ ملفات Backend

1. أنشئ مجلد جديد للاستضافة:
```
C:\inetpub\wwwroot\expense-plan-api
```

2. انسخ الملفات التالية من `backend` إلى المجلد الجديد:
   - جميع ملفات `.js`
   - مجلد `routes`
   - مجلد `middleware`
   - ملف `package.json`
   - ملف `.env`
   - ملف `web.config` (موجود بالفعل)

3. ثبّت المكتبات في مجلد الاستضافة:
```powershell
cd C:\inetpub\wwwroot\expense-plan-api
npm install --production
```

#### ب. إنشاء موقع Backend في IIS

1. افتح **IIS Manager** (اكتب `inetmgr` في Run)

2. انقر بزر الماوس الأيمن على **Sites** > **Add Website**

3. املأ البيانات:
   - **Site name:** ExpensePlanAPI
   - **Physical path:** `C:\inetpub\wwwroot\expense-plan-api`
   - **Binding:**
     - Type: http
     - IP address: All Unassigned
     - Port: **5000**
     - Host name: (اتركه فارغاً)

4. اضغط **OK**

5. تأكد من أن Application Pool يستخدم **No Managed Code**:
   - اذهب إلى **Application Pools**
   - اختر **ExpensePlanAPI**
   - انقر **Basic Settings**
   - اختر **.NET CLR version: No Managed Code**

#### ج. منح الصلاحيات

1. انقر بزر الماوس الأيمن على مجلد `C:\inetpub\wwwroot\expense-plan-api`
2. اختر **Properties** > **Security** > **Edit**
3. اضغط **Add** وأضف المستخدمين:
   - `IIS_IUSRS`
   - `IUSR`
4. امنحهم صلاحيات: `Read & Execute`, `List folder contents`, `Read`

### الخطوة 4: إعداد Frontend على IIS

#### أ. نسخ ملفات Frontend

1. أنشئ مجلد جديد للاستضافة:
```
C:\inetpub\wwwroot\expense-plan-app
```

2. انسخ **محتويات** مجلد `frontend/build` إلى المجلد الجديد
   - **ملاحظة:** انسخ محتويات المجلد وليس المجلد نفسه

#### ب. إنشاء موقع Frontend في IIS

1. في **IIS Manager**، انقر بزر الماوس الأيمن على **Sites** > **Add Website**

2. املأ البيانات:
   - **Site name:** ExpensePlanApp
   - **Physical path:** `C:\inetpub\wwwroot\expense-plan-app`
   - **Binding:**
     - Type: http
     - IP address: All Unassigned
     - Port: **3000**
     - Host name: (اتركه فارغاً)

3. اضغط **OK**

### الخطوة 5: تكوين الاتصال بين Frontend و Backend

تأكد من أن Frontend يشير إلى Backend الصحيح. إذا كنت تستخدم أجهزة أخرى على نفس الشبكة:

1. اعرف IP الخاص بجهازك:
```powershell
ipconfig
```
ابحث عن **IPv4 Address** (مثلاً: 192.168.1.100)

2. في ملف `frontend/src/App.js`، غيّر:
```javascript
const API_URL = 'http://localhost:5000/api';
```
إلى:
```javascript
const API_URL = 'http://192.168.1.100:5000/api';
```
أو احتفظ بـ `localhost` إذا كنت ستستخدم من نفس الجهاز فقط.

3. أعد البناء والنشر:
```powershell
cd "C:\Mutaz\Expense Plan\frontend"
npm run build
# ثم انسخ محتويات build مرة أخرى
```

### الخطوة 6: تكوين Firewall

إذا كنت تريد الوصول من أجهزة أخرى:

1. افتح **Windows Defender Firewall**
2. اختر **Advanced settings**
3. **Inbound Rules** > **New Rule**
4. اختر **Port** > **TCP** > **Specific local ports:** `3000,5000`
5. اختر **Allow the connection**
6. طبّق على جميع الشبكات
7. أعطه اسماً: "Expense Plan App"

---

## الاختبار والتشغيل

### 1. تشغيل المواقع

في **IIS Manager**:
1. تأكد من أن **ExpensePlanAPI** و **ExpensePlanApp** في حالة **Started**
2. إذا كانت متوقفة، انقر بزر الماوس الأيمن > **Start**

### 2. فتح التطبيق

افتح المتصفح واذهب إلى:
```
http://localhost:3000
```

أو من جهاز آخر على نفس الشبكة:
```
http://192.168.1.100:3000
```
(غيّر IP حسب جهازك)

### 3. التحقق من Backend

اختبر API:
```
http://localhost:5000/api/settings
```

---

## استكشاف الأخطاء

### إذا لم يعمل Backend:

1. **تحقق من logs في:**
   ```
   C:\inetpub\wwwroot\expense-plan-api\iisnode
   ```

2. **تأكد من PostgreSQL يعمل:**
   - افتح **Services** (services.msc)
   - ابحث عن **postgresql**
   - تأكد من أنه **Running**

3. **تحقق من ملف .env:**
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=expense_plan
   DB_USER=postgres
   DB_PASSWORD=P@ssw0rd
   JWT_SECRET=your-secret-key-change-this-in-production
   PORT=5000
   ```

4. **أعد تشغيل Application Pool:**
   - IIS Manager > Application Pools
   - اختر ExpensePlanAPI
   - انقر **Recycle**

### إذا لم يعمل Frontend:

1. **تحقق من web.config موجود في:**
   ```
   C:\inetpub\wwwroot\expense-plan-app\web.config
   ```

2. **تأكد من URL Rewrite Module مثبت**

3. **افحص Browser Console (F12)** للبحث عن أخطاء JavaScript

### أخطاء CORS:

إذا ظهرت أخطاء CORS، تأكد من أن backend يسمح بالاتصالات من Frontend:

في `backend/server.js`، تأكد من:
```javascript
app.use(cors({
  origin: 'http://localhost:3000', // أو IP جهازك
  credentials: true
}));
```

---

## نصائح الأمان للإنتاج

### 1. تغيير البيانات الحساسة:
- غيّر `JWT_SECRET` في ملف `.env`
- غيّر password قاعدة البيانات

### 2. استخدام HTTPS:
- احصل على شهادة SSL
- اربطها في IIS Bindings

### 3. تحديث NODE_ENV:
في `backend/.env`:
```
NODE_ENV=production
```

### 4. تعطيل Debug:
تأكد من أن `debuggingEnabled="false"` في web.config

---

## إعادة التشغيل بعد التحديثات

### لتحديث Backend:
1. انسخ الملفات الجديدة إلى `C:\inetpub\wwwroot\expense-plan-api`
2. في IIS Manager، أعد تشغيل Application Pool

### لتحديث Frontend:
1. ابنِ مرة أخرى: `npm run build`
2. انسخ محتويات `build` إلى `C:\inetpub\wwwroot\expense-plan-app`
3. مسح cache المتصفح (Ctrl+Shift+Delete)

---

## الدعم

إذا واجهت أي مشكلة:
1. راجع IIS logs في Event Viewer
2. افحص iisnode logs في مجلد Backend
3. تحقق من Browser Console للأخطاء
4. تأكد من أن جميع services تعمل (IIS, PostgreSQL)

---

## ملخص المنافذ والعناوين

| الخدمة | المنفذ | العنوان المحلي | العنوان على الشبكة |
|--------|--------|----------------|---------------------|
| Frontend | 3000 | http://localhost:3000 | http://[YOUR-IP]:3000 |
| Backend API | 5000 | http://localhost:5000 | http://[YOUR-IP]:5000 |
| PostgreSQL | 5432 | localhost:5432 | - |

استبدل [YOUR-IP] بعنوان IP الخاص بجهازك.

---

**تهانينا! 🎉** تطبيقك الآن يعمل على IIS وجاهز للاستخدام!
