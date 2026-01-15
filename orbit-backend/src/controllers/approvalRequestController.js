import ApprovalRequestService from '../services/approvalRequestService.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Approval Request Controller
 * Handles HTTP requests for approval workflows
 */

export class ApprovalRequestController {
  /**
   * Create new approval request (DRAFT)
   * POST /api/approval-requests
   */
  static async createApprovalRequest(req, res) {
    try {
      const { budget_id, title, description, total_request_amount } = req.body;
      const { id: userId } = req.user;

      // Validate required fields
      if (!budget_id || !title || !total_request_amount) {
        return sendSuccess(res, 400, false, 'Missing required fields: budget_id, title, total_request_amount');
      }

      const result = await ApprovalRequestService.createApprovalRequest({
        budget_id,
        title,
        description,
        total_request_amount,
        submitted_by: userId,
        created_by: userId,
      });

      if (!result.success) {
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 201, true, result.message, result.data);
    } catch (error) {
      console.error('Error in createApprovalRequest:', error);
      sendError(res, 500, error.message);
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
        return sendError(res, 404, result.error);
      }

      sendSuccess(res, 200, true, 'Approval request retrieved', result.data);
    } catch (error) {
      console.error('Error in getApprovalRequest:', error);
      sendError(res, 500, error.message);
    }
  }

  /**
   * Get all approval requests with filters
   * GET /api/approval-requests?budget_id=xxx&status=submitted&search=query
   */
  static async getAllApprovalRequests(req, res) {
    try {
      const { budget_id, status, search, submitted_by } = req.query;

      const filters = {
        ...(budget_id && { budget_id }),
        ...(status && { status }),
        ...(search && { search }),
        ...(submitted_by && { submitted_by }),
      };

      const result = await ApprovalRequestService.getAllApprovalRequests(filters);

      if (!result.success) {
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 200, true, 'Approval requests retrieved', result.data);
    } catch (error) {
      console.error('Error in getAllApprovalRequests:', error);
      sendError(res, 500, error.message);
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
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 200, true, result.message, result.data);
    } catch (error) {
      console.error('Error in updateApprovalRequest:', error);
      sendError(res, 500, error.message);
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

      const result = await ApprovalRequestService.submitApprovalRequest(id, userId);

      if (!result.success) {
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 200, true, result.message, result.data);
    } catch (error) {
      console.error('Error in submitApprovalRequest:', error);
      sendError(res, 500, error.message);
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
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 201, true, result.message, result.data);
    } catch (error) {
      console.error('Error in addLineItem:', error);
      sendError(res, 500, error.message);
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
        return sendSuccess(res, 400, false, 'line_items must be a non-empty array');
      }

      const result = await ApprovalRequestService.addLineItemsBulk(id, line_items, userId);

      if (!result.success) {
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 201, true, result.message, result.data);
    } catch (error) {
      console.error('Error in addLineItemsBulk:', error);
      sendError(res, 500, error.message);
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
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 200, true, 'Line items retrieved', result.data);
    } catch (error) {
      console.error('Error in getLineItems:', error);
      sendError(res, 500, error.message);
    }
  }

  /**
   * Approve request at specific level
   * POST /api/approval-requests/:id/approvals/approve
   */
  static async approveRequest(req, res) {
    try {
      const { id } = req.params;
      const { id: userId } = req.user;
      const { approval_level, approver_name, approver_title, approval_notes, conditions_applied } = req.body;

      if (!approval_level) {
        return sendSuccess(res, 400, false, 'approval_level is required');
      }

      const result = await ApprovalRequestService.approveRequestAtLevel(id, approval_level, {
        approved_by: userId,
        approver_name,
        approver_title,
        approval_notes,
        conditions_applied,
      });

      if (!result.success) {
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 200, true, result.message, result.data);
    } catch (error) {
      console.error('Error in approveRequest:', error);
      sendError(res, 500, error.message);
    }
  }

  /**
   * Reject request at specific level
   * POST /api/approval-requests/:id/approvals/reject
   */
  static async rejectRequest(req, res) {
    try {
      const { id } = req.params;
      const { id: userId } = req.user;
      const { approval_level, approver_name, rejection_reason } = req.body;

      if (!approval_level || !rejection_reason) {
        return sendSuccess(res, 400, false, 'approval_level and rejection_reason are required');
      }

      const result = await ApprovalRequestService.rejectRequestAtLevel(id, approval_level, {
        rejected_by: userId,
        approver_name,
        rejection_reason,
      });

      if (!result.success) {
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 200, true, result.message, result.data);
    } catch (error) {
      console.error('Error in rejectRequest:', error);
      sendError(res, 500, error.message);
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
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 200, true, 'Approvals retrieved', result.data);
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
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 200, true, 'Activity log retrieved', result.data);
    } catch (error) {
      console.error('Error in getActivityLog:', error);
      sendError(res, 500, error.message);
    }
  }

  /**
   * Get pending approvals for current user
   * GET /api/approval-requests/my-approvals/pending
   */
  static async getPendingApprovals(req, res) {
    try {
      const { id: userId } = req.user;

      const result = await ApprovalRequestService.getPendingApprovalsForUser(userId);

      if (!result.success) {
        return sendError(res, 500, result.error);
      }

      sendSuccess(res, 200, true, 'Pending approvals retrieved', result.data);
    } catch (error) {
      console.error('Error in getPendingApprovals:', error);
      sendError(res, 500, error.message);
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
    } catch (error) {
      console.error('Error in deleteApprovalRequest:', error);
      sendError(res, 500, error.message);
    }
  }
}

export default ApprovalRequestController;
