# Bulk Upload Implementation Plan

## Frontend Changes Completed
✅ 1. Changed "Parsed" to "Uploaded" 
✅ 2. Added termination_date column header with increased text size (text-sm)

## Frontend Changes Pending
- [ ] Duplicate detection logic in validation
- [ ] Fix vertical centering (remove flex items-center)
- [ ] Add termination_date to table rows
- [ ] Re-validation on employee ID change
- [ ] Disable proceed button by default (check approval description + valid data)

## Backend Implementation Required
-  [ ] Create endpoints for bulk submission
- [ ] Implement line items creation
- [ ] Implement approvals workflow initialization
- [ ] Activity log creation
- [ ] Notification creation

## Database Tables to Use
- tblbudgetapprovalrequests (main request)
- tblbudgetapprovalrequests_line_items (bulk items)
- tblbudgetapprovalrequests_approvals (approval levels)
- tblbudgetapprovalrequests_activity_log (audit trail)
- tblbudgetapprovalrequests_notifications (notif system)
- tblbudgetapprovalrequests_attachments_logs (file uploads)
