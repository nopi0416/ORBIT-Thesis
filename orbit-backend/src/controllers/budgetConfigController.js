import { BudgetConfigService } from '../services/budgetConfigService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { validateBudgetConfig, validateScopeFields } from '../utils/validators.js';

/**
 * Budget Configuration Controller
 * Handles HTTP requests for budget configurations
 */

export class BudgetConfigController {
  /**
   * POST /api/budget-configurations
   * Create a new budget configuration
   */
  static async createBudgetConfig(req, res) {
    try {
      const configData = req.body;

      // Validate required fields
      const validation = validateBudgetConfig(configData);
      if (!validation.isValid) {
        return sendError(res, validation.errors, 400);
      }

      // Validate scope fields
      const scopeValidation = validateScopeFields(configData);
      if (!scopeValidation.isValid) {
        return sendError(res, scopeValidation.errors, 400);
      }

      // Create budget configuration
      const result = await BudgetConfigService.createBudgetConfig(configData);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Error in createBudgetConfig:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/budget-configurations
   * Get all budget configurations with optional filters
   */
  static async getAllBudgetConfigs(req, res) {
    try {
      const filters = {
        budget_name: req.query.name,
        period_type: req.query.period,
        geo_scope: req.query.geo,
        department_scope: req.query.department,
      };

      const result = await BudgetConfigService.getAllBudgetConfigs(filters);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Budget configurations retrieved successfully');
    } catch (error) {
      console.error('Error in getAllBudgetConfigs:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/budget-configurations/:id
   * Get a single budget configuration by ID
   */
  static async getBudgetConfigById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return sendError(res, 'Budget ID is required', 400);
      }

      const result = await BudgetConfigService.getBudgetConfigById(id);

      if (!result.success) {
        return sendError(res, result.error || 'Budget configuration not found', 404);
      }

      sendSuccess(res, result.data, 'Budget configuration retrieved successfully');
    } catch (error) {
      console.error('Error in getBudgetConfigById:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * PUT /api/budget-configurations/:id
   * Update a budget configuration
   */
  static async updateBudgetConfig(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return sendError(res, 'Budget ID is required', 400);
      }

      const result = await BudgetConfigService.updateBudgetConfig(id, updateData);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, result.message);
    } catch (error) {
      console.error('Error in updateBudgetConfig:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * DELETE /api/budget-configurations/:id
   * Delete a budget configuration
   */
  static async deleteBudgetConfig(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return sendError(res, 'Budget ID is required', 400);
      }

      const result = await BudgetConfigService.deleteBudgetConfig(id);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, {}, result.message);
    } catch (error) {
      console.error('Error in deleteBudgetConfig:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/budget-configurations/user/:userId
   * Get configurations created by a specific user
   */
  static async getConfigsByUser(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return sendError(res, 'User ID is required', 400);
      }

      const result = await BudgetConfigService.getConfigsByUser(userId);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'User budget configurations retrieved successfully');
    } catch (error) {
      console.error('Error in getConfigsByUser:', error);
      sendError(res, error.message, 500);
    }
  }

  // ==================== Tenure Groups Endpoints ====================

  /**
   * GET /api/budget-configurations/:budgetId/tenure-groups
   * Get tenure groups for a budget configuration
   */
  static async getTenureGroups(req, res) {
    try {
      const { budgetId } = req.params;

      if (!budgetId) {
        return sendError(res, 'Budget ID is required', 400);
      }

      const result = await BudgetConfigService.getTenureGroupsByBudgetId(budgetId);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Tenure groups retrieved successfully');
    } catch (error) {
      console.error('Error in getTenureGroups:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * POST /api/budget-configurations/:budgetId/tenure-groups
   * Add tenure groups to a budget configuration
   */
  static async addTenureGroups(req, res) {
    try {
      const { budgetId } = req.params;
      const { tenure_groups } = req.body;

      if (!budgetId) {
        return sendError(res, 'Budget ID is required', 400);
      }

      if (!Array.isArray(tenure_groups) || tenure_groups.length === 0) {
        return sendError(res, 'Tenure groups array is required', 400);
      }

      const result = await BudgetConfigService.addTenureGroups(budgetId, tenure_groups);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Error in addTenureGroups:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * DELETE /api/budget-configurations/tenure-groups/:tenureGroupId
   * Remove a tenure group
   */
  static async removeTenureGroup(req, res) {
    try {
      const { tenureGroupId } = req.params;

      if (!tenureGroupId) {
        return sendError(res, 'Tenure group ID is required', 400);
      }

      const result = await BudgetConfigService.removeTenureGroup(tenureGroupId);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, {}, result.message);
    } catch (error) {
      console.error('Error in removeTenureGroup:', error);
      sendError(res, error.message, 500);
    }
  }

  // ==================== Approvers Endpoints ====================

  /**
   * GET /api/budget-configurations/:budgetId/approvers
   * Get approvers for a budget configuration
   */
  static async getApprovers(req, res) {
    try {
      const { budgetId } = req.params;

      if (!budgetId) {
        return sendError(res, 'Budget ID is required', 400);
      }

      const result = await BudgetConfigService.getApproversByBudgetId(budgetId);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Approvers retrieved successfully');
    } catch (error) {
      console.error('Error in getApprovers:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * POST /api/budget-configurations/:budgetId/approvers
   * Set an approver for a specific approval level
   */
  static async setApprover(req, res) {
    try {
      const { budgetId } = req.params;
      const { approval_level, primary_approver, backup_approver } = req.body;
      const { userId } = req.user || {}; // Assumes auth middleware sets req.user

      if (!budgetId) {
        return sendError(res, 'Budget ID is required', 400);
      }

      if (!approval_level || !primary_approver) {
        return sendError(res, 'Approval level and primary approver are required', 400);
      }

      if (approval_level < 1 || approval_level > 3) {
        return sendError(res, 'Approval level must be between 1 and 3', 400);
      }

      const result = await BudgetConfigService.setApprover(
        budgetId,
        approval_level,
        primary_approver,
        backup_approver,
        userId
      );

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Error in setApprover:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * DELETE /api/budget-configurations/approvers/:approverId
   * Remove an approver
   */
  static async removeApprover(req, res) {
    try {
      const { approverId } = req.params;

      if (!approverId) {
        return sendError(res, 'Approver ID is required', 400);
      }

      const result = await BudgetConfigService.removeApprover(approverId);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, {}, result.message);
    } catch (error) {
      console.error('Error in removeApprover:', error);
      sendError(res, error.message, 500);
    }
  }

  // ==================== Access Scopes Endpoints ====================

  /**
   * GET /api/budget-configurations/:budgetId/access-scopes
   * Get access scopes for a budget configuration
   */
  static async getAccessScopes(req, res) {
    try {
      const { budgetId } = req.params;

      if (!budgetId) {
        return sendError(res, 'Budget ID is required', 400);
      }

      const result = await BudgetConfigService.getAccessScopesByBudgetId(budgetId);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Access scopes retrieved successfully');
    } catch (error) {
      console.error('Error in getAccessScopes:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * POST /api/budget-configurations/:budgetId/access-scopes
   * Add an access scope
   */
  static async addAccessScope(req, res) {
    try {
      const { budgetId } = req.params;
      const { scope_type, scope_value } = req.body;
      const { userId } = req.user || {}; // Assumes auth middleware sets req.user

      if (!budgetId) {
        return sendError(res, 'Budget ID is required', 400);
      }

      if (!scope_type || !scope_value) {
        return sendError(res, 'Scope type and scope value are required', 400);
      }

      const result = await BudgetConfigService.addAccessScope(budgetId, scope_type, scope_value, userId);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Error in addAccessScope:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * DELETE /api/budget-configurations/access-scopes/:scopeId
   * Remove an access scope
   */
  static async removeAccessScope(req, res) {
    try {
      const { scopeId } = req.params;

      if (!scopeId) {
        return sendError(res, 'Scope ID is required', 400);
      }

      const result = await BudgetConfigService.removeAccessScope(scopeId);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, {}, result.message);
    } catch (error) {
      console.error('Error in removeAccessScope:', error);
      sendError(res, error.message, 500);
    }
  }
}

export default BudgetConfigController;
