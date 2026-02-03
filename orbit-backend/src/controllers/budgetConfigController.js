import { BudgetConfigService } from '../services/budgetConfigService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { validateBudgetConfig, validateScopeFields } from '../utils/validators.js';
import { broadcast } from '../realtime/websocketServer.js';

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
      
      console.log('=== FULL Budget Config Request Data ===');
      console.log(JSON.stringify(configData, null, 2));
      console.log('=== Individual Fields ===');
      console.log('Budget Name:', configData.budgetName);
      console.log('Countries:', configData.countries);
      console.log('Site Location:', configData.siteLocation);
      console.log('Affected OU Paths:', configData.affectedOUPaths);
      console.log('Accessible OU Paths:', configData.accessibleOUPaths);
      console.log('Clients:', configData.clients);
      console.log('Start Date:', configData.startDate);
      console.log('End Date:', configData.endDate);
      console.log('Selected Tenure Groups:', configData.selectedTenureGroups);
      console.log('Approver L1:', configData.approverL1);
      console.log('========================================');

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

      const toStorageValue = (value) => {
        if (Array.isArray(value)) return JSON.stringify(value);
        if (value === undefined || value === null || value === '') return null;
        return value;
      };

      const geoValue = toStorageValue(configData.geo || configData.countries);
      const locationValue = toStorageValue(configData.location || configData.siteLocation);
      const clientValue = toStorageValue(configData.client || configData.clients);
      const accessOuValue = toStorageValue(configData.access_ou || configData.accessibleOUPaths);
      const affectedOuValue = toStorageValue(configData.affected_ou || configData.affectedOUPaths);
      const tenureGroupValue = toStorageValue(configData.tenure_group || configData.selectedTenureGroups);

      const dbData = {
        budget_name: configData.budgetName,
        min_limit: configData.minLimit || null,
        max_limit: configData.maxLimit || null,
        budget_control: configData.budgetControlEnabled || false,
        budget_limit: configData.budgetLimit ?? configData.budgetControlLimit ?? null,
        currency: configData.currency || null,
        pay_cycle: configData.payCycle || configData.pay_cycle || null,
        start_date: configData.startDate || null,
        end_date: configData.endDate || null,
        budget_description: configData.description || configData.budget_description || null,
        created_by: configData.createdBy || '00000000-0000-0000-0000-000000000000',

        geo: geoValue,
        location: locationValue,
        client: clientValue,
        access_ou: accessOuValue,
        affected_ou: affectedOuValue,
        tenure_group: tenureGroupValue,

        // Related data for approvers table
        approvers: configData.approvers || BudgetConfigService.buildApproversFromConfig(configData),
      };

      // Create budget configuration
      const result = await BudgetConfigService.createBudgetConfig(dbData);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      broadcast('budget_config_updated', {
        action: 'created',
        budget_id: result.data?.budget_id || result.data?.id,
      });

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
        geo: req.query.geo,
        location: req.query.location,
        client: req.query.client,
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

      broadcast('budget_config_updated', {
        action: 'updated',
        budget_id: result.data?.budget_id || id,
      });

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

      broadcast('budget_config_updated', {
        action: 'deleted',
        budget_id: id,
      });

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

  /**
   * GET /api/budget-configurations/:id/history
   * Get budget history and tracking for a configuration
   */
  static async getBudgetHistory(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return sendError(res, 'Budget ID is required', 400);
      }

      const result = await BudgetConfigService.getBudgetTrackingByBudgetId(id);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Budget history retrieved successfully');
    } catch (error) {
      console.error('Error in getBudgetHistory:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/budget-configurations/:id/logs
   * Get request logs and approval history for a configuration
   */
  static async getRequestLogs(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return sendError(res, 'Budget ID is required', 400);
      }

      const result = await BudgetConfigService.getRequestLogsByBudgetId(id);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Request logs retrieved successfully');
    } catch (error) {
      console.error('Error in getRequestLogs:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/organizations
   * Get all organizations
   */
  static async getOrganizations(req, res) {
    try {
      const result = await BudgetConfigService.getAllOrganizations();

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Organizations retrieved successfully');
    } catch (error) {
      console.error('Error in getOrganizations:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/organizations/by-level
   * Get organizations grouped by hierarchy level
   */
  static async getOrganizationsByLevel(req, res) {
    try {
      const result = await BudgetConfigService.getOrganizationsByLevel();

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Organizations by level retrieved successfully');
    } catch (error) {
      console.error('Error in getOrganizationsByLevel:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/geo
   * Get all geo entries
   */
  static async getAllGeo(req, res) {
    try {
      const result = await BudgetConfigService.getAllGeo();

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Geo list retrieved successfully');
    } catch (error) {
      console.error('Error in getAllGeo:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/locations
   * Get locations (optional geo_id filter)
   */
  static async getLocations(req, res) {
    try {
      const { geo_id } = req.query;
      const result = await BudgetConfigService.getLocations(geo_id || null);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Locations retrieved successfully');
    } catch (error) {
      console.error('Error in getLocations:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/organization-geo-location
   * Get org-geo-location mappings
   */
  static async getOrganizationGeoLocations(req, res) {
    try {
      const result = await BudgetConfigService.getOrganizationGeoLocations();

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Organization geo/location mapping retrieved successfully');
    } catch (error) {
      console.error('Error in getOrganizationGeoLocations:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/organization-geo-location/by-org
   * Get org-geo-location mappings filtered by org IDs
   */
  static async getOrganizationGeoLocationsByOrg(req, res) {
    try {
      const { org_id } = req.query;
      const orgIds = typeof org_id === 'string'
        ? org_id.split(',').map((id) => id.trim()).filter(Boolean)
        : [];

      const result = await BudgetConfigService.getOrganizationGeoLocationsByOrgIds(orgIds);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Organization geo/location mapping retrieved successfully');
    } catch (error) {
      console.error('Error in getOrganizationGeoLocationsByOrg:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/clients/by-org
   * Get clients filtered by parent org IDs
   */
  static async getClientsByParentOrg(req, res) {
    try {
      const { org_id } = req.query;
      const orgIds = typeof org_id === 'string'
        ? org_id.split(',').map((id) => id.trim()).filter(Boolean)
        : [];

      const result = await BudgetConfigService.getClientsByParentOrgIds(orgIds);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Clients retrieved successfully');
    } catch (error) {
      console.error('Error in getClientsByParentOrg:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/approvers
   * Get all approvers grouped by level
   */
  static async getAllApprovers(req, res) {
    try {
      const result = await BudgetConfigService.getAllApprovers();

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Approvers retrieved successfully');
    } catch (error) {
      console.error('Error in getAllApprovers:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/approvers/:level
   * Get approvers for a specific level (L1, L2, L3)
   */
  static async getApproversByLevel(req, res) {
    try {
      const { level } = req.params;

      if (!level) {
        return sendError(res, 'Approval level is required', 400);
      }

      const result = await BudgetConfigService.getApproversByLevel(level);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, `${level} approvers retrieved successfully`);
    } catch (error) {
      console.error('Error in getApproversByLevel:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/users/:userId
   * Get user details with their roles
   */
  static async getUserById(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return sendError(res, 'User ID is required', 400);
      }

      const result = await BudgetConfigService.getUserById(userId);

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'User retrieved successfully');
    } catch (error) {
      console.error('Error in getUserById:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /api/users
   * Get all users with their roles
   */
  static async getAllUsers(req, res) {
    try {
      const result = await BudgetConfigService.getAllUsers();

      if (!result.success) {
        return sendError(res, result.error, 400);
      }

      sendSuccess(res, result.data, 'Users retrieved successfully');
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      sendError(res, error.message, 500);
    }
  }
}

export default BudgetConfigController;
