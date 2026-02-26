import { AdminUserManagementService } from '../services/adminUserManagementService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { validateAdminUserCreation } from '../utils/validators.js';

/**
 * Admin User Management Controller
 * Handles HTTP requests for user management operations
 */

export class AdminUserManagementController {
  static ensureAdmin(req, res) {
    if (req.user?.userType !== 'admin') {
      sendError(res, { error: 'Admin access required' }, 403);
      return false;
    }

    return true;
  }

  /**
   * POST /api/admin/users
   * Create a new user (Admin only)
   */
  static async createAdminUser(req, res) {
    try {
      if (!AdminUserManagementController.ensureAdmin(req, res)) return;

      const userData = req.body;
      const adminContext = req.user;

      console.log('=== Admin User Creation Request ===');
      console.log('Request Body:', JSON.stringify(userData, null, 2));
      console.log('Admin Context:', JSON.stringify(adminContext, null, 2));
      console.log('====================================');

      // Validate input
      const validation = validateAdminUserCreation(userData);
      if (!validation.isValid) {
        return sendError(res, validation.errors, 400);
      }

      // Verify admin UUID is provided
      if (!adminContext?.id) {
        return sendError(res, { error: 'Admin authentication required' }, 401);
      }

      // Call service to create user
      const result = await AdminUserManagementService.createAdminUser(userData, adminContext);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      // Return success with generated password visible in response
      sendSuccess(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Error in createAdminUser:', error);
      sendError(res, { error: error.message }, 500);
    }
  }

  /**
   * POST /api/admin/users/bulk
   * Bulk create users/admins from validated rows
   */
  static async createUsersBulk(req, res) {
    try {
      if (!AdminUserManagementController.ensureAdmin(req, res)) return;

      const { users } = req.body || {};
      const result = await AdminUserManagementService.createUsersBulk(users, req.user);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Bulk user creation completed', 200);
    } catch (error) {
      console.error('Error in createUsersBulk:', error);
      sendError(res, { error: error.message }, 500);
    }
  }

  /**
   * POST /api/admin/admin-users
   * Create a new admin user (Super Admin or Company Admin)
   */
  static async createAdminAccount(req, res) {
    try {
      if (!AdminUserManagementController.ensureAdmin(req, res)) return;

      const adminData = req.body;
      const adminContext = req.user;

      console.log('=== Admin Account Creation Request ===');
      console.log('Request Body:', JSON.stringify(adminData, null, 2));
      console.log('Admin Context:', JSON.stringify(adminContext, null, 2));
      console.log('======================================');

      const result = await AdminUserManagementService.createAdminAccount(adminData, adminContext);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Error in createAdminAccount:', error);
      sendError(res, { error: error.message }, 500);
    }
  }

  /**
   * GET /api/admin/users
   * Get all users with optional filters
   * Query params: ?status=Active&search=john&sort=created_at
   */
  static async getAllAdminUsers(req, res) {
    try {
      if (!AdminUserManagementController.ensureAdmin(req, res)) return;

      const { status, search } = req.query;
      const adminContext = req.user;

      const filters = {
        ...(status && { status }),
        ...(search && { search }),
      };

      console.log('=== Fetching Admin Users ===');
      console.log('Filters:', filters);
      console.log('=============================');

      const result = await AdminUserManagementService.getAllAdminUsers(filters, adminContext);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Users fetched successfully', 200);
    } catch (error) {
      console.error('Error in getAllAdminUsers:', error);
      sendError(res, { error: error.message }, 500);
    }
  }

  /**
   * GET /api/admin/roles
   * Get all available roles
   */
  static async getAllRoles(req, res) {
    try {
      if (!AdminUserManagementController.ensureAdmin(req, res)) return;
      console.log('=== Fetching All Roles ===');

      const result = await AdminUserManagementService.getAllRoles();

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Roles fetched successfully', 200);
    } catch (error) {
      console.error('Error in getAllRoles:', error);
      sendError(res, { error: error.message }, 500);
    }
  }

  /**
   * GET /api/admin/organizations
   * Get all available organizations
   */
  static async getAllOrganizations(req, res) {
    try {
      if (!AdminUserManagementController.ensureAdmin(req, res)) return;
      console.log('=== Fetching All Organizations ===');

      const result = await AdminUserManagementService.getAllOrganizations();

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Organizations fetched successfully', 200);
    } catch (error) {
      console.error('Error in getAllOrganizations:', error);
      sendError(res, { error: error.message }, 500);
    }
  }

  /**
   * GET /api/admin/geos
   * Get all available geos
   */
  static async getAllGeos(req, res) {
    try {
      if (!AdminUserManagementController.ensureAdmin(req, res)) return;
      console.log('=== Fetching All Geos ===');

      const result = await AdminUserManagementService.getAllGeos();

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Geos fetched successfully', 200);
    } catch (error) {
      console.error('Error in getAllGeos:', error);
      sendError(res, { error: error.message }, 500);
    }
  }

  /**
   * PATCH /api/admin/users/status
   * Update user status (lock/unlock/deactivate/reactivate)
   */
  static async updateUserStatus(req, res) {
    try {
      if (!AdminUserManagementController.ensureAdmin(req, res)) return;

      const { userIds, action } = req.body || {};
      const adminContext = req.user;

      const result = await AdminUserManagementService.updateUserStatus(userIds, action, adminContext);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'User status updated successfully', 200);
    } catch (error) {
      console.error('Error in updateUserStatus:', error);
      sendError(res, { error: error.message }, 500);
    }
  }

