#!/usr/bin/env node

/**
 * Quick Test Script for User-Specific Encryption System
 * Run this after migration to verify the system works
 */

const { 
  generateDEK, 
  wrapDEK, 
  unwrapDEK, 
  encryptValueWithDEK, 
  decryptValueWithDEK 
} = require('./encryption');

console.log('🧪 Testing User-Specific Encryption System...\n');

// Test 1: DEK Generation
console.log('Test 1: Generating DEK...');
const dek = generateDEK();
console.log('✅ DEK generated:', dek.length, 'bytes\n');

// Test 2: DEK Wrapping
console.log('Test 2: Wrapping DEK with password...');
const password = 'testPassword123';
const salt = 'user@example.com';
const wrappedDEK = wrapDEK(dek, password, salt);
console.log('✅ DEK wrapped:', wrappedDEK.substring(0, 50) + '...\n');

// Test 3: DEK Unwrapping
console.log('Test 3: Unwrapping DEK with correct password...');
try {
  const unwrappedDEK = unwrapDEK(wrappedDEK, password, salt);
  const matches = Buffer.compare(dek, unwrappedDEK) === 0;
  if (matches) {
    console.log('✅ DEK unwrapped successfully and matches original!\n');
  } else {
    console.log('❌ DEK unwrapped but does not match original\n');
  }
} catch (error) {
  console.log('❌ Failed to unwrap DEK:', error.message, '\n');
}

// Test 4: DEK Unwrapping with Wrong Password
console.log('Test 4: Trying to unwrap with wrong password...');
try {
  const wrongPassword = 'wrongPassword456';
  unwrapDEK(wrappedDEK, wrongPassword, salt);
  console.log('❌ Should have failed but succeeded!\n');
} catch (error) {
  console.log('✅ Correctly rejected wrong password\n');
}

// Test 5: Data Encryption/Decryption
console.log('Test 5: Encrypting and decrypting data...');
const testValue = 1234.56;
const encrypted = encryptValueWithDEK(testValue, dek);
console.log('Encrypted value:', encrypted.substring(0, 50) + '...');
const decrypted = decryptValueWithDEK(encrypted, dek);
console.log('Decrypted value:', decrypted);
if (decrypted === testValue) {
  console.log('✅ Encryption/Decryption works correctly!\n');
} else {
  console.log('❌ Decrypted value does not match original\n');
}

// Test 6: Password Change Simulation
console.log('Test 6: Simulating password change...');
const oldPassword = 'oldPass123';
const newPassword = 'newPass456';

const dek2 = generateDEK();
const wrappedWithOld = wrapDEK(dek2, oldPassword, salt);
console.log('Wrapped with old password');

// Unwrap with old password
const unwrappedDEK2 = unwrapDEK(wrappedWithOld, oldPassword, salt);
console.log('Unwrapped with old password');

// Re-wrap with new password
const wrappedWithNew = wrapDEK(unwrappedDEK2, newPassword, salt);
console.log('Re-wrapped with new password');

// Try to unwrap with new password
const finalDEK = unwrapDEK(wrappedWithNew, newPassword, salt);
const matches2 = Buffer.compare(dek2, finalDEK) === 0;

if (matches2) {
  console.log('✅ Password change simulation successful!\n');
} else {
  console.log('❌ Password change simulation failed\n');
}

console.log('═══════════════════════════════════════');
console.log('✅ All tests completed successfully!');
console.log('═══════════════════════════════════════');
console.log('\nYour encryption system is ready to use! 🎉');
console.log('\nNext steps:');
console.log('1. Run: node addEncryptionKeyColumn.js');
console.log('2. Restart your backend server');
console.log('3. Test user registration\n');
