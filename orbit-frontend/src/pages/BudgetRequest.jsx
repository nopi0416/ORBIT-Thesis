import React, { useEffect, useMemo, useState } from "react";
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
import { Search, Clock, CheckCircle2, XCircle, AlertCircle, Loader, Check } from "../components/icons";
import budgetConfigService from "../services/budgetConfigService";
import currencyData from "../data/currencies.json";
import * as currencyCodes from "currency-codes/index.js";

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

const getCurrencyOptionsFromLibrary = () => {
  const data = currencyCodes?.data;
  if (Array.isArray(data) && data.length) {
    return data.map((item) => ({
      value: item.code,
      label: `${item.code} - ${item.currency}`,
    }));
  }

  if (typeof currencyCodes?.codes === "function") {
    const codes = currencyCodes.codes();
    if (Array.isArray(codes) && codes.length) {
      return codes.map((code) => {
        const info = currencyCodes.code ? currencyCodes.code(code) : null;
        const currencyName = info?.currency || code;
        return { value: code, label: `${code} - ${currencyName}` };
      });
    }
  }

  return [];
};

const getCurrencyOptionsFromJson = (data) => {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const code = item?.code || item?.value;
      if (!code) return null;
      if (item?.label) {
        return { value: code, label: item.label };
      }
      const name = item?.name || item?.currency;
      const label = name ? `${code} - ${name}` : code;
      return { value: code, label };
    })
    .filter(Boolean);
};

const buildCurrencyOptions = () => {
  const libraryOptions = getCurrencyOptionsFromLibrary();
  const jsonOptions = getCurrencyOptionsFromJson(currencyData);

  if (!libraryOptions.length) {
    return jsonOptions;
  }

  if (!jsonOptions.length) {
    return libraryOptions;
  }

  const libraryMap = new Map(libraryOptions.map((option) => [option.value, option]));
  jsonOptions.forEach((option) => {
    if (libraryMap.has(option.value)) {
      libraryMap.set(option.value, { ...libraryMap.get(option.value), ...option });
    }
  });

  return Array.from(libraryMap.values()).sort((a, b) => a.value.localeCompare(b.value));
};

