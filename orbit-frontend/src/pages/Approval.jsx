import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import approvalRequestService from '../services/approvalRequestService';
import { getApproversByLevel, getBudgetConfigurationById, getBudgetConfigurations, getOrganizations, getUserById } from '../services/budgetConfigService';
import { connectWebSocket, addWebSocketListener } from '../services/realtimeService';
import { resolveUserRole } from '../utils/roleUtils';
import BulkUploadValidation from '../components/approval/BulkUploadValidation';
import { fetchWithCache, invalidateNamespace } from '../utils/dataCache';

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

const normalizeConfig = (config) => ({
  id: config.budget_id || config.id,
  name: config.budget_name || config.name || config.budgetName || 'Untitled Budget',
  department: config.department || config.budget_department || 'All',
  description: config.budget_description || config.description || '',
  maxAmount: config.max_limit || config.maxAmount || config.budgetControlLimit || config.total_budget || 0,
  totalBudget: config.total_budget || config.totalBudget || config.total_budget_amount || config.budget_total || 0,
  usedAmount: config.budget_used || config.usedAmount || 0,
  minLimit: config.min_limit || config.limitMin || 0,
  maxLimit: config.max_limit || config.limitMax || config.maxAmount || 0,
  clients: parseStoredList(config.client || config.clients),
  clientSponsored: config.client_sponsored ?? config.clientSponsored ?? config.is_client_sponsored ?? null,
  approvers: Array.isArray(config.approvers) ? config.approvers : [],
  affectedOUPaths: parseStoredPaths(config.affected_ou || config.affectedOUPaths),
});

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
  return normalized ? normalized.replace(/_/g, ' ') : 'Ongoing Approval';
};

const getStageStatusBadgeClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'pending_payroll_approval') return 'bg-purple-500 text-white';
  if (normalized === 'pending_payment_completion') return 'bg-blue-500 text-white';
  if (normalized === 'rejected') return 'bg-red-600 text-white';
  if (normalized === 'completed') return 'bg-emerald-600 text-white';
  if (normalized === 'draft') return 'bg-slate-600 text-white';
  return 'bg-yellow-500 text-white';
};

const normalizeRequest = (request) => {
  const rawStatus = request.approval_stage_status || request.display_status || request.overall_status || request.status || request.submission_status || 'draft';
  const submittedAt = request.submitted_at || request.created_at || '';
  const status = rawStatus === 'draft' && submittedAt ? 'submitted' : rawStatus;
  const lineItems = Array.isArray(request.line_items) ? request.line_items : [];
  const computedCounts = lineItems.length
    ? {
        lineItemsCount: lineItems.length,
        deductionCount: lineItems.filter((item) => Boolean(item?.is_deduction)).length,
      }
    : null;
  const lineItemsCount =
    request.line_items_count ?? request.employee_count ?? request.employeeCount ?? computedCounts?.lineItemsCount ?? 0;
  const deductionCount =
    request.deduction_count ?? request.deductionCount ?? computedCounts?.deductionCount ?? 0;
  const toBePaidCount =
    request.to_be_paid_count ?? request.toBePaidCount ?? Math.max(0, lineItemsCount - deductionCount);
  const approvalStageStatus = request.approval_stage_status || request.display_status || null;

  return {
    id: request.approval_request_id || request.id || request.request_id,
    budgetId: request.budget_id || request.budgetId || null,
    description: request.description || request.request_description || '',
    amount: request.total_request_amount || request.amount || 0,
    status,
    submittedAt,
    budgetName: request.budget_name || request.configName || 'Budget Configuration',
    requestNumber: request.request_number || request.requestNumber || null,
    approvals: request.approvals || [],
    is_self_request: request.is_self_request || false,
    lineItemsCount,
    deductionCount,
    toBePaidCount,
    approvalStageStatus,
  };
};

const formatDatePHT = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return dateString;
  }
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'pending_payroll_approval':
      return 'bg-purple-500 text-white';
    case 'pending_payment_completion':
      return 'bg-blue-500 text-white';
    case 'ongoing_approval':
      return 'bg-yellow-500 text-white';
    case 'submitted':
      return 'bg-blue-500 text-white';
    case 'approved':
      return 'bg-green-600 text-white';
    case 'rejected':
      return 'bg-red-600 text-white';
    case 'draft':
      return 'bg-slate-600 text-white';
    default:
      return 'bg-yellow-500 text-white';
  }
};

