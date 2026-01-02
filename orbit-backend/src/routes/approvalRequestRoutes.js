import express from 'express';
import ApprovalRequestController from '../controllers/approvalRequestController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Approval Request Routes
 * All routes require authentication
 */

/**
 * POST /api/approval-requests
 * Create a new approval request (DRAFT status)
 * Body: { budget_id, title, description, total_request_amount }
 */
router.post('/', authMiddleware, ApprovalRequestController.createApprovalRequest);

/**
 * GET /api/approval-requests
 * Get all approval requests with optional filters
 * Query: ?budget_id=xxx&status=submitted&search=query&submitted_by=xxx
 */
router.get('/', authMiddleware, ApprovalRequestController.getAllApprovalRequests);

/**
 * GET /api/approval-requests/:id
 * Get specific approval request with all related data
 */
router.get('/:id', authMiddleware, ApprovalRequestController.getApprovalRequest);

/**
 * PUT /api/approval-requests/:id
 * Update approval request details
 * Body: { title, description, total_request_amount, status, etc }
 */
router.put('/:id', authMiddleware, ApprovalRequestController.updateApprovalRequest);

/**
 * DELETE /api/approval-requests/:id
 * Delete approval request (typically only allowed in DRAFT state)
 */
router.delete('/:id', authMiddleware, ApprovalRequestController.deleteApprovalRequest);

/**
 * POST /api/approval-requests/:id/submit
 * Submit approval request for workflow
 * Changes status from DRAFT to SUBMITTED and initializes approval levels
 */
router.post('/:id/submit', authMiddleware, ApprovalRequestController.submitApprovalRequest);

/**
 * LINE ITEMS ENDPOINTS
 */

/**
 * POST /api/approval-requests/:id/line-items
 * Add a single line item to approval request
 * Body: { item_number, employee_id, employee_name, department, position, item_type, amount, is_deduction, notes }
 */
router.post('/:id/line-items', authMiddleware, ApprovalRequestController.addLineItem);

/**
 * POST /api/approval-requests/:id/line-items/bulk
 * Add multiple line items at once (bulk import from file)
 * Body: { line_items: [{ employee_id, employee_name, ... }, ...] }
 */
router.post('/:id/line-items/bulk', authMiddleware, ApprovalRequestController.addLineItemsBulk);

/**
 * GET /api/approval-requests/:id/line-items
 * Get all line items for request
 */
router.get('/:id/line-items', authMiddleware, ApprovalRequestController.getLineItems);

/**
 * APPROVAL WORKFLOW ENDPOINTS
 */

/**
 * GET /api/approval-requests/:id/approvals
 * Get approval status for all levels of a request
 */
router.get('/:id/approvals', authMiddleware, ApprovalRequestController.getApprovals);

/**
 * POST /api/approval-requests/:id/approvals/approve
 * Approve request at specific approval level
 * Body: { approval_level, approver_name, approver_title, approval_notes, conditions_applied }
 */
router.post('/:id/approvals/approve', authMiddleware, ApprovalRequestController.approveRequest);

/**
 * POST /api/approval-requests/:id/approvals/reject
 * Reject request at specific approval level
 * Body: { approval_level, approver_name, rejection_reason }
 */
router.post('/:id/approvals/reject', authMiddleware, ApprovalRequestController.rejectRequest);

/**
 * ATTACHMENTS ENDPOINTS
 */

/**
 * POST /api/approval-requests/:id/attachments
 * Add attachment to request
 * Body: { file_name, file_type, file_size_bytes, storage_path, storage_provider, file_purpose }
 */
router.post('/:id/attachments', authMiddleware, ApprovalRequestController.addAttachment);

/**
 * GET /api/approval-requests/:id/attachments
 * Get all attachments for request
 */
router.get('/:id/attachments', authMiddleware, ApprovalRequestController.getAttachments);

/**
 * ACTIVITY & AUDIT ENDPOINTS
 */

/**
 * GET /api/approval-requests/:id/activity
 * Get activity log and audit trail for request
 */
router.get('/:id/activity', authMiddleware, ApprovalRequestController.getActivityLog);

/**
 * USER APPROVAL QUEUE ENDPOINTS
 */

/**
 * GET /api/approval-requests/my-approvals/pending
 * Get all pending approvals assigned to current user
 */
router.get('/my-approvals/pending', authMiddleware, ApprovalRequestController.getPendingApprovals);

export default router;
