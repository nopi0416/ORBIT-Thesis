import React, { useEffect, useMemo, useState } from 'react';
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
import { getApproversByLevel, getBudgetConfigurations, getOrganizations, getUserById } from '../services/budgetConfigService';

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
  usedAmount: config.budget_used || config.usedAmount || 0,
  clients: parseStoredList(config.client || config.clients),
  clientSponsored: config.client_sponsored ?? config.clientSponsored ?? config.is_client_sponsored ?? null,
  approvers: Array.isArray(config.approvers) ? config.approvers : [],
  affectedOUPaths: parseStoredPaths(config.affected_ou || config.affectedOUPaths),
});

const normalizeRequest = (request) => ({
  id: request.approval_request_id || request.id || request.request_id,
  description: request.description || request.request_description || '',
  amount: request.total_request_amount || request.amount || 0,
  status: request.status || 'draft',
  submittedAt: request.submitted_at || request.created_at || '',
  budgetName: request.budget_name || request.configName || 'Budget Configuration',
  requestNumber: request.request_number || request.requestNumber || null,
});

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
  const userRole = user?.role || 'requestor';
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey((prev) => prev + 1);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Approval Management"
        description="Submit, review, and track budget approval requests"
      />

      <div className="flex-1 p-6">
        <Tabs defaultValue="submit" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700 p-1">
            {(userRole === 'requestor' || userRole === 'l1' || userRole === 'payroll') && (
              <TabsTrigger
                value="submit"
                className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
              >
                Submit Approval
              </TabsTrigger>
            )}
            {(userRole === 'l1' || userRole === 'l2' || userRole === 'l3' || userRole === 'payroll') && (
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

          {(userRole === 'requestor' || userRole === 'l1' || userRole === 'payroll') && (
            <TabsContent value="submit">
              <SubmitApproval userId={user?.id} onRefresh={handleRefresh} refreshKey={refreshKey} />
            </TabsContent>
          )}

          {(userRole === 'l1' || userRole === 'l2' || userRole === 'l3' || userRole === 'payroll') && (
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
  const [bulkRewardType, setBulkRewardType] = useState('');
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const token = useMemo(() => getToken(), [refreshKey]);
  const companyId = 'caaa0000-0000-0000-0000-000000000001';

  useEffect(() => {
    const fetchConfigs = async () => {
      setConfigLoading(true);
      setConfigError(null);
      try {
        const data = await getBudgetConfigurations({}, token);
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
        setIndividualRequest((prev) => ({
          ...prev,
          employeeName: data.name || '',
          email: data.email || '',
          position: data.position || '',
          employeeStatus: data.employee_status || '',
          geo: data.geo || '',
          location: data.location || '',
          department: data.department || '',
          hireDate: data.hire_date || '',
          terminationDate: data.termination_date || '',
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
  }, [individualRequest.employeeId, companyId, token]);

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
    setBulkRewardType('');
    setSubmitError(null);
    setSubmitSuccess(null);
    setShowModal(true);
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

  const handleDownloadTemplate = async () => {
    if (!bulkRewardType) {
      setBulkParseError('Select a reward type before generating the template.');
      return;
    }
    const XLSXModule = await import('xlsx');
    const XLSX = XLSXModule.default || XLSXModule;
    const headers = [
      'Employee ID',
      'Position',
      'Amount',
      'Is Deduction',
      'Notes',
    ];

    const sampleRow = {
      'Employee ID': 'EMP001',
      Position: 'Team Lead',
      Amount: 2500,
      'Is Deduction': 'No',
      Notes: 'Sample entry',
    };

    const worksheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BulkTemplate');
    const metaSheet = XLSX.utils.json_to_sheet([{ reward_type: bulkRewardType }], { header: ['reward_type'] });
    XLSX.utils.book_append_sheet(workbook, metaSheet, '_meta');
    workbook.Workbook = workbook.Workbook || {};
    workbook.Workbook.Sheets = workbook.Workbook.Sheets || [];
    const metaIndex = workbook.SheetNames.indexOf('_meta');
    if (metaIndex >= 0) {
      workbook.Workbook.Sheets[metaIndex] = { Hidden: 1 };
    }
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
    const position = getValue(['position', 'Position']);
    const rewardType = getValue(['item_type', 'Reward Type', 'RewardType', 'Item Type']);
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
      position: String(position || '').trim(),
      item_type: String(rewardType || '').trim(),
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
      const metaSheet = workbook.Sheets['_meta'];
      if (metaSheet) {
        const metaRows = XLSX.utils.sheet_to_json(metaSheet, { defval: '' });
        const metaRewardType = metaRows?.[0]?.reward_type;
        if (metaRewardType) {
          setBulkRewardType(metaRewardType);
        }
      }
      const parsedItems = rows.map((row, index) => normalizeBulkRow(row, index));

      if (!parsedItems.length) {
        throw new Error('Template is empty. Add at least one line item.');
      }

      setBulkItems(parsedItems);
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
      (item) => !item.employee_id || !item.position || !item.amount
    );

    if (invalidItem) {
      setSubmitError('Ensure all bulk rows include Employee ID, Position, and Amount.');
      return;
    }

    const rewardTypeValue = bulkRewardType || bulkItems.find((item) => item.item_type)?.item_type;
    if (!rewardTypeValue) {
      setSubmitError('Reward type is missing. Select a reward type and generate a template.');
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
          line_items: bulkItems.map((item) => ({
            ...item,
            item_type: rewardTypeValue,
          })),
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

  return (
    <div className="grid gap-6 lg:grid-cols-[520px_1fr] items-stretch min-h-[calc(100vh-260px)]">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-600">
                  {myRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-700/30">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white w-full max-w-5xl p-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Submit Approval Request</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedConfig?.name}
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {submitError}
            </div>
          )}

          <div className="grid gap-4">
            <div className="border border-slate-600 rounded-lg p-4 bg-slate-900/50">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">Budget Configuration</p>
                  <p className="text-white font-semibold">{selectedConfig?.name}</p>
                  <p className="text-xs text-slate-400">{selectedConfig?.description || 'No description provided.'}</p>
                  <div className="text-sm text-slate-300">
                    <span className="text-slate-400">Total Budget:</span>{' '}
                    ₱{Number(selectedConfig?.usedAmount || 0).toLocaleString()} / ₱{Number(selectedConfig?.maxAmount || 0).toLocaleString()}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">Approval Hierarchy</p>
                  <div className="space-y-2">
                    {(selectedConfig?.approvers || []).map((approver) => (
                      <div key={approver.approver_id} className="text-sm text-slate-200">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-700 text-xs font-semibold text-white mr-2">
                          L{approver.approval_level}
                        </span>
                        <span className="font-medium">
                          {approver.approver_name || getApproverDisplayName(approver.primary_approver)}
                        </span>
                        {approver.backup_approver || approver.backup_approver_name ? (
                          <span className="block text-xs text-slate-400 ml-7">
                            Backup: {approver.backup_approver_name || getApproverDisplayName(approver.backup_approver)}
                          </span>
                        ) : null}
                      </div>
                    ))}
                    {!selectedConfig?.approvers?.length && (
                      <p className="text-xs text-slate-400">No approvers configured.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Tabs value={requestMode} onValueChange={setRequestMode} className="space-y-3">
              <TabsList className="bg-slate-700 border-slate-600 p-1">
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

              <TabsContent value="individual" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
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
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Email</Label>
                    <Input
                      value={individualRequest.email}
                      disabled
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Position</Label>
                    <Input
                      value={individualRequest.position}
                      disabled
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Employee Status</Label>
                    <Input
                      value={individualRequest.employeeStatus}
                      disabled
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Geo</Label>
                    <Input
                      value={individualRequest.geo}
                      disabled
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Location</Label>
                    <Input
                      value={individualRequest.location}
                      disabled
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Department</Label>
                    <Input
                      value={individualRequest.department}
                      disabled
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Hire Date</Label>
                    <Input
                      type="date"
                      value={individualRequest.hireDate || ''}
                      disabled
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Termination Date</Label>
                    <Input
                      type="date"
                      value={individualRequest.terminationDate || ''}
                      disabled
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Amount *</Label>
                    <Input
                      type="number"
                      value={individualRequest.amount}
                      onChange={(e) => setIndividualRequest((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="e.g., 2500"
                      className="bg-slate-700 border-gray-300 text-white"
                    />
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
              </TabsContent>

              <TabsContent value="bulk" className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-white">Reward Type *</Label>
                  <Select value={bulkRewardType} onValueChange={(value) => setBulkRewardType(value)}>
                    <SelectTrigger className="bg-slate-700 border-gray-300 text-white">
                      <SelectValue placeholder="Select reward type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-gray-300">
                      <SelectItem value="performance_bonus" className="text-white">Performance Bonus</SelectItem>
                      <SelectItem value="spot_award" className="text-white">Spot Award</SelectItem>
                      <SelectItem value="innovation_reward" className="text-white">Innovation Reward</SelectItem>
                      <SelectItem value="recognition" className="text-white">Recognition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Bulk Template Upload *</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDownloadTemplate}
                      disabled={!bulkRewardType}
                      className="border-slate-600 text-white hover:bg-slate-700"
                    >
                      Download Excel Template
                    </Button>
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleBulkFileChange}
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Select a reward type before generating the template. Required columns: Employee ID, Position, Amount.
                  </p>
                  {bulkRewardType && (
                    <p className="text-xs text-gray-300">Selected reward type: {bulkRewardType}</p>
                  )}
                  {bulkFileName && (
                    <p className="text-xs text-gray-300">Uploaded: {bulkFileName}</p>
                  )}
                  {bulkItems.length > 0 && (
                    <p className="text-xs text-green-300">Parsed {bulkItems.length} line item(s).</p>
                  )}
                  {bulkParseError && (
                    <p className="text-xs text-red-300">{bulkParseError}</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

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

          <DialogFooter className="flex justify-end gap-2">
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
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Proceed
              </Button>
            ) : (
              <Button
                onClick={handleSubmitBulk}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Proceed
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ApprovalRequests({ refreshKey }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApprovals = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await approvalRequestService.getPendingApprovals(getToken());
        setApprovals((data || []).map(normalizeRequest));
      } catch (error) {
        setError(error.message || 'Failed to load approvals');
        setApprovals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovals();
  }, [refreshKey]);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Pending Approval Requests</CardTitle>
        <CardDescription className="text-gray-400">
          Review approvals assigned to you
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-gray-400">Loading approvals...</div>
        ) : error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : approvals.length === 0 ? (
          <div className="text-sm text-gray-400">No pending approvals.</div>
        ) : (
          <div className="space-y-3">
            {approvals.map((approval) => (
              <div key={approval.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusBadgeClass(approval.status)}>
                        {approval.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-gray-400">{approval.id}</span>
                    </div>
                    <h4 className="text-white font-medium">{approval.title}</h4>
                    <p className="text-xs text-gray-300">{approval.budgetName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">₱{Number(approval.amount || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{approval.description || 'No summary provided.'}</p>
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