export default function ApprovalPage() {
  const { user } = useAuth();
  const userRole = resolveUserRole(user);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Role-based tab visibility
  // Requestor: Submit + History only
  // L2/L3: Approval Requests + History only
  // L1/Payroll: All three tabs
  const canSubmit = userRole === 'requestor' || userRole === 'l1' || userRole === 'payroll';
  const canViewRequests = userRole === 'l1' || userRole === 'l2' || userRole === 'l3' || userRole === 'payroll';
  const defaultTab = canSubmit ? 'submit' : canViewRequests ? 'requests' : 'history';

  const handleRefresh = () => setRefreshKey((prev) => prev + 1);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Approval Management"
        description="Submit, review, and track budget approval requests"
      />

      <div className="flex-1 p-6">
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700 p-1">
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
            <TabsContent value="submit">
              <SubmitApproval userId={user?.id} onRefresh={handleRefresh} refreshKey={refreshKey} />
            </TabsContent>
          )}

          {canViewRequests && (
            <TabsContent value="requests">
              <ApprovalRequests refreshKey={refreshKey} />
            </TabsContent>
          )}

          <TabsContent value="history">
            <ApprovalHistory refreshKey={refreshKey} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SubmitApproval({ userId, onRefresh, refreshKey }) {
  const { user } = useAuth();
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

  const [showModal, setShowModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [requestMode, setRequestMode] = useState('individual');
  const [requestDetails, setRequestDetails] = useState({
    details: '',
  });
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

  const token = useMemo(() => getToken(), [refreshKey]);
  const companyId = 'caaa0000-0000-0000-0000-000000000001';

  const buildCreatePayload = (totalAmount) => ({
    budget_id: selectedConfig?.id,
    description: requestDetails.details?.trim() || '',
    total_request_amount: Number(totalAmount || 0),
    submitted_by: user?.id || userId,
    created_by: user?.id || userId,
  });

  // Check if user can proceed with submission
  const canProceed = useMemo(() => {
    if (requestMode === 'individual') {
      return (
        requestDetails.details?.trim().length > 0 &&
        individualRequest.employeeId?.trim().length > 0 &&
        individualRequest.amount > 0
      );
    } else {
      // For bulk: need shared approval description and at least one valid item
      const hasApprovalDescription = requestDetails.details?.trim().length > 0;
      const hasValidItems = bulkItems.some((item) => {
        const hasEmployeeData = item.employee_id && item.employeeData;
        const hasValidAmount = item.amount && item.amount > 0;
        const isInScope = item.scopeValidation ? item.scopeValidation.isValid : true;
        return hasEmployeeData && hasValidAmount && isInScope;
      });

      return hasApprovalDescription && hasValidItems;
    }
  }, [requestMode, requestDetails, individualRequest, bulkItems]);

  useEffect(() => {
    const fetchConfigs = async () => {
      setConfigLoading(true);
      setConfigError(null);
      try {
        const data = await fetchWithCache(
          'budgetConfigs',
          `org_${user?.org_id || 'all'}`,
          () => getBudgetConfigurations({ org_id: user?.org_id }, token),
          5 * 60 * 1000 // 5 minutes TTL
        );
        setConfigurations((data || []).map(normalizeConfig));
      } catch (error) {
        setConfigError(error.message || 'Failed to load configurations');
        setConfigurations([]);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchConfigs();
  }, [token, refreshKey]);

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
        const data = await approvalRequestService.getApprovalRequests({ submitted_by: userId }, token);
        
        // Fetch approvals for each request
        const requestsWithApprovals = await Promise.all(
          (data || []).map(async (request) => {
            try {
              const requestId = request.approval_request_id || request.request_id;
              const approvalsResponse = await fetch(
                `http://localhost:3001/api/approval-requests/${requestId}/approvals`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              const approvalsJson = await approvalsResponse.json();
              return {
                ...request,
                approvals: approvalsJson.data || [],
              };
            } catch (error) {
              console.error('Failed to fetch approvals for request:', error);
              return { ...request, approvals: [] };
            }
          })
        );
        
        setMyRequests(requestsWithApprovals.map(normalizeRequest));
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
      setMyRequests((prev) => prev.filter((item) => item.id !== requestId));
      if (selectedRequest?.id === requestId) {
        setDetailsOpen(false);
      }
      return;
    }

    if (submittedBy && submittedBy !== userId) return;

    try {
      const data = await approvalRequestService.getApprovalRequest(requestId, token);
      if (!data || data.submitted_by !== userId) return;
      const normalized = normalizeRequest(data);

      setMyRequests((prev) => {
        const exists = prev.some((item) => item.id === normalized.id);
        if (!exists) return [normalized, ...prev];
        return prev.map((item) => (item.id === normalized.id ? normalized : item));
      });

      if (selectedRequest?.id === requestId) {
        setRequestDetailsData(data || null);
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
    });

    return () => {
      unsubscribe();
    };
  }, [userId, token, selectedRequest?.id]);

  const getOrgName = (orgId) => {
    const org = organizations.find((item) => item.org_id === orgId);
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
        formatted.push(`${parentName} → All`);
      } else if (departments.size > 0) {
        const deptArray = Array.from(departments);
        if (deptArray.length === 1) {
          formatted.push(`${parentName} → ${deptArray[0]}`);
        } else if (deptArray.length <= 4) {
          formatted.push(`${parentName} → ${deptArray.join(', ')}`);
        } else {
          const visible = deptArray.slice(0, 4).join(', ');
          const remaining = deptArray.length - 4;
          formatted.push(`${parentName} → ${visible}...(${remaining} Total)`);
        }
      } else {
        // Fallback if somehow we have neither
        formatted.push(`${parentName} → All`);
      }
    });
    
    return formatted.length ? formatted.join(' | ') : 'Not specified';
  };

  // Auto-lookup disabled per user request - remove this comment block to re-enable
  /*
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

        const employeeDepartment =
          data?.department || data?.dept || data?.department_name || data?.dept_name || data?.org_name || data?.ou_name || '';
        const employeeOrgId = normalizeText(
          data?.org_id || data?.ou_id || data?.org_unit_id || data?.department_id || ''
        );
        const employeeOrgName = employeeOrgId ? getOrgName(employeeOrgId) : '';

        const employeeDeptCandidates = [
          employeeDepartment,
          data?.org_name || '',
          data?.ou_name || '',
          employeeOrgName || '',
        ]
          .map((value) => normalizeText(value))
          .filter(Boolean);

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
        const configOuIds = new Set(
          configOuPaths.flat().map((value) => normalizeText(value)).filter(Boolean)
        );
        const configOuNames = new Set(
          configOuPaths
            .map((path) => (Array.isArray(path) ? path[path.length - 1] : path))
            .map((value) => normalizeText(getOrgName(value) || value))
            .filter(Boolean)
        );

        const hasOuFilter = configOuIds.size > 0 || configOuPaths.length > 0;
        const allowedDepartments = hasOuFilter 
          ? Array.from(configOuNames)
          : Array.from(new Set([...configDepartmentNames, ...Array.from(configOuNames)]));
        
        const hasAllDepartments = !hasOuFilter && allowedDepartments.includes('all');
        const hasDepartmentFilter = allowedDepartments.length > 0 && !hasAllDepartments;
        const departmentAllowed =
          !hasDepartmentFilter || employeeDeptCandidates.some((value) => allowedDepartments.includes(value));

        console.log('[Department Matching Debug]', {
          employeeData: data,
          employeeDepartment,
          employeeOrgId,
          employeeOrgName,
          employeeDeptCandidates,
          rawConfigDepartments,
          configDepartmentNames,
          configOuIds: Array.from(configOuIds),
          configOuNames: Array.from(configOuNames),
          allowedDepartments,
          hasAllDepartments,
          hasDepartmentFilter,
          departmentAllowed,
        });

        const employeePathRaw =
          data?.ou_path || data?.org_path || data?.ou_hierarchy || data?.org_hierarchy || '';
        const employeePath = parseStoredList(employeePathRaw).map((value) => normalizeText(value));
        
        const employeeCompanyName = normalizeText(
          data?.company_name || data?.companyName || data?.company || ''
        );
        
        const ouAllowed =
          !hasOuFilter ||
          (employeeOrgId && configOuIds.has(employeeOrgId)) ||
          (employeeCompanyName && configOuNames.has(employeeCompanyName)) ||
          (employeePath.length > 0 &&
            configOuPaths.some((path) => {
              const normalizedPath = path.map((value) => normalizeText(value)).filter(Boolean);
              if (!normalizedPath.length) return false;
              return normalizedPath.some((configId) => employeePath.includes(configId));
            }));

        console.log('[OU Matching Debug]', {
          employeePathRaw,
          employeePath,
          employeeCompanyName,
          configOuPaths,
          configOuIds: Array.from(configOuIds),
          configOuNames: Array.from(configOuNames),
          hasOuFilter,
          employeeOrgIdInSet: employeeOrgId && configOuIds.has(employeeOrgId),
          companyNameInSet: employeeCompanyName && configOuNames.has(employeeCompanyName),
          ouAllowed,
        });

        if (!departmentAllowed || !ouAllowed) {
          console.warn('[Employee Lookup] Employee not in budget scope:', {
            departmentAllowed,
            ouAllowed,
            employeeDepartment,
            allowedDepartments,
          });
          setEmployeeLookupError('Employee is not within the selected budget scope.');
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

        setIndividualRequest((prev) => ({
          ...prev,
          employeeName: data?.name || data?.employee_name || data?.fullname || data?.full_name || '',
          email: data?.email || data?.email_address || '',
          position: data?.position || data?.job_title || data?.job_position || '',
          employeeStatus: data?.employee_status || data?.active_status || data?.employment_status || data?.status || '',
          geo: data?.geo || data?.region || data?.country || '',
          location: data?.location || data?.site || data?.office || '',
          department: employeeDepartment || employeeOrgName || '',
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
    organizations,
  ]);
  */

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
    setRequestDetails({ details: '' });
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
      const data = await approvalRequestService.getApprovalRequest(request.id, token);
      setRequestDetailsData(data || null);

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
      const data = await approvalRequestService.getApprovalRequest(selectedRequest.id, token);
      setRequestDetailsData(data || null);

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
    refreshSelectedRequestDetails();
    return undefined;
  }, [detailsOpen, selectedRequest?.id, token]);

  const getApprovalBadgeClass = (status, isSelfRequest = false) => {
    // Self request gets blue color
    if (isSelfRequest && status === 'approved') {
      return 'bg-blue-500 text-white';
    }
    
    switch (status) {
      case 'approved':
        return 'bg-green-600 text-white';
      case 'rejected':
        return 'bg-red-600 text-white';
      case 'pending':
        return 'bg-yellow-500 text-white';
      case 'escalated':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  const formatStatusLabel = (status, isSelfRequest = false) => {
    if (isSelfRequest && status === 'approved') {
      return 'Self Request';
    }
    const statusStr = String(status || 'pending');
    return statusStr.charAt(0).toUpperCase() + statusStr.slice(1).replace(/_/g, ' ');
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
      return `${cached.first_name || ''} ${cached.last_name || ''}`.trim() || userId;
    }
    return userId;
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
    if (currentStage === 'APPROVED') return 'bg-emerald-500 text-white';
    if (currentStage === 'REJECTED' && stage === 'L1') return 'bg-red-500 text-white';
    
    // Handle self-request for L1
    if (stage === 'L1' && isSelfRequest && (status === 'l1_approved' || currentStage === 'L2' || currentStage === 'L3' || currentStage === 'P')) {
      return 'bg-blue-500 text-white'; // Blue for self-approved L1
    }
    
    // Current stage in progress
    if (stage === currentStage) return 'bg-amber-500 text-white'; // Yellow for pending
    
    // Approved stages
    if ((stage === 'L1' && ['L2', 'L3', 'P', 'APPROVED'].includes(currentStage)) ||
        (stage === 'L2' && ['L3', 'P', 'APPROVED'].includes(currentStage)) ||
        (stage === 'L3' && ['P', 'APPROVED'].includes(currentStage))) {
      return 'bg-emerald-500 text-white'; // Green for approved
    }
    
    return 'bg-slate-600 text-slate-300'; // Gray for not reached
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
      return;
    }

    setBulkParseError(null);
    setBulkFileName(file.name);

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

        const employeeDepartment =
          data?.department || data?.dept || data?.department_name || data?.dept_name || data?.org_name || data?.ou_name || '';
        const employeeOrgId = normalizeText(
          data?.org_id || data?.ou_id || data?.org_unit_id || data?.department_id || ''
        );
        const employeeOrgName = employeeOrgId ? getOrgName(employeeOrgId) : '';

        const employeeDeptCandidates = [
          employeeDepartment,
          data?.org_name || '',
          data?.ou_name || '',
          employeeOrgName || '',
        ]
          .map((value) => normalizeText(value))
          .filter(Boolean);

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
        const configOuIds = new Set(
          configOuPaths.flat().map((value) => normalizeText(value)).filter(Boolean)
        );
        const configOuNames = new Set(
          configOuPaths
            .map((path) => (Array.isArray(path) ? path[path.length - 1] : path))
            .map((value) => normalizeText(getOrgName(value) || value))
            .filter(Boolean)
        );

        // When OU filter exists, ignore "All" departments and use OU names as allowed departments
        const hasOuFilter = configOuIds.size > 0 || configOuPaths.length > 0;
        const allowedDepartments = hasOuFilter 
          ? Array.from(configOuNames)  // Use only OU-specific departments when OU filter exists
          : Array.from(new Set([...configDepartmentNames, ...Array.from(configOuNames)]));
        
        const hasAllDepartments = !hasOuFilter && allowedDepartments.includes('all');
        const hasDepartmentFilter = allowedDepartments.length > 0 && !hasAllDepartments;
        const departmentAllowed =
          !hasDepartmentFilter || employeeDeptCandidates.some((value) => allowedDepartments.includes(value));

        const employeePathRaw =
          data?.ou_path || data?.org_path || data?.ou_hierarchy || data?.org_hierarchy || '';
        const employeePath = parseStoredList(employeePathRaw).map((value) => normalizeText(value));
        
        // Get company name from employee data
        const employeeCompanyName = normalizeText(
          data?.company_name || data?.companyName || data?.company || ''
        );
        
        // More lenient OU matching: check if employee's company/org/OU is in the allowed list
        const ouAllowed =
          !hasOuFilter ||
          (employeeOrgId && configOuIds.has(employeeOrgId)) ||
          (employeeCompanyName && configOuNames.has(employeeCompanyName)) ||
          (employeePath.length > 0 &&
            configOuPaths.some((path) => {
              const normalizedPath = path.map((value) => normalizeText(value)).filter(Boolean);
              if (!normalizedPath.length) return false;
              // Check if any part of the employee path matches any part of the config path
              return normalizedPath.some((configId) => employeePath.includes(configId));
            }));

        return {
          departmentAllowed,
          ouAllowed,
          isValid: departmentAllowed && ouAllowed,
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
          console.log('[Bulk Upload] Batch API result:', {
            batchNumber: Math.floor(i / batchSize) + 1,
            requestedIds: employeeIds,
            foundCount: batchData?.found?.length || 0,
            notFoundCount: batchData?.notFound?.length || 0,
            notFoundIds: batchData?.notFound || [],
            rawResponse: batchData,
          });
          
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
                
                console.log(`[Bulk Upload] Employee ${item.employee_id} scope validation:`, {
                  departmentAllowed: validation.departmentAllowed,
                  ouAllowed: validation.ouAllowed,
                  isValid: validation.isValid,
                  employeeDepartment: validation.employeeDepartment,
                  employeeOrgName: validation.employeeOrgName,
                });
                
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

      // Count valid and warning rows with detailed logging
      let validCount = 0;
      let warningCount = 0;
      let invalidCount = 0;

      console.log('[Bulk Upload Validation] Starting validation of enriched items:', enrichedItems.length);

      enrichedItems.forEach((item, idx) => {
        const hasEmployeeData = item.employee_id && item.employeeData;
        const hasValidAmount = item.amount && item.amount > 0;
        const isInScope = item.scopeValidation ? item.scopeValidation.isValid : true;
        
        // Detailed logging for each item
        console.log(`[Item ${idx + 1}] Employee ${item.employee_id}:`, {
          hasEmployeeData,
          hasValidAmount,
          amount: item.amount,
          scopeValidation: item.scopeValidation,
          isInScope,
          employeeData: item.employeeData ? 'Found' : 'Not Found',
        });
        
        // Valid: has employee data, valid amount, and is in scope
        if (hasEmployeeData && hasValidAmount && isInScope) {
          validCount++;
          console.log(`[Item ${idx + 1}] ✓ VALID`);
        } 
        // Invalid: missing critical data or out of scope
        else if (!hasEmployeeData || !hasValidAmount || !isInScope) {
          invalidCount++;
          console.log(`[Item ${idx + 1}] ✗ INVALID - Reasons:`, {
            missingEmployee: !hasEmployeeData,
            invalidAmount: !hasValidAmount,
            outOfScope: !isInScope,
          });
        }
        // Warning: has some data but incomplete
        else {
          warningCount++;
          console.log(`[Item ${idx + 1}] ⚠ WARNING`);
        }
      });

      console.log('[Bulk Upload Validation] Summary:', {
        total: enrichedItems.length,
        valid: validCount,
        warning: warningCount,
        invalid: invalidCount,
      });

      // Only reject if ALL rows are completely invalid
      if (validCount === 0 && warningCount === 0 && enrichedItems.length > 0) {
        console.error('[Bulk Upload Validation] All items are invalid - rejecting file');
        throw new Error('File contains only invalid data. At least one employee must be found with a valid amount and be in the budget scope.');
      }

      console.log('[Bulk Upload Validation] File accepted with', validCount, 'valid and', warningCount, 'warning items');
      setBulkItems(enrichedItems);
    } catch (error) {
      console.error('Error parsing bulk template:', error);
      setBulkItems([]);
      setBulkParseError(error.message || 'Failed to parse the template file.');
    }
  };

  const handleSubmitIndividual = async () => {
    const commonError = validateCommon();
    if (commonError) {
      setSubmitError(commonError);
      return;
    }

    if (!individualRequest.employeeId || !individualRequest.employeeName || !individualRequest.department || !individualRequest.position || !individualRequest.amount) {
      setSubmitError('Complete all required individual fields.');
      return;
    }

    const amountValue = Number(individualRequest.amount);
    if (!amountValue || Number.isNaN(amountValue)) {
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
      setSubmitError('Amount is outside the configured range. Please add notes to proceed.');
      return;
    }

    const totalAmount = amountValue;

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
          department: individualRequest.department,
          position: individualRequest.position,
          item_type: 'other',
          item_description: requestDetails.details.trim(),
          amount: amountValue,
          is_deduction: individualRequest.isDeduction,
          notes: individualRequest.notes,
        },
        token
      );

      const submitResult = await approvalRequestService.submitApprovalRequest(requestId, token);

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
      
      // Show error modal
      setIsError(true);
      setSuccessMessage(errorMsg);
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
        }
      }, 1000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBulk = async () => {
    console.log('[handleSubmitBulk] Starting submission...', {
      bulkItemsCount: bulkItems.length,
      selectedConfigId: selectedConfig?.id,
      approvalDescription: bulkItems[0]?.approval_description
    });
    
    const commonError = validateCommon();
    if (commonError) {
      console.log('[handleSubmitBulk] Common validation failed:', commonError);
      setSubmitError(commonError);
      return;
    }
    
    if (bulkParseError) {
      console.log('[handleSubmitBulk] Parse error exists:', bulkParseError);
      setSubmitError(bulkParseError);
      return;
    }
    
    if (!bulkItems.length) {
      console.log('[handleSubmitBulk] No bulk items');
      setSubmitError('Upload the template with at least one line item.');
      return;
    }
    
    // Filter to only valid items (has employee data, amount, and in scope)
    const validItems = bulkItems.filter(item => {
      const hasEmployeeData = item.employee_id && item.employeeData;
      const hasValidAmount = item.amount && item.amount > 0;
      const isInScope = item.scopeValidation ? item.scopeValidation.isValid : true;
      return hasEmployeeData && hasValidAmount && isInScope;
    });
    
    console.log('[handleSubmitBulk] Valid items filtered:', {
      totalItems: bulkItems.length,
      validItemsCount: validItems.length,
      invalidItemsCount: bulkItems.length - validItems.length
    });
    
    if (!validItems.length) {
      setSubmitError('No valid items to submit. Ensure at least one employee has valid data and is in scope.');
      return;
    }

    // Calculate total from valid items only
    const totalAmount = validItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    
    console.log('[handleSubmitBulk] Proceeding with submission:', {
      validItemsCount: validItems.length,
      totalAmount,
      skippedInvalidCount: bulkItems.length - validItems.length
    });

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      console.log('[handleSubmitBulk] Creating approval request...');
      const created = await approvalRequestService.createApprovalRequest(buildCreatePayload(totalAmount), token);
      console.log('[handleSubmitBulk] Created response:', created);
      
      const requestId = created?.id || created?.request_id || created?.approval_request_id;
      if (!requestId) throw new Error('Approval request ID not returned.');

      // Transform validItems to match backend schema
      const lineItemsForBackend = validItems.map(item => ({
        employee_id: item.employee_id,
        employee_name: item.employee_name || item.employeeData?.name || '',
        email: item.email || item.employeeData?.email || '',
        position: item.position || item.employeeData?.position || '',
        department: item.department || item.employeeData?.department || item.employeeData?.dept || '',
        employee_status: item.employee_status || item.employeeStatus || item.employeeData?.employee_status || item.employeeData?.active_status || '',
        geo: item.geo || item.employeeData?.geo || item.employeeData?.region || '',
        location: item.location || item.employeeData?.location || item.employeeData?.site || '',
        hire_date: item.hire_date || item.hireDate || item.employeeData?.hire_date || item.employeeData?.date_hired || '',
        termination_date: item.termination_date || item.terminationDate || item.employeeData?.termination_date || item.employeeData?.end_date || '',
        item_type: 'bonus', // Default type
        item_description: requestDetails.details?.trim() || item.approval_description || item.notes || 'Bulk upload item',
        amount: Number(item.amount || 0),
        is_deduction: Boolean(item.is_deduction),
        has_warning: Boolean(item.has_warning),
        warning_reason: item.warning_reason || '',
        notes: item.notes || '',
      }));

      console.log('[handleSubmitBulk] Transformed line items:', lineItemsForBackend);
      console.log('[handleSubmitBulk] Adding line items...');
      
      await approvalRequestService.addLineItemsBulk(
        requestId,
        {
          line_items: lineItemsForBackend,
        },
        token
      );

      console.log('[handleSubmitBulk] Submitting request...');
      const submitResult = await approvalRequestService.submitApprovalRequest(requestId, token);
      console.log('[handleSubmitBulk] Submit result:', submitResult);

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
      
      // Show error modal
      setIsError(true);
      setSuccessMessage(errorMsg);
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
        }
      }, 1000);
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
  const detailDescription = detailRecord.description || selectedRequest?.description || '';
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
  const warningCount = detailLineItems.filter((item) => item.has_warning || Number(item.amount || 0) < 0).length;
  const budgetUsed = Number(requestConfigDetails?.budget_used || requestConfigDetails?.usedAmount || 0);
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

      await refreshDetails();
      await fetchApprovals();
      setDecisionNotes('');
    } catch (error) {
      console.error('[SubmitApproval.handleApprove] Error:', error);
      setActionError(extractErrorMessage(error));
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest?.id || !currentApprovalLevel) return;
    if (!decisionNotes.trim()) {
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

      await refreshDetails();
      await fetchApprovals();
      setDecisionNotes('');
    } catch (error) {
      console.error('[SubmitApproval.handleReject] Error:', error);
      setActionError(extractErrorMessage(error));
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

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[520px_1fr] items-start">
        <Card className="bg-slate-800 border-slate-700 flex flex-col min-h-[420px] w-full justify-self-start">
        <CardHeader>
          <CardTitle className="text-white">Submit New Approval Request</CardTitle>
          <CardDescription className="text-gray-400">
            Select a budget configuration and submit approval requests
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto pr-1">
          {configLoading ? (
            <div className="text-sm text-gray-400">Loading configurations...</div>
          ) : configError ? (
            <div className="text-sm text-red-400">{configError}</div>
          ) : configurations.length === 0 ? (
            <div className="text-sm text-gray-400">No configurations available.</div>
          ) : (
            <div className="space-y-2">
              {configurations.map((config) => {
                const pathsText = formatOuPaths(config.affectedOUPaths || config.affected_ou || []);
                const hasTruncation = pathsText.includes('...(');
                
                // Generate full list for tooltip
                const getAllDepartments = () => {
                  const paths = config.affectedOUPaths || config.affected_ou || [];
                  const parentGroups = new Map();
                  
                  paths.forEach(path => {
                    if (!Array.isArray(path) || path.length === 0) return;
                    const parentId = path[0];
                    const parentName = getOrgName(parentId);
                    
                    if (!parentGroups.has(parentId)) {
                      parentGroups.set(parentId, { parentName, departments: new Set() });
                    }
                    
                    if (path.length >= 2) {
                      const deptName = getOrgName(path[path.length - 1]);
                      parentGroups.get(parentId).departments.add(deptName);
                    }
                  });
                  
                  const lines = [];
                  parentGroups.forEach(({ parentName, departments }) => {
                    if (departments.size > 0) {
                      lines.push(`${parentName}:`);
                      Array.from(departments).forEach(dept => lines.push(`  • ${dept}`));
                    }
                  });
                  
                  return lines.join('\n');
                };
                
                return (
                  <div
                    key={config.id}
                    className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 hover:bg-slate-700/70 transition-colors flex flex-col min-h-[120px]"
                  >
                    <div className="space-y-1 flex-1">
                      <div>
                        <h3 className="font-semibold text-white text-sm">{config.name}</h3>
                        <p 
                          className="text-xs text-gray-400"
                          title={hasTruncation ? getAllDepartments() : undefined}
                          style={{ cursor: hasTruncation ? 'help' : 'default' }}
                        >
                          {pathsText}
                        </p>
                      </div>
                    <p className="text-xs text-gray-300 line-clamp-2">
                      {config.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="text-center text-xs text-gray-400">
                      Used Budget: ₱{Number(config.usedAmount || 0).toLocaleString()} / ₱{Number(config.maxAmount || 0).toLocaleString()}
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleOpenModal(config)}
                    >
                      Submit Request
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700 flex flex-col min-h-[420px] w-full">
        <CardHeader>
          <CardTitle className="text-white">My Ongoing Approval Requests</CardTitle>
          <CardDescription className="text-gray-400">
            Track status for your submitted approval requests
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          {requestsLoading ? (
            <div className="text-sm text-gray-400">Loading requests...</div>
          ) : requestsError ? (
            <div className="text-sm text-red-400">{requestsError}</div>
          ) : myRequests.length === 0 ? (
            <div className="text-sm text-gray-400">No approval requests submitted yet.</div>
          ) : (
            <div className="border border-slate-600 rounded-md overflow-auto flex-1">
              <table className="w-full border-collapse">
                <thead className="bg-slate-700 sticky top-0 z-10">
                  <tr>
                    <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      Request #
                    </th>
                    <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      Budget Name
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
                      Amount
                    </th>
                    <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="border-b border-slate-600 px-4 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800/50">
                  {myRequests.map((request) => {
                    const approvals = request.approvals || [];
                    const stageStatus = request.approvalStageStatus || computeStageStatus(approvals, request.overall_status || request.status);
                    const displayStatus = formatStageStatusLabel(stageStatus);
                    const employeeCount = request.lineItemsCount ?? request.line_items_count ?? request.employeeCount ?? 0;
                    const deductionCount = request.deductionCount ?? request.deduction_count ?? 0;
                    const payCount = request.toBePaidCount ?? request.to_be_paid_count ?? Math.max(0, employeeCount - deductionCount);
                    
                    return (
                      <tr
                        key={request.id}
                        className="hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-b-0"
                      >
                        <td className="px-4 py-3 text-xs text-slate-300 font-mono">
                          {request.requestNumber || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-white font-medium">
                          {request.budgetName}
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
                          ₱{Number(request.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {formatDatePHT(request.submittedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-[10px] ${getStageStatusBadgeClass(stageStatus)}`}>
                            {displayStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
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
            ? 'w-[90vw] max-w-none max-h-[85vh] p-0'
            : 'w-[95vw] md:w-[80vw] xl:w-[60vw] max-w-none max-h-[90vh] overflow-y-auto p-4'
        }`}>
<DialogHeader className={`flex-shrink-0 space-y-0 ${requestMode === 'bulk' && bulkItems.length > 0 ? 'px-6 pt-6 pb-1' : 'pb-2'}`}>
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
        ? 'px-6 pb-4' 
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
                      onChange={(e) => setIndividualRequest((prev) => ({ ...prev, employeeId: e.target.value }))}
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
                      onChange={(e) => setIndividualRequest((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="e.g., 2500"
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                    {selectedConfig && (Number(selectedConfig.minLimit) > 0 || Number(selectedConfig.maxLimit) > 0) && (
                      <p className="text-xs text-slate-400">
                        Range: {Number(selectedConfig.minLimit).toLocaleString()} - {Number(selectedConfig.maxLimit).toLocaleString()}
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
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-white">Notes</Label>
                    <Textarea
                      value={individualRequest.notes}
                      onChange={(e) => setIndividualRequest((prev) => ({ ...prev, notes: e.target.value }))}
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
                      onChange={(e) => setRequestDetails((prev) => ({ ...prev, details: e.target.value }))}
                      rows={3}
                      className="bg-slate-700 border-gray-300 text-white"
                      placeholder="Describe the request details, purpose, and any important context."
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bulk" className="flex-1 flex flex-col space-y-3 min-h-0">
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
                      className="bg-slate-700 border-gray-300 text-white max-w-md"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Required columns: Employee ID, Amount, Is Deduction, Notes.
                  </p>
                  {bulkFileName && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-300">Uploaded: {bulkFileName}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBulkItems([]);
                          setBulkFileName('');
                          setBulkParseError(null);
                          setSubmitError(null); // Clear submit error
                          // Reset file input
                          const fileInput = document.querySelector('input[type="file"]');
                          if (fileInput) fileInput.value = '';
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 px-2"
                      >
                        ✕ Clear
                      </Button>
                    </div>
                  )}
                  {bulkItems.length > 0 && (
                    <p className="text-xs text-green-300">Uploaded {bulkItems.length} line item(s).</p>
                  )}
                  {bulkParseError && (
                    <p className="text-xs text-red-300">{bulkParseError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Approval Description *</Label>
                  <Textarea
                    value={requestDetails.details}
                    onChange={(e) => setRequestDetails((prev) => ({ ...prev, details: e.target.value }))}
                    rows={3}
                    className="bg-slate-700 border-gray-300 text-white"
                    placeholder="Describe the request details, purpose, and any important context."
                  />
                </div>

                <BulkUploadValidation
                  bulkItems={bulkItems}
                  setBulkItems={setBulkItems}
                  selectedConfig={selectedConfig}
                  organizations={organizations}
                  validateEmployee={(item) => {
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
                    
                    // Check if employee is in configuration scope (same validation as individual)
                    if (item.employeeData && item.scopeValidation && selectedConfig) {
                      if (!item.scopeValidation.departmentAllowed) {
                        errors.push('Employee department not in budget scope');
                      }
                      if (!item.scopeValidation.ouAllowed) {
                        errors.push('Employee OU/organization not in budget scope');
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
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className={`flex justify-end gap-2 flex-shrink-0 ${requestMode === 'bulk' && bulkItems.length > 0 ? 'px-6 py-4 border-t border-slate-700' : ''}`}>
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
                disabled={!canProceed || submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Proceed'}
              </Button>
            ) : (
              <Button
                onClick={() => setConfirmAction('submit-bulk')}
                disabled={!canProceed || submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Proceed'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          }
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-700 text-white w-[90vw] max-w-none max-h-[90vh] overflow-y-auto p-5">
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
                    <Badge className={getStageStatusBadgeClass(detailStageStatus)}>
                      {detailStageLabel}
                    </Badge>
                    <span className="text-xs text-slate-300">{detailRequestNumber}</span>
                    <span className="text-xs text-slate-500">
                      Submitted: {detailSubmittedAt ? new Date(detailSubmittedAt).toLocaleString('en-US', {
                        timeZone: 'Asia/Manila',
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }).replace(', ', '-').replace(' ', '') : '—'}
                    </span>
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Budget Configuration Name</div>
                  <div className="text-lg font-semibold text-white">{detailRecord.budget_name || requestConfigDetails?.budget_name || requestConfigDetails?.name || 'Budget Configuration'}</div>
                  <div className="text-sm text-slate-400">
                    {requestConfigDetails?.description || requestConfigDetails?.budget_description || 'No configuration description.'}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Approval Description</div>
                  <div className="text-sm text-slate-300">{detailDescription || 'No description provided.'}</div>
                </div>
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Request Total Amount</div>
                  <div className="text-2xl font-semibold text-emerald-400">₱{Number(detailAmount || 0).toLocaleString()}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Budget Status</div>
                  <div className="text-sm text-slate-200">
                    {hasTotalBudget
                      ? `₱${Number(budgetUsed || 0).toLocaleString()} / ₱${Number(budgetMax || 0).toLocaleString()}`
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
                      ? `After approval: ₱${Number(projectedUsed || 0).toLocaleString()} / ₱${Number(budgetMax || 0).toLocaleString()}`
                      : 'After approval: No limit'}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">Uploaded Data</div>
                  {warningCount > 0 && (
                    <Badge className="bg-amber-500 text-white">⚠ {warningCount} Warning{warningCount > 1 ? 's' : ''}</Badge>
                  )}
                </div>
                <div className="mt-3">
                  <Input
                    placeholder="Search employees by name, ID, department, or position..."
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    className="bg-slate-700 border-gray-300 text-white"
                  />
                </div>
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-700">
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
                        <th className="px-3 py-2 text-right text-slate-300">Amount</th>
                        <th className="px-3 py-2 text-center text-slate-300">Deduction</th>
                        <th className="px-3 py-2 text-left text-slate-300">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {filteredLineItems.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="px-3 py-6 text-center text-sm text-slate-400">
                            No line items found.
                          </td>
                        </tr>
                      ) : (
                        filteredLineItems.map((item) => {
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
                                ₱{Math.abs(amountValue).toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {item.is_deduction ? <Badge className="bg-red-500/20 text-red-300 text-[10px]">Yes</Badge> : <span className="text-slate-400">—</span>}
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
                    const approvedDate = approval?.approval_date ? formatDatePHT(approval.approval_date) : '—';
                    const isPayroll = entry.level === 'P';
                    
                    return (
                      <div key={entry.label} className="rounded-lg border border-slate-600 bg-slate-900/40 p-3 flex flex-col">
                        <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">{entry.title}</div>
                        <Badge className={`${getApprovalBadgeClass(status, isSelfRequest)} mb-3 w-fit`}>
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
                                  <div className={isSelfRequest ? 'text-blue-400 font-semibold' : 'text-emerald-400 font-semibold'}>{approvedBy}</div>
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
                  // Don't close the modal yet - keep confirmAction
                  if (confirmAction === 'submit-individual') {
                    await handleSubmitIndividual();
                  } else if (confirmAction === 'submit-bulk') {
                    await handleSubmitBulk();
                  }
                  // Modal will be closed by success/error handler
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
      <Dialog open={showSuccessModal} onOpenChange={(open) => !open && setShowSuccessModal(false)} modal={true}>
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
          <DialogFooter>
            <Button 
              onClick={() => {
                setShowSuccessModal(false);
                if (!isError) {
                  setShowModal(false);
                  onRefresh();
                }
              }}
              className={isError ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
            >
              Close Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
function ApprovalRequests({ refreshKey }) {
  const { user } = useAuth();
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDetailsData, setRequestDetailsData] = useState(null);
  const [requestConfigDetails, setRequestConfigDetails] = useState(null);
  const [detailSearch, setDetailSearch] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [actionError, setActionError] = useState(null);
  const [detailVisibleCount, setDetailVisibleCount] = useState(20);
  const detailTableRef = useRef(null);

  const formatDatePHT = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return dateString;
    }
  };

  const getApprovalBadgeClass = (status, isSelfRequest = false) => {
    // Self request gets blue color
    if (isSelfRequest && status === 'approved') {
      return 'bg-blue-500 text-white';
    }
    
    switch (status) {
      case 'approved':
        return 'bg-green-600 text-white';
      case 'rejected':
        return 'bg-red-600 text-white';
      case 'pending':
        return 'bg-yellow-500 text-white';
      case 'escalated':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  const formatStatusLabel = (status, isSelfRequest = false) => {
    if (isSelfRequest && status === 'approved') {
      return 'Self Request';
    }
    const statusStr = String(status || 'pending');
    return statusStr.charAt(0).toUpperCase() + statusStr.slice(1).replace(/_/g, ' ');
  };
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (userRole === 'requestor') {
      setStatusFilter('submitted');
    } else {
      setStatusFilter('pending');
    }
  }, [userRole]);

  const fetchApprovals = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      if (userRole === 'requestor') {
        const filters = {
          ...(statusFilter === 'all' ? {} : { status: statusFilter }),
          submitted_by: user.id,
        };
        const data = await approvalRequestService.getApprovalRequests(filters, getToken());
        setApprovals((data || []).map(normalizeRequest));
        setApprovalStatusMap({});
      } else if (userRole === 'payroll') {
        // Payroll sees all submitted/in-progress requests from their parent OU
        const userOrgId = user?.organization_id || user?.organizationId || user?.org_id;
        const allRequests = await approvalRequestService.getApprovalRequests({}, getToken());
        
        // Filter by OU and status (submitted or in approval stages)
        const filteredRequests = (allRequests || []).filter(request => {
          const requestOrgId = request.organization_id || request.organizationId || request.org_id;
          const statusOk = ['submitted', 'l1_approved', 'l2_approved', 'l3_approved'].includes(
            String(request.overall_status || request.status).toLowerCase()
          );
          return requestOrgId === userOrgId && statusOk;
        });
        
        setApprovals(filteredRequests.map(normalizeRequest));
        setApprovalStatusMap({});
      } else {
        // Other roles (L1/L2/L3) see pending approvals + already approved by them (but not completed/rejected)
        const pendingApprovals = await approvalRequestService.getPendingApprovals(user.id, getToken());
        const requestIds = Array.from(new Set((pendingApprovals || []).map((entry) => entry.request_id).filter(Boolean)));
        const submittedRequests = await approvalRequestService.getApprovalRequests(
          { submitted_by: user.id },
          getToken()
        );
        const submittedRequestIds = (submittedRequests || [])
          .map((request) => request?.request_id || request?.id)
          .filter(Boolean);
        const allRequestIds = Array.from(new Set([...requestIds, ...submittedRequestIds]));
        const requestDetails = await Promise.all(
          allRequestIds.map((requestId) => approvalRequestService.getApprovalRequest(requestId, getToken()))
        );

        const normalizedRequests = requestDetails
          .filter(Boolean)
          .map((request) => normalizeRequest(request));

        // Include requests where user has already approved at their level, but request is not completed/rejected
        const expandedRequests = await Promise.all(
          normalizedRequests.map(async (request) => {
            const details = await approvalRequestService.getApprovalRequestDetails(request.id, getToken());
            return { ...request, approvals: details?.approvals || [] };
          })
        );

        // Filter: show if pending for user OR user approved but not completed/rejected
        const visibleRequests = expandedRequests.filter((request) => {
          const status = String(request.status || '').toLowerCase();
          if (status === 'rejected' || status === 'completed') return false;
          const userApprovals = (request.approvals || []).filter(
            (a) => a.assigned_to_primary === user.id || a.assigned_to_backup === user.id
          );
          return userApprovals.length > 0 || String(request.submitted_by || '') === String(user.id);
        });

        const normalizedFilter = String(statusFilter || '').toLowerCase();
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
      }
    } catch (error) {
      setError(error.message || 'Failed to load approvals');
      setApprovals([]);
      setApprovalStatusMap({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [refreshKey, statusFilter, user?.id, userRole]);

  const applyRequestUpdate = async (requestId, action) => {
    if (!requestId) return;
    if (action === 'deleted') {
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
      const data = await approvalRequestService.getApprovalRequest(requestId, getToken());
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
        setRequestDetailsData(data);
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
      const data = await approvalRequestService.getApprovalRequest(approval.id, getToken());
      setRequestDetailsData(data || null);

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
      const data = await approvalRequestService.getApprovalRequest(selectedRequest.id, getToken());
      setRequestDetailsData(data || null);

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
    setDetailVisibleCount(20);
    refreshDetails();
    return undefined;
  }, [detailsOpen, selectedRequest?.id]);

  const handleDetailTableScroll = useCallback((event) => {
    const el = event.currentTarget;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (nearBottom) {
      setDetailVisibleCount((prev) => prev + 20);
    }
  }, []);

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
    return normalized ? normalized.replace(/_/g, ' ') : 'Pending';
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
    if (currentStage === 'APPROVED') return 'bg-emerald-500 text-white';
    if (currentStage === 'REJECTED' && stage === 'L1') return 'bg-red-500 text-white';
    if (stage === currentStage) return 'bg-blue-500 text-white';
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
  const detailDescription = detailRecord.description || selectedRequest?.description || '';
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
  
  const canActOnRequest = Boolean(currentApprovalLevel && userRole !== 'requestor' && !userHasApproved);
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
  const visibleLineItems = filteredLineItems.slice(0, detailVisibleCount);
  const warningCount = detailLineItems.filter((item) => item.has_warning || Number(item.amount || 0) < 0).length;
  const budgetUsed = Number(requestConfigDetails?.budget_used || requestConfigDetails?.usedAmount || 0);
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
      // Show confirmation modal
      setConfirmAction('approve');
      return;
    }
    
    // User confirmed, proceed with approval
    setConfirmAction(null);
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

      setSuccessMessage('Approval request approved successfully.');
      setShowSuccessModal(true);
      
      // Auto-close success modal and refresh after 5 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
        setDetailsOpen(false);
        setDecisionNotes('');
        fetchApprovals();
      }, 5000);
    } catch (error) {
      console.error('[ApprovalRequests.handleApprove] Error:', error);
      setActionError(extractErrorMessage(error));
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

      setSuccessMessage('Approval request rejected.');
      setShowSuccessModal(true);
      
      // Auto-close success modal and refresh after 5 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
        setDetailsOpen(false);
        setDecisionNotes('');
        fetchApprovals();
      }, 5000);
    } catch (error) {
      console.error('[ApprovalRequests.handleReject] Error:', error);
      setActionError(extractErrorMessage(error));
      setConfirmAction(null);
    } finally {
      setActionSubmitting(false);
    }
  };

  if (!canViewRequests) {
    return null;
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Approval Requests</CardTitle>
        <CardDescription className="text-gray-400">
          Review and approve budget requests requiring your attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[240px]">
            <Input
              placeholder="Search by request number, budget, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
          <div className="border border-slate-600 rounded-md overflow-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="border-b border-slate-600 px-3 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Request ID
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Budget Config
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
                  <th className="border-b border-slate-600 px-3 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Submitted By
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Submitted When
                  </th>
                  <th className="border-b border-slate-600 px-3 py-3 text-center text-xs font-semibold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800/50">
                  {filteredApprovals.map((approval) => {
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
                        {approval.budgetName || 'Budget Configuration'}
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
                      <td className="px-3 py-3">
                        <Badge className={getStageStatusBadgeClass(stageStatus)}>
                          {displayStatus}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-300">
                        {approval.submittedBy || approval.submitted_by || '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-400">
                        {approval.submittedAt ? formatDatePHT(approval.submittedAt) : '—'}
                      </td>
                      <td className="px-3 py-3 text-center">
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
        )}
      </CardContent>

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
                    <Badge className={getStageStatusBadgeClass(detailStageStatus)}>
                      {detailStageLabel}
                    </Badge>
                    <span className="text-xs text-slate-300">{detailRequestNumber}</span>
                    <span className="text-xs text-slate-500">
                      Submitted: {detailSubmittedAt ? new Date(detailSubmittedAt).toLocaleString('en-US', {
                        timeZone: 'Asia/Manila',
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }).replace(', ', '-').replace(' ', '') : '—'}
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-white">{detailRecord.budget_name || requestConfigDetails?.budget_name || requestConfigDetails?.name || 'Budget Configuration'}</div>
                  <div className="text-sm text-slate-400">
                    {requestConfigDetails?.description || requestConfigDetails?.budget_description || 'No configuration description.'}
                  </div>
                  <div className="text-s text-slate-200">Approval Description: {detailDescription || 'No description provided.'}</div>
                </div>
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Request Total Amount</div>
                  <div className="text-2xl font-semibold text-emerald-400">₱{Number(detailAmount || 0).toLocaleString()}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Budget Status</div>
                  <div className="text-sm text-slate-200">
                    {hasTotalBudget
                      ? `₱${Number(budgetUsed || 0).toLocaleString()} / ₱${Number(budgetMax || 0).toLocaleString()}`
                      : 'No limit'}
                  </div>
                  <div className="h-2 rounded-full bg-slate-700">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${budgetPercent}%` }} />
                  </div>
                  <div className="text-xs text-slate-400">
                    {hasTotalBudget
                      ? `After approval: ₱${Number(projectedUsed || 0).toLocaleString()} / ₱${Number(budgetMax || 0).toLocaleString()}`
                      : 'After approval: No limit'}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">Uploaded Data</div>
                  {warningCount > 0 && (
                    <Badge className="bg-amber-500 text-white">⚠ {warningCount} Warning{warningCount > 1 ? 's' : ''}</Badge>
                  )}
                </div>
                <div className="mt-3">
                  <Input
                    placeholder="Search employees by name, ID, department, or position..."
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    className="bg-slate-700 border-gray-300 text-white"
                  />
                </div>
                <div
                  ref={detailTableRef}
                  onScroll={handleDetailTableScroll}
                  className="mt-3 max-h-[380px] overflow-x-auto overflow-y-auto rounded-lg border border-slate-700"
                >
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
                                ₱{Math.abs(amountValue).toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {item.is_deduction ? <Badge className="bg-red-500/20 text-red-300 text-[10px]">Yes</Badge> : <span className="text-slate-400">—</span>}
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
                    const approvedDate = approval?.approval_date ? formatDatePHT(approval.approval_date) : '—';
                    const isPayroll = entry.level === 'P';
                    
                    return (
                      <div key={entry.label} className="rounded-lg border border-slate-600 bg-slate-900/40 p-3 flex flex-col">
                        <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">{entry.title}</div>
                        <Badge className={`${getApprovalBadgeClass(status, isSelfRequest)} mb-3 w-fit`}>
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
                                  <div className={isSelfRequest ? 'text-blue-400 font-semibold' : 'text-emerald-400 font-semibold'}>{approvedBy}</div>
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

              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4 space-y-2">
                <Label className="text-white">Approval/Rejection Description</Label>
                {actionError && (
                  <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {actionError}
                  </div>
                )}
                <Textarea
                  rows={3}
                  className="bg-slate-700 border-gray-300 text-white"
                  placeholder="Enter your comments, notes, or reasons for approval/rejection..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                />
                <p className="text-xs text-slate-400">This description will be included with your approval/rejection decision.</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-3">
            <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-800" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {canActOnRequest && (
              <>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleReject}
                  disabled={actionSubmitting}
                >
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleApprove}
                  disabled={actionSubmitting}
                >
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={Boolean(confirmAction)} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Confirm {confirmAction === 'approve' ? 'Approval' : 'Rejection'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {confirmAction === 'approve' 
                ? 'Are you sure you want to approve this request?' 
                : 'Are you sure you want to reject this request?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              className="border-slate-600 text-white hover:bg-slate-800" 
              onClick={() => setConfirmAction(null)}
              disabled={actionSubmitting}
            >
              Cancel
            </Button>
            <Button
              className={confirmAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
              onClick={confirmAction === 'approve' ? handleApprove : handleReject}
              disabled={actionSubmitting}
            >
              {actionSubmitting ? 'Processing...' : `Confirm ${confirmAction === 'approve' ? 'Approval' : 'Rejection'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal with Auto-close */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-emerald-400">Success</DialogTitle>
            <DialogDescription className="text-gray-300">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-slate-400 text-center py-2">
            This modal will close automatically in 5 seconds...
          </div>
          <DialogFooter className="flex justify-center">
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white" 
              onClick={() => {
                setShowSuccessModal(false);
                setDetailsOpen(false);
                setDecisionNotes('');
                fetchApprovals();
              }}
            >
              Close Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ApprovalHistory({ refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await approvalRequestService.getApprovalRequests({}, getToken());
        setHistory((data || []).map(normalizeRequest));
      } catch (error) {
        setError(error.message || 'Failed to load history');
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [refreshKey]);

  const filteredHistory = history.filter((record) => {
    const term = searchTerm.toLowerCase();
    return (
      record.requestNumber?.toLowerCase().includes(term) ||
      record.budgetName?.toLowerCase().includes(term)
    );
  });

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Approval History & Logs</CardTitle>
        <CardDescription className="text-gray-400">
          Complete history of submitted approval requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-md">
          <Input
            placeholder="Search by request number or configuration"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-700 border-gray-300 text-white"
          />
        </div>

        {loading ? (
          <div className="text-sm text-gray-400">Loading history...</div>
        ) : error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-sm text-gray-400">No history records found.</div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((record) => (
              <div key={record.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusBadgeClass(record.status)}>
                        {record.status.replace(/_/g, ' ')}
                      </Badge>
                      {record.requestNumber && (
                        <span className="text-xs text-gray-400">{record.requestNumber}</span>
                      )}
                    </div>
                    <h4 className="text-white font-medium">{record.budgetName}</h4>
                    <p className="text-xs text-gray-300">{record.budgetName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">₱{Number(record.amount || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{record.submittedAt || '—'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
