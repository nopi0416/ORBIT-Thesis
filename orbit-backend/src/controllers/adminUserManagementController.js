import { AdminUserManagementService } from '../services/adminUserManagementService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { validateAdminUserCreation } from '../utils/validators.js';

/**
 * Admin User Management Controller
 * Handles HTTP requests for user management operations
 */

export class AdminUserManagementController {
  /**
   * POST /api/admin/users
   * Create a new user (Admin only)
   */
  static async createAdminUser(req, res) {
    try {
      const userData = req.body;
      const adminUUID = req.user?.id; // From auth middleware

      console.log('=== Admin User Creation Request ===');
      console.log('Request Body:', JSON.stringify(userData, null, 2));
      console.log('Admin UUID:', adminUUID);
      console.log('====================================');

      // Validate input
      const validation = validateAdminUserCreation(userData);
      if (!validation.isValid) {
        return sendError(res, validation.errors, 400);
      }

      // Verify admin UUID is provided
      if (!adminUUID) {
        return sendError(res, { error: 'Admin authentication required' }, 401);
      }

      // Call service to create user
      const result = await AdminUserManagementService.createAdminUser(userData, adminUUID);

      if (!result.success) {
        return sendError(res, { error: result.error }, 400);
      }

      // Return success with generated password visible in response
      sendSuccess(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Error in createAdminUser:', error);
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
      const { status, search } = req.query;

      const filters = {
        ...(status && { status }),
        ...(search && { search }),
      };

      console.log('=== Fetching Admin Users ===');
      console.log('Filters:', filters);
      console.log('=============================');

      const result = await AdminUserManagementService.getAllAdminUsers(filters);

      if (!result.success) {
        return sendError(res, { error: result.error }, 400);
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
      console.log('=== Fetching All Roles ===');

      const result = await AdminUserManagementService.getAllRoles();

      if (!result.success) {
        return sendError(res, { error: result.error }, 400);
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
      console.log('=== Fetching All Organizations ===');

      const result = await AdminUserManagementService.getAllOrganizations();

      if (!result.success) {
        return sendError(res, { error: result.error }, 400);
      }

      sendSuccess(res, result.data, 'Organizations fetched successfully', 200);
    } catch (error) {
      console.error('Error in getAllOrganizations:', error);
      sendError(res, { error: error.message }, 500);
    }
  }
}
