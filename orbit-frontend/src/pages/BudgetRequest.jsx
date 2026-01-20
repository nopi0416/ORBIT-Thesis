import React, { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { MultiSelect } from "../components/ui/multi-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";
import { Search, Clock, CheckCircle2, XCircle, AlertCircle, Loader, Check } from "../components/icons";
import budgetConfigService from "../services/budgetConfigService";

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

export default function BudgetConfigurationPage() {
  const { user } = useAuth();
  const userRole = user?.role || "requestor";

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Budget Configuration"
        description="Manage budget configurations and access controls"
      />

      <div className="flex-1 p-6">
        <Tabs defaultValue="list" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700 p-1">
            <TabsTrigger
              value="list"
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
            >
              Configuration List
            </TabsTrigger>
            <TabsTrigger
              value="create"
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
            >
              Create Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <ConfigurationList userRole={userRole} />
          </TabsContent>

          <TabsContent value="create">
            <CreateConfiguration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ConfigurationList() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGeo, setFilterGeo] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConfigurations = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = user?.token || localStorage.getItem("authToken") || "";
        const data = await budgetConfigService.getBudgetConfigurations({}, token);
        const transformed = (data || []).map((config) => {
          const startDate = config.start_date || config.startDate || null;
          const endDate = config.end_date || config.endDate || null;
          const dateRangeLabel = startDate && endDate ? `${startDate} → ${endDate}` : "Not specified";

          return {
            id: config.budget_id || config.id,
            name: config.budget_name || config.name || "Unnamed Configuration",
            description: config.description || config.budget_description || "No description provided",
            dateRangeLabel,
            limitMin: config.min_limit || config.limitMin || 0,
            limitMax: config.max_limit || config.limitMax || 0,
            budgetControlEnabled: config.budget_control || config.budgetControlEnabled || false,
            budgetControlLimit: config.max_limit || config.budgetControlLimit || 0,
            geo: parseStoredList(config.geo || config.countries),
            location: parseStoredList(config.location || config.siteLocation),
            clients: parseStoredList(config.client || config.clients),
            approvalStatus: config.approvalStatus || "no_submission",
          };
        });
        setConfigurations(transformed);
      } catch (err) {
        console.error("Error fetching configurations:", err);
        setError(err.message || "Failed to load configurations");
        setConfigurations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigurations();
  }, [user]);

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
    const matchesSearch = config.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGeo = filterGeo === "all" || config.geo.includes(filterGeo);
    const matchesLocation = filterLocation === "all" || config.location.includes(filterLocation);
    const matchesClient = filterClient === "all" || config.clients.includes(filterClient);
    return matchesSearch && matchesGeo && matchesLocation && matchesClient;
  });

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Filter Configurations</CardTitle>
          <CardDescription className="text-gray-400">Search and filter budget configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-12 items-end">
            <div className="md:col-span-6 space-y-2">
              <Label htmlFor="search" className="text-white">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by configuration name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-700 border-gray-300 text-white placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="text-white">Geo</Label>
              <Select value={filterGeo} onValueChange={setFilterGeo}>
                <SelectTrigger className="bg-slate-700 border-gray-300 text-white">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-gray-300">
                  <SelectItem value="all" className="text-white">All</SelectItem>
                  {geoOptions.map((geo) => (
                    <SelectItem key={geo} value={geo} className="text-white">
                      {geo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="text-white">Location</Label>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="bg-slate-700 border-gray-300 text-white">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-gray-300">
                  <SelectItem value="all" className="text-white">All</SelectItem>
                  {locationOptions.map((location) => (
                    <SelectItem key={location} value={location} className="text-white">
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="text-white">Client</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="bg-slate-700 border-gray-300 text-white">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-gray-300">
                  <SelectItem value="all" className="text-white">All</SelectItem>
                  {clientOptions.map((client) => (
                    <SelectItem key={client} value={client} className="text-white">
                      {client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Configurations</CardTitle>
          <CardDescription className="text-gray-400">All budget configurations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-6 w-6 text-pink-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-sm text-red-400">{error}</div>
          ) : filteredConfigurations.length === 0 ? (
            <div className="text-sm text-gray-400">No configurations found.</div>
          ) : (
            <div className="space-y-3">
              {filteredConfigurations.map((config) => {
                const approvalInfo = getApprovalStatusInfo(config.approvalStatus);
                const StatusIcon = approvalInfo.icon;

                return (
                  <div key={config.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{config.name}</h3>
                          <Badge variant="outline" className="text-xs border-slate-500 text-gray-300 bg-slate-600">
                            {config.dateRangeLabel}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400">{config.description}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
                          <span>Geo: {config.geo.length ? config.geo.join(", ") : "—"}</span>
                          <span>Location: {config.location.length ? config.location.join(", ") : "—"}</span>
                          <span>Client: {config.clients.length ? config.clients.join(", ") : "—"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <StatusIcon className={`h-4 w-4 ${approvalInfo.color}`} />
                        <span className="text-gray-300">{approvalInfo.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateConfiguration() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [stepError, setStepError] = useState(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(5);
  const [approvalsL1, setApprovalsL1] = useState([]);
  const [approvalsL2, setApprovalsL2] = useState([]);
  const [approvalsL3, setApprovalsL3] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [formData, setFormData] = useState({
    budgetName: "",
    startDate: "",
    endDate: "",
    description: "",
    dataControlEnabled: true,
    limitMin: "",
    limitMax: "",
    budgetControlEnabled: false,
    budgetControlLimit: "",
    budgetCarryoverEnabled: false,
    carryoverPercentage: "100",
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
    const fetchOrganizations = async () => {
      try {
        setOrganizationsLoading(true);
        const data = await budgetConfigService.getOrganizations(token);
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
      const children = childOrgMap[parentId] || [];
      const parentSelected = paths.some((path) => path[0] === parentId && path.length === 1);

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

      if (!children.length || (parentSelected && childSelections.size === 0) || allChildrenFullySelected) {
        lines.push({
          key: `${parentId}-all`,
          text: `${getOrgName(parentId)} → All`,
          scope: { parentId },
        });
        return;
      }

      childSelections.forEach((entry, childId) => {
        const grandchildren = grandchildOrgMap[childId] || [];
        const hasGrandchildSelection = entry.grandchildIds.size > 0;
        const allGrandchildrenSelected =
          (entry.childSelected && !hasGrandchildSelection) ||
          (grandchildren.length > 0 && entry.grandchildIds.size === grandchildren.length);

        if (allGrandchildrenSelected) {
          lines.push({
            key: `${parentId}-${childId}-all`,
            text: `${getOrgName(parentId)} → ${getOrgName(childId)} → All`,
            scope: { parentId, childId },
          });
          return;
        }

        const selectedGrandchildren = Array.from(entry.grandchildIds).map((id) => getOrgName(id));
        if (selectedGrandchildren.length > 0) {
          lines.push({
            key: `${parentId}-${childId}-partial`,
            text: `${getOrgName(parentId)} → ${getOrgName(childId)} → ${selectedGrandchildren.join(", ")}`,
            scope: { parentId, childId, grandchildIds: new Set(entry.grandchildIds) },
          });
        }
      });
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
      const children = childOrgMap[parentId] || [];
      const parentSelected = paths.some((path) => path[0] === parentId && path.length === 1);

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

      if (!children.length || (parentSelected && childSelections.size === 0) || allChildrenFullySelected) {
        lines.push({
          key: `${parentId}-all`,
          text: `${getOrgName(parentId)} → All`,
          scope: { parentId },
        });
        return;
      }

      childSelections.forEach((entry, childId) => {
        const grandchildren = grandchildOrgMap[childId] || [];
        const hasGrandchildSelection = entry.grandchildIds.size > 0;
        const allGrandchildrenSelected =
          (entry.childSelected && !hasGrandchildSelection) ||
          (grandchildren.length > 0 && entry.grandchildIds.size === grandchildren.length);

        if (allGrandchildrenSelected) {
          lines.push({
            key: `${parentId}-${childId}-all`,
            text: `${getOrgName(parentId)} → ${getOrgName(childId)} → All`,
            scope: { parentId, childId },
          });
          return;
        }

        const selectedGrandchildren = Array.from(entry.grandchildIds).map((id) => getOrgName(id));
        if (selectedGrandchildren.length > 0) {
          lines.push({
            key: `${parentId}-${childId}-partial`,
            text: `${getOrgName(parentId)} → ${getOrgName(childId)} → ${selectedGrandchildren.join(", ")}`,
            scope: { parentId, childId, grandchildIds: new Set(entry.grandchildIds) },
          });
        }
      });
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
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.budgetName?.trim()) return "Budget name is required.";
    if (!formData.startDate) return "Start date is required.";
    if (!formData.endDate) return "End date is required.";
    if (!formData.limitMin) return "Min limit is required.";
    if (!formData.limitMax) return "Max limit is required.";
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setStepError(null);

    const validationError = validateForm();

    if (validationError) {
      setStepError(validationError);
      setIsSubmitting(false);
      return;
    }

    try {
      const configData = {
        budgetName: formData.budgetName,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        description: formData.description || "",
        minLimit: formData.limitMin ? parseFloat(formData.limitMin) : 0,
        maxLimit: formData.limitMax ? parseFloat(formData.limitMax) : 0,
        budgetControlEnabled: formData.budgetControlEnabled,
        budgetControlLimit: formData.budgetControlEnabled ? parseFloat(formData.budgetControlLimit) : null,
        budgetCarryoverEnabled: formData.budgetCarryoverEnabled,
        carryoverPercentage: formData.budgetCarryoverEnabled ? parseFloat(formData.carryoverPercentage) : 100,
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
        setSubmitError("Please select at least one scope field.");
        setIsSubmitting(false);
        return;
      }

      await budgetConfigService.createBudgetConfiguration(configData, token);

      setSubmitSuccess(true);
      setSuccessCountdown(5);
      setSuccessModalOpen(true);

      setFormData({
        budgetName: "",
        startDate: "",
        endDate: "",
        description: "",
        dataControlEnabled: true,
        limitMin: "",
        limitMax: "",
        budgetControlEnabled: false,
        budgetControlLimit: "",
        budgetCarryoverEnabled: false,
        carryoverPercentage: "100",
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

      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      console.error("Error creating configuration:", err);
      setSubmitError(err.message || "Failed to create budget configuration");
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

  return (
    <div className="space-y-6">
      {submitError && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-500">Error</h3>
                <p className="text-red-300 text-sm">{submitError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stepError && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-400">Incomplete Form</h3>
                <p className="text-amber-200 text-sm">{stepError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {submitSuccess && (
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-500">Success</h3>
                <p className="text-green-300 text-sm">Budget configuration created successfully!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-white">Create Configuration</CardTitle>
              <CardDescription className="text-gray-400">
                Complete all required fields on one page
              </CardDescription>
            </div>
            <span className="text-sm font-medium text-pink-300">Review</span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-6">
              <h4 className="font-medium text-white">Setup Configuration</h4>
              <div className="grid gap-4 md:grid-cols-12 items-end">
                <div className="space-y-2 md:col-span-6">
                  <Label htmlFor="budgetName" className="text-white">Budget Name *</Label>
                  <Input
                    id="budgetName"
                    placeholder="e.g., Q1 2024 Performance Bonus"
                    value={formData.budgetName}
                    onChange={(e) => updateField("budgetName", e.target.value)}
                    className="bg-slate-700 border-gray-300 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2 md:col-span-6">
                  <Label className="text-white">Budget Period *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="startDate" className="text-xs text-gray-300 whitespace-nowrap">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => updateField("startDate", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="endDate" className="text-xs text-gray-300 whitespace-nowrap">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => updateField("endDate", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
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
                  rows={4}
                  className="w-full px-3 py-2 min-h-[110px] bg-slate-700 border border-gray-300 rounded-md text-white placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-white">Data Control</h4>
                <Badge className="bg-green-500 text-white">Enabled</Badge>
              </div>
              <p className="text-xs text-gray-400">Set min and max limits per employee</p>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
                <p className="text-xs text-blue-300">
                  Min and Max limits apply to both positive and negative amounts.
                </p>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="limitMin" className="text-white">Min Limit *</Label>
                  <Input
                    id="limitMin"
                    type="number"
                    placeholder="0"
                    value={formData.limitMin}
                    onChange={(e) => updateField("limitMin", e.target.value)}
                    className="bg-slate-700 border-gray-300 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limitMax" className="text-white">Max Limit *</Label>
                  <Input
                    id="limitMax"
                    type="number"
                    placeholder="10000"
                    value={formData.limitMax}
                    onChange={(e) => updateField("limitMax", e.target.value)}
                    className="bg-slate-700 border-gray-300 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-white">Budget Control</h4>
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
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="budgetControlLimit" className="text-white">Budget Limit *</Label>
                    <Input
                      id="budgetControlLimit"
                      type="number"
                      placeholder="100000"
                      value={formData.budgetControlLimit}
                      onChange={(e) => updateField("budgetControlLimit", e.target.value)}
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="budgetCarryover"
                        checked={formData.budgetCarryoverEnabled}
                        onCheckedChange={(checked) => updateField("budgetCarryoverEnabled", checked)}
                        className="border-blue-400 bg-slate-600"
                      />
                      <Label htmlFor="budgetCarryover" className="cursor-pointer text-white text-sm">
                        Budget Carry Over
                      </Label>
                    </div>

                    {formData.budgetCarryoverEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor="carryoverPercentage" className="text-white">Carry Over % *</Label>
                        <Input
                          id="carryoverPercentage"
                          type="number"
                          min="0"
                          max="100"
                          placeholder="100"
                          value={formData.carryoverPercentage || "100"}
                          onChange={(e) => {
                            const value = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                            updateField("carryoverPercentage", value.toString());
                          }}
                          className="bg-slate-700 border-gray-300 text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Enable to set budget limits</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-5">
              <h4 className="font-medium text-white">Organization</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white text-sm">Affected OUs</Label>
                  <div className="bg-slate-600/30 rounded text-sm border border-slate-500 p-2">
                    {organizationsLoading ? (
                      <div className="text-gray-400 text-sm p-2">Loading organizations...</div>
                    ) : parentOrgs.length === 0 ? (
                      <div className="text-gray-400 text-sm p-2">No organizations available</div>
                    ) : (
                      parentOrgs.map((parent) => {
                        const isParentSelected = formData.affectedOUPaths.some((path) => path[0] === parent.org_id);

                        const togglePath = (newPath) => {
                          const pathExists = formData.affectedOUPaths.some((p) => JSON.stringify(p) === JSON.stringify(newPath));
                          if (pathExists) {
                            updateField("affectedOUPaths", formData.affectedOUPaths.filter((p) => JSON.stringify(p) !== JSON.stringify(newPath)));
                          } else {
                            const nextPaths = [...formData.affectedOUPaths, newPath];
                            if (newPath.length > 1) {
                              const parentPath = [newPath[0]];
                              const parentExists = nextPaths.some((p) => JSON.stringify(p) === JSON.stringify(parentPath));
                              if (!parentExists) nextPaths.push(parentPath);
                            }
                            updateField("affectedOUPaths", nextPaths);
                          }
                        };

                        return (
                          <div key={parent.org_id} className="space-y-0">
                            <div className="flex items-center gap-1 p-1 hover:bg-slate-600/50 rounded">
                              <Checkbox
                                id={`ou-${parent.org_id}`}
                                checked={isParentSelected}
                                onCheckedChange={() => togglePath([parent.org_id])}
                                className="border-pink-400 bg-slate-600 h-4 w-4"
                              />
                              <span className="text-white text-xs">{parent.org_name}</span>
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

                <div className="space-y-2">
                  <Label className="text-white text-sm">Accessible OUs</Label>
                  <div className="bg-slate-600/30 rounded text-sm border border-slate-500 p-2">
                    {organizationsLoading ? (
                      <div className="text-gray-400 text-sm p-2">Loading organizations...</div>
                    ) : parentOrgs.length === 0 ? (
                      <div className="text-gray-400 text-sm p-2">No organizations available</div>
                    ) : (
                      parentOrgs.map((parent) => {
                        const isParentSelected = formData.accessibleOUPaths.some((path) => path[0] === parent.org_id);

                        const toggleAccessPath = (newPath) => {
                          const pathExists = formData.accessibleOUPaths.some((p) => JSON.stringify(p) === JSON.stringify(newPath));
                          if (pathExists) {
                            updateField("accessibleOUPaths", formData.accessibleOUPaths.filter((p) => JSON.stringify(p) !== JSON.stringify(newPath)));
                          } else {
                            const nextPaths = [...formData.accessibleOUPaths, newPath];
                            if (newPath.length > 1) {
                              const parentPath = [newPath[0]];
                              const parentExists = nextPaths.some((p) => JSON.stringify(p) === JSON.stringify(parentPath));
                              if (!parentExists) nextPaths.push(parentPath);
                            }
                            updateField("accessibleOUPaths", nextPaths);
                          }
                        };

                        return (
                          <div key={parent.org_id} className="space-y-0">
                            <div className="flex items-center gap-1 p-1 hover:bg-slate-600/50 rounded">
                              <Checkbox
                                id={`access-ou-${parent.org_id}`}
                                checked={isParentSelected}
                                onCheckedChange={() => toggleAccessPath([parent.org_id])}
                                className="border-blue-400 bg-slate-600 h-4 w-4"
                              />
                              <span className="text-white text-xs">{parent.org_name}</span>
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

            <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-2">
              <div className="space-y-3">
                <h4 className="font-medium text-white">Location & Client Scope</h4>
                <div className="space-y-2">
                  <Label className="text-white text-xs">Geo (Country/Region)</Label>
                  <Select
                    value={formData.countries.length > 0 ? formData.countries[0] : ""}
                    onValueChange={(value) => updateField("countries", value ? [value] : [])}
                    disabled={!hasAffectedOu}
                  >
                    <SelectTrigger className="bg-slate-700 border-gray-300 text-white">
                      <SelectValue placeholder={hasAffectedOu ? "Select country" : "Select Affected OU"} />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-gray-300">
                      <SelectItem value="ph" className="text-white">Philippines</SelectItem>
                      <SelectItem value="sg" className="text-white">Singapore</SelectItem>
                      <SelectItem value="my" className="text-white">Malaysia</SelectItem>
                      <SelectItem value="th" className="text-white">Thailand</SelectItem>
                      <SelectItem value="id" className="text-white">Indonesia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-xs">Site Location</Label>
                  <Select
                    value={formData.siteLocation.length > 0 ? formData.siteLocation[0] : ""}
                    onValueChange={(value) => updateField("siteLocation", value ? [value] : [])}
                    disabled={!hasCountries}
                  >
                    <SelectTrigger className="bg-slate-700 border-gray-300 text-white">
                      <SelectValue placeholder={hasCountries ? "Select location" : "Select Geo"} />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-gray-300">
                      <SelectItem value="metro-manila" className="text-white">Metro Manila</SelectItem>
                      <SelectItem value="cebu" className="text-white">Cebu</SelectItem>
                      <SelectItem value="davao" className="text-white">Davao</SelectItem>
                      <SelectItem value="singapore-central" className="text-white">Singapore Central</SelectItem>
                      <SelectItem value="kuala-lumpur" className="text-white">Kuala Lumpur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-xs">Clients</Label>
                  <MultiSelect
                    options={[
                      { value: "pldt", label: "PLDT" },
                      { value: "globe", label: "Globe Telecom" },
                      { value: "smart", label: "Smart Communications" },
                      { value: "converge", label: "Converge ICT" },
                      { value: "dito", label: "DITO Telecommunity" },
                    ]}
                    selected={formData.clients}
                    onChange={(selected) => updateField("clients", selected)}
                    placeholder={hasLocation ? "Select clients" : "Select Location"}
                    hasAllOption={true}
                    disabled={!hasLocation}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-600/60 space-y-3">
                <h4 className="font-medium text-white">Tenure Group</h4>
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

            <div className="bg-slate-700/50 rounded-lg p-4 space-y-5 lg:col-span-5">
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
                        <Select
                          value={formData[primaryField]}
                          onValueChange={(value) => {
                            updateField(primaryField, value);
                            if (formData[backupField] === value) {
                              updateField(backupField, "");
                            }
                          }}
                          disabled={approvalsLoading}
                        >
                          <SelectTrigger className="bg-slate-700 border-gray-300 text-white">
                            <SelectValue placeholder={approvalsLoading ? "Loading approvers..." : "Select primary"} />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-gray-300">
                            {approvers.map((approver) => (
                              <SelectItem key={approver.user_id} value={approver.user_id} className="text-white">
                                {approver.first_name} {approver.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white text-sm">Backup *</Label>
                        <Select
                          value={formData[backupField]}
                          onValueChange={(value) => updateField(backupField, value)}
                          disabled={approvalsLoading}
                        >
                          <SelectTrigger className="bg-slate-700 border-gray-300 text-white">
                            <SelectValue placeholder={approvalsLoading ? "Loading approvers..." : "Select backup"} />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-gray-300">
                            {approvers
                              .filter((approver) => approver.user_id !== formData[primaryField])
                              .map((approver) => (
                                <SelectItem key={approver.user_id} value={approver.user_id} className="text-white">
                                  {approver.first_name} {approver.last_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-400">All required fields must be completed before submitting.</div>
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
          </div>
        </CardContent>
      </Card>

      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-md">
          <button
            onClick={() => setSuccessModalOpen(false)}
            className="absolute right-4 top-4 text-sm text-gray-300 hover:text-white"
          >
            Close ({successCountdown}s)
          </button>
          <DialogHeader>
            <DialogTitle className="text-white">Configuration Created</DialogTitle>
            <DialogDescription className="text-gray-400">
              The budget configuration was created successfully.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
