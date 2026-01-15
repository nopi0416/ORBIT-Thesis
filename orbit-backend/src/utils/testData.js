/**
 * Test Configuration & Mock Data
 * For testing Approval Request API endpoints
 * FOCUSED ON: Rewards (bonuses, incentives, sign-in bonuses, etc.) - NOT Salaries
 */

// Test Budget Configuration (matches tblbudgetconfiguration table)
export const testBudgetConfig = {
  budget_id: '550e8400-e29b-41d4-a716-446655440000',
  budget_name: 'Q1 2025 Employee Rewards & Incentives',
  budget_description: 'Quarterly rewards distribution including performance bonuses, sign-in bonuses, and incentives for Q1 2025',
  budget_owner: 'user-budget-owner-uuid',
  total_budget: 500000,
  budget_currency: 'PHP',
  fiscal_year: 2025,
  fiscal_quarter: 'Q1',
  budget_status: 'active',
  created_at: '2025-01-01T00:00:00Z',
};

// Test Approvers for Budget Configuration
export const testApprovers = [
  {
    approver_id: '660f9511-f30c-52e5-b827-557766551111',
    budget_id: '550e8400-e29b-41d4-a716-446655440000',
    approval_level: 1,
    approval_level_name: 'L1',
    primary_approver: 'user-l1-approver-uuid',
    primary_name: 'John Manager',
    primary_email: 'john.manager@company.com',
    primary_title: 'Department Manager',
    backup_approver: 'user-l1-backup-uuid',
    backup_name: 'Jane Assistant Manager',
    backup_email: 'jane.assistant@company.com',
  },
  {
    approver_id: '770g0622-g41d-63f6-c938-668877662222',
    budget_id: '550e8400-e29b-41d4-a716-446655440000',
    approval_level: 2,
    approval_level_name: 'L2',
    primary_approver: 'user-l2-approver-uuid',
    primary_name: 'Sarah Director',
    primary_email: 'sarah.director@company.com',
    primary_title: 'Director of Operations',
    backup_approver: 'user-l2-backup-uuid',
    backup_name: 'Mike Deputy Director',
    backup_email: 'mike.deputy@company.com',
  },
  {
    approver_id: '880h1733-h52e-74g7-d049-779988773333',
    budget_id: '550e8400-e29b-41d4-a716-446655440000',
    approval_level: 3,
    approval_level_name: 'L3',
    primary_approver: 'user-l3-approver-uuid',
    primary_name: 'David VP',
    primary_email: 'david.vp@company.com',
    primary_title: 'VP of Human Resources',
    backup_approver: null,
    backup_name: null,
    backup_email: null,
  },
];

// Test Requestor (who creates approval requests)
export const testRequestor = {
  user_id: 'user-requestor-uuid',
  user_name: 'Alice Requestor',
  user_email: 'alice.requestor@company.com',
  user_role: 'requestor',
  department: 'Finance',
};

// Test L1 Approver (first approval level)
export const testL1Approver = {
  user_id: 'user-l1-approver-uuid',
  user_name: 'John Manager',
  user_email: 'john.manager@company.com',
  user_role: 'l1',
  department: 'Engineering',
};

// Test L2 Approver (second approval level)
export const testL2Approver = {
  user_id: 'user-l2-approver-uuid',
  user_name: 'Sarah Director',
  user_email: 'sarah.director@company.com',
  user_role: 'l2',
  department: 'Operations',
};

// Test L3 Approver (third approval level)
export const testL3Approver = {
  user_id: 'user-l3-approver-uuid',
  user_name: 'David VP',
  user_email: 'david.vp@company.com',
  user_role: 'l3',
  department: 'Executive',
};

// Test Payroll User
export const testPayrollUser = {
  user_id: 'user-payroll-uuid',
  user_name: 'Payroll Admin',
  user_email: 'payroll.admin@company.com',
  user_role: 'payroll',
  department: 'Payroll',
};

