import supabase from '../config/database.js';

/**
 * Budget Configuration Service
 * Handles all database operations for budget configurations
 */

export class BudgetConfigService {
  /**
   * Create a new budget configuration
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
      } = configData;

      const { data, error } = await supabase
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

      if (error) throw error;

      return {
        success: true,
        data: data[0],
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

      return {
        success: true,
        data,
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
   * Get a single budget configuration by ID
   */
  static async getBudgetConfigById(budgetId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetconfiguration')
        .select('*')
        .eq('budget_id', budgetId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
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
      } = updateData;

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

      return {
        success: true,
        data: data[0],
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
   * Delete a budget configuration
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

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching user configs:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default BudgetConfigService;
