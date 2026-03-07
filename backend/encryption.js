const crypto = require('crypto');

// MASTER KEY - Used only for legacy data or system-level encryption
// Each user will have their own Data Encryption Key (DEK)
const MASTER_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-this-in-production-32chars!!';
const MASTER_KEY_BUFFER = crypto.createHash('sha256').update(MASTER_KEY).digest();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const TAG_LENGTH = 16; // GCM tag length
const DEK_LENGTH = 32; // Data Encryption Key length (256 bits)

/**
 * Generate a random Data Encryption Key (DEK) for a user
 * @returns {Buffer} - Random 32-byte key
 */
function generateDEK() {
  return crypto.randomBytes(DEK_LENGTH);
}

/**
 * Derive an encryption key from a user's password
 * @param {string} password - User's password
 * @param {string} salt - Salt for key derivation (user ID or email)
 * @returns {Buffer} - Derived key
 */
function deriveKeyFromPassword(password, salt) {
  // Use PBKDF2 to derive a key from password
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/**
 * Wrap (encrypt) a DEK using user's password
 * @param {Buffer} dek - The Data Encryption Key to wrap
 * @param {string} password - User's password
 * @param {string} salt - Salt (user ID or email)
 * @returns {string} - Wrapped key in format: iv:encrypted:tag (all in hex)
 */
function wrapDEK(dek, password, salt) {
  try {
    // Derive key from password
    const kek = deriveKeyFromPassword(password, salt);
    
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, kek, iv);
    
    // Encrypt the DEK
    let encrypted = cipher.update(dek, null, 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag
    const tag = cipher.getAuthTag();
    
    // Return iv:encrypted:tag (all in hex)
    return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
  } catch (error) {
    console.error('DEK wrapping error:', error);
    throw new Error('Failed to wrap DEK');
  }
}

/**
 * Unwrap (decrypt) a DEK using user's password
 * @param {string} wrappedDEK - The wrapped DEK in format: iv:encrypted:tag
 * @param {string} password - User's password
 * @param {string} salt - Salt (user ID or email)
 * @returns {Buffer} - The original DEK
 */
function unwrapDEK(wrappedDEK, password, salt) {
  try {
    // Derive key from password
    const kek = deriveKeyFromPassword(password, salt);
    
    // Split the wrapped DEK
    const parts = wrappedDEK.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid wrapped DEK format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const tag = Buffer.from(parts[2], 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, kek, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt the DEK
    let decrypted = decipher.update(encrypted, 'hex');
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  } catch (error) {
    console.error('DEK unwrapping error:', error);
    throw new Error('Failed to unwrap DEK - Invalid password or corrupted key');
  }
}

/**
 * Encrypt a value using a specific DEK
 * @param {number|string} value - The value to encrypt
 * @param {Buffer} dek - The Data Encryption Key
 * @returns {string} - Encrypted value in format: iv:encrypted:tag (all in hex)
 */
function encryptValueWithDEK(value, dek) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  try {
    // Convert to string to handle both numbers and strings
    const text = String(value);
    
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag
    const tag = cipher.getAuthTag();
    
    // Return iv:encrypted:tag (all in hex)
    return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt value');
  }
}

/**
 * Decrypt a value using a specific DEK
 * @param {string} encryptedValue - The encrypted value in format: iv:encrypted:tag
 * @param {Buffer} dek - The Data Encryption Key
 * @returns {number} - The original numeric value
 */
function decryptValueWithDEK(encryptedValue, dek) {
  if (encryptedValue === null || encryptedValue === undefined || encryptedValue === '') {
    return null;
  }

  try {
    // Check if value is already decrypted (for backward compatibility)
    if (!encryptedValue.includes(':')) {
      const num = parseFloat(encryptedValue);
      if (!isNaN(num)) {
        return num;
      }
      return null;
    }

    // Split the encrypted value
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const tag = Buffer.from(parts[2], 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Convert back to number
    return parseFloat(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

/**
 * Legacy function - Encrypt a numeric value using MASTER_KEY
 * Used for backward compatibility
 * @param {number|string} value - The value to encrypt
 * @returns {string} - Encrypted value in format: iv:encrypted:tag (all in hex)
 */
function encryptValue(value) {
  return encryptValueWithDEK(value, MASTER_KEY_BUFFER);
}

/**
 * Legacy function - Decrypt an encrypted value using MASTER_KEY
 * Used for backward compatibility
 * @param {string} encryptedValue - The encrypted value in format: iv:encrypted:tag
 * @returns {number} - The original numeric value
 */
function decryptValue(encryptedValue) {
  return decryptValueWithDEK(encryptedValue, MASTER_KEY_BUFFER);
}

/**
 * Encrypt multiple fields in an object using a specific DEK
 * @param {object} obj - The object containing fields to encrypt
 * @param {string[]} fields - Array of field names to encrypt
 * @param {Buffer} dek - The Data Encryption Key
 * @returns {object} - Object with encrypted fields
 */
function encryptFieldsWithDEK(obj, fields, dek) {
  const result = { ...obj };
  
  fields.forEach(field => {
    if (obj[field] !== undefined && obj[field] !== null) {
      result[field] = encryptValueWithDEK(obj[field], dek);
    }
  });
  
  return result;
}

/**
 * Decrypt multiple fields in an object using a specific DEK
 * @param {object} obj - The object containing encrypted fields
 * @param {string[]} fields - Array of field names to decrypt
 * @param {Buffer} dek - The Data Encryption Key
 * @returns {object} - Object with decrypted fields
 */
function decryptFieldsWithDEK(obj, fields, dek) {
  const result = { ...obj };
  
  fields.forEach(field => {
    if (obj[field] !== undefined && obj[field] !== null) {
      result[field] = decryptValueWithDEK(obj[field], dek);
    }
  });
  
  return result;
}

/**
 * Decrypt array of objects using a specific DEK
 * @param {array} arr - Array of objects with encrypted fields
 * @param {string[]} fields - Array of field names to decrypt
 * @param {Buffer} dek - The Data Encryption Key
 * @returns {array} - Array with decrypted objects
 */
function decryptArrayWithDEK(arr, fields, dek) {
  if (!Array.isArray(arr)) {
    return arr;
  }
  
  return arr.map(item => decryptFieldsWithDEK(item, fields, dek));
}

/**
 * Legacy: Encrypt multiple fields in an object
 * @param {object} obj - The object containing fields to encrypt
 * @param {string[]} fields - Array of field names to encrypt
 * @returns {object} - Object with encrypted fields
 */
function encryptFields(obj, fields) {
  return encryptFieldsWithDEK(obj, fields, MASTER_KEY_BUFFER);
}

/**
 * Legacy: Decrypt multiple fields in an object
 * @param {object} obj - The object containing encrypted fields
 * @param {string[]} fields - Array of field names to decrypt
 * @returns {object} - Object with decrypted fields
 */
function decryptFields(obj, fields) {
  return decryptFieldsWithDEK(obj, fields, MASTER_KEY_BUFFER);
}

/**
 * Legacy: Decrypt array of objects
 * @param {array} arr - Array of objects with encrypted fields
 * @param {string[]} fields - Array of field names to decrypt
 * @returns {array} - Array with decrypted objects
 */
function decryptArray(arr, fields) {
  return decryptArrayWithDEK(arr, fields, MASTER_KEY_BUFFER);
}

module.exports = {
  // New DEK-based functions
  generateDEK,
  deriveKeyFromPassword,
  wrapDEK,
  unwrapDEK,
  encryptValueWithDEK,
  decryptValueWithDEK,
  encryptFieldsWithDEK,
  decryptFieldsWithDEK,
  decryptArrayWithDEK,
  
  // Legacy functions (for backward compatibility)
  encryptValue,
  decryptValue,
  encryptFields,
  decryptFields,
  decryptArray
};
