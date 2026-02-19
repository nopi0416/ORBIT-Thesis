import supabase from '../config/database.js';
import { getUserUUID, isValidUser, getUserNameFromUUID, getUserDetailsFromUUID } from '../utils/userMapping.js';

const getNetworkNow = async () => {
  try {
    const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
    if (!response.ok) throw new Error(`Time API error: ${response.status}`);
    const data = await response.json();
    const timestamp = data?.utc_datetime || data?.datetime;
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) throw new Error('Invalid time API response');
    return parsed;
  } catch (error) {
    console.warn('[getNetworkNow] Falling back to local time:', error?.message || error);
    return new Date();
  }
};

const parseStoredList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [value];
};

const containsOrgId = (value, orgId) => {
  if (!orgId) return true;
  const parsed = parseStoredList(value);
  if (!Array.isArray(parsed)) return false;
  return parsed.some((entry) => {
    if (Array.isArray(entry)) return entry.includes(orgId);
    return entry === orgId;
  });
};

const logBudgetConfigAction = async ({
  budgetId,
  actionType,
  description,
  performedBy,
  oldValue,
  newValue,
  logMeta = {},
}) => {
  if (!budgetId || !performedBy) return;

  try {
    await supabase.from('tblbudgetconfigurationlogs').insert([
      {
        budget_id: budgetId,
        action_type: actionType || null,
        description: description || null,
        performed_by: performedBy,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
        ip_address: logMeta?.ip_address || null,
        user_agent: logMeta?.user_agent || null,
      },
    ]);
  } catch (error) {
    console.warn('[budgetConfigLogs] Failed to insert log:', error?.message || error);
  }
};

/**
 * Budget Configuration Service
 * Handles all database operations for budget configurations
 * Supports normalized schema with tenure groups, approvers, and access scopes
 */

