import supabase from '../config/database.js';
import { getUserUUID, isValidUser, getUserNameFromUUID, getUserDetailsFromUUID } from '../utils/userMapping.js';

/**
 * Budget Configuration Service
 * Handles all database operations for budget configurations
 * Supports normalized schema with tenure groups, approvers, and access scopes
 */

export class BudgetConfigService {
  /**
   * Create a new budget configuration with tenure groups, approvers, and access scopes
   */
  static async createBudgetConfig(configData) {
    try {
      const {
        budget_name,
        min_limit,
        max_limit,
        budget_control,
        carryover_enabled,
        client_sponsored,
        period_type,
        created_by,
        tenure_groups,
        approvers,
        access_scopes,
      } = configData;

      // Step 1: Create main budget configuration (without geo/location/department scopes)
      const { data: budgetData, error: budgetError } = await supabase
        .from('tblbudgetconfiguration')
        .insert([
          {
            budget_name,
            min_limit: min_limit ? parseFloat(min_limit) : null,
            max_limit: max_limit ? parseFloat(max_limit) : null,
            budget_control: budget_control || false,
            carryover_enabled: carryover_enabled || false,
            client_sponsored: client_sponsored || false,
            period_type,
            created_by,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (budgetError) throw budgetError;

      const budget_id = budgetData[0].budget_id;
      
      console.log('=== Budget Created ===');
      console.log('Budget ID:', budget_id);
      console.log('Tenure Groups to Insert:', tenure_groups);
      console.log('Approvers to Insert:', approvers);
      console.log('Access Scopes to Insert:', access_scopes);
      console.log('=======================');

      // Step 2: Insert tenure groups if provided
      if (tenure_groups && Array.isArray(tenure_groups) && tenure_groups.length > 0) {
        const tenureRecords = tenure_groups.map((group) => ({
          budget_id,
          tenure_group: group,
          created_at: new Date().toISOString(),
        }));

        console.log('Inserting tenure records:', tenureRecords);
        const { error: tenureError } = await supabase
          .from('tblbudgetconfig_tenure_groups')
          .insert(tenureRecords);

        if (tenureError) {
          console.error('Tenure Insert Error:', tenureError);
          throw tenureError;
        }
        console.log('Tenure groups inserted successfully');
      } else {
        console.log('No tenure groups to insert');
      }

      // Step 3: Insert approvers if provided
      if (approvers && Array.isArray(approvers) && approvers.length > 0) {
        const approverRecords = approvers.map((approver) => ({
          budget_id,
          approval_level: approver.approval_level,
          primary_approver: approver.primary_approver,
          backup_approver: approver.backup_approver || null,
          created_by,
          created_at: new Date().toISOString(),
        }));

        console.log('Inserting approver records:', approverRecords);
        const { error: approverError } = await supabase
          .from('tblbudgetconfig_approvers')
          .insert(approverRecords);

        if (approverError) {
          console.error('Approver Insert Error:', approverError);
          throw approverError;
        }
        console.log('Approvers inserted successfully');
      } else {
        console.log('No approvers to insert');
      }

      // Step 4: Insert access scopes (renamed to scopes table with 5 scope types)
      if (access_scopes && Array.isArray(access_scopes) && access_scopes.length > 0) {
        const scopeRecords = access_scopes.map((scope) => ({
          budget_id,
          scope_type: scope.scope_type,
          scope_value: scope.scope_value,
          created_by,
          created_at: new Date().toISOString(),
        }));

        console.log('Inserting scope records (5 types: Access_OU, Geo, Location, Client, Affected_OU):', scopeRecords);
        const { error: scopeError } = await supabase
          .from('tblbudgetconfig_scopes')
          .insert(scopeRecords);

        if (scopeError) {
          console.error('Scope Insert Error:', scopeError);
          throw scopeError;
        }
        console.log('Scopes inserted successfully');
      } else {
        console.log('No scopes to insert');
      }

      // Step 5: Create initial budget tracking record for current period
      const now = new Date();
      const currentPeriod = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { error: trackingError } = await supabase
        .from('tblbudgetconfig_budget_tracking')
        .insert([
          {
            budget_id,
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
            period_label: currentPeriod,
            total_budget: max_limit || 0,
            budget_used: 0,
            budget_carryover: 0,
            approval_count_total: 0,
            approval_count_approved: 0,
            approval_count_rejected: 0,
            approval_count_pending: 0,
          },
        ]);

      if (trackingError) {
        console.error('Budget Tracking Insert Error:', trackingError);
        throw trackingError;
      }
      console.log('Budget tracking record created successfully');

      // Return complete configuration with related data
      const completeConfig = await this.getBudgetConfigById(budget_id);

      return {
        success: true,
        data: completeConfig.data,
        message: 'Budget configuration created successfully',
      };
    } catch (error) {
      console.error('Error creating budget config:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all budget configurations with optional filters
   */
  static async getAllBudgetConfigs(filters = {}) {
    try {
      let query = supabase.from('tblbudgetconfiguration').select('*');

      // Apply filters if provided
      if (filters.budget_name) {
        query = query.ilike('budget_name', `%${filters.budget_name}%`);
      }

      if (filters.period_type) {
        query = query.eq('period_type', filters.period_type);
      }

      if (filters.geo_scope) {
        query = query.eq('geo_scope', filters.geo_scope);
      }

      if (filters.department_scope) {
        query = query.eq('department_scope', filters.department_scope);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data for each config
      const configsWithRelations = await Promise.all(
        data.map(async (config) => {
          const [tenureGroups, approvers, accessScopes, budgetTracking] = await Promise.all([
            this.getTenureGroupsByBudgetId(config.budget_id),
            this.getApproversByBudgetId(config.budget_id),
            this.getAccessScopesByBudgetId(config.budget_id),
            this.getBudgetTrackingByBudgetId(config.budget_id),
          ]);

          return {
            ...config,
            tenure_groups: tenureGroups.data || [],
            approvers: approvers.data || [],
            access_scopes: accessScopes.data || [],
            budget_tracking: budgetTracking.data || [],
          };
        })
      );

      return {
        success: true,
        data: configsWithRelations,
      };
    } catch (error) {
      console.error('Error fetching budget configs:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get a single budget configuration by ID with all related data
   */
  static async getBudgetConfigById(budgetId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetconfiguration')
        .select('*')
        .eq('budget_id', budgetId)
        .single();

      if (error) throw error;

      // Fetch related data
      const [tenureGroups, approvers, accessScopes] = await Promise.all([
        this.getTenureGroupsByBudgetId(budgetId),
        this.getApproversByBudgetId(budgetId),
        this.getAccessScopesByBudgetId(budgetId),
      ]);

      return {
        success: true,
        data: {
          ...data,
          tenure_groups: tenureGroups.data || [],
          approvers: approvers.data || [],
          access_scopes: accessScopes.data || [],
        },
      };
    } catch (error) {
      console.error('Error fetching budget config:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update a budget configuration
   */
  static async updateBudgetConfig(budgetId, updateData) {
    try {
      const {
        budget_name,
        min_limit,
        max_limit,
        budget_control,
        carryover_enabled,
        client_sponsored,
        period_type,
        geo_scope,
        location_scope,
        department_scope,
        updated_by,
        tenure_groups,
        approvers,
        access_scopes,
      } = updateData;

      // Update main budget configuration
      const { data, error } = await supabase
        .from('tblbudgetconfiguration')
        .update({
          ...(budget_name && { budget_name }),
          ...(min_limit !== undefined && { min_limit: min_limit ? parseFloat(min_limit) : null }),
          ...(max_limit !== undefined && { max_limit: max_limit ? parseFloat(max_limit) : null }),
          ...(budget_control !== undefined && { budget_control }),
          ...(carryover_enabled !== undefined && { carryover_enabled }),
          ...(client_sponsored !== undefined && { client_sponsored }),
          ...(period_type && { period_type }),
          ...(geo_scope && { geo_scope }),
          ...(location_scope && { location_scope }),
          ...(department_scope && { department_scope }),
          updated_by,
          updated_at: new Date().toISOString(),
        })
        .eq('budget_id', budgetId)
        .select();

      if (error) throw error;

      // Note: To update tenure_groups, approvers, or access_scopes,
      // use the specific methods (addTenureGroups, setApprover, addAccessScope, etc.)
      // This keeps the update logic clean and prevents accidental data loss

      // Return complete configuration with related data
      const completeConfig = await this.getBudgetConfigById(budgetId);

      return {
        success: true,
        data: completeConfig.data,
        message: 'Budget configuration updated successfully',
      };
    } catch (error) {
      console.error('Error updating budget config:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a budget configuration (cascade deletes related records)
   */
  static async deleteBudgetConfig(budgetId) {
    try {
      const { error } = await supabase
        .from('tblbudgetconfiguration')
        .delete()
        .eq('budget_id', budgetId);

      if (error) throw error;

      return {
        success: true,
        message: 'Budget configuration deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting budget config:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get configurations by user (created by)
   */
  static async getConfigsByUser(userId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetconfiguration')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data for each config
      const configsWithRelations = await Promise.all(
        data.map(async (config) => {
          const [tenureGroups, approvers, accessScopes] = await Promise.all([
            this.getTenureGroupsByBudgetId(config.budget_id),
            this.getApproversByBudgetId(config.budget_id),
            this.getAccessScopesByBudgetId(config.budget_id),
          ]);

          return {
            ...config,
            tenure_groups: tenureGroups.data || [],
            approvers: approvers.data || [],
            access_scopes: accessScopes.data || [],
          };
        })
      );

      return {
        success: true,
        data: configsWithRelations,
      };
    } catch (error) {
      console.error('Error fetching user configs:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==================== Tenure Groups Methods ====================

  /**
   * Get tenure groups for a budget configuration
   */
  static async getTenureGroupsByBudgetId(budgetId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetconfig_tenure_groups')
        .select('*')
        .eq('budget_id', budgetId);

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching tenure groups:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Add tenure groups to a budget configuration
   */
  static async addTenureGroups(budgetId, tenureGroups) {
    try {
      const records = tenureGroups.map((group) => ({
        budget_id: budgetId,
        tenure_group: group,
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('tblbudgetconfig_tenure_groups')
        .insert(records)
        .select();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Tenure groups added successfully',
      };
    } catch (error) {
      console.error('Error adding tenure groups:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Remove tenure group from a budget configuration
   */
  static async removeTenureGroup(configTenureId) {
    try {
      const { error } = await supabase
        .from('tblbudgetconfig_tenure_groups')
        .delete()
        .eq('config_tenure_id', configTenureId);

      if (error) throw error;

      return {
        success: true,
        message: 'Tenure group removed successfully',
      };
    } catch (error) {
      console.error('Error removing tenure group:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==================== Approvers Methods ====================

  /**
   * Get approvers for a budget configuration
   */
  static async getApproversByBudgetId(budgetId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetconfig_approvers')
        .select('*')
        .eq('budget_id', budgetId)
        .order('approval_level', { ascending: true });

      if (error) throw error;

      // Map UUIDs to user names and emails
      const enrichedApprovers = data.map((approver) => {
        const primaryDetails = getUserDetailsFromUUID(approver.primary_approver);
        const backupDetails = approver.backup_approver ? getUserDetailsFromUUID(approver.backup_approver) : null;

        return {
          ...approver,
          approver_name: primaryDetails.name,
          approver_email: primaryDetails.email,
          backup_approver_name: backupDetails?.name,
          backup_approver_email: backupDetails?.email,
        };
      });

      return {
        success: true,
        data: enrichedApprovers,
      };
    } catch (error) {
      console.error('Error fetching approvers:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Add or update approver for a budget configuration
   */
  static async setApprover(budgetId, approvalLevel, primaryApprover, backupApprover, createdBy) {
    try {
      // Check if approver already exists for this level
      const { data: existing, error: checkError } = await supabase
        .from('tblbudgetconfig_approvers')
        .select('approver_id')
        .eq('budget_id', budgetId)
        .eq('approval_level', approvalLevel)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      let result;

      if (existing) {
        // Update existing approver
        const { data, error } = await supabase
          .from('tblbudgetconfig_approvers')
          .update({
            primary_approver: primaryApprover,
            backup_approver: backupApprover || null,
            updated_by: createdBy,
            updated_at: new Date().toISOString(),
          })
          .eq('approver_id', existing.approver_id)
          .select();

        if (error) throw error;
        result = data[0];
      } else {
        // Insert new approver
        const { data, error } = await supabase
          .from('tblbudgetconfig_approvers')
          .insert([
            {
              budget_id: budgetId,
              approval_level: approvalLevel,
              primary_approver: primaryApprover,
              backup_approver: backupApprover || null,
              created_by: createdBy,
              created_at: new Date().toISOString(),
            },
          ])
          .select();

        if (error) throw error;
        result = data[0];
      }

      return {
        success: true,
        data: result,
        message: 'Approver set successfully',
      };
    } catch (error) {
      console.error('Error setting approver:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Remove approver for a budget configuration
   */
  static async removeApprover(approverId) {
    try {
      const { error } = await supabase
        .from('tblbudgetconfig_approvers')
        .delete()
        .eq('approver_id', approverId);

      if (error) throw error;

      return {
        success: true,
        message: 'Approver removed successfully',
      };
    } catch (error) {
      console.error('Error removing approver:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==================== Access Scopes Methods ====================

  /**
   * Get access scopes for a budget configuration
   */
  static async getAccessScopesByBudgetId(budgetId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetconfig_scopes')
        .select('*')
        .eq('budget_id', budgetId);

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching access scopes:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Add access scope to a budget configuration
   */
  static async addAccessScope(budgetId, scopeType, scopeValue, createdBy) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetconfig_scopes')
        .insert([
          {
            budget_id: budgetId,
            scope_type: scopeType,
            scope_value: scopeValue,
            created_by: createdBy,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      return {
        success: true,
        data: data[0],
        message: 'Access scope added successfully',
      };
    } catch (error) {
      console.error('Error adding access scope:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Remove access scope from a budget configuration
   */
  static async removeAccessScope(scopeId) {
    try {
      const { error } = await supabase
        .from('tblbudgetconfig_scopes')
        .delete()
        .eq('scope_id', scopeId);

      if (error) throw error;

      return {
        success: true,
        message: 'Access scope removed successfully',
      };
    } catch (error) {
      console.error('Error removing access scope:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Helper: Build approvers array from frontend data
   * Converts L1, L2, L3 approver data to database format
   * Resolves user names to UUIDs using userMapping
   */
  static buildApproversFromConfig(configData) {
    const approvers = [];

    // L1 Approvers (approval_level: 1)
    if (configData.approverL1) {
      const primaryApproverUUID = getUserUUID(configData.approverL1);
      const backupApproverUUID = configData.backupApproverL1 ? getUserUUID(configData.backupApproverL1) : null;
      
      if (!primaryApproverUUID) {
        throw new Error(`Invalid approver: ${configData.approverL1}. User not found in system.`);
      }
      
      approvers.push({
        approval_level: 1,
        primary_approver: primaryApproverUUID,
        backup_approver: backupApproverUUID,
      });
    }

    // L2 Approvers (approval_level: 2)
    if (configData.approverL2) {
      const primaryApproverUUID = getUserUUID(configData.approverL2);
      const backupApproverUUID = configData.backupApproverL2 ? getUserUUID(configData.backupApproverL2) : null;
      
      if (!primaryApproverUUID) {
        throw new Error(`Invalid approver: ${configData.approverL2}. User not found in system.`);
      }
      
      approvers.push({
        approval_level: 2,
        primary_approver: primaryApproverUUID,
        backup_approver: backupApproverUUID,
      });
    }

    // L3 Approvers (approval_level: 3)
    if (configData.approverL3) {
      const primaryApproverUUID = getUserUUID(configData.approverL3);
      const backupApproverUUID = configData.backupApproverL3 ? getUserUUID(configData.backupApproverL3) : null;
      
      if (!primaryApproverUUID) {
        throw new Error(`Invalid approver: ${configData.approverL3}. User not found in system.`);
      }
      
      approvers.push({
        approval_level: 3,
        primary_approver: primaryApproverUUID,
        backup_approver: backupApproverUUID,
      });
    }

    return approvers;
  }
  /**
   * Helper: Build scopes array from scope data with multi-path hierarchy support
   * Creates scope records with multiple hierarchical paths
   * Each path is stored as a single row with full hierarchy
   * Scope types: Geo, Location, Affected_OU (multi-path), Access_OU (multi-path), Client
   * 
   * Format for OUs:
   * affectedOUPaths: [["it-dept", "dev-team", "dev-team-a"], ["hr-dept", "hr-finance"]]
   * accessibleOUPaths: [["it-access", "dev-access"], ["hr-access"]]
   */
  static buildAccessScopesFromConfig(geoScopeArray, locationScopeArray, configData) {
    const scopes = [];

    // 1. GEO Scope Type (from countries)
    if (geoScopeArray && geoScopeArray.length > 0) {
      geoScopeArray.forEach((scope) => {
        scopes.push({
          scope_type: 'Geo',
          scope_value: scope,
        });
      });
    }

    // 2. LOCATION Scope Type (from siteLocation)
    if (locationScopeArray && locationScopeArray.length > 0) {
      locationScopeArray.forEach((scope) => {
        scopes.push({
          scope_type: 'Location',
          scope_value: scope,
        });
      });
    }

    // 3. AFFECTED_OU Scope Type - Support for MULTIPLE hierarchical paths
    // Each path is an array: [parent, child, grandchild, great-grandchild, ...]
    // Each path stored as a single row with complete hierarchy
    if (configData.affectedOUPaths && Array.isArray(configData.affectedOUPaths) && configData.affectedOUPaths.length > 0) {
      configData.affectedOUPaths.forEach((path) => {
        if (Array.isArray(path) && path.length > 0) {
          const affectedOUStructure = {
            path: path, // Store full path: [parent, child, grandchild, ...]
            depth: path.length,
            parent: path[0],
          };
          
          scopes.push({
            scope_type: 'Affected_OU',
            scope_value: JSON.stringify(affectedOUStructure),
          });
        }
      });
    }

    // 4. ACCESS_OU Scope Type - Support for MULTIPLE hierarchical paths
    // Each path is an array: [parent, child, grandchild, ...]
    if (configData.accessibleOUPaths && Array.isArray(configData.accessibleOUPaths) && configData.accessibleOUPaths.length > 0) {
      configData.accessibleOUPaths.forEach((path) => {
        if (Array.isArray(path) && path.length > 0) {
          const accessOUStructure = {
            path: path, // Store full path: [parent, child, grandchild, ...]
            depth: path.length,
            parent: path[0],
          };
          
          scopes.push({
            scope_type: 'Access_OU',
            scope_value: JSON.stringify(accessOUStructure),
          });
        }
      });
    }

    // 5. CLIENT Scope Type
    if (configData.clients && Array.isArray(configData.clients) && configData.clients.length > 0) {
      configData.clients.forEach((scope) => {
        scopes.push({
          scope_type: 'Client',
          scope_value: scope,
        });
      });
    }

    return scopes;
  }

  /**
   * Get budget tracking records for a specific budget
   */
  static async getBudgetTrackingByBudgetId(budgetId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetconfig_budget_tracking')
        .select('*')
        .eq('budget_id', budgetId)
        .order('period_start', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching budget tracking:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get request logs for a specific budget configuration
   */
  static async getRequestLogsByBudgetId(budgetId) {
    try {
      // This would query a requests/approvals table if it exists
      // For now, returning empty array - implement when requests table is created
      const { data, error } = await supabase
        .from('tblbudget_requests')
        .select('*')
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching request logs:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Fetch all organizations with hierarchical structure
   * Returns flattened list with parent information
   */
  static async getAllOrganizations() {
    try {
      const { data, error } = await supabase
        .from('tblorganization')
        .select('*')
        .order('org_name', { ascending: true });

      if (error) throw error;

      // Build a map for quick lookup
      const orgMap = {};
      data.forEach(org => {
        orgMap[org.org_id] = org;
      });

      // Enhance each organization with parent info
      const enhancedOrgs = data.map(org => ({
        ...org,
        parent_org_name: org.parent_org_id ? (orgMap[org.parent_org_id]?.org_name || 'Unknown') : null,
      }));

      return {
        success: true,
        data: enhancedOrgs,
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
   * Fetch organizations by level for hierarchical display
   * Level 0 = Parent orgs, Level 1 = Children, Level 2 = Grandchildren, etc.
   */
  static async getOrganizationsByLevel() {
    try {
      const { data: allOrgs, error } = await supabase
        .from('tblorganization')
        .select('*')
        .order('org_name', { ascending: true });

      if (error) throw error;

      // Calculate depth for each organization
      const calculateDepth = (orgId, visited = new Set()) => {
        if (visited.has(orgId)) return 0; // Prevent circular references
        visited.add(orgId);

        const org = allOrgs.find(o => o.org_id === orgId);
        if (!org?.parent_org_id) return 0;

        const parent = allOrgs.find(o => o.org_id === org.parent_org_id);
        return parent ? 1 + calculateDepth(parent.org_id, visited) : 0;
      };

      // Group by depth level
      const grouped = {};
      allOrgs.forEach(org => {
        const depth = calculateDepth(org.org_id);
        if (!grouped[depth]) grouped[depth] = [];
        grouped[depth].push(org);
      });

      return {
        success: true,
        data: grouped,
      };
    } catch (error) {
      console.error('Error fetching organizations by level:', error);
      return {
        success: false,
        error: error.message,
        data: {},
      };
    }
  }

  /**
   * Fetch approvers by role level (L1, L2, or L3)
   * Returns user information with their assigned roles
   */
  static async getApproversByLevel(level) {
    try {
      // Map level string to role names
      const roleMap = {
        L1: 'L1_APPROVER',
        L2: 'L2_APPROVER',
        L3: 'L3_APPROVER',
        1: 'L1_APPROVER',
        2: 'L2_APPROVER',
        3: 'L3_APPROVER',
      };

      const roleName = roleMap[level];
      if (!roleName) {
        throw new Error(`Invalid approval level: ${level}`);
      }

      // Query: Get users with specific role
      const { data, error } = await supabase
        .from('tbluserroles')
        .select(`
          user_id,
          is_active,
          tblusers!inner (
            user_id,
            employee_id,
            first_name,
            last_name,
            email,
            department,
            status
          ),
          tblroles!inner (
            role_id,
            role_name,
            description
          )
        `)
        .eq('tblroles.role_name', roleName)
        .eq('is_active', true)
        .order('first_name', { foreignTable: 'tblusers', ascending: true });

      if (error) throw error;

      // Format response for easier consumption
      const formattedData = data.map(entry => {
        // Handle both array and object responses from Supabase
        const userObj = Array.isArray(entry.tblusers) ? entry.tblusers[0] : entry.tblusers;
        const roleObj = Array.isArray(entry.tblroles) ? entry.tblroles[0] : entry.tblroles;
        
        return {
          user_role_id: entry.user_id,
          user_id: userObj.user_id,
          employee_id: userObj.employee_id,
          first_name: userObj.first_name,
          last_name: userObj.last_name,
          email: userObj.email,
          department: userObj.department,
          status: userObj.status,
          role_name: roleObj.role_name,
          role_id: roleObj.role_id,
          full_name: `${userObj.first_name} ${userObj.last_name}`,
        };
      });

      return {
        success: true,
        data: formattedData,
        level: level,
        role_name: roleName,
      };
    } catch (error) {
      console.error(`Error fetching ${level} approvers:`, error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Fetch all approvers across all levels
   * Returns grouped by approval level
   */
  static async getAllApprovers() {
    try {
      const levels = ['L1', 'L2', 'L3'];
      const result = {};

      for (const level of levels) {
        const { data, error } = await this.getApproversByLevel(level);
        if (error) {
          console.warn(`Error fetching ${level} approvers:`, error);
          result[level] = [];
        } else {
          result[level] = data;
        }
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Error fetching all approvers:', error);
      return {
        success: false,
        error: error.message,
        data: { L1: [], L2: [], L3: [] },
      };
    }
  }

  /**
   * Get a user by ID with their roles
   */
  static async getUserById(userId) {
    try {
      const { data, error } = await supabase
        .from('tblusers')
        .select(`
          *,
          tbluserroles (
            user_role_id,
            is_active,
            tblroles (
              role_id,
              role_name
            )
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }
}

export default BudgetConfigService;
