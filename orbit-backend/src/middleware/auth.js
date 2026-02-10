import supabase from '../config/database.js';
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

  const verification = AuthService.verifyToken(token);
  if (!verification.success) {
    return res.status(401).json({
      success: false,
      error: verification.error || 'Invalid token',
    });
  }

  const { userId, email, role } = verification.data || {};
  const normalizedRole = (role || '').toLowerCase();
  const isAdmin = normalizedRole.includes('admin');

  if (isAdmin) {
    const { data: adminUser, error } = await supabase
      .from('tbladminusers')
      .select('admin_id, email, admin_role, org_id, is_active')
      .eq('admin_id', userId)
      .single();

    if (error || !adminUser || adminUser.is_active === false) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    req.user = {
      id: adminUser.admin_id,
      email: adminUser.email,
      role: adminUser.admin_role,
      orgId: adminUser.org_id || null,
      userType: 'admin',
    };

    return next();
  }

  req.user = {
    id: userId,
    email,
    role,
    userType: 'user',
  };

  return next();
};

export default authenticateToken;
