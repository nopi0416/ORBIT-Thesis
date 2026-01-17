import React, { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Check,
  BarChart,
  Edit,
  Eye,
  Upload,
  FileDown,
  Loader,
} from "../components/icons";
import { APPROVAL_STATUS, CONFIG_STATUS } from "../utils/types";
import { cn } from "../utils/cn";
import budgetConfigService from "../services/budgetConfigService";

export default function BudgetConfigurationPage() {
  const { user } = useAuth();
  const userRole = user?.role || "requestor";

  // All users can view, create, and edit configurations
  const canCreateConfiguration = true; // All roles can create
  const canViewConfigurations = true; // All roles can view
  const canEditConfigurations = true; // All roles can edit

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
            <ConfigurationList canEdit={canEditConfigurations} userRole={userRole} />
          </TabsContent>

          <TabsContent value="create">
            <CreateConfiguration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

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

function ConfigurationList({ canEdit, userRole }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGeo, setFilterGeo] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // Fetch configurations on mount
  useEffect(() => {
    const fetchConfigurations = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken') || '';
        const data = await budgetConfigService.getBudgetConfigurations({}, token);
        
        // Transform API data to match UI structure
        const transformedData = (data || []).map(config => {
          // Extract geo and location from access_scopes
          const geoScopes = config.access_scopes?.filter(s => s.scope_type === 'Geo').map(s => s.scope_value) || [];
          const locationScopes = config.access_scopes?.filter(s => s.scope_type === 'Location').map(s => s.scope_value) || [];
          const clientScopes = config.access_scopes?.filter(s => s.scope_type === 'Client').map(s => s.scope_value) || [];
          
          const startDate = config.start_date || config.startDate || null;
          const endDate = config.end_date || config.endDate || null;
          const dateRangeLabel = startDate && endDate ? `${startDate} → ${endDate}` : 'Not specified';
          
          return {
            // Map database field names to UI field names
            id: config.budget_id || config.id,
            budget_id: config.budget_id,
            name: config.budget_name || config.name || 'Unnamed Configuration',
            budgetName: config.budget_name || config.name || 'Unnamed Configuration',
            description: config.description || config.budget_description || 'No description provided',
            startDate,
            endDate,
            dateRangeLabel,
            department: config.department_scope || config.department || 'All',
            limitMin: config.min_limit || config.limitMin || 0,
            limitMax: config.max_limit || config.limitMax || 0,
            geo: geoScopes.length > 0 ? geoScopes : (config.geo || []),
            geoScope: geoScopes.length > 0 ? geoScopes : (config.geo_scope || []),
            location: locationScopes.length > 0 ? locationScopes : (config.location || []),
            locationScope: locationScopes.length > 0 ? locationScopes : (config.location_scope || []),
            clients: clientScopes.length > 0 ? clientScopes : (Array.isArray(config.clients) ? config.clients : []),
            budgetControlEnabled: config.budget_control || config.budgetControlEnabled || false,
            budgetControlLimit: config.max_limit || config.budgetControlLimit || 0,
            budgetCarryoverEnabled: config.carryover_enabled || config.budgetCarryoverEnabled || false,
            approvalStatus: config.approvalStatus || 'pending',
            createdAt: config.created_at || config.createdAt || new Date().toISOString(),
            ...config, // Include all original properties as fallback
          };
        });
        
        setConfigurations(transformedData);
      } catch (err) {
        console.error("Error fetching configurations:", err);
        setError(err.message || "Failed to load configurations");
        // Fall back to empty array on error
        setConfigurations([]);
      } finally {
        setLoading(false);
      }
    };

    // Always fetch when component mounts (user exists)
    if (user) {
      fetchConfigurations();
    }
  }, [user]);

  const filteredConfigurations = configurations.filter((config) => {
    // Handle undefined config properties with safe checks
    const configName = config?.budget_name || config?.name || "";
    const configGeo = config?.geo_scope || config?.geo || [];
    const configLocation = config?.location_scope || config?.location || [];
    const configClients = config?.clients || [];
    
    const matchesSearch = configName.toString().toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGeo = filterGeo === "all" || (Array.isArray(configGeo) ? configGeo.includes(filterGeo) : configGeo === filterGeo);
    const matchesLocation = filterLocation === "all" || (Array.isArray(configLocation) ? configLocation.includes(filterLocation) : configLocation === filterLocation);
    const matchesClient = filterClient === "all" || (Array.isArray(configClients) ? configClients.includes(filterClient) : configClients === filterClient);
    return matchesSearch && matchesGeo && matchesLocation && matchesClient;
  });

  const handleConfigClick = (config) => {
    setSelectedConfig(config);
    setIsEditMode(false);
    setModalOpen(true);
  };

  const handleEditConfig = async () => {
    if (!selectedConfig) return;
    
    setEditLoading(true);
    setEditSuccess(false);
    try {
      const token = localStorage.getItem('authToken') || '';
      // Prepare update payload (similar to create but with budget_id)
      const updateData = {
        budget_id: selectedConfig.budget_id,
        ...selectedConfig,
      };
      
      // Call update API (assuming this exists in service)
      // For now, just show success message
      setEditSuccess(true);
      setTimeout(() => {
        setModalOpen(false);
        setIsEditMode(false);
        // Refresh configurations list
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Error updating configuration:", err);
      alert("Failed to update configuration: " + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const getBudgetDisplayText = (config) => {
    if (config.budgetControlEnabled && config.budgetControlLimit) {
      return `Budget Limit: ₱${config.budgetControlLimit.toLocaleString()}`;
    }
    return "Unlimited Budget";
  };

  const getBudgetUsageColor = (budgetUsed, budgetLimit) => {
    if (!budgetLimit || budgetLimit === 0) {
      return "text-blue-400"; // Default color for unlimited budget
    }
    
    const percentage = (budgetUsed / budgetLimit) * 100;
    
    if (percentage >= 100) {
      return "text-red-400"; // Dark red for >= 100%
    } else if (percentage >= 90) {
      return "text-orange-400"; // Orange for >= 90%
    } else if (percentage >= 75) {
      return "text-yellow-400"; // Yellow for >= 75%
    } else {
      return "text-green-400"; // Green for < 75%
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-1">Filter Configurations</h2>
          <p className="text-sm text-gray-400">Search and filter budget configurations</p>
        </div>
        
        <div className="space-y-4">
          {/* Search and Filters in one line */}
          <div className="grid grid-cols-12 gap-4 items-end">
            {/* Search Bar - takes more space */}
            <div className="col-span-6 space-y-2">
              <Label htmlFor="search" className="text-sm text-white font-medium">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by configuration name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                />
              </div>
            </div>

            {/* Filter Dropdowns - smaller size */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="filterGeo" className="text-sm text-white font-medium">Geo</Label>
              <Select value={filterGeo} onValueChange={setFilterGeo}>
                <SelectTrigger 
                  id="filterGeo" 
                  className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                >
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-gray-300">
                  <SelectItem value="all" className="text-white focus:bg-slate-700">All Locations</SelectItem>
                  <SelectItem value="Philippines" className="text-white focus:bg-slate-700">Philippines</SelectItem>
                  <SelectItem value="Singapore" className="text-white focus:bg-slate-700">Singapore</SelectItem>
                  <SelectItem value="Malaysia" className="text-white focus:bg-slate-700">Malaysia</SelectItem>
                  <SelectItem value="Thailand" className="text-white focus:bg-slate-700">Thailand</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="filterLocation" className="text-sm text-white font-medium">Location</Label>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger 
                  id="filterLocation" 
                  className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                >
                  <SelectValue placeholder="All Sites" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-gray-300">
                  <SelectItem value="all" className="text-white focus:bg-slate-700">All Sites</SelectItem>
                  <SelectItem value="Manila" className="text-white focus:bg-slate-700">Manila</SelectItem>
                  <SelectItem value="Cebu" className="text-white focus:bg-slate-700">Cebu</SelectItem>
                  <SelectItem value="Clark" className="text-white focus:bg-slate-700">Clark</SelectItem>
                  <SelectItem value="Davao" className="text-white focus:bg-slate-700">Davao</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="filterClient" className="text-sm text-white font-medium">Organization</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger 
                  id="filterClient" 
                  className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                >
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-gray-300">
                  <SelectItem value="all" className="text-white focus:bg-slate-700">All Clients</SelectItem>
                  <SelectItem value="PLDT" className="text-white focus:bg-slate-700">PLDT</SelectItem>
                  <SelectItem value="Globe" className="text-white focus:bg-slate-700">Globe</SelectItem>
                  <SelectItem value="Smart" className="text-white focus:bg-slate-700">Smart</SelectItem>
                  <SelectItem value="DITO" className="text-white focus:bg-slate-700">DITO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Configurations Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-1">Configurations</h2>
          <p className="text-sm text-gray-400">Select a configuration to submit a request</p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-red-300 hover:text-red-200 text-xs mt-2 underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader className="h-6 w-6 text-pink-500 animate-spin" />
              <p className="text-gray-400 text-sm">Loading configurations...</p>
            </div>
          </div>
        ) : filteredConfigurations.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-gray-400">No configurations found matching your filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConfigurations.map((config) => {
              const approvalInfo = getApprovalStatusInfo(config.approvalStatus);
              const StatusIcon = approvalInfo.icon;

              return (
                <div
                  key={config.id}
                  className="bg-slate-700 border border-slate-600 rounded-lg p-4 hover:bg-slate-600/50 transition-colors cursor-pointer"
                  onClick={() => handleConfigClick(config)}
                >
                  <div className="flex items-center justify-between">
                    {/* Configuration Name and Period */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-white">{config.name}</h3>
                        <Badge variant="outline" className="text-xs border-slate-500 text-gray-300 bg-slate-600">
                          {config.dateRangeLabel || "Not specified"}
                        </Badge>
                        {config.ongoingApprovals > 0 && (
                          <Badge className="bg-orange-500 text-white text-xs">
                            {config.ongoingApprovals} ongoing approval{config.ongoingApprovals !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{config.department}</p>
                    </div>

                    {/* Budget Used/Limit */}
                    <div className="text-center px-4">
                      <p className="text-lg font-bold mb-1">
                        <span className="text-xs text-gray-400 font-normal">Used: </span>
                        <span className={getBudgetUsageColor(config.budgetUsed, config.budgetControlLimit)}>
                          ₱{config.budgetUsed?.toLocaleString() || '0'}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {config.budgetControlEnabled && config.budgetControlLimit 
                          ? `/ ₱${config.budgetControlLimit.toLocaleString()}` 
                          : "/ Unlimited"}
                      </p>
                    </div>

                    {/* Location */}
                    <div className="text-center px-4 min-w-[120px]">
                      <p className="text-xs text-gray-400 mb-1">Location</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {config.geo.slice(0, 2).map((location) => (
                          <span key={location} className="text-sm text-white">
                            {location}
                          </span>
                        ))}
                        {config.geo.length > 2 && (
                          <span className="text-sm text-gray-400">+{config.geo.length - 2}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Configuration Details Modal */}
        <Dialog open={modalOpen} onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setActiveTab("details"); // Reset to details tab when modal closes
        }}>
          <DialogContent 
            className="max-h-[85vh] bg-slate-800 border-slate-600 text-white overflow-hidden flex flex-col"
            style={{ width: '70vw', maxWidth: '70vw' }}
          >
            <DialogHeader className="flex-shrink-0 pb-2">
              <DialogTitle className="text-xl font-bold text-white">
                {selectedConfig?.name}
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-sm">
                Configuration Details and History
              </DialogDescription>
            </DialogHeader>
            
            {selectedConfig && (
              <div className="flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  <TabsList className="bg-slate-800 border-slate-700 p-1 flex-shrink-0 mb-3">
                    <TabsTrigger 
                      value="details" 
                      className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
                    >
                      Details
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

                  <TabsContent value="details" className="space-y-4 flex-1 overflow-y-auto">
                    {/* Description */}
                    <div>
                      <h4 className="font-medium text-white mb-2">Description</h4>
                      <p className="text-gray-300 text-sm">{selectedConfig.budget_description || "No description provided"}</p>
                    </div>

                    {/* Top Row: Dates, Limit Range, Budget Used */}
                    <div className="grid grid-cols-3 gap-6 text-sm">
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Budget Dates</label>
                        <p className="text-white font-semibold">
                          {selectedConfig.start_date || selectedConfig.startDate
                            ? `${selectedConfig.start_date || selectedConfig.startDate} → ${selectedConfig.end_date || selectedConfig.endDate}`
                            : "Not specified"}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Limit Range</label>
                        <p className="text-white font-semibold">
                          ₱{(selectedConfig.min_limit || 0).toLocaleString()} - ₱{(selectedConfig.max_limit || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Budget Used</label>
                        <p className="text-white font-semibold">
                          {selectedConfig.budget_tracking && selectedConfig.budget_tracking.length > 0 
                            ? `${selectedConfig.budget_tracking.reduce((sum, t) => sum + (t.budget_used || 0), 0)} / unlimited`
                            : "0 / unlimited"}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Row: OU (from Affected_OU), Geographic Locations (Geo), Clients (Client) */}
                    <div className="grid grid-cols-3 gap-6 text-sm">
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">OU</label>
                        <p className="text-white font-semibold">
                          {selectedConfig.access_scopes && selectedConfig.access_scopes.length > 0
                            ? (() => {
                                const affectedOU = selectedConfig.access_scopes.find(s => s.scope_type === 'Affected_OU');
                                if (affectedOU) {
                                  try {
                                    const parsed = JSON.parse(affectedOU.scope_value);
                                    return parsed.parent || "Not specified";
                                  } catch {
                                    return affectedOU.scope_value || "Not specified";
                                  }
                                }
                                return "Not specified";
                              })()
                            : "Not specified"}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Geographic Locations</label>
                        <p className="text-white font-semibold">
                          {selectedConfig.access_scopes && selectedConfig.access_scopes.length > 0
                            ? (() => {
                                const geoScope = selectedConfig.access_scopes.find(s => s.scope_type === 'Geo');
                                return geoScope ? geoScope.scope_value : "Not specified";
                              })()
                            : "Not specified"}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Clients</label>
                        <p className="text-white font-semibold">
                          {selectedConfig.access_scopes && selectedConfig.access_scopes.length > 0
                            ? (() => {
                                const clientScopes = selectedConfig.access_scopes.filter(s => s.scope_type === 'Client');
                                return clientScopes.length > 0 ? clientScopes.map(c => c.scope_value).join(", ") : "Not specified";
                              })()
                            : "Not specified"}
                        </p>
                      </div>
                    </div>

                    {/* Approval Hierarchy - 3 columns */}
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider block mb-3">Approval Hierarchy</label>
                      {selectedConfig.approvers && selectedConfig.approvers.length > 0 ? (
                        <div className="grid grid-cols-3 gap-4">
                          {selectedConfig.approvers.map((approver) => (
                            <div key={approver.approver_id} className="bg-slate-700/40 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                  {approver.approval_level}
                                </div>
                                <span className="text-white font-semibold text-base">Level {approver.approval_level}</span>
                              </div>
                              <div className="space-y-2">
                                <p className="text-gray-300 text-sm">
                                  <span className="text-gray-400">Primary:</span> <span className="text-white font-semibold">{approver.approver_name || "Not assigned"}</span>
                                </p>
                                <p className="text-gray-400 text-xs">
                                  {approver.approver_email || "N/A"}
                                </p>
                                {approver.backup_approver_name && (
                                  <>
                                    <p className="text-gray-300 text-sm pt-2">
                                      <span className="text-gray-400">Backup:</span> <span className="text-white font-semibold">{approver.backup_approver_name}</span>
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                      {approver.backup_approver_email || "N/A"}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">No approvers configured</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-3 flex-1 overflow-y-auto">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-white">Budget Usage Summary</h4>
                        <p className="text-xs text-gray-400">Showing budget tracking data from database</p>
                      </div>
                      
                      <div className="h-[480px] overflow-y-auto border border-slate-600 rounded-lg">
                        {selectedConfig?.budget_tracking && selectedConfig.budget_tracking.length > 0 ? (
                          <table className="w-full text-sm">
                            <thead className="bg-slate-700 sticky top-0">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium text-slate-200 whitespace-nowrap">Period</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-200 whitespace-nowrap">Total Budget</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-200 whitespace-nowrap">Budget Used</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-200 whitespace-nowrap">Budget Remaining</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-200 whitespace-nowrap">Budget Carryover</th>
                                <th className="px-4 py-3 text-center font-medium text-slate-200 whitespace-nowrap">Approved</th>
                                <th className="px-4 py-3 text-center font-medium text-slate-200 whitespace-nowrap">Rejected</th>
                                <th className="px-4 py-3 text-center font-medium text-slate-200 whitespace-nowrap">Pending</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-600">
                              {selectedConfig.budget_tracking.map((tracking) => (
                                <tr key={tracking.tracking_id} className="hover:bg-slate-700/20">
                                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{tracking.period_label}</td>
                                  <td className="px-4 py-3 text-slate-300 font-semibold whitespace-nowrap">₱{(tracking.total_budget || 0).toLocaleString()}</td>
                                  <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">₱{(tracking.budget_used || 0).toLocaleString()}</td>
                                  <td className="px-4 py-3 text-green-400 font-semibold whitespace-nowrap">₱{(tracking.budget_remaining || 0).toLocaleString()}</td>
                                  <td className="px-4 py-3 text-blue-400 font-semibold whitespace-nowrap">
                                    {tracking.budget_carryover > 0 ? `₱${(tracking.budget_carryover || 0).toLocaleString()}` : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge className="bg-green-500/20 text-green-400 border-green-400">
                                      {tracking.approval_count_approved || 0}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge className="bg-red-500/20 text-red-400 border-red-400">
                                      {tracking.approval_count_rejected || 0}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400">
                                      {tracking.approval_count_pending || 0}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <p>No budget tracking data available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="logs" className="space-y-3 flex-1 overflow-y-auto">
                    <div className="space-y-2">
                      <h4 className="font-medium text-white">Detailed Request Logs</h4>
                      <p className="text-xs text-gray-400">Showing request logs from database</p>
                      <div className="h-[480px] overflow-y-auto border border-slate-600 rounded-lg">
                        {selectedConfig?.request_logs && selectedConfig.request_logs.length > 0 ? (
                          <table className="w-full text-sm">
                            <thead className="bg-slate-700 sticky top-0">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium text-slate-200 whitespace-nowrap">Request ID</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-200 whitespace-nowrap">Employee</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-200 whitespace-nowrap">Amount</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-200 whitespace-nowrap">Date</th>
                                <th className="px-4 py-3 text-center font-medium text-slate-200 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-200">Reason</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-600">
                              {selectedConfig.request_logs.map((request) => (
                                <tr key={request.request_id} className="hover:bg-slate-700/20">
                                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{request.request_id}</td>
                                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{request.employee_name || 'N/A'}</td>
                                  <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">₱{(request.amount || 0).toLocaleString()}</td>
                                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{request.created_at?.split('T')[0] || 'N/A'}</td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge className={
                                      request.status === "completed" ? "bg-sky-400/20 text-sky-400 border-sky-400" :
                                      request.status === "rejected" ? "bg-pink-500/20 text-pink-400 border-pink-400" :
                                      "bg-yellow-500/20 text-yellow-400 border-yellow-400"
                                    }>
                                      {request.status || 'pending'}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate" title={request.reason}>
                                    {request.reason || 'No reason provided'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <p>No request logs available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            <DialogFooter className="flex justify-end border-t border-slate-600 pt-3 flex-shrink-0 mt-2">
              {activeTab === "details" ? (
                <Button 
                  onClick={handleEditConfig}
                  disabled={editLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {editLoading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editSuccess ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Updated
                    </>
                  ) : (
                    <>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Configuration
                    </>
                  )}
                </Button>
              ) : (
                <Button className="bg-green-600 hover:bg-green-700 text-white font-medium">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

const STEPS = [
  "Setup",
  "Country/Geo", 
  "Tenure Group & Approvers",
  "Review",
];

function CreateConfiguration() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
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
    // Setup - Step 1
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
    
    // Affected OUs - Multiple hierarchical paths
    // Format: Array of paths where each path is an array of OUs [parent, child, grandchild, ...]
    affectedOUPaths: [],
    
    // Accessible OUs (Access) - Multiple hierarchical paths
    accessibleOUPaths: [],
    
    // Country/Geo - Step 2  
    countries: [],
    siteLocation: [],
    clients: [],
    
    // Tenure & Approvers - Step 3
    selectedTenureGroups: [],
    approverL1: "",
    backupApproverL1: "",
    approverL2: "",
    backupApproverL2: "",
    approverL3: "",
    backupApproverL3: "",
  });

  // Fetch approvers from API when component mounts - using parallel calls for instant load
  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        setApprovalsLoading(true);
        console.log('Fetching approvers with token:', user?.token ? 'Present' : 'Missing');
        
        // Fetch all approver levels in parallel
        const [l1Data, l2Data, l3Data] = await Promise.all([
          budgetConfigService.getApproversByLevel("L1", user?.token),
          budgetConfigService.getApproversByLevel("L2", user?.token),
          budgetConfigService.getApproversByLevel("L3", user?.token),
        ]);
        
        console.log('L1 Approvers:', l1Data);
        console.log('L2 Approvers:', l2Data);
        console.log('L3 Approvers:', l3Data);
        
        setApprovalsL1(l1Data || []);
        setApprovalsL2(l2Data || []);
        setApprovalsL3(l3Data || []);
        setApprovalsLoading(false);
      } catch (err) {
        console.error("Error fetching approvers:", err);
        setApprovalsLoading(false);
        // Set empty arrays on error so UI doesn't stay loading forever
        setApprovalsL1([]);
        setApprovalsL2([]);
        setApprovalsL3([]);
      }
    };

    // Always fetch, even without token (backend may allow it)
    fetchApprovers();
  }, [user?.token]);

  // Fetch organizations from API when component mounts
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setOrganizationsLoading(true);
        console.log('Fetching organizations with token:', user?.token ? 'Present' : 'Missing');
        const data = await budgetConfigService.getOrganizations(user?.token);
        console.log('Organizations:', data);
        setOrganizations(data || []);
        setOrganizationsLoading(false);
      } catch (err) {
        console.error("Error fetching organizations:", err);
        setOrganizationsLoading(false);
        // Set empty array on error
        setOrganizations([]);
      }
    };

    // Always fetch, even without token
    fetchOrganizations();
  }, [user?.token]);

  // Helper function to build organization hierarchy from flat data
  const buildOrgHierarchy = () => {
    if (!organizations.length) return { parents: [], childOUs: {}, grandchildOUs: {} };
    
    const parents = organizations.filter(org => !org.parent_org_id);
    const childOUs = {};
    const grandchildOUs = {};
    
    parents.forEach(parent => {
      childOUs[parent.org_id] = organizations.filter(org => org.parent_org_id === parent.org_id);
    });
    
    const children = Object.values(childOUs).flat();
    children.forEach(child => {
      grandchildOUs[child.org_id] = organizations.filter(org => org.parent_org_id === child.org_id);
    });
    
    return { parents, childOUs, grandchildOUs };
  };

  const { parents: parentOrgs, childOUs: childOrgMap, grandchildOUs: grandchildOrgMap } = buildOrgHierarchy();

  // Helper function to get organization name by ID
  const getOrgName = (orgId) => {
    const org = organizations.find(o => o.org_id === orgId);
    return org ? org.org_name : orgId;
  };

  // Helper function to convert a path array to a readable string of org names
  const pathToReadable = (path) => {
    return path.map(id => getOrgName(id)).join(' → ');
  };

  // Helper function to build preview lines for affected OUs
  const buildAffectedPreviewLines = () => {
    const paths = formData.affectedOUPaths || [];
    if (!paths.length) return [];

    const parentIds = new Set();
    paths.forEach(path => {
      if (path[0]) parentIds.add(path[0]);
    });

    const lines = [];

    parentIds.forEach(parentId => {
      const children = childOrgMap[parentId] || [];
      const parentSelected = paths.some(path => path[0] === parentId && path.length === 1);

      const childSelections = new Map();
      paths.forEach(path => {
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

      const allChildrenFullySelected =
        children.length > 0 && children.every(child => isChildAllSelected(child.org_id));

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

        const selectedGrandchildren = Array.from(entry.grandchildIds).map(id => getOrgName(id));
        if (selectedGrandchildren.length > 0) {
          lines.push({
            key: `${parentId}-${childId}-partial`,
            text: `${getOrgName(parentId)} → ${getOrgName(childId)} → ${selectedGrandchildren.join(', ')}`,
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
      formData.affectedOUPaths.filter(path => {
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
    paths.forEach(path => {
      if (path[0]) parentIds.add(path[0]);
    });

    const lines = [];

    parentIds.forEach(parentId => {
      const children = childOrgMap[parentId] || [];
      const parentSelected = paths.some(path => path[0] === parentId && path.length === 1);

      const childSelections = new Map();
      paths.forEach(path => {
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

      const allChildrenFullySelected =
        children.length > 0 && children.every(child => isChildAllSelected(child.org_id));

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

        const selectedGrandchildren = Array.from(entry.grandchildIds).map(id => getOrgName(id));
        if (selectedGrandchildren.length > 0) {
          lines.push({
            key: `${parentId}-${childId}-partial`,
            text: `${getOrgName(parentId)} → ${getOrgName(childId)} → ${selectedGrandchildren.join(', ')}`,
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
      formData.accessibleOUPaths.filter(path => {
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

  const getStepValidationError = (stepIndex) => {
    if (stepIndex === 0) {
      if (!formData.budgetName?.trim()) return "Budget name is required.";
      if (!formData.startDate) return "Start date is required.";
      if (!formData.endDate) return "End date is required.";
      if (!formData.limitMin) return "Min limit is required.";
      if (!formData.limitMax) return "Max limit is required.";
      if (formData.budgetControlEnabled && !formData.budgetControlLimit) {
        return "Budget limit is required when budget control is enabled.";
      }
    }

    if (stepIndex === 1) {
      if (!formData.countries || formData.countries.length === 0) return "Country is required.";
      if (!formData.siteLocation || formData.siteLocation.length === 0) return "Site location is required.";
      if (!formData.clients || formData.clients.length === 0) return "At least one client is required.";
      if (!formData.affectedOUPaths || formData.affectedOUPaths.length === 0) return "Affected OU selection is required.";
      if (!formData.accessibleOUPaths || formData.accessibleOUPaths.length === 0) return "Accessible OU selection is required.";
    }

    if (stepIndex === 2) {
      if (!formData.selectedTenureGroups || formData.selectedTenureGroups.length === 0) {
        return "At least one tenure group is required.";
      }
      if (!formData.approverL1) return "Primary L1 approver is required.";
      if (!formData.backupApproverL1) return "Backup L1 approver is required.";
      if (!formData.approverL2) return "Primary L2 approver is required.";
      if (!formData.backupApproverL2) return "Backup L2 approver is required.";
      if (!formData.approverL3) return "Primary L3 approver is required.";
      if (!formData.backupApproverL3) return "Backup L3 approver is required.";
    }

    return null;
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      const errorMessage = getStepValidationError(currentStep);
      if (errorMessage) {
        setStepError(errorMessage);
        return;
      }
      setStepError(null);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setStepError(null);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Prepare data for API - match backend field names exactly
      const configData = {
        budgetName: formData.budgetName,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        budget_description: formData.description || "",
        minLimit: formData.limitMin ? parseFloat(formData.limitMin) : 0,
        maxLimit: formData.limitMax ? parseFloat(formData.limitMax) : 0,
        budgetControlEnabled: formData.budgetControlEnabled,
        budgetControlLimit: formData.budgetControlEnabled ? parseFloat(formData.budgetControlLimit) : null,
        budgetCarryoverEnabled: formData.budgetCarryoverEnabled,
        carryoverPercentage: formData.budgetCarryoverEnabled ? parseFloat(formData.carryoverPercentage) : 100,
        
        // Scope fields
        countries: formData.countries || [],
        siteLocation: formData.siteLocation || [],
        clients: formData.clients || [],
        
        // NEW: Multiple hierarchical paths format
        // Each path is an array: [parent, child, grandchild, ...]
        affectedOUPaths: formData.affectedOUPaths || [],
        accessibleOUPaths: formData.accessibleOUPaths || [],
        
        // Tenure groups and approvers
        selectedTenureGroups: formData.selectedTenureGroups || [],
        approverL1: formData.approverL1 || null,
        backupApproverL1: formData.backupApproverL1 || null,
        approverL2: formData.approverL2 || null,
        backupApproverL2: formData.backupApproverL2 || null,
        approverL3: formData.approverL3 || null,
        backupApproverL3: formData.backupApproverL3 || null,
      };

      console.log('=== Frontend Form Data Before Submit ===');
      console.log(JSON.stringify(configData, null, 2));
      console.log('========================================');

      // Validation: At least one scope field must be provided
      const hasScope = (configData.countries && configData.countries.length > 0) ||
                      (configData.siteLocation && configData.siteLocation.length > 0) ||
                      (configData.affectedOUPaths && configData.affectedOUPaths.length > 0);
      
      if (!hasScope) {
        setSubmitError("Please select at least one of: Country, Location, or Affected OU");
        setIsSubmitting(false);
        return;
      }

      // Create the budget configuration
      const result = await budgetConfigService.createBudgetConfiguration(configData, user?.token);
      
      setSubmitSuccess(true);
      setSuccessCountdown(5);
      setSuccessModalOpen(true);
      
      // Reset form
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
      
      // Reset step to list
      setCurrentStep(0);
      
      // Clear success message after 3 seconds
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

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
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
                <h3 className="font-semibold text-amber-400">Incomplete Step</h3>
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
      
      {/* Progress Steps */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                      index < currentStep
                        ? "border-pink-500 bg-pink-500 text-white"
                        : index === currentStep
                          ? "border-pink-500 bg-slate-800 text-pink-500"
                          : "border-gray-600 bg-slate-800 text-gray-400"
                    )}
                  >
                    {index < currentStep ? <Check className="h-5 w-5" /> : index + 1}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium text-center",
                      index <= currentStep ? "text-white" : "text-gray-400"
                    )}
                  >
                    {step}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors mx-4",
                      index < currentStep ? "bg-pink-500" : "bg-gray-600"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Wizard Content with Compact Panels */}
      <div className="grid gap-6">
        {/* Step 1: Setup */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
                  Setup Configuration
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Basic budget information and control settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-white">Basic Information</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="budgetName" className="text-white">Budget Name *</Label>
                      <Input
                        id="budgetName"
                        placeholder="e.g., Q1 2024 Performance Bonus"
                        value={formData.budgetName}
                        onChange={(e) => updateField("budgetName", e.target.value)}
                        className="bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Budget Period *</Label>
                      <div className="flex items-center gap-3">
                        <Label htmlFor="startDate" className="text-white text-xs whitespace-nowrap">Start Date:</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => updateField("startDate", e.target.value)}
                          className="bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                        />
                        <Label htmlFor="endDate" className="text-white text-xs whitespace-nowrap">End Date:</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => updateField("endDate", e.target.value)}
                          className="bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Description Field */}
                  <div className="space-y-2">
                    <Label htmlFor="budgetDescription" className="text-white">Description</Label>
                    <textarea
                      id="budgetDescription"
                      placeholder="Describe the purpose and details of this budget configuration..."
                      value={formData.description || ''}
                      onChange={(e) => updateField("description", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-700 border border-gray-300 rounded-md text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 resize-none"
                    />
                    <p className="text-xs text-gray-500">Optional: Provide additional context about this budget configuration's purpose and usage.</p>
                  </div>
                </div>

                {/* Control Panels - Data and Budget Control */}
                <div className="grid gap-4 lg:grid-cols-2 md:grid-cols-2">
                  {/* Data Control Panel - Always Enabled */}
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">Data Control</h4>
                      <Badge className="bg-green-500 text-white">Enabled</Badge>
                    </div>
                    <p className="text-sm text-gray-400">Set min and max limits per employee</p>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
                      <p className="text-xs text-blue-300">
                        <strong>Note:</strong> Min and Max limits apply to both positive and negative amounts. 
                        Negative amounts (adjustments/deductions) within these limits will generate warnings but remain valid for processing.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="limitMin" className="text-white">Min Limit *</Label>
                        <Input
                          id="limitMin"
                          type="number"
                          placeholder="0"
                          value={formData.limitMin}
                          onChange={(e) => updateField("limitMin", e.target.value)}
                          className="bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
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
                          className="bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Budget Control & Client Sponsored Panel */}
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
                    <div className="space-y-4">
                      {/* Budget Control Section */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
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
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="budgetControlLimit" className="text-white">Budget Limit *</Label>
                              <Input
                                id="budgetControlLimit"
                                type="number"
                                placeholder="100000"
                                value={formData.budgetControlLimit}
                                onChange={(e) => updateField("budgetControlLimit", e.target.value)}
                                className="bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                              />
                              <p className="text-xs text-gray-400">
                                Max total budget amount
                              </p>
                            </div>

                            {/* Budget Carry Over Option */}
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
                                  <Label htmlFor="carryoverPercentage" className="text-white">Carry Over Percentage *</Label>
                                  <Input
                                    id="carryoverPercentage"
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="100"
                                    value={formData.carryoverPercentage || "100"}
                                    onChange={(e) => {
                                      const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                      updateField("carryoverPercentage", value.toString());
                                    }}
                                    className="bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                                  />
                                  <p className="text-xs text-gray-400">
                                    Percentage of unused budget to carry over (0-100%, default: 100%)
                                  </p>
                                </div>
                              )}

                              <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
                                <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-md">
                                  <button
                                    onClick={() => setSuccessModalOpen(false)}
                                    className="absolute right-4 top-4 text-sm text-gray-300 hover:text-white"
                                  >
                                    Close({successCountdown}s)
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
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Enable to set budget limits</p>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Country/Geo */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
                  Country & Geographic Settings
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Define location, client, and organizational unit access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Top Row: Location Settings and Client & Organization */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Left: Location Settings & Clients Panel */}
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-white">Location & Clients</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white">Countries</Label>
                        <Select value={formData.countries.length > 0 ? formData.countries[0] : ""} onValueChange={(value) => updateField("countries", value ? [value] : [])}>
                          <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                            <SelectValue placeholder="Select country" />
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
                        <Label className="text-white">Site Location</Label>
                        <Select value={formData.siteLocation.length > 0 ? formData.siteLocation[0] : ""} onValueChange={(value) => updateField("siteLocation", value ? [value] : [])}>
                          <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                            <SelectValue placeholder="Select site location" />
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
                        <Label className="text-white">Clients (Multi-select)</Label>
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
                          placeholder="Select clients"
                          hasAllOption={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Organization Panel */}
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-white">Organization</h4>
                    <div className="space-y-4">

                      {/* Affected OUs - Tree-Based Selector with Checkboxes */}
                      <div className="space-y-1">
                        <Label className="text-white font-medium text-sm">Affected OUs</Label>
                        
                        {/* OU Tree Selector */}
                        <div className="bg-slate-600/30 rounded text-sm">
                          {(() => {
                            // Helper function to check if an OU is selected at any path level
                            const isOUSelected = (ouValue, level) => {
                              return formData.affectedOUPaths.some(path => {
                                if (level === 'parent') return path[0] === ouValue;
                                if (level === 'child') return path[1] === ouValue;
                                if (level === 'grandchild') return path[2] === ouValue;
                                return false;
                              });
                            };

                            // Helper to toggle a path
                            const togglePath = (newPath) => {
                              const pathExists = formData.affectedOUPaths.some(p => JSON.stringify(p) === JSON.stringify(newPath));
                              if (pathExists) {
                                updateField("affectedOUPaths", formData.affectedOUPaths.filter(p => JSON.stringify(p) !== JSON.stringify(newPath)));
                              } else {
                                updateField("affectedOUPaths", [...formData.affectedOUPaths, newPath]);
                              }
                            };

                            const parentOUs = parentOrgs;
                            const childOUs = childOrgMap;
                            const grandchildOUs = grandchildOrgMap;

                            return (
                              <div className="max-h-80 overflow-y-auto border border-slate-500 rounded bg-slate-700/40 p-2">
                                {organizationsLoading ? (
                                  <div className="text-gray-400 text-sm p-2">Loading organizations...</div>
                                ) : parentOUs.length === 0 ? (
                                  <div className="text-gray-400 text-sm p-2">No organizations available</div>
                                ) : (
                                  parentOUs.map((parent) => {
                                    const isParentSelected = isOUSelected(parent.org_id, 'parent');
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

                                        {/* Children - Show if parent path exists */}
                                        {formData.affectedOUPaths.some(path => path[0] === parent.org_id) && childOUs[parent.org_id] && (
                                          <div className="ml-4 space-y-0">
                                            {childOUs[parent.org_id].map((child) => {
                                              const isChildSelected = isOUSelected(child.org_id, 'child');
                                              return (
                                                <div key={child.org_id} className="space-y-0">
                                                  <div className="flex items-center gap-1 p-1 hover:bg-slate-600/50 rounded">
                                                    <Checkbox
                                                      id={`ou-${child.org_id}`}
                                                      checked={isChildSelected}
                                                      onCheckedChange={() => togglePath([parent.org_id, child.org_id])}
                                                      className="border-pink-400 bg-slate-600 h-4 w-4"
                                                    />
                                                    <span className="text-gray-300 text-xs">{child.org_name}</span>
                                                  </div>

                                                  {/* Grandchildren - Show if parent-child path exists */}
                                                  {formData.affectedOUPaths.some(path => path[0] === parent.org_id && path[1] === child.org_id) && grandchildOUs[child.org_id] && (
                                                    <div className="ml-4 space-y-0">
                                                      {grandchildOUs[child.org_id].map((grandchild) => {
                                                        const isGrandchildSelected = isOUSelected(grandchild.org_id, 'grandchild');
                                                        return (
                                                          <div key={grandchild.org_id} className="flex items-center gap-1 p-1 hover:bg-slate-600/50 rounded">
                                                            <Checkbox
                                                              id={`ou-${grandchild.org_id}`}
                                                              checked={isGrandchildSelected}
                                                              onCheckedChange={() => togglePath([parent.org_id, child.org_id, grandchild.org_id])}
                                                              className="border-pink-400 bg-slate-600 h-4 w-4"
                                                            />
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
                            );
                          })()}
                        </div>

                        {/* Selected Paths - Condensed Preview */}
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

                      {/* Accessible OUs (Access) - Tree-Based Selector with Checkboxes */}
                      <div className="space-y-1">
                        <Label className="text-white font-medium text-sm">Accessible OUs</Label>
                        
                        {/* Access OU Tree Selector */}
                        <div className="bg-slate-600/30 rounded text-sm">
                          {(() => {
                            // Helper function to check if an OU is selected at any path level
                            const isAccessOUSelected = (ouValue, level) => {
                              return formData.accessibleOUPaths.some(path => {
                                if (level === 'parent') return path[0] === ouValue;
                                if (level === 'child') return path[1] === ouValue;
                                if (level === 'grandchild') return path[2] === ouValue;
                                return false;
                              });
                            };

                            // Helper to toggle a path
                            const toggleAccessPath = (newPath) => {
                              const pathExists = formData.accessibleOUPaths.some(p => JSON.stringify(p) === JSON.stringify(newPath));
                              if (pathExists) {
                                updateField("accessibleOUPaths", formData.accessibleOUPaths.filter(p => JSON.stringify(p) !== JSON.stringify(newPath)));
                              } else {
                                updateField("accessibleOUPaths", [...formData.accessibleOUPaths, newPath]);
                              }
                            };

                            const parentAccessOUs = parentOrgs;
                            const childAccessOUs = childOrgMap;
                            const grandchildAccessOUs = grandchildOrgMap;

                            return (
                              <div className="max-h-80 overflow-y-auto border border-slate-500 rounded bg-slate-700/40 p-2">
                                {organizationsLoading ? (
                                  <div className="text-gray-400 text-sm p-2">Loading organizations...</div>
                                ) : parentAccessOUs.length === 0 ? (
                                  <div className="text-gray-400 text-sm p-2">No organizations available</div>
                                ) : (
                                  parentAccessOUs.map((parent) => {
                                    const isParentSelected = isAccessOUSelected(parent.org_id, 'parent');
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

                                        {/* Children - Show if parent path exists */}
                                        {formData.accessibleOUPaths.some(path => path[0] === parent.org_id) && childAccessOUs[parent.org_id] && (
                                          <div className="ml-4 space-y-0">
                                            {childAccessOUs[parent.org_id].map((child) => {
                                              const isChildSelected = isAccessOUSelected(child.org_id, 'child');
                                              return (
                                                <div key={child.org_id} className="space-y-0">
                                                  <div className="flex items-center gap-1 p-1 hover:bg-slate-600/50 rounded">
                                                    <Checkbox
                                                      id={`access-ou-${child.org_id}`}
                                                      checked={isChildSelected}
                                                      onCheckedChange={() => toggleAccessPath([parent.org_id, child.org_id])}
                                                      className="border-blue-400 bg-slate-600 h-4 w-4"
                                                    />
                                                    <span className="text-gray-300 text-xs">{child.org_name}</span>
                                                  </div>

                                                  {/* Grandchildren - Show if parent-child path exists */}
                                                  {formData.accessibleOUPaths.some(path => path[0] === parent.org_id && path[1] === child.org_id) && grandchildAccessOUs[child.org_id] && (
                                                    <div className="ml-4 space-y-0">
                                                      {grandchildAccessOUs[child.org_id].map((grandchild) => {
                                                        const isGrandchildSelected = isAccessOUSelected(grandchild.org_id, 'grandchild');
                                                        return (
                                                          <div key={grandchild.org_id} className="flex items-center gap-1 p-1 hover:bg-slate-600/50 rounded">
                                                            <Checkbox
                                                              id={`access-ou-${grandchild.org_id}`}
                                                              checked={isGrandchildSelected}
                                                              onCheckedChange={() => toggleAccessPath([parent.org_id, child.org_id, grandchild.org_id])}
                                                              className="border-blue-400 bg-slate-600 h-4 w-4"
                                                            />
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
                            );
                          })()}
                        </div>

                        {/* Selected Access Paths - Condensed Preview */}
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
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Tenure Groups & Approvers */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
                  Tenure Groups & Approvers
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure tenure requirements and approval hierarchy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Top Row: Tenure Groups (Left, smaller) and Approval Hierarchy (Right, larger) */}
                <div className="grid gap-6 grid-cols-12">
                  {/* Left: Tenure Groups Panel (3 columns - smaller) */}
                  <div className="col-span-2 bg-slate-700/50 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-white">Tenure Groups</h4>
                    <div className="space-y-4">
                      {[
                        { value: "0-6months", label: "0-6 Months" },
                        { value: "6-12months", label: "6-12 Months" },
                        { value: "1-2years", label: "1-2 Years" },
                        { value: "2-5years", label: "2-5 Years" },
                        { value: "5plus-years", label: "5+ Years" },
                      ].map((tenure) => (
                        <div key={tenure.value} className="flex items-center space-x-3">
                          <Checkbox
                            id={tenure.value}
                            checked={formData.selectedTenureGroups.includes(tenure.value)}
                            className="border-blue-400 bg-slate-600"
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateField("selectedTenureGroups", [...formData.selectedTenureGroups, tenure.value]);
                              } else {
                                updateField("selectedTenureGroups", formData.selectedTenureGroups.filter(t => t !== tenure.value));
                              }
                            }}
                          />
                          <Label htmlFor={tenure.value} className="cursor-pointer text-white text-base font-medium">
                            {tenure.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Approval Hierarchy Panel (9 columns - larger) */}
                  <div className="col-span-10 bg-slate-700/50 rounded-lg p-4 space-y-6">
                    <h4 className="font-medium text-white">Approval Hierarchy</h4>
                    
                    {/* Level 1 Approvers */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-white flex items-center gap-2">
                        <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
                        Level 1 Approvers
                      </h5>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="approverL1" className="text-white">Primary Approver *</Label>
                          <Select
                            value={formData.approverL1}
                            onValueChange={(value) => {
                              updateField("approverL1", value);
                              if (formData.backupApproverL1 === value) {
                                updateField("backupApproverL1", "");
                              }
                            }}
                            disabled={approvalsLoading}
                          >
                            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                              <SelectValue placeholder={approvalsLoading ? "Loading approvers..." : "Select primary approver"} />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-gray-300">
                              {approvalsL1.map((approver) => (
                                <SelectItem key={approver.user_id} value={approver.user_id} className="text-white">
                                  {approver.first_name} {approver.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="backupApproverL1" className="text-white">Backup Approver *</Label>
                          <Select value={formData.backupApproverL1} onValueChange={(value) => updateField("backupApproverL1", value)} disabled={approvalsLoading}>
                            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                              <SelectValue placeholder={approvalsLoading ? "Loading approvers..." : "Select backup approver"} />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-gray-300">
                              {approvalsL1.filter((approver) => approver.user_id !== formData.approverL1).map((approver) => (
                                <SelectItem key={approver.user_id} value={approver.user_id} className="text-white">
                                  {approver.first_name} {approver.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Level 2 Approvers */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-white flex items-center gap-2">
                        <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
                        Level 2 Approvers
                      </h5>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="approverL2" className="text-white">Primary Approver *</Label>
                          <Select
                            value={formData.approverL2}
                            onValueChange={(value) => {
                              updateField("approverL2", value);
                              if (formData.backupApproverL2 === value) {
                                updateField("backupApproverL2", "");
                              }
                            }}
                            disabled={approvalsLoading}
                          >
                            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                              <SelectValue placeholder={approvalsLoading ? "Loading approvers..." : "Select primary approver"} />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-gray-300">
                              {approvalsL2.map((approver) => (
                                <SelectItem key={approver.user_id} value={approver.user_id} className="text-white">
                                  {approver.first_name} {approver.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="backupApproverL2" className="text-white">Backup Approver *</Label>
                          <Select value={formData.backupApproverL2} onValueChange={(value) => updateField("backupApproverL2", value)} disabled={approvalsLoading}>
                            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                              <SelectValue placeholder={approvalsLoading ? "Loading approvers..." : "Select backup approver"} />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-gray-300">
                              {approvalsL2.filter((approver) => approver.user_id !== formData.approverL2).map((approver) => (
                                <SelectItem key={approver.user_id} value={approver.user_id} className="text-white">
                                  {approver.first_name} {approver.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Level 3 Approvers */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-white flex items-center gap-2">
                        <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
                        Level 3 Approvers
                      </h5>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="approverL3" className="text-white">Primary Approver *</Label>
                          <Select
                            value={formData.approverL3}
                            onValueChange={(value) => {
                              updateField("approverL3", value);
                              if (formData.backupApproverL3 === value) {
                                updateField("backupApproverL3", "");
                              }
                            }}
                            disabled={approvalsLoading}
                          >
                            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                              <SelectValue placeholder={approvalsLoading ? "Loading approvers..." : "Select primary approver"} />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-gray-300">
                              {approvalsL3.map((approver) => (
                                <SelectItem key={approver.user_id} value={approver.user_id} className="text-white">
                                  {approver.first_name} {approver.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="backupApproverL3" className="text-white">Backup Approver *</Label>
                          <Select value={formData.backupApproverL3} onValueChange={(value) => updateField("backupApproverL3", value)} disabled={approvalsLoading}>
                            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                              <SelectValue placeholder={approvalsLoading ? "Loading approvers..." : "Select backup approver"} />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-gray-300">
                              {approvalsL3.filter((approver) => approver.user_id !== formData.approverL3).map((approver) => (
                                <SelectItem key={approver.user_id} value={approver.user_id} className="text-white">
                                  {approver.first_name} {approver.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">4</div>
                  Review Configuration
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Review all settings before creating the budget configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Three Equal Panels Layout */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Setup Information Panel */}
                  <div className="bg-slate-700/50 rounded-lg p-5 space-y-4">
                    <h4 className="font-semibold text-white text-lg mb-4">Setup Information</h4>
                    <div className="grid gap-3 text-base">
                      <div className="flex justify-between items-start">
                        <span className="text-gray-300 font-medium">Budget Name:</span>
                        <span className="text-white font-semibold text-right max-w-[60%]">{formData.budgetName || "Not specified"}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-gray-300 font-medium">Description:</span>
                        <span className="text-white text-sm text-right max-w-[60%] leading-relaxed">{formData.description || "No description provided"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 font-medium">Budget Dates:</span>
                        <span className="text-white font-semibold">
                          {formData.startDate && formData.endDate
                            ? `${formData.startDate} → ${formData.endDate}`
                            : "Not specified"}
                        </span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-gray-300 font-medium">Accessible OU Paths:</span>
                        <span className="text-white text-sm text-right max-w-[60%]">
                          {formData.accessibleOUPaths.length > 0 
                            ? formData.accessibleOUPaths.map((path, idx) => (
                              <div key={idx} className="text-xs text-blue-300 mb-1">
                                {pathToReadable(path)}
                              </div>
                            ))
                            : "Not specified"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 font-medium">Data Control:</span>
                        <span className="text-white font-semibold">Enabled</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 font-medium">Min/Max Limit:</span>
                        <span className="text-white font-semibold">{formData.limitMin || "0"} - {formData.limitMax || "∞"}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-gray-300 font-medium">Budget Control:</span>
                        <span className="text-white font-semibold text-right max-w-[60%]">{formData.budgetControlEnabled ? `Enabled (${formData.budgetControlLimit || "No limit"})` : "Disabled"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Geographic & Organization Panel */}
                  <div className="bg-slate-700/50 rounded-lg p-5 space-y-4">
                    <h4 className="font-semibold text-white text-lg mb-4">Geographic & Organization</h4>
                    <div className="grid gap-3 text-base">
                      <div className="flex justify-between items-start">
                        <span className="text-gray-300 font-medium">Countries:</span>
                        <span className="text-white font-semibold text-right max-w-[60%]">{formData.countries.length ? formData.countries.map(code => {
                          const countryMap = { ph: "Philippines", sg: "Singapore", my: "Malaysia", th: "Thailand", id: "Indonesia" };
                          return countryMap[code] || code;
                        }).join(", ") : "None selected"}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-gray-300 font-medium">Site Location:</span>
                        <span className="text-white font-semibold text-right max-w-[60%]">{formData.siteLocation.length ? formData.siteLocation.map(code => {
                          const siteMap = { "metro-manila": "Metro Manila", cebu: "Cebu", davao: "Davao", "singapore-central": "Singapore Central", "kuala-lumpur": "Kuala Lumpur" };
                          return siteMap[code] || code;
                        }).join(", ") : "None selected"}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-gray-300 font-medium">Clients:</span>
                        <span className="text-white font-semibold text-right max-w-[60%]">{formData.clients.length ? formData.clients.map(code => {
                          const clientMap = { pldt: "PLDT", globe: "Globe Telecom", smart: "Smart Communications", converge: "Converge ICT", dito: "DITO Telecommunity" };
                          return clientMap[code] || code;
                        }).join(", ") : "None selected"}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-gray-300 font-medium">Affected OU Paths:</span>
                        <span className="text-white text-sm text-right max-w-[60%]">
                          {formData.affectedOUPaths.length > 0 
                            ? formData.affectedOUPaths.map((path, idx) => (
                              <div key={idx} className="text-xs text-pink-300 mb-1">
                                {pathToReadable(path)}
                              </div>
                            ))
                            : "None selected"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tenure & Approvers Panel */}
                  <div className="bg-slate-700/50 rounded-lg p-5 space-y-4">
                    <h4 className="font-semibold text-white text-lg mb-4">Tenure & Approvers</h4>
                    <div className="grid gap-3 text-base">
                      <div className="flex justify-between items-start">
                        <span className="text-gray-300 font-medium">Tenure Groups:</span>
                        <span className="text-white font-semibold text-right max-w-[60%]">{formData.selectedTenureGroups.length ? formData.selectedTenureGroups.map(code => {
                          const tenureMap = { "0-6months": "0-6 Months", "6-12months": "6-12 Months", "1-2years": "1-2 Years", "2-5years": "2-5 Years", "5plus-years": "5+ Years" };
                          return tenureMap[code] || code;
                        }).join(", ") : "None selected"}</span>
                      </div>
                      <div className="border-t border-slate-600 pt-3 mt-3">
                        <div className="grid gap-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">L1 Primary:</span>
                            <span className="text-white font-semibold">{getApproverName(formData.approverL1)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">L1 Backup:</span>
                            <span className="text-white font-semibold">{getApproverName(formData.backupApproverL1)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">L2 Primary:</span>
                            <span className="text-white font-semibold">{getApproverName(formData.approverL2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">L2 Backup:</span>
                            <span className="text-white font-semibold">{getApproverName(formData.backupApproverL2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">L3 Primary:</span>
                            <span className="text-white font-semibold">{getApproverName(formData.approverL3)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">L3 Backup:</span>
                            <span className="text-white font-semibold">{getApproverName(formData.backupApproverL3)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={prevStep} 
                disabled={currentStep === 0 || isSubmitting} 
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button 
                  onClick={nextStep} 
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
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
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
