const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { generateDEK, wrapDEK, unwrapDEK } = require('../encryption');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique Data Encryption Key (DEK) for this user
    const dek = generateDEK();
    
    // Wrap (encrypt) the DEK using the user's password
    // Use email as salt for key derivation
    const wrappedDEK = wrapDEK(dek, password, email);

    // Create user with wrapped DEK
    const result = await pool.query(
      'INSERT INTO users (username, email, password, encryption_key_wrapped) VALUES ($1, $2, $3, $4) RETURNING id, username, email, created_at',
      [username, email, hashedPassword, wrappedDEK]
    );

    const user = result.rows[0];

    // Generate JWT token (also include wrapped DEK for client-side storage if needed)
    const token = jwt.sign({ 
      id: user.id, 
      username: user.username,
      email: user.email
    }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify that DEK can be unwrapped (validates password is correct)
    // This also ensures the encryption system is working
    try {
      if (user.encryption_key_wrapped) {
        const dek = unwrapDEK(user.encryption_key_wrapped, password, user.email);
        // DEK unwrapped successfully - password is valid
      }
    } catch (dekError) {
      console.error('DEK unwrap error during login:', dekError);
      // This should rarely happen if password hash matches
      return res.status(401).json({ error: 'Authentication failed - encryption key error' });
    }

    // Generate JWT token
    const token = jwt.sign({ 
      id: user.id, 
      username: user.username,
      email: user.email
    }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Error logging in',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(403).json({ error: 'Invalid token' });
  }
});

// Change password (requires old password)
router.post('/change-password', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    // Get user data
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Verify old password
    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid old password' });
    }

    // Unwrap DEK with old password
    let dek;
    try {
      dek = unwrapDEK(user.encryption_key_wrapped, oldPassword, user.email);
    } catch (error) {
      console.error('Failed to unwrap DEK with old password:', error);
      return res.status(500).json({ error: 'Failed to decrypt encryption key' });
    }

    // Re-wrap DEK with new password
    const newWrappedDEK = wrapDEK(dek, newPassword, user.email);

    // Hash new password
    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and wrapped DEK
    await pool.query(
      'UPDATE users SET password = $1, encryption_key_wrapped = $2 WHERE id = $3',
      [newHashedPassword, newWrappedDEK, userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error changing password' });
  }
});

// Reset password endpoint (for admin or password recovery flow)
// NOTE: This is a simplified version. In production, you should implement:
// 1. Email verification with reset token
// 2. Time-limited reset links
// 3. Rate limiting
router.post('/reset-password', async (req, res) => {
  const { email, newPassword, resetToken } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  // TODO: Verify resetToken (should be sent via email)
  // For now, this is a placeholder - DO NOT use in production without proper token verification
  
  try {
    // Get user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // CRITICAL SECURITY WARNING:
    // Resetting password means the old DEK cannot be unwrapped
    // This will cause ALL user data to be lost unless we have a backup mechanism
    // 
    // Options:
    // 1. Generate a NEW DEK (user loses all encrypted data)
    // 2. Use a master recovery key (security risk)
    // 3. Don't allow password reset (force account recreation)
    //
    // For this implementation, we'll generate a NEW DEK (Option 1)
    
    // Generate new DEK
    const newDEK = generateDEK();
    const newWrappedDEK = wrapDEK(newDEK, newPassword, user.email);
    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user with new password and new DEK
    await pool.query(
      'UPDATE users SET password = $1, encryption_key_wrapped = $2 WHERE id = $3',
      [newHashedPassword, newWrappedDEK, user.id]
    );

    // WARNING: User's old encrypted data is now inaccessible
    // You may want to delete or mark old data as orphaned
    
    res.json({ 
      message: 'Password reset successful',
      warning: 'Previous encrypted data is no longer accessible'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Error resetting password' });
  }
});

module.exports = router;
