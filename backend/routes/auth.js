const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');
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
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${email},username.eq.${username}`);

    if (checkError) throw checkError;

    if (existingUsers && existingUsers.length > 0) {
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
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          username,
          email,
          password: hashedPassword,
          encryption_key_wrapped: wrappedDEK
        }
      ])
      .select('id, username, email, created_at')
      .single();

    if (insertError) throw insertError;

    // Generate JWT token
    const token = jwt.sign({ 
      id: newUser.id, 
      username: newUser.username,
      email: newUser.email
    }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
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
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);

    if (queryError) throw queryError;

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

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
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, created_at')
      .eq('id', decoded.id)
      .single();

    if (error) throw error;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
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
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (queryError) throw queryError;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

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
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: newHashedPassword,
        encryption_key_wrapped: newWrappedDEK
      })
      .eq('id', userId);

    if (updateError) throw updateError;

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
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);

    if (queryError) throw queryError;

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

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
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: newHashedPassword,
        encryption_key_wrapped: newWrappedDEK
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

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
