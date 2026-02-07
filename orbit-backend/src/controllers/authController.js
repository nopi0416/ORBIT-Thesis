/**
 * Authentication Controller
 * Handles HTTP requests for authentication operations
 */

import AuthService from '../services/authService.js';
import {
  validateLogin,
  validateOTP,
  validatePassword,
  validateSecurityQuestions,
  validateSupportTicket,
  validateUserAgreement,
} from '../utils/authValidators.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  static async register(req, res) {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      // Validate input
      if (!email || !password || !firstName || !lastName) {
        return sendError(res, 'Email, password, first name, and last name are required', 400);
      }

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return sendError(res, passwordValidation.errors.join('; '), 400);
      }

      const result = await AuthService.registerUser({
        email,
        password,
        firstName,
        lastName,
        role,
      });

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Error in register:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * POST /api/auth/login
   * Login user with email and password - generates OTP
   */
  static async login(req, res) {
    try {
      const { employee_id, password } = req.body;

      // Validate input
      const validation = validateLogin(employee_id, password);
      if (!validation.isValid) {
        return sendError(res, validation.errors, 400);
      }

      const result = await AuthService.loginUser(employee_id, password);

      if (!result.success) {
        return sendError(res, result.error, 401);
      }

      // Include requiresOTP flag in response
      const responseData = {
        ...result.data,
        requiresOTP: result.requiresOTP,
      };

      sendSuccess(res, responseData, result.message);
    } catch (error) {
      console.error('Error in login:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * POST /api/auth/complete-login
   * Verify OTP and complete login - returns authentication token
   */
  static async completeLogin(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return sendError(res, 'Email and OTP are required', 400);
      }

      const validation = validateOTP(otp);
      if (!validation.isValid) {
        return sendError(res, validation.error, 400);
      }

      const result = await AuthService.completeLogin(email, otp);

      if (!result.success) {
        return sendError(res, result.error, 401);
      }

      sendSuccess(res, result.data, result.message);
    } catch (error) {
      console.error('Error in completeLogin:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Generate and send OTP for password reset
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return sendError(res, 'Email is required', 400);
      }

      const result = await AuthService.generateOTP(email, 'reset');

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, {}, result.message);
    } catch (error) {
      console.error('Error in forgotPassword:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * POST /api/auth/verify-otp
   * Verify OTP sent to user email
   */
  static async verifyOTP(req, res) {
    try {
      const { email, otp, type = 'reset' } = req.body;

      if (!email || !otp) {
        return sendError(res, 'Email and OTP are required', 400);
      }

      const validation = validateOTP(otp);
      if (!validation.isValid) {
        return sendError(res, validation.error, 400);
      }

      const result = await AuthService.verifyOTP(email, otp, type);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, {}, result.message);
    } catch (error) {
      console.error('Error in verifyOTP:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * POST /api/auth/change-password
   * Change user password
   */
  static async changePassword(req, res) {
    try {
      const { email, newPassword, currentPassword } = req.body;

      if (!email || !newPassword) {
        return sendError(res, 'Email and new password are required', 400);
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return sendError(res, passwordValidation.errors.join('; '), 400);
      }

      const result = await AuthService.changePassword(email, newPassword, currentPassword);

      if (!result.success) {
        return sendError(res, Array.isArray(result.error) ? result.error.join('; ') : result.error, 400);
      }

      sendSuccess(res, {}, result.message);
    } catch (error) {
      console.error('Error in changePassword:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * POST /api/auth/first-time-password
   * Set password for first time user login
   */
  static async firstTimePassword(req, res) {
    try {
      const { email, currentPassword, newPassword } = req.body;

      if (!email || !currentPassword || !newPassword) {
        return sendError(res, 'Email, current password, and new password are required', 400);
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return sendError(res, passwordValidation.errors.join('; '), 400);
      }

      const result = await AuthService.changePassword(email, newPassword, currentPassword);

      if (!result.success) {
        return sendError(res, Array.isArray(result.error) ? result.error.join('; ') : result.error, 400);
      }

      sendSuccess(res, {}, result.message);
    } catch (error) {
      console.error('Error in firstTimePassword:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * POST /api/auth/reset-password
   * Reset password after OTP verification
   */
  static async resetPassword(req, res) {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return sendError(res, 'Email and new password are required', 400);
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return sendError(res, passwordValidation.errors.join('; '), 400);
      }

      const result = await AuthService.resetPasswordAfterOTP(email, newPassword);

      if (!result.success) {
        // Don't expose internal errors to frontend
        return sendError(res, typeof result.error === 'string' ? result.error : 'Failed to reset password', 400);
      }

      sendSuccess(res, {}, result.message);
    } catch (error) {
      console.error('Error in resetPassword:', error);
      // Don't expose internal error details
      sendError(res, 'An error occurred while resetting your password', 500);
    }
  }

  /**
   * POST /api/auth/security-questions
   * Save security questions for user
   */
  static async saveSecurityQuestions(req, res) {
    try {
      const { userId, question1, answer1, question2, answer2, question3, answer3 } = req.body;

      if (!userId) {
        return sendError(res, 'User ID is required', 400);
      }

      const validation = validateSecurityQuestions({
        question1,
        answer1,
        question2,
        answer2,
        question3,
        answer3,
      });

      if (!validation.isValid) {
        return sendError(res, validation.errors, 400);
      }

      const result = await AuthService.saveSecurityQuestions(userId, {
        question1,
        answer1,
        question2,
        answer2,
        question3,
        answer3,
      });

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, {}, result.message);
    } catch (error) {
      console.error('Error in saveSecurityQuestions:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * POST /api/auth/verify-security-answers
   * Verify user's security answers
   */
  static async verifySecurityAnswers(req, res) {
    try {
      const { email, answer1, answer2, answer3 } = req.body;

      if (!email || !answer1 || !answer2 || !answer3) {
        return sendError(res, 'Email and all security answers are required', 400);
      }

      const result = await AuthService.verifySecurityAnswers(email, {
        answer1,
        answer2,
        answer3,
      });

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, {}, result.message);
    } catch (error) {
      console.error('Error in verifySecurityAnswers:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * POST /api/auth/support-ticket
   * Create a support ticket
   */
  static async createSupportTicket(req, res) {
    try {
      const { name, email, issueType, description } = req.body;

      const validation = validateSupportTicket({
        name,
        email,
        issueType,
        description,
      });

      if (!validation.isValid) {
        return sendError(res, validation.errors, 400);
      }

      const result = await AuthService.createSupportTicket({
        name,
        email,
        issueType,
        description,
      });

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Error in createSupportTicket:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * POST /api/auth/user-agreement
   * Accept user agreement
   */
  static async acceptUserAgreement(req, res) {
    try {
      const { userId, accepted, version } = req.body;

      if (!userId) {
        return sendError(res, 'User ID is required', 400);
      }

      const validation = validateUserAgreement(accepted);
      if (!validation.isValid) {
        return sendError(res, validation.error, 400);
      }

      const result = await AuthService.acceptUserAgreement(userId, version);

      if (!result.success) {
        // Mask database errors - don't expose table names or constraints
        const userFriendlyError = 'Unable to process your agreement. Please try again.';
        return sendError(res, userFriendlyError, 400);
      }

      sendSuccess(res, {}, result.message);
    } catch (error) {
      console.error('[USER AGREEMENT CONTROLLER] Error in acceptUserAgreement:', error);
      // Never expose error details to client
      sendError(res, 'An error occurred while processing your request. Please try again.', 500);
    }
  }

  /**
   * POST /api/auth/resend-otp
   * Resend OTP to user email
   */
  static async resendOTP(req, res) {
    try {
      const { email, type = 'reset' } = req.body;

      if (!email) {
        return sendError(res, 'Email is required', 400);
      }

      const result = await AuthService.generateOTP(email, type);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, {}, result.message);
    } catch (error) {
      console.error('Error in resendOTP:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/auth/user/:userId
   * Get user details by user ID
   */
  static async getUserDetails(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return sendError(res, 'User ID is required', 400);
      }

      const result = await AuthService.getUserDetails(userId);

      if (!result.success) {
        return sendError(res, 'An error occurred while fetching user details. Please try again.', 400);
      }

      sendSuccess(res, result.data, 'User details retrieved successfully');
    } catch (error) {
      console.error('Error in getUserDetails:', error);
      sendError(res, 'An error occurred. Please try again.', 500);
    }
  }

  /**
   * POST /api/auth/verify-token
   * Verify if JWT token is still valid
   */
  static async verifyToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return sendError(res, 'Token is required', 400);
      }

      const result = await AuthService.verifyToken(token);

      if (!result.success) {
        return sendError(res, 'Token is invalid or expired', 401);
      }

      sendSuccess(res, { valid: true, data: result.data }, 'Token is valid');
    } catch (error) {
      console.error('Error in verifyToken:', error);
      sendError(res, 'Token verification failed', 500);
    }
  }
}

export default AuthController;