  /**
   * PATCH /api/admin/users/:id
   * Update a user
   */
  static async updateUser(req, res) {
    try {
      if (!AdminUserManagementController.ensureAdmin(req, res)) return;

      const userId = req.params.id;
      const payload = req.body || {};

      const result = await AdminUserManagementService.updateUser(userId, payload, req.user);

      if (!result.success) {
        return sendError(res, { error: result.error }, 400);
      }

      sendSuccess(res, result.data, 'User updated successfully', 200);
    } catch (error) {
      console.error('Error in updateUser:', error);
      sendError(res, { error: error.message }, 500);
    }
  }

  /**
   * PATCH /api/admin/users/:id/reset-credentials
   * Reset a user's password and security questions
   */
  static async resetUserCredentials(req, res) {
    try {
      if (!AdminUserManagementController.ensureAdmin(req, res)) return;

      const userId = req.params.id;
      const { basePassword } = req.body || {};
      const result = await AdminUserManagementService.resetUserCredentials(userId, basePassword, req.user);

      if (!result.success) {
        return sendError(res, { error: result.error }, 400);
      }

      sendSuccess(res, result.data, 'User credentials reset successfully', 200);
    } catch (error) {
      console.error('Error in resetUserCredentials:', error);
      sendError(res, { error: error.message }, 500);
    }
  }

  /**
   * PATCH /api/admin/users/reset-credentials
   * Reset credentials for multiple users
   */
  static async resetUsersCredentials(req, res) {
    try {
      if (!AdminUserManagementController.ensureAdmin(req, res)) return;

      const { userIds, basePassword } = req.body || {};
      const result = await AdminUserManagementService.resetUsersCredentials(userIds, basePassword, req.user);

      if (!result.success) {
        return sendError(res, { error: result.error }, 400);
      }

      sendSuccess(res, result.data, 'Users credentials reset successfully', 200);
    } catch (error) {
      console.error('Error in resetUsersCredentials:', error);
      sendError(res, { error: error.message }, 500);
    }
  }

  /**
   * GET /api/admin/logs
   * Get admin logs
   */
  static async getAdminLogs(req, res) {
    try {
      if (!AdminUserManagementController.ensureAdmin(req, res)) return;

      const result = await AdminUserManagementService.getAdminLogs(req.user);

      if (!result.success) {
        return sendError(res, { error: result.error }, 400);
      }

      sendSuccess(res, result.data, 'Admin logs fetched successfully', 200);
    } catch (error) {
      console.error('Error in getAdminLogs:', error);
      sendError(res, { error: error.message }, 500);
    }
  }

  /**
   * GET /api/admin/logs/login
   * Get login audit logs
   */
  static async getLoginLogs(req, res) {
    try {
      if (!AdminUserManagementController.ensureAdmin(req, res)) return;

      const result = await AdminUserManagementService.getLoginLogs(req.user);

      if (!result.success) {
        return sendError(res, { error: result.error }, 400);
      }

      sendSuccess(res, result.data, 'Login logs fetched successfully', 200);
    } catch (error) {
      console.error('Error in getLoginLogs:', error);
      sendError(res, { error: error.message }, 500);
    }
  }
}
