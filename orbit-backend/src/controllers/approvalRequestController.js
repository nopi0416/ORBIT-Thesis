import ApprovalRequestService from '../services/approvalRequestService.js';
import { BudgetConfigService } from '../services/budgetConfigService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { broadcast } from '../realtime/websocketServer.js';

const normalizeRole = (role) => String(role || '').toLowerCase();
const isAdminUser = (req) => {
  const role = normalizeRole(req.user?.role);
  return req.user?.userType === 'admin' || ['admin', 'administrator', 'system admin', 'system administrator'].includes(role);
};

/**
 * Approval Request Controller
 * Handles HTTP requests for approval workflows
 */

export class ApprovalRequestController {
  /**
   * Get notification list for requestor/approver dashboards
   * GET /api/approval-requests/notifications
   */
  static async getUserNotifications(req, res) {
    try {
      const userId = req.user?.id;
      const roleRaw = req.user?.role || req.user?.userType || req.query.role || 'requestor';
      const role = String(roleRaw || '').toLowerCase();
      const orgId = req.user?.org_id || null;

      if (!userId) {
        return sendError(res, 'User ID is required', 400);
      }

      let allowedBudgetIds = null;
      if (orgId) {
        const allowedBudgets = await BudgetConfigService.getBudgetIdsByOrgId(orgId);
        const budgetIds = allowedBudgets.data || [];
        if (!budgetIds.length) {
          return sendSuccess(res, [], 'Notifications retrieved', 200);
        }
        allowedBudgetIds = budgetIds;
      }

      const result = await ApprovalRequestService.getUserNotifications({
        userId,
        role,
        allowedBudgetIds,
      });

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      return sendSuccess(res, result.data, 'Notifications retrieved', 200);
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * PATCH /api/approval-requests/notifications/:notificationId/read
   */
  static async markNotificationRead(req, res) {
    try {
      const userId = req.user?.id;
      const { notificationId } = req.params;

      if (!userId) {
        return sendError(res, 'User ID is required', 400);
      }

      const result = await ApprovalRequestService.markNotificationAsRead(notificationId, userId);
      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      return sendSuccess(res, result.data, 'Notification marked as read', 200);
    } catch (error) {
      console.error('Error in markNotificationRead:', error);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * PATCH /api/approval-requests/notifications/read-all
   */
  static async markAllNotificationsRead(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, 'User ID is required', 400);
      }

      const result = await ApprovalRequestService.markAllNotificationsAsRead(userId);
      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      return sendSuccess(res, result.data, 'All notifications marked as read', 200);
    } catch (error) {
      console.error('Error in markAllNotificationsRead:', error);
      return sendError(res, error.message, 500);
    }
  }
  /**
   * Get employee by EID (company scoped)
   * GET /api/approval-requests/employees/:eid?company_id=uuid
   */
  static async getEmployeeByEid(req, res) {
    try {
      const { eid } = req.params;
      const { company_id } = req.query;

      if (!eid) {
        return sendError(res, 'Employee ID is required', 400);
      }

      const result = await ApprovalRequestService.getEmployeeByEid(eid, company_id);

      if (!result.success) {
        return sendError(res, result.error, 404);
      }

      sendSuccess(res, result.data, 'Employee retrieved', 200);
    } catch (error) {
      console.error('Error in getEmployeeByEid:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Get multiple employees by EIDs in batch
   * POST /api/approval-requests/employees/batch
   * Body: { eids: ['EMP001', 'EMP002', ...], company_id: 'uuid' }
   */
  static async getEmployeesBatch(req, res) {
    try {
      const { eids, company_id } = req.body;

      if (!eids || !Array.isArray(eids) || eids.length === 0) {
        return sendError(res, 'Employee IDs array is required', 400);
      }

      // Limit batch size to prevent abuse
      if (eids.length > 500) {
        return sendError(res, 'Maximum 500 employees per batch request', 400);
      }

      const result = await ApprovalRequestService.getEmployeesBatch(eids, company_id);

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      sendSuccess(res, result.data, `Found ${result.data.found.length} of ${eids.length} employees`, 200);
    } catch (error) {
      console.error('Error in getEmployeesBatch:', error);
      sendError(res, error.message, 500);
    }
  }
  /**
   * Create new approval request (DRAFT)
   * POST /api/approval-requests
   */
  static async createApprovalRequest(req, res) {
    try {
      const {
        budget_id,
        description,
        total_request_amount,
        client_sponsored,
        is_client_sponsored,
      } = req.body;
      const userId = req.user?.id || req.body.submitted_by || req.body.created_by;
      const orgId = req.user?.org_id || null;

      // Validate required fields
      if (!budget_id || !total_request_amount || !userId) {
        return sendError(res, 'Missing required fields: budget_id, total_request_amount, submitted_by', 400);
      }

      if (orgId) {
        const accessCheck = await BudgetConfigService.isBudgetConfigInOrg(budget_id, orgId);
        if (!accessCheck.success || !accessCheck.data) {
          return sendError(res, 'Access denied for this budget configuration', 403);
        }
      }

      const budgetConfigResult = await BudgetConfigService.getBudgetConfigById(budget_id);
      if (!budgetConfigResult.success) {
        return sendError(res, budgetConfigResult.error || 'Budget configuration not found', 404);
      }

      const userAccessResult = await BudgetConfigService.canUserAccessBudgetConfig({
        budgetConfig: budgetConfigResult.data,
        userId,
        userRole: req.user?.role,
        orgId,
        isAdmin: isAdminUser(req),
      });

      if (!userAccessResult.success) {
        return sendError(res, userAccessResult.error || 'Failed to validate budget configuration access', 500);
      }

      if (!userAccessResult.data) {
        return sendError(res, 'Access denied: you are not authorized to submit requests for this budget configuration', 403);
      }

      const result = await ApprovalRequestService.createApprovalRequest({
        budget_id,
        description,
        total_request_amount,
        submitted_by: userId,
        created_by: userId,
        is_client_sponsored: is_client_sponsored ?? client_sponsored,
      });

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      broadcast('approval_request_updated', {
        action: 'created',
        request_id: result.data?.request_id || result.data?.id,
        budget_id,
        submitted_by: userId,
      });

      sendSuccess(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Error in createApprovalRequest:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Get approval request by ID
   * GET /api/approval-requests/:id
   */
  static async getApprovalRequest(req, res) {
    try {
      const { id } = req.params;

      const result = await ApprovalRequestService.getApprovalRequestById(id);

      if (!result.success) {
        return sendError(res, result.error, 404);
      }

      sendSuccess(res, result.data, 'Approval request retrieved', 200);
    } catch (error) {
      console.error('Error in getApprovalRequest:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Get all approval requests with filters
   * GET /api/approval-requests?budget_id=xxx&status=submitted&search=query
   */
  static async getAllApprovalRequests(req, res) {
    try {
      const { budget_id, status, search, submitted_by, approval_stage_status } = req.query;
      const orgId = req.user?.org_id || null;
      const isUuid = (value) =>
        typeof value === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

      const filters = {
        ...(budget_id && { budget_id }),
        ...(status && { status }),
        ...(search && { search }),
        ...(submitted_by && isUuid(submitted_by) && { submitted_by }),
        ...(approval_stage_status && { approval_stage_status }),
      };

      if (orgId) {
        const allowedBudgets = await BudgetConfigService.getBudgetIdsByOrgId(orgId);
        const budgetIds = allowedBudgets.data || [];
        if (!budgetIds.length) {
          return sendSuccess(res, [], 'Approval requests retrieved', 200);
        }
        filters.budget_ids = budgetIds;
      }

      const result = await ApprovalRequestService.getAllApprovalRequests(filters);

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      sendSuccess(res, result.data, 'Approval requests retrieved', 200);
    } catch (error) {
      console.error('Error in getAllApprovalRequests:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Update approval request
   * PUT /api/approval-requests/:id
   */
  static async updateApprovalRequest(req, res) {
    try {
      const { id } = req.params;
      const { id: userId } = req.user;
      const updateData = { ...req.body, updated_by: userId };

      const result = await ApprovalRequestService.updateApprovalRequest(id, updateData);

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

        broadcast('approval_request_updated', {
          action: 'updated',
          request_id: result.data?.request_id || id,
        });

      sendSuccess(res, result.data, result.message, 200);
    } catch (error) {
      console.error('Error in updateApprovalRequest:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Submit approval request for workflow
   * POST /api/approval-requests/:id/submit
   */
  static async submitApprovalRequest(req, res) {
    try {
      const { id } = req.params;
      const { id: userId } = req.user;

      const requestResult = await ApprovalRequestService.getApprovalRequestById(id);
      if (!requestResult.success || !requestResult.data) {
        return sendError(res, requestResult.error || 'Approval request not found', 404);
      }

      const budgetId = requestResult.data?.budget_id;
      if (!budgetId) {
        return sendError(res, 'Budget configuration is missing for this request', 400);
      }

      const budgetConfigResult = await BudgetConfigService.getBudgetConfigById(budgetId);
      if (!budgetConfigResult.success) {
        return sendError(res, budgetConfigResult.error || 'Budget configuration not found', 404);
      }

      const userAccessResult = await BudgetConfigService.canUserAccessBudgetConfig({
        budgetConfig: budgetConfigResult.data,
        userId,
        userRole: req.user?.role,
        orgId: req.user?.org_id || null,
        isAdmin: isAdminUser(req),
      });

      if (!userAccessResult.success) {
        return sendError(res, userAccessResult.error || 'Failed to validate budget configuration access', 500);
      }

      if (!userAccessResult.data) {
        return sendError(res, 'Access denied: you are not authorized to submit this request', 403);
      }

      const result = await ApprovalRequestService.submitApprovalRequest(id, userId);

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

        broadcast('approval_request_updated', {
          action: 'submitted',
          request_id: result.data?.request_id || id,
        });

      sendSuccess(res, result.data, result.message, 200);
    } catch (error) {
      console.error('Error in submitApprovalRequest:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Add single line item
   * POST /api/approval-requests/:id/line-items
   */
  static async addLineItem(req, res) {
    try {
      const { id } = req.params;
      const { id: userId } = req.user;
      const lineItemData = { ...req.body, created_by: userId };

      const result = await ApprovalRequestService.addLineItem(id, lineItemData);

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      sendSuccess(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Error in addLineItem:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Add multiple line items (bulk)
   * POST /api/approval-requests/:id/line-items/bulk
   */
  static async addLineItemsBulk(req, res) {
    try {
      const { id } = req.params;
      const { id: userId } = req.user;
      const { line_items } = req.body;

      if (!Array.isArray(line_items) || line_items.length === 0) {
        return sendError(res, 'line_items must be a non-empty array', 400);
      }

      const result = await ApprovalRequestService.addLineItemsBulk(id, line_items, userId);

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      sendSuccess(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Error in addLineItemsBulk:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Get line items for request
   * GET /api/approval-requests/:id/line-items
   */
  static async getLineItems(req, res) {
    try {
      const { id } = req.params;

      const result = await ApprovalRequestService.getLineItemsByRequestId(id);

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      sendSuccess(res, result.data, 'Line items retrieved', 200);
    } catch (error) {
      console.error('Error in getLineItems:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Approve request at specific level
   * POST /api/approval-requests/:id/approvals/approve
   */
  static async approveRequest(req, res) {
    try {
      const { id } = req.params;
      const {
        approval_level,
        approver_name,
        approver_title,
        approval_notes,
        conditions_applied,
        payroll_cycle,
        payroll_cycle_date,
        payroll_cycle_Date,
        user_id,
      } = req.body;
      const userId = req.user?.id || user_id;
      const normalizedPayrollCycleDate = payroll_cycle_date || payroll_cycle_Date;

      if (!approval_level) {
        return sendError(res, 'approval_level is required', 400);
      }

      if (!userId) {
        return sendError(res, 'user_id is required', 400);
      }

      const normalizedLevel = Number(approval_level);
      if (normalizedLevel === 4) {
        if (!payroll_cycle || !normalizedPayrollCycleDate) {
          return sendError(res, 'payroll_cycle and payroll_cycle_date are required for payroll approval', 400);
        }
      }

      const result = await ApprovalRequestService.approveRequestAtLevel(id, approval_level, {
        approved_by: userId,
        approver_name,
        approver_title,
        approval_notes,
        conditions_applied,
        payroll_cycle,
        payroll_cycle_date: normalizedPayrollCycleDate,
      });

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      broadcast('approval_request_updated', {
        action: 'approved',
        request_id: result.data?.request_id || id,
        approval_level,
      });

      sendSuccess(res, result.data, result.message, 200);
    } catch (error) {
      console.error('Error in approveRequest:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Reject request at specific level
   * POST /api/approval-requests/:id/approvals/reject
   */
  static async rejectRequest(req, res) {
    try {
      const { id } = req.params;
      const { approval_level, approver_name, rejection_reason, user_id } = req.body;
      const userId = req.user?.id || user_id;

      if (!approval_level || !rejection_reason) {
        return sendError(res, 'approval_level and rejection_reason are required', 400);
      }

      if (!userId) {
        return sendError(res, 'user_id is required', 400);
      }

      const result = await ApprovalRequestService.rejectRequestAtLevel(id, approval_level, {
        rejected_by: userId,
        approver_name,
        rejection_reason,
      });

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      broadcast('approval_request_updated', {
        action: 'rejected',
        request_id: result.data?.request_id || id,
        approval_level,
      });

      sendSuccess(res, result.data, result.message, 200);
    } catch (error) {
      console.error('Error in rejectRequest:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Complete payroll payment (Step 2)
   * POST /api/approval-requests/:id/approvals/complete-payment
   */
  static async completePayrollPayment(req, res) {
    try {
      const { id } = req.params;
      const { approval_notes } = req.body;
      const userId = req.user?.id || req.body.user_id;

      if (!userId) {
        return sendError(res, 'user_id is required', 400);
      }

      const result = await ApprovalRequestService.completePayrollPayment(id, {
        completed_by: userId,
        approver_name: req.user?.name || req.user?.full_name || req.user?.email || 'Payroll',
        approval_notes,
      });

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      broadcast('approval_request_updated', {
        action: 'payment_completed',
        request_id: result.data?.request_id || id,
        approval_level: 4,
      });

      sendSuccess(res, result.data, result.message, 200);
    } catch (error) {
      console.error('Error in completePayrollPayment:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Get approvals for request
   * GET /api/approval-requests/:id/approvals
   */
  static async getApprovals(req, res) {
    try {
      const { id } = req.params;

      const result = await ApprovalRequestService.getApprovalsByRequestId(id);

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      sendSuccess(res, result.data, 'Approvals retrieved', 200);
    } catch (error) {
      console.error('Error in getApprovals:', error);
      sendError(res, 500, error.message);
    }
  }

  /**
   * Add attachment
   * POST /api/approval-requests/:id/attachments
   */
  static async addAttachment(req, res) {
    try {
      const { id } = req.params;
      const { id: userId } = req.user;
      const { file_name, file_type, file_size_bytes, storage_path, storage_provider, file_purpose } = req.body;

      if (!file_name || !storage_path) {
        return sendSuccess(res, 400, false, 'file_name and storage_path are required');
      }

      const result = await ApprovalRequestService.addAttachment(id, {
        file_name,
        file_type,
        file_size_bytes,
        storage_path,
        storage_provider: storage_provider || 'local',
        file_purpose: file_purpose || 'supporting_document',
        uploaded_by: userId,
      });

      if (!result.success) {
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 201, true, result.message, result.data);
    } catch (error) {
      console.error('Error in addAttachment:', error);
      sendError(res, 500, error.message);
    }
  }

  /**
   * Get attachments for request
   * GET /api/approval-requests/:id/attachments
   */
  static async getAttachments(req, res) {
    try {
      const { id } = req.params;

      const result = await ApprovalRequestService.getAttachmentsByRequestId(id);

      if (!result.success) {
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 200, true, 'Attachments retrieved', result.data);
    } catch (error) {
      console.error('Error in getAttachments:', error);
      sendError(res, 500, error.message);
    }
  }

  /**
   * Get activity log for request
   * GET /api/approval-requests/:id/activity
   */
  static async getActivityLog(req, res) {
    try {
      const { id } = req.params;

      const result = await ApprovalRequestService.getActivityLogByRequestId(id);

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      sendSuccess(res, result.data, 'Activity log retrieved', 200);
    } catch (error) {
      console.error('Error in getActivityLog:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Get pending approvals for current user
   * GET /api/approval-requests/my-approvals/pending
   */
  static async getPendingApprovals(req, res) {
    try {
      const userId = req.user?.id || req.query.user_id;
      const orgId = req.user?.org_id || null;

      if (!userId) {
        return sendError(res, 'user_id is required', 400);
      }

      let budgetIds = null;
      if (orgId) {
        const allowedBudgets = await BudgetConfigService.getBudgetIdsByOrgId(orgId);
        budgetIds = allowedBudgets.data || [];
      }

      const result = await ApprovalRequestService.getPendingApprovalsForUser(userId, budgetIds);

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      sendSuccess(res, result.data, 'Pending approvals retrieved', 200);
    } catch (error) {
      console.error('Error in getPendingApprovals:', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Delete approval request
   * DELETE /api/approval-requests/:id
   */
  static async deleteApprovalRequest(req, res) {
    try {
      const { id } = req.params;

      const result = await ApprovalRequestService.deleteApprovalRequest(id);

      if (!result.success) {
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 200, true, result.message);

        broadcast('approval_request_updated', {
          action: 'deleted',
          request_id: id,
        });
    } catch (error) {
      console.error('Error in deleteApprovalRequest:', error);
      sendError(res, 500, error.message);
    }
  }
}

export default ApprovalRequestController;
