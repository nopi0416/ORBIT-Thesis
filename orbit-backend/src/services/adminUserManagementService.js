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

  static async emailExistsForOtherUser(email, userId) {
    const { data, error } = await supabase
      .from('tblusers')
      .select('user_id')
      .eq('email', email)
      .neq('user_id', userId)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  }

  /**
   * Check if admin email already exists
   */
  static async adminEmailExists(email) {
    const { data, error } = await supabase
      .from('tbladminusers')
      .select('admin_id')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  }

  static async logAdminActions(adminId, entries) {
    if (!adminId || !entries?.length) return;

    const payload = entries.map((entry) => ({
      admin_id: adminId,
      action: entry.action,
      target_table: entry.targetTable,
      target_id: entry.targetId,
      description: entry.description,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('tbladminlogs')
      .insert(payload);

    if (error) {
      console.error('Admin log insert error:', error);
    }
  }

  static async getAdminLogs(adminContext) {
    try {
      const normalizedRole = (adminContext?.role || '').toLowerCase();
      const isSuperAdmin = normalizedRole.includes('super admin');

      let query = supabase
        .from('tbladminlogs')
        .select('admin_log_id, admin_id, action, target_table, target_id, description, created_at, tbladminusers (full_name, email)')
        .order('created_at', { ascending: false });

      if (!isSuperAdmin && adminContext?.id) {
        query = query.eq('admin_id', adminContext.id);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
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
   * Get the first available geo_id (fallback for user creation)
   */
  static async getDefaultGeoId() {
    try {
      const { data, error } = await supabase
        .from('tblgeo')
        .select('geo_id')
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }
      return data.geo_id;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify that geo exists in tblgeo
   */
  static async geoExists(geoId) {
    const { data, error } = await supabase
      .from('tblgeo')
      .select('geo_id')
      .eq('geo_id', geoId)
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

  static normalizeAdminRole(role) {
    return (role || '').toString().trim().toLowerCase();
  }

  static isSuperAdmin(role) {
    return this.normalizeAdminRole(role).includes('super admin');
  }

  static isCompanyAdmin(role) {
    return this.normalizeAdminRole(role).includes('company admin');
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
        departmentId,
        roleId,
        organizationId,
        geoId,
      } = userData;

      // Validation
      if (!firstName || !lastName || !email || !employeeId || !roleId || !geoId || !departmentId) {
        return {
          success: false,
          error: 'Missing required fields: firstName, lastName, email, employeeId, roleId, geoId, departmentId',
        };
      }

      // Check for duplicate email and employee_id
      const emailDuplicate = await this.emailExists(email);
      const empIdDuplicate = await this.employeeIdExists(employeeId);
      if (emailDuplicate || empIdDuplicate) {
        const errors = {};
        if (emailDuplicate) {
          errors.email = `Email "${email}" already exists in the system`;
        }
        if (empIdDuplicate) {
          errors.employeeId = `Employee ID "${employeeId}" already exists in the system`;
        }
        return {
          success: false,
          error: errors,
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

      // Verify geo exists
      const geoValid = await this.geoExists(geoId);
      if (!geoValid) {
        return {
          success: false,
          error: `Geo with ID "${geoId}" does not exist`,
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

      // Verify department exists
      const deptValid = await this.organizationExists(departmentId);
      if (!deptValid) {
        return {
          success: false,
          error: `Department with ID "${departmentId}" does not exist`,
        };
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
            org_id: organizationId || null,
            department_id: departmentId,
            geo_id: geoId,
            status: 'First_Time',
            is_first_login: true,
            password_hash: passwordHash,
            created_by: adminUUID || null,
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

      await this.logAdminActions(adminUUID, [
        {
          action: 'create_user',
          targetTable: 'tblusers',
          targetId: user_id,
          description: `Created user ${email}`,
        },
      ]);

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
   * Create a new admin user
   * @param {Object} adminData - Admin data from request
   * @param {Object} adminContext - Authenticated admin context
   */
  static async createAdminAccount(adminData, adminContext) {
    try {
      const { fullName, email, adminRole, orgId } = adminData;
      const creatorRole = adminContext?.role || '';
      const creatorId = adminContext?.id || null;

      if (!fullName || !email || !adminRole) {
        return {
          success: false,
          error: 'Missing required fields: fullName, email, adminRole',
        };
      }

      if (!this.isSuperAdmin(adminRole) && !this.isCompanyAdmin(adminRole)) {
        return {
          success: false,
          error: 'Admin role must be Super Admin or Company Admin',
        };
      }

      if (this.isSuperAdmin(adminRole) && !this.isSuperAdmin(creatorRole)) {
        return {
          success: false,
          error: 'Only Super Admins can create Super Admin accounts',
        };
      }

      if (this.isCompanyAdmin(adminRole) && !orgId) {
        return {
          success: false,
          error: 'Organization is required for Company Admin accounts',
        };
      }

      const emailDuplicate = await this.adminEmailExists(email);
      if (emailDuplicate) {
        return {
          success: false,
          error: `Email "${email}" already exists in admin accounts`,
        };
      }

      const userEmailDuplicate = await this.emailExists(email);
      if (userEmailDuplicate) {
        return {
          success: false,
          error: `Email "${email}" already exists in user accounts`,
        };
      }

      if (orgId) {
        const orgValid = await this.organizationExists(orgId);
        if (!orgValid) {
          return {
            success: false,
            error: `Organization with ID "${orgId}" does not exist`,
          };
        }
      }

      const { password, suffix } = this.generateDefaultPassword();
      const passwordHash = await this.hashPassword(password);

      const { data: adminInsert, error: adminError } = await supabase
        .from('tbladminusers')
        .insert([
          {
            email,
            full_name: fullName,
            admin_role: adminRole,
            password_hash: passwordHash,
            is_active: true,
            org_id: orgId || null,
            created_by: creatorId,
            updated_by: creatorId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select();

      if (adminError) {
        console.error('Admin Insert Error:', adminError);
        throw adminError;
      }

      await this.logAdminActions(creatorId, [
        {
          action: 'create_admin_user',
          targetTable: 'tbladminusers',
          targetId: adminInsert?.[0]?.admin_id,
          description: `Created admin account ${email} (${adminRole})`,
        },
      ]);

      return {
        success: true,
        data: {
          admin_id: adminInsert?.[0]?.admin_id,
          email,
          full_name: fullName,
          admin_role: adminRole,
          org_id: orgId || null,
          generated_password: password,
          password_suffix: suffix,
        },
        message: 'Admin account created successfully',
      };
    } catch (error) {
      console.error('Error in createAdminAccount:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all active users
   */
  static async getAllAdminUsers(filters = {}, adminContext = {}) {
    try {
      console.log('[getAllAdminUsers] Starting user fetch with filters:', filters);

      const adminRole = adminContext?.role || '';
      const adminOrgId = adminContext?.orgId || null;
      const isSuperAdmin = this.isSuperAdmin(adminRole);
      const isCompanyAdmin = this.isCompanyAdmin(adminRole);

      if (!isSuperAdmin && !isCompanyAdmin) {
        return {
          success: false,
          error: 'Admin role not authorized to view users',
          data: [],
        };
      }

      let query = supabase
        .from('tblusers')
        .select(
          `user_id,
          employee_id,
          first_name,
          last_name,
          email,
          org_id,
          department_id,
          geo_id,
          status,
          is_first_login,
          organization:tblorganization!tblusers_org_id_fkey(org_id, org_name),
          department_org:tblorganization!tblusers_department_id_fkey(org_id, org_name),
          tblgeo(geo_id, geo_name, geo_code),
          tbluserroles(role_id, tblroles(role_id, role_name))`
        );

      // Apply filters
      if (filters.status) {
        console.log('[getAllAdminUsers] Applying status filter:', filters.status);
        query = query.eq('status', filters.status);
      }

      if (isCompanyAdmin) {
        if (!adminOrgId) {
          return {
            success: true,
            data: [],
          };
        }
        query = query.eq('org_id', adminOrgId);
      }

      if (filters.search) {
        console.log('[getAllAdminUsers] Applying search filter:', filters.search);
        // Search by email, first_name, last_name, employee_id
        query = query.or(
          `email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,employee_id.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      console.log('[getAllAdminUsers] Query result - Error:', error, 'Data Count:', data?.length || 0);

      if (error) {
        console.error('[getAllAdminUsers] Supabase error details:', error);
        throw error;
      }

      const users = data || [];

      const departmentIds = users
        .map((item) => item.department_id)
        .filter((id) => !!id);

      let departmentMap = {};
      if (departmentIds.length > 0) {
        const { data: departments, error: deptError } = await supabase
          .from('tblorganization')
          .select('org_id, org_name')
          .in('org_id', Array.from(new Set(departmentIds)));

        if (!deptError) {
          departmentMap = (departments || []).reduce((acc, dept) => {
            acc[dept.org_id] = dept.org_name;
            return acc;
          }, {});
        }
      }

      const normalizedUsers = users.map((item) => ({
        ...item,
        user_type: 'user',
        department_name: item.department_id ? departmentMap[item.department_id] || null : null,
      }));

      let adminAccounts = [];
      if (isSuperAdmin) {
        let adminQuery = supabase
          .from('tbladminusers')
          .select('admin_id, full_name, email, admin_role, org_id, is_active, created_at, updated_at, tblorganization(org_id, org_name)');

        if (filters.search) {
          adminQuery = adminQuery.or(
            `email.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%`
          );
        }

        const { data: admins, error: adminError } = await adminQuery;

        if (adminError) {
          console.error('[getAllAdminUsers] Admin query error:', adminError);
        } else {
          const statusFilter = (filters.status || '').toLowerCase();
          adminAccounts = (admins || [])
            .filter((admin) => {
              if (!statusFilter) return true;
              if (statusFilter === 'active') return admin.is_active === true;
              if (statusFilter === 'inactive') return admin.is_active === false;
              return false;
            })
            .map((admin) => ({
              user_id: admin.admin_id,
              employee_id: null,
              first_name: admin.full_name || '',
              last_name: '',
              email: admin.email,
              org_id: admin.org_id || null,
              department_id: null,
              geo_id: null,
              status: admin.is_active ? 'Active' : 'Inactive',
              is_first_login: false,
              tblorganization: admin.tblorganization || null,
              tblgeo: null,
              tbluserroles: [
                {
                  role_id: null,
                  tblroles: {
                    role_id: null,
                    role_name: admin.admin_role,
                  },
                },
              ],
              user_type: 'admin',
              department_name: null,
            }));
        }
      }

      const combined = [...normalizedUsers, ...adminAccounts];
      console.log('[getAllAdminUsers] Returning', combined.length, 'users');
      return {
        success: true,
        data: combined,
      };
    } catch (error) {
      console.error('[getAllAdminUsers] Exception caught:', error.message);
      console.error('[getAllAdminUsers] Full error:', error);
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
        .select('org_id, org_name, parent_org_id, company_code, org_description')
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

  /**
   * Get all available geos
   */
  static async getAllGeos() {
    try {
      const { data, error } = await supabase
        .from('tblgeo')
        .select('geo_id, geo_name, geo_code')
        .order('geo_name', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('Error fetching geos:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  static async updateUser(userId, payload, adminContext = {}) {
    try {
      const adminRole = adminContext?.role || '';
      const adminOrgId = adminContext?.orgId || null;
      const isSuperAdmin = this.isSuperAdmin(adminRole);
      const isCompanyAdmin = this.isCompanyAdmin(adminRole);

      const { data: existingUser, error: existingError } = await supabase
        .from('tblusers')
        .select('user_id, org_id, employee_id, email')
        .eq('user_id', userId)
        .single();

      if (existingError) {
        return { success: false, error: existingError.message };
      }

      if (!isSuperAdmin && !isCompanyAdmin) {
        return { success: false, error: 'Admin role not authorized to update users' };
      }

      if (isCompanyAdmin && adminOrgId && existingUser?.org_id !== adminOrgId) {
        return { success: false, error: 'Company Admin can only update users in their own OU' };
      }

      const {
        firstName,
        lastName,
        email,
        roleId,
        organizationId,
        departmentId,
        geoId,
      } = payload || {};

      if (!firstName || !lastName || !email || !roleId || !geoId || !departmentId) {
        return { success: false, error: 'Missing required fields' };
      }
      
        if (isCompanyAdmin && organizationId && organizationId !== adminOrgId) {
          return { success: false, error: 'Company Admin can only assign users to their own OU' };
        }

      if (email && email !== existingUser?.email) {
        const emailDuplicate = await this.emailExistsForOtherUser(email, userId);
        if (emailDuplicate) {
          return { success: false, error: `Email "${email}" already exists in the system` };
        }
      }

      const roleValid = await this.roleExists(roleId);
      if (!roleValid) {
        return { success: false, error: `Role with ID "${roleId}" does not exist` };
      }

      if (isCompanyAdmin) {
        const { data: roleData, error: roleError } = await supabase
          .from('tblroles')
          .select('role_name')
          .eq('role_id', roleId)
          .single();

        if (roleError) {
          return { success: false, error: roleError.message };
        }

        if ((roleData?.role_name || '').toLowerCase().includes('super admin')) {
          return { success: false, error: 'Company Admin cannot assign Super Admin role' };
        }
      }

      const geoValid = await this.geoExists(geoId);
      if (!geoValid) {
        return { success: false, error: `Geo with ID "${geoId}" does not exist` };
      }

      if (organizationId) {
        const orgValid = await this.organizationExists(organizationId);
        if (!orgValid) {
          return { success: false, error: `Organization with ID "${organizationId}" does not exist` };
        }
      }

      const deptValid = await this.organizationExists(departmentId);
      if (!deptValid) {
        return { success: false, error: `Department with ID "${departmentId}" does not exist` };
      }

      if (organizationId && departmentId) {
        const { data: departmentOrg, error: deptError } = await supabase
          .from('tblorganization')
          .select('org_id, parent_org_id')
          .eq('org_id', departmentId)
          .single();

        if (deptError) {
          return { success: false, error: deptError.message };
        }

        if (departmentOrg?.parent_org_id && departmentOrg.parent_org_id !== organizationId) {
          return { success: false, error: 'Department does not belong to selected OU' };
        }
      }

      const { error: updateError } = await supabase
        .from('tblusers')
        .update({
          first_name: firstName,
          last_name: lastName,
          email,
          org_id: organizationId || null,
          department_id: departmentId,
          geo_id: geoId,
          updated_by: adminContext?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      const { error: roleDeleteError } = await supabase
        .from('tbluserroles')
        .delete()
        .eq('user_id', userId);

      if (roleDeleteError) {
        return { success: false, error: roleDeleteError.message };
      }

      const { error: roleInsertError } = await supabase
        .from('tbluserroles')
        .insert([{ user_id: userId, role_id: roleId }]);

      if (roleInsertError) {
        return { success: false, error: roleInsertError.message };
      }

      await this.logAdminActions(adminContext?.id, [
        {
          action: 'USER_UPDATED',
          targetTable: 'tblusers',
          targetId: userId,
          description: `Updated user ${email}`,
        },
      ]);

      return { success: true, data: { user_id: userId } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateUserStatus(userIds = [], action, adminContext = {}) {
    try {
      const adminId = adminContext?.id || null;
      const normalizedAction = (action || '').toString().trim().toLowerCase();
      const actionMap = {
        lock: 'Locked',
        unlock: 'Active',
        deactivate: 'Deactivated',
        reactivate: 'Active',
      };

      const nextStatus = actionMap[normalizedAction];
      if (!nextStatus) {
        return {
          success: false,
          error: 'Invalid status action',
        };
      }

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return {
          success: false,
          error: 'No user IDs provided',
        };
      }

      const { data: existingUsers, error: existingError } = await supabase
        .from('tblusers')
        .select('user_id, email')
        .in('user_id', userIds);

      if (existingError) throw existingError;

      if (!existingUsers || existingUsers.length === 0) {
        return {
          success: false,
          error: 'No matching users found',
        };
      }

      const { error: updateError } = await supabase
        .from('tblusers')
        .update({
          status: nextStatus,
          updated_by: adminId,
          updated_at: new Date().toISOString(),
        })
        .in('user_id', existingUsers.map((user) => user.user_id));

      if (updateError) throw updateError;

      const descriptionSuffix = `${normalizedAction} user`;
      await this.logAdminActions(adminId, existingUsers.map((user) => ({
        action: normalizedAction,
        targetTable: 'tblusers',
        targetId: user.user_id,
        description: `${descriptionSuffix} ${user.email}`,
      })));

      return {
        success: true,
        data: {
          updatedCount: existingUsers.length,
          status: nextStatus,
        },
      };
    } catch (error) {
      console.error('Error updating user status:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
