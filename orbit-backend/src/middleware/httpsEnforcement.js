/**
 * HTTPS Enforcement Middleware
 * Forces all traffic to use HTTPS in production
 * Prevents man-in-the-middle attacks
 */

export const enforceHTTPS = (req, res, next) => {
  // Only enforce in production
  if (process.env.NODE_ENV === 'production') {
    // Check if request is already HTTPS
    // The x-forwarded-proto header is set by reverse proxies (nginx, load balancers, etc)
    const isHTTPS = req.header('x-forwarded-proto') === 'https' || req.protocol === 'https';
    
    if (!isHTTPS) {
      console.warn(`[HTTPS] Insecure request detected from ${req.ip} - redirecting to HTTPS`);
      
      // Redirect to HTTPS
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
  }
  
  next();
};

/**
 * Security Headers Middleware
 * Adds additional security headers to all responses
 */
export const securityHeaders = (req, res, next) => {
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy - strict
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
  );
  
  // Prevent browsers from referencing your site in external links
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HSTS - Force HTTPS for 1 year (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
};

export default {
  enforceHTTPS,
  securityHeaders,
};
