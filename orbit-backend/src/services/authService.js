/**
 * Authentication Service
 * Handles all business logic for authentication operations
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import supabase from '../config/database.js';
import { sendOTPEmail, sendPasswordResetEmail } from '../config/email.js';
import { validatePassword } from '../utils/authValidators.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const BCRYPT_SALT_ROUNDS = 12; // Security: Higher rounds = slower but more secure

export class AuthService {
  /**
   * Register a new user
   */
  static async registerUser(userData) {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        role = 'requestor',
      } = userData;

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('tblusers')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists',
        };
      }

      // Hash password using bcrypt with salt rounds
      const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      
      const { data, error } = await supabase
        .from('tblusers')
        .insert([
          {
            email,
            password_hash: hashedPassword, // Store hashed password
            first_name: firstName,
            last_name: lastName,
            role,
            is_active: true,
            failed_login_attempts: 0, // Account lockout tracking
            account_locked_until: null, // Account lockout expiry
            password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data[0].id,
          email: data[0].email,
          firstName: data[0].first_name,
          lastName: data[0].last_name,
          role: data[0].role,
        },
        message: 'User registered successfully',
      };
    } catch (error) {
      console.error('Error registering user:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Login user - validates credentials and generates OTP
   * Supports both admin (via email in tbladminusers) and regular users (via employee_id/email in tblusers)
   * Priority: Admin → Regular User
   */
  static async loginUser(credential, password) {
    try {
      console.log(`[LOGIN] Attempting login for: ${credential}`);
      
      // STEP 1: Try admin login first (email-based from tbladminusers)
      console.log(`[LOGIN] Checking tbladminusers for admin with email: ${credential}`);
      const { data: adminUser, error: adminError } = await supabase
        .from('tbladminusers')
        .select('*')
        .eq('email', credential)
        .single();
      
      if (!adminError && adminUser) {
        console.log(`[LOGIN] Found admin user: ${credential}`);
        console.log(`[LOGIN] Admin user data:`, { email: adminUser.email, is_active: adminUser.is_active });
        
        // Check if admin account is active
        if (adminUser.is_active === false) {
          console.log(`[LOGIN] Admin account is disabled (is_active: false)`);
          return {
            success: false,
            error: 'Your account is deactivated. Please contact administrator.',
          };
        }
        
        // Check if account is locked
        if (adminUser.account_locked_until && new Date() < new Date(adminUser.account_locked_until)) {
          console.log(`[LOGIN] Admin account locked for: ${credential}`);
          return {
            success: false,
            error: 'Account is temporarily locked. Please try again later.',
          };
        }
        
        // Check if password has expired
        if (adminUser.password_expires_at && new Date() > new Date(adminUser.password_expires_at)) {
          console.log(`[LOGIN] Admin password expired for: ${credential}`);
          return {
            success: false,
            error: 'Your password has expired. Please reset it.',
          };
        }

        // Verify admin password using bcrypt
        let passwordMatch = false;
        if (adminUser.password_hash) {
          if (adminUser.password_hash.startsWith('$2')) {
            passwordMatch = await bcrypt.compare(password, adminUser.password_hash);
          } else {
            // Legacy plaintext password
            passwordMatch = password === adminUser.password_hash;
          }
        }
        
        if (!passwordMatch) {
          console.log(`[LOGIN] Admin password mismatch for: ${credential}`);
          
          // Increment failed attempts and lock account if needed
          const newFailedAttempts = (adminUser.failed_login_attempts || 0) + 1;
          const shouldLock = newFailedAttempts >= 3;
          const lockoutDuration = 30; // 30 minutes
          
          await supabase
            .from('tbladminusers')
            .update({
              failed_login_attempts: newFailedAttempts,
              account_locked_until: shouldLock ? new Date(Date.now() + lockoutDuration * 60 * 1000).toISOString() : null
            })
            .eq('admin_id', adminUser.admin_id);
          
          console.log(`[LOGIN] Admin failed attempts: ${newFailedAttempts}`);
          
          // Provide informative error message
          if (shouldLock) {
            return {
              success: false,
              error: `Account locked due to multiple failed login attempts. Please try again in ${lockoutDuration} minutes.`,
            };
          } else {
            return {
              success: false,
              error: 'Invalid login credentials. Please try again.\nFor security reasons, your account may be temporarily locked after multiple failed attempts.',
            };
          }
        }

        // Reset failed attempts on successful admin login
        await supabase
          .from('tbladminusers')
          .update({
            failed_login_attempts: 0,
            account_locked_until: null
          })
          .eq('admin_id', adminUser.admin_id);

        console.log(`[LOGIN] Admin password verified for: ${credential}, generating OTP`);

        // Generate OTP for admin login
        const otpResult = await this.generateOTP(adminUser.email, 'login');
        if (!otpResult.success) {
          return {
            success: false,
            error: 'Failed to generate OTP',
          };
        }

        return {
          success: true,
          requiresOTP: true,
          data: {
            email: adminUser.email,
            userType: 'admin',
          },
          message: 'OTP has been sent to your email. Please verify to complete login.',
        };
      }

      // STEP 2: Try regular user login (employee_id or email from tblusers)
      console.log(`[LOGIN] Admin not found, checking tblusers for: ${credential}`);
      let user = null;
      let error = null;
      
      // Try employee_id first
      const result1 = await supabase
        .from('tblusers')
        .select('*')
        .eq('employee_id', credential)
        .single();
      
      if (!result1.error) {
        user = result1.data;
      } else {
        error = result1.error;
        console.log(`[LOGIN] No user found by employee_id, attempting fallback to email: ${credential}`, error);
        
        // Fallback: Try email
        const result2 = await supabase
          .from('tblusers')
          .select('*')
          .eq('email', credential)
          .single();
        
        if (!result2.error) {
          user = result2.data;
          console.log(`[LOGIN] Found user by email fallback: ${credential}`);
        } else {
          error = result2.error;
        }
      }

      if (error || !user) {
        console.log(`[LOGIN] User not found for: ${credential}`, error);
        return {
          success: false,
          error: 'Invalid Username or Password',
        };
      }

      console.log(`[LOGIN] Found regular user: ${credential}`);
      console.log(`[LOGIN] User data:`, { email: user.email, status: user.status, has_status_field: 'status' in user });
      
      // Check if account status is Active or First_Time (case-insensitive)
      const userStatus = String(user.status || '').toLowerCase().trim();
      const validStatuses = ['active', 'first_time'];
      console.log(`[LOGIN] User status validation - raw: "${user.status}", lowercased: "${userStatus}", valid: ${validStatuses.includes(userStatus)}`);
      if (!validStatuses.includes(userStatus)) {
        console.log(`[LOGIN] User account status not allowed for login, status: ${user.status}`);
        return {
          success: false,
          error: userStatus ? `Your account is ${userStatus}. Please contact administrator.` : 'Your account is not properly configured. Please contact administrator.',
        };
      }
      
      // Check if account is locked
      if (user.account_locked_until && new Date() < new Date(user.account_locked_until)) {
        console.log(`[LOGIN] User account locked for: ${credential}`);
        return {
          success: false,
          error: 'Account is temporarily locked. Please try again later.',
        };
      }
      
      // Check if password has expired
      if (user.password_expires_at && new Date() > new Date(user.password_expires_at)) {
        console.log(`[LOGIN] User password expired for: ${credential}`);
        return {
          success: false,
          error: 'Your password has expired. Please reset it.',
        };
      }

      // Verify password using bcrypt
      let passwordMatch = false;
      if (user.password_hash) {
        if (user.password_hash.startsWith('$2')) {
          passwordMatch = await bcrypt.compare(password, user.password_hash);
        } else {
          // Legacy plaintext password
          passwordMatch = password === user.password_hash;
        }
      }
      
      if (!passwordMatch) {
        console.log(`[LOGIN] Password mismatch for: ${credential}`);
        
        // Increment failed attempts and lock account if needed
        const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
        const shouldLock = newFailedAttempts >= 3;
        const lockoutDuration = 30; // 30 minutes
        
        await supabase
          .from('tblusers')
          .update({
            failed_login_attempts: newFailedAttempts,
            account_locked_until: shouldLock ? new Date(Date.now() + lockoutDuration * 60 * 1000).toISOString() : null
          })
          .eq('user_id', user.user_id);
        
        console.log(`[LOGIN] User failed attempts: ${newFailedAttempts}`);
        
        // Provide informative error message
        if (shouldLock) {
          return {
            success: false,
            error: `Account locked due to multiple failed login attempts. Please try again in ${lockoutDuration} minutes.`,
          };
        } else {
          return {
            success: false,
            error: 'Invalid login credentials. Please try again.\nFor security reasons, your account may be temporarily locked after multiple failed attempts.',
          };
        }
      }

      // Reset failed attempts on successful login
      await supabase
        .from('tblusers')
        .update({
          failed_login_attempts: 0,
          account_locked_until: null
        })
        .eq('user_id', user.user_id);

      console.log(`[LOGIN] Password verified for: ${credential}, generating OTP`);

      // Generate OTP for user login
      const otpResult = await this.generateOTP(user.email, 'login');
      if (!otpResult.success) {
        return {
          success: false,
          error: 'Failed to generate OTP',
        };
      }

      return {
        success: true,
        requiresOTP: true,
        data: {
          employeeId: user.employee_id,
          email: user.email,
          userType: 'user',
        },
        message: 'OTP has been sent to your email. Please verify to complete login.',
      };
    } catch (error) {
      console.error('Error logging in:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Complete login - verify OTP and return authentication token
   * Supports both admin and regular users
   */
  static async completeLogin(email, otp) {
    try {
      // Verify OTP
      const otpVerification = await this.verifyOTP(email, otp, 'login');
      if (!otpVerification.success) {
        return {
          success: false,
          error: otpVerification.error || 'Invalid or expired OTP',
        };
      }

      // STEP 1: Try to find admin user first
      console.log(`[COMPLETE LOGIN] Checking for admin user: ${email}`);
      const { data: adminUser } = await supabase
        .from('tbladminusers')
        .select('*')
        .eq('email', email)
        .single();

      if (adminUser) {
        console.log(`[COMPLETE LOGIN] Found admin user: ${email}`);
        // Generate JWT token for admin
        const token = this.generateToken(adminUser.admin_id, adminUser.email, adminUser.admin_role, adminUser.org_id || null);

        // Update last login
        try {
          await supabase
            .from('tbladminusers')
            .update({ updated_at: new Date().toISOString() })
            .eq('admin_id', adminUser.admin_id);
        } catch (e) {
          // Silently fail if update not supported
        }

        return {
          success: true,
          data: {
            token,
            userId: adminUser.admin_id,
            email: adminUser.email,
            firstName: adminUser.full_name || '',
            lastName: '',
            role: adminUser.admin_role,
            org_id: adminUser.org_id || null,
            userType: 'admin',
          },
          message: 'Login successful',
        };
      }

      // STEP 2: Try regular user
      console.log(`[COMPLETE LOGIN] Admin not found, checking for regular user: ${email}`);
      const { data: user } = await supabase
        .from('tblusers')
        .select('*')
        .eq('email', email)
        .single();

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Fetch user role from tbluserroles joined with tblroles
      const userId = user.user_id || user.id;
      const { data: userRoleData, error: roleError } = await supabase
        .from('tbluserroles')
        .select(`
          user_role_id,
          user_id,
          is_active,
          tblroles:role_id (
            role_id,
            role_name,
            description
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (roleError || !userRoleData || !userRoleData.tblroles) {
        console.log(`[COMPLETE LOGIN] No active role found for user ${userId}:`, roleError?.message);
        return {
          success: false,
          error: 'No active role assigned to user',
        };
      }

      const userRole = userRoleData.tblroles.role_name;

      // Check if user agreement is accepted (first-time login)
      const { data: userAgreements, error: agreementError } = await supabase
        .from('tbluser_agreements')
        .select('*')
        .eq('user_id', userId);

      console.log(`[COMPLETE LOGIN] User agreement check for user ${userId}:`, {
        hasAgreement: userAgreements && userAgreements.length > 0,
        error: agreementError?.message,
        recordCount: userAgreements?.length,
      });

      if (!userAgreements || userAgreements.length === 0) {
        // User hasn't accepted user agreement yet - first time login
        return {
          success: true,
          data: {
            requiresUserAgreement: true,
            userId,
            employeeId: user.employee_id,
            email: user.email,
            role: userRole,
            firstName: user.first_name,
            lastName: user.last_name,
          },
          message: 'User agreement acceptance required',
        };
      }

      // Generate JWT token
      const token = this.generateToken(userId, user.email, userRole, user.org_id || null);

      // Update last login
      try {
        await supabase
          .from('tblusers')
          .update({ updated_at: new Date().toISOString() })
          .eq('user_id', userId);
      } catch (e) {
        // Silently fail if update not supported
      }

      return {
        success: true,
        data: {
          token,
          userId,
          employeeId: user.employee_id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: userRole,
          org_id: user.org_id || null,
          userType: 'user',
        },
        message: 'Login successful',
      };
    } catch (error) {
      console.error('Error completing login:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate OTP and send to email
   */
  static async generateOTP(email, type = 'reset') {
    try {
      console.log(`[OTP] Starting OTP generation for: ${email}, type: ${type}`);
      
      // Verify user exists in either tbladminusers or tblusers
      const { data: adminUsers, error: adminError } = await supabase
        .from('tbladminusers')
        .select('admin_id')
        .eq('email', email);

      const { data: regularUsers, error: userError } = await supabase
        .from('tblusers')
        .select('user_id')
        .eq('email', email);

      console.log(`[OTP] Admin query - error:`, adminError, `users:`, adminUsers);
      console.log(`[OTP] Regular user query - error:`, userError, `users:`, regularUsers);

      // Check if user found in either table
      const userExists = (adminUsers && adminUsers.length > 0) || (regularUsers && regularUsers.length > 0);

      if (!userExists) {
        console.log(`[OTP] No users found for: ${email}`);
        // Return success for security (don't reveal if email exists)
        return {
          success: true,
          message: 'If an account exists, an OTP has been sent to your email',
        };
      }

      console.log(`[OTP] User found: ${email}, generating OTP`);

      // Invalidate all previous unused OTPs for this email and type
      console.log(`[OTP] Invalidating previous unused OTPs for ${email}, type: ${type}`);
      const { error: invalidateError } = await supabase
        .from('tblotp')
        .update({ is_used: true })
        .eq('email', email)
        .eq('type', type)
        .eq('is_used', false);

      if (invalidateError) {
        console.log(`[OTP] Warning: Failed to invalidate previous OTPs:`, invalidateError);
        // Continue anyway, just log the warning
      } else {
        console.log(`[OTP] Previous OTPs have been invalidated`);
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes, with Z

      console.log(`[OTP] Generated OTP: ${otp}`);
      console.log(`[OTP] Expires at: ${expiresAt}`);

      // Store OTP in database
      const { error } = await supabase
        .from('tblotp')
        .insert([
          {
            email,
            otp,
            type,
            expires_at: expiresAt,
            is_used: false,
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) {
        console.log(`[OTP] Error inserting OTP: `, error);
        throw error;
      }

      console.log(`[OTP] OTP stored successfully`);

      // Send OTP via email
      const emailResult = await sendOTPEmail(email, otp);
      
      if (!emailResult.success) {
        console.log(`[OTP] Warning: Failed to send email - ${emailResult.error}`);
        console.log(`[OTP] Email config - USER: ${process.env.EMAIL_USER}, HAS_PASSWORD: ${!!process.env.EMAIL_PASSWORD}`);
      } else {
        console.log(`[OTP] Email sent successfully to ${email}`);
      }

      // TODO: Send OTP via email using email service
      console.log(`Generated OTP for ${email}: ${otp}`); // Temporary debug log

      return {
        success: true,
        message: 'OTP sent to your email',
      };
    } catch (error) {
      console.error('Error generating OTP:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(email, otp, type = 'reset') {
    try {
      console.log(`[VERIFY OTP] Checking OTP for ${email}, type: ${type}`);
      
      const { data: otpRecord, error } = await supabase
        .from('tblotp')
        .select('*')
        .eq('email', email)
        .eq('otp', otp)
        .eq('type', type)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !otpRecord) {
        console.log(`[VERIFY OTP] OTP not found or error:`, error);
        return {
          success: false,
          error: 'Invalid or expired OTP',
        };
      }

      console.log(`[VERIFY OTP] OTP found. Expires at: ${otpRecord.expires_at}, Current time: ${new Date().toISOString()}`);

      // Check if OTP has expired
      // Ensure the timestamp is treated as UTC by adding Z if missing
      let expiresAtStr = otpRecord.expires_at;
      if (!expiresAtStr.endsWith('Z')) {
        expiresAtStr += 'Z';
      }
      
      const expiresAt = new Date(expiresAtStr);
      const now = new Date();
      
      console.log(`[VERIFY OTP] Expires: ${expiresAt.getTime()}, Now: ${now.getTime()}`);
      
      if (expiresAt < now) {
        console.log(`[VERIFY OTP] OTP has expired!`);
        return {
          success: false,
          error: 'OTP has expired',
        };
      }

      console.log(`[VERIFY OTP] OTP is valid, marking as used`);

      // Mark OTP as used
      await supabase
        .from('tblotp')
        .update({ is_used: true })
        .eq('id', otpRecord.id);

      return {
        success: true,
        message: 'OTP verified successfully',
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Reset password after OTP verification (no current password needed)
   */
  static async resetPasswordAfterOTP(email, newPassword) {
    try {
      console.log(`[RESET PASSWORD] Starting for: ${email}`);
      
      // Validate new password FIRST (before hashing)
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        console.log(`[RESET PASSWORD] Validation failed:`, validation.errors);
        return {
          success: false,
          error: validation.errors.join('; '),
        };
      }
      
      // Hash the new password after validation passes
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

      console.log(`[RESET PASSWORD] Validation passed, updating database`);

      // Update password_hash with bcrypt-hashed password
      // Note: Only updating password_hash since other security columns may not exist yet
      const { data, error } = await supabase
        .from('tblusers')
        .update({
          password_hash: hashedPassword,
        })
        .eq('email', email)
        .select();

      if (error) {
        console.error(`[RESET PASSWORD] Error updating password for ${email}:`, error);
        // Don't expose database details to frontend
        return {
          success: false,
          error: 'Failed to update password. Please try again.',
        };
      }

      console.log(`[RESET PASSWORD] Password reset successfully for ${email}`);

      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error) {
      console.error(`[RESET PASSWORD] Catch error for ${email}:`, error);
      // Don't expose internal error details
      return {
        success: false,
        error: 'An error occurred while resetting your password. Please try again.',
      };
    }
  }

  /**
   * Change password (requires current password verification)
   */
  static async changePassword(email, newPassword, currentPassword = null) {
    try {
      // Validate new password
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join('; '),
        };
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

      // If current password is provided, verify it
      if (currentPassword) {
        const { data: user } = await supabase
          .from('tblusers')
          .select('password_hash')
          .eq('email', email)
          .single();

        if (!user) {
          return {
            success: false,
            error: 'User not found',
          };
        }

        // Verify current password using bcrypt (support both hashed and plaintext)
        let passwordMatch = false;
        if (user.password_hash) {
          // Check if it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
          if (user.password_hash.startsWith('$2')) {
            // It's a bcrypt hash
            passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
          } else {
            // Legacy plaintext password
            passwordMatch = currentPassword === user.password_hash;
          }
        }

        if (!passwordMatch) {
          return {
            success: false,
            error: 'Current password is incorrect',
          };
        }
      }

      // Update password_hash and mark as no longer first-time login
      // Note: Only updating password_hash since other security columns may not exist yet
      const { data, error } = await supabase
        .from('tblusers')
        .update({
          password_hash: hashedPassword,
          is_first_login: false, // Mark as no longer first-time user
          status: 'Active', // Update status from First_Time to Active
          updated_at: new Date().toISOString(),
        })
        .eq('email', email)
        .select();

      if (error) {
        console.error('Error updating password:', error);
        // Don't expose database details to frontend
        return {
          success: false,
          error: 'Failed to update password. Please try again.',
        };
      }

      console.log(`[PASSWORD CHANGE] User ${email} has changed password, is_first_login set to false, and status updated to Active`);

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      console.error('Error changing password:', error);
      // Don't expose internal error details
      return {
        success: false,
        error: 'An error occurred while changing your password. Please try again.',
      };
    }
  }

  /**
   * Save security questions for user and mark first-time login as complete
   */
  static async saveSecurityQuestions(userId, questions) {
    try {
      // Reset failed login attempts and account lock when questions are saved
      // This happens after password is set in first-time flow
      await supabase
        .from('tblusers')
        .update({
          failed_login_attempts: 0,
          account_locked_until: null
        })
        .eq('user_id', userId);
      
      // Delete existing security questions
      await supabase
        .from('tblsecurity_questions')
        .delete()
        .eq('user_id', userId);

      // Insert new security questions
      const { error: questionsError } = await supabase
        .from('tblsecurity_questions')
        .insert([
          {
            user_id: userId,
            question_1: questions.question1,
            answer_1: questions.answer1, // TODO: Hash answers
            question_2: questions.question2,
            answer_2: questions.answer2,
            question_3: questions.question3,
            answer_3: questions.answer3,
            created_at: new Date().toISOString(),
          },
        ]);

      if (questionsError) throw questionsError;

      // Mark user as no longer first-time login (first-time setup is now complete)
      const { error: updateError } = await supabase
        .from('tblusers')
        .update({
          is_first_login: false,
          status: 'Active', // Update status from First_Time to Active
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      console.log(`[SECURITY QUESTIONS] User ${userId} completed first-time setup with status updated to Active`);

      return {
        success: true,
        message: 'Security questions saved successfully',
      };
    } catch (error) {
      console.error('Error saving security questions:', error);
      // Don't expose database error details to frontend for security/privacy reasons
      return {
        success: false,
        error: 'Failed to save security questions. Please try again or contact support.',
      };
    }
  }

  /**
   * Verify security answers
   */
  static async verifySecurityAnswers(email, answers) {
    try {
      const { data: user } = await supabase
        .from('tblusers')
        .select('user_id')
        .eq('email', email)
        .single();

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const { data: securityData } = await supabase
        .from('tblsecurity_questions')
        .select('*')
        .eq('user_id', user.user_id)
        .single();

      if (!securityData) {
        return {
          success: false,
          error: 'Security questions not found',
        };
      }

      // Verify answers (case-insensitive)
      const answer1Match = securityData.answer_1.toLowerCase() === answers.answer1.toLowerCase();
      const answer2Match = securityData.answer_2.toLowerCase() === answers.answer2.toLowerCase();
      const answer3Match = securityData.answer_3.toLowerCase() === answers.answer3.toLowerCase();

      if (!answer1Match || !answer2Match || !answer3Match) {
        return {
          success: false,
          error: 'One or more security answers are incorrect',
        };
      }

      return {
        success: true,
        message: 'Security answers verified successfully',
      };
    } catch (error) {
      console.error('Error verifying security answers:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get one random security question for password reset
   */
  static async getSecurityQuestion(email) {
    try {
      const { data: user } = await supabase
        .from('tblusers')
        .select('user_id')
        .eq('email', email)
        .single();

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const { data: securityData } = await supabase
        .from('tblsecurity_questions')
        .select('question_1, question_2, question_3')
        .eq('user_id', user.user_id)
        .single();

      if (!securityData) {
        return {
          success: false,
          error: 'Security questions not found',
        };
      }

      // Pick a random question from the three
      const questions = [
        { index: 1, question: securityData.question_1 },
        { index: 2, question: securityData.question_2 },
        { index: 3, question: securityData.question_3 },
      ];

      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

      return {
        success: true,
        data: {
          questionIndex: randomQuestion.index,
          question: randomQuestion.question,
        },
      };
    } catch (error) {
      console.error('Error getting security question:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify a single security answer for password reset
   */
  static async verifySingleSecurityAnswer(email, questionIndex, answer) {
    try {
      const { data: user } = await supabase
        .from('tblusers')
        .select('user_id')
        .eq('email', email)
        .single();

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const { data: securityData } = await supabase
        .from('tblsecurity_questions')
        .select('answer_1, answer_2, answer_3')
        .eq('user_id', user.user_id)
        .single();

      if (!securityData) {
        return {
          success: false,
          error: 'Security questions not found',
        };
      }

      // Get the correct answer based on the question index
      const answerMap = {
        1: securityData.answer_1,
        2: securityData.answer_2,
        3: securityData.answer_3,
      };

      const correctAnswer = answerMap[questionIndex];
      if (!correctAnswer) {
        return {
          success: false,
          error: 'Invalid question index',
        };
      }

      // Verify answer (case-insensitive)
      const answerMatch = correctAnswer.toLowerCase() === answer.toLowerCase();

      if (!answerMatch) {
        return {
          success: false,
          error: 'Security answer is incorrect',
        };
      }

      return {
        success: true,
        message: 'Security answer verified successfully',
      };
    } catch (error) {
      console.error('Error verifying security answer:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create support ticket
   */
  static async createSupportTicket(ticketData) {
    try {
      const { data, error } = await supabase
        .from('tblsupport_tickets')
        .insert([
          {
            name: ticketData.name,
            email: ticketData.email,
            issue_type: ticketData.issueType,
            description: ticketData.description,
            status: 'open',
            priority: 'medium',
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      return {
        success: true,
        data: {
          ticketId: data[0].id,
          status: data[0].status,
        },
        message: 'Support ticket created successfully',
      };
    } catch (error) {
      console.error('Error creating support ticket:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Accept user agreement
   */
  static async acceptUserAgreement(userId, version = '1.0') {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('tbluser_agreements')
        .insert([
          {
            user_id: userId,
            version,
            accepted_at: now,
            created_at: now,
          },
        ]);

      if (error) {
        console.error('[USER AGREEMENT] Database error:', error);
        throw error;
      }

      console.log(`[USER AGREEMENT] User ${userId} accepted agreement version ${version}`);
      return {
        success: true,
        message: 'User agreement accepted successfully',
      };
    } catch (error) {
      console.error('[USER AGREEMENT] Error accepting user agreement:', error);
      return {
        success: false,
        error: 'Failed to process your request. Please try again.',
      };
    }
  }

  /**
   * Generate JWT token (stub - replace with actual JWT library)
   */
  static generateToken(userId, email, role, orgId = null) {
    const payload = {
      userId,
      email,
      role,
      org_id: orgId,
    };

    // Sign JWT token with 12 hour expiry
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: '12h',
      issuer: 'orbit-auth',
      subject: userId.toString(),
    });
  }

  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return {
        success: true,
        data: decoded,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Invalid token',
      };
    }
  }

  /**
   * Get user details by user ID
   */
  static async getUserDetails(userId) {
    try {
      const { data, error } = await supabase
        .from('tblusers')
        .select('user_id, first_name, last_name, department, status, email')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (!data) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      return {
        success: true,
        data: {
          user_id: data.user_id,
          first_name: data.first_name,
          last_name: data.last_name,
          department: data.department,
          status: data.status,
          email: data.email,
        },
      };
    } catch (error) {
      console.error('Error getting user details:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Log login attempt to audit trail
   */
  static async logLoginAttempt(email, loginStatus, userType, ipAddress = null, userAgent = null, userId = null) {
    try {
      console.log(`[LOGIN AUDIT] Logging ${loginStatus} login for ${email} (${userType})`);
      
      // If userId not provided, try to look it up
      let actualUserId = userId;
      if (!actualUserId && email) {
        if (userType === 'admin') {
          const { data: adminUser } = await supabase
            .from('tbladminusers')
            .select('admin_id')
            .eq('email', email)
            .single();
          actualUserId = adminUser?.admin_id;
        } else if (userType === 'user') {
          const { data: regularUser } = await supabase
            .from('tblusers')
            .select('user_id')
            .eq('email', email)
            .single();
          actualUserId = regularUser?.user_id;
        }
      }
      
      const { error } = await supabase
        .from('tbllogin_audit')
        .insert([
          {
            email,
            user_id: actualUserId,
            login_status: loginStatus, // 'success', 'pending', or 'failed'
            user_type: userType, // 'admin', 'user', or 'unknown'
            ip_address: ipAddress,
            user_agent: userAgent,
            logged_at: new Date().toISOString(),
          },
        ]);

      if (error) {
        console.error('[LOGIN AUDIT] Error logging login attempt:', error);
        // Don't throw - logging failure shouldn't break login
      } else {
        console.log(`[LOGIN AUDIT] ${loginStatus} login logged for ${email}`);
      }
    } catch (error) {
      console.error('[LOGIN AUDIT] Exception logging login attempt:', error);
      // Silently fail - logging shouldn't prevent login
    }
  }
}

export default AuthService;
