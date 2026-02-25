import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import approvalRequestService from '../services/approvalRequestService';
import { getApproversByLevel, getBudgetConfigurationById, getBudgetConfigurations, getOrganizations, getUserById } from '../services/budgetConfigService';
import { connectWebSocket, addWebSocketListener } from '../services/realtimeService';
import { resolveUserRole } from '../utils/roleUtils';
import BulkUploadValidation from '../components/approval/BulkUploadValidation';
import { fetchWithCache, invalidateNamespace } from '../utils/dataCache';
import { useLocation, useNavigate } from 'react-router-dom';
import PaginationControls from '../components/PaginationControls';

const getToken = () => localStorage.getItem('authToken') || '';

const extractErrorMessage = (error) => {
  // Handle database constraint violations
  if (error?.code === '23505') {
    if (error.details?.includes('request_number')) {
      return 'A request with this number already exists. Please try again.';
    }
    return 'Duplicate entry detected. Please try again.';
  }
  
  // Handle other database errors
  if (error?.code && error?.message) {
    return `Database error: ${error.message}`;
  }
  
  // Handle standard error objects
  if (error?.message) {
    return error.message;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred. Please try again.';
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

const parseStoredPaths = (value) => {
  const parsed = parseStoredList(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((entry) => (Array.isArray(entry) ? entry : [entry]));
};

const normalizeTenureGroup = (value = '') => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '')
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9\-]/g, '');

  if (!normalized) return '';
  if (normalized.includes('0-6')) return '0-6months';
  if (normalized.includes('6-12')) return '6-12months';
  if (normalized.includes('1-2')) return '1-2years';
  if (normalized.includes('2-5')) return '2-5years';
  if (normalized.includes('5plus') || normalized.includes('5-plus')) return '5plus-years';
  return normalized;
};

const parseTenureGroups = (value) =>
  parseStoredList(value)
    .map((group) => normalizeTenureGroup(group))
    .filter(Boolean);

const getTenureGroupFromHireDate = (hireDateValue) => {
  if (!hireDateValue) return null;
  const hireDate = new Date(hireDateValue);
  if (Number.isNaN(hireDate.getTime())) return null;

  const now = new Date();
  const months = (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth());

  if (months < 6) return '0-6months';
  if (months < 12) return '6-12months';
  if (months < 24) return '1-2years';
  if (months < 60) return '2-5years';
  return '5plus-years';
};

const validateTenureScope = (hireDateValue, allowedTenureGroups = []) => {
  const normalizedAllowed = Array.from(new Set((allowedTenureGroups || []).map((value) => normalizeTenureGroup(value)).filter(Boolean)));
  if (!normalizedAllowed.length) {
    return { tenureAllowed: true, employeeTenureGroup: null, reason: '' };
  }

  const employeeTenureGroup = getTenureGroupFromHireDate(hireDateValue);
  if (!employeeTenureGroup) {
    return {
      tenureAllowed: false,
      employeeTenureGroup: null,
      reason: 'Hire date is missing or invalid for tenure group validation.',
    };
  }

  const tenureAllowed = normalizedAllowed.includes(employeeTenureGroup);
  return {
    tenureAllowed,
    employeeTenureGroup,
    reason: tenureAllowed
      ? ''
      : `Employee tenure '${employeeTenureGroup}' is not within allowed tenure groups (${normalizedAllowed.join(', ')}).`,
  };
};

const normalizeLineItem = (item = {}) => {
  const rawAmount = Number(item.amount ?? item.item_amount ?? item.total_amount ?? 0);
  const rawDeduction = item.is_deduction ?? item.isDeduction ?? item.deduction ?? false;
  const normalizedDeduction =
    typeof rawDeduction === 'string'
      ? ['true', '1', 'yes', 'y'].includes(rawDeduction.trim().toLowerCase())
      : Boolean(rawDeduction);

  return {
    ...item,
    employee_id: item.employee_id ?? item.employeeId ?? item.eid ?? null,
    employee_name: item.employee_name ?? item.employeeName ?? item.name ?? null,
    email: item.email ?? item.employee_email ?? item.employeeEmail ?? null,
    position: item.position ?? item.job_title ?? item.jobTitle ?? null,
    employee_status: item.employee_status ?? item.employeeStatus ?? item.status ?? null,
    geo: item.geo ?? item.geo_name ?? item.geography ?? null,
    location: item.location ?? item.Location ?? item.site_location ?? item.siteLocation ?? null,
    Location: item.Location ?? item.location ?? item.site_location ?? item.siteLocation ?? null,
    department: item.department ?? item.dept ?? null,
    hire_date: item.hire_date ?? item.hireDate ?? null,
    termination_date: item.termination_date ?? item.terminationDate ?? null,
    amount: Number.isFinite(rawAmount) ? rawAmount : 0,
    is_deduction: normalizedDeduction,
    notes: item.notes ?? item.item_description ?? item.description ?? null,
  };
};

const sanitizeTextInput = (value = '') =>
  String(value).replace(/[^A-Za-z0-9 _\-";:'\n\r.,;]/g, '');

const sanitizeSingleLine = (value = '') =>
  sanitizeTextInput(value).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trimStart();

const sanitizeIdInput = (value = '') =>
  String(value).replace(/[^\p{L}\p{N}\-]/gu, '');

const normalizeEmployeeStatus = (value) => {
  if (value === true || value === 1) return 'ACTIVE';
  if (value === false || value === 0) return 'INACTIVE';

  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

  return normalized;
};

const isActiveEmployeeStatus = (value) => {
  const normalized = normalizeEmployeeStatus(value);
  return normalized === 'ACTIVE' || normalized === 'ACT';
};

const blockShortcuts = (event) => {
  const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
  if (!hasModifier) return;

  const key = String(event.key || '').toLowerCase();
  const allowClipboard = (event.ctrlKey || event.metaKey) && (key === 'v' || key === 'c' || key === 'x');
  const allowSelectAll = (event.ctrlKey || event.metaKey) && key === 'a';
  const allowShiftInsert = event.shiftKey && key === 'insert';

  if (allowClipboard || allowSelectAll || allowShiftInsert) return;

  event.preventDefault();
};

const formatDateTimeCompact = (value) => {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    const datePart = date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila',
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });

    const timePart = date
      .toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      .replace(/\s/g, '');

    return `${datePart}-${timePart}`;
  } catch {
    return String(value);
  }
};

const formatCurrencyValue = (value) => `₱${Number(value || 0).toLocaleString('en-US')}`;

const formatStatusText = (value, fallback = 'Pending') => {
  const normalized = String(value || '').replace(/_/g, ' ').trim();
  if (!normalized) return fallback;
  return normalized
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const validatePayrollSelection = ({ payrollCycle, payrollCycleDate, availableMonths = [] }) => {
  if (!payrollCycleDate) {
    return { isValid: false, error: 'Please select payroll month.' };
  }

  if (!payrollCycle) {
    return { isValid: false, error: 'Please select payroll cycle.' };
  }

  const monthOption = availableMonths.find((month) => month.value === payrollCycleDate);
  if (!monthOption) {
    return {
      isValid: false,
      error: 'Selected payroll month is not valid. Only current/next available month can be selected.',
    };
  }

  const cycleAllowed = monthOption.cycles.some((cycle) => cycle.value === payrollCycle);
  if (!cycleAllowed) {
    return {
      isValid: false,
      error: 'Selected payroll cycle is not allowed for the selected month.',
    };
  }

  return { isValid: true, error: '' };
};

const normalizeConfig = (config) => ({
  id: config.budget_id || config.id,
  createdBy: config.created_by || config.createdBy || null,
  name: config.budget_name || config.name || config.budgetName || 'Untitled Budget',
  department: config.department || config.budget_department || 'All',
  departmentId: config.department_id || config.departmentId || null,
  description: config.budget_description || config.description || '',
  maxAmount: config.max_limit || config.maxAmount || config.budgetControlLimit || config.total_budget || 0,
  totalBudget: config.total_budget || config.totalBudget || config.total_budget_amount || config.budget_total || 0,
  budgetLimit: config.budget_limit || config.budgetLimit || config.total_budget || config.totalBudget || 0,
  usedAmount: config.approved_amount ?? config.approvedAmount ?? 0,
  approvedAmount: config.approved_amount ?? config.approvedAmount ?? 0,
  ongoingAmount: config.ongoing_amount ?? config.ongoingAmount ?? 0,
  minLimit: config.min_limit || config.limitMin || 0,
  maxLimit: config.max_limit || config.limitMax || config.maxAmount || 0,
  clientSponsoredAmount:
    config.client_sponsored_amount ??
    config.clientSponsoredAmount ??
    config.client_sponsored_budget ??
    config.clientSponsoredBudget ??
    0,
  clients: parseStoredList(config.client || config.clients),
  clientSponsored: config.is_client_sponsored ?? config.client_sponsored ?? config.clientSponsored ?? null,
  approvers: Array.isArray(config.approvers) ? config.approvers : [],
  accessOUPaths: parseStoredPaths(config.access_ou || config.accessOUPaths),
  affectedOUPaths: parseStoredPaths(config.affected_ou || config.affectedOUPaths),
  status: config.status,
  geo: parseStoredList(config.geo || config.geos),
  location: parseStoredList(config.location || config.locations),
  tenureGroups: parseTenureGroups(config.tenure_group || config.tenureGroup || config.selectedTenureGroups),
});

const normalizeScopeText = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ');

const flattenScopeEntries = (value) => {
  const parsed = parseStoredList(value);
  const result = [];

  const walk = (entry) => {
    if (Array.isArray(entry)) {
      entry.forEach(walk);
      return;
    }
    if (entry === undefined || entry === null || entry === '') return;
    result.push(String(entry).trim());
  };

  walk(parsed);
  return result.filter(Boolean);
};

const canUserViewConfigByDepartmentScope = (config, user = null, userRole = '') => {
  const normalizedRole = String(userRole || '').toLowerCase();
  const shouldRestrict = ['requestor', 'l1'].includes(normalizedRole);
  if (!shouldRestrict) return true;
  if (!config) return false;
  if (String(config.createdBy || '') === String(user?.id || '')) return true;

  const userDepartmentId = String(user?.department_id || user?.departmentId || '').trim();
  const userDepartmentName = normalizeScopeText(user?.department || user?.department_name || user?.departmentName || '');
  if (!userDepartmentId && !userDepartmentName) return true;

  const scopeValues = [
    ...flattenScopeEntries(config.accessOUPaths),
    ...flattenScopeEntries(config.departmentId),
    ...flattenScopeEntries(config.department),
  ];

  if (!scopeValues.length) return true;

  return scopeValues.some((entry) => {
    const raw = String(entry || '').trim();
    if (!raw) return false;
    if (userDepartmentId && raw === userDepartmentId) return true;
    if (userDepartmentName && normalizeScopeText(raw) === userDepartmentName) return true;
    return false;
  });
};

const computeStageStatus = (approvals = [], overallStatus = '') => {
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

  if (payrollApproved) return 'pending_payment_completion';
  if (l1Approved && l2Approved && l3Approved) return 'pending_payroll_approval';
  if (normalizedOverall === 'draft') return 'draft';

  return 'ongoing_approval';
};

const formatStageStatusLabel = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'pending_payroll_approval') return 'Pending Payroll Approval';
  if (normalized === 'pending_payment_completion') return 'Pending Payment Completion';
  if (normalized === 'ongoing_approval') return 'Ongoing Approval';
  if (normalized === 'rejected') return 'Rejected';
  if (normalized === 'completed') return 'Completed';
  if (normalized === 'draft') return 'Draft';
  return formatStatusText(normalized, 'Ongoing Approval');
};

const getStageStatusBadgeClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'pending_payroll_approval') return 'bg-amber-500 text-white';
  if (normalized === 'pending_payment_completion') return 'bg-amber-500 text-white';
  if (normalized === 'rejected') return 'bg-red-600 text-white';
  if (normalized === 'completed') return 'bg-blue-600 text-white';
  if (normalized === 'approved') return 'bg-green-600 text-white';
  if (normalized === 'draft') return 'bg-slate-600 text-white';
  if (normalized === 'self_approved') return 'bg-teal-500 text-white';
  return 'bg-amber-500 text-white';
};

const resolvePayrollCycleInfo = (request = {}) => {
  const approvals = Array.isArray(request.approvals) ? request.approvals : [];
  const payrollApprovalWithCycle = [...approvals]
    .reverse()
    .find(
      (approval) =>
        approval?.payroll_cycle ||
        approval?.payrollCycle ||
        approval?.payroll_cycle_date ||
        approval?.payroll_cycle_Date ||
        approval?.payrollCycleDate
    );

  const payrollCycle =
    request.payroll_cycle ||
    request.payrollCycle ||
    payrollApprovalWithCycle?.payroll_cycle ||
    payrollApprovalWithCycle?.payrollCycle ||
    null;

  const payrollCycleDate =
    request.payroll_cycle_Date ||
    request.payroll_cycle_date ||
    request.payrollCycleDate ||
    payrollApprovalWithCycle?.payroll_cycle_Date ||
    payrollApprovalWithCycle?.payroll_cycle_date ||
    payrollApprovalWithCycle?.payrollCycleDate ||
    null;

  return {
    payrollCycle,
    payrollCycleDate,
  };
};

const normalizeRequest = (request) => {
  const rawStatus = request.approval_stage_status || request.display_status || request.overall_status || request.status || request.submission_status || 'draft';
  const submittedAt = request.submitted_at || request.created_at || '';
  const status = rawStatus === 'draft' && submittedAt ? 'submitted' : rawStatus;
  const toSafeCount = (...values) => {
    for (const value of values) {
      if (value === null || value === undefined || value === '') continue;
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
    }
    return 0;
  };
  const rawLineItems = Array.isArray(request.line_items)
    ? request.line_items
    : Array.isArray(request.lineItems)
      ? request.lineItems
      : [];
  const lineItems = rawLineItems.map(normalizeLineItem);
  const hasLineItems = lineItems.length > 0;
  const computedLineItemsCount = lineItems.length;
  const computedDeductionCount = lineItems.filter((item) => Boolean(item?.is_deduction)).length;
  const lineItemsCount = hasLineItems
    ? computedLineItemsCount
    : toSafeCount(request.line_items_count, request.employee_count, request.employeeCount, request.lineItemsCount);
  const deductionCount = hasLineItems
    ? computedDeductionCount
    : toSafeCount(request.deduction_count, request.deductionCount);
  const toBePaidCount = hasLineItems
    ? Math.max(0, computedLineItemsCount - computedDeductionCount)
    : toSafeCount(request.to_be_paid_count, request.toBePaidCount, lineItemsCount - deductionCount);
  const approvalStageStatus = request.approval_stage_status || request.display_status || null;

  // Calculate totals from line items if available
  const totalAmount = Number(request.total_request_amount || request.amount || 0);
  const deductionTotal = lineItems
    .filter(item => item.is_deduction)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  // Net Pay = Total Amount (Assuming Total includes everything or is it Gross?) 
  // If Total Request Amount = Sum of all items (inc deductions), then Net = Total - Deduction? 
  // User wants "Net to Pay". 
  // If line items are mixed (Bonus 1000, Deduction 100), Total Request Amount usually is 1100 (if sum absolute) or 900 (if sum signed).
  // Let's assume Total Request Amount is the sum of magnitudes for now, or just calculate from line items which is safer if we have them.
  // If we don't have line items, we rely on top level fields.
  
  // Refined Logic:
  // Gross = Sum of non-deduction items
  // Total Deduction = Sum of deduction items
  // Net Pay = Gross - Total Deduction
  // For the request object, 'amount' is usually stored as the total value of the request.
  
  const calculatedGross = lineItems.reduce((sum, item) => !item.is_deduction ? sum + Number(item.amount || 0) : sum, 0);
  const calculatedDeduction = lineItems.reduce((sum, item) => item.is_deduction ? sum + Number(item.amount || 0) : sum, 0);
  
  // If line items are present, use them. Else fallback to 0 or totalAmount (ambiguous without items)
  const isLineItemsLoaded = lineItems.length > 0;
  
  const finalDeductionAmount = isLineItemsLoaded ? calculatedDeduction : 0;
  const finalNetPay = isLineItemsLoaded ? (calculatedGross - calculatedDeduction) : totalAmount; // Fallback: Assume total amount is net if no items (risky but needed)
  const { payrollCycle, payrollCycleDate } = resolvePayrollCycleInfo(request);

  return {
    id: request.approval_request_id || request.id || request.request_id,
    budgetId: request.budget_id || request.budgetId || null,
    description: request.description || request.request_description || '',
    amount: totalAmount,
    deductionAmount: finalDeductionAmount,
    netPay: finalNetPay,
    status,
    submittedAt,
    budgetName: request.budget_name || request.configName || null,
    requestNumber: request.request_number || request.requestNumber || null,
    approvals: request.approvals || [],
    is_self_request: request.is_self_request || false,
    submittedByName: request.submitted_by_name || request.submittedByName || null,
    submittedBy: request.submitted_by || request.submittedBy || null,
    clientSponsored: request.is_client_sponsored ?? request.client_sponsored ?? request.clientSponsored ?? false,
    payrollCycle,
    payrollCycleDate,
    lineItemsCount,
    deductionCount,
    toBePaidCount,
    employeeCount: lineItemsCount,
    approvalStageStatus,
    lineItems, // Pass line items through
    
    // Legacy/Raw Aliases for UI compatibility
    total_request_amount: totalAmount,
    overall_status: status,
    submitted_at: submittedAt,
    line_items_count: lineItemsCount,
    deduction_count: deductionCount,
    to_be_paid_count: toBePaidCount,
    payroll_cycle: payrollCycle,
    payroll_cycle_date: payrollCycleDate,
    payroll_cycle_Date: payrollCycleDate,
    payrollCycleDate: payrollCycleDate,
    request_number: request.request_number || request.requestNumber || null,
    budget_name: request.budget_name || request.configName || null,
    is_client_sponsored: request.is_client_sponsored ?? request.client_sponsored ?? request.clientSponsored ?? false,
    line_items: lineItems,
  };
};

const formatDatePHT = (dateString) => {
  return formatDateTimeCompact(dateString);
};

const getStatusBadgeClass = (status) => {
  const normalized = String(status || '').toLowerCase();

  switch (normalized) {
    case 'self_approved':
    case 'self request':
    case 'self_request':
      return 'bg-teal-500 text-white';
    case 'approved':
      return 'bg-green-600 text-white';
    case 'completed':
      return 'bg-blue-600 text-white';
    case 'rejected':
      return 'bg-red-600 text-white';
    case 'pending_payroll_approval':
    case 'pending_payment_completion':
    case 'ongoing_approval':
    case 'pending':
    case 'submitted':
      return 'bg-amber-500 text-white';
    case 'draft':
      return 'bg-slate-600 text-white';
    default:
      return 'bg-amber-500 text-white';
  }
};

