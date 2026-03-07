const bcrypt = require('bcrypt');
const pool = require('./db');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function resetPassword() {
  try {
    // Get user email
    rl.question('Enter user email: ', async (email) => {
      rl.question('Enter new password: ', async (password) => {
        try {
          // Check if user exists
          const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
          
          if (userResult.rows.length === 0) {
            console.log('❌ User not found!');
            process.exit(1);
          }

          // Hash the new password
          const hashedPassword = await bcrypt.hash(password, 10);

          // Update password
          await pool.query(
            'UPDATE users SET password = $1 WHERE email = $2',
            [hashedPassword, email]
          );

          console.log('✅ Password updated successfully!');
          console.log(`Email: ${email}`);
          console.log(`New password: ${password}`);
          
          process.exit(0);
        } catch (error) {
          console.error('❌ Error:', error.message);
          process.exit(1);
        }
      });
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetPassword();
