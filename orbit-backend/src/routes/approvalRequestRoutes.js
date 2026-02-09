import express from 'express';
import ApprovalRequestController from '../controllers/approvalRequestController.js';
import { authenticateToken } from '../middleware/auth.js';

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
router.post('/', authenticateToken, ApprovalRequestController.createApprovalRequest);

/**
 * GET /api/approval-requests
 * Get all approval requests with optional filters
 * Query: ?budget_id=xxx&status=submitted&search=query&submitted_by=xxx
 */
router.get('/', authenticateToken, ApprovalRequestController.getAllApprovalRequests);

/**
 * POST /api/approval-requests/employees/batch
 * Get multiple employees by EIDs in batch (optimized for bulk uploads)
 * Body: { eids: ['EMP001', 'EMP002', ...], company_id: 'uuid' }
 */
router.post('/employees/batch', authenticateToken, ApprovalRequestController.getEmployeesBatch);

/**
 * GET /api/approval-requests/employees/:eid
 * Get employee details by employee ID (EID)
 * Query: ?company_id=uuid (optional)
 */
router.get('/employees/:eid', authenticateToken, ApprovalRequestController.getEmployeeByEid);

/**
 * GET /api/approval-requests/notifications
 * Get notification list for requestor/approver dashboards
 */
router.get('/notifications', authenticateToken, ApprovalRequestController.getUserNotifications);

/**
 * GET /api/approval-requests/:id
 * Get specific approval request with all related data
 */
router.get('/:id', authenticateToken, ApprovalRequestController.getApprovalRequest);

/**
 * PUT /api/approval-requests/:id
 * Update approval request details
 * Body: { title, description, total_request_amount, status, etc }
 */
router.put('/:id', authenticateToken, ApprovalRequestController.updateApprovalRequest);

/**
 * DELETE /api/approval-requests/:id
 * Delete approval request (typically only allowed in DRAFT state)
 */
router.delete('/:id', authenticateToken, ApprovalRequestController.deleteApprovalRequest);

/**
 * POST /api/approval-requests/:id/submit
 * Submit approval request for workflow
 * Changes status from DRAFT to SUBMITTED and initializes approval levels
 */
router.post('/:id/submit', authenticateToken, ApprovalRequestController.submitApprovalRequest);

/**
 * LINE ITEMS ENDPOINTS
 */

/**
 * POST /api/approval-requests/:id/line-items
 * Add a single line item to approval request
 * Body: { item_number, employee_id, employee_name, department, position, item_type, amount, is_deduction, notes }
 */
router.post('/:id/line-items', authenticateToken, ApprovalRequestController.addLineItem);

/**
 * POST /api/approval-requests/:id/line-items/bulk
 * Add multiple line items at once (bulk import from file)
 * Body: { line_items: [{ employee_id, employee_name, ... }, ...] }
 */
router.post('/:id/line-items/bulk', authenticateToken, ApprovalRequestController.addLineItemsBulk);

/**
 * GET /api/approval-requests/:id/line-items
 * Get all line items for request
 */
router.get('/:id/line-items', authenticateToken, ApprovalRequestController.getLineItems);

/**
 * APPROVAL WORKFLOW ENDPOINTS
 */

/**
 * GET /api/approval-requests/:id/approvals
 * Get approval status for all levels of a request
 */
router.get('/:id/approvals', authenticateToken, ApprovalRequestController.getApprovals);

/**
 * POST /api/approval-requests/:id/approvals/approve
 * Approve request at specific approval level
 * Body: { approval_level, approver_name, approver_title, approval_notes, conditions_applied }
 */
router.post('/:id/approvals/approve', authenticateToken, ApprovalRequestController.approveRequest);

/**
 * POST /api/approval-requests/:id/approvals/reject
 * Reject request at specific approval level
 * Body: { approval_level, approver_name, rejection_reason }
 */
router.post('/:id/approvals/reject', authenticateToken, ApprovalRequestController.rejectRequest);

/**
 * POST /api/approval-requests/:id/approvals/complete-payment
 * Complete payroll payment step
 * Body: { approval_notes }
 */
router.post('/:id/approvals/complete-payment', authenticateToken, ApprovalRequestController.completePayrollPayment);

/**
 * ATTACHMENTS ENDPOINTS
 */

/**
 * POST /api/approval-requests/:id/attachments
 * Add attachment to request
 * Body: { file_name, file_type, file_size_bytes, storage_path, storage_provider, file_purpose }
 */
router.post('/:id/attachments', authenticateToken, ApprovalRequestController.addAttachment);

/**
 * GET /api/approval-requests/:id/attachments
 * Get all attachments for request
 */
router.get('/:id/attachments', authenticateToken, ApprovalRequestController.getAttachments);

/**
 * ACTIVITY & AUDIT ENDPOINTS
 */

/**
 * GET /api/approval-requests/:id/activity
 * Get activity log and audit trail for request
 */
router.get('/:id/activity', authenticateToken, ApprovalRequestController.getActivityLog);

/**
 * USER APPROVAL QUEUE ENDPOINTS
 */

/**
 * GET /api/approval-requests/my-approvals/pending
 * Get all pending approvals assigned to current user
 */
router.get('/my-approvals/pending', authenticateToken, ApprovalRequestController.getPendingApprovals);

export default router;
