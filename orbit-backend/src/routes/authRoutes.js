/**
 * Authentication Routes
 * All authentication endpoints
 */

import { Router } from 'express';
import AuthController from '../controllers/authController.js';

const router = Router();

/**
 * User Registration & Login
 */
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

/**
 * Password Management
 */
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/change-password', AuthController.changePassword);
router.post('/first-time-password', AuthController.firstTimePassword);

/**
 * OTP Management
 */
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/resend-otp', AuthController.resendOTP);

/**
 * Security Questions
 */
router.post('/security-questions', AuthController.saveSecurityQuestions);
router.post('/verify-security-answers', AuthController.verifySecurityAnswers);

/**
 * Support & Agreement
 */
router.post('/support-ticket', AuthController.createSupportTicket);
router.post('/user-agreement', AuthController.acceptUserAgreement);

export default router;
