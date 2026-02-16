/**
 * Rate Limiting Middleware
 * Prevents brute-force attacks by limiting login and OTP attempts
 */

import rateLimit from 'express-rate-limit';

/**
 * Login Rate Limiter
 * - 3 attempts per 15 minutes per IP address
 * - Locks out attacker for that time period
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 3, // 3 login attempts per IP
  message: 'Too many login attempts. Please try again in 15 minutes.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req, res) => {
    // Don't rate limit health checks
    return req.path === '/api/health';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

/**
 * OTP Rate Limiter
 * - 3 OTP verification attempts per 1 minute per IP address
 * - Prevents brute-forcing OTP codes
 */
export const otpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1-minute window
  max: 3, // 3 OTP attempts per IP
  message: 'Too many OTP attempts. Please try again in 1 minute.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many OTP verification attempts. Please try again in 1 minute.',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

/**
 * Password Reset Rate Limiter
 * - 3 password reset attempts per 30 minutes per IP address
 * - Prevents spam of password reset emails
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30-minute window
  max: 3, // 3 reset attempts per IP
  message: 'Too many password reset attempts. Please try again in 30 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many password reset attempts. Please try again in 30 minutes.',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

export default {
  loginLimiter,
  otpLimiter,
  passwordResetLimiter,
};
