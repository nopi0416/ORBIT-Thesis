import supabase, { supabaseSecondary } from '../config/database.js';
import { getUserDetailsFromUUID } from '../utils/userMapping.js';

/**
 * Approval Request Service
 * Handles all database operations for budget approval requests
 * Manages the multi-level approval workflow system
 */

export class ApprovalRequestService {
  static defaultCompanyId = 'caaa0000-0000-0000-0000-000000000001';

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

  static computeLineItemCounts(lineItems = []) {
    const lineItemsCount = Array.isArray(lineItems) ? lineItems.length : 0;
    const deductionCount = Array.isArray(lineItems)
      ? lineItems.filter((item) => Boolean(item?.is_deduction)).length
      : 0;
    const toBePaidCount = Math.max(0, lineItemsCount - deductionCount);

    return { lineItemsCount, deductionCount, toBePaidCount };
  }

  static computeApprovalStageStatus(approvals = [], overallStatus = '') {
    const normalizedOverall = String(overallStatus || '').toLowerCase();

    if (normalizedOverall === 'rejected' || normalizedOverall === 'completed') {
      return normalizedOverall;
    }

    const rejected = (approvals || []).find(
      (approval) => String(approval?.status || '').toLowerCase() === 'rejected'
    );
    if (rejected) return 'rejected';

    const statusByLevel = new Map(
      (approvals || []).map((approval) => [
        Number(approval?.approval_level),
        String(approval?.status || '').toLowerCase(),
      ])
    );

    const l1Approved = statusByLevel.get(1) === 'approved';
    const l2Approved = statusByLevel.get(2) === 'approved';
    const l3Approved = statusByLevel.get(3) === 'approved';
    const payrollStatus = statusByLevel.get(4);
    const payrollApproved = payrollStatus === 'approved' || payrollStatus === 'completed';

    if (payrollStatus === 'completed') return 'completed';

    if (payrollApproved) return 'pending_payment_completion';
    if (l1Approved && l2Approved && l3Approved) return 'pending_payroll_approval';
    if (normalizedOverall === 'draft') return 'draft';

    return 'ongoing_approval';
  }