const currencyOptions = buildCurrencyOptions();

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [editConfig, setEditConfig] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const token = user?.token || localStorage.getItem("authToken") || "";

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
            startDate,
            endDate,
            dateRangeLabel,
            limitMin: config.min_limit || config.limitMin || 0,
            limitMax: config.max_limit || config.limitMax || 0,
            budgetControlEnabled: config.budget_control || config.budgetControlEnabled || false,
            budgetLimit: config.budget_limit || config.budgetLimit || config.max_limit || 0,
            payCycle: config.pay_cycle || config.payCycle || "—",
            currency: config.currency || config.currency_code || config.currencyCode || "—",
            geo: parseStoredList(config.geo || config.countries),
            location: parseStoredList(config.location || config.siteLocation),
            clients: parseStoredList(config.client || config.clients),
            approvers: config.approvers || config.approval_hierarchy || [],
            approverL1: config.approver_l1 || config.approverL1 || config.approver_l1_id || "",
            backupApproverL1: config.backup_approver_l1 || config.backupApproverL1 || config.backup_approver_l1_id || "",
            approverL2: config.approver_l2 || config.approverL2 || config.approver_l2_id || "",
            backupApproverL2: config.backup_approver_l2 || config.backupApproverL2 || config.backup_approver_l2_id || "",
            approverL3: config.approver_l3 || config.approverL3 || config.approver_l3_id || "",
            backupApproverL3: config.backup_approver_l3 || config.backupApproverL3 || config.backup_approver_l3_id || "",
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

  useEffect(() => {
    if (!selectedConfig) return;
    setEditConfig({
      id: selectedConfig.id,
      name: selectedConfig.name || "",
      description: selectedConfig.description || "",
      startDate: selectedConfig.startDate || "",
      endDate: selectedConfig.endDate || "",
      limitMin: selectedConfig.limitMin || "",
      limitMax: selectedConfig.limitMax || "",
      currency: selectedConfig.currency || "",
      payCycle: selectedConfig.payCycle || "",
      budgetControlEnabled: Boolean(selectedConfig.budgetControlEnabled),
      budgetControlLimit: selectedConfig.budgetLimit || "",
      approverL1: selectedConfig.approverL1 || "",
      backupApproverL1: selectedConfig.backupApproverL1 || "",
      approverL2: selectedConfig.approverL2 || "",
      backupApproverL2: selectedConfig.backupApproverL2 || "",
      approverL3: selectedConfig.approverL3 || "",
      backupApproverL3: selectedConfig.backupApproverL3 || "",
    });
    setEditError(null);
    setEditSuccess(false);
  }, [selectedConfig]);

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
    setEditConfig((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveEdit = async () => {
    if (!editConfig?.id) return;
    setEditSaving(true);
    setEditError(null);
    setEditSuccess(false);

    try {
      const payload = {
        budgetName: editConfig.name,
        description: editConfig.description,
        startDate: editConfig.startDate || null,
        endDate: editConfig.endDate || null,
        minLimit: editConfig.limitMin ? parseFloat(editConfig.limitMin) : 0,
        maxLimit: editConfig.limitMax ? parseFloat(editConfig.limitMax) : 0,
        currency: editConfig.currency || null,
        payCycle: editConfig.payCycle || null,
        budgetControlEnabled: editConfig.budgetControlEnabled,
        budgetControlLimit: editConfig.budgetControlEnabled && editConfig.budgetControlLimit
          ? parseFloat(editConfig.budgetControlLimit)
          : null,
        budgetLimit: editConfig.budgetControlEnabled && editConfig.budgetControlLimit
          ? parseFloat(editConfig.budgetControlLimit)
          : null,
        approverL1: editConfig.approverL1 || null,
        backupApproverL1: editConfig.backupApproverL1 || null,
        approverL2: editConfig.approverL2 || null,
        backupApproverL2: editConfig.backupApproverL2 || null,
        approverL3: editConfig.approverL3 || null,
        backupApproverL3: editConfig.backupApproverL3 || null,
      };

      await budgetConfigService.updateBudgetConfiguration(editConfig.id, payload, token);

      setConfigurations((prev) =>
        prev.map((config) =>
          config.id === editConfig.id
            ? {
                ...config,
                name: editConfig.name,
                description: editConfig.description,
                startDate: editConfig.startDate,
                endDate: editConfig.endDate,
                dateRangeLabel:
                  editConfig.startDate && editConfig.endDate
                    ? `${editConfig.startDate} → ${editConfig.endDate}`
                    : config.dateRangeLabel,
                limitMin: editConfig.limitMin,
                limitMax: editConfig.limitMax,
                currency: editConfig.currency,
                payCycle: editConfig.payCycle,
                budgetControlEnabled: editConfig.budgetControlEnabled,
                budgetLimit: editConfig.budgetControlEnabled ? editConfig.budgetControlLimit : "—",
                approverL1: editConfig.approverL1,
                backupApproverL1: editConfig.backupApproverL1,
                approverL2: editConfig.approverL2,
                backupApproverL2: editConfig.backupApproverL2,
                approverL3: editConfig.approverL3,
                backupApproverL3: editConfig.backupApproverL3,
              }
            : config
        )
      );

      setSelectedConfig((prev) => (prev ? { ...prev, ...editConfig } : prev));
      setEditSuccess(true);
    } catch (err) {
      setEditError(err.message || "Failed to update configuration");
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
    const matchesSearch = config.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGeo = filterGeo === "all" || config.geo.includes(filterGeo);
    const matchesLocation = filterLocation === "all" || config.location.includes(filterLocation);
    const matchesClient = filterClient === "all" || config.clients.includes(filterClient);
    return matchesSearch && matchesGeo && matchesLocation && matchesClient;
  });

  const historyItems = selectedConfig?.history || [];
  const logItems = selectedConfig?.logs || selectedConfig?.logEntries || [];

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

            <div className="grid gap-4 lg:grid-cols-12">
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-5 min-h-[420px]">
                <h4 className="font-medium text-white">Organization</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Affected OUs</Label>
                    <div className="bg-slate-600/30 rounded text-sm border border-slate-500 p-2 max-h-96 overflow-y-auto">
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
                    <div className="bg-slate-600/30 rounded text-sm border border-slate-500 p-2 max-h-96 overflow-y-auto">
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

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-2 min-h-[420px]">
                <div className="space-y-3">
                  <h4 className="font-medium text-white">Location & Client Scope</h4>
                  <div className="space-y-2">
                    <Label className="text-white text-xs">Geo (Country/Region)</Label>
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-xs">Site Location</Label>
                    <SearchableSelect
                      value={formData.siteLocation.length > 0 ? formData.siteLocation[0] : ""}
                      onValueChange={(value) => {
                        updateField("siteLocation", value ? [value] : []);
                        updateField("clients", []);
                      }}
                      options={availableLocationOptions}
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
                      searchPlaceholder="Search location..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-xs">Clients</Label>
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

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-5 lg:col-span-5 min-h-[420px]">
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
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
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

            <div className="md:col-span-2 space-y-2">
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

            <div className="md:col-span-2 space-y-2">
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
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-300">
                <thead className="text-xs uppercase bg-slate-700 text-gray-300">
                  <tr>
                    <th className="px-4 py-3">Configuration</th>
                    <th className="px-4 py-3">Date Range</th>
                    <th className="px-4 py-3">Budget Limit</th>
                    <th className="px-4 py-3">Payroll Cycle</th>
                    <th className="px-4 py-3">Currency</th>
                    <th className="px-4 py-3">Geo</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Approvers</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConfigurations.map((config) => {
                    const approvalInfo = getApprovalStatusInfo(config.approvalStatus);
                    const StatusIcon = approvalInfo.icon;

                    return (
                      <tr
                        key={config.id}
                        className="border-b border-slate-700 hover:bg-slate-700/60 cursor-pointer"
                        onClick={() => {
                          setSelectedConfig(config);
                          setDetailsOpen(true);
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{config.name}</div>
                          <div className="text-xs text-gray-400">{config.description}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs border-slate-500 text-gray-300 bg-slate-600">
                            {config.dateRangeLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {config.budgetControlEnabled ? config.budgetLimit : "—"}
                        </td>
                        <td className="px-4 py-3">{config.payCycle}</td>
                        <td className="px-4 py-3">{config.currency || "—"}</td>
                        <td className="px-4 py-3">{config.geo.length ? config.geo.join(", ") : "—"}</td>
                        <td className="px-4 py-3">{config.location.length ? config.location.join(", ") : "—"}</td>
                        <td className="px-4 py-3">{config.clients.length ? config.clients.join(", ") : "—"}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1 text-xs text-gray-300">
                            {renderApproverSummary(config).map((line, index) => (
                              <div key={`${config.id}-approver-${index}`}>{line}</div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-xs">
                            <StatusIcon className={`h-4 w-4 ${approvalInfo.color}`} />
                            <span>{approvalInfo.label}</span>
                          </div>
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

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedConfig?.name || "Configuration"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedConfig?.description || "Configuration details"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="edit" className="space-y-4">
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
                  {editError && (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                      {editError}
                    </div>
                  )}
                  {editSuccess && (
                    <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-300">
                      Configuration updated successfully.
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-white">Budget Name</Label>
                      <Input
                        value={editConfig.name}
                        onChange={(e) => handleEditChange("name", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Payroll Cycle</Label>
                      <SearchableSelect
                        value={editConfig.payCycle}
                        onValueChange={(value) => handleEditChange("payCycle", value)}
                        options={[
                          { value: "MONTHLY", label: "Monthly (End of Month)" },
                          { value: "SEMI_MONTHLY", label: "Semi-Monthly (15 & 30)" },
                          { value: "BI_WEEKLY", label: "Bi-Weekly (Every 14 Days)" },
                        ]}
                        placeholder="Select payroll cycle"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Start Date</Label>
                      <Input
                        type="date"
                        value={editConfig.startDate || ""}
                        onChange={(e) => handleEditChange("startDate", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">End Date</Label>
                      <Input
                        type="date"
                        value={editConfig.endDate || ""}
                        onChange={(e) => handleEditChange("endDate", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Currency</Label>
                      <SearchableSelect
                        value={editConfig.currency}
                        onValueChange={(value) => handleEditChange("currency", value)}
                        options={currencyOptions}
                        placeholder="Select currency"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Budget Control</Label>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="edit-budget-control"
                          checked={editConfig.budgetControlEnabled}
                          onCheckedChange={(checked) => handleEditChange("budgetControlEnabled", Boolean(checked))}
                          className="border-blue-400 bg-slate-600"
                        />
                        <Label htmlFor="edit-budget-control" className="text-white text-sm">Enable</Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Budget Limit</Label>
                      <Input
                        type="number"
                        value={editConfig.budgetControlLimit}
                        onChange={(e) => handleEditChange("budgetControlLimit", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                        disabled={!editConfig.budgetControlEnabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Min Limit</Label>
                      <Input
                        type="number"
                        value={editConfig.limitMin}
                        onChange={(e) => handleEditChange("limitMin", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Max Limit</Label>
                      <Input
                        type="number"
                        value={editConfig.limitMax}
                        onChange={(e) => handleEditChange("limitMax", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Description</Label>
                    <textarea
                      value={editConfig.description}
                      onChange={(e) => handleEditChange("description", e.target.value)}
                      rows={3}
                      className="w-full rounded-md bg-slate-700 border border-gray-300 px-3 py-2 text-white"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-white">Approver L1</Label>
                      <Input
                        value={editConfig.approverL1}
                        onChange={(e) => handleEditChange("approverL1", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Backup L1</Label>
                      <Input
                        value={editConfig.backupApproverL1}
                        onChange={(e) => handleEditChange("backupApproverL1", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Approver L2</Label>
                      <Input
                        value={editConfig.approverL2}
                        onChange={(e) => handleEditChange("approverL2", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Backup L2</Label>
                      <Input
                        value={editConfig.backupApproverL2}
                        onChange={(e) => handleEditChange("backupApproverL2", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Approver L3</Label>
                      <Input
                        value={editConfig.approverL3}
                        onChange={(e) => handleEditChange("approverL3", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Backup L3</Label>
                      <Input
                        value={editConfig.backupApproverL3}
                        onChange={(e) => handleEditChange("backupApproverL3", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveEdit}
                      disabled={editSaving}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {editSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-2">
              {historyItems.length === 0 ? (
                <p className="text-sm text-gray-400">No history available.</p>
              ) : (
                <ul className="space-y-2 text-sm text-gray-200">
                  {historyItems.map((item, index) => (
                    <li key={`${item.id || item.timestamp || index}`} className="bg-slate-700/50 rounded p-3">
                      {item.message || item.event || JSON.stringify(item)}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="logs" className="space-y-2">
              {logItems.length === 0 ? (
                <p className="text-sm text-gray-400">No logs available.</p>
              ) : (
                <ul className="space-y-2 text-sm text-gray-200">
                  {logItems.map((item, index) => (
                    <li key={`${item.id || item.timestamp || index}`} className="bg-slate-700/50 rounded p-3">
                      {item.message || item.event || JSON.stringify(item)}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
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
    currency: "",
    budgetControlEnabled: false,
    budgetControlLimit: "",
    payCycle: "",
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
          text: `${getOrgName(parentId)}`,
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
            text: `${getOrgName(parentId)} → ${getOrgName(childId)}`,
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
    setStepError(null);
    const validationError = validateForm();
    if (validationError) {
      setStepError(validationError);
      return;
    }
    setViewStep("review");
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
        setSubmitError("Please select at least one scope field.");
        setIsSubmitting(false);
        return;
      }

      await budgetConfigService.createBudgetConfiguration(configData, token);

      setSubmitSuccess(true);
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
        currency: "",
        budgetControlEnabled: false,
        budgetControlLimit: "",
        payCycle: "",
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
    if (formData.siteLocation.length && !allowed.has(formData.siteLocation[0])) {
      updateField("siteLocation", []);
      updateField("clients", []);
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
                {viewStep === "review" ? "Review details before creating" : "Complete all required fields"}
              </CardDescription>
            </div>
            <span className="text-sm font-medium text-pink-300">
              {viewStep === "review" ? "Review" : "Step 1 of 2"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {viewStep === "form" ? (
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
                          min={minEndDate}
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
                <p className="text-xs text-gray-400">
                  Set min and max limits per employee (applies to both positive and negative amounts).
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-white">Currency *</Label>
                    <SearchableSelect
                      value={formData.currency}
                      onValueChange={(value) => updateField("currency", value)}
                      options={currencyOptions}
                      placeholder="Select currency"
                      searchPlaceholder="Search currency..."
                    />
                  </div>
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
                  <h4 className="font-medium text-white">Payroll Cycle & Budget Control</h4>
                </div>
                <p className="text-xs text-gray-400">Define the configuration's payroll period.</p>
                <div className="space-y-2">
                  <Label className="text-white">Cycle *</Label>
                  <SearchableSelect
                    value={formData.payCycle}
                    onValueChange={(value) => updateField("payCycle", value)}
                    options={[
                      { value: "MONTHLY", label: "Monthly (End of Month)" },
                      { value: "SEMI_MONTHLY", label: "Semi-Monthly (15 & 30)" },
                      { value: "BI_WEEKLY", label: "Bi-Weekly (Every 14 Days)" },
                    ]}
                    placeholder="Select payroll cycle"
                    searchPlaceholder="Search payroll cycle..."
                  />
                </div>

                <div className="pt-2 space-y-3 border-t border-slate-600/60">
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
                  ) : (
                    <p className="text-sm text-gray-400">Enable to set budget limits</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-6">
                <h4 className="font-medium text-white">Configuration Summary</h4>
                <div className="space-y-3 text-sm text-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Budget Name</span>
                    <span className="text-white font-medium">{formData.budgetName || "Not specified"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Budget Period</span>
                    <span>{formData.startDate && formData.endDate ? `${formData.startDate} → ${formData.endDate}` : "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Description</span>
                    <p className="mt-1 text-gray-200">{formData.description || "No description provided."}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-3">
                <h4 className="font-medium text-white">Data Control</h4>
                <div className="space-y-3 text-sm text-gray-200">
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
                <h4 className="font-medium text-white">Payroll & Budget Control</h4>
                <div className="space-y-3 text-sm text-gray-200">
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
                <h4 className="font-medium text-white">Organization Scope</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-gray-400 uppercase">Affected OUs</span>
                    <div className="mt-2 space-y-1">
                      {affectedPreviewLines.length ? (
                        affectedPreviewLines.map((line) => (
                          <div key={line.key} className="text-xs text-gray-200 bg-slate-800/60 px-2 py-1 rounded">
                            {line.text}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-400">Not specified</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase">Accessible OUs</span>
                    <div className="mt-2 space-y-1">
                      {accessiblePreviewLines.length ? (
                        accessiblePreviewLines.map((line) => (
                          <div key={line.key} className="text-xs text-gray-200 bg-slate-800/60 px-2 py-1 rounded">
                            {line.text}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-400">Not specified</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-4">
                <h4 className="font-medium text-white">Location & Client Scope</h4>
                <div className="space-y-3 text-sm text-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Geo</span>
                    <span>{formData.countries?.[0] || "Not specified"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Site Location</span>
                    <span>{formData.siteLocation?.[0] || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Clients</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.clients?.length ? (
                        formData.clients.map((client) => (
                          <span key={client} className="text-xs bg-slate-800/60 px-2 py-1 rounded">
                            {client}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">Not specified</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Tenure Groups</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.selectedTenureGroups?.length ? (
                        formData.selectedTenureGroups.map((tenure) => (
                          <span key={tenure} className="text-xs bg-slate-800/60 px-2 py-1 rounded">
                            {tenure}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">Not specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 lg:col-span-3">
                <h4 className="font-medium text-white">Approval Hierarchy</h4>
                <div className="space-y-3 text-sm text-gray-200">
                  <div>
                    <span className="text-xs text-gray-400 uppercase">L1</span>
                    <p className="mt-1">Primary: {getApproverName(formData.approverL1)}</p>
                    <p className="text-xs text-gray-400">Backup: {getApproverName(formData.backupApproverL1)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase">L2</span>
                    <p className="mt-1">Primary: {getApproverName(formData.approverL2)}</p>
                    <p className="text-xs text-gray-400">Backup: {getApproverName(formData.backupApproverL2)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase">L3</span>
                    <p className="mt-1">Primary: {getApproverName(formData.approverL3)}</p>
                    <p className="text-xs text-gray-400">Backup: {getApproverName(formData.backupApproverL3)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-400">
              {viewStep === "review"
                ? "Review the details before creating the configuration."
                : "All required fields must be completed before continuing."}
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
        <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-md">
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
              <Button
                variant="outline"
                onClick={() => setSuccessModalOpen(false)}
                className="border-slate-500 text-white"
              >
                Close now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