// Sample Employee Data for Line Items
export const sampleEmployees = [
  {
    employee_id: 'EMP001',
    employee_name: 'Alice Johnson',
    department: 'Engineering',
    position: 'Senior Software Engineer',
  },
  {
    employee_id: 'EMP002',
    employee_name: 'Bob Smith',
    department: 'Engineering',
    position: 'Software Engineer',
  },
  {
    employee_id: 'EMP003',
    employee_name: 'Carol Davis',
    department: 'Marketing',
    position: 'Marketing Manager',
  },
  {
    employee_id: 'EMP004',
    employee_name: 'David Wilson',
    department: 'Sales',
    position: 'Sales Representative',
  },
  {
    employee_id: 'EMP005',
    employee_name: 'Eva Martinez',
    department: 'Operations',
    position: 'Operations Coordinator',
  },
];

// Test Approval Request (Draft state)
export const testApprovalRequestDraft = {
  budget_id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Q1 2025 Employee Rewards Distribution',
  description: 'Q1 2025 employee rewards including performance bonuses, sign-in bonuses, and special incentives for high performers.',
  total_request_amount: 142500,
};

// Test Line Items for Approval Request (REWARDS ONLY - NO SALARIES)
export const testLineItems = [
  {
    employee_id: 'EMP001',
    employee_name: 'Alice Johnson',
    department: 'Engineering',
    position: 'Senior Software Engineer',
    item_type: 'bonus',
    item_description: 'Q1 Performance Bonus - Excellent performance on critical projects',
    amount: 50000,
    is_deduction: false,
    notes: 'Led major system architecture redesign, exceeded expectations',
  },
  {
    employee_id: 'EMP002',
    employee_name: 'Bob Smith',
    department: 'Engineering',
    position: 'Software Engineer',
    item_type: 'incentive',
    item_description: 'Q1 Sign-In Bonus - New hire retention incentive',
    amount: 25000,
    is_deduction: false,
    notes: 'New hire sign-in bonus to encourage retention through year-end',
  },
  {
    employee_id: 'EMP003',
    employee_name: 'Carol Davis',
    department: 'Marketing',
    position: 'Marketing Manager',
    item_type: 'bonus',
    item_description: 'Q1 Performance Bonus - Campaign success reward',
    amount: 30000,
    is_deduction: false,
    notes: 'Increased marketing engagement by 40%, exceeded KPIs',
  },
  {
    employee_id: 'EMP004',
    employee_name: 'David Wilson',
    department: 'Sales',
    position: 'Sales Representative',
    item_type: 'incentive',
    item_description: 'Sales Performance Incentive - Quota achievement reward',
    amount: 20000,
    is_deduction: false,
    notes: 'Exceeded quarterly sales target by 25%, top performer this quarter',
  },
  {
    employee_id: 'EMP005',
    employee_name: 'Eva Martinez',
    department: 'Operations',
    position: 'Operations Coordinator',
    item_type: 'bonus',
    item_description: 'Q1 Special Recognition Bonus - Process improvement initiative',
    amount: 17500,
    is_deduction: false,
    notes: 'Implemented process automation, improved efficiency by 20%',
  },
];

// Test Approval Notes
export const testApprovalNotes = {
  l1_approval: {
    approval_level: 1,
    approver_name: 'John Manager',
    approver_title: 'Department Manager',
    approval_notes: 'All requested amounts align with departmental budget and performance metrics. Approved.',
    conditions_applied: null,
  },
  l2_approval: {
    approval_level: 2,
    approver_name: 'Sarah Director',
    approver_title: 'Director of Operations',
    approval_notes: 'Budget allocation is appropriate. Recommending processing within 2 weeks.',
    conditions_applied: 'Quarterly review of payment timing required',
  },
  l3_approval: {
    approval_level: 3,
    approver_name: 'David VP',
    approver_title: 'VP of Human Resources',
    approval_notes: 'Final approval granted. All compliance requirements met.',
    conditions_applied: null,
  },
};

// Test Rejection Reason
export const testRejectionReason = {
  approval_level: 2,
  approver_name: 'Sarah Director',
  rejection_reason: 'Current quarter budget has been fully allocated. Please revise request amounts or select different budget configuration.',
};

// Export all test data
export const testData = {
  budgetConfig: testBudgetConfig,
  approvers: testApprovers,
  requestor: testRequestor,
  l1Approver: testL1Approver,
  l2Approver: testL2Approver,
  l3Approver: testL3Approver,
  payrollUser: testPayrollUser,
  employees: sampleEmployees,
  approvalRequestDraft: testApprovalRequestDraft,
  lineItems: testLineItems,
  approvalNotes: testApprovalNotes,
  rejectionReason: testRejectionReason,
};

export default testData;