  /**
   * Get employee details by EID and company ID
   */
  static async getEmployeeByEid(eid, companyId) {
    try {
      if (!supabaseSecondary) {
        return {
          success: false,
          error: 'Employee warehouse connection is not configured (SUPABASE_URL2/KEY2).',
        };
      }
      const company = companyId || this.defaultCompanyId;

      // Fetch employee data
      const { data: employeeData, error: employeeError } = await supabaseSecondary
        .from('tblemployee')
        .select('*')
        .eq('company_id', company)
        .eq('eid', eid)
        .maybeSingle();

      if (employeeError) throw employeeError;
      if (!employeeData) {
        return {
          success: false,
          error: 'Employee not found',
        };
      }

      // Fetch company data separately
      const { data: companyData, error: companyError } = await supabaseSecondary
        .from('tblcompany')
        .select('company_name, company_code')
        .eq('company_id', employeeData.company_id)
        .maybeSingle();

      if (companyError) {
        console.warn('Error fetching company data:', companyError);
      }

      // Merge company data into employee object
      const enrichedData = {
        ...employeeData,
        company_name: companyData?.company_name || '',
        company_code: companyData?.company_code || '',
      };

      return {
        success: true,
        data: enrichedData,
      };
    } catch (error) {
      console.error('Error fetching employee by EID:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get multiple employees by EIDs in batch (optimized for bulk uploads)
   * @param {Array<string>} eids - Array of employee IDs
   * @param {string} companyId - Company UUID
   * @returns {Object} { success: true, data: { found: [...], notFound: [...] } }
   */
  static async getEmployeesBatch(eids, companyId) {
    try {
      if (!supabaseSecondary) {
        return {
          success: false,
          error: 'Employee warehouse connection is not configured (SUPABASE_URL2/KEY2).',
        };
      }

      if (!eids || !Array.isArray(eids) || eids.length === 0) {
        return {
          success: false,
          error: 'Employee IDs array is required',
        };
      }

      const company = companyId || this.defaultCompanyId;

      // Fetch all employees in one query
      const { data: employeesData, error: employeesError } = await supabaseSecondary
        .from('tblemployee')
        .select('*')
        .eq('company_id', company)
        .in('eid', eids);

      if (employeesError) throw employeesError;

      // Get unique company IDs from found employees
      const companyIds = [...new Set(employeesData?.map(emp => emp.company_id).filter(Boolean) || [])];

      // Fetch company data for all found companies
      let companyDataMap = {};
      if (companyIds.length > 0) {
        const { data: companiesData, error: companiesError } = await supabaseSecondary
          .from('tblcompany')
          .select('company_id, company_name, company_code')
          .in('company_id', companyIds);

        if (companiesError) {
          console.warn('Error fetching company data:', companiesError);
        } else if (companiesData) {
          companyDataMap = companiesData.reduce((acc, company) => {
            acc[company.company_id] = company;
            return acc;
          }, {});
        }
      }

      // Enrich employees with company data
      const foundEmployees = (employeesData || []).map(emp => {
        const companyInfo = companyDataMap[emp.company_id] || {};
        return {
          ...emp,
          company_name: companyInfo.company_name || '',
          company_code: companyInfo.company_code || '',
        };
      });

      // Identify not found employee IDs
      const foundEids = foundEmployees.map(emp => emp.eid);
      const notFoundEids = eids.filter(eid => !foundEids.includes(eid));

      return {
        success: true,
        data: {
          found: foundEmployees,
          notFound: notFoundEids,
        },
      };
    } catch (error) {
      console.error('Error fetching employees in batch:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  static normalizeItemType(rawType) {
    if (!rawType) return 'bonus';
    const value = String(rawType).trim().toLowerCase();
    const mapping = {
      bonus: 'bonus',
      incentive: 'incentive',
      performance_bonus: 'bonus',
      'performance bonus': 'bonus',
      spot_award: 'bonus',
      'spot award': 'bonus',
      innovation_reward: 'bonus',
      'innovation reward': 'bonus',
      recognition: 'bonus',
    };

    return mapping[value] || 'bonus';
  }

  /**
   * Create a new approval request (DRAFT status)
   */
  static async createApprovalRequest(requestData) {
    try {
      console.log('[createApprovalRequest] Creating new request:', requestData);
      
      const {
        budget_id,
        description,
        total_request_amount,
        submitted_by,
        created_by,
      } = requestData;

      // Generate request number
      const requestNumber = await this.generateRequestNumber();
      console.log('[createApprovalRequest] Generated request number:', requestNumber);

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests')
        .insert([
          {
            budget_id,
            request_number: requestNumber,
            description,
            total_request_amount: parseFloat(total_request_amount),
            submitted_by,
            created_by,
            overall_status: 'draft',
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error('[createApprovalRequest] Database error:', error);
        throw error;
      }

      console.log('[createApprovalRequest] Request created successfully:', data[0]?.request_id);

      return {
        success: true,
        data: data[0],
        message: 'Approval request created successfully',
      };
    } catch (error) {
      console.error('[createApprovalRequest] Error creating approval request:', error);
      console.error('[createApprovalRequest] Error stack:', error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate unique request number
   */
  static async generateRequestNumber() {
    try {
      const year = new Date().getFullYear();
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests')
        .select('request_number', { count: 'exact' })
        .like('request_number', `REQ-${year}-%`);

      if (error) throw error;

      const count = data?.length || 0;
      const nextNumber = String(count + 1).padStart(6, '0');
      return `REQ-${year}-${nextNumber}`;
    } catch (error) {
      console.error('Error generating request number:', error);
      // Fallback to timestamp-based number
      return `REQ-${Date.now()}`;
    }
  }

  /**
   * Get approval request by ID with all related data
   */
  static async getApprovalRequestById(requestId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests')
        .select('*')
        .eq('request_id', requestId)
        .single();

      if (error) throw error;

      // Fetch related data in parallel
      const [lineItems, approvals, attachments, activityLog] = await Promise.all([
        this.getLineItemsByRequestId(requestId),
        this.getApprovalsByRequestId(requestId),
        this.getAttachmentsByRequestId(requestId),
        this.getActivityLogByRequestId(requestId),
      ]);

      const lineItemsData = lineItems.data || [];
      const approvalsData = approvals.data || [];
      const { lineItemsCount, deductionCount, toBePaidCount } = this.computeLineItemCounts(lineItemsData);
      const approvalStageStatus = this.computeApprovalStageStatus(approvalsData, data?.overall_status);

      let submitterName = null;
      try {
        const userMap = await this.getUserNameMap([data?.submitted_by || data?.created_by]);
        submitterName = userMap.get(data?.submitted_by || data?.created_by) || null;
      } catch (lookupError) {
        console.warn('[getApprovalRequestById] User lookup failed:', lookupError?.message || lookupError);
      }
      const submitterDetails = submitterName
        ? { name: submitterName }
        : getUserDetailsFromUUID(data?.submitted_by || data?.created_by);

      return {
        success: true,
        data: {
          ...data,
          line_items: lineItemsData,
          approvals: approvalsData,
          attachments: attachments.data || [],
          activity_log: activityLog.data || [],
          line_items_count: lineItemsCount,
          deduction_count: deductionCount,
          to_be_paid_count: toBePaidCount,
          approval_stage_status: approvalStageStatus,
          submitted_by_name: submitterDetails?.name || data?.submitted_by,
        },
      };
    } catch (error) {
      console.error('Error fetching approval request:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all approval requests with optional filters
   */
  static async getAllApprovalRequests(filters = {}) {
    try {
      let query = supabase
        .from('tblbudgetapprovalrequests')
        .select('*');

      // Apply filters
      if (filters.budget_id) {
        query = query.eq('budget_id', filters.budget_id);
      }

      if (filters.budget_ids && Array.isArray(filters.budget_ids)) {
        query = query.in('budget_id', filters.budget_ids);
      }

      if (filters.status) {
        query = query.eq('overall_status', filters.status);
      }

      if (filters.submitted_by) {
        query = query.eq('submitted_by', filters.submitted_by);
      }

      if (filters.search) {
        query = query.or(
          `request_number.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) throw error;

      // Get unique budget IDs from the requests
      const budgetIds = [...new Set((data || []).map(req => req.budget_id).filter(Boolean))];
      
      // Fetch budget configurations separately
      let budgetConfigMap = {};
      if (budgetIds.length > 0) {
        const { data: budgetConfigs, error: budgetError } = await supabase
          .from('tblbudgetconfiguration')
          .select('budget_id, budget_name, budget_description')
          .in('budget_id', budgetIds);
        
        if (!budgetError && budgetConfigs) {
          budgetConfigMap = budgetConfigs.reduce((acc, config) => {
            acc[config.budget_id] = config;
            return acc;
          }, {});
        }
      }

      const requestIds = (data || []).map((request) => request.request_id).filter(Boolean);
      const countsMap = new Map();
      const approvalsMap = new Map();

      if (requestIds.length > 0) {
        const { data: lineItemRows, error: lineItemError } = await supabase
          .from('tblbudgetapprovalrequests_line_items')
          .select('request_id, is_deduction')
          .in('request_id', requestIds);

        if (lineItemError) throw lineItemError;

        (lineItemRows || []).forEach((row) => {
          const current = countsMap.get(row.request_id) || { line_items_count: 0, deduction_count: 0 };
          current.line_items_count += 1;
          if (row.is_deduction) current.deduction_count += 1;
          countsMap.set(row.request_id, current);
        });

        const { data: approvalRows, error: approvalError } = await supabase
          .from('tblbudgetapprovalrequests_approvals')
          .select('request_id, approval_level, status, is_self_request')
          .in('request_id', requestIds);

        if (approvalError) throw approvalError;

        (approvalRows || []).forEach((row) => {
          const existing = approvalsMap.get(row.request_id) || [];
          existing.push(row);
          approvalsMap.set(row.request_id, existing);
        });
      }

      // Merge budget config data with requests
      const userIds = (data || []).flatMap((request) => [request?.submitted_by, request?.created_by]).filter(Boolean);
      let userNameMap = new Map();
      try {
        userNameMap = await this.getUserNameMap(userIds);
      } catch (lookupError) {
        console.warn('[getAllApprovalRequests] User lookup failed:', lookupError?.message || lookupError);
      }

      const normalizedData = (data || []).map((request) => {
        const counts = countsMap.get(request.request_id) || { line_items_count: 0, deduction_count: 0 };
        const toBePaidCount = Math.max(0, counts.line_items_count - counts.deduction_count);
        const approvalsForRequest = approvalsMap.get(request.request_id) || [];
        const approvalStageStatus = this.computeApprovalStageStatus(approvalsForRequest, request?.overall_status);
        const submitterId = request?.submitted_by || request?.created_by;
        const submitterName = userNameMap.get(submitterId) || null;
        const submitterDetails = submitterName ? { name: submitterName } : getUserDetailsFromUUID(submitterId);

        return {
          ...request,
          budget_name: budgetConfigMap[request.budget_id]?.budget_name || null,
          budget_description: budgetConfigMap[request.budget_id]?.budget_description || null,
          line_items_count: counts.line_items_count,
          deduction_count: counts.deduction_count,
          to_be_paid_count: toBePaidCount,
          approval_stage_status: approvalStageStatus,
          approvals: approvalsForRequest,
          submitted_by_name: submitterDetails?.name || request?.submitted_by,
        };
      });

      const stageFilterRaw = String(filters.approval_stage_status || '').toLowerCase();
      const stageFilterList = stageFilterRaw
        ? stageFilterRaw.split(',').map((value) => value.trim()).filter(Boolean)
        : [];
      const filteredByStage = stageFilterList.length && !stageFilterList.includes('all')
        ? normalizedData.filter((request) =>
            stageFilterList.includes(String(request.approval_stage_status || '').toLowerCase())
          )
        : normalizedData;

      return {
        success: true,
        data: filteredByStage,
      };
    } catch (error) {
      console.error('Error fetching approval requests:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update approval request main fields
   */
  static async updateApprovalRequest(requestId, updateData) {
    try {
      const {
        description,
        total_request_amount,
        overall_status,
        submission_status,
        attachment_count,
        employee_count,
        current_budget_used,
        remaining_budget,
        will_exceed_budget,
        excess_amount,
        updated_by,
      } = updateData;

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests')
        .update({
          ...(description && { description }),
          ...(total_request_amount !== undefined && {
            total_request_amount: parseFloat(total_request_amount),
          }),
          ...(overall_status && { overall_status }),
          ...(submission_status && { submission_status }),
          ...(attachment_count !== undefined && { attachment_count }),
          ...(employee_count !== undefined && { employee_count }),
          ...(current_budget_used !== undefined && {
            current_budget_used: parseFloat(current_budget_used),
          }),
          ...(remaining_budget !== undefined && {
            remaining_budget: parseFloat(remaining_budget),
          }),
          ...(will_exceed_budget !== undefined && { will_exceed_budget }),
          ...(excess_amount !== undefined && {
            excess_amount: excess_amount ? parseFloat(excess_amount) : null,
          }),
          updated_by,
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: data[0],
        message: 'Approval request updated successfully',
      };
    } catch (error) {
      console.error('Error updating approval request:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Submit approval request (change from DRAFT to SUBMITTED)
   */
  static async submitApprovalRequest(requestId, submittedBy) {
    try {
      console.log('[submitApprovalRequest] Starting submission for request:', requestId, 'by:', submittedBy);
      
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests')
        .update({
          overall_status: 'submitted',
          submission_status: 'completed',
          submitted_date: new Date().toISOString(),
          updated_by: submittedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId)
        .select();

      if (error) {
        console.error('[submitApprovalRequest] Database error updating request:', error);
        throw error;
      }
      
      console.log('[submitApprovalRequest] Request updated to submitted status');

      console.log('[submitApprovalRequest] Request updated to submitted status');

      // Run these operations in parallel for better performance
      console.log('[submitApprovalRequest] Running parallel operations: activity log, workflow init, auto-approval check');
      const [activityResult, workflowResult, autoApprovalResult] = await Promise.allSettled([
        this.addActivityLog(requestId, 'submitted', submittedBy),
        this.initializeApprovalWorkflow(requestId),
        this.checkAndAutoApproveL1(requestId, submittedBy),
      ]);

      console.log('[submitApprovalRequest] Parallel operations completed');
      
      // Log any errors but don't fail the submission
      if (activityResult.status === 'rejected') {
        console.warn('Activity log failed:', activityResult.reason);
      }
      if (workflowResult.status === 'rejected') {
        console.warn('Workflow initialization failed:', workflowResult.reason);
      }

      const autoApproved = autoApprovalResult.status === 'fulfilled' && autoApprovalResult.value?.autoApproved;
      
      console.log('[submitApprovalRequest] Submission complete. Auto-approved:', autoApproved);

      return {
        success: true,
        data: data[0],
        autoApproved: autoApproved || false,
        message: autoApproved 
          ? 'Approval request submitted and L1 auto-approved (Self-Request)' 
          : 'Approval request submitted successfully',
      };
    } catch (error) {
      console.error('[submitApprovalRequest] Error submitting approval request:', error);
      console.error('[submitApprovalRequest] Error stack:', error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Initialize approval workflow for levels
   */
  static async initializeApprovalWorkflow(requestId) {
    try {
      // Get budget configuration first
      const { data: request, error: reqError } = await supabase
        .from('tblbudgetapprovalrequests')
        .select('budget_id')
        .eq('request_id', requestId)
        .single();

      if (reqError) throw reqError;

      // Get approvers for the budget configuration
      const { data: approvers, error: approverError } = await supabase
        .from('tblbudgetconfig_approvers')
        .select('approval_level, primary_approver, backup_approver')
        .eq('budget_id', request?.budget_id);

      if (approverError) throw approverError;

      // Create approval records for each level
      const approvalRecords = approvers.map((approver) => ({
        request_id: requestId,
        approval_level: approver.approval_level,
        approval_level_name: `L${approver.approval_level}`,
        assigned_to_primary: approver.primary_approver,
        assigned_to_backup: approver.backup_approver,
        status: 'pending',
        order_index: approver.approval_level,
        created_at: new Date().toISOString(),
      }));

      // Add payroll level if not exists
      if (!approvers.find((a) => a.approval_level === 4)) {
        approvalRecords.push({
          request_id: requestId,
          approval_level: 4,
          approval_level_name: 'Payroll',
          status: 'pending',
          order_index: 4,
          created_at: new Date().toISOString(),
        });
      }

      const { error: insertError } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .insert(approvalRecords);

      if (insertError && insertError.code !== '23505') {
        // 23505 = unique violation (already exists)
        throw insertError;
      }

      return {
        success: true,
        message: 'Approval workflow initialized',
      };
    } catch (error) {
      console.error('Error initializing approval workflow:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if submitter is L1 approver and auto-approve (Self-Request)
   */
  static async checkAndAutoApproveL1(requestId, submittedBy) {
    try {
      // Get request budget id
      const { data: request, error: reqError } = await supabase
        .from('tblbudgetapprovalrequests')
        .select('budget_id, submitted_by, created_by')
        .eq('request_id', requestId)
        .single();

      if (reqError) throw reqError;

      const effectiveSubmittedBy = String(submittedBy || request?.submitted_by || request?.created_by || '').trim();
      if (!effectiveSubmittedBy) {
        return { autoApproved: false };
      }

      // Get L1 approvers for the budget configuration
      const { data: l1Approvers, error: approverError } = await supabase
        .from('tblbudgetconfig_approvers')
        .select('primary_approver, backup_approver')
        .eq('budget_id', request?.budget_id)
        .eq('approval_level', 1);

      if (approverError) throw approverError;

      // Check if submittedBy matches any L1 approver UUID
      const isL1Approver = l1Approvers.some((approver) => {
        const primary = String(approver.primary_approver || '').trim();
        const backup = String(approver.backup_approver || '').trim();
        return primary === effectiveSubmittedBy || backup === effectiveSubmittedBy;
      });

      if (!isL1Approver) {
        return { autoApproved: false };
      }

      // Auto-approve L1 level and update request status in parallel
      const [approvalUpdate, requestUpdate, activityLog] = await Promise.all([
        supabase
          .from('tblbudgetapprovalrequests_approvals')
          .update({
            status: 'approved',
            approved_by: effectiveSubmittedBy,
            approver_name: 'Self',
            approver_title: 'L1 Approver (Self-Request)',
            approval_notes: 'Auto-approved: Self-request by L1 approver',
            approval_date: new Date().toISOString(),
            is_self_request: true,
            updated_at: new Date().toISOString(),
          })
          .eq('request_id', requestId)
          .eq('approval_level', 1),
        supabase
          .from('tblbudgetapprovalrequests')
          .update({
            overall_status: 'in_progress',
            updated_at: new Date().toISOString(),
          })
          .eq('request_id', requestId),
        this.addActivityLog(requestId, 'approved', effectiveSubmittedBy, 'Auto-approved: Self-request by L1 approver')
      ]);

      if (approvalUpdate.error) throw approvalUpdate.error;

      console.log(`[Auto-Approve] L1 auto-approved for request ${requestId} (Self-Request)`);

      return { autoApproved: true };
    } catch (error) {
      console.error('Error in L1 auto-approval check:', error);
      // Don't fail the entire submission if auto-approval fails
      return { autoApproved: false };
    }
  }

  /**
   * Add line item to request
   */
  static async addLineItem(requestId, lineItemData) {
    try {
      const {
        item_number,
        employee_id,
        employee_name,
        department,
        position,
        item_type,
        item_description,
        amount,
        is_deduction,
        notes,
        created_by,
      } = lineItemData;

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_line_items')
        .insert([
          {
            request_id: requestId,
            item_number,
            employee_id,
            employee_name,
            department,
            position,
            item_type: this.normalizeItemType(item_type),
            item_description,
            amount: parseFloat(amount),
            is_deduction: is_deduction || false,
            notes,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      // Log activity
      await this.addActivityLog(requestId, 'line_item_added', created_by);

      return {
        success: true,
        data: data[0],
        message: 'Line item added successfully',
      };
    } catch (error) {
      console.error('Error adding line item:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Add multiple line items (bulk import)
   */
  static async addLineItemsBulk(requestId, lineItems, createdBy) {
    try {
      console.log('[addLineItemsBulk] Starting bulk insert');
      console.log('[addLineItemsBulk] Request ID:', requestId);
      console.log('[addLineItemsBulk] Created by:', createdBy);
      console.log('[addLineItemsBulk] Line items received:', Array.isArray(lineItems) ? lineItems.length : 'NOT AN ARRAY');
      
      if (!Array.isArray(lineItems)) {
        console.error('[addLineItemsBulk] lineItems is not an array:', typeof lineItems, lineItems);
        throw new Error('lineItems must be an array');
      }
      
      if (lineItems.length === 0) {
        console.error('[addLineItemsBulk] lineItems array is empty');
        throw new Error('lineItems array cannot be empty');
      }
      
      console.log('[addLineItemsBulk] First item structure:', JSON.stringify(lineItems[0], null, 2));
      
      const records = lineItems.map((item, index) => ({
        request_id: requestId,
        item_number: index + 1,
        employee_id: item.employee_id || '',
        employee_name: item.employee_name || '',
        department: item.department || '',
        position: item.position || '',
        item_type: this.normalizeItemType(item.item_type || 'bonus'),
        item_description: item.item_description || item.notes || null,
        amount: parseFloat(item.amount) || 0,
        is_deduction: item.is_deduction || item.amount < 0,
        has_warning: item.has_warning || false,
        warning_reason: item.warning_reason || '',
        notes: item.notes || null,
        // New fields from updated schema
        email: item.email || null,
        employee_status: item.employee_status || item.employeeStatus || null,
        geo: item.geo || null,
        Location: item.location || item.Location || null,
        hire_date: item.hire_date || item.hireDate || null,
        termination_date: item.termination_date || item.terminationDate || null,
        created_at: new Date().toISOString(),
      }));

      console.log('[addLineItemsBulk] Mapped records count:', records.length);
      console.log('[addLineItemsBulk] First mapped record:', JSON.stringify(records[0], null, 2));
      console.log('[addLineItemsBulk] Inserting records into database...');
      
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_line_items')
        .insert(records)
        .select();

      if (error) {
        console.error('[addLineItemsBulk] Database error:', error);
        console.error('[addLineItemsBulk] Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('[addLineItemsBulk] Line items inserted successfully:', data?.length || 0);
      console.log('[addLineItemsBulk] Updating employee count...');
      
      // Update request with employee count
      await this.updateApprovalRequest(requestId, {
        employee_count: lineItems.length,
        updated_by: createdBy,
      });

      // Log activity
      await this.addActivityLog(requestId, 'line_item_added', createdBy);

      console.log('[addLineItemsBulk] Bulk insert complete:', data.length, 'items added');

      return {
        success: true,
        data,
        message: `${data.length} line items added successfully`,
      };
    } catch (error) {
      console.error('[addLineItemsBulk] ❌ ERROR IN BULK INSERT ❌');
      console.error('[addLineItemsBulk] Error type:', error.constructor.name);
      console.error('[addLineItemsBulk] Error message:', error.message);
      console.error('[addLineItemsBulk] Error stack:', error.stack);
      console.error('[addLineItemsBulk] Full error:', JSON.stringify(error, null, 2));
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get line items for request
   */
  static async getLineItemsByRequestId(requestId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_line_items')
        .select('*')
        .eq('request_id', requestId)
        .order('item_number', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching line items:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Approve request at a specific level
   */
  static async approveRequestAtLevel(requestId, approvalLevel, approvalData) {
    try {
      const {
        approved_by,
        approver_name,
        approver_title,
        approval_notes,
        conditions_applied,
      } = approvalData;

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .update({
          status: 'approved',
          approved_by,
          approver_name,
          approver_title,
          approval_decision: 'approved',
          approval_notes,
          conditions_applied,
          approval_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId)
        .eq('approval_level', approvalLevel)
        .select();

      if (error) throw error;

      const allApprovalsComplete = await this.checkAllApprovalsComplete(requestId);
      const approvalsSnapshot = await this.getApprovalsByRequestId(requestId);
      const approvalStageStatus = this.computeApprovalStageStatus(
        approvalsSnapshot.data || [],
        allApprovalsComplete ? 'approved' : 'in_progress'
      );
      const overallStatus = allApprovalsComplete ? 'approved' : 'in_progress';

      await this.updateApprovalRequest(requestId, {
        overall_status: overallStatus,
        ...(allApprovalsComplete && { approved_date: new Date().toISOString() }),
        updated_by: approved_by,
      });

      // Log activity
      await this.addActivityLog(
        requestId,
        'approved',
        approved_by,
        `Approved at level ${approvalLevel}`
      );

      return {
        success: true,
        data: data[0],
        message: `Request approved at level ${approvalLevel}`,
      };
    } catch (error) {
      console.error('Error approving request:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Reject request at a specific level
   */
  static async rejectRequestAtLevel(requestId, approvalLevel, rejectionData) {
    try {
      const { rejected_by, approver_name, rejection_reason } = rejectionData;

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .update({
          status: 'rejected',
          approved_by: rejected_by,
          approver_name,
          approval_decision: 'rejected',
          approval_notes: rejection_reason,
          approval_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId)
        .eq('approval_level', approvalLevel)
        .select();

      if (error) throw error;

      // Update main request status to rejected
      await this.updateApprovalRequest(requestId, {
        overall_status: 'rejected',
        updated_by: rejected_by,
      });

      // Log activity
      await this.addActivityLog(
        requestId,
        'rejected',
        rejected_by,
        `Rejected at level ${approvalLevel}: ${rejection_reason}`
      );

      return {
        success: true,
        data: data[0],
        message: `Request rejected at level ${approvalLevel}`,
      };
    } catch (error) {
      console.error('Error rejecting request:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Complete payroll payment for a request (Payroll step 2)
   */
  static async completePayrollPayment(requestId, completionData) {
    try {
      const { completed_by, approver_name, approval_notes } = completionData;

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .update({
          status: 'approved',
          approved_by: completed_by,
          approver_name,
          approval_decision: 'approved',
          approval_notes: approval_notes || 'Payment completed',
          approval_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId)
        .eq('approval_level', 4)
        .select();

      if (error) throw error;

      await this.updateApprovalRequest(requestId, {
        overall_status: 'completed',
        submission_status: 'completed',
        updated_by: completed_by,
      });

      await this.addActivityLog(
        requestId,
        'payment_completed',
        completed_by,
        'Payroll payment completed'
      );

      return {
        success: true,
        data: data[0],
        message: 'Payroll payment completed',
      };
    } catch (error) {
      console.error('Error completing payroll payment:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get approvals for request
   */
  static async getApprovalsByRequestId(requestId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .select('*')
        .eq('request_id', requestId)
        .order('approval_level', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching approvals:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Check if all required approvals are complete
   */
  static async checkAllApprovalsComplete(requestId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .select('status')
        .eq('request_id', requestId)
        .neq('status', 'approved');

      if (error) throw error;

      return data.length === 0; // No pending/rejected/escalated
    } catch (error) {
      console.error('Error checking approvals:', error);
      return false;
    }
  }

  /**
   * Add attachment
   */
  static async addAttachment(requestId, attachmentData) {
    try {
      const {
        file_name,
        file_type,
        file_size_bytes,
        storage_path,
        storage_provider,
        file_purpose,
        uploaded_by,
      } = attachmentData;

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_attachments')
        .insert([
          {
            request_id: requestId,
            file_name,
            file_type,
            file_size_bytes,
            storage_path,
            storage_provider,
            file_purpose,
            uploaded_by,
            uploaded_date: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      // Update attachment count
      const { data: requestData } = await supabase
        .from('tblbudgetapprovalrequests')
        .select('attachment_count')
        .eq('request_id', requestId)
        .single();

      await this.updateApprovalRequest(requestId, {
        attachment_count: (requestData?.attachment_count || 0) + 1,
        updated_by: uploaded_by,
      });

      // Log activity
      await this.addActivityLog(requestId, 'attachment_added', uploaded_by);

      return {
        success: true,
        data: data[0],
        message: 'Attachment added successfully',
      };
    } catch (error) {
      console.error('Error adding attachment:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get attachments for request
   */
  static async getAttachmentsByRequestId(requestId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_attachments_logs')
        .select('*')
        .eq('request_id', requestId);

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching attachments:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Add activity log entry
   */
  static async addActivityLog(requestId, actionType, performedBy, description = '') {
    try {
      const { error } = await supabase
        .from('tblbudgetapprovalrequests_activity_log')
        .insert([
          {
            request_id: requestId,
            action_type: actionType,
            description,
            performed_by: performedBy,
            performed_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error adding activity log:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get activity log for request
   */
  static async getActivityLogByRequestId(requestId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_activity_log')
        .select('*')
        .eq('request_id', requestId)
        .order('performed_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching activity log:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get approvals pending for a user
   */
  static async getPendingApprovalsForUser(userId, budgetIds = null) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .select('*')
        .or(`assigned_to_primary.eq.${userId},assigned_to_backup.eq.${userId}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filtered = data || [];
      if (Array.isArray(budgetIds)) {
        if (!budgetIds.length) {
          return { success: true, data: [] };
        }

        const requestIds = filtered.map((row) => row.request_id).filter(Boolean);
        if (!requestIds.length) {
          return { success: true, data: [] };
        }

        const { data: requestRows, error: requestError } = await supabase
          .from('tblbudgetapprovalrequests')
          .select('request_id, budget_id')
          .in('request_id', requestIds);

        if (requestError) throw requestError;

        const budgetMap = new Map((requestRows || []).map((row) => [row.request_id, row.budget_id]));
        filtered = filtered.filter((row) => budgetIds.includes(budgetMap.get(row.request_id)));
      }

      return {
        success: true,
        data: filtered,
      };
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Delete approval request
   */
  static async deleteApprovalRequest(requestId) {
    try {
      const { error } = await supabase
        .from('tblbudgetapprovalrequests')
        .delete()
        .eq('request_id', requestId);

      if (error) throw error;

      return {
        success: true,
        message: 'Approval request deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting approval request:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default ApprovalRequestService;
