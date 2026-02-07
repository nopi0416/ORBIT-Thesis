/**
 * Authentication Service
 * Handles all business logic for authentication operations
 */

import jwt from 'jsonwebtoken';
import supabase from '../config/database.js';
import { sendOTPEmail, sendPasswordResetEmail } from '../config/email.js';
import { validatePassword } from '../utils/authValidators.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

      // Hash password (in production, use bcrypt or similar)
      // For now, we'll store as-is but mark as needs change
      const { data, error } = await supabase
        .from('tblusers')
        .insert([
          {
            email,
            password, // TODO: Hash before storing
            first_name: firstName,
            last_name: lastName,
            role,
            is_active: true,
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
   * Requires OTP verification to complete login
   */
  static async loginUser(employeeId, password) {
    try {
      const identifier = String(employeeId || '').trim();
      const isEmail = identifier.includes('@');

      console.log(`[LOGIN] Attempting login for: ${identifier}`);
      
      // First, try to find admin user
      if (isEmail) {
        const { data: adminUser } = await supabase
          .from('tbladminusers')
          .select('*')
          .eq('email', identifier)
          .eq('is_active', true)
          .single();

        if (adminUser) {
          console.log(`[LOGIN] Found admin user: ${identifier}`);
          // Verify admin password (password_hash field)
          // In production, use bcrypt.compare(password, adminUser.password_hash)
          if (adminUser.password_hash !== password) {
            console.log(`[LOGIN] Admin password mismatch for: ${identifier}`);
            return {
              success: false,
              error: 'Invalid employee ID or password',
            };
          }

          // Generate OTP for admin login
          const otpResult = await this.generateOTP(identifier, 'login');
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
      }

      // If not admin, try regular user
      console.log(`[LOGIN] No admin found, checking regular users for: ${identifier}`);
      const query = supabase
        .from('tblusers')
        .select('*');

      const { data: user, error } = await (isEmail
        ? query.eq('email', identifier).single()
        : query.eq('employee_id', identifier).single());

      if (error || !user) {
        console.log(`[LOGIN] User not found or error: ${identifier}`, error);
        return {
          success: false,
          error: 'Invalid employee ID or password',
        };
      }

      console.log(`[LOGIN] Found user: ${identifier}`);

      // Verify password (check password_hash first, fall back to password column)
      const passwordToCheck = user.password_hash || user.password;
      if (passwordToCheck !== password) {
        console.log(`[LOGIN] Password mismatch for: ${identifier}`);
        return {
          success: false,
          error: 'Invalid employee ID or password',
        };
      }

      console.log(`[LOGIN] Password verified for: ${identifier}, generating OTP`);

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

      // First, try to find admin user
      const { data: adminUser } = await supabase
        .from('tbladminusers')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (adminUser) {
        // Generate JWT token
          const token = this.generateToken(adminUser.admin_id, adminUser.email, adminUser.admin_role, null);

        // Update last login if table supports it
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
            firstName: adminUser.full_name,
            lastName: '',
            role: adminUser.admin_role,
            userType: 'admin',
          },
          message: 'Login successful',
        };
      }

      // If not admin, try regular user
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
            email: user.email,
            role: userRole,
            firstName: user.first_name,
            lastName: user.last_name,
              geo_id: user.geo_id,
              org_id: user.org_id || null,
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
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: userRole,
          geo_id: user.geo_id,
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
      
      // Verify user exists - try without .single() first
      const { data: users, error: queryError } = await supabase
        .from('tblusers')
        .select('user_id')
        .eq('email', email);

      console.log(`[OTP] Query result - error:`, queryError, `users:`, users);

      if (queryError) {
        console.log(`[OTP] Query error:`, queryError);
      }

      if (!users || users.length === 0) {
        console.log(`[OTP] No users found for: ${email}`);
        // Return success for security (don't reveal if email exists)
        return {
          success: true,
          message: 'If an account exists, an OTP has been sent to your email',
        };
      }

      console.log(`[OTP] User found: ${email}, generating OTP`);

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
      
      // Validate new password
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        console.log(`[RESET PASSWORD] Validation failed:`, validation.errors);
        return {
          success: false,
          error: validation.errors,
        };
      }

      console.log(`[RESET PASSWORD] Validation passed, updating database`);

      // Update password_hash only (most reliable column)
      const { data, error } = await supabase
        .from('tblusers')
        .update({
          password_hash: newPassword, // TODO: Hash with bcrypt before storing
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
          error: validation.errors,
        };
      }

      // If current password is provided, verify it
      if (currentPassword) {
        const { data: user } = await supabase
          .from('tblusers')
          .select('password_hash')
          .eq('email', email)
          .single();

        if (!user || user.password_hash !== currentPassword) {
          return {
            success: false,
            error: 'Current password is incorrect',
          };
        }
      }

      // Update password_hash (don't try to update non-existent column)
      const { data, error } = await supabase
        .from('tblusers')
        .update({
          password_hash: newPassword, // TODO: Hash with bcrypt before storing
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

      console.log(`[PASSWORD CHANGE] User ${email} has changed password`);

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
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      console.log(`[SECURITY QUESTIONS] User ${userId} completed first-time setup`);

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
        .select('id')
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
        .eq('user_id', user.id)
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
        ...(orgId ? { org_id: orgId } : {}),
    };

    // Sign JWT token with 24 hour expiry
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: '24h',
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
        .select('user_id, first_name, last_name, geo_id, org_id, status, email')
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
          geo_id: data.geo_id,
            org_id: data.org_id,
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
}

export default AuthService;
