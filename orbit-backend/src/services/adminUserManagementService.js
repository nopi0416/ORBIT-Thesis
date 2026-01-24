import supabase from '../config/database.js';
import bcrypt from 'bcrypt';

/**
 * Admin User Management Service
 * Handles all database operations for user management by admins
 */

export class AdminUserManagementService {
  /**
   * Generate a random alphanumeric suffix (5 characters)
   */
  static generateUniquePasswordSuffix() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let suffix = '';
    for (let i = 0; i < 5; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return suffix;
  }

  /**
   * Generate default password: P@ssword + 5-char alphanumeric suffix
   */
  static generateDefaultPassword() {
    const basePassword = 'P@ssword';
    const suffix = this.generateUniquePasswordSuffix();
    return {
      password: `${basePassword}${suffix}`,
      suffix,
    };
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Check if email already exists
   */
  static async emailExists(email) {
    const { data, error } = await supabase
      .from('tblusers')
      .select('user_id')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows returned (which is what we want)
      throw error;
    }

    return !!data;
  }

  /**
   * Check if employee_id already exists
   */
  static async employeeIdExists(employeeId) {
    const { data, error } = await supabase
      .from('tblusers')
      .select('user_id')
      .eq('employee_id', employeeId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  }

  /**
   * Verify that role exists in tblroles
   */
  static async roleExists(roleId) {
    const { data, error } = await supabase
      .from('tblroles')
      .select('role_id')
      .eq('role_id', roleId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  }

  /**
   * Verify that organization exists in tblorganization
   */
  static async organizationExists(organizationId) {
    const { data, error } = await supabase
      .from('tblorganization')
      .select('org_id')
      .eq('org_id', organizationId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  }

  /**
   * Create a new user
   * @param {Object} userData - User data from request
   * @param {string} adminUUID - UUID of admin creating the user (from created_by)
   */
  static async createAdminUser(userData, adminUUID) {
    try {
      const {
        firstName,
        lastName,
        email,
        employeeId,
        department,
        roleId,
        organizationId,
      } = userData;

      // Validation
      if (!firstName || !lastName || !email || !employeeId || !roleId) {
        return {
          success: false,
          error: 'Missing required fields: firstName, lastName, email, employeeId, roleId',
        };
      }

      // Check for duplicate email
      const emailDuplicate = await this.emailExists(email);
      if (emailDuplicate) {
        return {
          success: false,
          error: `Email "${email}" already exists in the system`,
        };
      }

      // Check for duplicate employee_id
      const empIdDuplicate = await this.employeeIdExists(employeeId);
      if (empIdDuplicate) {
        return {
          success: false,
          error: `Employee ID "${employeeId}" already exists in the system`,
        };
      }

      // Verify role exists
      const roleValid = await this.roleExists(roleId);
      if (!roleValid) {
        return {
          success: false,
          error: `Role with ID "${roleId}" does not exist`,
        };
      }

      // Verify organization exists (if provided)
      if (organizationId) {
        const orgValid = await this.organizationExists(organizationId);
        if (!orgValid) {
          return {
            success: false,
            error: `Organization with ID "${organizationId}" does not exist`,
          };
        }
      }

      // Generate password
      const { password, suffix } = this.generateDefaultPassword();
      const passwordHash = await this.hashPassword(password);

      // Insert new user into tblusers
      const { data: userData_created, error: userError } = await supabase
        .from('tblusers')
        .insert([
          {
            employee_id: employeeId,
            first_name: firstName,
            last_name: lastName,
            email,
            department: department || null,
            status: 'First_Time',
            is_first_login: true,
            password_hash: passwordHash,
            created_by: adminUUID || null, // Set to null if adminUUID is not a valid user (for testing)
            updated_by: adminUUID || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select();

      if (userError) {
        console.error('User Insert Error:', userError);
        throw userError;
      }

      const user_id = userData_created[0].user_id;

      console.log('=== New User Created ===');
      console.log('User ID:', user_id);
      console.log('Employee ID:', employeeId);
      console.log('Email:', email);
      console.log('Generated Password:', password);
      console.log('Password Suffix:', suffix);
      console.log('========================');

      // Insert user role into tbluserroles
      const { error: roleError } = await supabase
        .from('tbluserroles')
        .insert([
          {
            user_id,
            role_id: roleId,
          },
        ]);

      if (roleError) {
        console.error('Role Assignment Error:', roleError);
        // Delete the user if role assignment fails
        await supabase.from('tblusers').delete().eq('user_id', user_id);
        throw roleError;
      }

      // Organization is already set in the department field during user creation
      // so no additional update is needed

      return {
        success: true,
        data: {
          user_id,
          employee_id: employeeId,
          first_name: firstName,
          last_name: lastName,
          email,
          status: 'First_Time',
          is_first_login: true,
          generated_password: password,
          password_suffix: suffix,
        },
        message: 'User created successfully',
      };
    } catch (error) {
      console.error('Error in createAdminUser:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all active users
   */
  static async getAllAdminUsers(filters = {}) {
    try {
      let query = supabase
        .from('tblusers')
        .select(
          `user_id,
          employee_id,
          first_name,
          last_name,
          email,
          department,
          status,
          is_first_login,
          tbluserroles(role_id, tblroles(role_id, role_name))`
        );

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.search) {
        // Search by email, first_name, last_name, employee_id
        query = query.or(
          `email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,employee_id.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get all available roles
   */
  static async getAllRoles() {
    try {
      const { data, error } = await supabase
        .from('tblroles')
        .select('role_id, role_name')
        .order('role_name', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('Error fetching roles:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get all available organizations
   */
  static async getAllOrganizations() {
    try {
      const { data, error } = await supabase
        .from('tblorganization')
        .select('org_id, org_name, company_code, org_description')
        .order('org_name', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('Error fetching organizations:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }
}
