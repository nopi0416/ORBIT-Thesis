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
        budget_limit,
        currency,
        pay_cycle,
        start_date,
        end_date,
        created_by,
        approvers,
        geo,
        location,
        client,
        access_ou,
        affected_ou,
        tenure_group,
        budget_description,
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
            budget_limit: budget_limit ? parseFloat(budget_limit) : null,
            currency: currency || null,
            pay_cycle: pay_cycle || null,
            geo: geo || null,
            location: location || null,
            client: client || null,
            access_ou: access_ou || null,
            affected_ou: affected_ou || null,
            tenure_group: tenure_group || null,
            start_date: start_date || null,
            end_date: end_date || null,
            budget_description: budget_description || null,
            created_by,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (budgetError) throw budgetError;

      const budget_id = budgetData[0].budget_id;
      
      console.log('=== Budget Created ===');
      console.log('Budget ID:', budget_id);
      console.log('Approvers to Insert:', approvers);
      console.log('=======================');
      // Step 2: Insert approvers if provided
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

      // Budget tracking table removed; skip tracking initialization.

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

      if (filters.geo) {
        query = query.ilike('geo', `%${filters.geo}%`);
      }

      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      if (filters.client) {
        query = query.ilike('client', `%${filters.client}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data for each config
      const configsWithRelations = await Promise.all(
        data.map(async (config) => {
          const [approvers] = await Promise.all([
            this.getApproversByBudgetId(config.budget_id),
          ]);

          return {
            ...config,
            approvers: approvers.data || [],
            budget_tracking: [],
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
      const [approvers] = await Promise.all([
        this.getApproversByBudgetId(budgetId),
      ]);

      return {
        success: true,
        data: {
          ...data,
          approvers: approvers.data || [],
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
        budget_limit,
        currency,
        pay_cycle,
        start_date,
        end_date,
        geo,
        location,
        client,
        access_ou,
        affected_ou,
        tenure_group,
        budget_description,
        updated_by,
      } = updateData;

      // Update main budget configuration
      const { data, error } = await supabase
        .from('tblbudgetconfiguration')
        .update({
          ...(budget_name && { budget_name }),
          ...(min_limit !== undefined && { min_limit: min_limit ? parseFloat(min_limit) : null }),
          ...(max_limit !== undefined && { max_limit: max_limit ? parseFloat(max_limit) : null }),
          ...(budget_control !== undefined && { budget_control }),
          ...(budget_limit !== undefined && { budget_limit: budget_limit ? parseFloat(budget_limit) : null }),
          ...(currency !== undefined && { currency }),
          ...(pay_cycle !== undefined && { pay_cycle }),
          ...(start_date !== undefined && { start_date }),
          ...(end_date !== undefined && { end_date }),
          ...(geo !== undefined && { geo }),
          ...(location !== undefined && { location }),
          ...(client !== undefined && { client }),
          ...(access_ou !== undefined && { access_ou }),
          ...(affected_ou !== undefined && { affected_ou }),
          ...(tenure_group !== undefined && { tenure_group }),
          ...(budget_description !== undefined && { budget_description }),
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
          const [approvers] = await Promise.all([
            this.getApproversByBudgetId(config.budget_id),
          ]);

          return {
            ...config,
            approvers: approvers.data || [],
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

      const userIds = Array.from(
        new Set(
          data
            .flatMap((approver) => [approver.primary_approver, approver.backup_approver])
            .filter(Boolean)
        )
      );

      let userMap = {};
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('tblusers')
          .select('user_id, first_name, last_name, email')
          .in('user_id', userIds);

        if (usersError) throw usersError;

        userMap = (usersData || []).reduce((acc, user) => {
          acc[user.user_id] = user;
          return acc;
        }, {});
      }

      // Map UUIDs to user names and emails
      const enrichedApprovers = data.map((approver) => {
        const primaryDetails = userMap[approver.primary_approver];
        const backupDetails = approver.backup_approver ? userMap[approver.backup_approver] : null;

        return {
          ...approver,
          approver_name: primaryDetails
            ? `${primaryDetails.first_name || ''} ${primaryDetails.last_name || ''}`.trim()
            : null,
          approver_email: primaryDetails?.email || null,
          backup_approver_name: backupDetails
            ? `${backupDetails.first_name || ''} ${backupDetails.last_name || ''}`.trim()
            : null,
          backup_approver_email: backupDetails?.email || null,
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
      return {
        success: true,
        data: [],
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
   * Create organization (company or department)
   */
  static async createOrganization(payload) {
    try {
      const {
        org_name,
        company_code,
        parent_org_id,
        org_description,
        created_by,
      } = payload;

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('tblorganization')
        .insert([
          {
            org_name,
            company_code: company_code || null,
            parent_org_id: parent_org_id || null,
            org_description: org_description || null,
            created_by: created_by || null,
            created_at: now,
            updated_by: created_by || null,
            updated_at: now,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error creating organization:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update organization
   */
  static async updateOrganization(orgId, payload) {
    try {
      const {
        org_name,
        company_code,
        parent_org_id,
        org_description,
        updated_by,
      } = payload;

      const { data, error } = await supabase
        .from('tblorganization')
        .update({
          ...(org_name !== undefined && { org_name }),
          ...(company_code !== undefined && { company_code: company_code || null }),
          ...(parent_org_id !== undefined && { parent_org_id: parent_org_id || null }),
          ...(org_description !== undefined && { org_description: org_description || null }),
          ...(updated_by !== undefined && { updated_by }),
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', orgId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error updating organization:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete organization
   */
  static async deleteOrganization(orgId) {
    try {
      const { data: childOrgs, error: childError } = await supabase
        .from('tblorganization')
        .select('org_id')
        .eq('parent_org_id', orgId);

      if (childError) throw childError;

      const childOrgIds = (childOrgs || []).map((org) => org.org_id);
      const orgIds = [orgId, ...childOrgIds];

      const { error: clientError } = await supabase
        .from('tblclient_organization')
        .delete()
        .in('parent_org_id', orgIds);

      if (clientError) throw clientError;

      const { error: geoLinkError } = await supabase
        .from('tblorganization_to_geo_location')
        .delete()
        .in('org_id', orgIds);

      if (geoLinkError) throw geoLinkError;

      const { error } = await supabase
        .from('tblorganization')
        .delete()
        .in('org_id', orgIds);

      if (error) throw error;

      return {
        success: true,
        data: { org_id: orgId },
      };
    } catch (error) {
      console.error('Error deleting organization:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all geos
   */
  static async getAllGeo() {
    try {
      const { data, error } = await supabase
        .from('tblgeo')
        .select('geo_id, geo_code, geo_name, created_at, updated_at')
        .order('geo_name', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('Error fetching geo list:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Create geo
   */
  static async createGeo(payload) {
    try {
      const { geo_code, geo_name, created_by } = payload;
      const resolvedCreatedBy = getUserUUID(created_by) || getUserUUID('john-smith');
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('tblgeo')
        .insert([
          {
            geo_code,
            geo_name,
            created_by: resolvedCreatedBy,
            created_at: now,
            updated_by: resolvedCreatedBy,
            updated_at: now,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error creating geo:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update geo
   */
  static async updateGeo(geoId, payload) {
    try {
      const { geo_code, geo_name, updated_by } = payload;
      const resolvedUpdatedBy = getUserUUID(updated_by) || getUserUUID('john-smith');
      const { data, error } = await supabase
        .from('tblgeo')
        .update({
          ...(geo_code !== undefined && { geo_code }),
          ...(geo_name !== undefined && { geo_name }),
          ...(updated_by !== undefined && { updated_by: resolvedUpdatedBy }),
          updated_at: new Date().toISOString(),
        })
        .eq('geo_id', geoId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error updating geo:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete geo
   */
  static async deleteGeo(geoId) {
    try {
      const { error } = await supabase
        .from('tblgeo')
        .delete()
        .eq('geo_id', geoId);

      if (error) throw error;

      return {
        success: true,
        data: { geo_id: geoId },
      };
    } catch (error) {
      console.error('Error deleting geo:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get locations (optionally by geo)
   */
  static async getLocations(geoId = null) {
    try {
      let query = supabase
        .from('tbllocation')
        .select('location_id, geo_id, location_code, location_name, created_at, updated_at')
        .order('location_name', { ascending: true });

      if (geoId) {
        query = query.eq('geo_id', geoId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('Error fetching locations:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Create location
   */
  static async createLocation(payload) {
    try {
      const { geo_id, location_code, location_name, created_by } = payload;
      const resolvedCreatedBy = getUserUUID(created_by) || getUserUUID('john-smith');
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('tbllocation')
        .insert([
          {
            geo_id,
            location_code,
            location_name,
            created_by: resolvedCreatedBy,
            created_at: now,
            updated_by: resolvedCreatedBy,
            updated_at: now,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error creating location:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update location
   */
  static async updateLocation(locationId, payload) {
    try {
      const { geo_id, location_code, location_name, updated_by } = payload;
      const { data, error } = await supabase
        .from('tbllocation')
        .update({
          ...(geo_id !== undefined && { geo_id }),
          ...(location_code !== undefined && { location_code }),
          ...(location_name !== undefined && { location_name }),
          ...(updated_by !== undefined && { updated_by }),
          updated_at: new Date().toISOString(),
        })
        .eq('location_id', locationId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error updating location:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete location
   */
  static async deleteLocation(locationId) {
    try {
      const { error: mappingError } = await supabase
        .from('tblorganization_to_geo_location')
        .delete()
        .eq('location_id', locationId);

      if (mappingError) throw mappingError;

      const { error } = await supabase
        .from('tbllocation')
        .delete()
        .eq('location_id', locationId);

      if (error) throw error;

      return {
        success: true,
        data: { location_id: locationId },
      };
    } catch (error) {
      console.error('Error deleting location:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get organization to geo/location mapping
   */
  static async getOrganizationGeoLocations() {
    try {
      const { data, error } = await supabase
        .from('tblorganization_to_geo_location')
        .select(`
          org_geo_loc_id,
          org_id,
          geo_id,
          location_id,
          tblorganization!inner ( org_id, org_name ),
          tblgeo!inner ( geo_id, geo_code, geo_name ),
          tbllocation!inner ( location_id, location_code, location_name )
        `);

      if (error) throw error;

      const normalized = (data || []).map((row) => ({
        org_geo_loc_id: row.org_geo_loc_id,
        org_id: row.org_id,
        org_name: row.tblorganization?.org_name,
        geo_id: row.geo_id,
        geo_code: row.tblgeo?.geo_code,
        geo_name: row.tblgeo?.geo_name,
        location_id: row.location_id,
        location_code: row.tbllocation?.location_code,
        location_name: row.tbllocation?.location_name,
      }));

      return {
        success: true,
        data: normalized,
      };
    } catch (error) {
      console.error('Error fetching organization geo/location mapping:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get organization to geo/location mapping filtered by org IDs
   */
  static async getOrganizationGeoLocationsByOrgIds(orgIds = []) {
    try {
      if (!orgIds.length) {
        return { success: true, data: [] };
      }

      const { data, error } = await supabase
        .from('tblorganization_to_geo_location')
        .select(`
          org_geo_loc_id,
          org_id,
          geo_id,
          location_id,
          tblorganization!inner ( org_id, org_name ),
          tblgeo!inner ( geo_id, geo_code, geo_name ),
          tbllocation!inner ( location_id, location_code, location_name )
        `)
        .in('org_id', orgIds);

      if (error) throw error;

      const normalized = (data || []).map((row) => ({
        org_geo_loc_id: row.org_geo_loc_id,
        org_id: row.org_id,
        org_name: row.tblorganization?.org_name,
        geo_id: row.geo_id,
        geo_code: row.tblgeo?.geo_code,
        geo_name: row.tblgeo?.geo_name,
        location_id: row.location_id,
        location_code: row.tbllocation?.location_code,
        location_name: row.tbllocation?.location_name,
      }));

      return {
        success: true,
        data: normalized,
      };
    } catch (error) {
      console.error('Error fetching organization geo/location mapping by org IDs:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get clients by parent organization IDs
   */
  static async getClientsByParentOrgIds(parentOrgIds = []) {
    try {
      if (!parentOrgIds.length) {
        return { success: true, data: [] };
      }

      const { data, error } = await supabase
        .from('tblclient_organization')
        .select('client_org_id, parent_org_id, client_code, client_name, client_description, client_status, contract_start_date, contract_end_date, created_at, updated_at')
        .in('parent_org_id', parentOrgIds)
        .order('client_name', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('Error fetching clients by parent org IDs:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Create client organization
   */
  static async createClient(payload) {
    try {
      const {
        parent_org_id,
        client_code,
        client_name,
        client_description,
        client_status,
        contract_start_date,
        contract_end_date,
        created_by,
      } = payload;

      const resolvedCreatedBy = getUserUUID(created_by) || getUserUUID('john-smith');

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('tblclient_organization')
        .insert([
          {
            parent_org_id,
            client_code,
            client_name,
            client_description: client_description || null,
            client_status: client_status || 'ACTIVE',
            contract_start_date: contract_start_date || now,
            contract_end_date: contract_end_date || null,
            created_by: resolvedCreatedBy,
            created_at: now,
            updated_by: resolvedCreatedBy,
            updated_at: now,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error creating client:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update client organization
   */
  static async updateClient(clientOrgId, payload) {
    try {
      const {
        parent_org_id,
        client_code,
        client_name,
        client_description,
        client_status,
        contract_start_date,
        contract_end_date,
        updated_by,
      } = payload;

      const { data, error } = await supabase
        .from('tblclient_organization')
        .update({
          ...(parent_org_id !== undefined && { parent_org_id }),
          ...(client_code !== undefined && { client_code }),
          ...(client_name !== undefined && { client_name }),
          ...(client_description !== undefined && { client_description: client_description || null }),
          ...(client_status !== undefined && { client_status }),
          ...(contract_start_date !== undefined && { contract_start_date: contract_start_date || null }),
          ...(contract_end_date !== undefined && { contract_end_date: contract_end_date || null }),
          ...(updated_by !== undefined && { updated_by }),
          updated_at: new Date().toISOString(),
        })
        .eq('client_org_id', clientOrgId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error updating client:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete client organization
   */
  static async deleteClient(clientOrgId) {
    try {
      const { error } = await supabase
        .from('tblclient_organization')
        .delete()
        .eq('client_org_id', clientOrgId);

      if (error) throw error;

      return {
        success: true,
        data: { client_org_id: clientOrgId },
      };
    } catch (error) {
      console.error('Error deleting client:', error);
      return {
        success: false,
        error: error.message,
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

  /**
   * Get all users with their active roles
   */
  static async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('tblusers')
        .select(`
          user_id,
          employee_id,
          first_name,
          last_name,
          email,
          status,
          tbluserroles (
            is_active,
            tblroles (
              role_id,
              role_name
            )
          )
        `)
        .order('first_name', { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map((user) => {
        const roles = (user.tbluserroles || [])
          .filter((role) => role.is_active !== false)
          .map((role) => {
            const roleObj = Array.isArray(role.tblroles) ? role.tblroles[0] : role.tblroles;
            return roleObj?.role_name || null;
          })
          .filter(Boolean);

        return {
          user_id: user.user_id,
          employee_id: user.employee_id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          status: user.status,
          roles,
          full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        };
      });

      return {
        success: true,
        data: formatted,
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }
}

export default BudgetConfigService;
