import React, { useEffect, useMemo, useState, useCallback } from 'react';
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

const normalizeRequest = (request) => {
  const rawStatus = request.overall_status || request.status || request.submission_status || 'draft';
  const submittedAt = request.submitted_at || request.created_at || '';
  const status = rawStatus === 'draft' && submittedAt ? 'submitted' : rawStatus;

  return {
    id: request.approval_request_id || request.id || request.request_id,
    budgetId: request.budget_id || request.budgetId || null,
    description: request.description || request.request_description || '',
    amount: request.total_request_amount || request.amount || 0,
    status,
    submittedAt,
    budgetName: request.budget_name || request.configName || 'Budget Configuration',
    requestNumber: request.request_number || request.requestNumber || null,
  };
};

const getStatusBadgeClass = (status) => {
  switch (status) {
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

  const token = useMemo(() => getToken(), [refreshKey]);
  const companyId = 'caaa0000-0000-0000-0000-000000000001';

  // Check if user can proceed with submission
  const canProceed = useMemo(() => {
    if (requestMode === 'individual') {
      return (
        requestDetails.details?.trim().length > 0 &&
        individualRequest.employeeId?.trim().length > 0 &&
        individualRequest.amount > 0
      );
    } else {
      // For bulk: need approval description and at least one valid item
      // Check if ANY item has approval_description (they should all have the same value)
      const hasApprovalDescription = bulkItems.some(item => 
        item.approval_description && item.approval_description.trim().length > 0
      );
      const hasValidItems = bulkItems.some(item => {
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
        setMyRequests((data || []).map(normalizeRequest));
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

  const formatOuPaths = (paths) => {
    if (!Array.isArray(paths) || paths.length === 0) return 'Not specified';
    const readable = paths
      .map((path) => (Array.isArray(path) ? path.map((id) => getOrgName(id)).join(' → ') : getOrgName(path)))
      .filter(Boolean);
    return readable.length ? readable.join(', ') : 'Not specified';
  };

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

        // When OU filter exists, ignore "All" departments and use OU names as allowed departments
        const hasOuFilter = configOuIds.size > 0 || configOuPaths.length > 0;
        const allowedDepartments = hasOuFilter 
          ? Array.from(configOuNames)  // Use only OU-specific departments when OU filter exists
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
    }, 500);

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

  const getApprovalBadgeClass = (status) => {
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

  const getValidUserId = (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(value || '')) return value;
    return '00000000-0000-0000-0000-000000000000';
  };

  const buildCreatePayload = (totalAmount) => ({
    budget_id: selectedConfig?.id,
    description: requestDetails.details.trim(),
    total_request_amount: totalAmount,
    submitted_by: getValidUserId(userId),
    created_by: getValidUserId(userId),
  });

  const validateCommon = () => {
    if (!selectedConfig?.id) return 'Select a budget configuration.';
    if (!requestDetails.details.trim()) return 'Request details are required.';
    return null;
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
    if (normalized.includes('l1')) return 'L1';
    if (normalized.includes('l2')) return 'L2';
    if (normalized.includes('l3')) return 'L3';
    if (normalized.includes('payroll')) return 'P';
    if (normalized === 'approved') return 'APPROVED';
    if (normalized === 'rejected') return 'REJECTED';
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
    <div className="flex flex-wrap items-center justify-end gap-2">
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
      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${getStatusBadgeClass(status)}`}>
        {String(status || 'submitted').replace(/_/g, ' ')}
      </span>
    </div>
  );

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

      await approvalRequestService.submitApprovalRequest(requestId, token);

      setSubmitSuccess('Approval request submitted successfully.');
      setShowModal(false);
      onRefresh();
    } catch (error) {
      setSubmitError(error.message || 'Failed to submit approval request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBulk = async () => {
    const commonError = validateCommon();
    if (commonError) {
      setSubmitError(commonError);
      return;
    }

    if (bulkParseError) {
      setSubmitError(bulkParseError);
      return;
    }

    if (!bulkItems.length) {
      setSubmitError('Upload the template with at least one line item.');
      return;
    }

    const invalidItem = bulkItems.find(
      (item) => !item.employee_id || !item.amount
    );

    if (invalidItem) {
      setSubmitError('Ensure all bulk rows include Employee ID and Amount.');
      return;
    }

    const totalAmount = bulkItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const created = await approvalRequestService.createApprovalRequest(buildCreatePayload(totalAmount), token);
      const requestId = created?.id || created?.request_id || created?.approval_request_id;
      if (!requestId) throw new Error('Approval request ID not returned.');

      await approvalRequestService.addLineItemsBulk(
        requestId,
        {
          line_items: bulkItems,
        },
        token
      );

      await approvalRequestService.submitApprovalRequest(requestId, token);

      setSubmitSuccess('Bulk approval request submitted successfully.');
      setShowModal(false);
      onRefresh();
    } catch (error) {
      setSubmitError(error.message || 'Failed to submit approval request.');
    } finally {
      setSubmitting(false);
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
      setActionError(error.message || 'Failed to approve request.');
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
      setActionError(error.message || 'Failed to reject request.');
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
              {configurations.map((config) => (
                <div
                  key={config.id}
                  className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 hover:bg-slate-700/70 transition-colors flex flex-col min-h-[120px]"
                >
                  <div className="space-y-1 flex-1">
                    <div>
                      <h3 className="font-semibold text-white text-sm">{config.name}</h3>
                      <p className="text-xs text-gray-400">
                        {formatOuPaths(config.affectedOUPaths || config.affected_ou || [])}
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
              ))}
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
        <CardContent className="flex-1 overflow-y-auto pr-1">
          {requestsLoading ? (
            <div className="text-sm text-gray-400">Loading requests...</div>
          ) : requestsError ? (
            <div className="text-sm text-red-400">{requestsError}</div>
          ) : myRequests.length === 0 ? (
            <div className="text-sm text-gray-400">No approval requests submitted yet.</div>
          ) : (
            <div className="overflow-x-auto border border-slate-600 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-200 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-200 whitespace-nowrap">Request #</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-200 whitespace-nowrap">Budget</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-200 whitespace-nowrap">Submitted</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-200 whitespace-nowrap">Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-200">Summary</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-200 whitespace-nowrap">Workflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-600">
                  {myRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => handleOpenRequestDetails(request)}
                    >
                      <td className="px-4 py-3">
                        <Badge className={getStatusBadgeClass(request.status)}>
                          {request.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {request.requestNumber || '—'}
                      </td>
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                        {request.budgetName}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {request.submittedAt || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-white font-semibold whitespace-nowrap">
                        ₱{Number(request.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-300 max-w-xs">
                        {request.description || 'No summary provided.'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {renderWorkflowSummary(request.status)}
                      </td>
                    </tr>
                  ))}
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
            ? 'w-[90vw] max-w-none h-[85vh] p-0'
            : 'w-[95vw] md:w-[80vw] xl:w-[60vw] max-w-none max-h-[90vh] overflow-y-auto p-4'
        }`}>
          <DialogHeader className={requestMode === 'bulk' && bulkItems.length > 0 ? 'px-6 pt-6 pb-2 flex-shrink-0' : ''}>
            <DialogTitle className="text-lg font-bold">Submit Approval Request</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedConfig?.name}
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <div className={`${requestMode === 'bulk' && bulkItems.length > 0 ? 'mx-6' : ''} rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300`}>
              {submitError}
            </div>
          )}

          <div className={`flex-1 flex flex-col min-h-0 ${requestMode === 'bulk' && bulkItems.length > 0 ? 'px-6 pb-4' : ''}`}>
            <Tabs value={requestMode} onValueChange={setRequestMode} className="flex-1 flex flex-col min-h-0">
              <TabsList className="bg-slate-700 border-slate-600 p-1 flex-shrink-0">
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
                    Required columns: Employee ID, Amount, Is Deduction, Notes, Approval Description.
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
                    
                    // Check for warnings
                    const minLimit = Number(selectedConfig?.minLimit || 0);
                    const maxLimit = Number(selectedConfig?.maxLimit || 0);
                    const needsNotes = 
                      item.is_deduction ||
                      (minLimit > 0 && item.amount < minLimit) ||
                      (maxLimit > 0 && item.amount > maxLimit);
                    
                    if (needsNotes && !item.notes?.trim()) {
                      warnings.push('Notes required for deduction/out-of-range amount');
                    }
                    
                    if (!item.approval_description?.trim()) {
                      warnings.push('Approval description recommended');
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
                onClick={handleSubmitIndividual}
                disabled={!canProceed || submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Proceed'}
              </Button>
            ) : (
              <Button
                onClick={handleSubmitBulk}
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
            setDecisionNotes('');
            setActionError(null);
            setActionSubmitting(false);
          }
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-700 text-white w-[90vw] max-w-none max-h-[90vh] overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Request Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              {detailBudgetName}
            </DialogDescription>
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
                    <Badge className={getStatusBadgeClass(detailStatus)}>
                      {String(detailStatus || 'draft').replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs text-slate-300">{detailRequestNumber}</span>
                    <span className="text-xs text-slate-500">Submitted: {detailSubmittedAt || '—'}</span>
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Budget Configuration</div>
                  <div className="text-lg font-semibold text-white">{detailBudgetName}</div>
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
                        <th className="px-3 py-2 text-left text-slate-300">Full Name</th>
                        <th className="px-3 py-2 text-left text-slate-300">Department</th>
                        <th className="px-3 py-2 text-left text-slate-300">Position</th>
                        <th className="px-3 py-2 text-right text-slate-300">Amount</th>
                        <th className="px-3 py-2 text-left text-slate-300">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {filteredLineItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">
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
                              <td className="px-3 py-2 text-slate-300">{item.department || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.position || '—'}</td>
                              <td className={`px-3 py-2 text-right font-semibold ${amountValue < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                ₱{Math.abs(amountValue).toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {item.notes || item.item_description || (item.is_deduction ? 'Deduction' : '—')}
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
                <div className="text-sm font-semibold text-white">Approval Workflow Status</div>
                <div className="mt-3 space-y-3">
                  {[{ level: 1, label: 'Level 1 Approval' }, { level: 2, label: 'Level 2 Approval' }, { level: 3, label: 'Level 3 Approval' }, { level: 'P', label: 'Payroll Completion' }].map((entry) => {
                    const approver = getApproverForLevel(entry.level);
                    const approval = getApprovalForLevel(entry.level);
                    const status = approval?.status || 'pending';
                    return (
                      <div key={entry.label} className="rounded-lg border border-amber-500/40 bg-slate-900/40 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-white">{entry.label}</div>
                          <Badge className={getApprovalBadgeClass(status)}>{String(status).replace(/_/g, ' ')}</Badge>
                        </div>
                        <div className="mt-2 text-xs text-slate-400">Waiting for approval from:</div>
                        <div className="text-sm text-slate-200">
                          Main Approver: {approver?.approver_name || getApproverDisplayName(approver?.primary_approver) || 'Not assigned'}
                        </div>
                        <div className="text-sm text-slate-200">
                          Backup Approver: {approver?.backup_approver_name || getApproverDisplayName(approver?.backup_approver) || 'Not assigned'}
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
  const [actionSubmitting, setActionSubmitting] = useState(false);

  useEffect(() => {
    if (userRole === 'requestor') {
      setStatusFilter('submitted');
    } else {
      setStatusFilter('pending');
    }
  }, [userRole]);

  const getApprovalBadgeClass = (status) => {
    switch (String(status || '').toLowerCase()) {
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
      } else {
        const pendingApprovals = await approvalRequestService.getPendingApprovals(user.id, getToken());
        const requestIds = Array.from(new Set((pendingApprovals || []).map((entry) => entry.request_id).filter(Boolean)));
        const requestDetails = await Promise.all(
          requestIds.map((requestId) => approvalRequestService.getApprovalRequest(requestId, getToken()))
        );

        const normalizedRequests = requestDetails
          .filter(Boolean)
          .map((request) => normalizeRequest(request));

        const normalizedFilter = String(statusFilter || '').toLowerCase();
        const filteredByStatus = (normalizedFilter === 'all' || normalizedFilter === 'pending')
          ? normalizedRequests
          : normalizedRequests.filter((request) => String(request.status || '').toLowerCase() === normalizedFilter);

        const statusMap = requestDetails.reduce((acc, request) => {
          if (!request?.request_id) return acc;
          acc[request.request_id] = request.approvals || [];
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
    refreshDetails();
    return undefined;
  }, [detailsOpen, selectedRequest?.id]);

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
    if (normalized.includes('l1')) return 'L1';
    if (normalized.includes('l2')) return 'L2';
    if (normalized.includes('l3')) return 'L3';
    if (normalized.includes('payroll')) return 'P';
    if (normalized === 'approved') return 'APPROVED';
    if (normalized === 'rejected') return 'REJECTED';
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
      setActionError(error.message || 'Failed to approve request.');
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
      setActionError(error.message || 'Failed to reject request.');
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {filteredApprovals.map((approval) => (
              <div key={approval.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white">
                    {approval.requestNumber || approval.id}
                  </span>
                  <Badge className="bg-blue-500 text-white">{getReviewLabel(approval.status)}</Badge>
                </div>
                <div className="text-sm font-semibold text-white">{approval.budgetName}</div>
                <div className="text-xs text-slate-300">Employee: {approval.employeeName || '—'}</div>
                <div className="text-2xl font-semibold text-white">₱{Number(approval.amount || 0).toLocaleString()}</div>
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400">Approval Progress:</div>
                  <div className="space-y-1 text-xs text-slate-300">
                    <div className="rounded-md bg-slate-800/60 px-2 py-1">
                      L1: {getLevelStatusLabel(getApprovalStatusForLevel(approval.id, 1))}
                    </div>
                    <div className="rounded-md bg-slate-800/60 px-2 py-1">
                      L2: {getLevelStatusLabel(getApprovalStatusForLevel(approval.id, 2))}
                    </div>
                    <div className="rounded-md bg-slate-800/60 px-2 py-1">
                      L3: {getLevelStatusLabel(getApprovalStatusForLevel(approval.id, 3))}
                    </div>
                    <div className="rounded-md bg-slate-800/60 px-2 py-1">
                      Payroll: {getLevelStatusLabel(getApprovalStatusForLevel(approval.id, 4))}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-300 line-clamp-2">{approval.description || 'No summary provided.'}</div>
                <div className="text-xs text-slate-400">Submitted: {approval.submittedAt || '—'}</div>
                <Button
                  size="sm"
                  onClick={() => handleOpenDetails(approval)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  View Details
                </Button>
              </div>
            ))}
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
        <DialogContent className="bg-slate-900 border-slate-700 text-white w-[95vw] md:w-[90vw] lg:w-[80vw] xl:w-[60vw] max-w-none max-h-[85vh] overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Approval Request Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              {detailBudgetName}
            </DialogDescription>
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
                    <Badge className={getStatusBadgeClass(detailStatus)}>
                      {String(detailStatus || 'draft').replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs text-slate-300">{detailRequestNumber}</span>
                    <span className="text-xs text-slate-500">Submitted: {detailSubmittedAt || '—'}</span>
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Budget Configuration</div>
                  <div className="text-lg font-semibold text-white">{detailBudgetName}</div>
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
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-slate-300">Employee ID</th>
                        <th className="px-3 py-2 text-left text-slate-300">Full Name</th>
                        <th className="px-3 py-2 text-left text-slate-300">Department</th>
                        <th className="px-3 py-2 text-left text-slate-300">Position</th>
                        <th className="px-3 py-2 text-right text-slate-300">Amount</th>
                        <th className="px-3 py-2 text-left text-slate-300">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {filteredLineItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">
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
                              <td className="px-3 py-2 text-slate-300">{item.department || '—'}</td>
                              <td className="px-3 py-2 text-slate-300">{item.position || '—'}</td>
                              <td className={`px-3 py-2 text-right font-semibold ${amountValue < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                ₱{Math.abs(amountValue).toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {item.notes || item.item_description || (item.is_deduction ? 'Deduction' : '—')}
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
                <div className="text-sm font-semibold text-white">Approval Workflow Status</div>
                <div className="mt-3 space-y-3">
                  {[{ level: 1, label: 'Level 1 Approval' }, { level: 2, label: 'Level 2 Approval' }, { level: 3, label: 'Level 3 Approval' }, { level: 'P', label: 'Payroll Completion' }].map((entry) => {
                    const approver = requestConfigDetails?.approvers?.find((item) => String(item.approval_level) === String(entry.level) || (entry.level === 'P' && String(item.approval_level || '').toLowerCase().includes('payroll')));
                    const approval = requestDetailsData?.approvals?.find((item) => String(item.approval_level) === String(entry.level) || (entry.level === 'P' && String(item.approval_level || '').toLowerCase().includes('payroll')));
                    const status = approval?.status || 'pending';
                    return (
                      <div key={entry.label} className="rounded-lg border border-amber-500/40 bg-slate-900/40 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-white">{entry.label}</div>
                          <Badge className={getApprovalBadgeClass(status)}>{String(status).replace(/_/g, ' ')}</Badge>
                        </div>
                        <div className="mt-2 text-xs text-slate-400">Waiting for approval from:</div>
                        <div className="text-sm text-slate-200">
                          Main Approver: {approver?.approver_name || 'Not assigned'}
                        </div>
                        <div className="text-sm text-slate-200">
                          Backup Approver: {approver?.backup_approver_name || 'Not assigned'}
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
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={handleReject}
                  disabled={actionSubmitting}
                >
                  Reject
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
