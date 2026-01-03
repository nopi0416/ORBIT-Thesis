/**
 * Authentication Service
 * Handles all business logic for authentication operations
 */

import supabase from '../config/database.js';
import { validatePassword } from '../utils/authValidators.js';

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
   * Login user - checks both tbladminusers and tblusers
   */
  static async loginUser(email, password) {
    try {
      // First, try to find admin user
      const { data: adminUser } = await supabase
        .from('tbladminusers')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (adminUser) {
        // Verify admin password (password_hash field)
        // In production, use bcrypt.compare(password, adminUser.password_hash)
        if (adminUser.password_hash !== password) {
          return {
            success: false,
            error: 'Invalid email or password',
          };
        }

        // Generate JWT token
        const token = this.generateToken(adminUser.admin_id, adminUser.email, adminUser.admin_role);

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
      const { data: user, error } = await supabase
        .from('tblusers')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error || !user) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Verify password (in production, use bcrypt.compare)
      if (user.password !== password) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Check if password needs to be changed
      if (user.password_change_required) {
        return {
          success: true,
          requiresPasswordChange: true,
          data: {
            userId: user.user_id || user.id,
            email: user.email,
            role: user.role,
          },
          message: 'Password change required',
        };
      }

      // Generate JWT token
      const token = this.generateToken(user.user_id || user.id, user.email, user.role);

      // Update last login
      await supabase
        .from('tblusers')
        .update({ updated_at: new Date().toISOString() })
        .eq('user_id', user.user_id || user.id);

      return {
        success: true,
        data: {
          token,
          userId: user.user_id || user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          userType: 'user',
        },
        message: 'Login successful',
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
   * Generate OTP and send to email
   */
  static async generateOTP(email, type = 'reset') {
    try {
      // Verify user exists
      const { data: user } = await supabase
        .from('tblusers')
        .select('id')
        .eq('email', email)
        .single();

      if (!user) {
        // Return success for security (don't reveal if email exists)
        return {
          success: true,
          message: 'If an account exists, an OTP has been sent to your email',
        };
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

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

      if (error) throw error;

      // TODO: Send OTP via email using email service
      console.log(`OTP for ${email}: ${otp}`); // Temporary debug log

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
        return {
          success: false,
          error: 'Invalid or expired OTP',
        };
      }

      // Check if OTP has expired
      if (new Date(otpRecord.expires_at) < new Date()) {
        return {
          success: false,
          error: 'OTP has expired',
        };
      }

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
   * Change password
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
          .select('password')
          .eq('email', email)
          .single();

        if (!user || user.password !== currentPassword) {
          return {
            success: false,
            error: 'Current password is incorrect',
          };
        }
      }

      // Update password
      const { data, error } = await supabase
        .from('tblusers')
        .update({
          password: newPassword, // TODO: Hash before storing
          password_change_required: false,
          password_changed_at: new Date().toISOString(),
          password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('email', email)
        .select();

      if (error) throw error;

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      console.error('Error changing password:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Save security questions for user
   */
  static async saveSecurityQuestions(userId, questions) {
    try {
      // Delete existing security questions
      await supabase
        .from('tblsecurity_questions')
        .delete()
        .eq('user_id', userId);

      // Insert new security questions
      const { error } = await supabase
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

      if (error) throw error;

      return {
        success: true,
        message: 'Security questions saved successfully',
      };
    } catch (error) {
      console.error('Error saving security questions:', error);
      return {
        success: false,
        error: error.message,
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
      const { error } = await supabase
        .from('tbluser_agreements')
        .insert([
          {
            user_id: userId,
            version,
            accepted_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      return {
        success: true,
        message: 'User agreement accepted successfully',
      };
    } catch (error) {
      console.error('Error accepting user agreement:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate JWT token (stub - replace with actual JWT library)
   */
  static generateToken(userId, email, role) {
    // TODO: Implement actual JWT signing
    // For now, return a basic token string
    const payload = {
      userId,
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    };

    // This is a placeholder - use jsonwebtoken library in production
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }
}

export default AuthService;
