import supabase from '../config/database.js';

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
        geo_scope,
        location_scope,
        department_scope,
        created_by,
        tenure_groups,
        approvers,
        access_scopes,
      } = configData;

      // Step 1: Create main budget configuration
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
            geo_scope,
            location_scope,
            department_scope,
            created_by,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (budgetError) throw budgetError;

      const budget_id = budgetData[0].budget_id;

      // Step 2: Insert tenure groups if provided
      if (tenure_groups && Array.isArray(tenure_groups) && tenure_groups.length > 0) {
        const tenureRecords = tenure_groups.map((group) => ({
          budget_id,
          tenure_group: group,
          created_at: new Date().toISOString(),
        }));

        const { error: tenureError } = await supabase
          .from('tblbudgetconfig_tenure_groups')
          .insert(tenureRecords);

        if (tenureError) throw tenureError;
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

        const { error: approverError } = await supabase
          .from('tblbudgetconfig_approvers')
          .insert(approverRecords);

        if (approverError) throw approverError;
      }

      // Step 4: Insert access scopes if provided
      if (access_scopes && Array.isArray(access_scopes) && access_scopes.length > 0) {
        const scopeRecords = access_scopes.map((scope) => ({
          budget_id,
          scope_type: scope.scope_type,
          scope_value: scope.scope_value,
          created_by,
          created_at: new Date().toISOString(),
        }));

        const { error: scopeError } = await supabase
          .from('tblbudgetconfig_access_scopes')
          .insert(scopeRecords);

        if (scopeError) throw scopeError;
      }

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

      return {
        success: true,
        data,
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
        .from('tblbudgetconfig_access_scopes')
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
        .from('tblbudgetconfig_access_scopes')
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
        .from('tblbudgetconfig_access_scopes')
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
}

export default BudgetConfigService;
