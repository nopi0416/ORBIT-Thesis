import supabase, { supabaseSecondary } from '../config/database.js';

/**
 * Approval Request Service
 * Handles all database operations for budget approval requests
 * Manages the multi-level approval workflow system
 */

export class ApprovalRequestService {
  static defaultCompanyId = 'caaa0000-0000-0000-0000-000000000001';

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

      const { data, error } = await supabaseSecondary
        .from('tblemployee')
        .select('*')
        .eq('company_id', company)
        .eq('eid', eid)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return {
          success: false,
          error: 'Employee not found',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching employee by EID:', error);
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
      const {
        budget_id,
        description,
        total_request_amount,
        submitted_by,
        created_by,
      } = requestData;

      // Generate request number
      const requestNumber = await this.generateRequestNumber();

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

      if (error) throw error;

      return {
        success: true,
        data: data[0],
        message: 'Approval request created successfully',
      };
    } catch (error) {
      console.error('Error creating approval request:', error);
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

      return {
        success: true,
        data: {
          ...data,
          line_items: lineItems.data || [],
          approvals: approvals.data || [],
          attachments: attachments.data || [],
          activity_log: activityLog.data || [],
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
      let query = supabase.from('tblbudgetapprovalrequests').select('*');

      // Apply filters
      if (filters.budget_id) {
        query = query.eq('budget_id', filters.budget_id);
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

      return {
        success: true,
        data,
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

      if (error) throw error;

      // Log activity
      await this.addActivityLog(requestId, 'submitted', submittedBy);

      // Create approval levels
      await this.initializeApprovalWorkflow(requestId);

      return {
        success: true,
        data: data[0],
        message: 'Approval request submitted successfully',
      };
    } catch (error) {
      console.error('Error submitting approval request:', error);
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
      // Get budget configuration with approvers
      const { data: request, error: reqError } = await supabase
        .from('tblbudgetapprovalrequests')
        .select('budget_id')
        .eq('request_id', requestId)
        .single();

      if (reqError) throw reqError;

      // Get approvers from budget config
      const { data: approvers, error: appError } = await supabase
        .from('tblbudgetconfig_approvers')
        .select('*')
        .eq('budget_id', request.budget_id)
        .order('approval_level', { ascending: true });

      if (appError) throw appError;

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
      const records = lineItems.map((item, index) => ({
        request_id: requestId,
        item_number: index + 1,
        employee_id: item.employee_id,
        employee_name: item.employee_name,
        department: item.department,
        position: item.position,
        item_type: this.normalizeItemType(item.item_type),
        item_description: item.item_description,
        amount: parseFloat(item.amount),
        is_deduction: item.is_deduction || item.amount < 0,
        has_warning: item.has_warning || false,
        warning_reason: item.warning_reason,
        notes: item.notes,
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_line_items')
        .insert(records)
        .select();

      if (error) throw error;

      // Update request with employee count
      await this.updateApprovalRequest(requestId, {
        employee_count: lineItems.length,
        updated_by: createdBy,
      });

      // Log activity
      await this.addActivityLog(requestId, 'line_item_added', createdBy);

      return {
        success: true,
        data,
        message: `${data.length} line items added successfully`,
      };
    } catch (error) {
      console.error('Error adding line items:', error);
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

      // Check if all approvals are complete
      const allApprovalsComplete = await this.checkAllApprovalsComplete(requestId);
      if (allApprovalsComplete) {
        // Update main request status
        await this.updateApprovalRequest(requestId, {
          overall_status: 'approved',
          approved_date: new Date().toISOString(),
          updated_by: approved_by,
        });
      } else {
        // Update to in_progress if not already
        await this.updateApprovalRequest(requestId, {
          overall_status: 'in_progress',
          updated_by: approved_by,
        });
      }

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
  static async getPendingApprovalsForUser(userId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .select('*')
        .or(`assigned_to_primary.eq.${userId},assigned_to_backup.eq.${userId}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data,
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
