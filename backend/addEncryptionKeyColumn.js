/**
 * Database Migration Script
 * Adds encryption_key_wrapped column to users table
 * This column stores each user's wrapped (encrypted) Data Encryption Key (DEK)
 */

const pool = require('./db');
const { generateDEK, wrapDEK } = require('./encryption');
const bcrypt = require('bcrypt');

async function addEncryptionKeyColumn() {
  const client = await pool.connect();

  try {
    console.log('Starting database migration...');

    // Start transaction
    await client.query('BEGIN');

    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'encryption_key_wrapped'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('Column encryption_key_wrapped already exists. Skipping...');
      await client.query('ROLLBACK');
      return;
    }

    // Add encryption_key_wrapped column
    console.log('Adding encryption_key_wrapped column to users table...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN encryption_key_wrapped TEXT
    `);

    console.log('Column added successfully!');

    // For existing users, we have a problem:
    // We don't have their passwords to wrap a DEK
    // Options:
    // 1. Force password reset on next login
    // 2. Use a temporary master key for existing data
    // 3. Delete their encrypted data
    //
    // For now, we'll leave encryption_key_wrapped as NULL
    // The system will detect this and can handle it appropriately

    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('1. Existing users will have NULL encryption_key_wrapped');
    console.log('2. They need to reset their password to generate a DEK');
    console.log('3. Old encrypted data will use the master key (backward compatibility)');
    console.log('4. New users will automatically get a DEK on registration');

    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
if (require.main === module) {
  addEncryptionKeyColumn()
    .then(() => {
      console.log('\nMigration script finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nMigration script failed:', error);
      process.exit(1);
    });
}

module.exports = { addEncryptionKeyColumn };
