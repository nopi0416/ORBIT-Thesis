import supabase from '../config/database.js';
import bcrypt from 'bcrypt';
import {
  sendAdminAccountCredentialsEmail,
  sendAdminCredentialsCopyEmail,
  sendNewUserCredentialsEmail,
} from '../config/email.js';

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

  static isValidBaselinePassword(basePassword) {
    const value = (basePassword || '').toString().trim();
    return value.length > 0
      && value.length <= 10
      && /^(?=.*[@._-])[A-Za-z0-9@._-]+$/.test(value);
  }

  static generatePasswordFromBaseline(basePassword) {
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

  static async adminEmailExistsForOtherAdmin(email, adminId) {
    const { data, error } = await supabase
      .from('tbladminusers')
      .select('admin_id')
      .eq('email', email)
      .neq('admin_id', adminId)
      .limit(1)
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

  static normalizeAuditAction(action) {
    const key = (action || '').toString().trim().toLowerCase();

    const actionMap = {
      create_user: 'Create User',
      create_admin_user: 'Create Admin',
      reset_user_credentials: 'Reset Credentials',
      user_updated: 'Update User',
      lock: 'Lock User',
      unlock: 'Unlock User',
      deactivate: 'Deactivate User',
      reactivate: 'Reactivate User',
      pending: 'Login Pending OTP',
      success: 'Login Success',
      failed: 'Login Failed',
    };

    if (actionMap[key]) return actionMap[key];

    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Activity';
  }

  static normalizeAuditEntity(targetTable) {
    const key = (targetTable || '').toString().trim().toLowerCase();

    const entityMap = {
      tblusers: 'User Account',
      tbladminusers: 'Admin Account',
      tbluserroles: 'User Role',
      tblorganization: 'Organization',
      tblgeo: 'Geography',
    };

    return entityMap[key] || 'System';
  }

  static toAdminLogView(log) {
    const actionLabel = this.normalizeAuditAction(log?.action);
    const entityLabel = this.normalizeAuditEntity(log?.target_table);
    const actorName = log?.tbladminusers?.full_name || 'Unknown Admin';
    const actorEmail = log?.tbladminusers?.email || '';
    const actor = actorEmail ? `${actorName} (${actorEmail})` : actorName;

    return {
      log_id: log?.admin_log_id,
      created_at: log?.created_at || null,
      actor,
      action: actionLabel,
      entity: entityLabel,
      summary: `${actionLabel} on ${entityLabel}`,
    };
  }

  static async getAdminLogs(adminContext) {
    try {
      const scope = await this.resolveAdminScope(adminContext);

      let query = supabase
        .from('tbladminlogs')
        .select('admin_log_id, admin_id, action, target_table, target_id, description, created_at, tbladminusers (admin_id, full_name, email, admin_role, org_id)')
        .order('created_at', { ascending: false });

      if (scope.isSuperAdmin) {
        const { data, error } = await query;

        if (error) {
          return { success: false, error: error.message };
        }

        const normalized = (data || []).map((log) => this.toAdminLogView(log));
        return { success: true, data: normalized };
      }

      if (!scope.isCompanyAdmin || !scope.orgId) {
        return { success: true, data: [] };
      }

      const { data: scopedAdmins, error: scopedAdminsError } = await supabase
        .from('tbladminusers')
        .select('admin_id, admin_role')
        .eq('org_id', scope.orgId);

      if (scopedAdminsError) {
        return { success: false, error: scopedAdminsError.message };
      }

      const scopedAdminIds = new Set(
        (scopedAdmins || [])
          .filter((row) => !this.isSuperAdminRoleName(row.admin_role))
          .map((row) => row.admin_id)
          .filter(Boolean)
      );

      if (scope.id) {
        scopedAdminIds.add(scope.id);
      }

      const { data: scopedUsers, error: scopedUsersError } = await supabase
        .from('tblusers')
        .select('user_id')
        .eq('org_id', scope.orgId);

      if (scopedUsersError) {
        return { success: false, error: scopedUsersError.message };
      }

      const scopedUserIds = new Set((scopedUsers || []).map((row) => row.user_id).filter(Boolean));

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      const filtered = (data || []).filter((log) => {
        const actorAdminId = log?.admin_id || null;
        const targetTable = (log?.target_table || '').toString().toLowerCase();
        const targetId = log?.target_id || null;
        const actorRole = log?.tbladminusers?.admin_role || '';

        if (this.isSuperAdminRoleName(actorRole)) {
          return false;
        }

        if (actorAdminId && scopedAdminIds.has(actorAdminId)) {
          return true;
        }

        if (targetTable === 'tblusers' && targetId && scopedUserIds.has(targetId)) {
          return true;
        }

        if (targetTable === 'tbladminusers' && targetId && scopedAdminIds.has(targetId)) {
          return true;
        }

        return false;
      });

      const normalized = filtered.map((log) => this.toAdminLogView(log));
      return { success: true, data: normalized };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getLoginLogs(adminContext) {
    try {
      const scope = await this.resolveAdminScope(adminContext);

      let query = supabase
        .from('tbllogin_audit')
        .select('id, user_id, email, login_status, ip_address, user_agent, logged_at, user_type')
        .order('logged_at', { ascending: false });

      if (scope.isSuperAdmin) {
        const { data, error } = await query;

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
      }

      if (!scope.isCompanyAdmin || !scope.orgId) {
        return { success: true, data: [] };
      }

      const { data: scopedAdmins, error: scopedAdminsError } = await supabase
        .from('tbladminusers')
        .select('admin_id, admin_role')
        .eq('org_id', scope.orgId);

      if (scopedAdminsError) {
        return { success: false, error: scopedAdminsError.message };
      }

      const scopedAdminIds = new Set(
        (scopedAdmins || [])
          .filter((row) => !this.isSuperAdminRoleName(row.admin_role))
          .map((row) => row.admin_id)
          .filter(Boolean)
      );

      if (scope.id) {
        scopedAdminIds.add(scope.id);
      }

      const { data: scopedUsers, error: scopedUsersError } = await supabase
        .from('tblusers')
        .select('user_id')
        .eq('org_id', scope.orgId);

      if (scopedUsersError) {
        return { success: false, error: scopedUsersError.message };
      }

      const scopedUserIds = new Set((scopedUsers || []).map((row) => row.user_id).filter(Boolean));

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      const filtered = (data || []).filter((log) => {
        const userType = (log?.user_type || '').toString().toLowerCase();
        const userId = log?.user_id || null;

        if (!userId) return false;

        if (userType === 'admin') {
          return scopedAdminIds.has(userId);
        }

        if (userType === 'user') {
          return scopedUserIds.has(userId);
        }

        return false;
      });

      return { success: true, data: filtered };
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

  static async getRoleById(roleId) {
    const { data, error } = await supabase
      .from('tblroles')
      .select('role_id, role_name')
      .eq('role_id', roleId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  }

  static isRequestorRole(roleName) {
    const normalized = (roleName || '').toString().trim().toLowerCase();
    return normalized.includes('requestor') || normalized.includes('requester');
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

  static isSuperAdminRoleName(roleName) {
    return this.normalizeAdminRole(roleName).includes('super admin');
  }

  static async resolveAdminScope(adminContext = {}) {
    const contextRole = adminContext?.role || '';
    const contextId = adminContext?.id || null;
    const contextEmail = adminContext?.email || null;
    const contextOrgId = adminContext?.orgId || adminContext?.org_id || null;

    let resolvedRole = contextRole;
    let resolvedOrgId = contextOrgId;
    let resolvedAdminId = contextId;
    let resolvedEmail = contextEmail;

    if ((!resolvedRole || !resolvedOrgId) && (contextId || contextEmail)) {
      let profileQuery = supabase
        .from('tbladminusers')
        .select('admin_id, email, admin_role, org_id');

      if (contextId) {
        profileQuery = profileQuery.eq('admin_id', contextId);
      } else {
        profileQuery = profileQuery.eq('email', contextEmail);
      }

      const { data: adminProfile, error: profileError } = await profileQuery.maybeSingle();

      if (!profileError && adminProfile) {
        resolvedRole = resolvedRole || adminProfile.admin_role || '';
        resolvedOrgId = resolvedOrgId || adminProfile.org_id || null;
        resolvedAdminId = resolvedAdminId || adminProfile.admin_id || null;
        resolvedEmail = resolvedEmail || adminProfile.email || null;
      }
    }

    return {
      role: resolvedRole,
      orgId: resolvedOrgId,
      id: resolvedAdminId,
      email: resolvedEmail,
      isSuperAdmin: this.isSuperAdmin(resolvedRole),
      isCompanyAdmin: this.isCompanyAdmin(resolvedRole),
    };
  }

  /**
   * Create a new user
   * @param {Object} userData - User data from request
   * @param {string} adminUUID - UUID of admin creating the user (from created_by)
   */
  static async createAdminUser(userData, adminContext = {}) {
    try {
      const scope = await this.resolveAdminScope(adminContext);
      const adminUUID = scope.id || adminContext?.id || adminContext;
      const adminEmail = typeof adminContext === 'object' ? adminContext?.email : null;
      const creatorIsCompanyAdmin = scope.isCompanyAdmin;
      const creatorOrgId = scope.orgId || null;
      const {
        firstName,
        lastName,
        email,
        employeeId,
        departmentId,
        roleId,
        organizationId,
        geoId,
      } = userData;

      if (creatorIsCompanyAdmin && !creatorOrgId) {
        return {
          success: false,
          error: 'Company Admin OU is not configured. Please contact a Super Admin.',
        };
      }

      if (creatorIsCompanyAdmin && organizationId && organizationId !== creatorOrgId) {
        return {
          success: false,
          error: 'Company Admin can only add users to their own OU',
        };
      }

      const effectiveOrganizationId = creatorIsCompanyAdmin
        ? creatorOrgId
        : (organizationId || null);

      // Validation
      if (!firstName || !lastName || !email || !employeeId || !roleId || !geoId) {
        return {
          success: false,
          error: 'Missing required fields: firstName, lastName, email, employeeId, roleId, geoId',
        };
      }

      if (!/^[a-zA-Z0-9]+$/.test(employeeId)) {
        return {
          success: false,
          error: 'Employee ID must be alphanumeric only',
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
      const roleData = await this.getRoleById(roleId);
      if (!roleData) {
        return {
          success: false,
          error: `Role with ID "${roleId}" does not exist`,
        };
      }

      const roleName = roleData.role_name || '';
      const requiresDepartment = this.isRequestorRole(roleName);
      const normalizedDepartmentId = requiresDepartment ? departmentId : null;

      if (requiresDepartment && !departmentId) {
        return {
          success: false,
          error: 'Department ID is required for Requestor role',
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
      if (effectiveOrganizationId) {
        const orgValid = await this.organizationExists(effectiveOrganizationId);
        if (!orgValid) {
          return {
            success: false,
            error: `Organization with ID "${effectiveOrganizationId}" does not exist`,
          };
        }
      }

      if (normalizedDepartmentId) {
        // Verify department exists
        const deptValid = await this.organizationExists(normalizedDepartmentId);
        if (!deptValid) {
          return {
            success: false,
            error: `Department with ID "${normalizedDepartmentId}" does not exist`,
          };
        }

        if (effectiveOrganizationId) {
          const { data: departmentOrg, error: deptError } = await supabase
            .from('tblorganization')
            .select('org_id, parent_org_id')
            .eq('org_id', normalizedDepartmentId)
            .single();

          if (deptError) {
            return {
              success: false,
              error: deptError.message,
            };
          }

          if (departmentOrg?.parent_org_id && departmentOrg.parent_org_id !== effectiveOrganizationId) {
            return {
              success: false,
              error: 'Department does not belong to selected OU',
            };
          }
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
            org_id: effectiveOrganizationId,
            department_id: normalizedDepartmentId,
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

      const firstNameSafe = (firstName || 'User').toString().trim() || 'User';
      const credentialsEmailResult = await sendNewUserCredentialsEmail({
        email,
        firstName: firstNameSafe,
        employeeId,
        temporaryPassword: password,
      });

      const emailWarnings = [];
      if (!credentialsEmailResult?.success) {
        emailWarnings.push(`Credentials email failed: ${credentialsEmailResult?.error || 'Unknown error'}`);
      }

      const adminCopyEmailResult = await sendAdminCredentialsCopyEmail({
        adminEmail,
        targetEmail: email,
        targetName: `${firstNameSafe} ${lastName || ''}`.trim(),
        employeeId,
        temporaryPassword: password,
        action: 'created',
      });

      if (adminEmail && !adminCopyEmailResult?.success) {
        emailWarnings.push(`Admin copy email failed: ${adminCopyEmailResult?.error || 'Unknown error'}`);
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
          emails_sent: {
            credentials_email: !!credentialsEmailResult?.success,
            admin_copy_email: !!adminCopyEmailResult?.success,
          },
          ...(emailWarnings.length > 0 ? { email_warnings: emailWarnings } : {}),
        },
        message: emailWarnings.length > 0
          ? 'User created successfully, but one or more onboarding emails failed to send'
          : 'User created successfully',
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
   * Bulk create users/admins
   * @param {Array} entries - Validated entries from frontend bulk import
   * @param {Object} adminContext - Authenticated admin context
   */
  static async createUsersBulk(entries = [], adminContext = {}) {
    try {
      if (!Array.isArray(entries) || entries.length === 0) {
        return {
          success: false,
          error: 'No users provided for bulk creation',
        };
      }

      const creatorRole = adminContext?.role || '';
      const creatorId = adminContext?.id || null;
      const creatorOrgId = adminContext?.orgId || adminContext?.org_id || null;
      const creatorIsSuperAdmin = this.isSuperAdmin(creatorRole);
      const creatorIsCompanyAdmin = this.isCompanyAdmin(creatorRole);

      const failures = [];
      const normalizedEntries = entries.map((raw, index) => {
        const accountType = (raw?.accountType || 'user').toString().trim().toLowerCase() === 'admin' ? 'admin' : 'user';
        const email = (raw?.email || '').toString().trim();
        const employeeId = (raw?.employeeId || '').toString().trim();
        const fullName = (raw?.name || '').toString().trim().replace(/\s+/g, ' ');
        const nameParts = fullName ? fullName.split(' ') : [];
        const lastName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : fullName;
        const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : fullName;

        return {
          rowNumber: raw?.rowNumber ?? index + 2,
          accountType,
          adminRole: (raw?.adminRole || '').toString().trim(),
          employeeId,
          name: fullName,
          firstName,
          lastName,
          email,
          roleId: raw?.roleId || null,
          geoId: raw?.geoId || null,
          orgId: raw?.orgId || null,
          departmentId: raw?.departmentId || null,
        };
      });

      const emailToRows = new Map();
      const employeeIdToRows = new Map();
      const roleIds = new Set();
      const geoIds = new Set();
      const orgIds = new Set();
      const departmentIds = new Set();

      for (const entry of normalizedEntries) {
        const rowErrors = [];
        const emailKey = entry.email.toLowerCase();
        const adminRoleNormalized = this.normalizeAdminRole(entry.adminRole);

        if (!entry.email) rowErrors.push('Missing Email');

        if (emailKey) {
          const rows = emailToRows.get(emailKey) || [];
          rows.push(entry.rowNumber);
          emailToRows.set(emailKey, rows);
        }

        if (entry.accountType === 'admin') {
          if (!adminRoleNormalized) {
            rowErrors.push('Admin role must be Super Admin or Company Admin');
          }

          if (adminRoleNormalized && this.isSuperAdmin(adminRoleNormalized) && !creatorIsSuperAdmin) {
            rowErrors.push('Only Super Admins can create Super Admin accounts');
          }

          if (adminRoleNormalized && this.isCompanyAdmin(adminRoleNormalized) && !entry.orgId) {
            rowErrors.push('Organization is required for Company Admin accounts');
          }

          if (adminRoleNormalized && this.isCompanyAdmin(adminRoleNormalized) && !entry.geoId) {
            rowErrors.push('Geo is required for Company Admin accounts');
          }

          if (creatorIsCompanyAdmin && entry.orgId && creatorOrgId && entry.orgId !== creatorOrgId) {
            rowErrors.push('Company Admin can only create admins in their own OU');
          }

          if (entry.orgId) orgIds.add(entry.orgId);
          if (entry.geoId) geoIds.add(entry.geoId);
        } else {
          if (!entry.name) rowErrors.push('Missing Name');
          if (!entry.employeeId) rowErrors.push('Missing Employee ID');
          if (!entry.roleId) rowErrors.push('Missing Role');
          if (!entry.geoId) rowErrors.push('Missing Geo');
          if (!entry.orgId) rowErrors.push('Missing Organizational Unit');

          if (entry.employeeId && !/^[a-zA-Z0-9]+$/.test(entry.employeeId)) {
            rowErrors.push('Employee ID must be alphanumeric only');
          }

          const employeeKey = entry.employeeId.toLowerCase();
          if (employeeKey) {
            const rows = employeeIdToRows.get(employeeKey) || [];
            rows.push(entry.rowNumber);
            employeeIdToRows.set(employeeKey, rows);
          }

          if (entry.roleId) roleIds.add(entry.roleId);
          if (entry.geoId) geoIds.add(entry.geoId);
          if (entry.orgId) orgIds.add(entry.orgId);
          if (entry.departmentId) departmentIds.add(entry.departmentId);

          if (creatorIsCompanyAdmin && entry.orgId && creatorOrgId && entry.orgId !== creatorOrgId) {
            rowErrors.push('Company Admin can only add users to their own OU');
          }
        }

        if (rowErrors.length > 0) {
          failures.push({
            rowNumber: entry.rowNumber,
            accountType: entry.accountType,
            email: entry.email,
            error: rowErrors.join(', '),
          });
        }
      }

      for (const [email, rows] of emailToRows.entries()) {
        if (rows.length > 1) {
          rows.forEach((rowNumber) => {
            failures.push({
              rowNumber,
              accountType: normalizedEntries.find((entry) => entry.rowNumber === rowNumber)?.accountType || 'user',
              email,
              error: 'Duplicate Email in file',
            });
          });
        }
      }

      for (const [employeeId, rows] of employeeIdToRows.entries()) {
        if (rows.length > 1) {
          rows.forEach((rowNumber) => {
            failures.push({
              rowNumber,
              accountType: 'user',
              email: normalizedEntries.find((entry) => entry.rowNumber === rowNumber)?.email || '',
              error: `Duplicate Employee ID in file (${employeeId})`,
            });
          });
        }
      }

      const distinctEmails = Array.from(emailToRows.keys());
      const distinctEmployeeIds = Array.from(employeeIdToRows.keys());

      if (distinctEmails.length > 0) {
        const { data: existingUserEmails, error: existingUserEmailError } = await supabase
          .from('tblusers')
          .select('email')
          .in('email', distinctEmails);

        if (existingUserEmailError) throw existingUserEmailError;

        const { data: existingAdminEmails, error: existingAdminEmailError } = await supabase
          .from('tbladminusers')
          .select('email')
          .in('email', distinctEmails);

        if (existingAdminEmailError) throw existingAdminEmailError;

        const existingEmailSet = new Set([
          ...(existingUserEmails || []).map((row) => (row.email || '').toLowerCase()),
          ...(existingAdminEmails || []).map((row) => (row.email || '').toLowerCase()),
        ]);

        for (const entry of normalizedEntries) {
          if (existingEmailSet.has(entry.email.toLowerCase())) {
            failures.push({
              rowNumber: entry.rowNumber,
              accountType: entry.accountType,
              email: entry.email,
              error: 'Email already exists',
            });
          }
        }
      }

      if (distinctEmployeeIds.length > 0) {
        const { data: existingEmployeeRows, error: existingEmployeeError } = await supabase
          .from('tblusers')
          .select('employee_id')
          .in('employee_id', distinctEmployeeIds);

        if (existingEmployeeError) throw existingEmployeeError;

        const existingEmployeeSet = new Set((existingEmployeeRows || []).map((row) => (row.employee_id || '').toLowerCase()));
        for (const entry of normalizedEntries) {
          if (entry.accountType === 'user' && existingEmployeeSet.has(entry.employeeId.toLowerCase())) {
            failures.push({
              rowNumber: entry.rowNumber,
              accountType: 'user',
              email: entry.email,
              error: 'Employee ID already exists',
            });
          }
        }
      }

      const roleMap = new Map();
      if (roleIds.size > 0) {
        const { data: roleRows, error: roleError } = await supabase
          .from('tblroles')
          .select('role_id, role_name')
          .in('role_id', Array.from(roleIds));

        if (roleError) throw roleError;
        (roleRows || []).forEach((row) => roleMap.set(row.role_id, row));
      }

      const geoSet = new Set();
      if (geoIds.size > 0) {
        const { data: geoRows, error: geoError } = await supabase
          .from('tblgeo')
          .select('geo_id')
          .in('geo_id', Array.from(geoIds));

        if (geoError) throw geoError;
        (geoRows || []).forEach((row) => geoSet.add(row.geo_id));
      }

      const orgMap = new Map();
      const orgLookupIds = Array.from(new Set([...orgIds, ...departmentIds]));
      if (orgLookupIds.length > 0) {
        const { data: orgRows, error: orgError } = await supabase
          .from('tblorganization')
          .select('org_id, parent_org_id')
          .in('org_id', orgLookupIds);

        if (orgError) throw orgError;
        (orgRows || []).forEach((row) => orgMap.set(row.org_id, row));
      }

      for (const entry of normalizedEntries) {
        if (entry.accountType !== 'user') {
          if (entry.orgId && !orgMap.has(entry.orgId)) {
            failures.push({
              rowNumber: entry.rowNumber,
              accountType: entry.accountType,
              email: entry.email,
              error: 'Organization not found',
            });
          }

          if (this.isCompanyAdmin(entry.adminRole) && (!entry.geoId || !geoSet.has(entry.geoId))) {
            failures.push({
              rowNumber: entry.rowNumber,
              accountType: entry.accountType,
              email: entry.email,
              error: 'Geo not found',
            });
          }

          continue;
        }

        const roleData = roleMap.get(entry.roleId);
        if (!roleData) {
          failures.push({
            rowNumber: entry.rowNumber,
            accountType: 'user',
            email: entry.email,
            error: 'Role not found',
          });
          continue;
        }

        const requiresDepartment = this.isRequestorRole(roleData?.role_name);
        if (!geoSet.has(entry.geoId)) {
          failures.push({
            rowNumber: entry.rowNumber,
            accountType: 'user',
            email: entry.email,
            error: 'Geo not found',
          });
        }

        if (!entry.orgId || !orgMap.has(entry.orgId)) {
          failures.push({
            rowNumber: entry.rowNumber,
            accountType: 'user',
            email: entry.email,
            error: 'Organization not found',
          });
        }

        if (requiresDepartment && !entry.departmentId) {
          failures.push({
            rowNumber: entry.rowNumber,
            accountType: 'user',
            email: entry.email,
            error: 'Department is required for Requestor role',
          });
        }

        if (requiresDepartment && entry.departmentId && !orgMap.has(entry.departmentId)) {
          failures.push({
            rowNumber: entry.rowNumber,
            accountType: 'user',
            email: entry.email,
            error: 'Department not found',
          });
        }

        if (requiresDepartment && entry.departmentId && orgMap.has(entry.departmentId) && entry.orgId && orgMap.has(entry.orgId)) {
          const departmentOrg = orgMap.get(entry.departmentId);
          if (departmentOrg?.parent_org_id && departmentOrg.parent_org_id !== entry.orgId) {
            failures.push({
              rowNumber: entry.rowNumber,
              accountType: 'user',
              email: entry.email,
              error: 'Department does not belong to selected OU',
            });
          }
        }
      }

      const mergedFailures = Array.from(
        new Map(
          failures.map((failure) => {
            const key = `${failure.rowNumber}-${failure.email}-${failure.error}`;
            return [key, failure];
          })
        ).values()
      ).sort((a, b) => a.rowNumber - b.rowNumber);

      if (mergedFailures.length > 0) {
        return {
          success: false,
          error: {
            message: 'Bulk validation failed. No records were created.',
            failures: mergedFailures,
          },
        };
      }

      const now = new Date().toISOString();
      const userEntries = normalizedEntries.filter((entry) => entry.accountType === 'user');
      const adminEntries = normalizedEntries.filter((entry) => entry.accountType === 'admin');

      const userPayload = [];
      const userMeta = [];
      for (const entry of userEntries) {
        const roleData = roleMap.get(entry.roleId);
        const requiresDepartment = this.isRequestorRole(roleData?.role_name);
        const { password, suffix } = this.generateDefaultPassword();
        const passwordHash = await this.hashPassword(password);

        userPayload.push({
          employee_id: entry.employeeId,
          first_name: entry.firstName,
          last_name: entry.lastName,
          email: entry.email,
          org_id: entry.orgId || null,
          department_id: requiresDepartment ? entry.departmentId : null,
          geo_id: entry.geoId,
          status: 'First_Time',
          is_first_login: true,
          password_hash: passwordHash,
          created_by: creatorId,
          updated_by: creatorId,
          created_at: now,
          updated_at: now,
        });

        userMeta.push({
          rowNumber: entry.rowNumber,
          email: entry.email,
          employeeId: entry.employeeId,
          roleId: entry.roleId,
          firstName: entry.firstName,
          generatedPassword: password,
          passwordSuffix: suffix,
        });
      }

      const adminPayload = [];
      const adminMeta = [];
      for (const entry of adminEntries) {
        const { password, suffix } = this.generateDefaultPassword();
        const passwordHash = await this.hashPassword(password);

        adminPayload.push({
          email: entry.email,
          full_name: entry.name,
          admin_role: entry.adminRole,
          password_hash: passwordHash,
          status: 'Active',
          is_first_login: true,
          org_id: entry.orgId || null,
          geo_id: this.isCompanyAdmin(entry.adminRole) ? (entry.geoId || null) : null,
          created_by: creatorId,
          updated_by: creatorId,
          created_at: now,
          updated_at: now,
        });

        adminMeta.push({
          rowNumber: entry.rowNumber,
          email: entry.email,
          adminRole: entry.adminRole,
          generatedPassword: password,
          passwordSuffix: suffix,
        });
      }

      const createdUserIds = [];
      const createdAdminIds = [];

      const rollbackCreatedRecords = async () => {
        if (createdUserIds.length > 0) {
          await supabase.from('tbluserroles').delete().in('user_id', createdUserIds);
          await supabase.from('tblusers').delete().in('user_id', createdUserIds);
        }

        if (createdAdminIds.length > 0) {
          await supabase.from('tbladminusers').delete().in('admin_id', createdAdminIds);
        }
      };

      let insertedUsers = [];
      let insertedAdmins = [];

      try {
        if (userPayload.length > 0) {
          const { data: usersInserted, error: usersInsertError } = await supabase
            .from('tblusers')
            .insert(userPayload)
            .select('user_id, email, employee_id');

          if (usersInsertError) throw usersInsertError;
          insertedUsers = usersInserted || [];
          insertedUsers.forEach((row) => createdUserIds.push(row.user_id));

          const userIdByEmail = new Map(insertedUsers.map((row) => [(row.email || '').toLowerCase(), row.user_id]));
          const userRolePayload = userMeta.map((meta) => ({
            user_id: userIdByEmail.get((meta.email || '').toLowerCase()),
            role_id: meta.roleId,
          }));

          const invalidRoleAssignment = userRolePayload.some((item) => !item.user_id || !item.role_id);
          if (invalidRoleAssignment) {
            throw new Error('Unable to map inserted users to roles for bulk assignment');
          }

          const { error: userRoleInsertError } = await supabase
            .from('tbluserroles')
            .insert(userRolePayload);

          if (userRoleInsertError) throw userRoleInsertError;
        }

        if (adminPayload.length > 0) {
          const { data: adminsInserted, error: adminsInsertError } = await supabase
            .from('tbladminusers')
            .insert(adminPayload)
            .select('admin_id, email, admin_role');

          if (adminsInsertError) throw adminsInsertError;
          insertedAdmins = adminsInserted || [];
          insertedAdmins.forEach((row) => createdAdminIds.push(row.admin_id));
        }
      } catch (insertError) {
        await rollbackCreatedRecords();
        throw insertError;
      }

      const userInsertByEmail = new Map(insertedUsers.map((row) => [(row.email || '').toLowerCase(), row]));
      const adminInsertByEmail = new Map(insertedAdmins.map((row) => [(row.email || '').toLowerCase(), row]));

      await this.logAdminActions(creatorId, [
        ...userMeta.map((meta) => ({
          action: 'create_user',
          targetTable: 'tblusers',
          targetId: userInsertByEmail.get((meta.email || '').toLowerCase())?.user_id,
          description: `Bulk created user ${meta.email}`,
        })),
        ...adminMeta.map((meta) => ({
          action: 'create_admin_user',
          targetTable: 'tbladminusers',
          targetId: adminInsertByEmail.get((meta.email || '').toLowerCase())?.admin_id,
          description: `Bulk created admin ${meta.email} (${meta.adminRole})`,
        })),
      ]);

      const emailWarnings = [];
      for (const meta of userMeta) {
        const credentialsEmailResult = await sendNewUserCredentialsEmail({
          email: meta.email,
          firstName: meta.firstName || 'User',
          employeeId: meta.employeeId,
          temporaryPassword: meta.generatedPassword,
        });

        if (!credentialsEmailResult?.success) {
          emailWarnings.push({
            rowNumber: meta.rowNumber,
            email: meta.email,
            error: credentialsEmailResult?.error || 'Unknown email error',
          });
        }
      }

      return {
        success: true,
        data: {
          total: entries.length,
          successCount: entries.length,
          failureCount: 0,
          createdUsers: insertedUsers.length,
          createdAdmins: insertedAdmins.length,
          emailWarnings,
        },
      };
    } catch (error) {
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
      const { fullName, email, adminRole, orgId, geoId } = adminData;
      const scope = await this.resolveAdminScope(adminContext);
      const creatorRole = scope.role || '';
      const creatorId = scope.id || null;
      const creatorOrgId = scope.orgId || null;

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

      if (this.isCompanyAdmin(adminRole) && !geoId) {
        return {
          success: false,
          error: 'Geo is required for Company Admin accounts',
        };
      }

      if (this.isCompanyAdmin(creatorRole)) {
        if (!creatorOrgId) {
          return {
            success: false,
            error: 'Company Admin OU is not configured. Please contact a Super Admin.',
          };
        }

        if (this.isSuperAdmin(adminRole)) {
          return {
            success: false,
            error: 'Company Admin cannot create Super Admin accounts',
          };
        }

        if (orgId && orgId !== creatorOrgId) {
          return {
            success: false,
            error: 'Company Admin can only create admins in their own OU',
          };
        }
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

      if (geoId) {
        const geoValid = await this.geoExists(geoId);
        if (!geoValid) {
          return {
            success: false,
            error: `Geo with ID "${geoId}" does not exist`,
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
            status: 'Active',
            is_first_login: true,
            org_id: orgId || null,
            geo_id: this.isCompanyAdmin(adminRole) ? geoId : null,
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

      await sendAdminAccountCredentialsEmail({
        email,
        fullName,
        temporaryPassword: password,
      });

      return {
        success: true,
        data: {
          admin_id: adminInsert?.[0]?.admin_id,
          email,
          full_name: fullName,
          admin_role: adminRole,
          org_id: orgId || null,
          geo_id: this.isCompanyAdmin(adminRole) ? geoId : null,
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

      const scope = await this.resolveAdminScope(adminContext);
      const adminOrgId = scope.orgId || null;
      const isSuperAdmin = scope.isSuperAdmin;
      const isCompanyAdmin = scope.isCompanyAdmin;

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

      const normalizedUsersRaw = users.map((item) => ({
        ...item,
        user_type: 'user',
        department_name: item.department_id ? departmentMap[item.department_id] || null : null,
      }));

      const normalizedUsers = isCompanyAdmin
        ? normalizedUsersRaw.filter((item) => {
          const roleName = item?.tbluserroles?.[0]?.tblroles?.role_name || '';
          return !this.isSuperAdminRoleName(roleName);
        })
        : normalizedUsersRaw;

      let adminAccounts = [];
      if (isSuperAdmin || isCompanyAdmin) {
        let adminQuery = supabase
          .from('tbladminusers')
          .select('admin_id, full_name, email, admin_role, org_id, geo_id, status, is_first_login, account_locked_until, created_at, updated_at, tblorganization(org_id, org_name)');

        if (isCompanyAdmin) {
          adminQuery = adminQuery
            .eq('org_id', adminOrgId)
            .not('admin_role', 'ilike', '%super admin%');
        }

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
          const now = Date.now();

          const adminGeoIds = Array.from(new Set((admins || []).map((admin) => admin.geo_id).filter(Boolean)));
          const geoNameById = new Map();

          if (adminGeoIds.length > 0) {
            const { data: geoRows } = await supabase
              .from('tblgeo')
              .select('geo_id, geo_name, geo_code')
              .in('geo_id', adminGeoIds);

            (geoRows || []).forEach((row) => {
              geoNameById.set(row.geo_id, row.geo_name || row.geo_code || null);
            });
          }

          adminAccounts = (admins || [])
            .filter((admin) => {
              const normalizedStatus = (admin.status || '').toString().trim().toLowerCase();
              const isFirstTime = admin.is_first_login === true || normalizedStatus === 'first_time';
              const isDeactivated = normalizedStatus === 'deactivated';
              const isLockedByStatus = normalizedStatus === 'locked';
              const isLocked = admin.account_locked_until
                ? new Date(admin.account_locked_until).getTime() > now
                : false;
              const computedStatus = isFirstTime
                ? 'first_time'
                : (isDeactivated
                ? 'deactivated'
                : ((isLockedByStatus || isLocked) ? 'locked' : 'active'));

              if (!statusFilter) return true;
              if (statusFilter === 'inactive') return computedStatus === 'deactivated';
              if (statusFilter === 'first-time' || statusFilter === 'first time') return computedStatus === 'first_time';
              return computedStatus === statusFilter;
            })
            .map((admin) => {
              const normalizedStatus = (admin.status || '').toString().trim().toLowerCase();
              const isFirstTime = admin.is_first_login === true || normalizedStatus === 'first_time';
              const isDeactivated = normalizedStatus === 'deactivated';
              const isLockedByStatus = normalizedStatus === 'locked';
              const isLocked = admin.account_locked_until
                ? new Date(admin.account_locked_until).getTime() > now
                : false;
              const statusLabel = isFirstTime
                ? 'First_Time'
                : (isDeactivated
                ? 'Deactivated'
                : ((isLockedByStatus || isLocked) ? 'Locked' : 'Active'));

              return {
              user_id: admin.admin_id,
              employee_id: null,
              first_name: admin.full_name || '',
              last_name: '',
              email: admin.email,
              org_id: admin.org_id || null,
              department_id: null,
              geo_id: admin.geo_id || null,
              status: statusLabel,
              is_first_login: !!admin.is_first_login,
              tblorganization: admin.tblorganization || null,
              tblgeo: admin.geo_id
                ? {
                  geo_id: admin.geo_id,
                  geo_name: geoNameById.get(admin.geo_id) || null,
                  geo_code: null,
                }
                : null,
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
              };
            });
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
      const scope = await this.resolveAdminScope(adminContext);
      const adminOrgId = scope.orgId || null;
      const isSuperAdmin = scope.isSuperAdmin;
      const isCompanyAdmin = scope.isCompanyAdmin;

      const { data: existingUser, error: existingUserError } = await supabase
        .from('tblusers')
        .select('user_id, org_id, employee_id, email')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingUserError) {
        return { success: false, error: existingUserError.message };
      }

      if (!isSuperAdmin && !isCompanyAdmin) {
        return { success: false, error: 'Admin role not authorized to update users' };
      }

      if (!existingUser) {
        const { data: existingAdmin, error: existingAdminError } = await supabase
          .from('tbladminusers')
          .select('admin_id, admin_role, org_id, email')
          .eq('admin_id', userId)
          .maybeSingle();

        if (existingAdminError) {
          return { success: false, error: existingAdminError.message };
        }

        if (!existingAdmin) {
          return { success: false, error: 'User not found' };
        }

        if (!isSuperAdmin) {
          return { success: false, error: 'Only Super Admin can edit Company Admin accounts' };
        }

        if (!this.isCompanyAdmin(existingAdmin.admin_role)) {
          return { success: false, error: 'Only Company Admin accounts can be edited here' };
        }

        const fullNameRaw = payload?.fullName
          || [payload?.firstName, payload?.lastName].filter(Boolean).join(' ')
          || '';
        const fullName = fullNameRaw.toString().trim().replace(/\s+/g, ' ');
        const email = (payload?.email || '').toString().trim();
        const geoId = payload?.geoId || null;
        const organizationId = payload?.organizationId || null;

        if (!fullName || !email || !geoId || !organizationId) {
          return { success: false, error: 'Missing required fields: fullName, email, geoId, organizationId' };
        }

        const duplicateAdminEmail = await this.adminEmailExistsForOtherAdmin(email, userId);
        if (duplicateAdminEmail) {
          return { success: false, error: `Email "${email}" already exists in admin accounts` };
        }

        const duplicateUserEmail = await this.emailExists(email);
        if (duplicateUserEmail && email !== existingAdmin.email) {
          return { success: false, error: `Email "${email}" already exists in user accounts` };
        }

        const geoValid = await this.geoExists(geoId);
        if (!geoValid) {
          return { success: false, error: `Geo with ID "${geoId}" does not exist` };
        }

        const orgValid = await this.organizationExists(organizationId);
        if (!orgValid) {
          return { success: false, error: `Organization with ID "${organizationId}" does not exist` };
        }

        const { error: adminUpdateError } = await supabase
          .from('tbladminusers')
          .update({
            full_name: fullName,
            email,
            org_id: organizationId,
            geo_id: geoId,
            updated_by: scope.id || adminContext?.id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('admin_id', userId);

        if (adminUpdateError) {
          return { success: false, error: adminUpdateError.message };
        }

        await this.logAdminActions(scope.id || adminContext?.id || null, [
          {
            action: 'USER_UPDATED',
            targetTable: 'tbladminusers',
            targetId: userId,
            description: `Updated company admin ${email}`,
          },
        ]);

        return { success: true, data: { admin_id: userId } };
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

      if (!firstName || !lastName || !email || !roleId || !geoId) {
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

      const roleData = await this.getRoleById(roleId);
      if (!roleData) {
        return { success: false, error: `Role with ID "${roleId}" does not exist` };
      }

      const roleNameLower = (roleData.role_name || '').toLowerCase();
      const isAdminLikeRole = roleNameLower.includes('super admin') || roleNameLower.includes('company admin');

      const requiresDepartment = this.isRequestorRole(roleData.role_name || '');
      const normalizedDepartmentId = requiresDepartment ? departmentId : null;

      if (requiresDepartment && !departmentId) {
        return { success: false, error: 'Department ID is required for Requestor role' };
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

      if (normalizedDepartmentId) {
        const deptValid = await this.organizationExists(normalizedDepartmentId);
        if (!deptValid) {
          return { success: false, error: `Department with ID "${normalizedDepartmentId}" does not exist` };
        }
      }

      if (organizationId && normalizedDepartmentId) {
        const { data: departmentOrg, error: deptError } = await supabase
          .from('tblorganization')
          .select('org_id, parent_org_id')
          .eq('org_id', normalizedDepartmentId)
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
          department_id: normalizedDepartmentId,
          geo_id: geoId,
          updated_by: scope.id || adminContext?.id || null,
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

      if (isAdminLikeRole) {
        const { password } = this.generateDefaultPassword();
        const passwordHash = await this.hashPassword(password);

        const { error: passwordUpdateError } = await supabase
          .from('tblusers')
          .update({
            password_hash: passwordHash,
            status: 'First_Time',
            is_first_login: true,
            updated_by: scope.id || adminContext?.id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (passwordUpdateError) {
          return { success: false, error: passwordUpdateError.message };
        }

        await sendNewUserCredentialsEmail({
          email,
          firstName,
          employeeId: existingUser?.employee_id || 'N/A',
          temporaryPassword: password,
        });
      }

      await this.logAdminActions(scope.id || adminContext?.id || null, [
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
      const scope = await this.resolveAdminScope(adminContext);
      const adminId = scope.id || adminContext?.id || null;
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

      if (!scope.isSuperAdmin && !scope.isCompanyAdmin) {
        return {
          success: false,
          error: 'Admin role not authorized to update user status',
        };
      }

      const { data: existingUsers, error: existingError } = await supabase
        .from('tblusers')
        .select('user_id, email, org_id')
        .in('user_id', userIds);

      if (existingError) throw existingError;

      const { data: existingAdmins, error: existingAdminsError } = await supabase
        .from('tbladminusers')
        .select('admin_id, email, admin_role, org_id')
        .in('admin_id', userIds);

      if (existingAdminsError) throw existingAdminsError;

      const scopedUsers = scope.isCompanyAdmin && scope.orgId
        ? (existingUsers || []).filter((user) => user.org_id === scope.orgId)
        : (existingUsers || []);

      if (scope.isCompanyAdmin && !scope.isSuperAdmin && (existingAdmins || []).length > 0) {
        return {
          success: false,
          error: 'Only Super Admin can update Company Admin status',
        };
      }

      const companyAdmins = (existingAdmins || []).filter((admin) => this.isCompanyAdmin(admin.admin_role));
      const nonCompanyAdmins = (existingAdmins || []).filter((admin) => !this.isCompanyAdmin(admin.admin_role));

      if (nonCompanyAdmins.length > 0) {
        return {
          success: false,
          error: 'Only Company Admin accounts can be locked or deactivated from this screen',
        };
      }

      if (scopedUsers.length === 0 && companyAdmins.length === 0) {
        return {
          success: false,
          error: 'No matching users found',
        };
      }

      if (scopedUsers.length > 0) {
        const { error: updateError } = await supabase
          .from('tblusers')
          .update({
            status: nextStatus,
            updated_by: adminId,
            updated_at: new Date().toISOString(),
          })
          .in('user_id', scopedUsers.map((user) => user.user_id));

        if (updateError) throw updateError;
      }

      if (companyAdmins.length > 0) {
        const nowIso = new Date().toISOString();
        let adminUpdatePayload = {
          updated_by: adminId,
          updated_at: nowIso,
        };

        if (normalizedAction === 'lock') {
          adminUpdatePayload = {
            ...adminUpdatePayload,
            status: 'Locked',
            account_locked_until: '2099-12-31T23:59:59.000Z',
          };
        }

        if (normalizedAction === 'unlock') {
          adminUpdatePayload = {
            ...adminUpdatePayload,
            status: 'Active',
            account_locked_until: null,
            failed_login_attempts: 0,
          };
        }

        if (normalizedAction === 'deactivate') {
          adminUpdatePayload = {
            ...adminUpdatePayload,
            status: 'Deactivated',
            account_locked_until: null,
          };
        }

        if (normalizedAction === 'reactivate') {
          adminUpdatePayload = {
            ...adminUpdatePayload,
            status: 'Active',
            account_locked_until: null,
            failed_login_attempts: 0,
          };
        }

        const { error: adminStatusError } = await supabase
          .from('tbladminusers')
          .update(adminUpdatePayload)
          .in('admin_id', companyAdmins.map((admin) => admin.admin_id));

        if (adminStatusError) throw adminStatusError;
      }

      const descriptionSuffix = `${normalizedAction} user`;
      await this.logAdminActions(adminId, [
        ...scopedUsers.map((user) => ({
          action: normalizedAction,
          targetTable: 'tblusers',
          targetId: user.user_id,
          description: `${descriptionSuffix} ${user.email}`,
        })),
        ...companyAdmins.map((admin) => ({
          action: normalizedAction,
          targetTable: 'tbladminusers',
          targetId: admin.admin_id,
          description: `${descriptionSuffix} ${admin.email}`,
        })),
      ]);

      return {
        success: true,
        data: {
          updatedCount: scopedUsers.length + companyAdmins.length,
          updatedUsersCount: scopedUsers.length,
          updatedAdminsCount: companyAdmins.length,
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

  static async resetUserCredentials(userId, basePassword, adminContext = {}) {
    try {
      const scope = await this.resolveAdminScope(adminContext);
      const adminOrgId = scope.orgId || adminContext?.orgId || adminContext?.org_id || null;
      const isSuperAdmin = scope.isSuperAdmin;
      const isCompanyAdmin = scope.isCompanyAdmin;

      if (!isSuperAdmin && !isCompanyAdmin) {
        return { success: false, error: 'Admin role not authorized to reset credentials' };
      }

      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      if (!this.isValidBaselinePassword(basePassword)) {
        return {
          success: false,
          error: 'Baseline password must be 1-10 chars, include at least one symbol (@, -, _, .), and only use letters, numbers, @, -, _, .',
        };
      }

      const { data: existingUser, error: existingError } = await supabase
        .from('tblusers')
        .select('user_id, email, first_name, employee_id, org_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingError) {
        return { success: false, error: existingError.message };
      }

      if (!existingUser) {
        const { data: existingAdmin, error: existingAdminError } = await supabase
          .from('tbladminusers')
          .select('admin_id, email, full_name, admin_role, org_id')
          .eq('admin_id', userId)
          .maybeSingle();

        if (existingAdminError) {
          return { success: false, error: existingAdminError.message };
        }

        if (!existingAdmin) {
          return { success: false, error: 'User not found' };
        }

        if (!isSuperAdmin) {
          return { success: false, error: 'Only Super Admin can reset Company Admin credentials' };
        }

        if (!this.isCompanyAdmin(existingAdmin.admin_role)) {
          return { success: false, error: 'Only Company Admin accounts can be reset here' };
        }

        const { password } = this.generatePasswordFromBaseline(basePassword);
        const passwordHash = await this.hashPassword(password);
        const now = new Date().toISOString();
        const adminId = scope.id || adminContext?.id || null;

        const { error: updateAdminError } = await supabase
          .from('tbladminusers')
          .update({
            password_hash: passwordHash,
            status: 'First_Time',
            is_first_login: true,
            failed_login_attempts: 0,
            account_locked_until: null,
            updated_by: adminId,
            updated_at: now,
          })
          .eq('admin_id', userId);

        if (updateAdminError) {
          return { success: false, error: updateAdminError.message };
        }

        await supabase
          .from('tblsecurity_questions')
          .delete()
          .eq('user_id', userId);

        const credentialsEmailResult = await sendAdminAccountCredentialsEmail({
          email: existingAdmin.email,
          fullName: existingAdmin.full_name || 'Admin',
          temporaryPassword: password,
        });

        await this.logAdminActions(adminId, [
          {
            action: 'reset_user_credentials',
            targetTable: 'tbladminusers',
            targetId: userId,
            description: `Reset credentials for company admin ${existingAdmin.email}`,
          },
        ]);

        return {
          success: true,
          data: {
            user_id: userId,
            email: existingAdmin.email,
            status: 'First_Time',
            is_first_login: true,
            credentials_email_sent: !!credentialsEmailResult?.success,
          },
        };
      }

      if (isCompanyAdmin && adminOrgId && existingUser?.org_id !== adminOrgId) {
        return { success: false, error: 'Company Admin can only reset users in their own OU' };
      }

      const { password } = this.generatePasswordFromBaseline(basePassword);
      const passwordHash = await this.hashPassword(password);

      const now = new Date().toISOString();
      const adminId = scope.id || adminContext?.id || null;

      const { error: updateUserError } = await supabase
        .from('tblusers')
        .update({
          password_hash: passwordHash,
          status: 'First_Time',
          is_first_login: true,
          updated_by: adminId,
          updated_at: now,
        })
        .eq('user_id', userId);

      if (updateUserError) {
        return { success: false, error: updateUserError.message };
      }

      const { error: securityDeleteError } = await supabase
        .from('tblsecurity_questions')
        .delete()
        .eq('user_id', userId);

      if (securityDeleteError) {
        return { success: false, error: securityDeleteError.message };
      }

      const firstNameSafe = (existingUser?.first_name || 'User').toString().trim() || 'User';
      const credentialsEmailResult = await sendNewUserCredentialsEmail({
        email: existingUser.email,
        firstName: firstNameSafe,
        employeeId: existingUser.employee_id,
        temporaryPassword: password,
      });

      await this.logAdminActions(adminId, [
        {
          action: 'reset_user_credentials',
          targetTable: 'tblusers',
          targetId: userId,
          description: `Reset credentials and security questions for ${existingUser.email}`,
        },
      ]);

      return {
        success: true,
        data: {
          user_id: userId,
          email: existingUser.email,
          status: 'First_Time',
          is_first_login: true,
          credentials_email_sent: !!credentialsEmailResult?.success,
        },
      };
    } catch (error) {
      console.error('Error resetting user credentials:', error);
      return { success: false, error: error.message };
    }
  }

  static async resetUsersCredentials(userIds = [], basePassword, adminContext = {}) {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return { success: false, error: 'No user IDs provided' };
      }

      const scope = await this.resolveAdminScope(adminContext);

      if (!this.isValidBaselinePassword(basePassword)) {
        return {
          success: false,
          error: 'Baseline password must be 1-10 chars, include at least one symbol (@, -, _, .), and only use letters, numbers, @, -, _, .',
        };
      }

      const { data: targetAdmins, error: targetAdminsError } = await supabase
        .from('tbladminusers')
        .select('admin_id, admin_role')
        .in('admin_id', userIds);

      if (targetAdminsError) {
        return { success: false, error: targetAdminsError.message };
      }

      const companyAdminTargets = (targetAdmins || []).filter((admin) => this.isCompanyAdmin(admin.admin_role));
      const nonCompanyAdminTargets = (targetAdmins || []).filter((admin) => !this.isCompanyAdmin(admin.admin_role));

      if (nonCompanyAdminTargets.length > 0) {
        return {
          success: false,
          error: 'Only Company Admin accounts can be reset from this screen',
        };
      }

      if (companyAdminTargets.length > 0 && !scope.isSuperAdmin) {
        return {
          success: false,
          error: 'Only Super Admin can reset Company Admin credentials',
        };
      }

      const resetResults = [];
      for (const userId of userIds) {
        const result = await this.resetUserCredentials(userId, basePassword, adminContext);
        if (!result.success) {
          return {
            success: false,
            error: result.error || 'Failed to reset one or more users',
          };
        }

        resetResults.push(result.data);
      }

      return {
        success: true,
        data: {
          resetCount: resetResults.length,
          users: resetResults,
        },
      };
    } catch (error) {
      console.error('Error resetting users credentials:', error);
      return { success: false, error: error.message };
    }
  }
}