export default function ApprovalPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = resolveUserRole(user);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Role-based tab visibility
  // Requestor: Submit + History only
  // L2/L3: Approval Requests + History only
  // L1/Payroll: All three tabs
  const canSubmit = userRole === 'requestor' || userRole === 'l1' || userRole === 'payroll';
  const canViewRequests = userRole === 'l1' || userRole === 'l2' || userRole === 'l3' || userRole === 'payroll';
  const defaultTab = canSubmit ? 'submit' : canViewRequests ? 'requests' : 'history';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const focusRequestId = queryParams.get('requestId');

  useEffect(() => {
    const requestedTab = queryParams.get('tab');
    if (requestedTab === 'submit' && canSubmit) {
      setActiveTab('submit');
      return;
    }
    if (requestedTab === 'requests' && canViewRequests) {
      setActiveTab('requests');
      return;
    }
    if (requestedTab === 'history') {
      setActiveTab('history');
      return;
    }
    setActiveTab(defaultTab);
  }, [queryParams, canSubmit, canViewRequests, defaultTab]);

  const handleFocusRequestHandled = useCallback(() => {
    if (!focusRequestId) return;
    const params = new URLSearchParams(location.search);
    params.delete('requestId');
    const nextSearch = params.toString();
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
  }, [focusRequestId, location.pathname, location.search, navigate]);

  const handleRefresh = () => setRefreshKey((prev) => prev + 1);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Approval Management"
        description="Submit, review, and track budget approval requests"
      />

      <div className="flex-1 p-6 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full gap-6">
          <TabsList className="bg-slate-800 border-slate-700 p-1 w-max flex-shrink-0">
            {canSubmit && (
              <TabsTrigger
                value="submit"
                className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
              >
                Submit Approval
              </TabsTrigger>
            )}
            {canViewRequests && (
              <TabsTrigger
                value="requests"
                className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
              >
                Approval Requests
              </TabsTrigger>
            )}
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
            >
              History & Logs
            </TabsTrigger>
          </TabsList>

          {canSubmit && (
            <TabsContent value="submit" className="flex-1 min-h-0">
              <SubmitApproval userId={user?.id} onRefresh={handleRefresh} refreshKey={refreshKey} />
            </TabsContent>
          )}

          {canViewRequests && (
            <TabsContent value="requests" className="flex-1 min-h-0">
              <ApprovalRequests
                refreshKey={refreshKey}
                focusRequestId={activeTab === 'requests' ? focusRequestId : null}
                onFocusRequestHandled={handleFocusRequestHandled}
              />
            </TabsContent>
          )}

          <TabsContent value="history" className="flex-1 min-h-0">
            <ApprovalHistory
              refreshKey={refreshKey}
              focusRequestId={activeTab === 'history' ? focusRequestId : null}
              onFocusRequestHandled={handleFocusRequestHandled}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SubmitApproval({ userId, onRefresh, refreshKey }) {
  const { user } = useAuth();
  const toast = useToast();
  const userRole = resolveUserRole(user);
  const [configurations, setConfigurations] = useState([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState(null);
  const [approvalsL1, setApprovalsL1] = useState([]);
  const [approvalsL2, setApprovalsL2] = useState([]);
  const [approvalsL3, setApprovalsL3] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [userDetailsCache, setUserDetailsCache] = useState({});

  const [myRequests, setMyRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDetailsData, setRequestDetailsData] = useState(null);
  const [requestConfigDetails, setRequestConfigDetails] = useState(null);
  const [detailSearch, setDetailSearch] = useState('');
  const [detailLineItemsPage, setDetailLineItemsPage] = useState(1);
  const [detailLineItemsRowsPerPage, setDetailLineItemsRowsPerPage] = useState('25');

  const [showModal, setShowModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [requestMode, setRequestMode] = useState('individual');
  const [requestDetails, setRequestDetails] = useState({
    details: '',
    clientSponsored: false,
  });
  const [searchTerm, setSearchTerm] = useState(''); // Added for budget config search
  const [individualRequest, setIndividualRequest] = useState({
    employeeId: '',
    employeeName: '',
    email: '',
    position: '',
    employeeStatus: '',
    geo: '',
    location: '',
    department: '',
    hireDate: '',
    terminationDate: '',
    amount: '',
    isDeduction: false,
    notes: '',
  });
  const [employeeLookupLoading, setEmployeeLookupLoading] = useState(false);
  const [employeeLookupError, setEmployeeLookupError] = useState(null);
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkParseError, setBulkParseError] = useState(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [amountWarning, setAmountWarning] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [isError, setIsError] = useState(false);
  const [configCurrentPage, setConfigCurrentPage] = useState(1);
  const [configRowsPerPage, setConfigRowsPerPage] = useState('10');
  const [configPagination, setConfigPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const successModalWasOpen = useRef(false);

  const token = useMemo(() => getToken(), [refreshKey]);
  const companyId = 'caaa0000-0000-0000-0000-000000000001';

  const buildCreatePayload = (totalAmount) => ({
    budget_id: selectedConfig?.id,
    description: requestDetails.details?.trim() || '',
    total_request_amount: Number(totalAmount || 0),
    submitted_by: user?.id || userId,
    created_by: user?.id || userId,
    client_sponsored: Boolean(requestDetails.clientSponsored),
  });

  // Check if user can proceed with submission
  const canProceed = useMemo(() => {
    if (requestMode === 'individual') {
      const amountValue = Number(individualRequest.amount || 0);
      const isActiveEmployee = isActiveEmployeeStatus(individualRequest.employeeStatus);
      const minLimitValue = Number(selectedConfig?.minLimit || 0);
      const maxLimitValue = Number(selectedConfig?.maxLimit || 0);
      const hasLimits = maxLimitValue > 0 || minLimitValue > 0;
      const isOutOfRange =
        hasLimits &&
        amountValue > 0 &&
        ((minLimitValue > 0 && amountValue < minLimitValue) ||
          (maxLimitValue > 0 && amountValue > maxLimitValue));
      const hasRequiredNotes = !isOutOfRange || Boolean(individualRequest.notes?.trim());

      return (
        requestDetails.details?.trim().length > 0 &&
        individualRequest.employeeId?.trim().length > 0 &&
        isActiveEmployee &&
        amountValue > 0 &&
        hasRequiredNotes
      );
    } else {
      // For bulk: need shared approval description and at least one valid item
      const hasApprovalDescription = requestDetails.details?.trim().length > 0;
      const hasValidItems = bulkItems.some((item) => {
        const hasEmployeeData = item.employee_id && item.employeeData;
        const hasValidAmount = item.amount && item.amount > 0;
        const isInScope = item.scopeValidation ? item.scopeValidation.isValid : true;
        const employeeStatus = item.employee_status || item.employeeStatus || item.employeeData?.employee_status || item.employeeData?.active_status || item.employeeData?.employment_status || item.employeeData?.status;
        const isActiveEmployee = isActiveEmployeeStatus(employeeStatus);
        return hasEmployeeData && hasValidAmount && isInScope && isActiveEmployee;
      });

      return hasApprovalDescription && hasValidItems;
    }
  }, [requestMode, requestDetails, individualRequest, bulkItems, selectedConfig?.minLimit, selectedConfig?.maxLimit]);

  const refreshBudgetConfigs = useCallback(async (forceRefresh = false) => {
    setConfigLoading(true);
    setConfigError(null);
    try {
      if (forceRefresh) {
        invalidateNamespace('budgetConfigs');
      }

      const data = await fetchWithCache(
        'budgetConfigs',
        `org_${user?.org_id || 'all'}_${configCurrentPage}_${configRowsPerPage}_${searchTerm}`,
        () => getBudgetConfigurations({
          org_id: user?.org_id,
          page: configCurrentPage,
          limit: Number(configRowsPerPage || 10),
          search: searchTerm,
        }, token),
        5 * 60 * 1000,
        forceRefresh
      );

      const items = Array.isArray(data) ? data : (data?.items || []);
      const pagination = data?.pagination || {
        page: configCurrentPage,
        limit: Number(configRowsPerPage || 10),
        totalItems: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / Number(configRowsPerPage || 10))),
        hasPrev: configCurrentPage > 1,
        hasNext: false,
      };

      setConfigurations((items || []).map(normalizeConfig).filter(config => {
        const isActive = String(config.status || '').toLowerCase() === 'active';
        const inDepartmentScope = canUserViewConfigByDepartmentScope(config, user, userRole);
        if (userRole === 'payroll') {
          return isActive && config.createdBy === user.id;
        }
        return isActive && inDepartmentScope;
      }));
      setConfigPagination(pagination);
    } catch (error) {
      setConfigError(error.message || 'Failed to load configurations');
      setConfigurations([]);
      setConfigPagination((prev) => ({ ...prev, totalItems: 0, totalPages: 1, page: 1, hasPrev: false, hasNext: false }));
    } finally {
      setConfigLoading(false);
    }
  }, [token, user?.org_id, user?.id, userRole, configCurrentPage, configRowsPerPage, searchTerm]);

  useEffect(() => {
    refreshBudgetConfigs(false);
  }, [refreshKey, refreshBudgetConfigs]);

  useEffect(() => {
    connectWebSocket();
    const unsubscribe = addWebSocketListener(async (message) => {
      if (message?.event !== 'budget_config_updated') return;

      const payload = message?.payload || {};
      const budgetId = payload.budget_id;
      if (!budgetId) return;

      if (payload.action === 'deleted') {
        setConfigurations((prev) => prev.filter((config) => String(config.id) !== String(budgetId)));
        setSelectedConfig((prev) => {
          if (!prev || String(prev.id) !== String(budgetId)) return prev;
          setShowModal(false);
          return null;
        });
        return;
      }

      try {
        const updated = await getBudgetConfigurationById(budgetId, token);
        if (!updated) return;

        const normalized = normalizeConfig(updated);
        const isActive = String(normalized.status || '').toLowerCase() === 'active';
        const isVisibleToUser = userRole === 'payroll'
          ? isActive && String(normalized.createdBy || '') === String(user?.id || '')
          : isActive && canUserViewConfigByDepartmentScope(normalized, user, userRole);

        setConfigurations((prev) => {
          if (!isVisibleToUser) {
            return prev.filter((config) => String(config.id) !== String(normalized.id));
          }

          const exists = prev.some((config) => String(config.id) === String(normalized.id));
          if (!exists) return [normalized, ...prev];
          return prev.map((config) => (String(config.id) === String(normalized.id) ? normalized : config));
        });

        setSelectedConfig((prev) => {
          if (!prev || String(prev.id) !== String(normalized.id)) return prev;
          if (!isVisibleToUser) {
            setShowModal(false);
            return null;
          }
          return normalized;
        });
      } catch (error) {
        console.error('Realtime budget config sync failed:', error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [token, userRole, user?.id]);

  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        const [l1Data, l2Data, l3Data] = await Promise.all([
          fetchWithCache('approvers', 'L1', () => getApproversByLevel('L1', token), 10 * 60 * 1000),
          fetchWithCache('approvers', 'L2', () => getApproversByLevel('L2', token), 10 * 60 * 1000),
          fetchWithCache('approvers', 'L3', () => getApproversByLevel('L3', token), 10 * 60 * 1000),
        ]);
        setApprovalsL1(l1Data || []);
        setApprovalsL2(l2Data || []);
        setApprovalsL3(l3Data || []);
      } catch (error) {
        console.error('Error fetching approvers:', error);
        setApprovalsL1([]);
        setApprovalsL2([]);
        setApprovalsL3([]);
      }
    };

    const fetchOrganizations = async () => {
      try {
        const data = await fetchWithCache('organizations', 'all', () => getOrganizations(token), 10 * 60 * 1000);
        setOrganizations(data || []);
      } catch (error) {
        console.error('Error fetching organizations:', error);
        setOrganizations([]);
      }
    };

    fetchApprovers();
    fetchOrganizations();
  }, [token]);

  // Clear submit error when switching tabs
  useEffect(() => {
    setSubmitError(null);
  }, [requestMode]);

  // Clear submit error when validation passes
  useEffect(() => {
    if (canProceed && submitError) {
      setSubmitError(null);
    }
  }, [canProceed, submitError]);

  useEffect(() => {
    if (showSuccessModal) {
      successModalWasOpen.current = true;
      return;
    }
    if (successModalWasOpen.current && successMessage) {
      successModalWasOpen.current = false;
      // Keep the user on the current tab after submit success.
    }
  }, [showSuccessModal, successMessage]);

  useEffect(() => {
    const hydrateApprovers = async () => {
      if (!selectedConfig?.approvers?.length) return;

      const needsHydration = selectedConfig.approvers.some(
        (approver) =>
          !approver.approver_name ||
          !approver.approver_email ||
          (approver.backup_approver && (!approver.backup_approver_name || !approver.backup_approver_email))
      );

      if (!needsHydration) return;

      const loadUser = async (userId) => {
        if (!userId || userDetailsCache[userId]) return userDetailsCache[userId] || null;
        try {
          const data = await getUserById(userId, token);
          if (data) {
            setUserDetailsCache((prev) => ({ ...prev, [userId]: data }));
          }
          return data || null;
        } catch (error) {
          console.error('Error fetching user details:', error);
          return null;
        }
      };

      const enriched = await Promise.all(
        selectedConfig.approvers.map(async (approver) => {
          const primaryDetails = await loadUser(approver.primary_approver);
          const backupDetails = approver.backup_approver ? await loadUser(approver.backup_approver) : null;

          return {
            ...approver,
            approver_name:
              approver.approver_name ||
              (primaryDetails ? `${primaryDetails.first_name || ''} ${primaryDetails.last_name || ''}`.trim() : null),
            approver_email: approver.approver_email || primaryDetails?.email || null,
            backup_approver_name:
              approver.backup_approver_name ||
              (backupDetails ? `${backupDetails.first_name || ''} ${backupDetails.last_name || ''}`.trim() : null),
            backup_approver_email: approver.backup_approver_email || backupDetails?.email || null,
          };
        })
      );

      setSelectedConfig((prev) => (prev ? { ...prev, approvers: enriched } : prev));
    };

    hydrateApprovers();
  }, [selectedConfig?.id, token]);

  useEffect(() => {
    if (!userId) return;
    const fetchRequests = async () => {
      setRequestsLoading(true);
      setRequestsError(null);
      try {
        const data = await fetchWithCache(
          'myRequests',
          `submitted_${userId}`,
          () => approvalRequestService.getApprovalRequests({ submitted_by: userId }, token),
          60 * 1000,
          true
        );

        const baseRequests = Array.isArray(data) ? data : [];
        const detailedRequests = await Promise.allSettled(
          baseRequests.map(async (request) => {
            const requestId = request?.approval_request_id || request?.request_id || request?.id;
            if (!requestId) return request;
            try {
              const details = await fetchWithCache(
                'approvalRequestDetails',
                requestId,
                () => approvalRequestService.getApprovalRequest(requestId, token),
                60 * 1000,
                true
              );
              return details || request;
            } catch {
              return request;
            }
          })
        );

        const mergedRequests = detailedRequests.map((result, index) =>
          result.status === 'fulfilled' && result.value ? result.value : baseRequests[index]
        );

        setMyRequests(mergedRequests.map(normalizeRequest));
      } catch (error) {
        setRequestsError(error.message || 'Failed to load requests');
        setMyRequests([]);
      } finally {
        setRequestsLoading(false);
      }
    };

    fetchRequests();
  }, [userId, token, refreshKey]);

  const applyRequestUpdate = async (requestId, action, submittedBy) => {
    if (!requestId || !userId) return;
    if (action === 'deleted') {
      invalidateNamespace('myRequests');
      invalidateNamespace('approvalRequestDetails');
      setMyRequests((prev) => prev.filter((item) => item.id !== requestId));
      if (selectedRequest?.id === requestId) {
        setDetailsOpen(false);
      }
      return;
    }

    if (submittedBy && submittedBy !== userId) return;

    try {
      invalidateNamespace('myRequests');
      invalidateNamespace('approvalRequestDetails');
      const data = await fetchWithCache(
        'approvalRequestDetails',
        requestId,
        () => approvalRequestService.getApprovalRequest(requestId, token),
        60 * 1000,
        true
      );
      if (!data || data.submitted_by !== userId) return;
      const normalized = normalizeRequest(data);

      setMyRequests((prev) => {
        const exists = prev.some((item) => item.id === normalized.id);
        if (!exists) return [normalized, ...prev];
        return prev.map((item) => (item.id === normalized.id ? normalized : item));
      });

      if (selectedRequest?.id === requestId) {
        setRequestDetailsData(data ? normalizeRequest(data) : null);
        if (normalized.budgetId) {
          const config = await getBudgetConfigurationById(normalized.budgetId, token);
          setRequestConfigDetails(config || null);
        }
      }
    } catch (error) {
      console.error('Realtime request update failed:', error);
    }
  };

  useEffect(() => {
    if (!userId) return;
    connectWebSocket();
    const unsubscribe = addWebSocketListener((message) => {
      if (message?.event !== 'approval_request_updated') return;
      const payload = message?.payload || {};
      applyRequestUpdate(payload.request_id, payload.action, payload.submitted_by);

      if (['submitted', 'approved', 'rejected', 'payment_completed', 'completed', 'deleted'].includes(String(payload.action || '').toLowerCase())) {
        refreshBudgetConfigs(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId, token, selectedRequest?.id, refreshBudgetConfigs]);

  const getOrgName = (orgId) => {
    const org = organizations.find((item) => item.org_id === orgId || item.id === orgId);
    return org ? org.org_name : orgId;
  };

  const childOrgMap = useMemo(() => {
    const childOUs = {};
    organizations.forEach((org) => {
      const parentId = org.parent_id || org.parent_org_id;
      if (parentId) {
        if (!childOUs[parentId]) {
          childOUs[parentId] = [];
        }
        childOUs[parentId].push(org);
      }
    });
    return childOUs;
  }, [organizations]);

  const formatOuPaths = (paths) => {
    if (!Array.isArray(paths) || paths.length === 0) return 'Not specified';
    
    // Group paths by parent organization
    const parentGroups = new Map();
    
    paths.forEach(path => {
      if (!Array.isArray(path) || path.length === 0) return;
      
      const parentId = path[0];
      const parentName = getOrgName(parentId);
      
      if (!parentGroups.has(parentId)) {
        parentGroups.set(parentId, {
          parentId,
          parentName,
          departments: new Set(),
          hasParentOnly: false
        });
      }
      
      const group = parentGroups.get(parentId);
      
      // If path length is 1, it means "All departments" for this parent
      if (path.length === 1) {
        group.hasParentOnly = true;
      } else if (path.length >= 2) {
        // Get the department name (last item in path)
        const deptId = path[path.length - 1];
        const deptName = getOrgName(deptId);
        group.departments.add(deptName);
      }
    });
    
    // Format each parent group
    const formatted = [];
    parentGroups.forEach(({ parentId, parentName, departments, hasParentOnly }) => {
      // Get total children count for this parent
      const totalChildren = childOrgMap[parentId]?.length || 0;
      
      // Show "All" if:
      // 1. hasParentOnly flag is true (path length = 1), OR
      // 2. Number of selected departments equals total children count
      if ((hasParentOnly && departments.size === 0) || (totalChildren > 0 && departments.size === totalChildren)) {
        formatted.push('All');
      } else if (departments.size > 0) {
        const deptArray = Array.from(departments);
        if (deptArray.length <= 4) {
          formatted.push(deptArray.join(', '));
        } else {
          const visible = deptArray.slice(0, 4).join(', ');
          const remaining = deptArray.length - 4;
          formatted.push(`${visible}...(${remaining} more)`);
        }
      } else {
        // Fallback if somehow we have neither
        formatted.push('All');
      }
    });
    
    return formatted.length ? formatted.join(' | ') : 'Not specified';
  };

  // Auto-lookup re-enabled
  // useEffect(() => { ... } logic restored
  useEffect(() => {
    const employeeId = individualRequest.employeeId?.trim();
    if (!employeeId) {
      setEmployeeLookupError(null);
      setIndividualRequest((prev) => ({
        ...prev,
        employeeName: '',
        email: '',
        position: '',
        employeeStatus: '',
        geo: '',
        location: '',
        department: '',
        hireDate: '',
        terminationDate: '',
      }));
      return;
    }

    const timer = setTimeout(async () => {
      setEmployeeLookupLoading(true);
      setEmployeeLookupError(null);
      try {
        const data = await approvalRequestService.getEmployeeByEid(employeeId, companyId, token);
        const normalizeText = (value) => String(value || '').trim().toLowerCase();

        // 1. Normalize Employee Data
        const empCompanyCode = normalizeText(data?.company_code);
        const empDepartment = normalizeText(
          data?.department || data?.dept || data?.department_name || 
          data?.dept_name || data?.org_name || data?.ou_name || ''
        );
        const employeeLocation = normalizeText(
          data?.location || data?.Location || data?.site || data?.office || data?.site_location || ''
        );

        const configLocations = parseStoredList(
          selectedConfig?.location || selectedConfig?.locations || selectedConfig?.siteLocation || []
        )
          .map((value) => normalizeText(value))
          .filter(Boolean);
        const hasLocationFilter = configLocations.length > 0 && !configLocations.includes('all');
        const locationAllowed = !hasLocationFilter || configLocations.includes(employeeLocation);

        // 2. Resolve Budget Configuration Scope
        // Get IDs of selected OUs (leaf nodes)
        const configOuPaths = parseStoredPaths(
          selectedConfig?.affectedOUPaths || selectedConfig?.affected_ou || []
        );
        const configOuIds = new Set(
          configOuPaths
            .map((path) => (Array.isArray(path) ? path[path.length - 1] : path))
            .map((value) => normalizeText(value))
            .filter(Boolean)
        );

        const hasOuFilter = configOuIds.size > 0;
        let isScopeAllowed = false;
        let rejectionReason = '';

        if (hasOuFilter) {
          // Strict Matching: Cross-reference selected OU IDs with loaded Organization data
          // to get allowed Company Codes and Department Names.
          // We use the `organizations` state which contains the full loaded list of OUs.
          const parentOnlyIds = configOuPaths
            .filter((path) => Array.isArray(path) && path.length === 1)
            .map((path) => normalizeText(path[0]))
            .filter(Boolean);
          const hasParentAll = parentOnlyIds.length > 0;

          const allowedOrgs = organizations.filter((org) =>
            configOuIds.has(normalizeText(org.id || org.org_id))
          );

          const allowedCompanyCodes = new Set(
            allowedOrgs.map((org) => normalizeText(org.company_code)).filter(Boolean)
          );
          const allowedDeptNames = new Set(
            allowedOrgs.map((org) => normalizeText(org.name || org.department || org.org_name)).filter(Boolean)
          );

          // Strict Check 1: Company Code must match
          const companyMatch = allowedCompanyCodes.has(empCompanyCode);
          // Strict Check 2: Department Name must match (Name-based, not ID-based)
          const deptMatch = hasParentAll || allowedDeptNames.has(empDepartment);

          isScopeAllowed = companyMatch && deptMatch;

          if (!isScopeAllowed) {
            rejectionReason = `Scope Mismatch. Employee Company Code: '${empCompanyCode}' (Allowed: ${Array.from(allowedCompanyCodes).join(', ')}). Employee Department: '${empDepartment}' (Allowed: ${Array.from(allowedDeptNames).join(', ')})`;
          }

        } else {
           // Fallback: If no specific OUs selected, check loosely against generic department field
           const rawConfigDepartments =
              selectedConfig?.departments ||
              selectedConfig?.department ||
              selectedConfig?.budget_department ||
              '';
            
           const configDepartmentNames = parseStoredList(rawConfigDepartments)
              .map(v => normalizeText(v))
              .filter(Boolean);
            
           const hasAll = configDepartmentNames.includes('all');
           isScopeAllowed = hasAll || configDepartmentNames.includes(empDepartment); 
           
           if (!isScopeAllowed) {
               rejectionReason = `Employee department '${empDepartment}' not allowed (Allowed: ${configDepartmentNames.join(', ')})`;
           }
        }

        if (!isScopeAllowed || !locationAllowed) {
          console.warn('[Employee Lookup] Validation Failed:', rejectionReason || 'Location mismatch');
          setEmployeeLookupError(
            !locationAllowed
              ? 'Employee location is not within the selected budget scope.'
              : 'Employee is not within the selected budget scope.'
          );
          setIndividualRequest((prev) => ({
            ...prev,
            employeeName: '',
            email: '',
            position: '',
            employeeStatus: '',
            geo: '',
            location: '',
            department: '',
            hireDate: '',
            terminationDate: '',
          }));
          return;
        }

        const resolvedEmployeeStatus =
          data?.employee_status || data?.active_status || data?.employment_status || data?.status || '';
        if (!isActiveEmployeeStatus(resolvedEmployeeStatus)) {
          setEmployeeLookupError('Employee is not ACTIVE and cannot be submitted for approval.');
          setIndividualRequest((prev) => ({
            ...prev,
            employeeName: '',
            email: '',
            position: '',
            employeeStatus: '',
            geo: '',
            location: '',
            department: '',
            hireDate: '',
            terminationDate: '',
          }));
          return;
        }

        const hireDateValue = data?.hire_date || data?.date_hired || data?.start_date || '';
        const tenureValidation = validateTenureScope(hireDateValue, selectedConfig?.tenureGroups || []);
        if (!tenureValidation.tenureAllowed) {
          console.warn('[Employee Lookup] Tenure validation failed:', tenureValidation.reason);
          setEmployeeLookupError(tenureValidation.reason || 'Employee hire date is not within the selected tenure group scope.');
          setIndividualRequest((prev) => ({
            ...prev,
            employeeName: '',
            email: '',
            position: '',
            employeeStatus: '',
            geo: '',
            location: '',
            department: '',
            hireDate: '',
            terminationDate: '',
          }));
          return;
        }

        // 3. Success: Populate Data
        setIndividualRequest((prev) => ({
          ...prev,
          employeeName: data?.name || data?.employee_name || data?.fullname || data?.full_name || '',
          email: data?.email || data?.email_address || '',
          position: data?.position || data?.job_title || data?.job_position || '',
          employeeStatus: resolvedEmployeeStatus,
          geo: data?.geo || data?.region || data?.country || '',
          location: data?.location || data?.site || data?.office || '',
          department: empDepartment || '', // Use the resolved department name
          hireDate: data?.hire_date || data?.date_hired || data?.start_date || '',
          terminationDate: data?.termination_date || data?.end_date || data?.exit_date || '',
        }));
      } catch (error) {
        setEmployeeLookupError(error.message || 'Employee not found.');
        setIndividualRequest((prev) => ({
          ...prev,
          employeeName: '',
          email: '',
          position: '',
          employeeStatus: '',
          geo: '',
          location: '',
          department: '',
          hireDate: '',
          terminationDate: '',
        }));
      } finally {
        setEmployeeLookupLoading(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    individualRequest.employeeId,
    companyId,
    token,
    selectedConfig?.id,
    selectedConfig?.department,
    selectedConfig?.departments,
    selectedConfig?.budget_department,
    selectedConfig?.affectedOUPaths,
    selectedConfig?.affected_ou,
    selectedConfig?.tenureGroups,
    organizations,
  ]);

  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        const [l1Data, l2Data, l3Data] = await Promise.all([
          getApproversByLevel('L1', token),
          getApproversByLevel('L2', token),
          getApproversByLevel('L3', token),
        ]);
        setApprovalsL1(l1Data || []);
        setApprovalsL2(l2Data || []);
        setApprovalsL3(l3Data || []);
      } catch (error) {
        console.error('Error fetching approvers:', error);
        setApprovalsL1([]);
        setApprovalsL2([]);
        setApprovalsL3([]);
      }
    };

    const fetchOrganizations = async () => {
      try {
        const data = await getOrganizations(token);
        setOrganizations(data || []);
      } catch (error) {
        console.error('Error fetching organizations:', error);
        setOrganizations([]);
      }
    };

    fetchApprovers();
    fetchOrganizations();
  }, [token]);

  useEffect(() => {
    const hydrateApprovers = async () => {
      if (!selectedConfig?.approvers?.length) return;

      const needsHydration = selectedConfig.approvers.some(
        (approver) =>
          !approver.approver_name ||
          !approver.approver_email ||
          (approver.backup_approver && (!approver.backup_approver_name || !approver.backup_approver_email))
      );

      if (!needsHydration) return;

      const loadUser = async (userId) => {
        if (!userId || userDetailsCache[userId]) return userDetailsCache[userId] || null;
        try {
          const data = await getUserById(userId, token);
          if (data) {
            setUserDetailsCache((prev) => ({ ...prev, [userId]: data }));
          }
          return data || null;
        } catch (error) {
          console.error('Error fetching user details:', error);
          return null;
        }
      };

      const enriched = await Promise.all(
        selectedConfig.approvers.map(async (approver) => {
          const primaryDetails = await loadUser(approver.primary_approver);
          const backupDetails = approver.backup_approver ? await loadUser(approver.backup_approver) : null;

          return {
            ...approver,
            approver_name:
              approver.approver_name ||
              (primaryDetails ? `${primaryDetails.first_name || ''} ${primaryDetails.last_name || ''}`.trim() : null),
            approver_email: approver.approver_email || primaryDetails?.email || null,
            backup_approver_name:
              approver.backup_approver_name ||
              (backupDetails ? `${backupDetails.first_name || ''} ${backupDetails.last_name || ''}`.trim() : null),
            backup_approver_email: approver.backup_approver_email || backupDetails?.email || null,
          };
        })
      );

      setSelectedConfig((prev) => (prev ? { ...prev, approvers: enriched } : prev));
    };

    hydrateApprovers();
  }, [selectedConfig?.id, token]);
  const handleOpenModal = (config) => {
    setSelectedConfig(config);
    setRequestMode('individual');
    setRequestDetails({ details: '', clientSponsored: false });
    setIndividualRequest({
      employeeId: '',
      employeeName: '',
      email: '',
      position: '',
      employeeStatus: '',
      geo: '',
      location: '',
      department: '',
      hireDate: '',
      terminationDate: '',
      amount: '',
      isDeduction: false,
      notes: '',
    });
    setEmployeeLookupError(null);
    setBulkItems([]);
    setBulkFileName('');
    setBulkParseError(null);
    setSubmitError(null);
    setSubmitSuccess(null);
    setShowModal(true);
  };

  const handleOpenRequestDetails = async (request) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setRequestDetailsData(null);
    setRequestConfigDetails(null);

    try {
      const data = await fetchWithCache(
        'approvalRequestDetails',
        request.id,
        () => approvalRequestService.getApprovalRequest(request.id, token),
        60 * 1000
      );
      setRequestDetailsData(data ? normalizeRequest(data) : null);

      if (request.budgetId) {
        const config = await getBudgetConfigurationById(request.budgetId, token);
        setRequestConfigDetails(config || null);
      }
    } catch (error) {
      setDetailsError(error.message || 'Failed to load request details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const refreshSelectedRequestDetails = async () => {
    if (!selectedRequest?.id) return;
    try {
      const data = await fetchWithCache(
        'approvalRequestDetails',
        selectedRequest.id,
        () => approvalRequestService.getApprovalRequest(selectedRequest.id, token),
        60 * 1000
      );
      setRequestDetailsData(data ? normalizeRequest(data) : null);

      if (selectedRequest.budgetId) {
        const config = await getBudgetConfigurationById(selectedRequest.budgetId, token);
        setRequestConfigDetails(config || null);
      }
    } catch (error) {
      setDetailsError(error.message || 'Failed to refresh request details.');
    }
  };

  useEffect(() => {
    if (!detailsOpen) return undefined;
    setDetailLineItemsPage(1);
    refreshSelectedRequestDetails();
    return undefined;
  }, [detailsOpen, selectedRequest?.id, token]);

  useEffect(() => {
    setDetailLineItemsPage(1);
  }, [detailSearch, detailLineItemsRowsPerPage]);

  const getApprovalBadgeClass = (status, isSelfRequest = false) => {
    const normalized = String(status || '').toLowerCase();

    if (isSelfRequest && normalized === 'approved') {
      return 'bg-teal-500 text-white';
    }

    switch (normalized) {
      case 'self_request':
      case 'self request':
      case 'self_approved':
        return 'bg-teal-500 text-white';
      case 'approved':
        return 'bg-green-600 text-white';
      case 'completed':
        return 'bg-blue-600 text-white';
      case 'rejected':
        return 'bg-red-600 text-white';
      case 'ongoing_approval':
      case 'pending_payroll_approval':
      case 'pending_payment_completion':
      case 'pending':
      case 'escalated':
      case 'submitted':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  const formatStatusLabel = (status, isSelfRequest = false) => {
    if (isSelfRequest && status === 'approved') {
      return 'Self Request';
    }
    return formatStatusText(status, 'Pending');
  };

  const getWorkflowStatus = (request) => {
    // Determine workflow status based on approval levels
    const approvals = request.approvals || [];
    const isSelfRequest = request.is_self_request === true;
    
    // Check approval status for each level
    const l1Approval = approvals.find(a => a.approval_level === 1);
    const l2Approval = approvals.find(a => a.approval_level === 2);
    const l3Approval = approvals.find(a => a.approval_level === 3);
    const payrollApproval = approvals.find(a => a.approval_level === 4);
    
    // If rejected at any level
    const rejectedApproval = approvals.find(a => a.status === 'rejected');
    if (rejectedApproval) {
      return `Rejected at L${rejectedApproval.approval_level}`;
    }
    
    // Check payroll completion
    if (payrollApproval?.status === 'completed' || payrollApproval?.status === 'approved') {
      return 'Completed';
    }
    
    // Check L3 status
    if (l3Approval?.status === 'approved' && !payrollApproval) {
      return 'Pending Payroll';
    }
    if (l3Approval?.status === 'pending') {
      return 'Pending L3 Approval';
    }
    
    // Check L2 status
    if (l2Approval?.status === 'approved' && !l3Approval) {
      return 'Pending L3 Approval';
    }
    if (l2Approval?.status === 'pending') {
      return 'Pending L2 Approval';
    }
    
    // Check L1 status
    if (l1Approval?.status === 'approved' && !l2Approval) {
      return 'Pending L2 Approval';
    }
    if (l1Approval?.status === 'pending') {
      if (isSelfRequest) {
        return 'Self Request';
      }
      return 'Pending L1 Approval';
    }
    
    // Default fallback
    return 'Pending L1 Approval';
  };
  const getApproverDisplayName = (userId) => {
    if (!userId) return 'Not assigned';
    const allApprovers = [...approvalsL1, ...approvalsL2, ...approvalsL3];
    const match = allApprovers.find((approver) => approver.user_id === userId);
    if (match) {
      return match.full_name || `${match.first_name || ''} ${match.last_name || ''}`.trim();
    }
    const cached = userDetailsCache[userId];
    if (cached) {
      return `${cached.first_name || ''} ${cached.last_name || ''}`.trim() || 'Loading...';
    }
    return 'Loading...';
  };

  const formatApprovers = (approvers = []) => {
    if (!approvers.length) return 'Not configured';
    return approvers
      .map((approver) => {
        const primaryLabel = approver.approver_name || getApproverDisplayName(approver.primary_approver);
        return `L${approver.approval_level}: ${primaryLabel}`;
      })
      .join(' • ');
  };

  const workflowStages = ['L1', 'L2', 'L3', 'P'];
  const getWorkflowStage = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'pending_payment_completion') return 'APPROVED';
    if (normalized.includes('pending_payroll') || normalized.includes('payroll')) return 'P';
    if (normalized.includes('l1')) return 'L1';
    if (normalized.includes('l2')) return 'L2';
    if (normalized.includes('l3')) return 'L3';
    if (normalized === 'approved') return 'APPROVED';
    if (normalized === 'rejected') return 'REJECTED';
    if (normalized === 'ongoing_approval') return 'L1';
    return 'L1';
  };
  const getWorkflowBadgeClass = (stage, status, isSelfRequest = false) => {
    const currentStage = getWorkflowStage(status);
    if (currentStage === 'APPROVED') return 'bg-green-600 text-white';
    if (currentStage === 'REJECTED' && stage === 'L1') return 'bg-red-500 text-white';
    
    // Handle self-request for L1
    if (stage === 'L1' && isSelfRequest && (status === 'l1_approved' || currentStage === 'L2' || currentStage === 'L3' || currentStage === 'P')) {
      return 'bg-teal-500 text-white';
    }
    
    // Current stage in progress
    if (stage === currentStage) return 'bg-amber-500 text-white';
    
    // Approved stages
    if ((stage === 'L1' && ['L2', 'L3', 'P', 'APPROVED'].includes(currentStage)) ||
        (stage === 'L2' && ['L3', 'P', 'APPROVED'].includes(currentStage)) ||
        (stage === 'L3' && ['P', 'APPROVED'].includes(currentStage))) {
      return 'bg-green-600 text-white';
    }
    
    return 'bg-slate-600 text-slate-300';
  };
  
  const getWorkflowStatusLabel = (status, isSelfRequest = false) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'ongoing_approval') return 'Ongoing Approval';
    if (normalized === 'pending_payroll_approval') return 'Pending Payroll Approval';
    if (normalized === 'pending_payment_completion') return 'Pending Payment Completion';
    if (normalized === 'submitted') return 'Pending L1 Approval';
    if (normalized.includes('l1')) return isSelfRequest ? 'L1 Self-Approved • Pending L2' : 'L1 Approved • Pending L2';
    if (normalized.includes('l2')) return 'L2 Approved • Pending L3';
    if (normalized.includes('l3')) return 'L3 Approved • Pending Payroll';
    if (normalized === 'approved') return 'Completed';
    if (normalized === 'rejected') return 'Rejected';
    return status;
  };
  
  const renderWorkflowSummary = (status, isSelfRequest = false) => (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-1">
        {workflowStages.map((stage, index) => (
          <React.Fragment key={stage}>
            <div className="flex flex-col items-center gap-1">
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${getWorkflowBadgeClass(stage, status, isSelfRequest)}`}>
                {stage}
              </span>
            </div>
            {index < workflowStages.length - 1 && <span className="h-px w-2 bg-slate-500" />}
          </React.Fragment>
        ))}
      </div>
      <span className="text-[10px] text-slate-400 font-medium">
        {getWorkflowStatusLabel(status, isSelfRequest)}
      </span>
    </div>
  );

  const validateCommon = () => {
    if (!selectedConfig?.id) return 'Select a budget configuration.';
    if (!requestDetails.details.trim()) return 'Approval description is required.';
    return null;
  };

  const handleDownloadTemplate = async () => {
    const XLSXModule = await import('xlsx');
    const XLSX = XLSXModule.default || XLSXModule;
    const headers = [
      'Employee ID',
      'Amount',
      'Is Deduction',
      'Notes',
    ];

    const sampleRow = {
      'Employee ID': 'EMP001',
      Amount: 2500,
      'Is Deduction': 'No',
      Notes: 'Sample entry',
    };

    const worksheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BulkTemplate');
    XLSX.writeFile(workbook, 'approval_bulk_template.xlsx');
  };

  const normalizeBulkRow = (row, index) => {
    const getValue = (keys) => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
      }
      return '';
    };

    const employeeId = getValue(['employee_id', 'Employee ID', 'EmployeeID', 'Employee']);
    const approvalDescription = getValue(['approval_description', 'Approval Description', 'Description']);
    const amountValue = getValue(['amount', 'Amount']);
    const isDeductionRaw = getValue(['is_deduction', 'Is Deduction', 'Deduction']);
    const notes = getValue(['notes', 'Notes']);

    const isDeduction = typeof isDeductionRaw === 'string'
      ? ['yes', 'true', '1'].includes(isDeductionRaw.trim().toLowerCase())
      : Boolean(isDeductionRaw);

    const amount = Number(amountValue || 0);

    return {
      item_number: index + 1,
      employee_id: String(employeeId || '').trim(),
      approval_description: String(approvalDescription || '').trim(),
      amount,
      is_deduction: isDeduction,
      notes: String(notes || '').trim(),
    };
  };

  const handleBulkFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setBulkItems([]);
      setBulkFileName('');
      setBulkParseError(null);
      setBulkUploadLoading(false);
      return;
    }

    setBulkParseError(null);
    setBulkFileName(file.name);
    setBulkUploadLoading(true);

    try {
      const XLSXModule = await import('xlsx');
      const XLSX = XLSXModule.default || XLSXModule;
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
      const parsedItems = rows.map((row, index) => normalizeBulkRow(row, index));

      if (!parsedItems.length) {
        throw new Error('Template is empty. Add at least one line item.');
      }

      // Enrich with employee data using batch processing
      // Process in batches of 100 employees
      const batchSize = 100;
      const enrichedItems = [];
      
      // Helper function to validate employee against budget scope (same as individual)
      const validateEmployeeScope = (data) => {
        const normalizeText = (value) => String(value || '').trim().toLowerCase();

        const empCompanyCode = normalizeText(data?.company_code);
        const employeeDepartment =
          data?.department ||
          data?.dept ||
          data?.department_name ||
          data?.dept_name ||
          data?.org_name ||
          data?.ou_name ||
          '';
        const employeeOrgId = normalizeText(
          data?.org_id || data?.ou_id || data?.org_unit_id || data?.department_id || ''
        );
        const employeeOrgName = employeeOrgId ? getOrgName(employeeOrgId) : '';
        const employeeLocation = normalizeText(
          data?.location || data?.Location || data?.site || data?.office || data?.site_location || ''
        );

        const configLocations = parseStoredList(
          selectedConfig?.location || selectedConfig?.locations || selectedConfig?.siteLocation || []
        )
          .map((value) => normalizeText(value))
          .filter(Boolean);
        const hasLocationFilter = configLocations.length > 0 && !configLocations.includes('all');
        const locationAllowed = !hasLocationFilter || configLocations.includes(employeeLocation);

        const rawConfigDepartments =
          selectedConfig?.departments ||
          selectedConfig?.department ||
          selectedConfig?.budget_department ||
          selectedConfig?.budgetDepartment ||
          '';

        const configDepartmentNames = parseStoredList(rawConfigDepartments)
          .map((value) => normalizeText(value))
          .filter(Boolean);

        const configOuPaths = parseStoredPaths(
          selectedConfig?.affectedOUPaths || selectedConfig?.affected_ou || []
        );
        const parentOnlyIds = configOuPaths
          .filter((path) => Array.isArray(path) && path.length === 1)
          .map((path) => normalizeText(path[0]))
          .filter(Boolean);
        const hasParentAll = parentOnlyIds.length > 0;
        const configOuIds = new Set(
          configOuPaths
            .map((path) => (Array.isArray(path) ? path[path.length - 1] : path))
            .map((value) => normalizeText(value))
            .filter(Boolean)
        );

        const hasOuFilter = configOuIds.size > 0;
        const hireDateValue = data?.hire_date || data?.date_hired || data?.start_date || '';
        const tenureValidation = validateTenureScope(hireDateValue, selectedConfig?.tenureGroups || []);

        if (hasOuFilter) {
          const allowedOrgs = organizations.filter((org) =>
            configOuIds.has(normalizeText(org.id || org.org_id))
          );

          const allowedCompanyCodes = new Set(
            allowedOrgs.map((org) => normalizeText(org.company_code)).filter(Boolean)
          );
          const allowedDeptNames = new Set(
            allowedOrgs
              .map((org) => normalizeText(org.name || org.department || org.org_name))
              .filter(Boolean)
          );

          const companyMatch = allowedCompanyCodes.has(empCompanyCode);
          const deptMatch = hasParentAll || allowedDeptNames.has(normalizeText(employeeDepartment));

          return {
            departmentAllowed: deptMatch,
            ouAllowed: companyMatch,
            locationAllowed,
            tenureAllowed: tenureValidation.tenureAllowed,
            employeeTenureGroup: tenureValidation.employeeTenureGroup,
            tenureReason: tenureValidation.reason,
            isValid: companyMatch && deptMatch && locationAllowed && tenureValidation.tenureAllowed,
            employeeDepartment,
            employeeOrgName,
          };
        }

        const hasAll = configDepartmentNames.includes('all');
        const departmentAllowed = hasAll || configDepartmentNames.includes(normalizeText(employeeDepartment));

        return {
          departmentAllowed,
          ouAllowed: true,
          locationAllowed,
          tenureAllowed: tenureValidation.tenureAllowed,
          employeeTenureGroup: tenureValidation.employeeTenureGroup,
          tenureReason: tenureValidation.reason,
          isValid: departmentAllowed && locationAllowed && tenureValidation.tenureAllowed,
          employeeDepartment,
          employeeOrgName,
        };
      };
      
      for (let i = 0; i < parsedItems.length; i += batchSize) {
        const batch = parsedItems.slice(i, i + batchSize);
        const employeeIds = batch.map(item => item.employee_id).filter(Boolean);
        
        if (employeeIds.length === 0) {
          // No employee IDs in this batch, just add as-is
          enrichedItems.push(...batch);
          continue;
        }

        try {
          // Fetch all employees in this batch in one API call
          const batchData = await approvalRequestService.getEmployeesBatch(employeeIds, companyId, token);
          
          // The API returns { found: [...], notFound: [...] }
          
          if (batchData && (batchData.found || batchData.notFound !== undefined)) {
            // Create a map of employee data by EID for quick lookup
            const employeeMap = (batchData.found || []).reduce((acc, emp) => {
              acc[emp.eid] = emp;
              return acc;
            }, {});

            // Enrich each item in the batch with validation
            const enrichedBatch = batch.map(item => {
              if (!item.employee_id) return item;
              
              const employeeData = employeeMap[item.employee_id];
              if (employeeData) {
                // Validate employee scope (same as individual validation)
                const validation = validateEmployeeScope(employeeData);
                
                return {
                  ...item,
                  employee_name: employeeData.name || '',
                  position: employeeData.position || '',
                  department: validation.employeeDepartment || validation.employeeOrgName || '',
                  employeeData: employeeData,
                  scopeValidation: validation, // Store validation result
                };
              }
              
              // Employee not found
              console.warn(`[Bulk Upload] Employee ${item.employee_id} not found in database`);
              return item;
            });

            enrichedItems.push(...enrichedBatch);
          } else {
            // API call failed for this batch, add items without enrichment
            console.error('[Bulk Upload] Batch API call returned invalid data:', batchData);
            enrichedItems.push(...batch);
          }
        } catch (error) {
          console.error(`Error fetching employee batch:`, error);
          // If batch fails, add items without enrichment
          enrichedItems.push(...batch);
        }
      }

      // Count valid and warning rows
      let validCount = 0;
      let warningCount = 0;
      let invalidCount = 0;

      enrichedItems.forEach((item, idx) => {
        const hasEmployeeData = item.employee_id && item.employeeData;
        const hasValidAmount = item.amount && item.amount > 0;
        const isInScope = item.scopeValidation ? item.scopeValidation.isValid : true;
        const employeeStatus = item.employee_status || item.employeeStatus || item.employeeData?.employee_status || item.employeeData?.active_status || item.employeeData?.employment_status || item.employeeData?.status;
        const isActiveEmployee = isActiveEmployeeStatus(employeeStatus);
        
        // Valid: has employee data, valid amount, and is in scope
        if (hasEmployeeData && hasValidAmount && isInScope && isActiveEmployee) {
          validCount++;
        } 
        // Invalid: missing critical data or out of scope
        else if (!hasEmployeeData || !hasValidAmount || !isInScope || !isActiveEmployee) {
          invalidCount++;
        }
        // Warning: has some data but incomplete
        else {
          warningCount++;
        }
      });

      // Only reject if ALL rows are completely invalid
      if (validCount === 0 && warningCount === 0 && enrichedItems.length > 0) {
        console.error('[Bulk Upload Validation] All items are invalid - rejecting file');
        throw new Error('File contains only invalid data. At least one ACTIVE employee must be found with a valid amount and be in the budget scope.');
      }

      setBulkItems(enrichedItems);
    } catch (error) {
      console.error('Error parsing bulk template:', error);
      setBulkItems([]);
      setBulkParseError(error.message || 'Failed to parse the template file.');
    } finally {
      setBulkUploadLoading(false);
    }
  };

  const validateEmployeeCb = useCallback((item) => {
    const errors = [];
    const warnings = [];
    
    // Check if employee ID exists
    if (!item.employee_id) {
      errors.push('Employee ID required');
    }
    
    // Check if employee was found
    if (item.employee_id && !item.employeeData) {
      errors.push('Employee not found');
    }

    if (item.employee_id && item.employeeData) {
      const employeeStatus =
        item.employee_status ||
        item.employeeStatus ||
        item.employeeData?.employee_status ||
        item.employeeData?.active_status ||
        item.employeeData?.employment_status ||
        item.employeeData?.status;
      if (!isActiveEmployeeStatus(employeeStatus)) {
        errors.push('Employee status must be ACTIVE');
      }
    }
    
    // Check if employee is in configuration scope (same validation as individual)
    if (item.employeeData && item.scopeValidation && selectedConfig) {
      if (!item.scopeValidation.departmentAllowed) {
        errors.push('Employee department not in budget scope');
      }
      if (!item.scopeValidation.ouAllowed) {
        errors.push('Employee OU/organization not in budget scope');
      }
        if (item.scopeValidation.locationAllowed === false) {
          errors.push('Employee location not in budget scope');
        }
      if (item.scopeValidation.tenureAllowed === false) {
        errors.push(item.scopeValidation.tenureReason || 'Employee tenure group is not in budget scope');
      }
    }
    
    // Check amount
    if (!item.amount || item.amount <= 0) {
      errors.push('Valid amount required');
    }
    
    // Check for warnings - only for amount/deduction issues
    const minLimit = Number(selectedConfig?.minLimit || 0);
    const maxLimit = Number(selectedConfig?.maxLimit || 0);
    const needsNotes = 
      item.is_deduction ||
      (minLimit > 0 && item.amount < minLimit) ||
      (maxLimit > 0 && item.amount > maxLimit);
    
    if (needsNotes && !item.notes?.trim()) {
      warnings.push('Notes required for deduction/out-of-range amount');
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }, [selectedConfig]);

  const handleSubmitIndividual = async () => {
    const commonError = validateCommon();
    if (commonError) {
      setConfirmLoading(false);
      toast.error(commonError);
      setSubmitError(commonError);
      return;
    }

    if (!individualRequest.employeeId || !individualRequest.employeeName || !individualRequest.department || !individualRequest.position || !individualRequest.amount) {
      setConfirmLoading(false);
      toast.error('Complete all required individual fields.');
      setSubmitError('Complete all required individual fields.');
      return;
    }

    if (!isActiveEmployeeStatus(individualRequest.employeeStatus)) {
      setConfirmLoading(false);
      toast.error('Only employees with ACTIVE status can be submitted.');
      setSubmitError('Only employees with ACTIVE status can be submitted.');
      return;
    }

    const amountValue = Number(individualRequest.amount);
    if (!amountValue || Number.isNaN(amountValue)) {
      setConfirmLoading(false);
      toast.error('Enter a valid amount.');
      setSubmitError('Enter a valid amount.');
      return;
    }

    const minLimitValue = Number(selectedConfig?.minLimit || 0);
    const maxLimitValue = Number(selectedConfig?.maxLimit || 0);
    const hasLimits = maxLimitValue > 0 || minLimitValue > 0;
    const isOutOfRange =
      hasLimits &&
      ((minLimitValue > 0 && amountValue < minLimitValue) ||
        (maxLimitValue > 0 && amountValue > maxLimitValue));

    if (isOutOfRange && !individualRequest.notes?.trim()) {
      setConfirmLoading(false);
      toast.error('Amount is outside the configured range. Please add notes to proceed.');
      setSubmitError('Amount is outside the configured range. Please add notes to proceed.');
      return;
    }

    const totalAmount = individualRequest.isDeduction ? -amountValue : amountValue;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const created = await approvalRequestService.createApprovalRequest(buildCreatePayload(totalAmount), token);
      const requestId = created?.id || created?.request_id || created?.approval_request_id;
      if (!requestId) throw new Error('Approval request ID not returned.');

      await approvalRequestService.addLineItem(
        requestId,
        {
          item_number: 1,
          employee_id: individualRequest.employeeId,
          employee_name: individualRequest.employeeName,
          email: individualRequest.email,
          employee_status: individualRequest.employeeStatus,
          geo: individualRequest.geo,
          location: individualRequest.location,
          department: individualRequest.department,
          position: individualRequest.position,
          hire_date: individualRequest.hireDate || null,
          termination_date: individualRequest.terminationDate || null,
          item_type: 'other',
          item_description: individualRequest.notes?.trim() || null,
          amount: amountValue,
          is_deduction: individualRequest.isDeduction,
          notes: individualRequest.notes,
        },
        token
      );

      const submitResult = await approvalRequestService.submitApprovalRequest(requestId, token);

      invalidateNamespace('myRequests');
      invalidateNamespace('approvalRequests');
      invalidateNamespace('approvalRequestDetails');
      invalidateNamespace('pendingApprovals');

      // Backend now handles auto-approval for Self-Request
      const successMsg = submitResult?.autoApproved 
        ? 'Approval request submitted and L1 auto-approved (Self-Request).'
        : 'Approval request submitted successfully.';
      
      // Close confirmation modal
      setConfirmAction(null);
      setConfirmLoading(false);
      
      // Show success modal
      setIsError(false);
      setSuccessMessage(successMsg);
      setShowSuccessModal(true);
      setCountdown(5);
      
      // Countdown and auto-close
      let timeLeft = 5;
      const countdownInterval = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          setShowSuccessModal(false);
          setShowModal(false);
          onRefresh();
        }
      }, 1000);
    } catch (error) {
      console.error('[handleSubmitIndividual] Error:', error);
      const errorMsg = extractErrorMessage(error);
      
      // Close confirmation modal
      setConfirmAction(null);
      setConfirmLoading(false);
      
      setSubmitError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
      setConfirmLoading(false);
    }
  };

  const handleSubmitBulk = async () => {
    const commonError = validateCommon();
    if (commonError) {
      setConfirmLoading(false);
      setSubmitError(commonError);
      return;
    }
    
    if (bulkParseError) {
      setConfirmLoading(false);
      setSubmitError(bulkParseError);
      return;
    }
    
    if (!bulkItems.length) {
      setConfirmLoading(false);
      setSubmitError('Upload the template with at least one line item.');
      return;
    }
    
    // Filter to only valid items (has employee data, amount, and in scope)
    const validItems = bulkItems.filter(item => {
      const hasEmployeeData = item.employee_id && item.employeeData;
      const hasValidAmount = item.amount && item.amount > 0;
      const isInScope = item.scopeValidation ? item.scopeValidation.isValid : true;
      const employeeStatus = item.employee_status || item.employeeStatus || item.employeeData?.employee_status || item.employeeData?.active_status || item.employeeData?.employment_status || item.employeeData?.status;
      const isActiveEmployee = isActiveEmployeeStatus(employeeStatus);
      return hasEmployeeData && hasValidAmount && isInScope && isActiveEmployee;
    });
    
    if (!validItems.length) {
      setConfirmLoading(false);
      setSubmitError('No valid items to submit. Ensure at least one ACTIVE employee has valid data and is in scope.');
      return;
    }

    // Calculate net total from valid items only (deductions reduce total)
    const totalAmount = validItems.reduce((sum, item) => {
      const amount = Number(item.amount || 0);
      return sum + (item.is_deduction ? -amount : amount);
    }, 0);
    
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const created = await approvalRequestService.createApprovalRequest(buildCreatePayload(totalAmount), token);
      
      const requestId = created?.id || created?.request_id || created?.approval_request_id;
      if (!requestId) throw new Error('Approval request ID not returned.');

      // Transform validItems to match backend schema
      const lineItemsForBackend = validItems.map(item => ({
        employee_id: item.employee_id,
        employee_name: item.employee_name || item.employeeData?.name || '',
        email: item.email || item.employeeData?.email || '',
        position: item.position || item.employeeData?.position || '',
        department: item.department || item.employeeData?.department || item.employeeData?.dept || '',
        employee_status: item.employee_status || item.employeeStatus || item.employeeData?.employee_status || item.employeeData?.active_status || item.employeeData?.employment_status || item.employeeData?.status || '',
        geo: item.geo || item.employeeData?.geo || item.employeeData?.region || '',
        location: item.location || item.employeeData?.location || item.employeeData?.site || '',
        hire_date: item.hire_date || item.hireDate || item.employeeData?.hire_date || item.employeeData?.date_hired || '',
        termination_date: item.termination_date || item.terminationDate || item.employeeData?.termination_date || item.employeeData?.end_date || '',
        item_type: 'bonus', // Default type
        item_description: item.notes?.trim() || null,
        amount: Number(item.amount || 0),
        is_deduction: Boolean(item.is_deduction),
        has_warning: Boolean(item.has_warning),
        warning_reason: item.warning_reason || '',
        notes: item.notes || null,
      }));

      await approvalRequestService.addLineItemsBulk(
        requestId,
        {
          line_items: lineItemsForBackend,
        },
        token
      );

      const submitResult = await approvalRequestService.submitApprovalRequest(requestId, token);

      invalidateNamespace('myRequests');
      invalidateNamespace('approvalRequests');
      invalidateNamespace('approvalRequestDetails');
      invalidateNamespace('pendingApprovals');

      // Backend now handles auto-approval for Self-Request
      let successMsg = validItems.length < bulkItems.length 
        ? `Bulk approval submitted with ${validItems.length} valid item(s). ${bulkItems.length - validItems.length} invalid item(s) were skipped.`
        : 'Bulk approval request submitted successfully.';
      
      if (submitResult?.autoApproved) {
        successMsg += ' L1 auto-approved (Self-Request).';
      }
      
      // Close confirmation modal
      setConfirmAction(null);
      setConfirmLoading(false);
      
      // Show success modal
      setIsError(false);
      setSuccessMessage(successMsg);
      setShowSuccessModal(true);
      setCountdown(5);
      
      // Countdown and auto-close
      let timeLeft = 5;
      const countdownInterval = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          setShowSuccessModal(false);
          setShowModal(false);
          onRefresh();
        }
      }, 1000);
    } catch (error) {
      console.error('[handleSubmitBulk] Submission error:', error);
      console.error('[handleSubmitBulk] Error stack:', error.stack);
      const errorMsg = extractErrorMessage(error);
      
      // Close confirmation modal
      setConfirmAction(null);
      setConfirmLoading(false);
      
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
      setConfirmLoading(false);
    }
  };

  const detailRecord = requestDetailsData || selectedRequest || {};
  const detailStatus =
    detailRecord.overall_status || detailRecord.status || selectedRequest?.status || 'draft';
  const detailSubmittedAt =
    detailRecord.submitted_at || detailRecord.created_at || selectedRequest?.submittedAt || '';
  const detailAmount = detailRecord.total_request_amount || selectedRequest?.amount || 0;
  const detailBudgetName =
    detailRecord.budget_name ||
    selectedRequest?.budgetName ||
    requestConfigDetails?.budget_name ||
    requestConfigDetails?.name ||
    'Budget Configuration';
  const detailDescriptionRaw = detailRecord.description || selectedRequest?.description || '';
  const detailDescription = String(detailDescriptionRaw || '').slice(0, 500);
  const detailRequestNumber =
    detailRecord.request_number || selectedRequest?.requestNumber || detailRecord.requestNumber || '—';
  const detailLineItems = requestDetailsData?.line_items || [];
  const approvalsForDetail = requestDetailsData?.approvals || [];
  const detailStageStatus =
    detailRecord.approval_stage_status || computeStageStatus(approvalsForDetail, detailStatus);
  const detailStageLabel = formatStageStatusLabel(detailStageStatus);
  const pendingApprovalForUser = approvalsForDetail.find(
    (approval) =>
      String(approval.status || '').toLowerCase() === 'pending' &&
      (approval.assigned_to_primary === user?.id || approval.assigned_to_backup === user?.id)
  );
  const roleLevelMap = {
    l1: 1,
    l2: 2,
    l3: 3,
    payroll: 4,
  };
  const fallbackLevel = roleLevelMap[userRole];
  const currentApprovalLevel = pendingApprovalForUser?.approval_level || fallbackLevel || null;
  const canActOnRequest = Boolean(currentApprovalLevel && userRole !== 'requestor');
  const detailApprovals = requestDetailsData?.approvals || [];
  const filteredLineItems = detailLineItems.filter((item) => {
    if (!detailSearch.trim()) return true;
    const term = detailSearch.toLowerCase();
    return [
      item.employee_id,
      item.employee_name,
      item.department,
      item.position,
      item.item_description,
      item.notes,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });
  const detailLineItemsRowsPerPageNumber = Number(detailLineItemsRowsPerPage || 10);
  const detailLineItemsTotalPages = Math.max(1, Math.ceil(filteredLineItems.length / detailLineItemsRowsPerPageNumber));
  const safeDetailLineItemsPage = Math.min(detailLineItemsPage, detailLineItemsTotalPages);
  const visibleLineItems = filteredLineItems.slice(
    (safeDetailLineItemsPage - 1) * detailLineItemsRowsPerPageNumber,
    safeDetailLineItemsPage * detailLineItemsRowsPerPageNumber
  );
  const warningCount = detailLineItems.filter((item) => item.has_warning || Number(item.amount || 0) < 0).length;
  const budgetUsed = Number(
    requestConfigDetails?.approved_amount ??
      requestConfigDetails?.approvedAmount ??
      requestConfigDetails?.usedAmount ??
      requestConfigDetails?.budget_used ??
      0
  );
  const budgetMax = Number(
    requestConfigDetails?.total_budget ||
      requestConfigDetails?.totalBudget ||
      requestConfigDetails?.total_budget_amount ||
      requestConfigDetails?.budget_total ||
      0
  );
  const hasTotalBudget = budgetMax > 0;
  const projectedUsed = budgetUsed + Number(detailAmount || 0);
  const budgetPercent = hasTotalBudget ? Math.min(100, (projectedUsed / budgetMax) * 100) : 0;

  const handleApprove = async () => {
    if (!selectedRequest?.id || !currentApprovalLevel) return;
    setActionSubmitting(true);
    setActionError(null);
    try {
      await approvalRequestService.approveRequest(
        selectedRequest.id,
        {
          approval_level: currentApprovalLevel,
          approver_name: user?.name || user?.full_name || user?.email || 'Approver',
          approver_title: user?.role || 'approver',
          approval_notes: decisionNotes || '',
          user_id: user?.id,
        },
        getToken()
      );

      invalidateNamespace('approvalRequests');
      invalidateNamespace('approvalRequestDetails');
      invalidateNamespace('pendingApprovals');
      invalidateNamespace('myRequests');

      await refreshDetails();
      await fetchApprovals();
      setDecisionNotes('');
    } catch (error) {
      console.error('[SubmitApproval.handleApprove] Error:', error);
      const errMsg = extractErrorMessage(error);
      toast.error(errMsg);
      setActionError(errMsg);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest?.id || !currentApprovalLevel) return;
    if (!decisionNotes.trim()) {
      toast.error('Rejection reason is required.');
      setActionError('Rejection reason is required.');
      return;
    }
    setActionSubmitting(true);
    setActionError(null);
    try {
      await approvalRequestService.rejectRequest(
        selectedRequest.id,
        {
          approval_level: currentApprovalLevel,
          approver_name: user?.name || user?.full_name || user?.email || 'Approver',
          rejection_reason: decisionNotes,
          user_id: user?.id,
        },
        getToken()
      );

      invalidateNamespace('approvalRequests');
      invalidateNamespace('approvalRequestDetails');
      invalidateNamespace('pendingApprovals');
      invalidateNamespace('myRequests');

      await refreshDetails();
      await fetchApprovals();
      setDecisionNotes('');
    } catch (error) {
      console.error('[SubmitApproval.handleReject] Error:', error);
      const errMsg = extractErrorMessage(error);
      toast.error(errMsg);
      setActionError(errMsg);
    } finally {
      setActionSubmitting(false);
    }
  };
  const getApproverForLevel = (level) => {
    const approvers = requestConfigDetails?.approvers || [];
    if (level === 'P') {
      return approvers.find((approver) => String(approver.approval_level || '').toLowerCase().includes('payroll')) || null;
    }
    return approvers.find((approver) => String(approver.approval_level) === String(level)) || null;
  };
  const getApprovalForLevel = (level) => {
    if (level === 'P') {
      return detailApprovals.find((approval) => String(approval.approval_level || '').toLowerCase().includes('payroll')) || null;
    }
    return detailApprovals.find((approval) => String(approval.approval_level) === String(level)) || null;
  };

  const filteredConfigs = configurations.filter(config =>
    !(userRole === 'requestor' && ['payroll', 'l1'].includes(String(config.created_by_role || '').toLowerCase()))
  );
  const configTotalPages = Math.max(1, Number(configPagination?.totalPages || 1));
  const safeConfigPage = Math.min(Math.max(1, configCurrentPage), configTotalPages);
  const paginatedConfigs = filteredConfigs;

  useEffect(() => {
    setConfigCurrentPage(1);
  }, [searchTerm, configRowsPerPage]);

  useEffect(() => {
    if (configCurrentPage > configTotalPages) {
      setConfigCurrentPage(configTotalPages);
    }
  }, [configCurrentPage, configTotalPages]);

  const visibleMyRequests = myRequests.filter((request) => {
    const rawStatus = String(request.overall_status || request.status || '').toLowerCase();
    return rawStatus !== 'completed';
  });

  return (
    <>
      <div className="flex flex-col gap-6 h-full min-h-0">
        {(submitting || confirmLoading) && <LoadingLine />}
        <Card className="bg-slate-800 border-slate-700 flex flex-col w-full flex-1 min-h-0 overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white">Submit New Approval Request</CardTitle>
              <CardDescription className="text-gray-400">
                Select a budget configuration to submit an approval request
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(sanitizeSingleLine(e.target.value))}
                className="pl-8 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400 h-9"
                maxLength={100}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
          {configLoading ? (
            <div className="p-8 text-center text-gray-400">Loading configurations...</div>
          ) : configError ? (
            <div className="p-8 text-center text-red-400">{configError}</div>
          ) : filteredConfigs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No active budget configurations found.</div>
          ) : (
            <>
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="min-w-[1400px] w-full text-left text-sm text-gray-300 border-collapse">
              <thead className="text-xs uppercase bg-slate-900/50 text-gray-400 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3 font-medium">Budget Name</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Geo</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Clients</th>
                  <th className="px-4 py-3 font-medium">Departments</th>
                  <th className="px-4 py-3 font-medium text-right">Client Sponsored Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Used Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Ongoing Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Remaining</th>
                  <th className="px-4 py-3 font-medium text-center sticky right-0 z-30 bg-slate-900/95 border-l border-slate-700 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {paginatedConfigs.map((config) => {
                  const used = Number(config.approvedAmount ?? config.usedAmount ?? 0);
                  const ongoing = Number(config.ongoingAmount ?? 0);
                    const clientSponsoredAmount = Number(config.clientSponsoredAmount ?? 0);
                  const limitValue = Number(config.totalBudget || config.budgetLimit || 0);
                  const formattedRemaining = limitValue > 0 
                      ? (limitValue - used).toLocaleString('en-US') 
                      : 'Unlimited';
                  
                  const pathsText = formatOuPaths(config.affectedOUPaths || config.affected_ou || []);

                  return (
                    <tr key={config.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{config.name}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={config.description}>
                        {config.description || '—'}
                      </td>
                      <td className="px-4 py-3 max-w-[150px] truncate" title={config.geo?.join(', ')}>
                        {config.geo?.length ? config.geo.join(', ') : 'All'}
                      </td>
                      <td className="px-4 py-3 max-w-[150px] truncate" title={config.location?.join(', ')}>
                        {config.location?.length ? config.location.join(', ') : 'All'}
                      </td>
                      <td className="px-4 py-3 max-w-[150px] truncate" title={config.clients?.join(', ')}>
                        {config.clients?.length ? config.clients.join(', ') : 'All'}
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={pathsText}>
                        {pathsText}
                      </td>
                      <td className="px-4 py-3 text-right text-fuchsia-300 font-medium">
                        {formatCurrencyValue(clientSponsoredAmount)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                        {formatCurrencyValue(used)}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-400 font-medium">
                        {formatCurrencyValue(ongoing)}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-400 font-medium">
                        {limitValue > 0 ? `₱${formattedRemaining}` : '∞'}
                      </td>
                      <td className="px-4 py-3 text-center sticky right-0 z-20 bg-slate-800 border-l border-slate-700/60 whitespace-nowrap">
                        <Button
                          size="sm"
                          className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleOpenModal(config)}
                        >
                          Submit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-700/60">
              <PaginationControls
                page={safeConfigPage}
                totalPages={configTotalPages}
                rowsPerPage={configRowsPerPage}
                onPageChange={(page) => setConfigCurrentPage(page)}
                onRowsPerPageChange={(value) => setConfigRowsPerPage(value)}
              />
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700 flex flex-col w-full flex-1 min-h-0 overflow-hidden">
  <CardHeader>
    <CardTitle className="text-white">My Ongoing Approval Requests</CardTitle>
    <CardDescription className="text-gray-400">
      Track status for your submitted approval requests
    </CardDescription>
  </CardHeader>
  <CardContent className="flex-1 min-h-0 flex flex-col overflow-hidden">
    {requestsLoading ? (
      <div className="text-sm text-gray-400">Loading requests...</div>
    ) : requestsError ? (
      <div className="text-sm text-red-400">{requestsError}</div>
    ) : visibleMyRequests.length === 0 ? (
      <div className="text-sm text-gray-400">No approval requests submitted yet.</div>
    ) : (
      /* The wrapper below is the key: 
         'overflow-x-auto' enables the horizontal scroll.
         'max-w-full' ensures it doesn't push the screen width.
      */
      <div className="border border-slate-600 rounded-md w-full max-w-full overflow-x-auto overflow-y-auto flex-1">
        <table className="min-w-[1300px] w-full border-collapse">
          <thead className="bg-slate-700 sticky top-0 z-20">
            <tr>
              <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Request #
              </th>
              <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Budget Name
              </th>
              <th className="border-b border-slate-600 px-4 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Client Sponsored
              </th>
              <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Payroll Cycle
              </th>
              <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Payroll Cycle Date
              </th>
              <th className="border-b border-slate-600 px-4 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Total Employees
              </th>
              <th className="border-b border-slate-600 px-4 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Deductions
              </th>
              <th className="border-b border-slate-600 px-4 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider">
                To Be Paid
              </th>
              <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Description
              </th>
              <th className="border-b border-slate-600 px-4 py-3 text-right text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Total Amount
              </th>
              <th className="border-b border-slate-600 px-4 py-3 text-right text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Deductions (Amt)
              </th>
              <th className="border-b border-slate-600 px-4 py-3 text-right text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Net Pay
              </th>
              <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Submitted
              </th>
              <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Status
              </th>
              {/* Sticky Right Column Header */}
              <th className="border-b border-slate-600 px-4 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider sticky right-0 bg-slate-700 z-30">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-slate-800/50">
            {visibleMyRequests.map((request) => {
              const approvals = request.approvals || [];
              const stageStatus = request.approvalStageStatus || computeStageStatus(approvals, request.overall_status || request.status);
              const displayStatus = formatStageStatusLabel(stageStatus);
              const employeeCount = Number(request.lineItemsCount ?? request.line_items_count ?? request.employeeCount ?? request.employee_count ?? 0) || 0;
              const deductionCount = Number(request.deductionCount ?? request.deduction_count ?? 0) || 0;
              const payCount = request.toBePaidCount ?? request.to_be_paid_count ?? Math.max(0, employeeCount - deductionCount);
              
              return (
                <tr
                  key={request.id}
                  className="group hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-b-0"
                >
                  <td className="px-4 py-3 text-xs text-slate-300 font-mono">
                    {request.requestNumber || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-white font-medium">
                    {request.budgetName}
                  </td>
                  <td className="px-4 py-3 text-xs text-center text-slate-300">
                    {request.clientSponsored ? 'Yes' : 'No'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {request.payrollCycle || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {request.payrollCycleDate || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-center text-white font-semibold">
                    {employeeCount}
                  </td>
                  <td className="px-4 py-3 text-xs text-center text-red-400">
                    {deductionCount}
                  </td>
                  <td className="px-4 py-3 text-xs text-center text-emerald-400">
                    {payCount}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300 max-w-xs truncate" title={request.description}>
                    {request.description || 'No description'}
                  </td>
                  <td className="px-4 py-3 text-xs text-right font-semibold text-emerald-400">
                    ₱{Number(request.amount || 0).toLocaleString('en-US')}
                  </td>
                  <td className="px-4 py-3 text-xs text-right text-red-400">
                    ₱{Number(request.deductionAmount || 0).toLocaleString('en-US')}
                  </td>
                  <td className="px-4 py-3 text-xs text-right font-bold text-emerald-400">
                    ₱{Number(request.netPay || 0).toLocaleString('en-US')}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatDatePHT(request.submittedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-[10px] ${getStageStatusBadgeClass(stageStatus)}`}>
                      {displayStatus}
                    </Badge>
                  </td>
                  {/* Sticky Right Column Data */}
                  <td className="px-4 py-3 text-center sticky right-0 bg-slate-800 group-hover:bg-slate-700 transition-colors z-10 border-l border-slate-700/50">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-700"
                      onClick={() => handleOpenRequestDetails(request)}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </CardContent>
</Card>
    </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className={`bg-slate-800 border-slate-700 text-white flex flex-col ${
          requestMode === 'bulk' && bulkItems.length > 0
            ? '!w-[99vw] sm:!w-[98vw] md:!w-[97vw] lg:!w-[96vw] xl:!w-[95vw] 2xl:!w-[92vw] !max-w-[1800px] max-h-[90vh] p-0 overflow-y-auto'
            : 'w-[95vw] md:w-[80vw] xl:w-[60vw] max-w-none max-h-[90vh] overflow-y-auto p-4'
        }`}>
<DialogHeader className={`flex-shrink-0 space-y-0 ${requestMode === 'bulk' && bulkItems.length > 0 ? 'px-5 pt-4 pb-1' : 'pb-2'}`}>
      <DialogTitle className="text-lg font-bold leading-tight">Submit Approval Request</DialogTitle>
      <DialogDescription className="text-gray-400 leading-tight">
        {selectedConfig?.name}
      </DialogDescription>
    </DialogHeader>

          {submitError && (
            <div className={`${requestMode === 'bulk' && bulkItems.length > 0 ? 'mx-6' : ''} rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300`}>
              {submitError}
            </div>
          )}

 <div className={`flex-1 flex flex-col min-h-0 justify-start items-stretch ${
      requestMode === 'bulk' && bulkItems.length > 0 
        ? 'px-5 pb-4' 
        : 'mt-1'
    }`}>
      <Tabs value={requestMode} onValueChange={setRequestMode} className="flex-1 flex flex-col justify-start items-stretch min-h-0">
        <TabsList className="bg-slate-700 border-slate-600 p-1 flex-shrink-0 mb-2 w-full justify-start">
          <TabsTrigger
            value="individual"
            className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
          >
            Individual
          </TabsTrigger>
          <TabsTrigger
            value="bulk"
            className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
          >
            Bulk Upload
          </TabsTrigger>
        </TabsList>

              <TabsContent value="individual" className="space-y-4 flex-1 overflow-y-auto mt-3">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="text-white">Employee ID *</Label>
                    <Input
                      value={individualRequest.employeeId}
                      onChange={(e) =>
                        setIndividualRequest((prev) => ({
                          ...prev,
                          employeeId: sanitizeIdInput(e.target.value),
                        }))}
                      onKeyDown={blockShortcuts}
                      maxLength={15}
                      placeholder="e.g., EMP001"
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                    {employeeLookupLoading && (
                      <p className="text-xs text-slate-400">Fetching employee details...</p>
                    )}
                    {employeeLookupError && (
                      <p className="text-xs text-red-300">{employeeLookupError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Employee Name</Label>
                    <Input
                      value={individualRequest.employeeName}
                      disabled
                      className="bg-slate-800 border-slate-600 text-slate-300 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Email</Label>
                    <Input
                      value={individualRequest.email}
                      disabled
                      className="bg-slate-800 border-slate-600 text-slate-300 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Position</Label>
                    <Input
                      value={individualRequest.position}
                      disabled
                      className="bg-slate-800 border-slate-600 text-slate-300 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Employee Status</Label>
                    <Input
                      value={individualRequest.employeeStatus}
                      disabled
                      className="bg-slate-800 border-slate-600 text-slate-300 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Geo</Label>
                    <Input
                      value={individualRequest.geo}
                      disabled
                      className="bg-slate-800 border-slate-600 text-slate-300 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Location</Label>
                    <Input
                      value={individualRequest.location}
                      disabled
                      className="bg-slate-800 border-slate-600 text-slate-300 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Department</Label>
                    <Input
                      value={individualRequest.department}
                      disabled
                      className="bg-slate-800 border-slate-600 text-slate-300 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Hire Date</Label>
                    <Input
                      type="date"
                      value={individualRequest.hireDate || ''}
                      disabled
                      className="bg-slate-800 border-slate-600 text-slate-300 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Termination Date</Label>
                    <Input
                      type="date"
                      value={individualRequest.terminationDate || ''}
                      disabled
                      className="bg-slate-800 border-slate-600 text-slate-300 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Amount *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={individualRequest.amount}
                      onChange={(e) =>
                        setIndividualRequest((prev) => ({
                          ...prev,
                          amount: e.target.value.slice(0, 10),
                        }))}
                      maxLength={10}
                      placeholder="e.g., 2500"
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                    {selectedConfig && (Number(selectedConfig.minLimit) > 0 || Number(selectedConfig.maxLimit) > 0) && (
                      <p className="text-xs text-slate-400">
                        Range: {Number(selectedConfig.minLimit).toLocaleString('en-US')} - {Number(selectedConfig.maxLimit).toLocaleString('en-US')}
                      </p>
                    )}
                    {(() => {
                      const amountValue = Number(individualRequest.amount);
                      const minLimitValue = Number(selectedConfig?.minLimit || 0);
                      const maxLimitValue = Number(selectedConfig?.maxLimit || 0);
                      const hasLimits = maxLimitValue > 0 || minLimitValue > 0;
                      const isOutOfRange =
                        hasLimits &&
                        !Number.isNaN(amountValue) &&
                        amountValue !== 0 &&
                        ((minLimitValue > 0 && amountValue < minLimitValue) ||
                          (maxLimitValue > 0 && amountValue > maxLimitValue));

                      return isOutOfRange ? (
                        <p className="text-xs text-amber-300">
                          Amount is outside the configured range ({minLimitValue || '—'} - {maxLimitValue || '—'}).
                          Notes are required to proceed.
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isDeduction"
                    checked={individualRequest.isDeduction}
                    onCheckedChange={(checked) => setIndividualRequest((prev) => ({ ...prev, isDeduction: Boolean(checked) }))}
                    className="border-blue-400 bg-slate-600"
                  />
                  <Label htmlFor="isDeduction" className="text-white text-sm">Deduction?</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="clientSponsored"
                    checked={requestDetails.clientSponsored}
                    onCheckedChange={(checked) => setRequestDetails((prev) => ({ ...prev, clientSponsored: Boolean(checked) }))}
                    className="border-blue-400 bg-slate-600"
                  />
                  <Label htmlFor="clientSponsored" className="text-white text-sm">Client Sponsored?</Label>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-white">Notes</Label>
                    <Textarea
                      value={individualRequest.notes}
                      onChange={(e) =>
                        setIndividualRequest((prev) => ({
                          ...prev,
                          notes: sanitizeTextInput(e.target.value),
                        }))}
                      onKeyDown={blockShortcuts}
                      maxLength={500}
                      rows={3}
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                    <p className="text-xs text-slate-400">
                      Use this only if there is an exception, special handling, or additional context needed.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Approval Description *</Label>
                    <Textarea
                      value={requestDetails.details}
                      onChange={(e) =>
                        setRequestDetails((prev) => ({
                          ...prev,
                          details: sanitizeTextInput(e.target.value),
                        }))}
                      onKeyDown={blockShortcuts}
                      maxLength={500}
                      rows={3}
                      className="bg-slate-700 border-gray-300 text-white"
                      placeholder="Describe the request details, purpose, and any important context."
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bulk" className="flex-1 flex flex-col space-y-1 min-h-0">
                <div className="space-y-2">
                  <Label className="text-white">Bulk Template Upload *</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDownloadTemplate}
                      className="border-slate-600 text-white hover:bg-slate-700"
                    >
                      Download Excel Template
                    </Button>
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleBulkFileChange}
                      disabled={bulkUploadLoading}
                      className="bg-slate-700 border-gray-300 text-white max-w-md"
                    />
                    {bulkFileName && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={bulkUploadLoading}
                        onClick={() => {
                          setBulkItems([]);
                          setBulkFileName('');
                          setBulkParseError(null);
                          setSubmitError(null); // Clear submit error
                          // Reset file input
                          const fileInput = document.querySelector('input[type="file"]');
                          if (fileInput) fileInput.value = '';
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                      >
                        ✕ Clear
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    Required columns: Employee ID, Amount, Is Deduction, Notes.
                  </p>
                  {selectedConfig && (Number(selectedConfig.minLimit) > 0 || Number(selectedConfig.maxLimit) > 0) && (
                    <p className="text-xs text-emerald-400 font-medium">
                      Configured Range: {Number(selectedConfig.minLimit).toLocaleString('en-US')} - {Number(selectedConfig.maxLimit).toLocaleString('en-US')}
                    </p>
                  )}
                  {bulkUploadLoading && (
                    <p className="text-xs text-blue-300">Uploading and validating template, please wait...</p>
                  )}
                  {bulkParseError && (
                    <p className="text-xs text-red-300">{bulkParseError}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-white">Approval Description *</Label>
                  <Textarea
                    value={requestDetails.details}
                    onChange={(e) =>
                      setRequestDetails((prev) => ({
                        ...prev,
                        details: sanitizeTextInput(e.target.value),
                      }))}
                    onKeyDown={blockShortcuts}
                    maxLength={500}
                    rows={3}
                    className="bg-slate-700 border-gray-300 text-white"
                    placeholder="Describe the request details, purpose, and any important context."
                  />
                </div>

                <div className="flex items-center gap-2" style={{ marginBottom: "5px" }}>
                  <Checkbox
                    id="clientSponsoredBulk"
                    checked={requestDetails.clientSponsored}
                    onCheckedChange={(checked) => setRequestDetails((prev) => ({ ...prev, clientSponsored: Boolean(checked) }))}
                    className="border-blue-400 bg-slate-600"
                  />
                  <Label htmlFor="clientSponsoredBulk" className="text-white text-sm">Client Sponsored?</Label>
                </div>

                <div className="mt-2" style={{ marginBottom: "-12px" }}>
                  <BulkUploadValidation
                    bulkItems={bulkItems}
                    setBulkItems={setBulkItems}
                    selectedConfig={selectedConfig}
                    organizations={organizations}
                    validateEmployee={validateEmployeeCb}
                  />
                </div>

              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className={`flex justify-end gap-2 flex-shrink-0 ${requestMode === 'bulk' && bulkItems.length > 0 ? 'px-5 py-3 border-t border-slate-700' : ''}`}>
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            {requestMode === 'individual' ? (
              <Button
                onClick={() => setConfirmAction('submit-individual')}
                disabled={!canProceed || submitting || bulkUploadLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Proceed'}
              </Button>
            ) : (
              <Button
                onClick={() => setConfirmAction('submit-bulk')}
                disabled={!canProceed || submitting || bulkUploadLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Proceed'}
              </Button>
            )}
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {bulkUploadLoading && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-blue-300 font-medium text-lg">Uploading template...</p>
            <p className="text-xs text-slate-400">Validating rows and employee scope</p>
          </div>
        </div>,
        document.body
      )}

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setSelectedRequest(null);
            setDetailsError(null);
            setRequestDetailsData(null);
            setRequestConfigDetails(null);
            setDetailSearch('');
            setDetailLineItemsPage(1);
            setPayrollCycle('');
            setPayrollCycleDate('');
            setPayrollCycleModalOpen(false);
            setPayrollCycleError(null);
          }
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-700 text-white !w-[97vw] md:!w-[94vw] lg:!w-[90vw] xl:!w-[85vw] 2xl:!w-[78vw] !max-w-none max-h-[88vh] overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Request Details</DialogTitle>

          </DialogHeader>

          {detailsLoading ? (
            <div className="text-sm text-gray-400">Loading request details...</div>
          ) : detailsError ? (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {detailsError}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4 md:grid-cols-[2fr_1fr]">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={getStageStatusBadgeClass(detailStageStatus)}>
                      {detailStageLabel}
                    </Badge>
                    <span className="text-xs text-slate-300">{detailRequestNumber}</span>
                    <span className="text-xs text-slate-500">
                      Submitted: {formatDatePHT(detailSubmittedAt)}
                    </span>
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Budget Configuration Name</div>
                  <div className="text-lg font-semibold text-white">{detailRecord.budget_name || requestConfigDetails?.budget_name || requestConfigDetails?.name || 'Budget Configuration'}</div>
                  <div className="text-sm text-slate-400">
                    {requestConfigDetails?.description || requestConfigDetails?.budget_description || 'No configuration description.'}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Approval Description</div>
                  <div className="text-sm text-slate-300">{detailDescription || 'No description provided.'}</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Client Sponsored</div>
                      <div className="text-sm text-slate-300">{detailRecord.is_client_sponsored || detailRecord.client_sponsored ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Payroll Cycle</div>
                      <div className="text-sm text-slate-300">
                        {detailRecord.payroll_cycle || '—'} {detailRecord.payroll_cycle_Date || detailRecord.payroll_cycle_date ? `(${detailRecord.payroll_cycle_Date || detailRecord.payroll_cycle_date})` : ''}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Request Total Amount</div>
                  <div className="text-2xl font-semibold text-emerald-400">₱{Number(detailRecord.amount || detailAmount || 0).toLocaleString('en-US')}</div>
                  <div className="flex gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-400">Deduction Total</div>
                      <div className="text-lg font-medium text-red-400">₱{Number(detailRecord.deductionAmount || 0).toLocaleString('en-US')}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-400">Net to Pay</div>
                      <div className="text-lg font-bold text-emerald-400">₱{Number(detailRecord.netPay || 0).toLocaleString('en-US')}</div>
                    </div>
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Budget Status</div>
                  <div className="text-sm text-slate-200">
                    {hasTotalBudget
                      ? `₱${Number(budgetUsed || 0).toLocaleString('en-US')} / ₱${Number(budgetMax || 0).toLocaleString('en-US')}`
                      : 'No limit'}
                  </div>
                  <div className="h-2 rounded-full bg-slate-700">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${budgetPercent}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400">
                    {hasTotalBudget
                      ? `After approval: ₱${Number(projectedUsed || 0).toLocaleString('en-US')} / ₱${Number(budgetMax || 0).toLocaleString('en-US')}`
                      : 'After approval: No limit'}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">Uploaded Data ({detailLineItems.length} total)</div>
                  {warningCount > 0 && (
                    <Badge variant="outline" className="bg-amber-500 text-white">⚠ {warningCount} Warning{warningCount > 1 ? 's' : ''}</Badge>
                  )}
                </div>
                <div className="mt-3">
                  <Input
                    placeholder="Search employees by name, ID, department, or position..."
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(sanitizeSingleLine(e.target.value))}
                    onKeyDown={blockShortcuts}
                    className="bg-slate-700 border-gray-300 text-white"
                  />
                </div>
                <div className="mt-3 max-h-[360px] overflow-x-auto overflow-y-auto rounded-lg border border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-slate-300">Employee ID</th>
                        <th className="px-3 py-2 text-left text-slate-300">Name</th>
                        <th className="px-3 py-2 text-left text-slate-300">Email</th>
                        <th className="px-3 py-2 text-left text-slate-300">Position</th>
                        <th className="px-3 py-2 text-left text-slate-300">Status</th>
                        <th className="px-3 py-2 text-left text-slate-300">Geo</th>
                        <th className="px-3 py-2 text-left text-slate-300">Location</th>
                        <th className="px-3 py-2 text-left text-slate-300">Department</th>
                        <th className="px-3 py-2 text-left text-slate-300">Hire Date</th>
                        <th className="px-3 py-2 text-left text-slate-300">Term. Date</th>
                        <th className="px-3 py-2 text-right text-slate-300">Amount</th>
                        <th className="px-3 py-2 text-center text-slate-300">Deduction</th>
                        <th className="px-3 py-2 text-left text-slate-300">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {visibleLineItems.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="px-3 py-6 text-center text-sm text-slate-400">
                            No line items found.
                          </td>
                        </tr>
                      ) : (
                        visibleLineItems.map((item) => {
                          const amountValue = Number(item.amount || 0);
                          const isWarning = item.has_warning || amountValue < 0;
                          return (
                            <tr key={item.line_item_id || item.item_number} className={isWarning ? 'bg-amber-500/10' : ''}>
                              <td className="px-3 py-2 text-slate-300">{item.employee_id || '—'}</td>
                              <td className="px-3 py-2 text-slate-200">{item.employee_name || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.email || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.position || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.employee_status || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.geo || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.location || item.Location || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.department || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.hire_date || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.termination_date || '—'}</td>
                              <td className={`px-3 py-2 text-right font-semibold ${amountValue < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                ₱{Math.abs(amountValue).toLocaleString('en-US')}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {item.is_deduction ? <Badge variant="outline" className="bg-red-500/20 text-red-300 text-[10px]">Yes</Badge> : <span className="text-slate-400">—</span>}
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {item.notes || item.item_description || '—'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  page={safeDetailLineItemsPage}
                  totalPages={detailLineItemsTotalPages}
                  rowsPerPage={detailLineItemsRowsPerPage}
                  onPageChange={(page) => setDetailLineItemsPage(page)}
                  onRowsPerPageChange={(value) => setDetailLineItemsRowsPerPage(value)}
                  rowOptions={[25, 50, 100]}
                />
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                <div className="text-sm font-semibold text-white mb-4">Approval Workflow Status</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[{ level: 1, label: 'Level 1', title: 'L1 Approval' }, { level: 2, label: 'Level 2', title: 'L2 Approval' }, { level: 3, label: 'Level 3', title: 'L3 Approval' }, { level: 'P', label: 'Payroll', title: 'Payroll' }].map((entry) => {
                    const approver = getApproverForLevel(entry.level);
                    const approval = getApprovalForLevel(entry.level);
                    const status = approval?.status || 'pending';
                    const isSelfRequest = entry.level === 1 && approval?.is_self_request === true;
                    const approvedBy = approval?.approver_name || '—';
                    const selfRequestorName =
                      detailRecord?.submitted_by_name ||
                      detailRecord?.submittedByName ||
                      selectedRequest?.submittedByName ||
                      selectedRequest?.submitted_by_name ||
                      approvedBy;
                    const approvedDate = approval?.approval_date ? formatDatePHT(approval.approval_date) : '—';
                    const isPayroll = entry.level === 'P';
                    
                    return (
                      <div key={entry.label} className="rounded-lg border border-slate-600 bg-slate-900/40 p-3 flex flex-col">
                        <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">{entry.title}</div>
                        <Badge variant="outline" className={`${getApprovalBadgeClass(status, isSelfRequest)} mb-3 w-fit`}>
                          {formatStatusLabel(status, isSelfRequest)}
                        </Badge>
                        <div className="flex-1 space-y-2 text-xs">
                          {isPayroll ? (
                            // Payroll section shows "Handled by" instead of waiting for approval
                            <>
                              <div className="text-slate-400">Handled by:</div>
                              {status === 'approved' || status === 'rejected' || status === 'completed' ? (
                                <>
                                  <div className="text-slate-200 font-semibold">{approvedBy}</div>
                                  <div className="text-slate-400 mt-2">Action:</div>
                                  <div className={`font-semibold ${
                                    status === 'approved' ? 'text-green-400' :
                                    status === 'rejected' ? 'text-red-400' :
                                    status === 'completed' ? 'text-blue-400' : 'text-slate-400'
                                  }`}>
                                    {formatStatusLabel(status)}
                                  </div>
                                  <div className="text-slate-500 text-[10px] mt-1">{approvedDate}</div>
                                  {(approval?.approval_notes || approval?.rejection_reason || approval?.description) && (
                                    <>
                                      <div className="text-slate-400 mt-2">Notes:</div>
                                      <div className="text-slate-300 text-[10px] italic pl-2 whitespace-pre-wrap break-words">
                                        {approval?.approval_notes || approval?.rejection_reason || approval?.description}
                                      </div>
                                    </>
                                  )}
                                </>
                              ) : (
                                <div className="text-slate-300">Awaiting payroll processing</div>
                              )}
                            </>
                          ) : (
                            // L1, L2, L3 sections
                            <>
                              {!isSelfRequest && (
                                <>
                                  <div className="text-slate-400">Primary:</div>
                                  <div className="text-slate-200 truncate">{approver?.approver_name || getApproverDisplayName(approver?.primary_approver) || 'Not assigned'}</div>
                                  <div className="text-slate-400">Backup:</div>
                                  <div className="text-slate-200 truncate">{approver?.backup_approver_name || getApproverDisplayName(approver?.backup_approver) || 'Not assigned'}</div>
                                </>
                              )}
                              {status === 'approved' && (
                                <>
                                  <div className="text-slate-400 mt-3">{isSelfRequest ? 'Submitted by:' : 'Approved by:'}</div>
                                  <div className={isSelfRequest ? 'text-blue-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                                    {isSelfRequest ? selfRequestorName : approvedBy}
                                  </div>
                                  <div className="text-slate-500 text-[10px]">{approvedDate}</div>
                                  {(approval?.approval_notes || approval?.rejection_reason || approval?.description) && (
                                    <>
                                      <div className="text-slate-400 mt-2">Notes:</div>
                                      <div className="text-slate-300 text-[10px] italic pl-2 whitespace-pre-wrap break-words">
                                        {approval?.approval_notes || approval?.rejection_reason || approval?.description}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                              {status === 'rejected' && (
                                <>
                                  <div className="text-slate-400 mt-3">Rejected by:</div>
                                  <div className="text-red-400 font-semibold">{approvedBy}</div>
                                  <div className="text-slate-500 text-[10px]">{approvedDate}</div>
                                  {(approval?.approval_notes || approval?.rejection_reason || approval?.description) && (
                                    <>
                                      <div className="text-slate-400 mt-2">Reason:</div>
                                      <div className="text-slate-300 text-[10px] italic pl-2 whitespace-pre-wrap break-words">
                                        {approval?.approval_notes || approval?.rejection_reason || approval?.description}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setDetailsOpen(false)}
              className="border-slate-600 text-white hover:bg-slate-800"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Submit */}
      <Dialog open={Boolean(confirmAction)} onOpenChange={() => !confirmLoading && setConfirmAction(null)} modal={true}>
        <DialogContent className="bg-slate-900/95 backdrop-blur-md border-slate-700 text-white w-[400px]" onPointerDownOutside={(e) => confirmLoading && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              {confirmAction === 'submit-individual' 
                ? 'Are you sure you want to submit this approval request?' 
                : 'Are you sure you want to submit this bulk approval request?'}
            </DialogDescription>
          </DialogHeader>
          {confirmLoading && (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-blue-500"></div>
              <p className="mt-4 text-sm text-slate-300 font-medium">Processing your request...</p>
            </div>
          )}
          {!confirmLoading && (
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setConfirmAction(null)}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  setConfirmLoading(true);
                  try {
                    // Don't close the modal yet - keep confirmAction
                    if (confirmAction === 'submit-individual') {
                      await handleSubmitIndividual();
                    } else if (confirmAction === 'submit-bulk') {
                      await handleSubmitBulk();
                    }
                    // Modal will be closed by success/error handler
                  } catch (error) {
                    setSubmitError(extractErrorMessage(error));
                    setConfirmLoading(false);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Confirm Submission
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Success/Error Modal */}
      <Dialog
        open={showSuccessModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowSuccessModal(false);
          }
        }}
        modal={true}
      >
        <DialogContent className="bg-slate-900/95 backdrop-blur-md border-slate-700 text-white w-[400px]">
          <DialogHeader>
            <DialogTitle className={isError ? "text-red-400" : "text-emerald-400"}>
              {isError ? "Error" : "Success"}
            </DialogTitle>
            <DialogDescription className="text-slate-300">{successMessage}</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-slate-400 text-center py-2 font-semibold">
            Closing in {countdown} second{countdown !== 1 ? 's' : ''}...
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
const LoadingOverlay = () => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-6 bg-slate-900 border border-slate-700 rounded-lg shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        <p className="text-emerald-400 font-medium animate-pulse text-lg">Processing Approval...</p>
      </div>
    </div>,
    document.body
  );
};

const LoadingLine = () => (
  <div className="h-1 w-full overflow-hidden rounded bg-slate-700/70">
    <div className="h-full w-2/5 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 animate-pulse" />
  </div>
);

function ApprovalRequests({ refreshKey, focusRequestId = null, onFocusRequestHandled }) {
  const { user } = useAuth();
  const toast = useToast();
  const userRole = resolveUserRole(user);
  const requestorFlag = [user?.role_name, user?.roleName, user?.user_role, user?.userRole, user?.role]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes('requestor'));
  const canViewRequests =
    !requestorFlag && (userRole === 'l1' || userRole === 'l2' || userRole === 'l3' || userRole === 'payroll');
  const [approvals, setApprovals] = useState([]);
  const [approvalStatusMap, setApprovalStatusMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState('10');
  const [serverPagination, setServerPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDetailsData, setRequestDetailsData] = useState(null);
  const [requestConfigDetails, setRequestConfigDetails] = useState(null);
  const [detailSearch, setDetailSearch] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [actionError, setActionError] = useState(null);
  const [detailLineItemsPage, setDetailLineItemsPage] = useState(1);
  const [detailLineItemsRowsPerPage, setDetailLineItemsRowsPerPage] = useState('25');

  const formatDatePHT = (dateString) => {
    return formatDateTimeCompact(dateString);
  };

  const getApprovalBadgeClass = (status, isSelfRequest = false) => {
    const normalized = String(status || '').toLowerCase();

    if (isSelfRequest && normalized === 'approved') {
      return 'bg-teal-500 text-white';
    }

    switch (normalized) {
      case 'self_request':
      case 'self request':
      case 'self_approved':
        return 'bg-teal-500 text-white';
      case 'approved':
        return 'bg-green-600 text-white';
      case 'completed':
        return 'bg-blue-600 text-white';
      case 'rejected':
        return 'bg-red-600 text-white';
      case 'ongoing_approval':
      case 'pending_payroll_approval':
      case 'pending_payment_completion':
      case 'pending':
      case 'escalated':
      case 'submitted':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  const formatStatusLabel = (status, isSelfRequest = false) => {
    if (isSelfRequest && status === 'approved') {
      return 'Self Request';
    }
    return formatStatusText(status, 'Pending');
  };
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successCountdown, setSuccessCountdown] = useState(5);
  const successModalWasOpen = useRef(false);
  const [payrollCycleModalOpen, setPayrollCycleModalOpen] = useState(false);
  const [payrollCycle, setPayrollCycle] = useState('');
  const [payrollCycleMonth, setPayrollCycleMonth] = useState('');
  const [payrollMonthOptions, setPayrollMonthOptions] = useState([]);
  const [payrollScheduleLabel, setPayrollScheduleLabel] = useState('');
  const [payrollOptionsLoading, setPayrollOptionsLoading] = useState(false);
  const [payrollDuplicateWarning, setPayrollDuplicateWarning] = useState('');
  const [payrollDuplicateLoading, setPayrollDuplicateLoading] = useState(false);
  const payrollCycleDate = payrollCycleMonth || '';
  const selectedPayrollMonthOption = useMemo(
    () => payrollMonthOptions.find((option) => option.value === payrollCycleMonth) || null,
    [payrollMonthOptions, payrollCycleMonth]
  );
  const payrollCycleOptions = selectedPayrollMonthOption?.cycles || [];
  const payrollCycleYear = selectedPayrollMonthOption ? String(selectedPayrollMonthOption.year) : '';
  const [payrollCycleError, setPayrollCycleError] = useState(null);
  const handledFocusRequestRef = useRef(null);
  const suppressDetailsCloseRef = useRef(false);

  const closeConfirmDialog = useCallback(() => {
    suppressDetailsCloseRef.current = true;
    setConfirmAction(null);
    setTimeout(() => {
      suppressDetailsCloseRef.current = false;
    }, 0);
  }, []);

  const handlePayrollCycleContinue = () => {
    if (userRole === 'payroll' && currentApprovalLevel === 4 && !String(decisionNotes || '').trim()) {
      const notesError = 'Decision notes are required for payroll approval.';
      setPayrollCycleError(notesError);
      setActionError(notesError);
      toast.error(notesError);
      return;
    }

    const validation = validatePayrollSelection({
      payrollCycle,
      payrollCycleDate,
      availableMonths: payrollMonthOptions,
    });
    if (!validation.isValid) {
      setPayrollCycleError(validation.error || 'Please select both payroll cycle and date.');
      return;
    }
    setPayrollCycleError(null);
    setPayrollCycleModalOpen(false);
    setConfirmAction('approve');
  };

  useEffect(() => {
    if (userRole !== 'payroll') {
      return;
    }

    let cancelled = false;

    const fetchPayrollOptions = async () => {
      setPayrollOptionsLoading(true);
      try {
        const result = await approvalRequestService.getPayrollOptions(getToken());
        if (cancelled) return;

        const months = Array.isArray(result?.months) ? result.months : [];
        setPayrollMonthOptions(months);
        setPayrollScheduleLabel(
          result?.helperLabel || 'Payroll options are controlled by backend schedule rules.'
        );
      } catch (error) {
        if (cancelled) return;
        setPayrollMonthOptions([]);
        setPayrollScheduleLabel('Unable to load payroll options. Please try again.');
        setPayrollCycleError(extractErrorMessage(error));
      } finally {
        if (!cancelled) {
          setPayrollOptionsLoading(false);
        }
      }
    };

    fetchPayrollOptions();

    return () => {
      cancelled = true;
    };
  }, [userRole]);

  useEffect(() => {
    if (!payrollMonthOptions.length) {
      setPayrollCycleMonth('');
      setPayrollCycle('');
      setPayrollDuplicateWarning('');
      return;
    }

    if (!payrollCycleMonth || !payrollMonthOptions.some((option) => option.value === payrollCycleMonth)) {
      setPayrollCycleMonth(payrollMonthOptions[0].value);
      setPayrollCycle('');
      return;
    }

    if (!payrollCycleOptions.some((option) => option.value === payrollCycle)) {
      setPayrollCycle('');
    }
  }, [payrollMonthOptions, payrollCycleMonth, payrollCycle, payrollCycleOptions]);

  useEffect(() => {
    if (userRole === 'requestor') {
      setStatusFilter('submitted');
    } else {
      setStatusFilter('pending');
    }
  }, [userRole]);

  useEffect(() => {
    if (!showSuccessModal) return;
    let timeLeft = 5;
    setSuccessCountdown(timeLeft);
    const countdownInterval = setInterval(() => {
      timeLeft -= 1;
      setSuccessCountdown(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        setShowSuccessModal(false);
        setDetailsOpen(false);
        setDecisionNotes('');
        setPayrollCycle('');
        setPayrollCycleMonth('');
        fetchApprovals();
      }
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [showSuccessModal]);

  useEffect(() => {
    if (showSuccessModal) {
      successModalWasOpen.current = true;
      return;
    }
    if (successModalWasOpen.current && successMessage) {
      successModalWasOpen.current = false;
      window.location.reload();
    }
  }, [showSuccessModal, successMessage]);

  const fetchApprovals = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const effectiveStatusFilter =
        userRole === 'requestor'
          ? statusFilter
          : statusFilter === 'submitted'
            ? 'pending'
            : statusFilter;

      const cacheTTL = 60 * 1000;
      const getApprovalRequestsCached = (filters, key) =>
        fetchWithCache(
          'approvalRequests',
          key,
          () => approvalRequestService.getApprovalRequests(filters, getToken()),
          cacheTTL,
          true
        );
      const getApprovalRequestCached = (requestId) =>
        fetchWithCache(
          'approvalRequestDetails',
          requestId,
          () => approvalRequestService.getApprovalRequest(requestId, getToken()),
          cacheTTL,
          true
        );

      if (userRole === 'requestor') {
        const filters = {
          ...(effectiveStatusFilter === 'all' ? {} : { status: effectiveStatusFilter }),
          submitted_by: user.id,
          search: searchTerm,
          page: currentPage,
          limit: Number(rowsPerPage || 10),
        };
        const data = await getApprovalRequestsCached(filters, `requestor_${user.id}_${effectiveStatusFilter || 'all'}_${searchTerm}_${currentPage}_${rowsPerPage}`);
        const items = Array.isArray(data) ? data : (data?.items || []);
        setApprovals((items || []).map(normalizeRequest));
        setServerPagination(data?.pagination || {
          page: currentPage,
          limit: Number(rowsPerPage || 10),
          totalItems: items.length,
          totalPages: Math.max(1, Math.ceil(items.length / Number(rowsPerPage || 10))),
          hasPrev: currentPage > 1,
          hasNext: false,
        });
        setApprovalStatusMap({});
      } else if (userRole === 'payroll') {
        // Payroll sees requests that are pending payroll approval within their org scope
        const payrollStage = 'pending_payroll_approval,pending_payment_completion';
        const data = await getApprovalRequestsCached(
          {
            approval_stage_status: payrollStage,
            search: searchTerm,
            page: currentPage,
            limit: Number(rowsPerPage || 10),
          },
          `payroll_${user.id}_${payrollStage}_${searchTerm}_${currentPage}_${rowsPerPage}`
        );

        const items = Array.isArray(data) ? data : (data?.items || []);
        const normalizedRequests = (items || []).map(normalizeRequest);
        const normalizedFilter = String(effectiveStatusFilter || '').toLowerCase();
        const filteredByStatus =
          normalizedFilter === 'all' || normalizedFilter === 'pending' || normalizedFilter === 'submitted'
            ? normalizedRequests
            : normalizedRequests.filter(
                (request) => String(request.status || '').toLowerCase() === normalizedFilter
              );

        const statusMap = (items || []).reduce((acc, request) => {
          const id = request?.request_id || request?.id;
          if (!id) return acc;
          acc[id] = request.approvals || [];
          return acc;
        }, {});

        setApprovals(filteredByStatus);
        setApprovalStatusMap(statusMap);
        setServerPagination(data?.pagination || {
          page: currentPage,
          limit: Number(rowsPerPage || 10),
          totalItems: filteredByStatus.length,
          totalPages: Math.max(1, Math.ceil(filteredByStatus.length / Number(rowsPerPage || 10))),
          hasPrev: currentPage > 1,
          hasNext: false,
        });
      } else {
        // Other roles (L1/L2/L3) see pending approvals + already approved by them (but not completed/rejected)
        const pendingApprovals = await fetchWithCache(
          'pendingApprovals',
          user.id,
          () => approvalRequestService.getPendingApprovals(user.id, getToken()),
          cacheTTL,
          true
        );
        const requestIds = Array.from(new Set((pendingApprovals || []).map((entry) => entry.request_id).filter(Boolean)));
        const submittedRequests = await getApprovalRequestsCached(
          { submitted_by: user.id },
          `submitted_${user.id}`
        );
        const submittedRequestIds = (submittedRequests || [])
          .map((request) => request?.request_id || request?.id)
          .filter(Boolean);
        const allRequestIds = Array.from(new Set([...requestIds, ...submittedRequestIds]));
        const requestDetails = await Promise.all(
          allRequestIds.map((requestId) => getApprovalRequestCached(requestId))
        );

        const normalizedRequests = requestDetails
          .filter(Boolean)
          .map((request) => normalizeRequest(request));

        // Filter: show if pending for user OR user approved but not completed/rejected
        const visibleRequests = normalizedRequests.filter((request) => {
          const status = String(request.status || '').toLowerCase();
          if (status === 'rejected' || status === 'completed') return false;
          const userApprovals = (request.approvals || []).filter(
            (a) => a.assigned_to_primary === user.id || a.assigned_to_backup === user.id
          );
          return userApprovals.length > 0 || String(request.submitted_by || '') === String(user.id);
        });

        const normalizedFilter = String(effectiveStatusFilter || '').toLowerCase();
        const filteredByStatus = (normalizedFilter === 'all' || normalizedFilter === 'pending')
          ? visibleRequests
          : visibleRequests.filter((request) => String(request.status || '').toLowerCase() === normalizedFilter);

        const statusMap = requestDetails.reduce((acc, request) => {
          const id = request?.request_id || request?.id;
          if (!id) return acc;
          acc[id] = request.approvals || [];
          return acc;
        }, {});

        setApprovals(filteredByStatus);
        setApprovalStatusMap(statusMap);
        setServerPagination({
          page: 1,
          limit: Number(rowsPerPage || 10),
          totalItems: filteredByStatus.length,
          totalPages: Math.max(1, Math.ceil(filteredByStatus.length / Number(rowsPerPage || 10))),
          hasPrev: false,
          hasNext: false,
        });
      }
    } catch (error) {
      setError(error.message || 'Failed to load approvals');
      setApprovals([]);
      setApprovalStatusMap({});
      setServerPagination((prev) => ({ ...prev, page: 1, totalItems: 0, totalPages: 1, hasPrev: false, hasNext: false }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [refreshKey, statusFilter, user?.id, userRole, currentPage, rowsPerPage, searchTerm]);

  const applyRequestUpdate = async (requestId, action) => {
    if (!requestId) return;
    if (action === 'deleted') {
      invalidateNamespace('approvalRequests');
      invalidateNamespace('approvalRequestDetails');
      invalidateNamespace('pendingApprovals');
      setApprovals((prev) => prev.filter((item) => item.id !== requestId));
      setApprovalStatusMap((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      if (selectedRequest?.id === requestId) {
        setDetailsOpen(false);
      }
      return;
    }

    try {
      invalidateNamespace('approvalRequests');
      invalidateNamespace('approvalRequestDetails');
      invalidateNamespace('pendingApprovals');
      const data = await fetchWithCache(
        'approvalRequestDetails',
        requestId,
        () => approvalRequestService.getApprovalRequest(requestId, getToken()),
        60 * 1000
      );
      if (!data) return;

      const isRequestorOwner = userRole === 'requestor' && data.submitted_by === user?.id;
      if (userRole === 'requestor' && !isRequestorOwner) return;

      const normalized = normalizeRequest(data);
      setApprovals((prev) => {
        const exists = prev.some((item) => item.id === normalized.id);
        if (!exists) return [normalized, ...prev];
        return prev.map((item) => (item.id === normalized.id ? normalized : item));
      });

      if (userRole !== 'requestor') {
        setApprovalStatusMap((prev) => ({
          ...prev,
          [requestId]: data.approvals || [],
        }));
      }

      if (selectedRequest?.id === requestId) {
        setRequestDetailsData(data ? normalizeRequest(data) : null);
        if (normalized.budgetId) {
          const config = await getBudgetConfigurationById(normalized.budgetId, getToken());
          setRequestConfigDetails(config || null);
        }
      }
    } catch (error) {
      console.error('Realtime update failed:', error);
    }
  };

  useEffect(() => {
    connectWebSocket();
    const unsubscribe = addWebSocketListener((message) => {
      if (message?.event !== 'approval_request_updated') return;
      const payload = message?.payload || {};
      applyRequestUpdate(payload.request_id, payload.action);
    });

    return () => {
      unsubscribe();
    };
  }, [userRole, user?.id, selectedRequest?.id]);

  const filteredApprovals = approvals.filter((approval) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return [approval.requestNumber, approval.budgetName, approval.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  const rowsPerPageNumber = Number(rowsPerPage || 10);
  const totalPages = Math.max(1, Number(serverPagination?.totalPages || 1));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedApprovals = filteredApprovals;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!focusRequestId || loading) return;
    if (handledFocusRequestRef.current === String(focusRequestId)) return;

    handledFocusRequestRef.current = String(focusRequestId);

    let cancelled = false;
    const openFromFocus = async () => {
      try {
        const target = approvals.find((approval) => String(approval.id) === String(focusRequestId));

        if (target) {
          if (!cancelled) {
            await handleOpenDetails(target);
            if (typeof onFocusRequestHandled === 'function') {
              onFocusRequestHandled();
            }
          }
          return;
        }

        const data = await fetchWithCache(
          'approvalRequestDetails',
          focusRequestId,
          () => approvalRequestService.getApprovalRequest(focusRequestId, getToken()),
          60 * 1000,
          true
        );

        if (!data || cancelled) {
          handledFocusRequestRef.current = null;
          return;
        }

        const normalized = normalizeRequest(data);
        await handleOpenDetails(normalized);
        if (typeof onFocusRequestHandled === 'function') {
          onFocusRequestHandled();
        }
      } catch {
        handledFocusRequestRef.current = null;
      }
    };

    openFromFocus();

    return () => {
      cancelled = true;
    };
  }, [focusRequestId, loading, approvals]);

  const handleOpenDetails = async (approval) => {
    setSelectedRequest(approval);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setRequestDetailsData(null);
    setRequestConfigDetails(null);
    setDecisionNotes('');
    setActionError(null);

    try {
      const data = await fetchWithCache(
        'approvalRequestDetails',
        approval.id,
        () => approvalRequestService.getApprovalRequest(approval.id, getToken()),
        60 * 1000
      );
      setRequestDetailsData(data ? normalizeRequest(data) : null);

      if (approval.budgetId) {
        const config = await getBudgetConfigurationById(approval.budgetId, getToken());
        setRequestConfigDetails(config || null);
      }
    } catch (error) {
      setDetailsError(error.message || 'Failed to load request details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const refreshDetails = async () => {
    if (!selectedRequest?.id) return;
    try {
      const data = await fetchWithCache(
        'approvalRequestDetails',
        selectedRequest.id,
        () => approvalRequestService.getApprovalRequest(selectedRequest.id, getToken()),
        60 * 1000
      );
      setRequestDetailsData(data ? normalizeRequest(data) : null);

      if (selectedRequest.budgetId) {
        const config = await getBudgetConfigurationById(selectedRequest.budgetId, getToken());
        setRequestConfigDetails(config || null);
      }
    } catch (error) {
      setDetailsError(error.message || 'Failed to refresh request details.');
    }
  };

  useEffect(() => {
    if (!detailsOpen) return undefined;
    setDetailLineItemsPage(1);
    refreshDetails();
    return undefined;
  }, [detailsOpen, selectedRequest?.id]);

  useEffect(() => {
    setDetailLineItemsPage(1);
  }, [detailSearch, detailLineItemsRowsPerPage]);

  const workflowStages = ['L1', 'L2', 'L3', 'P'];
  const getApprovalStatusForLevel = (requestId, level) => {
    const approvalsForRequest = approvalStatusMap[requestId] || [];
    const match = approvalsForRequest.find((item) => Number(item.approval_level) === Number(level));
    return match?.status || 'pending';
  };
  const getLevelStatusLabel = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'rejected') return 'Rejected';
    if (normalized === 'pending') return 'Pending';
    return formatStatusText(normalized, 'Pending');
  };
  const getWorkflowStage = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'pending_payment_completion') return 'APPROVED';
    if (normalized.includes('pending_payroll') || normalized.includes('payroll')) return 'P';
    if (normalized.includes('l1')) return 'L1';
    if (normalized.includes('l2')) return 'L2';
    if (normalized.includes('l3')) return 'L3';
    if (normalized === 'approved') return 'APPROVED';
    if (normalized === 'rejected') return 'REJECTED';
    if (normalized === 'ongoing_approval') return 'L1';
    return 'L1';
  };
  const getWorkflowBadgeClass = (stage, status) => {
    const currentStage = getWorkflowStage(status);
    if (currentStage === 'APPROVED') return 'bg-green-600 text-white';
    if (currentStage === 'REJECTED' && stage === 'L1') return 'bg-red-500 text-white';
    if (stage === currentStage) return 'bg-amber-500 text-white';

    if ((stage === 'L1' && ['L2', 'L3', 'P', 'APPROVED'].includes(currentStage)) ||
        (stage === 'L2' && ['L3', 'P', 'APPROVED'].includes(currentStage)) ||
        (stage === 'L3' && ['P', 'APPROVED'].includes(currentStage))) {
      return 'bg-green-600 text-white';
    }

    return 'bg-slate-700 text-slate-200';
  };
  const renderWorkflowSummary = (status) => (
    <div className="flex items-center gap-1">
      {workflowStages.map((stage, index) => (
        <React.Fragment key={stage}>
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${getWorkflowBadgeClass(stage, status)}`}>
            {stage}
          </span>
          {index < workflowStages.length - 1 && <span className="h-px w-3 bg-slate-600" />}
        </React.Fragment>
      ))}
    </div>
  );
  const getReviewLabel = (status) => {
    const stage = getWorkflowStage(status);
    if (stage === 'APPROVED') return 'Approved';
    if (stage === 'REJECTED') return 'Rejected';
    if (stage === 'P') return 'Payroll Review';
    return `Level ${stage.replace('L', '')} Review`;
  };

  const detailRecord = requestDetailsData || selectedRequest || {};
  const detailStatus = detailRecord.overall_status || detailRecord.status || selectedRequest?.status || 'draft';
  const detailSubmittedAt = detailRecord.submitted_at || detailRecord.created_at || selectedRequest?.submittedAt || '';
  const detailAmount = detailRecord.total_request_amount || selectedRequest?.amount || 0;
  const detailBudgetName =
    detailRecord.budget_name || selectedRequest?.budgetName || requestConfigDetails?.budget_name || requestConfigDetails?.name || 'Budget Configuration';
  const detailDescriptionRaw = detailRecord.description || selectedRequest?.description || '';
  const detailDescription = String(detailDescriptionRaw || '').slice(0, 500);
  const detailRequestNumber = detailRecord.request_number || selectedRequest?.requestNumber || detailRecord.requestNumber || '—';
  const detailLineItems = requestDetailsData?.line_items || [];
  const approvalsForDetail = requestDetailsData?.approvals || [];
  const detailStageStatus =
    detailRecord.approval_stage_status || computeStageStatus(approvalsForDetail, detailStatus);
  const detailStageLabel = formatStageStatusLabel(detailStageStatus);
  const pendingApprovalForUser = approvalsForDetail.find(
    (approval) =>
      String(approval.status || '').toLowerCase() === 'pending' &&
      (approval.assigned_to_primary === user?.id || approval.assigned_to_backup === user?.id)
  );
  const roleLevelMap = {
    l1: 1,
    l2: 2,
    l3: 3,
    payroll: 4,
  };
  const fallbackLevel = roleLevelMap[userRole];
  const currentApprovalLevel = pendingApprovalForUser?.approval_level || fallbackLevel || null;
  
  // Check if user has already approved at their level
  const userHasApproved = approvalsForDetail.some(approval => 
    (approval.assigned_to_primary === user?.id || approval.assigned_to_backup === user?.id) &&
    String(approval.status || '').toLowerCase() === 'approved'
  );

  const payrollApproval = approvalsForDetail.find(
    (approval) => Number(approval.approval_level) === 4
  );
  const payrollApprovalStatus = String(payrollApproval?.status || '').toLowerCase();
  const isPayrollUser = userRole === 'payroll';
  const canPayrollApprove =
    isPayrollUser &&
    currentApprovalLevel === 4 &&
    payrollApprovalStatus === 'pending' &&
    String(detailStageStatus || '').toLowerCase() === 'pending_payroll_approval';
  const canPayrollComplete =
    isPayrollUser &&
    payrollApprovalStatus === 'approved' &&
    String(detailStageStatus || '').toLowerCase() === 'pending_payment_completion';
  const payrollNotesMissing =
    isPayrollUser &&
    currentApprovalLevel === 4 &&
    payrollApprovalStatus === 'pending' &&
    !String(decisionNotes || '').trim();

  const canStandardApprove =
    Boolean(pendingApprovalForUser) && userRole !== 'requestor' && !userHasApproved;

  const canActOnRequest = isPayrollUser
    ? (canPayrollApprove || canPayrollComplete)
    : canStandardApprove;

  useEffect(() => {
    if (!(userRole === 'payroll' && currentApprovalLevel === 4 && payrollApprovalStatus === 'pending')) {
      setPayrollDuplicateWarning('');
      return;
    }

    if (!selectedRequest?.id || !payrollCycle || !payrollCycleDate) {
      setPayrollDuplicateWarning('');
      return;
    }

    const validation = validatePayrollSelection({
      payrollCycle,
      payrollCycleDate,
      availableMonths: payrollMonthOptions,
    });

    if (!validation.isValid) {
      setPayrollDuplicateWarning('');
      return;
    }

    let cancelled = false;

    const runDuplicateCheck = async () => {
      setPayrollDuplicateLoading(true);
      try {
        const result = await approvalRequestService.getPayrollDuplicateCheck(
          selectedRequest.id,
          payrollCycle,
          payrollCycleDate,
          getToken()
        );

        if (cancelled) return;

        const count = Number(result?.count || 0);
        if (result?.hasDuplicate && count > 0) {
          const sample = Array.isArray(result?.matches) ? result.matches.slice(0, 3) : [];
          const sampleText = sample
            .map((item) => item?.request_number)
            .filter(Boolean)
            .join(', ');

          setPayrollDuplicateWarning(
            `Warning: ${count} approved/completed request(s) already use this payroll cycle for this configuration.${
              sampleText ? ` (${sampleText}${count > 3 ? ', ...' : ''})` : ''
            }`
          );
        } else {
          setPayrollDuplicateWarning('');
        }
      } catch {
        if (cancelled) return;
        setPayrollDuplicateWarning('');
      } finally {
        if (!cancelled) {
          setPayrollDuplicateLoading(false);
        }
      }
    };

    runDuplicateCheck();

    return () => {
      cancelled = true;
    };
  }, [
    userRole,
    currentApprovalLevel,
    payrollApprovalStatus,
    selectedRequest?.id,
    payrollCycle,
    payrollCycleDate,
    payrollMonthOptions,
  ]);

  const filteredLineItems = detailLineItems.filter((item) => {
    if (!detailSearch.trim()) return true;
    const term = detailSearch.toLowerCase();
    return [
      item.employee_id,
      item.employee_name,
      item.department,
      item.position,
      item.item_description,
      item.notes,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });
  const detailLineItemsRowsPerPageNumber = Number(detailLineItemsRowsPerPage || 10);
  const detailLineItemsTotalPages = Math.max(1, Math.ceil(filteredLineItems.length / detailLineItemsRowsPerPageNumber));
  const safeDetailLineItemsPage = Math.min(detailLineItemsPage, detailLineItemsTotalPages);
  const visibleLineItems = filteredLineItems.slice(
    (safeDetailLineItemsPage - 1) * detailLineItemsRowsPerPageNumber,
    safeDetailLineItemsPage * detailLineItemsRowsPerPageNumber
  );
  const warningCount = detailLineItems.filter((item) => item.has_warning || Number(item.amount || 0) < 0).length;
  const budgetUsed = Number(
    requestConfigDetails?.approved_amount ??
      requestConfigDetails?.approvedAmount ??
      requestConfigDetails?.usedAmount ??
      requestConfigDetails?.budget_used ??
      0
  );
  const budgetMax = Number(
    requestConfigDetails?.total_budget ||
      requestConfigDetails?.totalBudget ||
      requestConfigDetails?.total_budget_amount ||
      requestConfigDetails?.budget_total ||
      0
  );
  const hasTotalBudget = budgetMax > 0;
  const projectedUsed = budgetUsed + Number(detailAmount || 0);
  const budgetPercent = hasTotalBudget ? Math.min(100, (projectedUsed / budgetMax) * 100) : 0;

  const handleApprove = async () => {
    if (!selectedRequest?.id || !currentApprovalLevel) return;
    
    if (!confirmAction) {
      if (isPayrollUser && currentApprovalLevel === 4 && payrollApprovalStatus === 'pending') {
        setPayrollCycleError(null);
        setPayrollCycleModalOpen(true);
        return;
      }
      // Show confirmation modal
      setConfirmAction('approve');
      return;
    }
    
    // User confirmed, proceed with approval
    setConfirmAction(null);
    setActionSubmitting(true);
    setActionError(null);
    try {
      if (isPayrollUser && currentApprovalLevel === 4) {
        if (!String(decisionNotes || '').trim()) {
          const notesError = 'Decision notes are required for payroll approval.';
          toast.error(notesError);
          setActionError(notesError);
          setActionSubmitting(false);
          return;
        }

        const validation = validatePayrollSelection({
          payrollCycle,
          payrollCycleDate,
          availableMonths: payrollMonthOptions,
        });
        if (!validation.isValid) {
          toast.error(validation.error || 'Payroll cycle and date are required before approving.');
          setActionError(validation.error || 'Payroll cycle and date are required before approving.');
          setActionSubmitting(false);
          return;
        }
      }
      await approvalRequestService.approveRequest(
        selectedRequest.id,
        {
          approval_level: currentApprovalLevel,
          approver_name: user?.name || user?.full_name || user?.email || 'Approver',
          approver_title: user?.role || 'approver',
          approval_notes: decisionNotes || '',
          ...(isPayrollUser && currentApprovalLevel === 4
            ? {
                payroll_cycle: payrollCycle,
                payroll_cycle_date: payrollCycleDate,
                payroll_cycle_Date: payrollCycleDate,
              }
            : {}),
          user_id: user?.id,
        },
        getToken()
      );

      toast.success('Approval request approved successfully.');
      setSuccessMessage('Approval request approved successfully.');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('[ApprovalRequests.handleApprove] Error:', error);
      const errMsg = extractErrorMessage(error);
      toast.error(errMsg);
      setActionError(errMsg);
      setConfirmAction(null);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest?.id || !currentApprovalLevel) return;
    
    if (!confirmAction) {
      // Show confirmation modal
      if (!decisionNotes.trim()) {
        toast.error('Rejection reason is required.');
        setActionError('Rejection reason is required.');
        return;
      }
      setConfirmAction('reject');
      return;
    }
    
    // User confirmed, proceed with rejection
    setConfirmAction(null);
    setActionSubmitting(true);
    setActionError(null);
    try {
      await approvalRequestService.rejectRequest(
        selectedRequest.id,
        {
          approval_level: currentApprovalLevel,
          approver_name: user?.name || user?.full_name || user?.email || 'Approver',
          rejection_reason: decisionNotes,
          user_id: user?.id,
        },
        getToken()
      );

      toast.success('Approval request rejected.');
      setSuccessMessage('Approval request rejected.');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('[ApprovalRequests.handleReject] Error:', error);
      const errMsg = extractErrorMessage(error);
      toast.error(errMsg);
      setActionError(errMsg);
      setConfirmAction(null);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!selectedRequest?.id || !isPayrollUser) return;

    if (!confirmAction) {
      setConfirmAction('complete-payment');
      return;
    }

    setConfirmAction(null);
    setActionSubmitting(true);
    setActionError(null);
    try {
      await approvalRequestService.completePayrollPayment(
        selectedRequest.id,
        {
          approval_notes: decisionNotes || '',
          user_id: user?.id,
        },
        getToken()
      );

      toast.success('Payroll payment completed successfully.');
      setSuccessMessage('Payroll payment completed successfully.');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('[ApprovalRequests.handleCompletePayment] Error:', error);
      const errMsg = extractErrorMessage(error);
      toast.error(errMsg);
      setActionError(errMsg);
      setConfirmAction(null);
    } finally {
      setActionSubmitting(false);
    }
  };

  if (!canViewRequests) {
    return null;
  }

  return (
    <Card className="bg-slate-800 border-slate-700 flex flex-col h-full min-h-0">
      {(actionSubmitting || loading) && <LoadingLine />}
      <CardHeader>
        <CardTitle className="text-white">Approval Requests</CardTitle>
        <CardDescription className="text-gray-400">
          Review and approve budget requests requiring your attention
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[240px]">
            <Input
              placeholder="Search by request number, budget, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(sanitizeSingleLine(e.target.value))}
              onKeyDown={blockShortcuts}
              className="bg-slate-700 border-gray-300 text-white"
            />
          </div>
          <div className="min-w-[180px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-700 border-gray-300 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-gray-300">
                <SelectItem value="all" className="text-white">All</SelectItem>
                <SelectItem value="submitted" className="text-white">Submitted</SelectItem>
                <SelectItem value="approved" className="text-white">Approved</SelectItem>
                <SelectItem value="rejected" className="text-white">Rejected</SelectItem>
                <SelectItem value="pending" className="text-white">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400">Loading approvals...</div>
        ) : error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : filteredApprovals.length === 0 ? (
          <div className="text-sm text-gray-400">No approval requests found.</div>
        ) : (
          <>
          <div className="flex-1 min-h-0 border border-slate-600 rounded-md overflow-auto">
            <table className="min-w-[1400px] w-full border-collapse">
              <thead className="bg-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="border-b border-slate-600 px-3 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Request ID
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Budget Config
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Client Sponsored
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Payroll Cycle
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Payroll Cycle Date
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Total Employees
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Deductions
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    To Be Paid
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Approval Progress
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Requested By
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Submitted When
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap sticky right-0 z-30 bg-slate-700 border-l border-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800/50">
                  {paginatedApprovals.map((approval) => {
                  const approvalsForRequest = approvalStatusMap[approval.id] || approval.approvals || [];
                  const stageStatus = approval.approvalStageStatus || computeStageStatus(approvalsForRequest, approval.status);
                  const displayStatus = formatStageStatusLabel(stageStatus);
                  const employeeCount = approval.lineItemsCount ?? approval.line_items_count ?? approval.employeeCount ?? 0;
                  const deductionCount = approval.deductionCount ?? approval.deduction_count ?? 0;
                  const payCount = approval.toBePaidCount ?? approval.to_be_paid_count ?? Math.max(0, employeeCount - deductionCount);
                  const l1Status = getApprovalStatusForLevel(approval.id, 1);
                  const l2Status = getApprovalStatusForLevel(approval.id, 2);
                  const l3Status = getApprovalStatusForLevel(approval.id, 3);
                  const payrollStatus = getApprovalStatusForLevel(approval.id, 4);
                  const l1Approval = approvalStatusMap[approval.id]?.find(a => a.approval_level === 1);
                  const isSelfRequest = l1Approval?.is_self_request === true;
                  
                  return (
                    <tr key={approval.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                      <td className="px-3 py-3 text-xs text-blue-400 font-mono">
                        {approval.requestNumber || approval.id}
                      </td>
                      <td className="px-3 py-3 text-xs text-white font-semibold">
                        {approval.budgetName || approval.budget_name || approval.configName || 'Budget Configuration'}
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-slate-300">
                        {approval.is_client_sponsored || approval.client_sponsored || approval.clientSponsored ? 'Yes' : 'No'}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-300">
                        {approval.payroll_cycle || approval.payrollCycle || '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-300">
                        {approval.payroll_cycle_Date || approval.payroll_cycle_date || approval.payrollCycleDate || '—'}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-white font-semibold">
                        {employeeCount}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-red-400">
                        {deductionCount}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-emerald-400">
                        {payCount}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-300 max-w-[200px]">
                        <div className="line-clamp-2">{approval.description || 'No description provided.'}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <div className={`rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                            isSelfRequest && l1Status === 'approved' ? 'bg-blue-500/30 text-blue-200' :
                            l1Status === 'approved' ? 'bg-green-600/30 text-green-200' :
                            l1Status === 'rejected' ? 'bg-red-600/30 text-red-200' :
                            'bg-slate-700 text-slate-400'
                          }`}>
                            L1
                          </div>
                          <span className="text-slate-500">→</span>
                          <div className={`rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                            l2Status === 'approved' ? 'bg-green-600/30 text-green-200' :
                            l2Status === 'rejected' ? 'bg-red-600/30 text-red-200' :
                            'bg-slate-700 text-slate-400'
                          }`}>
                            L2
                          </div>
                          <span className="text-slate-500">→</span>
                          <div className={`rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                            l3Status === 'approved' ? 'bg-green-600/30 text-green-200' :
                            l3Status === 'rejected' ? 'bg-red-600/30 text-red-200' :
                            'bg-slate-700 text-slate-400'
                          }`}>
                            L3
                          </div>
                          <span className="text-slate-500">→</span>
                          <div className={`rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                            payrollStatus === 'approved' || payrollStatus === 'completed' ? 'bg-green-600/30 text-green-200' :
                            payrollStatus === 'rejected' ? 'bg-red-600/30 text-red-200' :
                            'bg-slate-700 text-slate-400'
                          }`}>
                            Pay
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className={`${getStageStatusBadgeClass(stageStatus)} mx-auto`}>
                          {displayStatus}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-300">
                        {approval.submittedByName || approval.submitted_by_name || approval.submittedBy || approval.submitted_by || '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-400">
                        {approval.submittedAt ? formatDatePHT(approval.submittedAt) : '—'}
                      </td>
                      <td className="px-3 py-3 text-center sticky right-0 z-20 bg-slate-800 border-l border-slate-700 group-hover:bg-slate-700/70 transition-colors">
                        <Button
                          size="sm"
                          onClick={() => handleOpenDetails(approval)}
                          className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 text-xs"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={safeCurrentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onRowsPerPageChange={(value) => setRowsPerPage(value)}
          />
          </>
        )}
      </CardContent>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          if (
            !open &&
            (Boolean(confirmAction) || payrollCycleModalOpen || actionSubmitting || suppressDetailsCloseRef.current)
          ) {
            return;
          }

          setDetailsOpen(open);
          if (!open) {
            setSelectedRequest(null);
            setDetailsError(null);
            setRequestDetailsData(null);
            setRequestConfigDetails(null);
            setDetailSearch('');
            setDetailLineItemsPage(1);
          }
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-700 text-white w-[98vw] md:w-[92vw] lg:w-[85vw] xl:w-[70vw] max-w-none max-h-[85vh] overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Approval Request Details</DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="text-sm text-gray-400">Loading request details...</div>
          ) : detailsError ? (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {detailsError}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4 md:grid-cols-[2fr_1fr]">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={getStageStatusBadgeClass(detailStageStatus)}>
                      {detailStageLabel}
                    </Badge>
                    <span className="text-xs text-slate-300">{detailRequestNumber}</span>
                    <span className="text-xs text-slate-500">
                      Submitted: {formatDatePHT(detailSubmittedAt)}
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-white">{requestConfigDetails?.name || requestConfigDetails?.budget_name || detailRecord.budgetName || detailRecord.budget_name || 'Budget Configuration'}</div>
                  <div className="text-sm text-slate-400">
                    {requestConfigDetails?.description || requestConfigDetails?.budget_description || 'No configuration description.'}
                  </div>
                  <div className="text-s text-slate-200">Approval Description: {detailDescription || 'No description provided.'}</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Client Sponsored</div>
                      <div className="text-sm text-slate-300">{detailRecord.is_client_sponsored || detailRecord.client_sponsored ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Payroll Cycle</div>
                      <div className="text-sm text-slate-300">
                        {detailRecord.payroll_cycle || '—'} {detailRecord.payroll_cycle_Date || detailRecord.payroll_cycle_date ? `(${detailRecord.payroll_cycle_Date || detailRecord.payroll_cycle_date})` : ''}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Request Total Amount</div>
                  <div className="text-2xl font-semibold text-emerald-400">₱{Number(detailRecord.amount || detailAmount || 0).toLocaleString('en-US')}</div>
                  <div className="flex gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-400">Deduction Total</div>
                      <div className="text-lg font-medium text-red-400">₱{Number(detailRecord.deductionAmount || 0).toLocaleString('en-US')}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-400">Net to Pay</div>
                      <div className="text-lg font-bold text-emerald-400">₱{Number(detailRecord.netPay || 0).toLocaleString('en-US')}</div>
                    </div>
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Budget Status</div>
                  <div className="text-sm text-slate-200">
                    {hasTotalBudget
                      ? `₱${Number(budgetUsed || 0).toLocaleString('en-US')} / ₱${Number(budgetMax || 0).toLocaleString('en-US')}`
                      : 'No limit'}
                  </div>
                  <div className="h-2 rounded-full bg-slate-700">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${budgetPercent}%` }} />
                  </div>
                  <div className="text-xs text-slate-400">
                    {hasTotalBudget
                      ? `After approval: ₱${Number(projectedUsed || 0).toLocaleString('en-US')} / ₱${Number(budgetMax || 0).toLocaleString('en-US')}`
                      : 'After approval: No limit'}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">Uploaded Data ({detailLineItems.length} total)</div>
                  {warningCount > 0 && (
                    <Badge variant="outline" className="bg-amber-500 text-white">⚠ {warningCount} Warning{warningCount > 1 ? 's' : ''}</Badge>
                  )}
                </div>
                <div className="mt-3">
                  <Input
                    placeholder="Search employees by name, ID, department, or position..."
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(sanitizeSingleLine(e.target.value))}
                    onKeyDown={blockShortcuts}
                    className="bg-slate-700 border-gray-300 text-white"
                  />
                </div>
                <div className="mt-3 max-h-[380px] overflow-x-auto overflow-y-auto rounded-lg border border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-slate-300">Employee ID</th>
                        <th className="px-3 py-2 text-left text-slate-300">Name</th>
                        <th className="px-3 py-2 text-left text-slate-300">Email</th>
                        <th className="px-3 py-2 text-left text-slate-300">Position</th>
                        <th className="px-3 py-2 text-left text-slate-300">Status</th>
                        <th className="px-3 py-2 text-left text-slate-300">Geo</th>
                        <th className="px-3 py-2 text-left text-slate-300">Location</th>
                        <th className="px-3 py-2 text-left text-slate-300">Department</th>
                        <th className="px-3 py-2 text-left text-slate-300">Hire Date</th>
                        <th className="px-3 py-2 text-left text-slate-300">Term. Date</th>
                        {(userRole === 'payroll' || detailRecord?.is_self_request) && (
                          <th className="px-3 py-2 text-right text-slate-300">Amount</th>
                        )}
                        <th className="px-3 py-2 text-center text-slate-300">Deduction</th>
                        <th className="px-3 py-2 text-left text-slate-300">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {visibleLineItems.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="px-3 py-6 text-center text-sm text-slate-400">
                            No line items found.
                          </td>
                        </tr>
                      ) : (
                        visibleLineItems.map((item) => {
                          const amountValue = Number(item.amount || 0);
                          const isWarning = item.has_warning || amountValue < 0;
                          return (
                            <tr key={item.line_item_id || item.item_number} className={isWarning ? 'bg-amber-500/10' : ''}>
                              <td className="px-3 py-2 text-slate-300">{item.employee_id || '—'}</td>
                              <td className="px-3 py-2 text-slate-200">{item.employee_name || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.email || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.position || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.employee_status || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.geo || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.location || item.Location || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.department || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.hire_date || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.termination_date || '—'}</td>
                              {(userRole === 'payroll' || detailRecord?.is_self_request) && (
                                <td className={`px-3 py-2 text-right font-semibold ${amountValue < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  ₱{Math.abs(amountValue).toLocaleString('en-US')}
                                </td>
                              )}
                              <td className="px-3 py-2 text-center">
                                {item.is_deduction ? <Badge variant="outline" className="bg-red-500/20 text-red-300 text-[10px]">Yes</Badge> : <span className="text-slate-400">—</span>}
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {item.notes || item.item_description || '—'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  page={safeDetailLineItemsPage}
                  totalPages={detailLineItemsTotalPages}
                  rowsPerPage={detailLineItemsRowsPerPage}
                  onPageChange={(page) => setDetailLineItemsPage(page)}
                  onRowsPerPageChange={(value) => setDetailLineItemsRowsPerPage(value)}
                  rowOptions={[25, 50, 100]}
                />
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                <div className="text-sm font-semibold text-white mb-4">Approval Workflow Status</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[{ level: 1, label: 'Level 1', title: 'L1 Approval' }, { level: 2, label: 'Level 2', title: 'L2 Approval' }, { level: 3, label: 'Level 3', title: 'L3 Approval' }, { level: 'P', label: 'Payroll', title: 'Payroll' }].map((entry) => {
                    const approver = requestConfigDetails?.approvers?.find((item) => String(item.approval_level) === String(entry.level) || (entry.level === 'P' && String(item.approval_level || '').toLowerCase().includes('payroll')));
                    const approval = requestDetailsData?.approvals?.find((item) => String(item.approval_level) === String(entry.level) || (entry.level === 'P' && String(item.approval_level || '').toLowerCase().includes('payroll')));
                    const status = approval?.status || 'pending';
                    const isSelfRequest = entry.level === 1 && approval?.is_self_request === true;
                    const approvedBy = approval?.approver_name || '—';
                    const selfRequestorName =
                      detailRecord?.submitted_by_name ||
                      detailRecord?.submittedByName ||
                      selectedRequest?.submittedByName ||
                      selectedRequest?.submitted_by_name ||
                      approvedBy;
                    const approvedDate = approval?.approval_date ? formatDatePHT(approval.approval_date) : '—';
                    const isPayroll = entry.level === 'P';
                    
                    return (
                      <div key={entry.label} className="rounded-lg border border-slate-600 bg-slate-900/40 p-3 flex flex-col">
                        <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">{entry.title}</div>
                        <Badge variant="outline" className={`${getApprovalBadgeClass(status, isSelfRequest)} mb-3 w-fit`}>
                          {formatStatusLabel(status, isSelfRequest)}
                        </Badge>
                        <div className="flex-1 space-y-2 text-xs">
                          {isPayroll ? (
                            // Payroll section shows "Handled by" instead of waiting for approval
                            <>
                              <div className="text-slate-400">Handled by:</div>
                              {status === 'approved' || status === 'rejected' || status === 'completed' ? (
                                <>
                                  <div className="text-slate-200 font-semibold">{approvedBy}</div>
                                  <div className="text-slate-400 mt-2">Action:</div>
                                  <div className={`font-semibold ${
                                    status === 'approved' ? 'text-green-400' :
                                    status === 'rejected' ? 'text-red-400' :
                                    status === 'completed' ? 'text-blue-400' : 'text-slate-400'
                                  }`}>
                                    {formatStatusLabel(status)}
                                  </div>
                                  <div className="text-slate-500 text-[10px] mt-1">{approvedDate}</div>
                                  {(approval?.approval_notes || approval?.rejection_reason || approval?.description) && (
                                    <>
                                      <div className="text-slate-400 mt-2">Notes:</div>
                                      <div className="text-slate-300 text-[10px] italic pl-2 whitespace-pre-wrap break-words">
                                        {approval?.approval_notes || approval?.rejection_reason || approval?.description}
                                      </div>
                                    </>
                                  )}
                                </>
                              ) : (
                                <div className="text-slate-300">Awaiting payroll processing</div>
                              )}
                            </>
                          ) : (
                            // L1, L2, L3 sections
                            <>
                              {!isSelfRequest && (
                                <>
                                  <div className="text-slate-400">Primary:</div>
                                  <div className="text-slate-200 truncate">{approver?.approver_name || 'Not assigned'}</div>
                                  <div className="text-slate-400">Backup:</div>
                                  <div className="text-slate-200 truncate">{approver?.backup_approver_name || 'Not assigned'}</div>
                                </>
                              )}
                              {status === 'approved' && (
                                <>
                                  <div className="text-slate-400 mt-3">{isSelfRequest ? 'Submitted by:' : 'Approved by:'}</div>
                                  <div className={isSelfRequest ? 'text-blue-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                                    {isSelfRequest ? selfRequestorName : approvedBy}
                                  </div>
                                  <div className="text-slate-500 text-[10px]">{approvedDate}</div>
                                  {(approval?.approval_notes || approval?.rejection_reason || approval?.description) && (
                                    <>
                                      <div className="text-slate-400 mt-2">Notes:</div>
                                      <div className="text-slate-300 text-[10px] italic pl-2 whitespace-pre-wrap break-words">
                                        {approval?.approval_notes || approval?.rejection_reason || approval?.description}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                              {status === 'rejected' && (
                                <>
                                  <div className="text-slate-400 mt-3">Rejected by:</div>
                                  <div className="text-red-400 font-semibold">{approvedBy}</div>
                                  <div className="text-slate-500 text-[10px]">{approvedDate}</div>
                                  {(approval?.approval_notes || approval?.rejection_reason || approval?.description) && (
                                    <>
                                      <div className="text-slate-400 mt-2">Reason:</div>
                                      <div className="text-slate-300 text-[10px] italic pl-2 whitespace-pre-wrap break-words">
                                        {approval?.approval_notes || approval?.rejection_reason || approval?.description}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {canActOnRequest ? (
                <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4 space-y-3">
                  {actionError && (
                    <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      {actionError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-white">Decision Notes</Label>
                    <Textarea
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(sanitizeTextInput(e.target.value))}
                      onKeyDown={blockShortcuts}
                      maxLength={500}
                      rows={3}
                      className="bg-slate-700 border-gray-300 text-white"
                      placeholder="Add notes (required for payroll approval and rejection)."
                    />
                  </div>

                  {/* Payroll Cycle Selection (Visible only for Payroll during approval phase) */}
                  {userRole === 'payroll' && currentApprovalLevel === 4 && payrollApprovalStatus === 'pending' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">Payroll Cycle *</Label>
                        <Select
                          value={payrollCycle}
                          onValueChange={setPayrollCycle}
                          disabled={payrollOptionsLoading || payrollCycleOptions.length === 0}
                        >
                          <SelectTrigger className="bg-slate-700 border-gray-300 text-white">
                            <SelectValue placeholder="Select cycle" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600 text-white">
                            {payrollOptionsLoading ? (
                              <div className="px-3 py-2 text-xs text-slate-400">Loading cycles...</div>
                            ) : payrollCycleOptions.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-slate-400">No available cycles for selected month.</div>
                            ) : (
                              payrollCycleOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Payroll Month *</Label>
                        <Select
                          value={payrollCycleMonth}
                          onValueChange={setPayrollCycleMonth}
                          disabled={payrollOptionsLoading || payrollMonthOptions.length === 0}
                        >
                          <SelectTrigger className="bg-slate-700 border-gray-300 text-white">
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600 text-white max-h-[200px]">
                            {payrollOptionsLoading ? (
                              <div className="px-3 py-2 text-xs text-slate-400">Loading months...</div>
                            ) : (
                              payrollMonthOptions.map((month) => (
                                <SelectItem key={month.value} value={month.value}>{month.value}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Payroll Year *</Label>
                        <Input
                          value={payrollCycleYear || '—'}
                          disabled
                          className="bg-slate-800 border-slate-600 text-slate-300"
                        />
                      </div>
                      <div className="md:col-span-3 -mt-1 text-xs text-slate-400">
                        {payrollScheduleLabel}
                      </div>
                      <div className="md:col-span-3">
                        {payrollDuplicateLoading ? (
                          <div className="text-xs text-slate-400">Checking for existing approved payroll cycle usage...</div>
                        ) : payrollDuplicateWarning ? (
                          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                            {payrollDuplicateWarning}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    {(canStandardApprove || canPayrollApprove) && (
                      <Button
                        variant="outline"
                        className="border-rose-500 text-rose-300 hover:bg-rose-500/10"
                        onClick={() => setConfirmAction('reject')}
                        disabled={actionSubmitting}
                      >
                        Reject
                      </Button>
                    )}
                    {canPayrollComplete ? (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setConfirmAction('complete-payment')}
                        disabled={actionSubmitting}
                      >
                        Complete Payment
                      </Button>
                    ) : (
                      (canStandardApprove || canPayrollApprove) && (
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => setConfirmAction('approve')}
                          disabled={actionSubmitting || payrollNotesMissing}
                        >
                          Approve
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                  <div className="text-sm text-slate-300">
                    This request is view-only. No actions can be taken from this screen.
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payroll Cycle Selection Modal */}
      <Dialog open={payrollCycleModalOpen} onOpenChange={(open) => !open && setPayrollCycleModalOpen(false)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Payroll Cycle Selection</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select the payroll cycle and date before approving.
            </DialogDescription>
          </DialogHeader>
          {payrollCycleError && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {payrollCycleError}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Payroll Cycle *</Label>
              <Select
                value={payrollCycle}
                onValueChange={setPayrollCycle}
                disabled={payrollOptionsLoading || payrollCycleOptions.length === 0}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  {payrollOptionsLoading ? (
                    <div className="px-3 py-2 text-xs text-slate-400">Loading cycles...</div>
                  ) : payrollCycleOptions.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">No available cycles for selected month.</div>
                  ) : (
                    payrollCycleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-white">
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Payroll Month *</Label>
              <Select
                value={payrollCycleMonth}
                onValueChange={setPayrollCycleMonth}
                disabled={payrollOptionsLoading || payrollMonthOptions.length === 0}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-[200px]">
                  {payrollOptionsLoading ? (
                    <div className="px-3 py-2 text-xs text-slate-400">Loading months...</div>
                  ) : (
                    payrollMonthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value} className="text-white">
                        {month.value}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Payroll Year *</Label>
              <Input
                value={payrollCycleYear || '—'}
                disabled
                className="bg-slate-800 border-slate-600 text-slate-300"
              />
            </div>
            <div className="-mt-1 text-xs text-slate-400">
              {payrollScheduleLabel}
            </div>
            <div>
              {payrollDuplicateLoading ? (
                <div className="text-xs text-slate-400">Checking for existing approved payroll cycle usage...</div>
              ) : payrollDuplicateWarning ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  {payrollDuplicateWarning}
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-3">
            <Button
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-800"
              onClick={() => setPayrollCycleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handlePayrollCycleContinue}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loading Overlay */}
      {actionSubmitting && <LoadingOverlay />}

      {/* Confirmation Modal */}
      <Dialog open={Boolean(confirmAction)} onOpenChange={() => closeConfirmDialog()}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Confirm {confirmAction === 'approve' ? 'Approval' : confirmAction === 'complete-payment' ? 'Payment Completion' : 'Rejection'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {confirmAction === 'approve' 
                ? 'Are you sure you want to approve this request?' 
                : confirmAction === 'complete-payment'
                  ? 'Are you sure you want to mark this payment as completed?'
                  : 'Are you sure you want to reject this request?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              className="border-slate-600 text-white hover:bg-slate-800" 
              onClick={(event) => {
                event.stopPropagation();
                closeConfirmDialog();
              }}
              disabled={actionSubmitting}
            >
              Cancel
            </Button>
            <Button
              className={confirmAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : confirmAction === 'complete-payment' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
              onClick={confirmAction === 'approve' ? handleApprove : confirmAction === 'complete-payment' ? handleCompletePayment : handleReject}
              disabled={actionSubmitting}
            >
              {actionSubmitting ? 'Processing...' : `Confirm ${confirmAction === 'approve' ? 'Approval' : confirmAction === 'complete-payment' ? 'Completion' : 'Rejection'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal with Auto-close */}
      <Dialog
        open={showSuccessModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowSuccessModal(false);
            window.location.reload();
          }
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-700 text-white w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-emerald-400">Success</DialogTitle>
            <DialogDescription className="text-gray-300">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-slate-400 text-center py-2">
            Closing in {successCountdown} second{successCountdown !== 1 ? 's' : ''}...
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ApprovalHistory({ refreshKey, focusRequestId = null, onFocusRequestHandled }) {
  const { user } = useAuth();
  const toast = useToast();
  const userRole = resolveUserRole(user);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState('10');
  const [serverPagination, setServerPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [historyConfigDetails, setHistoryConfigDetails] = useState(null);
  const [historyLineItemsPage, setHistoryLineItemsPage] = useState(1);
  const [historyLineItemsRowsPerPage, setHistoryLineItemsRowsPerPage] = useState('25');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState('history');
  const [detailExportSection, setDetailExportSection] = useState('budget_details');
  const [exportLoading, setExportLoading] = useState(false);
  const handledFocusRequestRef = useRef(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await fetchWithCache(
          'approvalRequests',
          `history_${user?.id || 'all'}_${currentPage}_${rowsPerPage}_${searchTerm}`,
          () => approvalRequestService.getApprovalRequests({
            search: searchTerm,
            page: currentPage,
            limit: Number(rowsPerPage || 10),
          }, getToken()),
          60 * 1000
        );
        const items = Array.isArray(data) ? data : (data?.items || []);
        setHistory((items || []).map(normalizeRequest));
        setServerPagination(data?.pagination || {
          page: currentPage,
          limit: Number(rowsPerPage || 10),
          totalItems: items.length,
          totalPages: Math.max(1, Math.ceil(items.length / Number(rowsPerPage || 10))),
          hasPrev: currentPage > 1,
          hasNext: false,
        });
      } catch (error) {
        toast.error(error.message || 'Failed to load history');
        setHistory([]);
        setServerPagination((prev) => ({ ...prev, page: 1, totalItems: 0, totalPages: 1, hasPrev: false, hasNext: false }));
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [refreshKey, user?.id, currentPage, rowsPerPage, searchTerm]);

  const isUserInvolvedInRecord = useCallback(
    (record) => {
      const userId = user?.id;
      if (!userId || !record) return false;

      const isSubmitter =
        String(record.submittedBy || record.submitted_by || '') === String(userId);

      const isApprover = Array.isArray(record.approvals)
        ? record.approvals.some(
            (approval) =>
              String(approval?.assigned_to_primary || '') === String(userId) ||
              String(approval?.assigned_to_backup || '') === String(userId) ||
              String(approval?.approved_by || '') === String(userId) ||
              String(approval?.user_id || '') === String(userId) ||
              (user?.name && String(approval?.approver_name || '') === String(user.name))
          )
        : false;

      return isSubmitter || isApprover;
    },
    [user?.id, user?.name]
  );

  const applyHistoryRealtimeUpdate = useCallback(
    async (requestId, action) => {
      if (!requestId) return;

      if (action === 'deleted') {
        invalidateNamespace('approvalRequests');
        invalidateNamespace('approvalRequestDetails');
        setHistory((prev) => prev.filter((record) => String(record.id) !== String(requestId)));

        if (String(detailData?.id || '') === String(requestId)) {
          setDetailOpen(false);
          setDetailData(null);
          setHistoryConfigDetails(null);
        }
        return;
      }

      try {
        invalidateNamespace('approvalRequests');
        invalidateNamespace('approvalRequestDetails');

        const data = await fetchWithCache(
          'approvalRequestDetails',
          String(requestId),
          () => approvalRequestService.getApprovalRequest(requestId, getToken()),
          60 * 1000
        );
        if (!data) return;

        const normalized = normalizeRequest(data);
        const involved = isUserInvolvedInRecord(normalized);

        setHistory((prev) => {
          if (!involved) {
            return prev.filter((record) => String(record.id) !== String(requestId));
          }

          const exists = prev.some((record) => String(record.id) === String(normalized.id));
          if (!exists) return [normalized, ...prev];
          return prev.map((record) => (String(record.id) === String(normalized.id) ? normalized : record));
        });

        if (String(detailData?.id || '') === String(requestId)) {
          if (!involved) {
            setDetailOpen(false);
            setDetailData(null);
            setHistoryConfigDetails(null);
            return;
          }

          setDetailData(normalized);
          if (normalized.budgetId) {
            const config = await fetchWithCache(
              'budgetConfigById',
              String(normalized.budgetId),
              () => getBudgetConfigurationById(normalized.budgetId, getToken()),
              5 * 60 * 1000
            );
            setHistoryConfigDetails(config || null);
          }
        }
      } catch (error) {
        console.error('Realtime history update failed:', error);
      }
    },
    [detailData?.id, isUserInvolvedInRecord]
  );

  useEffect(() => {
    connectWebSocket();
    const unsubscribe = addWebSocketListener((message) => {
      if (message?.event !== 'approval_request_updated') return;
      const payload = message?.payload || {};
      applyHistoryRealtimeUpdate(payload.request_id, payload.action);
    });

    return () => {
      unsubscribe();
    };
  }, [applyHistoryRealtimeUpdate]);

  const filteredHistory = history.filter((record) => {
    // Personalization Filter: Only show records where user is involved
    const userId = user?.id;
    const isSubmitter = record.submittedBy === userId;
    
    // Check if user is an approver in the workflow
    const isApprover = record.approvals && record.approvals.some(
      approval => approval.assigned_to_primary === userId || 
                  approval.assigned_to_backup === userId || 
                  approval.approved_by === userId ||
                  approval.approver_name === user?.name ||
                  approval.user_id === userId
    );

    if (!isSubmitter && !isApprover) return false;

    const term = searchTerm.toLowerCase();
    return (
      record.requestNumber?.toLowerCase().includes(term) ||
      record.budgetName?.toLowerCase().includes(term)
    );
  });

  const rowsPerPageNumber = Number(rowsPerPage || 10);
  const totalPages = Math.max(1, Number(serverPagination?.totalPages || 1));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedHistory = filteredHistory;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleViewHistory = async (record) => {
    if (!record?.id) return;
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    setHistoryConfigDetails(null);
    setHistoryLineItemsPage(1);

    try {
      const data = await fetchWithCache(
        'approvalRequestDetails',
        String(record.id),
        () => approvalRequestService.getApprovalRequest(record.id, getToken()),
        60 * 1000
      );
      setDetailData(data ? normalizeRequest(data) : null);

      if (data && data.budget_id) {
        const config = await fetchWithCache(
          'budgetConfigById',
          String(data.budget_id),
          () => getBudgetConfigurationById(data.budget_id, getToken()),
          5 * 60 * 1000
        );
        setHistoryConfigDetails(config || null);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load request details.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!focusRequestId || loading) return;
    if (handledFocusRequestRef.current === String(focusRequestId)) return;

    handledFocusRequestRef.current = String(focusRequestId);

    let cancelled = false;
    const openFromFocus = async () => {
      try {
        const target = history.find((record) => String(record.id) === String(focusRequestId));

        if (target) {
          if (!cancelled) {
            await handleViewHistory(target);
            if (typeof onFocusRequestHandled === 'function') {
              onFocusRequestHandled();
            }
          }
          return;
        }

        const data = await approvalRequestService.getApprovalRequest(focusRequestId, getToken());
        if (!data || cancelled) {
          handledFocusRequestRef.current = null;
          return;
        }

        const normalized = normalizeRequest(data);
        await handleViewHistory(normalized);
        if (typeof onFocusRequestHandled === 'function') {
          onFocusRequestHandled();
        }
      } catch {
        handledFocusRequestRef.current = null;
      }
    };

    openFromFocus();

    return () => {
      cancelled = true;
    };
  }, [focusRequestId, loading, history]);

  const formatDate = (value) => {
    return formatDateTimeCompact(value);
  };

  const formatStatusLabel = (value) => formatStatusText(value, 'Pending');
  const getLevelLabel = (level) => {
    if (Number(level) === 4) return 'Payroll';
    return `L${level || '—'}`;
  };

  const getHistorySelfApproverName = () =>
    detailData?.submittedByName ||
    detailData?.submitted_by_name ||
    detailData?.submittedBy ||
    detailData?.submitted_by ||
    '—';

  const isSelfApprovedEntry = (approval = {}) => {
    const normalizedStatus = String(approval?.status || '').toLowerCase();
    const normalizedNotes = String(approval?.approval_notes || approval?.description || '').toLowerCase();
    const level = Number(approval?.approval_level);

    if (normalizedStatus === 'self_approved') return true;
    if (approval?.is_self_request === true && normalizedStatus === 'approved') return true;
    if (detailData?.is_self_request && level === 1 && normalizedStatus === 'approved') return true;
    if (level === 1 && normalizedStatus === 'approved' && normalizedNotes.includes('auto-approved') && normalizedNotes.includes('self-request')) return true;

    return false;
  };

  const getApprovalHistoryStatusLabel = (approval = {}) =>
    isSelfApprovedEntry(approval) ? 'Self Approved' : formatStatusLabel(approval?.status);

  const getApprovalHistoryApproverName = (approval = {}) => {
    if (isSelfApprovedEntry(approval)) {
      return getHistorySelfApproverName();
    }

    return approval?.approver_name || approval?.approved_by || '—';
  };

  // Calculate totals for history details
  const deductionTotal = (detailData?.line_items || [])
    .filter(item => item.is_deduction)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  
  const totalAmount = Number(detailData?.total_request_amount || 0);
  const historyLineItems = Array.isArray(detailData?.line_items)
    ? detailData.line_items.map(normalizeLineItem)
    : [];
  const historyLineItemsRowsPerPageNumber = Number(historyLineItemsRowsPerPage || 10);
  const historyLineItemsTotalPages = Math.max(1, Math.ceil(historyLineItems.length / historyLineItemsRowsPerPageNumber));
  const safeHistoryLineItemsPage = Math.min(historyLineItemsPage, historyLineItemsTotalPages);
  const visibleHistoryLineItems = historyLineItems.slice(
    (safeHistoryLineItemsPage - 1) * historyLineItemsRowsPerPageNumber,
    safeHistoryLineItemsPage * historyLineItemsRowsPerPageNumber
  );
  const canViewHistoryLineItems =
    userRole === 'payroll' ||
    String(detailData?.submitted_by || detailData?.submittedBy || '') === String(user?.id || '');

  useEffect(() => {
    setHistoryLineItemsPage(1);
  }, [detailData?.id, historyLineItemsRowsPerPage]);

  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const openExportModal = (scope) => {
    setExportScope(scope);
    if (scope === 'details') {
      setDetailExportSection('all_sections');
    }
    setExportModalOpen(true);
  };

  const buildHistoryRows = () => {
    return filteredHistory.map((record) => ({
      request_number: record.requestNumber || '',
      budget_name: record.budgetName || '',
      total_employees: Number(record.lineItemsCount ?? record.line_items_count ?? record.employeeCount ?? 0) || 0,
      deductions_count: Number(record.deductionCount ?? record.deduction_count ?? 0) || 0,
      to_be_paid_count: Number(record.toBePaidCount ?? record.to_be_paid_count ?? 0) || 0,
      status: formatStatusLabel(record.status || 'pending'),
      amount: Number(record.amount || 0),
      submitted_at: formatDate(record.submittedAt),
      requested_by:
        record.submittedByName ||
        record.submitted_by_name ||
        record.submittedBy ||
        record.submitted_by ||
        '',
    }));
  };

  const buildDetailBudgetRows = () => {
    if (!detailData) return [];
    return [{
      request_number: detailData.request_number || detailData.requestNumber || '',
      budget_name: historyConfigDetails?.budget_name || detailData?.budget_name || '',
      submitted_by:
        detailData?.submittedByName ||
        detailData?.submittedBy ||
        detailData?.submitted_by_name ||
        detailData?.submitted_by ||
        '',
      submitted_at: formatDate(detailData?.created_at || detailData?.submitted_at),
      overall_status: formatStatusLabel(detailData?.overall_status || detailData?.status || 'pending'),
      client_sponsored: detailData?.is_client_sponsored || detailData?.client_sponsored ? 'Yes' : 'No',
      payroll_cycle: `${detailData?.payroll_cycle || ''} ${detailData?.payroll_cycle_Date || detailData?.payroll_cycle_date ? `(${detailData?.payroll_cycle_Date || detailData?.payroll_cycle_date})` : ''}`.trim(),
      total_amount: Number(totalAmount || 0),
      deduction_total: Number(deductionTotal || 0),
      net_to_pay: Number(totalAmount || 0),
    }];
  };

  const buildDetailApprovalRows = () => {
    const approvals = detailData?.approvals || detailData?.approval_history || [];
    return approvals.map((approval) => ({
      level: getLevelLabel(approval.approval_level),
      status: getApprovalHistoryStatusLabel(approval),
      approver: getApprovalHistoryApproverName(approval),
      date: formatDate(approval.approval_date || approval.updated_at),
      notes: approval.approval_notes || approval.rejection_reason || '',
    }));
  };

  const buildDetailLineItemRows = () => {
    return historyLineItems.map((item) => ({
      employee_id: item.employee_id || '',
      employee_name: item.employee_name || '',
      department: item.department || '',
      position: item.position || '',
      status: item.employee_status || '',
      geo: item.geo || '',
      location: item.location || item.Location || '',
      amount: Number(item.amount || 0),
      is_deduction: item.is_deduction ? 'Yes' : 'No',
      notes: item.notes || item.item_description || '',
    }));
  };

  const exportRows = async (format) => {
    const isHistoryScope = exportScope === 'history';

    if (!isHistoryScope && format === 'excel' && detailExportSection === 'all_sections') {
      const XLSXModule = await import('xlsx');
      const XLSX = XLSXModule.default || XLSXModule;
      const workbook = XLSX.utils.book_new();

      const budgetRows = buildDetailBudgetRows();
      const approvalRows = buildDetailApprovalRows();
      const lineRows = buildDetailLineItemRows();

      const safeBudgetRows = budgetRows.length ? budgetRows : [{ message: 'No budget details available.' }];
      const safeApprovalRows = approvalRows.length ? approvalRows : [{ message: 'No approval history available.' }];
      const safeLineRows = lineRows.length ? lineRows : [{ message: 'No submitted line items available.' }];

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeBudgetRows), 'BudgetDetails');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeApprovalRows), 'ApprovalHistory');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeLineRows), 'SubmittedLineItems');

      const baseName = `request_history_${detailData?.request_number || detailData?.requestNumber || 'details'}_all_sections`;
      XLSX.writeFile(workbook, `${baseName}.xlsx`);
      return;
    }

    const rows = isHistoryScope
      ? buildHistoryRows()
      : detailExportSection === 'budget_details'
        ? buildDetailBudgetRows()
        : detailExportSection === 'approval_history'
          ? buildDetailApprovalRows()
          : buildDetailLineItemRows();

    if (!rows.length) {
      toast.error('No data available to export.');
      return;
    }

    const baseName = isHistoryScope
      ? 'approval_history_logs'
      : `request_history_${detailData?.request_number || detailData?.requestNumber || 'details'}_${detailExportSection}`;

    if (format === 'csv') {
      const headers = Object.keys(rows[0]);
      const csvBody = rows.map((row) => headers.map((key) => escapeCsvValue(row[key])).join(','));
      const csv = [headers.join(','), ...csvBody].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const XLSXModule = await import('xlsx');
    const XLSX = XLSXModule.default || XLSXModule;
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, isHistoryScope ? 'HistoryLogs' : 'RequestDetails');
    XLSX.writeFile(workbook, `${baseName}.xlsx`);
  };

  const handleConfirmExport = async (format) => {
    try {
      if (exportScope === 'details' && detailExportSection === 'all_sections' && format === 'csv') {
        toast.error('All Sections export is available for Excel only.');
        return;
      }
      setExportLoading(true);
      await exportRows(format);
      setExportModalOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to export data.');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700 flex flex-col h-full min-h-0">
      {loading && <LoadingLine />}
      <CardHeader>
        <CardTitle className="text-white">Approval History & Logs</CardTitle>
        <CardDescription className="text-gray-400">
          Complete history of approval requests you are involved in
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="w-full max-w-md">
            <Input
              placeholder="Search by request number or configuration"
              value={searchTerm}
              onChange={(e) => setSearchTerm(sanitizeSingleLine(e.target.value))}
              onKeyDown={blockShortcuts}
              className="bg-slate-700 border-gray-300 text-white"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => openExportModal('history')}
            className="border-slate-600 text-white hover:bg-slate-800"
          >
            Export Data
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400">Loading history...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-sm text-gray-400">No history records found where you are a participant.</div>
        ) : (
          <>
          <div className="flex-1 min-h-0 border border-slate-600 rounded-md overflow-auto">
            <table className="min-w-[1300px] w-full border-collapse">
              <thead className="bg-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Request #
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Budget Name
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Total Employees
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Deductions
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    To Be Paid
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-right text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider sticky right-0 z-30 bg-slate-700 border-l border-slate-600 whitespace-nowrap">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {paginatedHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-700/50">
                    {(() => {
                      const employeeCount = Number(record.lineItemsCount ?? record.line_items_count ?? record.employeeCount ?? 0) || 0;
                      const deductionCount = Number(record.deductionCount ?? record.deduction_count ?? 0) || 0;
                      const toBePaidCount = Number(record.toBePaidCount ?? record.to_be_paid_count ?? Math.max(0, employeeCount - deductionCount)) || 0;

                      return (
                        <>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {record.requestNumber || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{record.budgetName || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-center text-white font-semibold">
                      {employeeCount}
                    </td>
                    <td className="px-4 py-3 text-xs text-center text-red-400">
                      {deductionCount}
                    </td>
                    <td className="px-4 py-3 text-xs text-center text-emerald-400">
                      {toBePaidCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className={getStatusBadgeClass(record.status || 'pending')}>
                        {formatStatusText(record.status || 'pending', 'Pending')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-white">
                      ₱{Number(record.amount || 0).toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                        {formatDate(record.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {record.submittedByName || record.submitted_by_name || record.submittedBy || record.submitted_by || '—'}
                    </td>
                    <td className="px-4 py-3 text-center sticky right-0 z-20 bg-slate-800 border-l border-slate-700 group-hover:bg-slate-700 transition-colors">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewHistory(record)}
                        className="h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-700"
                      >
                        View
                      </Button>
                    </td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={safeCurrentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onRowsPerPageChange={(value) => setRowsPerPage(value)}
          />
          </>
        )}
      </CardContent>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setHistoryLineItemsPage(1);
          }
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-700 text-white !w-[99vw] md:!w-[95vw] lg:!w-[90vw] xl:!w-[82vw] 2xl:!w-[76vw] !max-w-none max-h-[85vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Request History Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              {detailData?.request_number || 'Approval Request'}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex-1 p-4 text-sm text-gray-400">Loading request details...</div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="grid gap-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Budget</div>
                      <div className="text-sm font-semibold text-white">
                        {historyConfigDetails?.budget_name || detailData?.budget_name || '—'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {historyConfigDetails?.description || historyConfigDetails?.budget_description || detailData?.budget_description || 'No description.'}
                      </div>
                      <div className="pt-1">
                        <div className="text-xs uppercase tracking-wide text-slate-400">Submitted By</div>
                        <div className="text-sm text-slate-200">{detailData?.submittedByName || detailData?.submittedBy || detailData?.submitted_by_name || detailData?.submitted_by || '—'}</div>
                      </div>
                    </div>

                    <div className="space-y-2 md:flex md:flex-col md:ml-8 md:min-w-[220px]">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Status</div>
                        <Badge variant="outline" className={getStatusBadgeClass(detailData?.overall_status || 'pending')}>
                          {formatStatusLabel(detailData?.overall_status)}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Submitted</div>
                        <div className="text-sm text-slate-200">{formatDate(detailData?.created_at || detailData?.submitted_at)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-3 border-t border-slate-700">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Total Amount</div>
                      <div className="text-lg font-semibold text-emerald-400">₱{totalAmount.toLocaleString('en-US')}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Deductions</div>
                      <div className="text-lg font-semibold text-rose-400">₱{deductionTotal.toLocaleString('en-US')}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Net To Pay</div>
                      <div className="text-lg font-semibold text-blue-400">₱{Number(totalAmount || 0).toLocaleString('en-US')}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Client Sponsored</div>
                      <div className="text-sm text-slate-200">{detailData?.is_client_sponsored || detailData?.client_sponsored ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Payroll Cycle</div>
                      <div className="text-sm text-slate-200">
                        {detailData?.payroll_cycle || '—'} {detailData?.payroll_cycle_Date || detailData?.payroll_cycle_date ? `(${detailData?.payroll_cycle_Date || detailData?.payroll_cycle_date})` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                  <div className="text-sm font-semibold text-white mb-2">Approval History</div>
                  {(detailData?.approvals || []).length === 0 ? (
                    <div className="text-xs text-slate-400">No approvals recorded.</div>
                  ) : (
                    <div className="border border-slate-700 rounded-md overflow-auto">
                      <table className="w-full text-xs text-left text-slate-300 border-collapse">
                        <thead className="bg-slate-800 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 border-b border-slate-600">Level</th>
                            <th className="px-3 py-2 border-b border-slate-600">Status</th>
                            <th className="px-3 py-2 border-b border-slate-600">Approver</th>
                            <th className="px-3 py-2 border-b border-slate-600">Date</th>
                            <th className="px-3 py-2 border-b border-slate-600">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {(detailData?.approvals || []).map((approval, index) => (
                            <tr key={`${approval.request_id || 'req'}-${approval.approval_level || index}`}>
                              <td className="px-3 py-2 text-slate-200">{getLevelLabel(approval.approval_level)}</td>
                              <td className="px-3 py-2">
                                <Badge
                                  variant="outline"
                                  className={getStatusBadgeClass(isSelfApprovedEntry(approval) ? 'self_approved' : (approval.status || 'pending'))}
                                >
                                  {getApprovalHistoryStatusLabel(approval)}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-slate-300">{getApprovalHistoryApproverName(approval)}</td>
                              <td className="px-3 py-2 text-slate-300">{formatDate(approval.approval_date || approval.updated_at)}</td>
                              <td className="px-3 py-2 text-slate-300">
                                {approval.approval_notes || approval.rejection_reason || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {canViewHistoryLineItems && (
                  <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                    <div className="text-sm font-semibold text-white mb-2">Submitted Line Items ({historyLineItems.length} total)</div>
                    {historyLineItems.length === 0 ? (
                      <div className="text-xs text-slate-400">No line items available.</div>
                    ) : (
                      <>
                        <div className="border border-slate-700 rounded-md max-h-[320px] overflow-y-auto overflow-x-auto">
                          <table className="w-full text-xs text-left text-slate-300 border-collapse">
                            <thead className="bg-slate-800 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 border-b border-slate-600">Employee ID</th>
                                <th className="px-3 py-2 border-b border-slate-600">Name</th>
                                <th className="px-3 py-2 border-b border-slate-600">Department</th>
                                <th className="px-3 py-2 border-b border-slate-600">Position</th>
                                <th className="px-3 py-2 border-b border-slate-600">Status</th>
                                <th className="px-3 py-2 border-b border-slate-600">Geo</th>
                                <th className="px-3 py-2 border-b border-slate-600">Location</th>
                                <th className="px-3 py-2 border-b border-slate-600 text-right">Amount</th>
                                <th className="px-3 py-2 border-b border-slate-600 text-center">Deduction</th>
                                <th className="px-3 py-2 border-b border-slate-600">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                              {visibleHistoryLineItems.map((item, index) => (
                                <tr key={`${item.item_id || item.employee_id || 'line'}-${index}`}>
                                  <td className="px-3 py-2 text-slate-200">{item.employee_id || '—'}</td>
                                  <td className="px-3 py-2 text-slate-200">{item.employee_name || '—'}</td>
                                  <td className="px-3 py-2 text-slate-300">{item.department || '—'}</td>
                                  <td className="px-3 py-2 text-slate-300">{item.position || '—'}</td>
                                  <td className="px-3 py-2 text-slate-300">{item.employee_status || '—'}</td>
                                  <td className="px-3 py-2 text-slate-300">{item.geo || '—'}</td>
                                  <td className="px-3 py-2 text-slate-300">{item.location || item.Location || '—'}</td>
                                  <td className="px-3 py-2 text-right text-slate-200">₱{Number(item.amount || 0).toLocaleString('en-US')}</td>
                                  <td className="px-3 py-2 text-center text-slate-300">{item.is_deduction ? 'Yes' : 'No'}</td>
                                  <td className="px-3 py-2 text-slate-300">{item.notes || item.item_description || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <PaginationControls
                          page={safeHistoryLineItemsPage}
                          totalPages={historyLineItemsTotalPages}
                          rowsPerPage={historyLineItemsRowsPerPage}
                          onPageChange={(page) => setHistoryLineItemsPage(page)}
                          onRowsPerPageChange={(value) => setHistoryLineItemsRowsPerPage(value)}
                          rowOptions={[25, 50, 100]}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4 pt-4 border-t border-slate-800 flex justify-end gap-2">
                {detailData && (
                  <Button
                    variant="outline"
                    onClick={() => openExportModal('details')}
                    className="border-slate-600 text-white hover:bg-slate-800"
                  >
                    Export Data
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={exportModalOpen} onOpenChange={(open) => !exportLoading && setExportModalOpen(open)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Export Data</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose your preferred export format for {exportScope === 'history' ? 'Approval History & Logs' : 'Request History Details'}.
            </DialogDescription>
          </DialogHeader>
          {exportScope === 'details' && (
            <div className="space-y-2">
              <Label className="text-white">Section</Label>
              <Select value={detailExportSection} onValueChange={setDetailExportSection}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="budget_details">Budget Config Details</SelectItem>
                  <SelectItem value="approval_history">Approval History</SelectItem>
                  <SelectItem value="line_items">Submitted Line Items</SelectItem>
                  <SelectItem value="all_sections">All Sections (Excel only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter className="flex justify-end gap-3">
            <Button
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-800"
              onClick={() => setExportModalOpen(false)}
              disabled={exportLoading}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="border-blue-500 text-blue-300 hover:bg-blue-500/10"
              onClick={() => handleConfirmExport('csv')}
              disabled={exportLoading}
            >
              {exportLoading ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => handleConfirmExport('excel')}
              disabled={exportLoading}
            >
              {exportLoading ? 'Exporting...' : 'Export Excel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
