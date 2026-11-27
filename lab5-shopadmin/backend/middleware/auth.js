// middleware/auth.js - JWT authentication (401) and role check (403)
const jwt = require('jsonwebtoken');

// Read and verify "Authorization: Bearer <token>"
function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: please log in first.' });
  }
  try {
    // payload = { id, type, iat, exp } - the same shape for password and Google logins
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError'
      ? 'Unauthorized: your token has expired, please log in again.'
      : 'Unauthorized: invalid token.';
    return res.status(401).json({ success: false, message });
  }
}

// Must run AFTER protect: the role comes from the verified token
function adminOnly(req, res, next) {
  if (!req.user || req.user.type !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: only admin users can perform this action.'
    });
  }
  next();
}

module.exports = { protect, adminOnly };
