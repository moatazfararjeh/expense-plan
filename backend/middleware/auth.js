const jwt = require('jsonwebtoken');
const supabase = require('../supabase');
const { unwrapDEK } = require('../encryption');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

/**
 * Middleware to authenticate and get user's DEK
 * This should be used for routes that need to encrypt/decrypt data
 * Requires password to be sent in the request (or stored temporarily in session)
 * 
 * NOTE: Sending password in every request is not ideal for production
 * Better approach: Store DEK in server-side session after login
 */
const authenticateWithDEK = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const password = req.headers['x-user-password']; // Temporary solution

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;

    // Get wrapped DEK from database
    const { data: userRow, error: dbError } = await supabase
      .from('users')
      .select('encryption_key_wrapped, email')
      .eq('id', user.id)
      .single();

    if (dbError || !userRow) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { encryption_key_wrapped, email } = userRow;

    if (!encryption_key_wrapped) {
      // User doesn't have DEK (old user) - use master key
      req.userDEK = null;
      return next();
    }

    // For now, we'll unwrap DEK using password from header
    // In production, use session storage after login
    if (!password) {
      return res.status(401).json({ 
        error: 'Password required for data access',
        requiresPassword: true 
      });
    }

    try {
      const dek = unwrapDEK(encryption_key_wrapped, password, email);
      req.userDEK = dek;
      next();
    } catch (error) {
      console.error('Failed to unwrap DEK:', error);
      return res.status(401).json({ error: 'Invalid password or corrupted encryption key' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticateToken, authenticateWithDEK, JWT_SECRET };
