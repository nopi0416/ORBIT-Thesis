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
}

export default BudgetConfigController;
