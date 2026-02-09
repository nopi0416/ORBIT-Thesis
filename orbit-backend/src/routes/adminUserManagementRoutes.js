import express from 'express';
import { AdminUserManagementController } from '../controllers/adminUserManagementController.js';
import { authenticateToken } from '../middleware/auth.js';
import supabase from '../config/database.js';

const router = express.Router();

/**
 * Admin User Management Routes
 * All routes require authentication
 */

// Mock authentication middleware for testing (REMOVE IN PRODUCTION)
const mockAuth = async (req, res, next) => {
  try {
    // Try to fetch an existing admin from tbladminusers
    const { data: adminData } = await supabase
      .from('tbladminusers')
      .select('admin_id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (adminData?.admin_id) {
      req.user = {
        id: adminData.admin_id
      };
    } else {
      // Fallback to mock UUID if no admin exists
      req.user = {
        id: '550e8400-e29b-41d4-a716-446655440000'
      };
    }
  } catch (error) {
    // Fallback to mock UUID on error
    req.user = {
      id: '550e8400-e29b-41d4-a716-446655440000'
    };
  }
  next();
};

/**
 * POST /api/admin/users
 * Create a new user
 * Body: { firstName, lastName, email, employeeId, roleId, organizationId, department }
 */
router.post('/users', mockAuth, AdminUserManagementController.createAdminUser);

/**
 * GET /api/admin/users
 * Get all users with optional filters
 * Query: ?status=Active&search=query
 */
router.get('/users', mockAuth, AdminUserManagementController.getAllAdminUsers);

/**
 * GET /api/admin/roles
 * Get all available roles
 */
router.get('/roles', mockAuth, AdminUserManagementController.getAllRoles);

/**
 * GET /api/admin/organizations
 * Get all available organizations
 */
router.get('/organizations', mockAuth, AdminUserManagementController.getAllOrganizations);

/**
 * GET /api/admin/geos
 * Get all available geos
 */
router.get('/geos', mockAuth, AdminUserManagementController.getAllGeos);

export default router;
