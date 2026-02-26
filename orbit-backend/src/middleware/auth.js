import { AuthService } from '../services/authService.js';

/**
 * Authentication Middleware
 * Validates JWT token from request headers and resolves user context
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
    });
  }

  try {
    const tokenResult = await AuthService.verifyToken(token);
    if (!tokenResult.success) {
      return res.status(401).json({
        success: false,
        error: tokenResult.error || 'Invalid or expired token',
      });
    }

    const decoded = tokenResult.data;
    const role = decoded.role || null;
    const normalizedRole = (role || '').toString().toLowerCase();
    const inferredUserType = decoded.userType || (normalizedRole.includes('admin') ? 'admin' : 'user');
    const orgId = decoded.org_id || decoded.orgId || null;
    const sessionId = decoded.sessionId || decoded.jti || null;

    req.user = {
      id: decoded.userId || decoded.id || null,
      email: decoded.email || null,
      role,
      org_id: orgId,
      orgId,
      userType: inferredUserType,
      sessionId,
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
