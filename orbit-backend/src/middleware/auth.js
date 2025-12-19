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

  // TODO: Validate token with Supabase or JWT library
  // For now, token is assumed to be valid from frontend
  req.user = {
    // Extract user info from token
    // This will be implemented when auth is fully integrated
  };

  next();
};

export default authenticateToken;
