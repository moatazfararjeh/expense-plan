# User-Specific Encryption System

## 🔐 Overview

This application now implements a **User-Specific Encryption System** using the **Wrapped Key** approach. Each user has their own unique Data Encryption Key (DEK) that is encrypted (wrapped) using their password.

## 🎯 Key Benefits

1. **Privacy**: Each user's data is encrypted with their own unique key
2. **Security**: Even database administrators cannot decrypt user data without the password
3. **Flexibility**: Users can change their password without re-encrypting all data
4. **Compliance**: Meets security requirements for sensitive financial data

## 🏗️ Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│  User Registration                                           │
├─────────────────────────────────────────────────────────────┤
│  1. User provides: username, email, password                 │
│  2. Generate random DEK (32 bytes)                           │
│  3. Derive Key Encryption Key (KEK) from password + email    │
│  4. Wrap DEK using KEK → Wrapped DEK                         │
│  5. Store: hashed password + wrapped DEK in database         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  User Login                                                  │
├─────────────────────────────────────────────────────────────┤
│  1. User provides: email, password                           │
│  2. Verify password hash                                     │
│  3. Derive KEK from password + email                         │
│  4. Unwrap DEK using KEK                                     │
│  5. Store DEK in session for data encryption/decryption      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Data Encryption/Decryption                                  │
├─────────────────────────────────────────────────────────────┤
│  1. Get user's DEK from session                              │
│  2. Use DEK to encrypt/decrypt data with AES-256-GCM         │
│  3. Each encrypted value has unique IV and auth tag          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Password Change                                             │
├─────────────────────────────────────────────────────────────┤
│  1. User provides: old password + new password               │
│  2. Unwrap DEK using old password                            │
│  3. Re-wrap DEK using new password                           │
│  4. Update: password hash + wrapped DEK                      │
│  ✅ Data remains encrypted with same DEK (no re-encryption)  │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,                    -- bcrypt hash
  encryption_key_wrapped TEXT,               -- Wrapped DEK (new column)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Setup Instructions

### 1. Run Database Migration

```bash
cd backend
node addEncryptionKeyColumn.js
```

This will add the `encryption_key_wrapped` column to the users table.

### 2. Environment Variables

Ensure your `.env` file has:

```env
ENCRYPTION_KEY=your-master-key-for-legacy-data-32-chars
JWT_SECRET=your-jwt-secret-key
```

### 3. Restart Backend Server

```bash
node server.js
```

## 📡 API Endpoints

### Register New User

**POST** `/api/auth/register`

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

Response:
```json
{
  "message": "User registered successfully",
  "token": "jwt-token",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

### Login

**POST** `/api/auth/login`

```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

### Change Password

**POST** `/api/auth/change-password`

Headers:
```
Authorization: Bearer <token>
```

Body:
```json
{
  "oldPassword": "currentPassword",
  "newPassword": "newSecurePassword456"
}
```

### Reset Password (Admin/Recovery)

**POST** `/api/auth/reset-password`

```json
{
  "email": "john@example.com",
  "newPassword": "newPassword123",
  "resetToken": "recovery-token"
}
```

⚠️ **WARNING**: Password reset generates a NEW DEK, making old encrypted data inaccessible!

## 🔒 Security Features

### Encryption Algorithm
- **Algorithm**: AES-256-GCM (Authenticated Encryption)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 128 bits (16 bytes)
- **Authentication**: GCM provides built-in authentication tag

### Key Derivation
- **Function**: PBKDF2-SHA256
- **Iterations**: 100,000
- **Salt**: User's email (unique per user)
- **Output**: 256-bit key

### Storage Format

Encrypted values are stored as:
```
<IV (hex)>:<Encrypted Data (hex)>:<Auth Tag (hex)>
```

Example:
```
a1b2c3d4e5f6...:<encrypted>:9f8e7d6c5b4a...
```

## ⚠️ Important Considerations

### Password Reset Implications

When a user resets their password (without knowing the old one):
1. A **new DEK** is generated
2. The old DEK cannot be recovered
3. **All previously encrypted data becomes inaccessible**

Options to handle this:
- ✅ **Clear old data**: Delete or mark as orphaned
- ✅ **Notify user**: Warn about data loss before reset
- ❌ **Master recovery key**: Security risk (defeats purpose)

### Session Management

Currently, the DEK needs to be available for each request. Options:

1. **Server-side sessions** (Recommended for production)
   - Store DEK in encrypted session after login
   - Use session middleware (express-session)
   - DEK persists until logout

2. **Client-side encrypted storage** (Alternative)
   - Encrypt DEK with session key, send to client
   - Client sends encrypted DEK with each request
   - Server decrypts using session key

3. **Password on each request** (Current implementation - NOT for production)
   - Send password in `x-user-password` header
   - Security risk if using HTTP
   - Only acceptable over HTTPS with short token expiry

## 🔄 Migration Path for Existing Users

For users created before this update:

1. **On next login**: Detect NULL `encryption_key_wrapped`
2. **Prompt for action**:
   - Option A: Set new password → Generate DEK
   - Option B: Continue using master key (backward compatibility)
3. **Gradual migration**: Users migrate when they next log in

## 📝 Code Examples

### Using DEK in Routes

```javascript
const { authenticateWithDEK } = require('./middleware/auth');
const { encryptValueWithDEK, decryptValueWithDEK } = require('./encryption');

router.post('/api/secretdata', authenticateWithDEK, async (req, res) => {
  const userDEK = req.userDEK;
  const { value } = req.body;
  
  // Encrypt data with user's DEK
  const encrypted = encryptValueWithDEK(value, userDEK);
  
  // Save to database
  await pool.query(
    'INSERT INTO secrets (user_id, encrypted_value) VALUES ($1, $2)',
    [req.user.id, encrypted]
  );
  
  res.json({ message: 'Data encrypted and saved' });
});

router.get('/api/secretdata', authenticateWithDEK, async (req, res) => {
  const userDEK = req.userDEK;
  
  // Get from database
  const result = await pool.query(
    'SELECT encrypted_value FROM secrets WHERE user_id = $1',
    [req.user.id]
  );
  
  // Decrypt with user's DEK
  const decrypted = decryptValueWithDEK(result.rows[0].encrypted_value, userDEK);
  
  res.json({ value: decrypted });
});
```

## 🧪 Testing

### Test User Registration with DEK

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "test123456"
  }'
```

### Test Password Change

```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "test123456",
    "newPassword": "newPassword789"
  }'
```

## 📚 References

- [NIST Key Management Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [AES-GCM Specification](https://csrc.nist.gov/publications/detail/sp/800-38d/final)

---

**Implementation Date**: February 2026  
**Version**: 2.0.0  
**Status**: ✅ Production Ready (with session management implementation)
