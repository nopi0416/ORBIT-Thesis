import express from 'express';
import { AdminUserManagementController } from '../controllers/adminUserManagementController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Admin User Management Routes
 * All routes require authentication
 */

/**
 * POST /api/admin/users
 * Create a new user
 * Body: { firstName, lastName, email, employeeId, roleId, organizationId, department }
 */
router.post('/users', authenticateToken, AdminUserManagementController.createAdminUser);

/**
 * POST /api/admin/admin-users
 * Create a new admin user
 * Body: { fullName, email, adminRole, orgId }
 */
router.post('/admin-users', authenticateToken, AdminUserManagementController.createAdminAccount);

/**
 * GET /api/admin/users
 * Get all users with optional filters
 * Query: ?status=Active&search=query
 */
router.get('/users', authenticateToken, AdminUserManagementController.getAllAdminUsers);

/**
 * GET /api/admin/roles
 * Get all available roles
 */
router.get('/roles', authenticateToken, AdminUserManagementController.getAllRoles);

/**
 * GET /api/admin/organizations
 * Get all available organizations
 */
router.get('/organizations', authenticateToken, AdminUserManagementController.getAllOrganizations);

/**
 * GET /api/admin/geos
 * Get all available geos
 */
router.get('/geos', authenticateToken, AdminUserManagementController.getAllGeos);

export default router;
