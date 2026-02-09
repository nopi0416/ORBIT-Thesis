/**
 * Authentication Routes
 * All authentication endpoints
 */

import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import { passwordResetLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// User Registration & Login Routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/complete-login', AuthController.completeLogin);

// Password Management Routes
router.post('/forgot-password', passwordResetLimiter, AuthController.forgotPassword); // Rate limited: 3 attempts per 30 min
router.post('/reset-password', passwordResetLimiter, AuthController.resetPassword); // Rate limited: 3 attempts per 30 min
router.post('/change-password', AuthController.changePassword);
router.post('/first-time-password', AuthController.firstTimePassword);

// OTP Management Routes
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/resend-otp', AuthController.resendOTP);

// Security Questions Routes
router.post('/security-questions', AuthController.saveSecurityQuestions);
router.post('/verify-security-answers', AuthController.verifySecurityAnswers);
router.post('/security-question', AuthController.getSecurityQuestion); // Get one random security question
router.post('/verify-security-answer', AuthController.verifySingleSecurityAnswer); // Verify one security answer

// Support & Agreement Routes
router.post('/support-ticket', AuthController.createSupportTicket);
router.post('/user-agreement', AuthController.acceptUserAgreement);

// User Details Routes
router.get('/user/:userId', AuthController.getUserDetails);

// Token Verification Routes
router.post('/verify-token', AuthController.verifyToken);

export default router;
