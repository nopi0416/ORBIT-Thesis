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
 * POST /api/admin/users/bulk
 * Bulk create users/admins
 * Body: { users: [{ rowNumber, accountType, name, email, employeeId, roleId, geoId, orgId, departmentId, adminRole }] }
 */
router.post('/users/bulk', authenticateToken, AdminUserManagementController.createUsersBulk);

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
 * PATCH /api/admin/users/reset-credentials
 * Reset password + security questions for multiple users
 */
router.patch('/users/reset-credentials', authenticateToken, AdminUserManagementController.resetUsersCredentials);

/**
 * PATCH /api/admin/users/status
 * Update user status (lock/unlock/deactivate/reactivate)
 * Body: { userIds: [], action: "lock" | "unlock" | "deactivate" | "reactivate" }
 */
router.patch('/users/status', authenticateToken, AdminUserManagementController.updateUserStatus);

/**
 * PATCH /api/admin/users/:id/reset-credentials
 * Reset password + security questions and force first-time login
 */
router.patch('/users/:id/reset-credentials', authenticateToken, AdminUserManagementController.resetUserCredentials);

/**
 * PATCH /api/admin/users/:id
 * Update a user
 */
router.patch('/users/:id', authenticateToken, AdminUserManagementController.updateUser);

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

/**
 * GET /api/admin/logs
 * Get admin logs
 */
router.get('/logs', authenticateToken, AdminUserManagementController.getAdminLogs);
router.get('/logs/login', authenticateToken, AdminUserManagementController.getLoginLogs);

export default router;
