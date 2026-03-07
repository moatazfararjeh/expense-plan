const { encryptValue, decryptValue, encryptFields, decryptFields, decryptArray } = require('./encryption');
require('dotenv').config();

console.log('========================================');
console.log('  Encryption System Test Suite');
console.log('========================================\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, callback) {
  try {
    console.log(`Testing: ${name}...`);
    callback();
    console.log(`✓ PASSED: ${name}\n`);
    testsPassed++;
  } catch (error) {
    console.log(`✗ FAILED: ${name}`);
    console.log(`  Error: ${error.message}\n`);
    testsFailed++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

// Test 1: Encrypt and decrypt a simple number
test('Encrypt and decrypt integer', () => {
  const original = 1000;
  const encrypted = encryptValue(original);
  const decrypted = decryptValue(encrypted);
  
  console.log(`  Original: ${original}`);
  console.log(`  Encrypted: ${encrypted}`);
  console.log(`  Decrypted: ${decrypted}`);
  
  assertEquals(encrypted.includes(':'), true, 'Encrypted value should contain colons');
  assertEquals(decrypted, original, 'Decrypted value should match original');
});

// Test 2: Encrypt and decrypt a decimal number
test('Encrypt and decrypt decimal', () => {
  const original = 1234.56;
  const encrypted = encryptValue(original);
  const decrypted = decryptValue(encrypted);
  
  console.log(`  Original: ${original}`);
  console.log(`  Encrypted: ${encrypted}`);
  console.log(`  Decrypted: ${decrypted}`);
  
  assertEquals(decrypted, original, 'Decrypted decimal should match original');
});

// Test 3: Encrypt and decrypt zero
test('Encrypt and decrypt zero', () => {
  const original = 0;
  const encrypted = encryptValue(original);
  const decrypted = decryptValue(encrypted);
  
  console.log(`  Original: ${original}`);
  console.log(`  Encrypted: ${encrypted}`);
  console.log(`  Decrypted: ${decrypted}`);
  
  assertEquals(decrypted, original, 'Decrypted zero should match original');
});

// Test 4: Encrypt and decrypt large number
test('Encrypt and decrypt large number', () => {
  const original = 999999.99;
  const encrypted = encryptValue(original);
  const decrypted = decryptValue(encrypted);
  
  console.log(`  Original: ${original}`);
  console.log(`  Encrypted: ${encrypted}`);
  console.log(`  Decrypted: ${decrypted}`);
  
  assertEquals(decrypted, original, 'Decrypted large number should match original');
});

// Test 5: Handle null values
test('Handle null values', () => {
  const encrypted = encryptValue(null);
  const decrypted = decryptValue(null);
  
  console.log(`  Encrypted null: ${encrypted}`);
  console.log(`  Decrypted null: ${decrypted}`);
  
  assertEquals(encrypted, null, 'Encrypted null should return null');
  assertEquals(decrypted, null, 'Decrypted null should return null');
});

// Test 6: Handle undefined values
test('Handle undefined values', () => {
  const encrypted = encryptValue(undefined);
  const decrypted = decryptValue(undefined);
  
  console.log(`  Encrypted undefined: ${encrypted}`);
  console.log(`  Decrypted undefined: ${decrypted}`);
  
  assertEquals(encrypted, null, 'Encrypted undefined should return null');
  assertEquals(decrypted, null, 'Decrypted undefined should return null');
});

// Test 7: Encrypt fields in object
test('Encrypt fields in object', () => {
  const obj = {
    name: 'Test Expense',
    amount: 500,
    category: 'Food'
  };
  
  const encrypted = encryptFields(obj, ['amount']);
  
  console.log(`  Original amount: ${obj.amount}`);
  console.log(`  Encrypted amount: ${encrypted.amount}`);
  
  assertEquals(encrypted.name, obj.name, 'Name should not be encrypted');
  assertEquals(encrypted.category, obj.category, 'Category should not be encrypted');
  assertEquals(encrypted.amount.includes(':'), true, 'Amount should be encrypted');
});

// Test 8: Decrypt fields in object
test('Decrypt fields in object', () => {
  const original = { name: 'Test', amount: 750 };
  const encrypted = encryptFields(original, ['amount']);
  const decrypted = decryptFields(encrypted, ['amount']);
  
  console.log(`  Original: ${JSON.stringify(original)}`);
  console.log(`  Encrypted: ${JSON.stringify(encrypted)}`);
  console.log(`  Decrypted: ${JSON.stringify(decrypted)}`);
  
  assertEquals(decrypted.amount, original.amount, 'Decrypted amount should match original');
});

// Test 9: Decrypt array of objects
test('Decrypt array of objects', () => {
  const original = [
    { id: 1, amount: 100 },
    { id: 2, amount: 200 },
    { id: 3, amount: 300 }
  ];
  
  // Encrypt all amounts
  const encrypted = original.map(item => ({
    ...item,
    amount: encryptValue(item.amount)
  }));
  
  // Decrypt array
  const decrypted = decryptArray(encrypted, ['amount']);
  
  console.log(`  Original amounts: ${original.map(i => i.amount).join(', ')}`);
  console.log(`  Decrypted amounts: ${decrypted.map(i => i.amount).join(', ')}`);
  
  for (let i = 0; i < original.length; i++) {
    assertEquals(decrypted[i].amount, original[i].amount, `Item ${i} amount should match`);
  }
});

// Test 10: Different encryptions for same value (IV randomness)
test('Different encryptions for same value', () => {
  const original = 5000;
  const encrypted1 = encryptValue(original);
  const encrypted2 = encryptValue(original);
  
  console.log(`  Original: ${original}`);
  console.log(`  Encryption 1: ${encrypted1}`);
  console.log(`  Encryption 2: ${encrypted2}`);
  
  if (encrypted1 === encrypted2) {
    throw new Error('Two encryptions of the same value should be different (IV randomness)');
  }
  
  const decrypted1 = decryptValue(encrypted1);
  const decrypted2 = decryptValue(encrypted2);
  
  assertEquals(decrypted1, original, 'First decryption should match original');
  assertEquals(decrypted2, original, 'Second decryption should match original');
});

// Test 11: Backward compatibility with plain numbers
test('Backward compatibility with plain numbers', () => {
  const plainNumber = '1500';
  const decrypted = decryptValue(plainNumber);
  
  console.log(`  Plain number: ${plainNumber}`);
  console.log(`  Decrypted: ${decrypted}`);
  
  assertEquals(decrypted, 1500, 'Should decrypt plain numbers for backward compatibility');
});

// Print summary
console.log('========================================');
console.log('  Test Summary');
console.log('========================================');
console.log(`Total tests: ${testsPassed + testsFailed}`);
console.log(`✓ Passed: ${testsPassed}`);
console.log(`✗ Failed: ${testsFailed}`);
console.log('========================================\n');

if (testsFailed === 0) {
  console.log('✓ All tests passed! Encryption system is working correctly.\n');
  process.exit(0);
} else {
  console.log('✗ Some tests failed. Please check the errors above.\n');
  process.exit(1);
}
