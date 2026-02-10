import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authentication Middleware
 * Validates JWT token from request headers
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.userId || decoded.id || null,
      email: decoded.email || null,
      role: decoded.role || null,
      org_id: decoded.org_id || decoded.orgId || null,
      userType: decoded.userType || null,
    };
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message || 'Invalid or expired token',
    });
  }
};

export default authenticateToken;
