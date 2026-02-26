import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { PageHeader } from "../components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { SearchableSelect } from "../components/ui/searchable-select";
import { MultiSelect } from "../components/ui/multi-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { resolveUserRole } from "../utils/roleUtils";
import { Search, Clock, CheckCircle2, XCircle, AlertCircle, Loader, Check } from "../components/icons";
import * as budgetConfigService from "../services/budgetConfigService";
import approvalRequestService from "../services/approvalRequestService";
import { connectWebSocket, addWebSocketListener } from "../services/realtimeService";
import { fetchWithCache, invalidateNamespace } from "../utils/dataCache";
import PaginationControls from "../components/PaginationControls";
const parseStoredList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [value];
};

const sanitizeTextInput = (value = "") =>
  String(value).replace(/[^A-Za-z0-9 _\-";:'\n\r.,]/g, "");

const getReadableErrorMessage = (error, fallback = 'Failed to save changes.') => {
  const raw = error?.message || error?.error || '';
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    if (Array.isArray(parsed)) return parsed.join(' ');
    if (parsed?.error) return typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
    if (parsed?.message) return parsed.message;
  } catch {
    // keep raw value
  }

  return String(raw);
};

const sanitizeSingleLine = (value = "") =>
  sanitizeTextInput(value).replace(/[\r\n]+/g, " ");

const blockShortcuts = (event) => {
  const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
  if (!hasModifier) return;

  const key = String(event.key || "").toLowerCase();
  const allowClipboard = (event.ctrlKey || event.metaKey) && (key === "v" || key === "c" || key === "x");
  const allowShiftInsert = event.shiftKey && key === "insert";

  if (allowClipboard || allowShiftInsert) return;

  event.preventDefault();
};

const currencyOptions = [{ value: "PHP", label: "PHP - Philippine Peso" }];

const getApprovalStatusInfo = (status) => {
  switch (status) {
    case "no_submission":
      return {
        label: "No Submission",
        icon: AlertCircle,
        variant: "secondary",
        color: "text-gray-400",
      };
    case "pending_l1":
      return { label: "Pending L1 Approval", icon: Clock, variant: "default", color: "text-yellow-500" };
    case "pending_l2":
      return { label: "Pending L2 Approval", icon: Clock, variant: "default", color: "text-yellow-500" };
    case "pending_l3":
      return { label: "Pending L3 Approval", icon: Clock, variant: "default", color: "text-yellow-500" };
    case "approved":
      return { label: "Approved", icon: CheckCircle2, variant: "default", color: "text-green-500" };
    case "rejected":
      return { label: "Rejected", icon: XCircle, variant: "destructive", color: "text-pink-500" };
    default:
      return { label: "Unknown", icon: AlertCircle, variant: "secondary", color: "text-gray-400" };
  }
};

const DATE_PRESET_OPTIONS = [
  { value: "all", label: "All" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_15_days", label: "Last 15 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
];

const TENURE_GROUP_ORDER = ["0-6months", "6-12months", "1-2years", "2-5years", "5plus-years"];

const formatTenureGroupLabel = (value) => {
  switch (value) {
    case "0-6months":
      return "0-6 Months";
    case "6-12months":
      return "6-12 Months";
    case "1-2years":
      return "1-2 Years";
    case "2-5years":
      return "2-5 Years";
    case "5plus-years":
      return "5+ Years";
    default:
      return String(value || "");
  }
};

const toDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const computeDateRange = (preset, customStart, customEnd) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (!preset || preset === "all") {
    return { from: null, to: today, error: null };
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (preset === "last_7_days" || preset === "last_15_days" || preset === "last_30_days") {
    const days = Number(String(preset).replace(/\D/g, ""));
    const from = new Date(startOfToday);
    from.setDate(from.getDate() - (days - 1));
    return { from, to: today, error: null };
  }

  if (preset === "custom") {
    if (!customStart || !customEnd) {
      return { from: null, to: null, error: "Start and end date are required for custom range." };
    }

    const from = toDateOnly(customStart);
    const toDate = toDateOnly(customEnd);
    if (!from || !toDate) {
      return { from: null, to: null, error: "Invalid custom date range." };
    }

    const normalizedTo = new Date(toDate);
    normalizedTo.setHours(23, 59, 59, 999);

    const now = new Date();
    if (from > now || normalizedTo > now) {
      return { from: null, to: null, error: "Dates cannot be greater than today." };
    }
    if (normalizedTo < from) {
      return { from: null, to: null, error: "End date cannot be less than start date." };
    }

    return { from, to: normalizedTo, error: null };
  }

  return { from: null, to: today, error: null };
};

const isWithinDateRange = (value, range) => {
  const date = toDateOnly(value);
  if (!date) return false;
  const timestamp = date.getTime();
  const fromTs = range?.from ? range.from.getTime() : null;
  const toTs = range?.to ? range.to.getTime() : null;

  if (fromTs !== null && timestamp < fromTs) return false;
  if (toTs !== null && timestamp > toTs) return false;
  return true;
};

const formatDateTimeCompact = (value) => {
  if (!value) return '';
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

export default function BudgetConfigurationPage() {
  const { user } = useAuth();
  const userRole = resolveUserRole(user);
  const [activeTab, setActiveTab] = useState("list");

  useEffect(() => {
    const handleSwitchToList = () => setActiveTab("list");
    window.addEventListener('switchToConfigList', handleSwitchToList);
    return () => window.removeEventListener('switchToConfigList', handleSwitchToList);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Budget Configuration"
        description="Manage budget configurations and access controls"
      />

      <div className="flex-1 p-6 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className={`flex flex-col h-full ${activeTab === "create" ? "gap-3" : "gap-6"}`}>
          <TabsList className="bg-slate-800 border-slate-700 p-1 w-max flex-shrink-0">
            <TabsTrigger
              value="list"
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
            >
              Configuration List
            </TabsTrigger>
            {!['l2', 'l3'].includes(String(userRole || '').toLowerCase()) && (
              <TabsTrigger
                value="create"
                className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
              >
                Create Configuration
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="list" className="flex-1 min-h-0 overflow-hidden">
            {activeTab === "list" && <ConfigurationList userRole={userRole} />}
          </TabsContent>

          <TabsContent value="create" className="flex-1 min-h-0 overflow-y-auto">
            {activeTab === "create" && !['l2', 'l3'].includes(String(userRole || '').toLowerCase()) && (
              <CreateConfiguration />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ConfigurationList({ userRole }) {
  const { user } = useAuth();
  const toast = useToast();
  const PAGE_SIZE_OPTIONS = [10, 15, 20];
  const STATUS_FILTER_OPTIONS = ["active", "expired", "deactivated", "all"];
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGeo, setFilterGeo] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [serverPagination, setServerPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [detailsTab, setDetailsTab] = useState("edit");
  const [editConfig, setEditConfig] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [approvalsL1, setApprovalsL1] = useState([]);
  const [approvalsL2, setApprovalsL2] = useState([]);
  const [approvalsL3, setApprovalsL3] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [userNameMap, setUserNameMap] = useState(new Map());
  const [configApprovalHistory, setConfigApprovalHistory] = useState([]);
  const [configLogs, setConfigLogs] = useState([]);
  const [historyLogsLoading, setHistoryLogsLoading] = useState(false);
  const [listDatePreset, setListDatePreset] = useState("all");
  const [listStartDate, setListStartDate] = useState("");
  const [listEndDate, setListEndDate] = useState("");
  const [modalDatePreset, setModalDatePreset] = useState("all");
  const [modalStartDate, setModalStartDate] = useState("");
  const [modalEndDate, setModalEndDate] = useState("");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState("configurations");
  const [exportLoading, setExportLoading] = useState(false);
  const [editSuccessModalOpen, setEditSuccessModalOpen] = useState(false);
  const [editSuccessCountdown, setEditSuccessCountdown] = useState(5);
  const [statusCounts, setStatusCounts] = useState({ active: 0, expired: 0, deactivated: 0, all: 0 });
  const lastConfigFetchRef = useRef(0);

  const token = user?.token || localStorage.getItem("authToken") || "";
  const normalizedUserRole = String(userRole || '').toLowerCase();
  const shouldRestrictByDepartmentScope = ['requestor', 'l1'].includes(normalizedUserRole);

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

  const canUserViewByDepartmentScope = (config) => {
    if (!shouldRestrictByDepartmentScope) return true;
    if (!config) return false;
    if (String(config.createdById || '') === String(user?.id || '')) return true;

    const userDepartmentId = String(user?.department_id || user?.departmentId || '').trim();
    const userDepartmentName = normalizeScopeText(user?.department || user?.department_name || user?.departmentName || '');
    if (!userDepartmentId && !userDepartmentName) return true;

    const rawScopeValues = [
      ...flattenScopeEntries(config.accessOUPaths),
      ...flattenScopeEntries(config.department),
      ...flattenScopeEntries(config.departmentId),
    ];

    if (!rawScopeValues.length) return true;

    return rawScopeValues.some((value) => {
      const raw = String(value || '').trim();
      if (!raw) return false;
      if (userDepartmentId && raw === userDepartmentId) return true;
      if (userDepartmentName && normalizeScopeText(raw) === userDepartmentName) return true;
      return false;
    });
  };

  const getApproverName = (approverId, approversList) => {
    if (!approverId) return null;
    if (!Array.isArray(approversList) || approversList.length === 0) return null;
    const approver = approversList.find(a => a.user_id === approverId);
    if (!approver) return null;
    const fullName = `${approver.first_name || ''} ${approver.last_name || ''}`.trim();
    return fullName || null;
  };

  const transformConfig = useCallback((config) => {
    const startDate = config.start_date || config.startDate || null;
    const endDate = config.end_date || config.endDate || null;
    const dateRangeLabel = startDate && endDate ? `${startDate} → ${endDate}` : "Not specified";

    // Extract approver IDs and names from the approvers array (from tblbudgetconfig_approvers)
    const approversArray = config.approvers || [];
    const l1Approver = approversArray.find(a => a.approval_level === 1);
    const l2Approver = approversArray.find(a => a.approval_level === 2);
    const l3Approver = approversArray.find(a => a.approval_level === 3);

    const approverL1Id = l1Approver?.primary_approver || "";
    const backupApproverL1Id = l1Approver?.backup_approver || "";
    const approverL2Id = l2Approver?.primary_approver || "";
    const backupApproverL2Id = l2Approver?.backup_approver || "";
    const approverL3Id = l3Approver?.primary_approver || "";
    const backupApproverL3Id = l3Approver?.backup_approver || "";

    // Use names from backend (already enriched with user data)
    const approverL1Name = l1Approver?.approver_name || null;
    const backupApproverL1Name = l1Approver?.backup_approver_name || null;
    const approverL2Name = l2Approver?.approver_name || null;
    const backupApproverL2Name = l2Approver?.backup_approver_name || null;
    const approverL3Name = l3Approver?.approver_name || null;
    const backupApproverL3Name = l3Approver?.backup_approver_name || null;

    const resolvedCreatedById = config.created_by || config.createdBy || null;
    const resolvedCreatedByName =
      config.created_by_name ||
      config.createdByName ||
      (resolvedCreatedById ? userNameMap.get(resolvedCreatedById) : null) ||
      resolvedCreatedById ||
      "—";

    return {
      id: config.budget_id || config.id,
      createdAt: config.created_at || config.createdAt || null,
      name: config.budget_name || config.name || "Unnamed Configuration",
      description: config.description || config.budget_description || "No description provided",
      status: config.status || config.configuration_status || "active",
      createdById: resolvedCreatedById,
      createdByName: resolvedCreatedByName,
      startDate,
      endDate,
      dateRangeLabel,
      limitMin: config.min_limit || config.limitMin || 0,
      limitMax: config.max_limit || config.limitMax || 0,
      budgetControlEnabled: config.budget_control || config.budgetControlEnabled || false,
      budgetLimit: config.budget_limit || config.budgetLimit || config.budget_control_limit || config.budgetControlLimit || 0,
      payCycle: config.pay_cycle || config.payCycle || "—",
      currency: config.currency || config.currency_code || config.currencyCode || "—",
      approvedAmount: config.approved_amount ?? config.approvedAmount ?? 0,
      clientSponsoredAmount:
        config.client_sponsored_amount ??
        config.clientSponsoredAmount ??
        config.client_sponsored_budget ??
        config.clientSponsoredBudget ??
        0,
      ongoingAmount: config.ongoing_amount ?? config.ongoingAmount ?? 0,
      hasApprovalActivity:
        config.has_approval_activity ?? config.hasApprovalActivity ?? false,
      geo: parseStoredList(config.geo || config.countries),
      location: parseStoredList(config.location || config.siteLocation),
      clients: parseStoredList(config.client || config.clients),
      accessOUPaths: parseStoredList(config.access_ou || config.accessOUPaths),
      department: config.department || config.budget_department || null,
      departmentId: config.department_id || config.departmentId || null,
      selectedTenureGroups: parseStoredList(config.tenure_group || config.selectedTenureGroups || config.tenureGroup),
      history: config.history || config.history_entries || config.historyEntries || [],
      logs: config.logs || config.logEntries || config.configuration_logs || config.log_entries || [],
      approvers: approversArray,
      approverL1: approverL1Id,
      backupApproverL1: backupApproverL1Id,
      approverL2: approverL2Id,
      backupApproverL2: backupApproverL2Id,
      approverL3: approverL3Id,
      backupApproverL3: backupApproverL3Id,
      approverL1Name,
      backupApproverL1Name,
      approverL2Name,
      backupApproverL2Name,
      approverL3Name,
      backupApproverL3Name,
      approvalStatus: config.approvalStatus || "no_submission",
    };
  }, [userNameMap]);

  const resolveApproverId = (value, approvers = []) => {
    if (!value) return "";
    const exactMatch = approvers.find((approver) => approver.user_id === value);
    if (exactMatch) return value;
    const normalized = String(value).trim().toLowerCase();
    const nameMatch = approvers.find((approver) =>
      `${approver.first_name || ""} ${approver.last_name || ""}`.trim().toLowerCase() === normalized
    );
    return nameMatch ? nameMatch.user_id : value;
  };

  const fetchConfigurations = useCallback(async (forceRefresh = false, showLoader = true) => {
    if (!user) return;
    if (showLoader) setLoading(true);
    try {
      const token = user?.token || localStorage.getItem("authToken") || "";
      if (forceRefresh) {
        invalidateNamespace('budgetConfigs');
      }
      const data = await fetchWithCache(
        'budgetConfigs',
        `org_${user?.org_id || 'all'}_${currentPage}_${rowsPerPage}_${statusFilter}_${searchQuery}_${filterGeo}_${filterLocation}_${filterClient}`,
        () => budgetConfigService.getBudgetConfigurations({
          org_id: user?.org_id,
          page: currentPage,
          limit: rowsPerPage,
          status: statusFilter,
          search: searchQuery,
          geo: filterGeo !== 'all' ? filterGeo : undefined,
          location: filterLocation !== 'all' ? filterLocation : undefined,
          client: filterClient !== 'all' ? filterClient : undefined,
        }, token),
        5 * 60 * 1000 // 5 minutes TTL
      );
      const items = Array.isArray(data) ? data : (data?.items || []);
      const pagination = data?.pagination || {
        page: currentPage,
        limit: rowsPerPage,
        totalItems: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / rowsPerPage)),
        hasPrev: currentPage > 1,
        hasNext: false,
      };

      const transformedItems = (items || []).map(transformConfig);
      setConfigurations(transformedItems.filter(canUserViewByDepartmentScope));
      setServerPagination(pagination);
      lastConfigFetchRef.current = Date.now();
    } catch (err) {
      console.error("Error fetching configurations:", err);
      toast.error(err.message || "Failed to load configurations");
      setConfigurations([]);
      setServerPagination((prev) => ({
        ...prev,
        page: 1,
        totalItems: 0,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      }));
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [
    user,
    transformConfig,
    currentPage,
    rowsPerPage,
    statusFilter,
    searchQuery,
    filterGeo,
    filterLocation,
    filterClient,
  ]);

  useEffect(() => {
    // Initial fetch
    fetchConfigurations(false, true);
    
    // Auto-refresh when tab/window regains focus to update ongoing amounts
    const handleVisibility = () => {
      const now = Date.now();
      const isStale = now - (lastConfigFetchRef.current || 0) > 60 * 1000;
      if (document.visibilityState === 'visible' && isStale) {
        fetchConfigurations(true, false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchConfigurations]);

  useEffect(() => {
    if (!user) {
      setStatusCounts({ active: 0, expired: 0, deactivated: 0, all: 0 });
      return;
    }

    let isActive = true;

    const fetchStatusCounts = async () => {
      try {
        const token = user?.token || localStorage.getItem("authToken") || "";

        const countResults = await Promise.all(
          STATUS_FILTER_OPTIONS.map(async (status) => {
            const response = await budgetConfigService.getBudgetConfigurations(
              {
                org_id: user?.org_id,
                page: 1,
                limit: 1,
                status,
                search: searchQuery,
                geo: filterGeo !== 'all' ? filterGeo : undefined,
                location: filterLocation !== 'all' ? filterLocation : undefined,
                client: filterClient !== 'all' ? filterClient : undefined,
              },
              token
            );

            const total = Number(response?.pagination?.totalItems);
            const items = Array.isArray(response) ? response : (response?.items || []);
            return [status, Number.isFinite(total) ? total : items.length];
          })
        );

        if (!isActive) return;
        setStatusCounts(Object.fromEntries(countResults));
      } catch (error) {
        if (!isActive) return;
        console.error('Error fetching status counts:', error);
      }
    };

    fetchStatusCounts();

    return () => {
      isActive = false;
    };
  }, [user, searchQuery, filterGeo, filterLocation, filterClient]);

  useEffect(() => {
    const totalItems = Number(serverPagination?.totalItems);
    if (!Number.isFinite(totalItems)) return;

    setStatusCounts((prev) => ({
      ...prev,
      [statusFilter]: totalItems,
    }));
  }, [serverPagination?.totalItems, statusFilter]);

  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        setApprovalsLoading(true);
        const [l1Data, l2Data, l3Data] = await Promise.all([
          budgetConfigService.getApproversByLevel("L1", token),
          budgetConfigService.getApproversByLevel("L2", token),
          budgetConfigService.getApproversByLevel("L3", token),
        ]);
        setApprovalsL1(l1Data || []);
        setApprovalsL2(l2Data || []);
        setApprovalsL3(l3Data || []);
      } catch (err) {
        console.error("Error fetching approvers:", err);
        setApprovalsL1([]);
        setApprovalsL2([]);
        setApprovalsL3([]);
      } finally {
        setApprovalsLoading(false);
      }
    };

    fetchApprovers();
  }, [token]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await fetchWithCache(
          'budgetUsers',
          'all',
          () => budgetConfigService.getUsersList(token),
          10 * 60 * 1000
        );
        const map = new Map(
          (data || []).map((userRow) => [
            userRow.user_id,
            `${userRow.first_name || ''} ${userRow.last_name || ''}`.trim(),
          ])
        );
        setUserNameMap(map);
      } catch (err) {
        console.error('Error fetching users list:', err);
        setUserNameMap(new Map());
      }
    };

    fetchUsers();
  }, [token]);

  // Re-transform configurations when approver data loads to populate names
  useEffect(() => {
    if (approvalsLoading) return;
    if (configurations.length === 0) return;

    setConfigurations(prev => {
      const rawConfigs = prev.map(config => ({
        // Get raw config data (revert to original structure for re-transform)
        budget_id: config.id,
        budget_name: config.name,
        description: config.description,
        created_by: config.createdById,
        created_by_name: config.createdByName,
        start_date: config.startDate,
        end_date: config.endDate,
        min_limit: config.limitMin,
        max_limit: config.limitMax,
        budget_control: config.budgetControlEnabled,
        budget_limit: config.budgetLimit,
        pay_cycle: config.payCycle,
        currency: config.currency,
        approved_amount: config.approvedAmount,
        ongoing_amount: config.ongoingAmount,
        client_sponsored_amount: config.clientSponsoredAmount,
        has_approval_activity: config.hasApprovalActivity,
        geo: config.geo,
        location: config.location,
        client: config.clients,
        approvers: config.approvers, // Preserve the approvers array from backend
        status: config.status,
      }));
      return rawConfigs.map(transformConfig);
    });
  }, [approvalsLoading, transformConfig]);

  useEffect(() => {
    connectWebSocket();
    const unsubscribe = addWebSocketListener(async (message) => {
      if (message?.event === "approval_request_updated") {
        const action = String(message?.payload?.action || '').toLowerCase();
        if (["submitted", "approved", "rejected", "payment_completed", "completed", "deleted"].includes(action)) {
          fetchConfigurations(true, false);
        }
        return;
      }

      if (message?.event !== "budget_config_updated") return;
      const payload = message?.payload || {};
      const budgetId = payload.budget_id;

      if (payload.action === "deleted" && budgetId) {
        setConfigurations((prev) => prev.filter((config) => config.id !== budgetId));
        if (selectedConfig?.id === budgetId) {
          setSelectedConfig(null);
          setDetailsOpen(false);
        }
        return;
      }

      if (!budgetId) return;
      try {
        const updated = await budgetConfigService.getBudgetConfigurationById(budgetId, token);
        if (!updated) return;
        const normalized = transformConfig(updated);
        setConfigurations((prev) => {
          const exists = prev.some((config) => config.id === normalized.id);
          if (!exists) return [normalized, ...prev];
          return prev.map((config) => (config.id === normalized.id ? normalized : config));
        });

        if (selectedConfig?.id === normalized.id) {
          setSelectedConfig((prev) => ({ ...prev, ...normalized }));
        }
      } catch (err) {
        console.error("Realtime config update failed:", err);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [token, selectedConfig?.id, fetchConfigurations]);

  useEffect(() => {
    if (!detailsOpen || !selectedConfig?.id) return;
    let isActive = true;

    const fetchConfigDetails = async () => {
      try {
        const data = await budgetConfigService.getBudgetConfigurationById(selectedConfig.id, token);
        if (!isActive || !data) return;
        const normalized = transformConfig(data);
        setSelectedConfig((prev) => (prev && prev.id === normalized.id ? { ...prev, ...normalized } : prev));
      } catch (err) {
        console.error('Failed to refresh configuration details:', err);
      }
    };

    fetchConfigDetails();

    return () => {
      isActive = false;
    };
  }, [detailsOpen, selectedConfig?.id, token, transformConfig]);

  useEffect(() => {
    if (!detailsOpen || !selectedConfig?.id) {
      setConfigApprovalHistory([]);
      setConfigLogs([]);
      return;
    }

    let active = true;
    const loadHistoryAndLogs = async () => {
      setHistoryLogsLoading(true);
      try {
        const [approvalRows, logRows] = await Promise.all([
          approvalRequestService.getApprovalRequests({ budget_id: selectedConfig.id }, token),
          budgetConfigService.getBudgetConfigLogs(selectedConfig.id, token).catch(() => []),
        ]);

        if (!active) return;
        setConfigApprovalHistory(Array.isArray(approvalRows) ? approvalRows : []);
        setConfigLogs(Array.isArray(logRows) ? logRows : (selectedConfig?.logs || []));
      } catch (error) {
        if (!active) return;
        console.error("Failed to load configuration history/logs:", error);
        setConfigApprovalHistory([]);
        setConfigLogs(Array.isArray(selectedConfig?.logs) ? selectedConfig.logs : []);
      } finally {
        if (active) setHistoryLogsLoading(false);
      }
    };

    loadHistoryAndLogs();

    return () => {
      active = false;
    };
  }, [detailsOpen, selectedConfig?.id, token]);

  useEffect(() => {
    if (!detailsOpen) {
      setDetailsTab("edit");
      setModalDatePreset("all");
      setModalStartDate("");
      setModalEndDate("");
    }
  }, [detailsOpen]);

  useEffect(() => {
    if (!selectedConfig) {
      setEditConfig(null);
      return;
    }

    // Extract approver ID from various possible formats
    const extractApproverId = (value) => {
      if (!value) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value.user_id) return value.user_id;
      if (typeof value === 'object' && value.id) return value.id;
      return '';
    };

    setEditConfig({
      id: selectedConfig.id,
      name: selectedConfig.name || "",
      description: selectedConfig.description || "",
      status: selectedConfig.status || "active",
      createdById: selectedConfig.createdById || null,
      createdByName: selectedConfig.createdByName || "—",
      startDate: selectedConfig.startDate || "",
      endDate: selectedConfig.endDate || "",
      limitMin: selectedConfig.limitMin || "",
      limitMax: selectedConfig.limitMax || "",
      currency: "PHP",
      payCycle: "SEMI_MONTHLY",
      budgetControlEnabled: Boolean(selectedConfig.budgetControlEnabled),
      budgetControlLimit: selectedConfig.budgetLimit || "",
      selectedTenureGroups: Array.isArray(selectedConfig.selectedTenureGroups)
        ? selectedConfig.selectedTenureGroups
        : [],
      approverL1: extractApproverId(selectedConfig.approverL1),
      backupApproverL1: extractApproverId(selectedConfig.backupApproverL1),
      approverL2: extractApproverId(selectedConfig.approverL2),
      backupApproverL2: extractApproverId(selectedConfig.backupApproverL2),
      approverL3: extractApproverId(selectedConfig.approverL3),
      backupApproverL3: extractApproverId(selectedConfig.backupApproverL3),
    });
  }, [selectedConfig]);

  useEffect(() => {
    if (!editConfig) return;
    setEditConfig((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      const resolvedL1 = resolveApproverId(prev.approverL1, approvalsL1);
      const resolvedBackupL1 = resolveApproverId(prev.backupApproverL1, approvalsL1);
      const resolvedL2 = resolveApproverId(prev.approverL2, approvalsL2);
      const resolvedBackupL2 = resolveApproverId(prev.backupApproverL2, approvalsL2);
      const resolvedL3 = resolveApproverId(prev.approverL3, approvalsL3);
      const resolvedBackupL3 = resolveApproverId(prev.backupApproverL3, approvalsL3);

      let changed = false;
      if (resolvedL1 !== prev.approverL1) {
        next.approverL1 = resolvedL1;
        changed = true;
      }
      if (resolvedBackupL1 !== prev.backupApproverL1) {
        next.backupApproverL1 = resolvedBackupL1;
        changed = true;
      }
      if (resolvedL2 !== prev.approverL2) {
        next.approverL2 = resolvedL2;
        changed = true;
      }
      if (resolvedBackupL2 !== prev.backupApproverL2) {
        next.backupApproverL2 = resolvedBackupL2;
        changed = true;
      }
      if (resolvedL3 !== prev.approverL3) {
        next.approverL3 = resolvedL3;
        changed = true;
      }
      if (resolvedBackupL3 !== prev.backupApproverL3) {
        next.backupApproverL3 = resolvedBackupL3;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [approvalsL1, approvalsL2, approvalsL3]);

  const renderApproverSummary = (config) => {
    if (config.approvers?.length) {
      return config.approvers.map((approver) => {
        const primary = approver.approver_name || approver.primary_approver || "—";
        const backup = approver.backup_approver_name || approver.backup_approver || "—";
        return `L${approver.approval_level}: ${primary}${backup && backup !== "—" ? ` (Backup: ${backup})` : ""}`;
      });
    }

    const lines = [];
    if (config.approverL1 || config.backupApproverL1) {
      lines.push(`L1: ${config.approverL1 || "—"}${config.backupApproverL1 ? ` (Backup: ${config.backupApproverL1})` : ""}`);
    }
    if (config.approverL2 || config.backupApproverL2) {
      lines.push(`L2: ${config.approverL2 || "—"}${config.backupApproverL2 ? ` (Backup: ${config.backupApproverL2})` : ""}`);
    }
    if (config.approverL3 || config.backupApproverL3) {
      lines.push(`L3: ${config.approverL3 || "—"}${config.backupApproverL3 ? ` (Backup: ${config.backupApproverL3})` : ""}`);
    }
    return lines.length ? lines : ["—"];
  };

  const handleEditChange = (field, value) => {
    const textFields = new Set(["name", "description"]);
    const nextValue = textFields.has(field) ? sanitizeSingleLine(value) : value;
    setEditConfig((prev) => (prev ? { ...prev, [field]: nextValue } : prev));
  };

  const handleSaveEdit = async () => {
    if (!editConfig?.id) return;
    const isOwner = String(editConfig.createdById || '') && String(editConfig.createdById) === String(user?.id || '');
    if (!isOwner) {
      toast.error('Only the configuration creator can modify this configuration.');
      return;
    }

    const name = sanitizeSingleLine(String(editConfig.name || '')).trim();
    const description = sanitizeSingleLine(String(editConfig.description || '')).trim();
    const minLimit = Number(editConfig.limitMin);
    const maxLimit = Number(editConfig.limitMax);
    const budgetLimit = editConfig.budgetControlEnabled ? Number(editConfig.budgetControlLimit) : null;

    if (!name) {
      toast.error('Budget name is required.');
      return;
    }
    if (!Number.isFinite(minLimit) || minLimit < 0) {
      toast.error('Min limit must be a valid non-negative number.');
      return;
    }
    if (!Number.isFinite(maxLimit) || maxLimit < 0) {
      toast.error('Max limit must be a valid non-negative number.');
      return;
    }
    if (minLimit > maxLimit) {
      toast.error('Min limit cannot be greater than max limit.');
      return;
    }
    if (editConfig.budgetControlEnabled && (!Number.isFinite(budgetLimit) || budgetLimit <= 0)) {
      toast.error('Budget limit must be greater than 0 when budget control is enabled.');
      return;
    }
    if (editConfig.startDate && editConfig.endDate && new Date(editConfig.endDate) < new Date(editConfig.startDate)) {
      toast.error('End date cannot be earlier than start date.');
      return;
    }
    if (editConfig.approverL1 && editConfig.approverL1 === editConfig.backupApproverL1) {
      toast.error('L1 primary and backup approvers cannot be the same.');
      return;
    }
    if (editConfig.approverL2 && editConfig.approverL2 === editConfig.backupApproverL2) {
      toast.error('L2 primary and backup approvers cannot be the same.');
      return;
    }
    if (editConfig.approverL3 && editConfig.approverL3 === editConfig.backupApproverL3) {
      toast.error('L3 primary and backup approvers cannot be the same.');
      return;
    }
    if (!Array.isArray(editConfig.selectedTenureGroups) || editConfig.selectedTenureGroups.length === 0) {
      toast.error('At least one tenure group is required.');
      return;
    }

    if (!hasEditChanges) {
      toast.error('No changes to save.');
      return;
    }

    setEditSaving(true);

    try {
      const payload = {
        budget_name: name,
        budget_description: description,
        start_date: editConfig.startDate || null,
        end_date: editConfig.endDate || null,
        min_limit: minLimit,
        max_limit: maxLimit,
        currency: 'PHP',
        pay_cycle: 'SEMI_MONTHLY',
        budget_control: Boolean(editConfig.budgetControlEnabled),
        budget_limit: editConfig.budgetControlEnabled ? budgetLimit : null,
        tenure_group: editConfig.selectedTenureGroups || [],
        status: editConfig.status || 'active',
      };

      await budgetConfigService.updateBudgetConfiguration(editConfig.id, payload, token);

      const levelChanges = [
        {
          level: 1,
          currentPrimary: String(editConfig.approverL1 || ''),
          currentBackup: String(editConfig.backupApproverL1 || ''),
          prevPrimary: String(getApproverIdValue(selectedConfig?.approverL1) || ''),
          prevBackup: String(getApproverIdValue(selectedConfig?.backupApproverL1) || ''),
        },
        {
          level: 2,
          currentPrimary: String(editConfig.approverL2 || ''),
          currentBackup: String(editConfig.backupApproverL2 || ''),
          prevPrimary: String(getApproverIdValue(selectedConfig?.approverL2) || ''),
          prevBackup: String(getApproverIdValue(selectedConfig?.backupApproverL2) || ''),
        },
        {
          level: 3,
          currentPrimary: String(editConfig.approverL3 || ''),
          currentBackup: String(editConfig.backupApproverL3 || ''),
          prevPrimary: String(getApproverIdValue(selectedConfig?.approverL3) || ''),
          prevBackup: String(getApproverIdValue(selectedConfig?.backupApproverL3) || ''),
        },
      ].filter((entry) => entry.currentPrimary !== entry.prevPrimary || entry.currentBackup !== entry.prevBackup);

      for (const change of levelChanges) {
        if (!change.currentPrimary) {
          throw new Error(`Primary approver for L${change.level} is required.`);
        }
        await budgetConfigService.setApprover(
          editConfig.id,
          {
            approval_level: change.level,
            primary_approver: change.currentPrimary,
            backup_approver: change.currentBackup || null,
          },
          token
        );
      }

      const refreshed = await budgetConfigService.getBudgetConfigurationById(editConfig.id, token);
      const normalizedUpdatedConfig = refreshed ? transformConfig(refreshed) : null;

      setConfigurations((prev) =>
        prev.map((config) =>
          config.id === editConfig.id
            ? (normalizedUpdatedConfig || config)
            : config
        )
      );

      if (normalizedUpdatedConfig) {
        setSelectedConfig(normalizedUpdatedConfig);
      } else {
        setSelectedConfig((prev) => (prev ? { ...prev, ...editConfig } : prev));
      }

      setDetailsOpen(false);
      setEditSuccessCountdown(5);
      setEditSuccessModalOpen(true);
      toast.success('Configuration updated successfully.');
    } catch (err) {
      toast.error(getReadableErrorMessage(err, 'Failed to update configuration.'));
    } finally {
      setEditSaving(false);
    }
  };

  const geoOptions = useMemo(() => {
    const values = new Set();
    configurations.forEach((config) => config.geo.forEach((geo) => values.add(geo)));
    return Array.from(values).sort();
  }, [configurations]);

  const locationOptions = useMemo(() => {
    const values = new Set();
    configurations.forEach((config) => config.location.forEach((loc) => values.add(loc)));
    return Array.from(values).sort();
  }, [configurations]);

  const clientOptions = useMemo(() => {
    const values = new Set();
    configurations.forEach((config) => config.clients.forEach((client) => values.add(client)));
    return Array.from(values).sort();
  }, [configurations]);

  const filteredConfigurations = configurations.filter((config) => {
    const listRange = computeDateRange(listDatePreset, listStartDate, listEndDate);
    const dateSource = config.createdAt || config.startDate || config.endDate;
    const matchesDate = listRange.error ? true : isWithinDateRange(dateSource, listRange);
    return matchesDate;
  });

  const prioritizedConfigurations = useMemo(() => {
    const currentUserId = String(user?.id || '');
    return [...filteredConfigurations].sort((a, b) => {
      const aMine = currentUserId && String(a.createdById || '') === currentUserId;
      const bMine = currentUserId && String(b.createdById || '') === currentUserId;
      if (aMine !== bMine) return aMine ? -1 : 1;

      const aTime = new Date(a.createdAt || a.startDate || 0).getTime();
      const bTime = new Date(b.createdAt || b.startDate || 0).getTime();
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
  }, [filteredConfigurations, user?.id]);

  const totalPages = Math.max(1, Number(serverPagination?.totalPages || 1));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedConfigurations = prioritizedConfigurations;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterGeo, filterLocation, filterClient, statusFilter, listDatePreset, listStartDate, listEndDate, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const historyItems = configApprovalHistory || [];
  const logItems = configLogs || selectedConfig?.logs || selectedConfig?.logEntries || [];
  const isOwner = editConfig && String(editConfig.createdById || '') === String(user?.id || '');
  const canViewLogs = String((selectedConfig?.createdById || editConfig?.createdById) || '') === String(user?.id || '') || ['payroll', 'admin', 'super_admin'].includes(userRole);
  const isModalConfigCreator =
    String((selectedConfig?.createdById || editConfig?.createdById || '')).trim() !== '' &&
    String(selectedConfig?.createdById || editConfig?.createdById || '') === String(user?.id || '');
  const canExportHistoryAndLogs = isModalConfigCreator;
  const normalizedStatus = String(editConfig?.status || 'active').toLowerCase();
  const isExpired = normalizedStatus === 'expired';
  const hasApprovalActivity = Boolean(editConfig?.hasApprovalActivity || editConfig?.has_approval_activity);

  const listRange = computeDateRange(listDatePreset, listStartDate, listEndDate);
  const modalRange = computeDateRange(modalDatePreset, modalStartDate, modalEndDate);
  const isConfigExportDisabled =
    listDatePreset === 'custom' && (!listStartDate || !listEndDate || Boolean(listRange.error));

  const filteredHistoryItems = (historyItems || []).filter((item) => {
    if (!item) return false;
    if (modalRange.error) return true;
    const dateSource = item.submitted_at || item.created_at || item.updated_at;
    return isWithinDateRange(dateSource, modalRange);
  });

  const filteredLogItems = (logItems || []).filter((item) => {
    const normalizedItem = typeof item === 'string' ? { description: item } : (item || {});
    if (modalRange.error) return true;
    const dateSource = normalizedItem?.created_at || normalizedItem?.timestamp || normalizedItem?.date || normalizedItem?.createdAt;
    return isWithinDateRange(dateSource, modalRange);
  });

  const normalizeLogItem = (item) => {
    if (!item) return {};
    if (typeof item === 'string') return { description: item };
    return item;
  };

  const getLogValue = (item, fields, fallback = '') => {
    const entry = normalizeLogItem(item);
    for (const field of fields) {
      const value = entry?.[field];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }
    return fallback;
  };

  const sanitizeLogAction = (value) => {
    const clean = sanitizeSingleLine(String(value || ''))
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return clean.slice(0, 80);
  };

  const mapHistoryStatus = (item = {}) => {
    const raw = String(
      item.approval_stage_status ||
      item.display_status ||
      item.overall_status ||
      item.status ||
      'ongoing_approval'
    ).toLowerCase();

    if (raw.includes('reject')) return 'Rejected';
    if (['approved', 'completed', 'pending_payment_completion'].includes(raw)) return 'Approved';
    return 'Ongoing Approval';
  };

  const historyAmounts = (item = {}) => {
    const lineItems = Array.isArray(item.line_items)
      ? item.line_items
      : Array.isArray(item.lineItems)
        ? item.lineItems
        : [];

    const explicitDeduction = Number(item.deduction_amount ?? item.deductionAmount);
    const explicitTotal = Number(item.total_request_amount ?? item.amount ?? 0);

    const computedDeduction = lineItems
      .filter((line) => {
        const flag = line?.is_deduction ?? line?.isDeduction ?? line?.deduction;
        if (typeof flag === 'string') {
          return ['true', '1', 'yes', 'y'].includes(flag.trim().toLowerCase());
        }
        return Boolean(flag);
      })
      .reduce((sum, line) => sum + Number(line?.amount || line?.item_amount || 0), 0);

    const total = Number.isFinite(explicitTotal) ? explicitTotal : 0;
    const deduction = Number.isFinite(explicitDeduction) ? explicitDeduction : computedDeduction;
    const payment = Number(item.net_to_pay ?? item.netPay ?? (total - deduction));

    return {
      total,
      deduction: Number.isFinite(deduction) ? deduction : 0,
      payment: Number.isFinite(payment) ? payment : (total - (Number.isFinite(deduction) ? deduction : 0)),
    };
  };

  const emptyValue = (value) => {
    if (value === null || value === undefined) return '';
    const text = String(value).trim();
    if (!text || text === '—' || text === '-') return '';
    return text;
  };

  const openExportModal = (target) => {
    setExportTarget(target);
    setExportModalOpen(true);
  };

  const escapeCsv = (value) => {
    const text = emptyValue(value);
    if (!text) return '';
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const buildExportRows = (target) => {
    if (target === 'configurations') {
      return filteredConfigurations.map((item) => ({
        budget_name: emptyValue(item.name),
        status: emptyValue(item.status),
        created_by: emptyValue(item.createdByName),
        created_at: emptyValue(item.createdAt),
        start_date: emptyValue(item.startDate),
        end_date: emptyValue(item.endDate),
        min_limit: item.limitMin ?? '',
        max_limit: item.limitMax ?? '',
        approved_amount: Number(item.approvedAmount || 0),
        ongoing_amount: Number(item.ongoingAmount || 0),
      }));
    }

    if (target === 'history') {
      return filteredHistoryItems.map((item) => ({
        request_number: emptyValue(item.request_number),
        status: mapHistoryStatus(item),
        submitted_by: emptyValue(item.submitted_by_name || item.submitted_by),
        submitted_at: emptyValue(item.submitted_at || item.created_at),
        payment_amount: historyAmounts(item).payment,
        deduction_amount: historyAmounts(item).deduction,
        total_request_amount: historyAmounts(item).total,
        description: emptyValue(item.description),
      }));
    }

    return filteredLogItems.map((item) => ({
      created_at: emptyValue(getLogValue(item, ['created_at', 'timestamp', 'createdAt', 'date'], '')),
      action_type: emptyValue(sanitizeLogAction(getLogValue(item, ['action_type', 'action', 'event', 'type'], ''))),
      description: emptyValue(getLogValue(item, ['description', 'details', 'message', 'note'], '')),
      performed_by: emptyValue(getLogValue(item, ['performed_by_name', 'performedByName', 'created_by_name', 'createdByName', 'performed_by', 'created_by'], '')),
    }));
  };

  const validateExportDateFilter = (target) => {
    if (target === 'configurations') {
      return null;
    }

    if (!modalDatePreset) return 'Date filter is required before export.';
    if (modalRange.error) return modalRange.error;
    return null;
  };

  const exportData = async (format) => {
    if (exportTarget === 'configurations' && isConfigExportDisabled) {
      return;
    }

    if ((exportTarget === 'history' || exportTarget === 'logs') && !canExportHistoryAndLogs) {
      toast.error('Only the configuration creator can export History and Logs data.');
      return;
    }

    const validationError = validateExportDateFilter(exportTarget);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const rows = buildExportRows(exportTarget);
    if (!rows.length) {
      toast.error('No data available to export.');
      return;
    }

    const fileBase = `${exportTarget}_${selectedConfig?.name || 'budget_configuration'}`
      .replace(/\s+/g, '_')
      .toLowerCase();

    if (format === 'csv') {
      const headers = Object.keys(rows[0]);
      const body = rows.map((row) => headers.map((key) => escapeCsv(row[key])).join(','));
      const csv = [headers.join(','), ...body].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileBase}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const XLSXModule = await import('xlsx');
    const XLSX = XLSXModule.default || XLSXModule;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, exportTarget === 'configurations' ? 'Configurations' : exportTarget === 'history' ? 'History' : 'Logs');
    XLSX.writeFile(wb, `${fileBase}.xlsx`);
  };

  const handleExport = async (format) => {
    try {
      setExportLoading(true);
      await exportData(format);
      setExportModalOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to export data.');
    } finally {
      setExportLoading(false);
    }
  };

  const getApproverIdValue = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.user_id) return value.user_id;
    if (typeof value === 'object' && value.id) return value.id;
    return '';
  };

  const hasEditChanges = useMemo(() => {
    if (!editConfig || !selectedConfig) return false;

    const normalizedCurrent = {
      name: String(editConfig.name || '').trim(),
      description: String(editConfig.description || '').trim(),
      status: String(editConfig.status || 'active').toLowerCase(),
      startDate: editConfig.startDate || '',
      endDate: editConfig.endDate || '',
      limitMin: String(editConfig.limitMin ?? ''),
      limitMax: String(editConfig.limitMax ?? ''),
      budgetControlEnabled: Boolean(editConfig.budgetControlEnabled),
      budgetControlLimit: editConfig.budgetControlEnabled ? String(editConfig.budgetControlLimit ?? '') : '',
      selectedTenureGroups: JSON.stringify([...(editConfig.selectedTenureGroups || [])].sort()),
      approverL1: String(editConfig.approverL1 || ''),
      backupApproverL1: String(editConfig.backupApproverL1 || ''),
      approverL2: String(editConfig.approverL2 || ''),
      backupApproverL2: String(editConfig.backupApproverL2 || ''),
      approverL3: String(editConfig.approverL3 || ''),
      backupApproverL3: String(editConfig.backupApproverL3 || ''),
    };

    const normalizedOriginal = {
      name: String(selectedConfig.name || '').trim(),
      description: String(selectedConfig.description || '').trim(),
      status: String(selectedConfig.status || 'active').toLowerCase(),
      startDate: selectedConfig.startDate || '',
      endDate: selectedConfig.endDate || '',
      limitMin: String(selectedConfig.limitMin ?? ''),
      limitMax: String(selectedConfig.limitMax ?? ''),
      budgetControlEnabled: Boolean(selectedConfig.budgetControlEnabled),
      budgetControlLimit: selectedConfig.budgetControlEnabled ? String(selectedConfig.budgetLimit ?? '') : '',
      selectedTenureGroups: JSON.stringify([...(selectedConfig.selectedTenureGroups || [])].sort()),
      approverL1: String(getApproverIdValue(selectedConfig.approverL1) || ''),
      backupApproverL1: String(getApproverIdValue(selectedConfig.backupApproverL1) || ''),
      approverL2: String(getApproverIdValue(selectedConfig.approverL2) || ''),
      backupApproverL2: String(getApproverIdValue(selectedConfig.backupApproverL2) || ''),
      approverL3: String(getApproverIdValue(selectedConfig.approverL3) || ''),
      backupApproverL3: String(getApproverIdValue(selectedConfig.backupApproverL3) || ''),
    };

    return Object.keys(normalizedCurrent).some(
      (key) => normalizedCurrent[key] !== normalizedOriginal[key]
    );
  }, [editConfig, selectedConfig]);

  useEffect(() => {
    if (!editSuccessModalOpen) return;

    const intervalId = setInterval(() => {
      setEditSuccessCountdown((prev) => {
        if (prev <= 1) {
          setEditSuccessModalOpen(false);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [editSuccessModalOpen]);

  return (
    <div className="space-y-6 h-full flex flex-col min-h-0 overflow-hidden">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Filter Configurations</CardTitle>
          <CardDescription className="text-gray-400">Search and filter budget configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[260px] flex-1 space-y-2">
              <Label htmlFor="search" className="text-white">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by configuration name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(sanitizeSingleLine(e.target.value))}
                  onKeyDown={blockShortcuts}
                  className="pl-9 bg-slate-700 border-gray-300 text-white placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="min-w-[170px] space-y-2">
              <Label className="text-white">Geo</Label>
              <SearchableSelect
                value={filterGeo}
                onValueChange={setFilterGeo}
                options={[
                  { value: "all", label: "All" },
                  ...geoOptions.map((geo) => ({ value: geo, label: geo })),
                ]}
                placeholder="All"
                searchPlaceholder="Search geo..."
              />
            </div>

            <div className="min-w-[170px] space-y-2">
              <Label className="text-white">Location</Label>
              <SearchableSelect
                value={filterLocation}
                onValueChange={setFilterLocation}
                options={[
                  { value: "all", label: "All" },
                  ...locationOptions.map((location) => ({ value: location, label: location })),
                ]}
                placeholder="All"
                searchPlaceholder="Search location..."
              />
            </div>

            <div className="min-w-[170px] space-y-2">
              <Label className="text-white">Client</Label>
              <SearchableSelect
                value={filterClient}
                onValueChange={setFilterClient}
                options={[
                  { value: "all", label: "All" },
                  ...clientOptions.map((client) => ({ value: client, label: client })),
                ]}
                placeholder="All"
                searchPlaceholder="Search client..."
              />
            </div>

            <div className="min-w-[190px] space-y-2">
              <Label className="text-white">Date Range</Label>
              <SearchableSelect
                value={listDatePreset}
                onValueChange={setListDatePreset}
                options={DATE_PRESET_OPTIONS}
                placeholder="Select date range"
                searchPlaceholder="Search range..."
              />
            </div>

            {listDatePreset === "custom" && (
              <>
                <div className="space-y-2">
                  <Label className="text-white">Start Date</Label>
                  <Input
                    type="date"
                    value={listStartDate}
                    onChange={(e) => setListStartDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="bg-slate-700 border-gray-300 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">End Date</Label>
                  <Input
                    type="date"
                    value={listEndDate}
                    onChange={(e) => setListEndDate(e.target.value)}
                    min={listStartDate || undefined}
                    max={new Date().toISOString().split("T")[0]}
                    className="bg-slate-700 border-gray-300 text-white"
                  />
                </div>
              </>
            )}

            <div className="min-w-[170px] ml-auto flex justify-end">
              <Button
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => openExportModal('configurations')}
                disabled={isConfigExportDisabled || exportLoading}
              >
                {exportLoading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  'Export Data'
                )}
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700 flex-1 min-h-0 flex flex-col">
        <CardHeader>
          <div>
            <CardTitle className="text-white">Configurations</CardTitle>
            <CardDescription className="text-gray-400">All budget configurations</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4 shrink-0">
            <TabsList className="bg-slate-700/60 border-slate-600 p-1">
              <TabsTrigger value="active" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-300 border-0">
                Active ({statusCounts.active ?? 0})
              </TabsTrigger>
              <TabsTrigger value="expired" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-gray-300 border-0">
                Expired ({statusCounts.expired ?? 0})
              </TabsTrigger>
              <TabsTrigger value="deactivated" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white text-gray-300 border-0">
                Deactivated ({statusCounts.deactivated ?? 0})
              </TabsTrigger>
              <TabsTrigger value="all" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white text-gray-300 border-0">
                All ({statusCounts.all ?? 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-6 w-6 text-pink-500 animate-spin" />
            </div>
          ) : prioritizedConfigurations.length === 0 ? (
            <div className="text-sm text-gray-400">No configurations found.</div>
          ) : (
            <>
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="min-w-full text-xs text-left text-gray-300 border-collapse">
                <thead className="text-[10px] uppercase bg-slate-700 text-gray-300 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[160px] max-w-[280px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      Configuration
                    </th>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[90px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      Status
                    </th>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[120px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      Created By
                    </th>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[130px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      Period
                    </th>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[110px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      Budget Limit
                    </th>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[120px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      Approved Amount
                    </th>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[140px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      Client Sponsored Amount
                    </th>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[120px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      Ongoing Amount
                    </th>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[90px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      Min - Max
                    </th>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[100px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      Geo
                    </th>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[100px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      Location
                    </th>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[120px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      Client
                    </th>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[120px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      L1 Approver
                    </th>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[120px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      L2 Approver
                    </th>
                    <th className="px-2 py-2 border-r border-slate-600 min-w-[120px]" style={{resize: 'horizontal', overflow: 'auto'}}>
                      L3 Approver
                    </th>
                    <th className="px-2 py-2 min-w-[90px] sticky right-0 top-0 z-40 bg-slate-700 border-l border-slate-600 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedConfigurations.map((config) => (
                    <tr
                      key={config.id}
                      className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-2 py-2 border-r border-slate-600">
                        <div className="font-medium text-white">{config.name}</div>
                        {config.description && (
                          <div className="text-xs text-gray-400 mt-1 line-clamp-2">{config.description}</div>
                        )}
                      </td>
                      <td className="px-2 py-2 border-r border-slate-600">
                        <Badge className={`text-[10px] ${
                          String(config.status || '').toLowerCase() === 'active'
                            ? 'bg-emerald-600 text-white'
                            : String(config.status || '').toLowerCase() === 'expired'
                              ? 'bg-amber-600 text-white'
                              : 'bg-rose-600 text-white'
                        }`}>
                          {String(config.status || 'active').charAt(0).toUpperCase() + String(config.status || 'active').slice(1)}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 border-r border-slate-600">
                        <div className="text-xs text-gray-300">{config.createdByName || '—'}</div>
                      </td>
                      <td className="px-2 py-2 border-r border-slate-600">
                        <div className="text-xs">{config.dateRangeLabel}</div>
                        <div className="text-xs text-gray-400">{config.payCycle === 'SEMI_MONTHLY' ? 'Semi-Monthly' : config.payCycle}</div>
                      </td>
                      <td className="px-2 py-2 border-r border-slate-600 text-right">
                        {config.budgetControlEnabled ? (
                          <div className="font-medium text-green-400">
                            {config.currency} {Number(config.budgetLimit || 0).toLocaleString('en-US')}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">No limit</div>
                        )}
                      </td>
                      <td className="px-2 py-2 border-r border-slate-600 text-right">
                        <div className="font-medium text-emerald-400">
                          {config.currency} {Number(config.approvedAmount || 0).toLocaleString('en-US')}
                        </div>
                      </td>
                      <td className="px-2 py-2 border-r border-slate-600 text-right">
                        <div className="font-medium text-cyan-300">
                          {config.currency} {Number(config.clientSponsoredAmount || 0).toLocaleString('en-US')}
                        </div>
                      </td>
                      <td className="px-2 py-2 border-r border-slate-600 text-right">
                        <div className="font-medium text-amber-300">
                          {config.currency} {Number(config.ongoingAmount || 0).toLocaleString('en-US')}
                        </div>
                      </td>
                      <td className="px-2 py-2 border-r border-slate-600 text-right">
                        <div className="text-xs">
                          {config.currency} {Number(config.limitMin || 0).toLocaleString('en-US')} - {Number(config.limitMax || 0).toLocaleString('en-US')}
                        </div>
                      </td>
                      <td className="px-2 py-2 border-r border-slate-600">
                        <div className="text-xs">{config.geo?.length ? config.geo.join(', ') : 'All'}</div>
                      </td>
                      <td className="px-2 py-2 border-r border-slate-600">
                        <div className="text-xs">{config.location?.length ? config.location.join(', ') : 'All'}</div>
                      </td>
                      <td className="px-2 py-2 border-r border-slate-600">
                        <div className="text-xs">
                          {Array.isArray(config.clients) && config.clients.length > 0
                            ? config.clients.length > 2
                              ? `${config.clients.slice(0, 2).join(', ')}... (+${config.clients.length - 2})`
                              : config.clients.join(', ')
                            : 'All'}
                        </div>
                      </td>
                      <td className="px-2 py-2 border-r border-slate-600">
                        <div className="text-xs text-gray-300">
                          {config.approverL1Name || config.approverL1 || '—'}
                          {config.backupApproverL1Name && (
                            <div className="text-xs text-gray-500 mt-0.5">Backup: {config.backupApproverL1Name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 border-r border-slate-600">
                        <div className="text-xs text-gray-300">
                          {config.approverL2Name || config.approverL2 || '—'}
                          {config.backupApproverL2Name && (
                            <div className="text-xs text-gray-500 mt-0.5">Backup: {config.backupApproverL2Name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 border-r border-slate-600">
                        <div className="text-xs text-gray-300">
                          {config.approverL3Name || config.approverL3 || '—'}
                          {config.backupApproverL3Name && (
                            <div className="text-xs text-gray-500 mt-0.5">Backup: {config.backupApproverL3Name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 sticky right-0 z-30 bg-slate-800 border-l border-slate-700 whitespace-nowrap hover:bg-slate-700/80 transition-colors">
                        <Button
                          onClick={() => {
                            setSelectedConfig(config);
                            setDetailsOpen(true);
                          }}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
                        >
                          View
                        </Button>
                      </td>
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
              onRowsPerPageChange={(value) => setRowsPerPage(Number(value) || 10)}
              rowOptions={PAGE_SIZE_OPTIONS}
              className="mt-3"
            />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent
          className="bg-slate-800 border-slate-600 text-white !w-[99vw] sm:!w-[97vw] md:!w-[96vw] lg:!w-[94vw] xl:!w-[92vw] 2xl:!w-[90vw] !max-w-[1800px] max-h-[82vh] overflow-y-auto"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-white">{selectedConfig?.name || "Configuration"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedConfig?.description || "Configuration details"}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={detailsTab} onValueChange={setDetailsTab} className="space-y-4">
            <TabsList className="bg-slate-700/60 border-slate-600 p-1">
              <TabsTrigger
                value="edit"
                className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
              >
                Edit
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
              >
                History
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
              >
                Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4">
              {!editConfig ? (
                <p className="text-sm text-gray-400">Select a configuration to edit.</p>
              ) : (
                <div className="space-y-4">
                  {!String(editConfig.createdById || '') || String(editConfig.createdById) !== String(user?.id || '') ? (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
                      Only the configuration creator can modify this configuration.
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label className="text-white">Status</Label>
                      <SearchableSelect
                        value={normalizedStatus}
                        onValueChange={(value) => handleEditChange("status", value)}
                        options={[
                          { value: "active", label: "Active" },
                          ...(isExpired ? [{ value: "expired", label: "Expired" }] : []),
                          { value: "deactivated", label: "Deactivated" },
                        ]}
                        placeholder="Select status"
                        searchPlaceholder="Search status..."
                        maxLength={10}
                        disabled={!isOwner || isExpired}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Budget Name</Label>
                      <Input
                        value={editConfig.name}
                        onChange={(e) => handleEditChange("name", e.target.value)}
                        onKeyDown={blockShortcuts}
                        maxLength={100}
                        className="bg-slate-700 border-gray-300 text-white"
                        disabled={!isOwner}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Start Date</Label>
                      <Input
                        type="date"
                        value={editConfig.startDate || ""}
                        onChange={(e) => handleEditChange("startDate", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                        disabled={!isOwner || hasApprovalActivity || isExpired}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">End Date</Label>
                      <Input
                        type="date"
                        value={editConfig.endDate || ""}
                        onChange={(e) => handleEditChange("endDate", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                        disabled={!isOwner}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label className="text-white">Payroll Cycle</Label>
                      <SearchableSelect
                        value={editConfig.payCycle}
                        onValueChange={(value) => handleEditChange("payCycle", value)}
                        options={[
                          { value: "SEMI_MONTHLY", label: "Semi-Monthly (15 & 30)" },
                        ]}
                        placeholder="Select payroll cycle"
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Currency</Label>
                      <SearchableSelect
                        value={editConfig.currency}
                        onValueChange={(value) => handleEditChange("currency", value)}
                        options={currencyOptions}
                        placeholder="Select currency"
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Min Limit</Label>
                      <Input
                        type="number"
                        value={editConfig.limitMin}
                        onChange={(e) => handleEditChange("limitMin", e.target.value.slice(0, 10))}
                        maxLength={10}
                        className="bg-slate-700 border-gray-300 text-white"
                        disabled={!isOwner}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Max Limit</Label>
                      <Input
                        type="number"
                        value={editConfig.limitMax}
                        onChange={(e) => handleEditChange("limitMax", e.target.value.slice(0, 10))}
                        maxLength={10}
                        className="bg-slate-700 border-gray-300 text-white"
                        disabled={!isOwner}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label className="text-white">Budget Control</Label>
                      <div className="flex items-center gap-2 h-10">
                        <Checkbox
                          id="edit-budget-control"
                          checked={editConfig.budgetControlEnabled}
                          onCheckedChange={(checked) => handleEditChange("budgetControlEnabled", Boolean(checked))}
                          className="border-blue-400 bg-slate-600"
                          disabled={!isOwner}
                        />
                        <Label htmlFor="edit-budget-control" className="text-white text-sm">Enable</Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Budget Limit</Label>
                      <Input
                        type="number"
                        value={editConfig.budgetControlLimit}
                        onChange={(e) => handleEditChange("budgetControlLimit", e.target.value.slice(0, 15))}
                        maxLength={15}
                        className="bg-slate-700 border-gray-300 text-white"
                        disabled={!isOwner || !editConfig.budgetControlEnabled}
                      />
                    </div>
                    <div className="space-y-3 xl:col-span-2">
                      <Label className="text-white">Tenure Group</Label>
                      <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap pb-1">
                        {["0-6months", "6-12months", "1-2years", "2-5years", "5plus-years"].map((value) => (
                          <div key={value} className="inline-flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
                            <Checkbox
                              id={`edit-${value}`}
                              checked={(editConfig.selectedTenureGroups || []).includes(value)}
                              className="border-blue-400 bg-slate-600"
                              disabled={!isOwner}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleEditChange("selectedTenureGroups", [...(editConfig.selectedTenureGroups || []), value]);
                                } else {
                                  handleEditChange("selectedTenureGroups", (editConfig.selectedTenureGroups || []).filter((t) => t !== value));
                                }
                              }}
                            />
                            <Label htmlFor={`edit-${value}`} className="cursor-pointer text-white text-sm font-medium whitespace-nowrap">
                              {value === "0-6months" && "0-6 Months"}
                              {value === "6-12months" && "6-12 Months"}
                              {value === "1-2years" && "1-2 Years"}
                              {value === "2-5years" && "2-5 Years"}
                              {value === "5plus-years" && "5+ Years"}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Description</Label>
                    <textarea
                      value={editConfig.description}
                      onChange={(e) => handleEditChange("description", e.target.value)}
                      onKeyDown={blockShortcuts}
                      maxLength={500}
                      rows={3}
                      className="w-full rounded-md bg-slate-700 border border-gray-300 px-3 py-2 text-white resize-none"
                      disabled={!isOwner}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label className="text-white">Approver L1</Label>
                      <SearchableSelect
                        value={editConfig.approverL1}
                        onValueChange={(value) => {
                          handleEditChange("approverL1", value);
                          if (editConfig.backupApproverL1 === value) {
                            handleEditChange("backupApproverL1", "");
                          }
                        }}
                        options={approvalsL1.map((approver) => ({
                          value: approver.user_id,
                          label: `${approver.first_name} ${approver.last_name}`,
                        }))}
                        disabled={approvalsLoading || !isOwner}
                        placeholder={approvalsLoading ? "Loading approvers..." : "Select primary"}
                        searchPlaceholder="Search approver..."
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Backup L1</Label>
                      <SearchableSelect
                        value={editConfig.backupApproverL1}
                        onValueChange={(value) => handleEditChange("backupApproverL1", value)}
                        options={approvalsL1
                          .filter((approver) => approver.user_id !== editConfig.approverL1)
                          .map((approver) => ({
                            value: approver.user_id,
                            label: `${approver.first_name} ${approver.last_name}`,
                          }))}
                        disabled={approvalsLoading || !isOwner}
                        placeholder={approvalsLoading ? "Loading approvers..." : "Select backup"}
                        searchPlaceholder="Search backup..."
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Approver L2</Label>
                      <SearchableSelect
                        value={editConfig.approverL2}
                        onValueChange={(value) => {
                          handleEditChange("approverL2", value);
                          if (editConfig.backupApproverL2 === value) {
                            handleEditChange("backupApproverL2", "");
                          }
                        }}
                        options={approvalsL2.map((approver) => ({
                          value: approver.user_id,
                          label: `${approver.first_name} ${approver.last_name}`,
                        }))}
                        disabled={approvalsLoading || !isOwner}
                        placeholder={approvalsLoading ? "Loading approvers..." : "Select primary"}
                        searchPlaceholder="Search approver..."
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Backup L2</Label>
                      <SearchableSelect
                        value={editConfig.backupApproverL2}
                        onValueChange={(value) => handleEditChange("backupApproverL2", value)}
                        options={approvalsL2
                          .filter((approver) => approver.user_id !== editConfig.approverL2)
                          .map((approver) => ({
                            value: approver.user_id,
                            label: `${approver.first_name} ${approver.last_name}`,
                          }))}
                        disabled={approvalsLoading || !isOwner}
                        placeholder={approvalsLoading ? "Loading approvers..." : "Select backup"}
                        searchPlaceholder="Search backup..."
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Approver L3</Label>
                      <SearchableSelect
                        value={editConfig.approverL3}
                        onValueChange={(value) => {
                          handleEditChange("approverL3", value);
                          if (editConfig.backupApproverL3 === value) {
                            handleEditChange("backupApproverL3", "");
                          }
                        }}
                        options={approvalsL3.map((approver) => ({
                          value: approver.user_id,
                          label: `${approver.first_name} ${approver.last_name}`,
                        }))}
                        disabled={approvalsLoading || !isOwner}
                        placeholder={approvalsLoading ? "Loading approvers..." : "Select primary"}
                        searchPlaceholder="Search approver..."
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Backup L3</Label>
                      <SearchableSelect
                        value={editConfig.backupApproverL3}
                        onValueChange={(value) => handleEditChange("backupApproverL3", value)}
                        options={approvalsL3
                          .filter((approver) => approver.user_id !== editConfig.approverL3)
                          .map((approver) => ({
                            value: approver.user_id,
                            label: `${approver.first_name} ${approver.last_name}`,
                          }))}
                        disabled={approvalsLoading || !isOwner}
                        placeholder={approvalsLoading ? "Loading approvers..." : "Select backup"}
                        searchPlaceholder="Search backup..."
                        maxLength={50}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveEdit}
                      disabled={editSaving || String(editConfig.createdById || '') !== String(user?.id || '') || !hasEditChanges}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {editSaving ? (
                        <>
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="history" className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-2 min-w-[180px]">
                    <Label className="text-white">Date Range</Label>
                    <SearchableSelect
                      value={modalDatePreset}
                      onValueChange={setModalDatePreset}
                      options={DATE_PRESET_OPTIONS}
                      placeholder="Select date range"
                      searchPlaceholder="Search range..."
                    />
                  </div>
                  {modalDatePreset === 'custom' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-white">Start Date</Label>
                        <Input
                          type="date"
                          value={modalStartDate}
                          onChange={(e) => setModalStartDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="bg-slate-700 border-gray-300 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">End Date</Label>
                        <Input
                          type="date"
                          value={modalEndDate}
                          onChange={(e) => setModalEndDate(e.target.value)}
                          min={modalStartDate || undefined}
                          max={new Date().toISOString().split('T')[0]}
                          className="bg-slate-700 border-gray-300 text-white"
                        />
                      </div>
                    </>
                  )}
                </div>
                {canExportHistoryAndLogs && (
                  <Button
                    variant="outline"
                    className="border-slate-600 text-white hover:bg-slate-700"
                    onClick={() => openExportModal('history')}
                    disabled={exportLoading}
                  >
                    {exportLoading ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      'Export Data'
                    )}
                  </Button>
                )}
              </div>
              {modalRange.error && (
                <p className="text-xs text-rose-300">{modalRange.error}</p>
              )}
              <div className="border border-slate-700 rounded-md overflow-auto h-[300px] min-h-[300px]">
                {historyLogsLoading ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">Loading history...</div>
                ) : filteredHistoryItems.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    No approval requests found for this configuration.
                  </div>
                ) : (
                  <table className="min-w-full text-xs text-left text-gray-300 border-collapse">
                    <thead className="text-[10px] uppercase bg-slate-700 text-gray-300 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 border-b border-slate-600">Request #</th>
                        <th className="px-3 py-2 border-b border-slate-600">Date</th>
                        <th className="px-3 py-2 border-b border-slate-600">Requested By</th>
                        <th className="px-3 py-2 border-b border-slate-600">Status</th>
                        <th className="px-3 py-2 border-b border-slate-600 text-right">Payment</th>
                        <th className="px-3 py-2 border-b border-slate-600 text-right">Deduction</th>
                        <th className="px-3 py-2 border-b border-slate-600 text-right">Total Amount</th>
                        <th className="px-3 py-2 border-b border-slate-600">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {filteredHistoryItems.map((item, index) => {
                        const statusLabel = mapHistoryStatus(item);
                        const amounts = historyAmounts(item);
                        const statusClass =
                          statusLabel === 'Approved'
                            ? 'bg-emerald-600 text-white'
                            : statusLabel === 'Rejected'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-600 text-white';

                        return (
                        <tr key={`${item.request_id || item.request_number || index}`} className="hover:bg-slate-700/50">
                          <td className="px-3 py-2 text-xs text-slate-200">{item.request_number || ''}</td>
                          <td className="px-3 py-2 text-xs text-slate-300">{formatDateTimeCompact(item.submitted_at || item.created_at || '')}</td>
                          <td className="px-3 py-2 text-xs text-slate-300">{item.submitted_by_name || item.submitted_by || ''}</td>
                          <td className="px-3 py-2 text-xs text-slate-300">
                            <Badge className={statusClass}>{statusLabel}</Badge>
                          </td>
                          <td className="px-3 py-2 text-xs text-emerald-300 text-right">₱{amounts.payment.toLocaleString('en-US')}</td>
                          <td className="px-3 py-2 text-xs text-rose-300 text-right">₱{amounts.deduction.toLocaleString('en-US')}</td>
                          <td className="px-3 py-2 text-xs text-slate-200 text-right">₱{amounts.total.toLocaleString('en-US')}</td>
                          <td className="px-3 py-2 text-xs text-slate-300">{item.description || ''}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-2 min-w-[180px]">
                    <Label className="text-white">Date Range</Label>
                    <SearchableSelect
                      value={modalDatePreset}
                      onValueChange={setModalDatePreset}
                      options={DATE_PRESET_OPTIONS}
                      placeholder="Select date range"
                      searchPlaceholder="Search range..."
                    />
                  </div>
                  {modalDatePreset === 'custom' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-white">Start Date</Label>
                        <Input
                          type="date"
                          value={modalStartDate}
                          onChange={(e) => setModalStartDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="bg-slate-700 border-gray-300 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">End Date</Label>
                        <Input
                          type="date"
                          value={modalEndDate}
                          onChange={(e) => setModalEndDate(e.target.value)}
                          min={modalStartDate || undefined}
                          max={new Date().toISOString().split('T')[0]}
                          className="bg-slate-700 border-gray-300 text-white"
                        />
                      </div>
                    </>
                  )}
                </div>
                {canExportHistoryAndLogs && (
                  <Button
                    variant="outline"
                    className="border-slate-600 text-white hover:bg-slate-700"
                    onClick={() => openExportModal('logs')}
                    disabled={exportLoading}
                  >
                    {exportLoading ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      'Export Data'
                    )}
                  </Button>
                )}
              </div>
              {modalRange.error && (
                <p className="text-xs text-rose-300">{modalRange.error}</p>
              )}
              <div className="border border-slate-700 rounded-md overflow-auto h-[300px] min-h-[300px]">
                {historyLogsLoading ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">Loading logs...</div>
                ) : filteredLogItems.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    No logs available for this configuration.
                  </div>
                ) : (
                  <table className="min-w-full text-xs text-left text-gray-300 border-collapse">
                    <thead className="text-[10px] uppercase bg-slate-700 text-gray-300 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 border-b border-slate-600">Date</th>
                        <th className="px-3 py-2 border-b border-slate-600">Action</th>
                        <th className="px-3 py-2 border-b border-slate-600">Description</th>
                        <th className="px-3 py-2 border-b border-slate-600">By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {filteredLogItems.map((item, index) => (
                        <tr key={`${item.id || item.timestamp || index}`} className="hover:bg-slate-700/50">
                          <td className="px-3 py-2 text-xs text-slate-300">
                            {formatDateTimeCompact(getLogValue(item, ['timestamp', 'created_at', 'createdAt', 'date'], ''))}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-200">
                            {sanitizeLogAction(getLogValue(item, ['action_type', 'action', 'event', 'type'], ''))}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-300">
                            {getLogValue(item, ['description', 'details', 'message', 'note'], '')}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-300">
                            {getLogValue(item, ['performed_by_name', 'performedByName', 'created_by_name', 'createdByName', 'performed_by', 'created_by'], '')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={exportModalOpen} onOpenChange={(open) => !exportLoading && setExportModalOpen(open)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-white">Export Data</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose your export format for {exportTarget === 'configurations' ? 'Configuration List' : exportTarget === 'history' ? 'Configuration History' : 'Configuration Logs'}.
            </DialogDescription>
            {(exportTarget === 'history' || exportTarget === 'logs') && !canExportHistoryAndLogs && (
              <p className="text-xs text-amber-300 mt-2">Only the configuration creator can export data from this tab.</p>
            )}
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-700"
              onClick={() => setExportModalOpen(false)}
              disabled={exportLoading}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="border-blue-500 text-blue-300 hover:bg-blue-500/10"
              onClick={() => handleExport('csv')}
              disabled={exportLoading || ((exportTarget === 'history' || exportTarget === 'logs') && !canExportHistoryAndLogs)}
            >
              {exportLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                'Export CSV'
              )}
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => handleExport('excel')}
              disabled={exportLoading || ((exportTarget === 'history' || exportTarget === 'logs') && !canExportHistoryAndLogs)}
            >
              {exportLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                'Export Excel'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editSuccessModalOpen} onOpenChange={setEditSuccessModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white w-[90vw] max-w-md">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <DialogTitle className="text-white">Configuration Updated</DialogTitle>
                <DialogDescription className="text-gray-400">
                  The budget configuration was updated successfully.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Auto-closing in {editSuccessCountdown}s</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateConfiguration() {
  const { user } = useAuth();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(5);
  const [viewStep, setViewStep] = useState("form");
  const [approvalsL1, setApprovalsL1] = useState([]);
  const [approvalsL2, setApprovalsL2] = useState([]);
  const [approvalsL3, setApprovalsL3] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [orgGeoLocations, setOrgGeoLocations] = useState([]);
  const [orgClients, setOrgClients] = useState([]);
  const [orgScopeLoading, setOrgScopeLoading] = useState(false);
  const [formData, setFormData] = useState({
    budgetName: "",
    startDate: "",
    endDate: "",
    description: "",
    dataControlEnabled: true,
    limitMin: "",
    limitMax: "",
    currency: "PHP",
    budgetControlEnabled: false,
    budgetControlLimit: "",
    payCycle: "SEMI_MONTHLY",
    affectedOUPaths: [],
    accessibleOUPaths: [],
    countries: [],
    siteLocation: [],
    clients: [],
    selectedTenureGroups: [],
    approverL1: "",
    backupApproverL1: "",
    approverL2: "",
    backupApproverL2: "",
    approverL3: "",
    backupApproverL3: "",
  });

  const token = user?.token || localStorage.getItem("authToken") || "";

  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        setApprovalsLoading(true);
        const [l1Data, l2Data, l3Data] = await Promise.all([
          fetchWithCache(
            'approvers',
            'L1',
            () => budgetConfigService.getApproversByLevel("L1", token),
            10 * 60 * 1000 // 10 minutes TTL
          ),
          fetchWithCache(
            'approvers',
            'L2',
            () => budgetConfigService.getApproversByLevel("L2", token),
            10 * 60 * 1000
          ),
          fetchWithCache(
            'approvers',
            'L3',
            () => budgetConfigService.getApproversByLevel("L3", token),
            10 * 60 * 1000
          ),
        ]);
        setApprovalsL1(l1Data || []);
        setApprovalsL2(l2Data || []);
        setApprovalsL3(l3Data || []);
      } catch (err) {
        console.error("Error fetching approvers:", err);
        setApprovalsL1([]);
        setApprovalsL2([]);
        setApprovalsL3([]);
      } finally {
        setApprovalsLoading(false);
      }
    };

    fetchApprovers();
  }, [token]);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setOrganizationsLoading(true);
        const data = await fetchWithCache(
          'organizations',
          'all',
          () => budgetConfigService.getOrganizations(token),
          10 * 60 * 1000 // 10 minutes TTL
        );
        setOrganizations(data || []);
      } catch (err) {
        console.error("Error fetching organizations:", err);
        setOrganizations([]);
      } finally {
        setOrganizationsLoading(false);
      }
    };

    fetchOrganizations();
  }, [token]);

  const selectedParentOrgIds = useMemo(() => {
    const ids = new Set();
    (formData.affectedOUPaths || []).forEach((path) => {
      if (path?.[0]) ids.add(path[0]);
    });
    return Array.from(ids);
  }, [formData.affectedOUPaths]);

  useEffect(() => {
    const fetchOrgScopeOptions = async () => {
      if (!selectedParentOrgIds.length) {
        setOrgGeoLocations([]);
        setOrgClients([]);
        return;
      }

      try {
        setOrgScopeLoading(true);
        const [geoLocations, clients] = await Promise.all([
          budgetConfigService.getOrganizationGeoLocationsByOrg(selectedParentOrgIds, token),
          budgetConfigService.getClientsByParentOrg(selectedParentOrgIds, token),
        ]);
        setOrgGeoLocations(geoLocations || []);
        setOrgClients((clients || []).filter((client) => client.client_status !== "INACTIVE"));
      } catch (err) {
        console.error("Error fetching org scope options:", err);
        setOrgGeoLocations([]);
        setOrgClients([]);
      } finally {
        setOrgScopeLoading(false);
      }
    };

    fetchOrgScopeOptions();
  }, [selectedParentOrgIds, token]);

  const buildOrgHierarchy = () => {
    if (!organizations.length) return { parents: [], childOUs: {}, grandchildOUs: {} };

    const parents = organizations.filter((org) => !org.parent_org_id);
    const childOUs = {};
    const grandchildOUs = {};

    parents.forEach((parent) => {
      childOUs[parent.org_id] = organizations.filter((org) => org.parent_org_id === parent.org_id);
    });

    const children = Object.values(childOUs).flat();
    children.forEach((child) => {
      grandchildOUs[child.org_id] = organizations.filter((org) => org.parent_org_id === child.org_id);
    });

    return { parents, childOUs, grandchildOUs };
  };

  const { parents: parentOrgs, childOUs: childOrgMap, grandchildOUs: grandchildOrgMap } = buildOrgHierarchy();

  const getParentSelectionCount = (paths = [], parentId) =>
    (paths || []).filter((path) => path[0] === parentId).length;

  const buildAllPathsForParent = (parentId) => {
    const paths = [[parentId]];
    const children = childOrgMap[parentId] || [];
    children.forEach((child) => {
      paths.push([parentId, child.org_id]);
      const grandchildren = grandchildOrgMap[child.org_id] || [];
      grandchildren.forEach((grandchild) => {
        paths.push([parentId, child.org_id, grandchild.org_id]);
      });
    });
    return paths;
  };

  const getOrgName = (orgId) => {
    const org = organizations.find((o) => o.org_id === orgId);
    return org ? org.org_name : orgId;
  };

  const pathToReadable = (path) => path.map((id) => getOrgName(id)).join(" → ");

  const buildAffectedPreviewLines = () => {
    const paths = formData.affectedOUPaths || [];
    if (!paths.length) return [];

    const parentIds = new Set();
    paths.forEach((path) => {
      if (path[0]) parentIds.add(path[0]);
    });

    const lines = [];

    parentIds.forEach((parentId) => {
      const parent = parentOrgs.find((p) => p.org_id === parentId);
      if (!parent) return;

      const children = childOrgMap[parentId] || [];
      
      // Get all selected child departments for this parent
      const selectedChildren = [];
      const childSelections = new Map();
      
      paths.forEach((path) => {
        if (path[0] !== parentId) return;
        if (path.length >= 2) {
          const childId = path[1];
          if (!childSelections.has(childId)) {
            childSelections.set(childId, { childSelected: false, grandchildIds: new Set() });
          }
          const entry = childSelections.get(childId);
          if (path.length === 2) {
            entry.childSelected = true;
          }
          if (path.length === 3) {
            entry.grandchildIds.add(path[2]);
          }
        }
      });

      // Check if all children are selected
      const isChildAllSelected = (childId) => {
        const grandchildren = grandchildOrgMap[childId] || [];
        const entry = childSelections.get(childId);
        if (!entry) return false;

        const hasGrandchildSelection = entry.grandchildIds.size > 0;

        if (!grandchildren.length) {
          return entry.childSelected || hasGrandchildSelection;
        }

        if (entry.childSelected && !hasGrandchildSelection) {
          return true;
        }

        return entry.grandchildIds.size === grandchildren.length;
      };

      const allChildrenFullySelected = children.length > 0 && children.every((child) => isChildAllSelected(child.org_id));

      // Build department names list
      const departmentNames = [];
      children.forEach((child) => {
        if (isChildAllSelected(child.org_id)) {
          departmentNames.push(child.org_name);
        }
      });

      // Create single line for this parent
      if (allChildrenFullySelected || !children.length) {
        lines.push({
          key: `${parentId}-all`,
          text: `${parent.org_name} → All`,
          scope: { type: 'parent', parentId },
        });
      } else if (departmentNames.length > 0) {
        lines.push({
          key: `${parentId}-depts`,
          text: `${parent.org_name} → ${departmentNames.join(', ')}`,
          scope: { type: 'parent', parentId },
        });
      }
    });

    return lines;
  };

  const removeAffectedByScope = (scope) => {
    updateField(
      "affectedOUPaths",
      formData.affectedOUPaths.filter((path) => {
        if (scope.parentId && !scope.childId) {
          return path[0] !== scope.parentId;
        }
        if (scope.parentId && scope.childId && !scope.grandchildIds) {
          return !(path[0] === scope.parentId && path[1] === scope.childId);
        }
        if (scope.parentId && scope.childId && scope.grandchildIds) {
          return !(
            path[0] === scope.parentId &&
            path[1] === scope.childId &&
            scope.grandchildIds.has(path[2])
          );
        }
        return true;
      })
    );
  };

  const buildAccessiblePreviewLines = () => {
    const paths = formData.accessibleOUPaths || [];
    if (!paths.length) return [];

    const parentIds = new Set();
    paths.forEach((path) => {
      if (path[0]) parentIds.add(path[0]);
    });

    const lines = [];

    parentIds.forEach((parentId) => {
      const parent = parentOrgs.find((p) => p.org_id === parentId);
      if (!parent) return;

      const children = childOrgMap[parentId] || [];
      
      // Get all selected child departments for this parent
      const selectedChildren = [];
      const childSelections = new Map();
      
      paths.forEach((path) => {
        if (path[0] !== parentId) return;
        if (path.length >= 2) {
          const childId = path[1];
          if (!childSelections.has(childId)) {
            childSelections.set(childId, { childSelected: false, grandchildIds: new Set() });
          }
          const entry = childSelections.get(childId);
          if (path.length === 2) {
            entry.childSelected = true;
          }
          if (path.length === 3) {
            entry.grandchildIds.add(path[2]);
          }
        }
      });

      // Check if all children are selected
      const isChildAllSelected = (childId) => {
        const grandchildren = grandchildOrgMap[childId] || [];
        const entry = childSelections.get(childId);
        if (!entry) return false;

        const hasGrandchildSelection = entry.grandchildIds.size > 0;

        if (!grandchildren.length) {
          return entry.childSelected || hasGrandchildSelection;
        }

        if (entry.childSelected && !hasGrandchildSelection) {
          return true;
        }

        return entry.grandchildIds.size === grandchildren.length;
      };

      const allChildrenFullySelected = children.length > 0 && children.every((child) => isChildAllSelected(child.org_id));

      // Build department names list
      const departmentNames = [];
      children.forEach((child) => {
        if (isChildAllSelected(child.org_id)) {
          departmentNames.push(child.org_name);
        }
      });

      // Create single line for this parent
      if (allChildrenFullySelected || !children.length) {
        lines.push({
          key: `${parentId}-all`,
          text: `${parent.org_name} → All`,
          scope: { type: 'parent', parentId },
        });
      } else if (departmentNames.length > 0) {
        lines.push({
          key: `${parentId}-depts`,
          text: `${parent.org_name} → ${departmentNames.join(', ')}`,
          scope: { type: 'parent', parentId },
        });
      }
    });

    return lines;
  };

  const removeAccessibleByScope = (scope) => {
    updateField(
      "accessibleOUPaths",
      formData.accessibleOUPaths.filter((path) => {
        if (scope.parentId && !scope.childId) {
          return path[0] !== scope.parentId;
        }
        if (scope.parentId && scope.childId && !scope.grandchildIds) {
          return !(path[0] === scope.parentId && path[1] === scope.childId);
        }
        if (scope.parentId && scope.childId && scope.grandchildIds) {
          return !(
            path[0] === scope.parentId &&
            path[1] === scope.childId &&
            scope.grandchildIds.has(path[2])
          );
        }
        return true;
      })
    );
  };

  const getApproverName = (userId) => {
    if (!userId) return "Not specified";
    const allApprovers = [...approvalsL1, ...approvalsL2, ...approvalsL3];
    const match = allApprovers.find((approver) => approver.user_id === userId);
    return match ? `${match.first_name} ${match.last_name}` : userId;
  };

  const updateField = (field, value) => {
    const textFields = new Set(["budgetName", "description"]);
    const nextValue = textFields.has(field) ? sanitizeSingleLine(value) : value;
    setFormData((prev) => ({ ...prev, [field]: nextValue }));
  };

  const getCurrencyLabel = (code) => {
    if (!code) return "Not specified";
    const match = currencyOptions.find((option) => option.value === code);
    return match ? match.label : code;
  };

  const getPayCycleLabel = (value) => {
    switch (value) {
      case "MONTHLY":
        return "Monthly (End of Month)";
      case "SEMI_MONTHLY":
        return "Semi-Monthly (15 & 30)";
      case "BI_WEEKLY":
        return "Bi-Weekly (Every 14 Days)";
      default:
        return "Not specified";
    }
  };

  const normalizeDuplicateText = (value) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  const toDateOnlyKey = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (!formData.startDate || !formData.endDate) return;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
      updateField("endDate", "");
    }
  }, [formData.startDate]);

  const minEndDate = useMemo(() => {
    if (!formData.startDate) return undefined;
    const start = new Date(formData.startDate);
    if (Number.isNaN(start.getTime())) return undefined;
    start.setDate(start.getDate() + 1);
    return start.toISOString().split("T")[0];
  }, [formData.startDate]);

  const validateForm = () => {
    if (!formData.budgetName?.trim()) return "Budget name is required.";
    if (!formData.startDate) return "Start date is required.";
    if (!formData.endDate) return "End date is required.";
    if (!formData.limitMin) return "Min limit is required.";
    if (!formData.limitMax) return "Max limit is required.";
    if (!formData.payCycle) return "Payroll cycle is required.";
    if (!formData.currency) return "Currency is required.";
    if (formData.budgetControlEnabled && !formData.budgetControlLimit) {
      return "Budget limit is required when budget control is enabled.";
    }
    if (!formData.countries || formData.countries.length === 0) return "Country is required.";
    if (!formData.siteLocation || formData.siteLocation.length === 0) return "Site location is required.";
    if (!formData.clients || formData.clients.length === 0) return "At least one client is required.";
    if (!formData.affectedOUPaths || formData.affectedOUPaths.length === 0) return "Affected OU selection is required.";
    if (!formData.accessibleOUPaths || formData.accessibleOUPaths.length === 0) return "Accessible OU selection is required.";
    if (!formData.selectedTenureGroups || formData.selectedTenureGroups.length === 0) return "At least one tenure group is required.";
    if (!formData.approverL1) return "Primary L1 approver is required.";
    if (!formData.backupApproverL1) return "Backup L1 approver is required.";
    if (!formData.approverL2) return "Primary L2 approver is required.";
    if (!formData.backupApproverL2) return "Backup L2 approver is required.";
    if (!formData.approverL3) return "Primary L3 approver is required.";
    if (!formData.backupApproverL3) return "Backup L3 approver is required.";
    return null;
  };

  const handleNext = () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setViewStep("review");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const validationError = validateForm();

    if (validationError) {
      toast.error(validationError);
      setIsSubmitting(false);
      return;
    }

    try {
      const configData = {
        budgetName: sanitizeSingleLine(formData.budgetName || "").trim(),
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        description: sanitizeSingleLine(formData.description || "").trim(),
        minLimit: formData.limitMin ? parseFloat(formData.limitMin) : 0,
        maxLimit: formData.limitMax ? parseFloat(formData.limitMax) : 0,
        currency: formData.currency || null,
        payCycle: formData.payCycle,
        budgetControlEnabled: formData.budgetControlEnabled,
        budgetControlLimit: formData.budgetControlEnabled ? parseFloat(formData.budgetControlLimit) : null,
        budgetLimit: formData.budgetControlEnabled ? parseFloat(formData.budgetControlLimit) : null,
        countries: formData.countries || [],
        siteLocation: formData.siteLocation || [],
        clients: formData.clients || [],
        affectedOUPaths: formData.affectedOUPaths || [],
        accessibleOUPaths: formData.accessibleOUPaths || [],
        selectedTenureGroups: formData.selectedTenureGroups || [],
        approverL1: formData.approverL1 || null,
        backupApproverL1: formData.backupApproverL1 || null,
        approverL2: formData.approverL2 || null,
        backupApproverL2: formData.backupApproverL2 || null,
        approverL3: formData.approverL3 || null,
        backupApproverL3: formData.backupApproverL3 || null,
      };

      const hasScope =
        (configData.countries && configData.countries.length > 0) ||
        (configData.siteLocation && configData.siteLocation.length > 0) ||
        (configData.clients && configData.clients.length > 0) ||
        (configData.affectedOUPaths && configData.affectedOUPaths.length > 0) ||
        (configData.accessibleOUPaths && configData.accessibleOUPaths.length > 0);

      if (!hasScope) {
        toast.error("Please select at least one scope field.");
        setIsSubmitting(false);
        return;
      }

      const existingConfigs = await budgetConfigService.getBudgetConfigurations({}, token);
      const duplicateExists = (existingConfigs || []).some((existing) => {
        const existingName = normalizeDuplicateText(existing?.budget_name || existing?.name);
        const existingDescription = normalizeDuplicateText(existing?.budget_description || existing?.description);
        const existingStartDate = toDateOnlyKey(existing?.start_date || existing?.startDate);
        const existingEndDate = toDateOnlyKey(existing?.end_date || existing?.endDate);

        return (
          existingName === normalizeDuplicateText(configData.budgetName) &&
          existingDescription === normalizeDuplicateText(configData.description) &&
          existingStartDate === toDateOnlyKey(configData.startDate) &&
          existingEndDate === toDateOnlyKey(configData.endDate)
        );
      });

      if (duplicateExists) {
        toast.error("A configuration with the same Budget Name, Description, and Config Date already exists.");
        setIsSubmitting(false);
        return;
      }

      await budgetConfigService.createBudgetConfiguration(configData, token);

      // Invalidate budget configs cache to force refresh on list
      invalidateNamespace('budgetConfigs');

      toast.success("Budget configuration created successfully.");
      setSuccessCountdown(5);
      setSuccessModalOpen(true);
      setViewStep("form");

      setFormData({
        budgetName: "",
        startDate: "",
        endDate: "",
        description: "",
        dataControlEnabled: true,
        limitMin: "",
        limitMax: "",
        currency: "PHP",
        budgetControlEnabled: false,
        budgetControlLimit: "",
        payCycle: "SEMI_MONTHLY",
        affectedOUPaths: [],
        accessibleOUPaths: [],
        countries: [],
        siteLocation: [],
        clients: [],
        selectedTenureGroups: [],
        approverL1: "",
        backupApproverL1: "",
        approverL2: "",
        backupApproverL2: "",
        approverL3: "",
        backupApproverL3: "",
      });
    } catch (err) {
      console.error("Error creating configuration:", err);
      toast.error(err.message || "Failed to create budget configuration");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!successModalOpen) return;

    const intervalId = setInterval(() => {
      setSuccessCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          setSuccessModalOpen(false);
          // Wait for modal close animation before switching tabs
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('switchToConfigList'));
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [successModalOpen]);

  const hasAffectedOu = formData.affectedOUPaths.length > 0;
  const hasCountries = formData.countries.length > 0;
  const hasLocation = formData.siteLocation.length > 0;

  const orderedTenureGroups = useMemo(() => {
    const selected = Array.isArray(formData.selectedTenureGroups) ? formData.selectedTenureGroups : [];
    const orderIndex = new Map(TENURE_GROUP_ORDER.map((key, index) => [key, index]));

    return [...selected].sort((a, b) => {
      const aIndex = orderIndex.has(a) ? orderIndex.get(a) : Number.MAX_SAFE_INTEGER;
      const bIndex = orderIndex.has(b) ? orderIndex.get(b) : Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex || String(a).localeCompare(String(b));
    });
  }, [formData.selectedTenureGroups]);

  const availableGeoOptions = useMemo(() => {
    const map = new Map();
    orgGeoLocations
      .filter((row) => selectedParentOrgIds.includes(row.org_id))
      .forEach((row) => {
        const value = row.geo_name || row.geo_id;
        const label = row.geo_name || row.geo_code || row.geo_id;
        if (!map.has(value)) map.set(value, { value, label });
      });
    return Array.from(map.values());
  }, [orgGeoLocations, selectedParentOrgIds]);

  const selectedGeoValue = formData.countries?.[0] || "";

  const availableLocationOptions = useMemo(() => {
    if (!selectedGeoValue) return [];
    const map = new Map();
    orgGeoLocations
      .filter((row) => selectedParentOrgIds.includes(row.org_id))
      .filter((row) => (row.geo_name || row.geo_id) === selectedGeoValue)
      .forEach((row) => {
        const value = row.location_name || row.location_id;
        const label = row.location_name || row.location_code || row.location_id;
        if (!map.has(value)) map.set(value, { value, label });
      });
    return Array.from(map.values());
  }, [orgGeoLocations, selectedParentOrgIds, selectedGeoValue]);

  const availableClientOptions = useMemo(() => {
    const map = new Map();
    orgClients
      .filter((row) => selectedParentOrgIds.includes(row.parent_org_id))
      .forEach((row) => {
        const value = row.client_name || row.client_code;
        const label = row.client_name || row.client_code;
        if (!map.has(value)) map.set(value, { value, label });
      });
    return Array.from(map.values());
  }, [orgClients, selectedParentOrgIds]);

  useEffect(() => {
    const allowed = new Set(availableGeoOptions.map((option) => option.value));
    if (formData.countries.length && !allowed.has(formData.countries[0])) {
      updateField("countries", []);
      updateField("siteLocation", []);
      updateField("clients", []);
    }
  }, [availableGeoOptions, formData.countries]);

  useEffect(() => {
    const allowed = new Set(availableLocationOptions.map((option) => option.value));
    if (formData.siteLocation.length) {
      const filteredLocations = formData.siteLocation.filter((location) => allowed.has(location));
      if (filteredLocations.length !== formData.siteLocation.length) {
        updateField("siteLocation", filteredLocations);
      }
      if (filteredLocations.length === 0) {
        updateField("clients", []);
      }
    }
  }, [availableLocationOptions, formData.siteLocation]);

  useEffect(() => {
    const allowed = new Set(availableClientOptions.map((option) => option.value));
    if (formData.clients.length && formData.clients.some((client) => !allowed.has(client))) {
      updateField(
        "clients",
        formData.clients.filter((client) => allowed.has(client))
      );
    }
  }, [availableClientOptions, formData.clients]);

  const affectedPreviewLines = buildAffectedPreviewLines();
  const accessiblePreviewLines = buildAccessiblePreviewLines();

  return (
    <div className="space-y-2">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="py-3">
          <div className="flex items-start justify-between gap-1">
            <div>
              <CardTitle className="text-white">Create Configuration</CardTitle>
              <CardDescription className="text-gray-400">
                {viewStep === "review" ? "Review details before creating" : "Complete all required fields"}
              </CardDescription>
            </div>
            <span className="text-sm font-medium text-pink-300">
              {viewStep === "review" ? "Review" : "Step 1 of 2"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-1 pt-1">
          {viewStep === "form" ? (
            <div className="space-y-1">
              <div className="grid gap-1 lg:grid-cols-12">
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-1 lg:col-span-6">
                <h4 className="font-medium text-white">Setup Configuration</h4>
                <div className="grid gap-1 md:grid-cols-12 items-end">
                  <div className="space-y-1 md:col-span-6">
                    <Label htmlFor="budgetName" className="text-white">Budget Name *</Label>
                    <Input
                      id="budgetName"
                      placeholder="e.g., Q1 2024 Performance Bonus"
                      value={formData.budgetName}
                      onChange={(e) => updateField("budgetName", e.target.value)}
                      onKeyDown={blockShortcuts}
                      maxLength={100}
                      className="bg-slate-700 border-gray-300 text-white placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="startDate" className="text-sm text-gray-300">Configuration Start Date *</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => updateField("startDate", e.target.value)}
                          className="bg-slate-700 border-gray-300 text-white w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate" className="text-sm text-gray-300">Configuration End Date *</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => updateField("endDate", e.target.value)}
                          min={minEndDate}
                          className="bg-slate-700 border-gray-300 text-white w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budgetDescription" className="text-white">Description</Label>
                  <textarea
                    id="budgetDescription"
                    placeholder="Describe the purpose and details of this budget configuration..."
                    value={formData.description || ""}
                    onChange={(e) => updateField("description", e.target.value)}
                    onKeyDown={blockShortcuts}
                    maxLength={500}
                    rows={3}
                    className="w-full px-3 py-2 min-h-[90px] bg-slate-700 border border-gray-300 rounded-md text-white placeholder:text-gray-400 resize-none"
                  />
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-1 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">Data Control</h4>
                  <Badge className="bg-green-500 text-white">Enabled</Badge>
                </div>
                <div className="space-y-1">
                  <div className="space-y-1">
                    <Label className="text-white">Currency *</Label>
                    <SearchableSelect
                      value={formData.currency}
                      onValueChange={(value) => updateField("currency", value)}
                      options={currencyOptions}
                      placeholder="Select currency"
                      searchPlaceholder="Search currency..."
                      disabled
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="limitMin" className="text-white">Min Limit *</Label>
                    <Input
                      id="limitMin"
                      type="number"
                      placeholder="0"
                      value={formData.limitMin}
                      onChange={(e) => updateField("limitMin", e.target.value.slice(0, 10))}
                      maxLength={10}
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="limitMax" className="text-white">Max Limit *</Label>
                    <Input
                      id="limitMax"
                      type="number"
                      placeholder="10000"
                      value={formData.limitMax}
                      onChange={(e) => updateField("limitMax", e.target.value.slice(0, 10))}
                      maxLength={10}
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-1 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">Payroll Cycle & Budget Control</h4>
                </div>
                <div className="space-y-1">
                  <Label className="text-white">Cycle *</Label>
                  <SearchableSelect
                    value={formData.payCycle}
                    onValueChange={(value) => updateField("payCycle", value)}
                    options={[
                      { value: "SEMI_MONTHLY", label: "Semi-Monthly (15 & 30)" },
                    ]}
                    placeholder="Select payroll cycle"
                    searchPlaceholder="Search payroll cycle..."
                    disabled
                  />
                </div>

                <div className="pt-2 space-y-1 border-t border-slate-600/60">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-white">Budget Control</h5>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="budgetControl"
                        checked={formData.budgetControlEnabled}
                        onCheckedChange={(checked) => updateField("budgetControlEnabled", checked)}
                        className="border-blue-400 bg-slate-600"
                      />
                      <Label htmlFor="budgetControl" className="cursor-pointer text-white text-sm">
                        Enable
                      </Label>
                    </div>
                  </div>

                  {formData.budgetControlEnabled ? (
                    <div className="space-y-1">
                      <Label htmlFor="budgetControlLimit" className="text-white">Budget Limit *</Label>
                      <Input
                        id="budgetControlLimit"
                        type="number"
                        placeholder="100000"
                        value={formData.budgetControlLimit}
                        onChange={(e) => updateField("budgetControlLimit", e.target.value.slice(0, 15))}
                        maxLength={15}
                        className="bg-slate-700 border-gray-300 text-white"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Enable to set budget limits</p>
                  )}
                </div>
              </div>
              </div>
              <div className="grid gap-1 lg:grid-cols-12">
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-1 lg:col-span-5 min-h-[420px]">
                <h4 className="font-medium text-white">Organization</h4>
                <div className="grid gap-1 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-white text-sm">Affected OUs *</Label>
                    <div className="bg-slate-600/30 rounded text-sm border border-slate-500 p-2 max-h-96 overflow-y-auto">
                      {organizationsLoading ? (
                        <div className="text-gray-400 text-sm p-2">Loading organizations...</div>
                      ) : parentOrgs.length === 0 ? (
                        <div className="text-gray-400 text-sm p-2">No organizations available</div>
                      ) : (
                        parentOrgs.map((parent) => {
                          const isParentSelected = formData.affectedOUPaths.some((path) => path[0] === parent.org_id);

                          const togglePath = (newPath) => {
                            if (newPath.length === 1) {
                              const parentId = newPath[0];
                              const allParentPaths = buildAllPathsForParent(parentId);
                              const allSelected = allParentPaths.every((path) =>
                                formData.affectedOUPaths.some((p) => JSON.stringify(p) === JSON.stringify(path))
                              );

                              if (allSelected) {
                                updateField(
                                  "affectedOUPaths",
                                  formData.affectedOUPaths.filter((path) => path[0] !== parentId)
                                );
                              } else {
                                const nextPaths = [...formData.affectedOUPaths];
                                allParentPaths.forEach((path) => {
                                  const exists = nextPaths.some((p) => JSON.stringify(p) === JSON.stringify(path));
                                  if (!exists) nextPaths.push(path);
                                });
                                updateField("affectedOUPaths", nextPaths);
                              }
                              return;
                            }

                            const pathExists = formData.affectedOUPaths.some((p) => JSON.stringify(p) === JSON.stringify(newPath));
                            if (pathExists) {
                              updateField(
                                "affectedOUPaths",
                                formData.affectedOUPaths.filter((p) => JSON.stringify(p) !== JSON.stringify(newPath))
                              );
                            } else {
                              // Only add the selected path, don't auto-add parent
                              updateField("affectedOUPaths", [...formData.affectedOUPaths, newPath]);
                            }
                          };

                          const parentSelectionCount = getParentSelectionCount(formData.affectedOUPaths, parent.org_id);

                          return (
                            <div key={parent.org_id} className="space-y-0">
                              <div className="flex items-center gap-1 p-1 hover:bg-slate-600/50 rounded">
                                <Checkbox
                                  id={`ou-${parent.org_id}`}
                                  checked={isParentSelected}
                                  onCheckedChange={() => togglePath([parent.org_id])}
                                  className="border-pink-400 bg-slate-600 h-4 w-4"
                                />
                                <span className="text-white text-xs">ALL ({parentSelectionCount} selected)</span>
                              </div>

                              {childOrgMap[parent.org_id] && (
                                <div className="ml-4 space-y-0">
                                  {childOrgMap[parent.org_id].map((child) => {
                                    const isChildSelected = formData.affectedOUPaths.some((path) => path[1] === child.org_id);
                                    return (
                                      <div key={child.org_id} className="space-y-0">
                                        <div className="flex items-center gap-1 p-1 hover:bg-slate-600/50 rounded">
                                          <Checkbox
                                            id={`ou-${child.org_id}`}
                                            checked={isChildSelected}
                                            onCheckedChange={() => togglePath([parent.org_id, child.org_id])}
                                            className="border-pink-400 bg-slate-600 h-4 w-4"
                                          />
                                          <span className="text-slate-400 text-xs">↳</span>
                                          <span className="text-gray-300 text-xs">{child.org_name}</span>
                                        </div>

                                        {grandchildOrgMap[child.org_id] && (
                                          <div className="ml-4 space-y-0">
                                            {grandchildOrgMap[child.org_id].map((grandchild) => {
                                              const isGrandchildSelected = formData.affectedOUPaths.some((path) => path[2] === grandchild.org_id);
                                              return (
                                                <div key={grandchild.org_id} className="flex items-center gap-1 p-1 hover:bg-slate-600/50 rounded">
                                                  <Checkbox
                                                    id={`ou-${grandchild.org_id}`}
                                                    checked={isGrandchildSelected}
                                                    onCheckedChange={() => togglePath([parent.org_id, child.org_id, grandchild.org_id])}
                                                    className="border-pink-400 bg-slate-600 h-4 w-4"
                                                  />
                                                  <span className="text-slate-500 text-xs">↳</span>
                                                  <span className="text-gray-400 text-xs">{grandchild.org_name}</span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {formData.affectedOUPaths.length > 0 && (
                      <div className="bg-pink-900/20 border border-pink-700/50 rounded p-2 space-y-1">
                        {buildAffectedPreviewLines().map((line) => (
                          <div key={line.key} className="flex items-center justify-between text-xs text-gray-300 bg-slate-700/50 px-2 py-1 rounded">
                            <span>{line.text}</span>
                            <button
                              onClick={() => removeAffectedByScope(line.scope)}
                              className="text-red-400 hover:text-red-300"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-white text-sm">Accessible OUs *</Label>
                    <div className="bg-slate-600/30 rounded text-sm border border-slate-500 p-2 max-h-96 overflow-y-auto">
                      {organizationsLoading ? (
                        <div className="text-gray-400 text-sm p-2">Loading organizations...</div>
                      ) : parentOrgs.length === 0 ? (
                        <div className="text-gray-400 text-sm p-2">No organizations available</div>
                      ) : (
                        parentOrgs.map((parent) => {
                          const isParentSelected = formData.accessibleOUPaths.some((path) => path[0] === parent.org_id);

                          const toggleAccessPath = (newPath) => {
                            if (newPath.length === 1) {
                              const parentId = newPath[0];
                              const allParentPaths = buildAllPathsForParent(parentId);
                              const allSelected = allParentPaths.every((path) =>
                                formData.accessibleOUPaths.some((p) => JSON.stringify(p) === JSON.stringify(path))
                              );

                              if (allSelected) {
                                updateField(
                                  "accessibleOUPaths",
                                  formData.accessibleOUPaths.filter((path) => path[0] !== parentId)
                                );
                              } else {
                                const nextPaths = [...formData.accessibleOUPaths];
                                allParentPaths.forEach((path) => {
                                  const exists = nextPaths.some((p) => JSON.stringify(p) === JSON.stringify(path));
                                  if (!exists) nextPaths.push(path);
                                });
                                updateField("accessibleOUPaths", nextPaths);
                              }
                              return;
                            }

                            const pathExists = formData.accessibleOUPaths.some((p) => JSON.stringify(p) === JSON.stringify(newPath));
                            if (pathExists) {
                              updateField(
                                "accessibleOUPaths",
                                formData.accessibleOUPaths.filter((p) => JSON.stringify(p) !== JSON.stringify(newPath))
                              );
                            } else {
                              // Only add the selected path, don't auto-add parent
                              updateField("accessibleOUPaths", [...formData.accessibleOUPaths, newPath]);
                            }
                          };

                          const parentSelectionCount = getParentSelectionCount(formData.accessibleOUPaths, parent.org_id);

                          return (
                            <div key={parent.org_id} className="space-y-0">
                              <div className="flex items-center gap-1 p-1 hover:bg-slate-600/50 rounded">
                                <Checkbox
                                  id={`access-ou-${parent.org_id}`}
                                  checked={isParentSelected}
                                  onCheckedChange={() => toggleAccessPath([parent.org_id])}
                                  className="border-blue-400 bg-slate-600 h-4 w-4"
                                />
                                <span className="text-white text-xs">ALL ({parentSelectionCount} selected)</span>
                              </div>

                              {childOrgMap[parent.org_id] && (
                                <div className="ml-4 space-y-0">
                                  {childOrgMap[parent.org_id].map((child) => {
                                    const isChildSelected = formData.accessibleOUPaths.some((path) => path[1] === child.org_id);
                                    return (
                                      <div key={child.org_id} className="space-y-0">
                                        <div className="flex items-center gap-1 p-1 hover:bg-slate-600/50 rounded">
                                          <Checkbox
                                            id={`access-ou-${child.org_id}`}
                                            checked={isChildSelected}
                                            onCheckedChange={() => toggleAccessPath([parent.org_id, child.org_id])}
                                            className="border-blue-400 bg-slate-600 h-4 w-4"
                                          />
                                          <span className="text-slate-400 text-xs">↳</span>
                                          <span className="text-gray-300 text-xs">{child.org_name}</span>
                                        </div>

                                        {grandchildOrgMap[child.org_id] && (
                                          <div className="ml-4 space-y-0">
                                            {grandchildOrgMap[child.org_id].map((grandchild) => {
                                              const isGrandchildSelected = formData.accessibleOUPaths.some((path) => path[2] === grandchild.org_id);
                                              return (
                                                <div key={grandchild.org_id} className="flex items-center gap-1 p-1 hover:bg-slate-600/50 rounded">
                                                  <Checkbox
                                                    id={`access-ou-${grandchild.org_id}`}
                                                    checked={isGrandchildSelected}
                                                    onCheckedChange={() => toggleAccessPath([parent.org_id, child.org_id, grandchild.org_id])}
                                                    className="border-blue-400 bg-slate-600 h-4 w-4"
                                                  />
                                                  <span className="text-slate-500 text-xs">↳</span>
                                                  <span className="text-gray-400 text-xs">{grandchild.org_name}</span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {formData.accessibleOUPaths.length > 0 && (
                      <div className="bg-blue-900/20 border border-blue-700/50 rounded p-2 space-y-1">
                        {buildAccessiblePreviewLines().map((line) => (
                          <div key={line.key} className="flex items-center justify-between text-xs text-gray-300 bg-slate-700/50 px-2 py-1 rounded">
                            <span>{line.text}</span>
                            <button
                              onClick={() => removeAccessibleByScope(line.scope)}
                              className="text-red-400 hover:text-red-300"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-1 lg:col-span-2 min-h-[420px]">
                <div className="space-y-1">
                  <h4 className="font-medium text-white">Location & Client Scope</h4>
                  <div className="space-y-1">
                    <Label className="text-white text-xs">Geo (Country/Region) *</Label>
                    <SearchableSelect
                      value={formData.countries.length > 0 ? formData.countries[0] : ""}
                      onValueChange={(value) => {
                        updateField("countries", value ? [value] : []);
                        updateField("siteLocation", []);
                        updateField("clients", []);
                      }}
                      options={availableGeoOptions}
                      disabled={!hasAffectedOu || orgScopeLoading || availableGeoOptions.length === 0}
                      placeholder={
                        !hasAffectedOu
                          ? "Select Affected OU"
                          : orgScopeLoading
                            ? "Loading geo..."
                            : availableGeoOptions.length
                              ? "Select country"
                              : "No geo available"
                      }
                      searchPlaceholder="Search geo..."
                      maxLength={30}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-xs">Site Location *</Label>
                    <MultiSelect
                      selected={formData.siteLocation}
                      onChange={(selected) => {
                        updateField("siteLocation", selected);
                        updateField("clients", []);
                      }}
                      options={availableLocationOptions}
                      hasAllOption={true}
                      disabled={!hasCountries || orgScopeLoading || availableLocationOptions.length === 0}
                      placeholder={
                        !hasCountries
                          ? "Select Geo"
                          : orgScopeLoading
                            ? "Loading locations..."
                            : availableLocationOptions.length
                              ? "Select location"
                              : "No locations available"
                      }
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-xs">Clients *</Label>
                    <MultiSelect
                      options={availableClientOptions}
                      selected={formData.clients}
                      onChange={(selected) => updateField("clients", selected)}
                      placeholder={
                        !hasLocation
                          ? "Select Location"
                          : orgScopeLoading
                            ? "Loading clients..."
                            : availableClientOptions.length
                              ? "Select clients"
                              : "No clients available"
                      }
                      hasAllOption={true}
                      disabled={!hasLocation || orgScopeLoading || availableClientOptions.length === 0}
                      maxLength={40}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-600/60 space-y-2">
                  <h4 className="font-medium text-white">Tenure Group *</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {["0-6months", "6-12months", "1-2years", "2-5years", "5plus-years"].map((value) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={value}
                          checked={formData.selectedTenureGroups.includes(value)}
                          className="border-blue-400 bg-slate-600"
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateField("selectedTenureGroups", [...formData.selectedTenureGroups, value]);
                            } else {
                              updateField("selectedTenureGroups", formData.selectedTenureGroups.filter((t) => t !== value));
                            }
                          }}
                        />
                        <Label htmlFor={value} className="cursor-pointer text-white text-sm font-medium">
                          {value === "0-6months" && "0-6 Months"}
                          {value === "6-12months" && "6-12 Months"}
                          {value === "1-2years" && "1-2 Years"}
                          {value === "2-5years" && "2-5 Years"}
                          {value === "5plus-years" && "5+ Years"}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-1 lg:col-span-5 min-h-[420px]">
                <h4 className="font-medium text-white">Approval Hierarchy</h4>

                {[1, 2, 3].map((level) => {
                  const approvers = level === 1 ? approvalsL1 : level === 2 ? approvalsL2 : approvalsL3;
                  const primaryField = level === 1 ? "approverL1" : level === 2 ? "approverL2" : "approverL3";
                  const backupField = level === 1 ? "backupApproverL1" : level === 2 ? "backupApproverL2" : "backupApproverL3";

                  return (
                    <div key={level} className="space-y-3">
                      <h5 className="font-medium text-white">Level {level}</h5>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-white text-sm">Primary *</Label>
                          <SearchableSelect
                            value={formData[primaryField]}
                            onValueChange={(value) => {
                              updateField(primaryField, value);
                              if (formData[backupField] === value) {
                                updateField(backupField, "");
                              }
                            }}
                            options={approvers.map((approver) => ({
                              value: approver.user_id,
                              label: `${approver.first_name} ${approver.last_name}`,
                            }))}
                            disabled={approvalsLoading}
                            placeholder={approvalsLoading ? "Loading approvers..." : "Select primary"}
                            searchPlaceholder="Search approver..."
                            maxLength={50}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white text-sm">Backup *</Label>
                          <SearchableSelect
                            value={formData[backupField]}
                            onValueChange={(value) => updateField(backupField, value)}
                            options={approvers
                              .filter((approver) => approver.user_id !== formData[primaryField])
                              .map((approver) => ({
                                value: approver.user_id,
                                label: `${approver.first_name} ${approver.last_name}`,
                              }))}
                            disabled={approvalsLoading}
                            placeholder={approvalsLoading ? "Loading approvers..." : "Select backup"}
                            searchPlaceholder="Search backup..."
                            maxLength={50}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-6">
                <h4 className="font-medium text-white text-base">Configuration Summary</h4>
                <div className="space-y-3 text-base text-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Budget Name</span>
                    <span className="text-white font-medium">{formData.budgetName || "Not specified"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Budget Period</span>
                    <span>{formData.startDate && formData.endDate ? `${formData.startDate} → ${formData.endDate}` : "Not specified"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-gray-400 flex-shrink-0">Description</span>
                    <p className="text-gray-200 text-right">{formData.description || "No description provided."}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-3">
                <h4 className="font-medium text-white text-base">Data Control</h4>
                <div className="space-y-3 text-base text-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Currency</span>
                    <span>{getCurrencyLabel(formData.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Min Limit</span>
                    <span>{formData.limitMin || "Not specified"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Max Limit</span>
                    <span>{formData.limitMax || "Not specified"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-3">
                <h4 className="font-medium text-white text-base">Payroll & Budget Control</h4>
                <div className="space-y-3 text-base text-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Payroll Cycle</span>
                    <span>{getPayCycleLabel(formData.payCycle)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Budget Control</span>
                    <span>{formData.budgetControlEnabled ? "Enabled" : "Disabled"}</span>
                  </div>
                  {formData.budgetControlEnabled && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Budget Limit</span>
                      <span>{formData.budgetControlLimit || "Not specified"}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-5">
                <h4 className="font-medium text-white text-base">Organization Scope</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-400 uppercase">Affected OUs</span>
                    <div className="mt-2 space-y-1">
                      {affectedPreviewLines.length ? (
                        affectedPreviewLines.map((line) => (
                          <div key={line.key} className="text-sm text-gray-200 bg-slate-800/60 px-2 py-1 rounded">
                            {line.text}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-400">Not specified</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400 uppercase">Accessible OUs</span>
                    <div className="mt-2 space-y-1">
                      {accessiblePreviewLines.length ? (
                        accessiblePreviewLines.map((line) => (
                          <div key={line.key} className="text-sm text-gray-200 bg-slate-800/60 px-2 py-1 rounded">
                            {line.text}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-400">Not specified</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-4">
                <h4 className="font-medium text-white text-base">Location & Client Scope</h4>
                <div className="space-y-3 text-base text-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Geo</span>
                    <span>{formData.countries?.[0] || "Not specified"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Site Location</span>
                    <span>{formData.siteLocation?.[0] || "Not specified"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-gray-400 text-sm flex-shrink-0">Clients</span>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {formData.clients?.length ? (
                        formData.clients.map((client) => (
                          <span key={client} className="text-sm bg-slate-800/60 px-2 py-1 rounded">
                            {client}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">Not specified</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-gray-400 text-sm flex-shrink-0">Tenure Groups</span>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {orderedTenureGroups.length ? (
                        orderedTenureGroups.map((tenure) => (
                          <span key={tenure} className="text-sm bg-slate-800/60 px-2 py-1 rounded">
                            {formatTenureGroupLabel(tenure)}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">Not specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-3">
                <h4 className="font-medium text-white text-base">Approval Hierarchy</h4>
                <div className="space-y-3 text-gray-200">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-base text-gray-300 uppercase font-semibold flex-shrink-0">L1</span>
                    <div className="space-y-1 flex-1">
                      <p className="text-base bg-slate-800/60 px-2 py-1 rounded">Primary: {getApproverName(formData.approverL1)}</p>
                      <p className="text-base bg-slate-800/60 px-2 py-1 rounded text-gray-400">Backup: {getApproverName(formData.backupApproverL1)}</p>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-base text-gray-300 uppercase font-semibold flex-shrink-0">L2</span>
                    <div className="space-y-1 flex-1">
                      <p className="text-base bg-slate-800/60 px-2 py-1 rounded">Primary: {getApproverName(formData.approverL2)}</p>
                      <p className="text-base bg-slate-800/60 px-2 py-1 rounded text-gray-400">Backup: {getApproverName(formData.backupApproverL2)}</p>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-base text-gray-300 uppercase font-semibold flex-shrink-0">L3</span>
                    <div className="space-y-1 flex-1">
                      <p className="text-base bg-slate-800/60 px-2 py-1 rounded">Primary: {getApproverName(formData.approverL3)}</p>
                      <p className="text-base bg-slate-800/60 px-2 py-1 rounded text-gray-400">Backup: {getApproverName(formData.backupApproverL3)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="!py-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-400">
              {viewStep === "review"
                ? "Review the details before creating the configuration."
                : "All required fields must be completed before continuing."}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {viewStep === "review" ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setViewStep("form")}
                    className="border-slate-500 text-white"
                  >
                    Back to Edit
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
                    {isSubmitting ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Create Configuration
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button onClick={handleNext} className="bg-pink-500 hover:bg-pink-600 text-white">
                  Next: Review
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white w-[90vw] max-w-md">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <DialogTitle className="text-white">Configuration Created</DialogTitle>
                <DialogDescription className="text-gray-400">
                  The budget configuration was created successfully.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Auto-closing in {successCountdown}s</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