export class BudgetConfigService {
  static async getUserNameMap(userIds = []) {
    const uniqueIds = Array.from(new Set((userIds || []).filter(Boolean)));
    if (!uniqueIds.length) return new Map();

    const { data, error } = await supabase
      .from('tblusers')
      .select('user_id, first_name, last_name')
      .in('user_id', uniqueIds);

    if (error) throw error;

    return new Map(
      (data || []).map((user) => [
        user.user_id,
        `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      ])
    );
  }

  static async getUserRoleMap(userIds = []) {
    const uniqueIds = Array.from(new Set((userIds || []).filter(Boolean)));
    if (!uniqueIds.length) return new Map();

    const { data, error } = await supabase
      .from('tbluserroles')
      .select(`
        user_id,
        is_active,
        tblroles:role_id (
          role_name
        )
      `)
      .in('user_id', uniqueIds)
      .eq('is_active', true);

    if (error) {
      console.warn('[getUserRoleMap] Role lookup failed:', error);
      // Return empty map instead of throwing to avoid breaking the entire list
      return new Map();
    }

    return new Map(
      (data || []).map((ur) => [
        ur.user_id,
        String(ur.tblroles?.role_name || '').toLowerCase(),
      ])
    );
  }

  static async getBudgetApprovalAmounts(budgetIds = []) {
    const uniqueIds = Array.from(new Set((budgetIds || []).filter(Boolean)));
    if (!uniqueIds.length) return new Map();

    const { data, error } = await supabase
      .from('tblbudgetapprovalrequests')
      .select('budget_id, total_request_amount, overall_status')
      .in('budget_id', uniqueIds);

    if (error) throw error;

    const totals = new Map();
    (data || []).forEach((row) => {
      const key = row.budget_id;
      const status = String(row.overall_status || '').toLowerCase();
      const amount = Number(row.total_request_amount || 0);
      const current = totals.get(key) || { approvedAmount: 0, ongoingAmount: 0 };

      if (status === 'approved' || status === 'completed') {
        current.approvedAmount += amount;
      } else if (status !== 'rejected' && status !== 'draft') {
        current.ongoingAmount += amount;
      }

      totals.set(key, current);
    });

    return totals;
  }

  static async getBudgetDecisionMap(budgetIds = []) {
    const uniqueIds = Array.from(new Set((budgetIds || []).filter(Boolean)));
    if (!uniqueIds.length) return new Map();

    const { data, error } = await supabase
      .from('tblbudgetapprovalrequests')
      .select('budget_id, overall_status')
      .in('budget_id', uniqueIds);

    if (error) throw error;

    const map = new Map();
    (data || []).forEach((row) => {
      const status = String(row?.overall_status || '').toLowerCase();
      if (status === 'approved' || status === 'rejected') {
        map.set(row.budget_id, true);
      }
    });

    return map;
  }
  static computeConfigStatus(config) {
    const storedStatus = String(config?.status || '').toLowerCase();
    if (storedStatus === 'deactivated') return 'deactivated';

    const endDateValue = config?.end_date || config?.endDate || null;
    if (endDateValue) {
      const endDate = new Date(endDateValue);
      if (!Number.isNaN(endDate.getTime()) && endDate < new Date()) {
        return 'expired';
      }
    }

    return 'active';
  }
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
        status,
        log_meta,
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
            status: status || 'ACTIVE',
            created_by,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (budgetError) throw budgetError;

      const budget_id = budgetData[0].budget_id;
      await logBudgetConfigAction({
        budgetId: budget_id,
        actionType: 'created',
        description: 'Budget configuration created',
        performedBy: created_by,
        oldValue: null,
        newValue: budgetData[0],
        logMeta: log_meta,
      });
      
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

        await logBudgetConfigAction({
          budgetId: budget_id,
          actionType: 'approver_configured',
          description: 'Approvers configured during budget creation',
          performedBy: created_by,
          oldValue: null,
          newValue: approverRecords,
          logMeta: log_meta,
        });
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

      let filteredByOrg = data || [];
      if (filters.org_id) {
        const subtreeResult = await this.getOrganizationSubtreeIds(filters.org_id);
        const allowedOrgIds = new Set(subtreeResult.data || [filters.org_id]);
        filteredByOrg = (data || []).filter((row) => {
          const accessMatch = Array.from(allowedOrgIds).some((id) => containsOrgId(row.access_ou, id));
          const affectedMatch = Array.from(allowedOrgIds).some((id) => containsOrgId(row.affected_ou, id));
          return accessMatch || affectedMatch;
        });
      }

      let approvalAmounts = new Map();
      try {
        approvalAmounts = await this.getBudgetApprovalAmounts(
          (filteredByOrg || []).map((row) => row.budget_id)
        );
      } catch (amountError) {
        console.warn('[getAllBudgetConfigs] Failed to compute approval amounts:', amountError?.message || amountError);
      }

      let decisionMap = new Map();
      try {
        decisionMap = await this.getBudgetDecisionMap((filteredByOrg || []).map((row) => row.budget_id));
      } catch (decisionError) {
        console.warn('[getAllBudgetConfigs] Failed to compute approval decisions:', decisionError?.message || decisionError);
      }

      // Fetch related data for each config
      let userNameMap = new Map();
      let userRoleMap = new Map();
      const creatorIds = (filteredByOrg || []).map((row) => row.created_by);
      try {
        [userNameMap, userRoleMap] = await Promise.all([
          this.getUserNameMap(creatorIds),
          this.getUserRoleMap(creatorIds)
        ]);
      } catch (lookupError) {
        console.warn('[getAllBudgetConfigs] User lookup failed:', lookupError?.message || lookupError);
      }

      const configsWithRelations = await Promise.all(
        filteredByOrg.map(async (config) => {
          const [approvers] = await Promise.all([
            this.getApproversByBudgetId(config.budget_id),
          ]);
          const creatorName = userNameMap.get(config.created_by);
          const creatorRole = userRoleMap.get(config.created_by);
          const creatorDetails = creatorName ? { name: creatorName } : getUserDetailsFromUUID(config.created_by);
          const totals = approvalAmounts.get(config.budget_id) || { approvedAmount: 0, ongoingAmount: 0 };
          const hasApprovalActivity = decisionMap.get(config.budget_id) || false;

          const computedStatus = BudgetConfigService.computeConfigStatus(config);
          
          return {
            ...config,
            approvers: approvers.data || [],
            budget_tracking: [],
            status: computedStatus,
            created_by_name: creatorDetails?.name || config.created_by,
            created_by_role: creatorRole || null,
            approved_amount: totals.approvedAmount,
            ongoing_amount: totals.ongoingAmount,
            has_approval_activity: hasApprovalActivity,
          };
        })
      );

      const statusFilter = String(filters.status || '').toLowerCase();
      const filteredByStatus = statusFilter && statusFilter !== 'all'
        ? configsWithRelations.filter((config) => String(config.status || '').toLowerCase() === statusFilter)
        : configsWithRelations;

      return {
        success: true,
        data: filteredByStatus,
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

      let approvalTotals = { approvedAmount: 0, ongoingAmount: 0 };
      try {
        const totalsMap = await this.getBudgetApprovalAmounts([budgetId]);
        approvalTotals = totalsMap.get(budgetId) || approvalTotals;
      } catch (amountError) {
        console.warn('[getBudgetConfigById] Failed to compute approval amounts:', amountError?.message || amountError);
      }

      let creatorName = null;
      try {
        const userNameMap = await this.getUserNameMap([data.created_by]);
        creatorName = userNameMap.get(data.created_by) || null;
      } catch (lookupError) {
        console.warn('[getBudgetConfigById] User lookup failed:', lookupError?.message || lookupError);
      }
      const creatorDetails = creatorName ? { name: creatorName } : getUserDetailsFromUUID(data.created_by);
      let hasApprovalActivity = false;
      try {
        const decisionMap = await this.getBudgetDecisionMap([budgetId]);
        hasApprovalActivity = decisionMap.get(budgetId) || false;
      } catch (decisionError) {
        console.warn('[getBudgetConfigById] Failed to compute approval decisions:', decisionError?.message || decisionError);
      }

      const computedStatus = BudgetConfigService.computeConfigStatus(data);

      return {
        success: true,
        data: {
          ...data,
          approvers: approvers.data || [],
          status: computedStatus,
          created_by_name: creatorDetails?.name || data.created_by,
          approved_amount: approvalTotals.approvedAmount,
          ongoing_amount: approvalTotals.ongoingAmount,
          has_approval_activity: hasApprovalActivity,
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
        status,
        updated_by,
        log_meta,
      } = updateData;

      const { data: existingConfig } = await supabase
        .from('tblbudgetconfiguration')
        .select('*')
        .eq('budget_id', budgetId)
        .single();

      const decisionMap = await this.getBudgetDecisionMap([budgetId]);
      const hasApprovalActivity = decisionMap.get(budgetId) || false;
      const existingStatus = String(existingConfig?.status || '').toLowerCase();
      const isExpired = existingStatus === 'expired';
      const now = await getNetworkNow();
      const canEditStartDate = !hasApprovalActivity && !isExpired;

      let nextStatus = status;
      if (String(nextStatus || '').toLowerCase() === 'expired') {
        nextStatus = undefined;
      }

      if (isExpired) {
        if (end_date !== undefined) {
          const endDateValue = end_date ? new Date(end_date) : null;
          if (endDateValue && !Number.isNaN(endDateValue.getTime()) && endDateValue > now) {
            nextStatus = 'active';
          } else {
            nextStatus = undefined;
          }
        } else {
          nextStatus = undefined;
        }
      }

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
          ...(canEditStartDate && start_date !== undefined && { start_date }),
          ...(end_date !== undefined && { end_date }),
          ...(geo !== undefined && { geo }),
          ...(location !== undefined && { location }),
          ...(client !== undefined && { client }),
          ...(access_ou !== undefined && { access_ou }),
          ...(affected_ou !== undefined && { affected_ou }),
          ...(tenure_group !== undefined && { tenure_group }),
          ...(budget_description !== undefined && { budget_description }),
          ...(nextStatus !== undefined && { status: nextStatus }),
          updated_by,
          updated_at: now.toISOString(),
        })
        .eq('budget_id', budgetId)
        .select();

      if (error) throw error;

      const actionType = status === 'deactivated' ? 'deactivated' : 'updated';
      const actionDescription = status === 'deactivated'
        ? 'Budget configuration deactivated'
        : 'Budget configuration updated';

      await logBudgetConfigAction({
        budgetId,
        actionType,
        description: actionDescription,
        performedBy: updated_by,
        oldValue: existingConfig || null,
        newValue: data?.[0] || null,
        logMeta: log_meta,
      });

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
  static async deleteBudgetConfig(budgetId, performedBy = null, logMeta = null) {
    try {
      const { data: existingConfig } = await supabase
        .from('tblbudgetconfiguration')
        .select('*')
        .eq('budget_id', budgetId)
        .single();

      const performer = performedBy || existingConfig?.created_by;
      if (existingConfig?.budget_id && performer) {
        await logBudgetConfigAction({
          budgetId,
          actionType: 'deleted',
          description: 'Budget configuration deleted',
          performedBy: performer,
          oldValue: existingConfig,
          newValue: null,
          logMeta,
        });
      }

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
      let userNameMap = new Map();
      try {
        userNameMap = await this.getUserNameMap((data || []).map((row) => row.created_by));
      } catch (lookupError) {
        console.warn('[getConfigsByUser] User lookup failed:', lookupError?.message || lookupError);
      }

      let decisionMap = new Map();
      try {
        decisionMap = await this.getBudgetDecisionMap((data || []).map((row) => row.budget_id));
      } catch (decisionError) {
        console.warn('[getConfigsByUser] Failed to compute approval decisions:', decisionError?.message || decisionError);
      }

      const configsWithRelations = await Promise.all(
        data.map(async (config) => {
          const [approvers] = await Promise.all([
            this.getApproversByBudgetId(config.budget_id),
          ]);
          const creatorName = userNameMap.get(config.created_by);
          const creatorDetails = creatorName ? { name: creatorName } : getUserDetailsFromUUID(config.created_by);
          const hasApprovalActivity = decisionMap.get(config.budget_id) || false;

          return {
            ...config,
            approvers: approvers.data || [],
            status: config.status,
            created_by_name: creatorDetails?.name || config.created_by,
            has_approval_activity: hasApprovalActivity,
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
  static async addTenureGroups(budgetId, tenureGroups, createdBy = null, logMeta = null) {
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

      if (records?.length && createdBy) {
        await logBudgetConfigAction({
          budgetId,
          actionType: 'tenure_group_added',
          description: 'Tenure group(s) added',
          performedBy: createdBy,
          oldValue: null,
          newValue: records,
          logMeta,
        });
      }

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
  static async removeTenureGroup(configTenureId, performedBy = null, logMeta = null) {
    try {
      const { data: existing } = await supabase
        .from('tblbudgetconfig_tenure_groups')
        .select('*')
        .eq('config_tenure_id', configTenureId)
        .single();

      const { error } = await supabase
        .from('tblbudgetconfig_tenure_groups')
        .delete()
        .eq('config_tenure_id', configTenureId);

      if (error) throw error;

      if (existing?.budget_id && performedBy) {
        await logBudgetConfigAction({
          budgetId: existing.budget_id,
          actionType: 'tenure_group_removed',
          description: 'Tenure group removed',
          performedBy,
          oldValue: existing,
          newValue: null,
          logMeta,
        });
      }

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
  static async setApprover(budgetId, approvalLevel, primaryApprover, backupApprover, createdBy, logMeta = null) {
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

        await logBudgetConfigAction({
          budgetId,
          actionType: 'approver_updated',
          description: `Approver updated for level ${approvalLevel}`,
          performedBy: createdBy,
          oldValue: existing,
          newValue: result,
          logMeta,
        });
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

        await logBudgetConfigAction({
          budgetId,
          actionType: 'approver_created',
          description: `Approver set for level ${approvalLevel}`,
          performedBy: createdBy,
          oldValue: null,
          newValue: result,
          logMeta,
        });
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
  static async removeApprover(approverId, performedBy = null, logMeta = null) {
    try {
      const { data: existing } = await supabase
        .from('tblbudgetconfig_approvers')
        .select('*')
        .eq('approver_id', approverId)
        .single();

      const { error } = await supabase
        .from('tblbudgetconfig_approvers')
        .delete()
        .eq('approver_id', approverId);

      if (error) throw error;

      if (existing?.budget_id && performedBy) {
        await logBudgetConfigAction({
          budgetId: existing.budget_id,
          actionType: 'approver_removed',
          description: `Approver removed for level ${existing.approval_level || ''}`.trim(),
          performedBy,
          oldValue: existing,
          newValue: null,
          logMeta,
        });
      }

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
  static async addAccessScope(budgetId, scopeType, scopeValue, createdBy, logMeta = null) {
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

      await logBudgetConfigAction({
        budgetId,
        actionType: 'access_scope_added',
        description: `Access scope added (${scopeType})`,
        performedBy: createdBy,
        oldValue: null,
        newValue: data?.[0] || null,
        logMeta,
      });

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
  static async removeAccessScope(scopeId, performedBy = null, logMeta = null) {
    try {
      const { data: existing } = await supabase
        .from('tblbudgetconfig_scopes')
        .select('*')
        .eq('scope_id', scopeId)
        .single();

      const { error } = await supabase
        .from('tblbudgetconfig_scopes')
        .delete()
        .eq('scope_id', scopeId);

      if (error) throw error;

      if (existing?.budget_id && performedBy) {
        await logBudgetConfigAction({
          budgetId: existing.budget_id,
          actionType: 'access_scope_removed',
          description: `Access scope removed (${existing.scope_type || ''})`.trim(),
          performedBy,
          oldValue: existing,
          newValue: null,
          logMeta,
        });
      }

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
      const { data, error } = await supabase
        .from('tblbudgetconfigurationlogs')
        .select('id, budget_id, action_type, description, performed_by, old_value, new_value, ip_address, user_agent, created_at')
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
   * Create organization
   */
  static async createOrganization(payload) {
    try {
      const {
        org_name,
        company_code,
        parent_org_id,
        org_description,
        created_by,
      } = payload || {};

      if (!org_name?.trim()) {
        return {
          success: false,
          error: 'org_name is required',
        };
      }

      let resolvedCompanyCode = company_code || null;
      if (parent_org_id && !resolvedCompanyCode) {
        const { data: parentOrg, error: parentError } = await supabase
          .from('tblorganization')
          .select('company_code')
          .eq('org_id', parent_org_id)
          .single();

        if (parentError) throw parentError;
        resolvedCompanyCode = parentOrg?.company_code || null;
      }

      const resolvedCreatedBy = getUserUUID(created_by) || getUserUUID('john-smith');
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('tblorganization')
        .insert([
          {
            org_name: org_name.trim(),
            company_code: resolvedCompanyCode,
            parent_org_id: parent_org_id || null,
            org_description: org_description?.trim() || null,
            created_by: resolvedCreatedBy,
            updated_by: resolvedCreatedBy,
            created_at: now,
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
      if (!orgId) {
        return {
          success: false,
          error: 'orgId is required',
        };
      }

      const {
        org_name,
        org_description,
        company_code,
        parent_org_id,
        updated_by,
      } = payload || {};

      const updateData = {
        ...(org_name !== undefined && { org_name: org_name?.trim() || '' }),
        ...(org_description !== undefined && { org_description: org_description?.trim() || null }),
        ...(company_code !== undefined && { company_code: company_code?.trim() || null }),
        ...(parent_org_id !== undefined && { parent_org_id: parent_org_id || null }),
        updated_at: new Date().toISOString(),
      };

      if (updated_by !== undefined) {
        updateData.updated_by = getUserUUID(updated_by) || getUserUUID('john-smith');
      }

      if (Object.keys(updateData).length === 1 && updateData.updated_at) {
        return {
          success: false,
          error: 'No fields provided to update',
        };
      }

      const { data, error } = await supabase
        .from('tblorganization')
        .update(updateData)
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
   * Delete organization (and descendants)
   */
  static async deleteOrganization(orgId) {
    try {
      if (!orgId) {
        return {
          success: false,
          error: 'orgId is required',
        };
      }

      const { data: orgRows, error: orgRowsError } = await supabase
        .from('tblorganization')
        .select('org_id, parent_org_id');

      if (orgRowsError) throw orgRowsError;

      const childrenMap = new Map();
      (orgRows || []).forEach((org) => {
        if (!childrenMap.has(org.parent_org_id)) {
          childrenMap.set(org.parent_org_id, []);
        }
        childrenMap.get(org.parent_org_id).push(org.org_id);
      });

      const orderedIds = [];
      const walk = (id) => {
        const children = childrenMap.get(id) || [];
        children.forEach((childId) => walk(childId));
        orderedIds.push(id);
      };
      walk(orgId);

      for (const id of orderedIds) {
        const { error } = await supabase
          .from('tblorganization')
          .delete()
          .eq('org_id', id);

        if (error) throw error;
      }

      return {
        success: true,
        data: { org_id: orgId, deleted_count: orderedIds.length },
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
   * Get all organization IDs under a given org (including itself)
   */
  static async getOrganizationSubtreeIds(rootOrgId) {
    try {
      if (!rootOrgId) {
        return { success: true, data: [] };
      }

      const { data, error } = await supabase
        .from('tblorganization')
        .select('org_id, parent_org_id');

      if (error) throw error;

      const childrenMap = new Map();
      (data || []).forEach((org) => {
        if (!childrenMap.has(org.parent_org_id)) {
          childrenMap.set(org.parent_org_id, []);
        }
        childrenMap.get(org.parent_org_id).push(org.org_id);
      });

      const result = new Set([rootOrgId]);
      const queue = [rootOrgId];

      while (queue.length) {
        const current = queue.shift();
        const children = childrenMap.get(current) || [];
        children.forEach((childId) => {
          if (!result.has(childId)) {
            result.add(childId);
            queue.push(childId);
          }
        });
      }

      return { success: true, data: Array.from(result) };
    } catch (error) {
      console.error('Error building organization subtree:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get organizations under a given org (including itself)
   */
  static async getOrganizationsByOrgId(rootOrgId) {
    try {
      const allResult = await this.getAllOrganizations();
      if (!allResult.success) return allResult;

      if (!rootOrgId) {
        return allResult;
      }

      const subtreeResult = await this.getOrganizationSubtreeIds(rootOrgId);
      if (!subtreeResult.success) return subtreeResult;

      const allowed = new Set(subtreeResult.data || []);
      const filtered = (allResult.data || []).filter((org) => allowed.has(org.org_id));

      return { success: true, data: filtered };
    } catch (error) {
      console.error('Error fetching organizations by org ID:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get budget IDs accessible to a given org ID
   */
  static async getBudgetIdsByOrgId(orgId) {
    try {
      if (!orgId) return { success: true, data: [] };

      const subtreeResult = await this.getOrganizationSubtreeIds(orgId);
      const allowedOrgIds = new Set(subtreeResult.data || [orgId]);

      const { data, error } = await supabase
        .from('tblbudgetconfiguration')
        .select('budget_id, access_ou, affected_ou');

      if (error) throw error;

      const allowed = (data || [])
        .filter((row) => {
          const accessMatch = Array.from(allowedOrgIds).some((id) => containsOrgId(row.access_ou, id));
          const affectedMatch = Array.from(allowedOrgIds).some((id) => containsOrgId(row.affected_ou, id));
          return accessMatch || affectedMatch;
        })
        .map((row) => row.budget_id);

      return { success: true, data: allowed };
    } catch (error) {
      console.error('Error fetching budget IDs by org:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Check if a budget config is accessible for an org
   */
  static async isBudgetConfigInOrg(budgetId, orgId) {
    try {
      if (!budgetId || !orgId) return { success: true, data: true };

      const subtreeResult = await this.getOrganizationSubtreeIds(orgId);
      const allowedOrgIds = new Set(subtreeResult.data || [orgId]);

      const { data, error } = await supabase
        .from('tblbudgetconfiguration')
        .select('budget_id, access_ou, affected_ou')
        .eq('budget_id', budgetId)
        .single();

      if (error) throw error;

      const allowed = Array.from(allowedOrgIds).some((id) =>
        containsOrgId(data.access_ou, id) || containsOrgId(data.affected_ou, id)
      );

      return { success: true, data: allowed };
    } catch (error) {
      console.error('Error checking budget org access:', error);
      return { success: false, error: error.message, data: false };
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
  static async getApproversByLevel(level, orgId = null) {
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

      const runApproverQuery = async (orgField) => {
        let query = supabase
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
              ${orgField},
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

        if (orgId) {
          query = query.eq(`tblusers.${orgField}`, orgId);
        }

        return { ...(await query), orgField };
      };

      let data;
      let error;
      let orgField = 'org_id';

      ({ data, error, orgField } = await runApproverQuery(orgField));

      if (error && error.code === '42703' && String(error.message || '').includes('org_id')) {
        ({ data, error, orgField } = await runApproverQuery('geo_id'));
      }

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
          org_id: userObj.org_id ?? userObj.geo_id ?? null,
          geo_id: userObj.geo_id ?? null,
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
  static async getAllUsers(orgId = null) {
    try {
      let query = supabase
        .from('tblusers')
        .select(`
          user_id,
          employee_id,
          first_name,
          last_name,
          email,
          geo_id,
          org_id,
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

      if (orgId) {
        query = query.eq('org_id', orgId);
      }

      const { data, error } = await query;

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
          geo_id: user.geo_id,
          org_id: user.org_id,
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
