import { Router } from 'express';
import { BudgetConfigController } from '../controllers/budgetConfigController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Require authentication for all budget configuration endpoints
router.use(authenticateToken);

/**
 * Budget Configuration Routes
 * Base path: /api/budget-configurations
 */

// ==================== Organizations Endpoints (MUST BE FIRST) ====================

// GET - Get all organizations
router.get('/organizations/list/all', BudgetConfigController.getOrganizations);

// GET - Get organizations by hierarchy level
router.get('/organizations/by-level/list', BudgetConfigController.getOrganizationsByLevel);

// ==================== Geo & Location Endpoints ====================

// GET - Get all geo entries
router.get('/geo/list/all', BudgetConfigController.getAllGeo);

// GET - Get locations (optional geo_id)
router.get('/locations/list/all', BudgetConfigController.getLocations);

// GET - Get organization geo/location mappings
router.get('/organization-geo-location/list/all', BudgetConfigController.getOrganizationGeoLocations);

// GET - Get organization geo/location mappings by org IDs
router.get('/organization-geo-location/by-org', BudgetConfigController.getOrganizationGeoLocationsByOrg);

// GET - Get clients by parent org IDs
router.get('/clients/by-org', BudgetConfigController.getClientsByParentOrg);

// ==================== Approvers Lookup Endpoints (MUST BE BEFORE :id) ====================

// GET - Get all approvers grouped by level
router.get('/approvers/list/all', BudgetConfigController.getAllApprovers);

// GET - Get approvers for a specific level
router.get('/approvers/level/:level', BudgetConfigController.getApproversByLevel);

// ==================== User Lookup Endpoints (MUST BE BEFORE :id) ====================

// GET - Get all users
router.get('/users/list/all', BudgetConfigController.getAllUsers);

// GET - Get user by ID
router.get('/users/get/:userId', BudgetConfigController.getUserById);

// ==================== Main Budget Configuration Endpoints ====================

// POST - Create a new budget configuration
router.post('/', BudgetConfigController.createBudgetConfig);

// GET - Get all budget configurations (with optional filters)
router.get('/', BudgetConfigController.getAllBudgetConfigs);

// GET - Get a single budget configuration by ID
router.get('/:id', BudgetConfigController.getBudgetConfigById);

// PUT - Update a budget configuration
router.put('/:id', BudgetConfigController.updateBudgetConfig);

// DELETE - Delete a budget configuration
router.delete('/:id', BudgetConfigController.deleteBudgetConfig);

// GET - Get configurations by user
router.get('/user/:userId', BudgetConfigController.getConfigsByUser);

// ==================== Tenure Groups Endpoints ====================

// GET - Get tenure groups for a budget
router.get('/:budgetId/tenure-groups', BudgetConfigController.getTenureGroups);

// POST - Add tenure groups to a budget
router.post('/:budgetId/tenure-groups', BudgetConfigController.addTenureGroups);

// DELETE - Remove a tenure group
router.delete('/tenure-groups/:tenureGroupId', BudgetConfigController.removeTenureGroup);

// ==================== Approvers Endpoints ====================

// GET - Get approvers for a budget
router.get('/:budgetId/approvers', BudgetConfigController.getApprovers);

// POST - Set an approver for a budget
router.post('/:budgetId/approvers', BudgetConfigController.setApprover);

// DELETE - Remove an approver
router.delete('/approvers/:approverId', BudgetConfigController.removeApprover);

// ==================== Access Scopes Endpoints ====================

// GET - Get access scopes for a budget
router.get('/:budgetId/access-scopes', BudgetConfigController.getAccessScopes);

// POST - Add an access scope to a budget
router.post('/:budgetId/access-scopes', BudgetConfigController.addAccessScope);

// DELETE - Remove an access scope
router.delete('/access-scopes/:scopeId', BudgetConfigController.removeAccessScope);

// ==================== History & Logs Endpoints ====================

// GET - Get budget history and tracking
router.get('/:id/history', BudgetConfigController.getBudgetHistory);

// GET - Get request logs and approval history
router.get('/:id/logs', BudgetConfigController.getRequestLogs);

// ==================== Approvers Endpoints ====================

// GET - Get approvers for a budget
router.get('/:budgetId/approvers', BudgetConfigController.getApprovers);

// POST - Set an approver for a budget
router.post('/:budgetId/approvers', BudgetConfigController.setApprover);

// DELETE - Remove an approver
router.delete('/approvers/:approverId', BudgetConfigController.removeApprover);

// ==================== Access Scopes Endpoints ====================

// GET - Get access scopes for a budget
router.get('/:budgetId/access-scopes', BudgetConfigController.getAccessScopes);

// POST - Add an access scope to a budget
router.post('/:budgetId/access-scopes', BudgetConfigController.addAccessScope);

// DELETE - Remove an access scope
router.delete('/access-scopes/:scopeId', BudgetConfigController.removeAccessScope);

export default router;
