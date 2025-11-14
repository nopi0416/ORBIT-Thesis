import React, { useState } from "react";
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
} from "../components/icons";
import { BUDGET_PERIODS, APPROVAL_STATUS, CONFIG_STATUS } from "../utils/types";
import { cn } from "../utils/cn";

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

const mockConfigurations = [
  {
    id: "1",
    name: "Q1 2024 Performance Bonus",
    period: "Quarterly",
    geo: ["Philippines", "Singapore"],
    location: ["Manila", "Cebu"],
    clients: ["PLDT", "Globe"],
    department: "IT Department",
    status: "active",
    limitMin: 1000,
    limitMax: 10000,
    budgetControlEnabled: true,
    budgetControlLimit: 50000,
    budgetUsed: 32000,
    ongoingApprovals: 3,
    approvalStatus: "approved",
    submittedDate: "2024-01-15",
    description: "Performance bonus for Q1 2024 high performers in IT department. This budget configuration allows team leads to recognize exceptional performance.",
    approvalLevels: {
      level1: {
        status: "approved",
        approver: "John Smith",
        backupApprover: "Jane Doe",
        approvedDate: "2024-01-16"
      },
      level2: {
        status: "approved", 
        approver: "Michael Johnson",
        backupApprover: "Sarah Wilson",
        approvedDate: "2024-01-17"
      },
      level3: {
        status: "approved",
        approver: "David Brown",
        backupApprover: "Lisa Garcia",
        approvedDate: "2024-01-18"
      }
    },
  },
  {
    id: "2",
    name: "Annual Recognition Awards",
    period: "Yearly",
    geo: ["Philippines"],
    location: ["Manila"],
    clients: ["Smart", "DITO"],
    department: "HR Department",
    status: "active",
    limitMin: 2000,
    limitMax: 15000,
    budgetControlEnabled: false,
    budgetControlLimit: null,
    budgetUsed: 8500,
    ongoingApprovals: 1,
    approvalStatus: "pending_l2",
    submittedDate: "2024-02-10",
    description: "Annual recognition awards for employees who have shown exceptional dedication and performance throughout the year.",
    approvalLevels: {
      level1: {
        status: "approved",
        approver: "Alice Chen",
        backupApprover: "Bob Martinez",
        approvedDate: "2024-02-11"
      },
      level2: {
        status: "pending",
        approver: "Robert Taylor",
        backupApprover: "Emily Davis",
        approvedDate: null
      },
      level3: {
        status: "pending",
        approver: "Jennifer Lee",
        backupApprover: "Kevin Wong",
        approvedDate: null
      }
    },
  },
  {
    id: "3",
    name: "Monthly Incentive Program",
    period: "Monthly",
    geo: ["Philippines", "Malaysia"],
    location: ["Manila", "Clark"],
    clients: ["PLDT", "Globe", "Smart"],
    department: "Operations",
    status: "draft",
    limitMin: 500,
    limitMax: 5000,
    budgetControlEnabled: true,
    budgetControlLimit: 25000,
    budgetUsed: 12300,
    ongoingApprovals: 0,
    approvalStatus: "no_submission",
    description: "Monthly incentive program to reward operational excellence and customer satisfaction scores.",
    approvalLevels: {
      level1: {
        status: "pending",
        approver: "Carlos Rodriguez",
        backupApprover: "Anna Thompson",
        approvedDate: null
      },
      level2: {
        status: "pending",
        approver: "Mark Williams",
        backupApprover: "Susan Jones",
        approvedDate: null
      },
      level3: {
        status: "pending",
        approver: "Patricia Miller",
        backupApprover: "Daniel Kim",
        approvedDate: null
      }
    },
  },
];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGeo, setFilterGeo] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const filteredConfigurations = mockConfigurations.filter((config) => {
    const matchesSearch = config.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGeo = filterGeo === "all" || config.geo.includes(filterGeo);
    const matchesLocation = filterLocation === "all" || config.location.includes(filterLocation);
    const matchesClient = filterClient === "all" || config.clients.includes(filterClient);
    return matchesSearch && matchesGeo && matchesLocation && matchesClient;
  });

  const handleConfigClick = (config) => {
    setSelectedConfig(config);
    setModalOpen(true);
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
        
        {filteredConfigurations.length === 0 ? (
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
                          {config.period}
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

                  <TabsContent value="details" className="space-y-3 flex-1 overflow-y-auto">
                    {/* Description */}
                    <div className="bg-slate-700/30 rounded-lg p-3">
                      <h4 className="font-medium text-white mb-1">Description</h4>
                      <p className="text-gray-300 text-sm">
                        {selectedConfig.description}
                      </p>
                    </div>

                    {/* Configuration Details Grid - Compact */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-400 uppercase tracking-wide">Period</label>
                          <p className="text-white font-medium">{selectedConfig.period}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 uppercase tracking-wide">Department</label>
                          <p className="text-white font-medium">{selectedConfig.department}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-400 uppercase tracking-wide">Limit Range</label>
                          <p className="text-white font-medium">
                            ₱{selectedConfig.limitMin.toLocaleString()} - ₱{selectedConfig.limitMax.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 uppercase tracking-wide">Geographic Locations</label>
                          <p className="text-white font-medium">{selectedConfig.geo.join(", ")}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-400 uppercase tracking-wide">Budget Used</label>
                          <p className={`font-bold ${getBudgetUsageColor(selectedConfig.budgetUsed, selectedConfig.budgetControlLimit)}`}>
                            ₱{selectedConfig.budgetUsed?.toLocaleString() || '0'}
                            {selectedConfig.budgetControlEnabled && selectedConfig.budgetControlLimit && (
                              <span className="text-gray-400 text-sm ml-1 font-normal">
                                / ₱{selectedConfig.budgetControlLimit.toLocaleString()}
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 uppercase tracking-wide">Clients</label>
                          <p className="text-white font-medium">{selectedConfig.clients.join(", ")}</p>
                        </div>
                      </div>
                    </div>

                    {/* Approval Levels - Without Status */}
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Approval Hierarchy</label>
                      <div className="grid grid-cols-3 gap-3">
                        {Object.entries(selectedConfig.approvalLevels).map(([level, data], index) => (
                          <div key={level} className="bg-slate-700/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {index + 1}
                              </div>
                              <span className="text-white font-medium text-sm">Level {index + 1}</span>
                            </div>
                            <p className="text-xs text-gray-400">
                              Primary: {data.approver}
                            </p>
                            <p className="text-xs text-gray-400">
                              Backup: {data.backupApprover}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-3 flex-1 overflow-y-auto">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-white">Budget Usage Summary</h4>
                        <Select defaultValue="monthly">
                          <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="6month">6 Months</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="h-[480px] overflow-y-auto border border-slate-600 rounded-lg">
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
                            {[
                              { period: "October 2024", totalBudget: 50000, budgetUsed: 32500, budgetRemaining: 17500, budgetCarryover: 5000, approved: 12, rejected: 2, pending: 1 },
                              { period: "September 2024", totalBudget: 50000, budgetUsed: 41200, budgetRemaining: 8800, budgetCarryover: 0, approved: 16, rejected: 2, pending: 0 },
                              { period: "August 2024", totalBudget: 50000, budgetUsed: 38750, budgetRemaining: 11250, budgetCarryover: 0, approved: 19, rejected: 3, pending: 0 },
                              { period: "July 2024", totalBudget: 45000, budgetUsed: 28900, budgetRemaining: 16100, budgetCarryover: 3500, approved: 13, rejected: 1, pending: 0 },
                              { period: "June 2024", totalBudget: 55000, budgetUsed: 45600, budgetRemaining: 9400, budgetCarryover: 0, approved: 18, rejected: 2, pending: 0 },
                              { period: "May 2024", totalBudget: 50000, budgetUsed: 34800, budgetRemaining: 15200, budgetCarryover: 2500, approved: 14, rejected: 2, pending: 0 },
                              { period: "April 2024", totalBudget: 48000, budgetUsed: 42300, budgetRemaining: 5700, budgetCarryover: 1800, approved: 17, rejected: 1, pending: 0 },
                              { period: "March 2024", totalBudget: 52000, budgetUsed: 39600, budgetRemaining: 12400, budgetCarryover: 2200, approved: 15, rejected: 3, pending: 0 },
                              { period: "February 2024", totalBudget: 47000, budgetUsed: 33900, budgetRemaining: 13100, budgetCarryover: 1500, approved: 13, rejected: 2, pending: 0 },
                              { period: "January 2024", totalBudget: 51000, budgetUsed: 44800, budgetRemaining: 6200, budgetCarryover: 0, approved: 19, rejected: 1, pending: 0 },
                              { period: "December 2023", totalBudget: 60000, budgetUsed: 52400, budgetRemaining: 7600, budgetCarryover: 3000, approved: 22, rejected: 3, pending: 0 },
                              { period: "November 2023", totalBudget: 48000, budgetUsed: 35200, budgetRemaining: 12800, budgetCarryover: 1200, approved: 14, rejected: 2, pending: 0 },
                              { period: "October 2023", totalBudget: 49000, budgetUsed: 41600, budgetRemaining: 7400, budgetCarryover: 2100, approved: 16, rejected: 2, pending: 0 },
                              { period: "September 2023", totalBudget: 53000, budgetUsed: 47800, budgetRemaining: 5200, budgetCarryover: 0, approved: 20, rejected: 1, pending: 0 },
                              { period: "August 2023", totalBudget: 46000, budgetUsed: 38900, budgetRemaining: 7100, budgetCarryover: 1600, approved: 15, rejected: 2, pending: 0 },
                              { period: "July 2023", totalBudget: 50000, budgetUsed: 43200, budgetRemaining: 6800, budgetCarryover: 2500, approved: 18, rejected: 1, pending: 0 },
                              { period: "June 2023", totalBudget: 48500, budgetUsed: 40100, budgetRemaining: 8400, budgetCarryover: 1900, approved: 16, rejected: 3, pending: 0 },
                              { period: "May 2023", totalBudget: 52500, budgetUsed: 45700, budgetRemaining: 6800, budgetCarryover: 0, approved: 19, rejected: 2, pending: 0 },
                              { period: "April 2023", totalBudget: 47500, budgetUsed: 36800, budgetRemaining: 10700, budgetCarryover: 2200, approved: 14, rejected: 2, pending: 0 },
                              { period: "March 2023", totalBudget: 51500, budgetUsed: 44300, budgetRemaining: 7200, budgetCarryover: 1800, approved: 17, rejected: 1, pending: 0 }
                            ].map((summary) => (
                              <tr key={summary.period} className="hover:bg-slate-700/20">
                                <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{summary.period}</td>
                                <td className="px-4 py-3 text-slate-300 font-semibold whitespace-nowrap">₱{summary.totalBudget.toLocaleString()}</td>
                                <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">₱{summary.budgetUsed.toLocaleString()}</td>
                                <td className="px-4 py-3 text-green-400 font-semibold whitespace-nowrap">₱{summary.budgetRemaining.toLocaleString()}</td>
                                <td className="px-4 py-3 text-blue-400 font-semibold whitespace-nowrap">
                                  {summary.budgetCarryover > 0 ? `₱${summary.budgetCarryover.toLocaleString()}` : '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge className="bg-green-500/20 text-green-400 border-green-400">
                                    {summary.approved}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge className="bg-red-500/20 text-red-400 border-red-400">
                                    {summary.rejected}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400">
                                    {summary.pending}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="logs" className="space-y-3 flex-1 overflow-y-auto">
                    <div className="space-y-2">
                      <h4 className="font-medium text-white">Detailed Request Logs</h4>
                      <div className="h-[480px] overflow-y-auto border border-slate-600 rounded-lg">
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
                            {[
                              { id: "REQ-001", employee: "John Doe", amount: 2500, status: "completed", date: "2024-10-10", reason: "Performance bonus for Q3 achievements" },
                              { id: "REQ-002", employee: "Jane Smith", amount: 1800, status: "rejected", date: "2024-10-08", reason: "Project milestone completion" },
                              { id: "REQ-003", employee: "Mike Johnson", amount: 3000, status: "completed", date: "2024-10-05", reason: "Exceptional client service" },
                              { id: "REQ-004", employee: "Sarah Wilson", amount: 2200, status: "completed", date: "2024-10-03", reason: "Outstanding customer feedback" },
                              { id: "REQ-005", employee: "David Brown", amount: 1500, status: "pending", date: "2024-10-01", reason: "Monthly overtime compensation" },
                              { id: "REQ-006", employee: "Emily Davis", amount: 1900, status: "completed", date: "2024-09-28", reason: "Sales target achievement" },
                              { id: "REQ-007", employee: "Alex Thompson", amount: 2800, status: "completed", date: "2024-09-25", reason: "Leadership excellence award" },
                              { id: "REQ-008", employee: "Lisa Rodriguez", amount: 1600, status: "rejected", date: "2024-09-22", reason: "Project delivery on time" },
                              { id: "REQ-009", employee: "Chris Wilson", amount: 2100, status: "completed", date: "2024-09-20", reason: "Customer satisfaction scores" },
                              { id: "REQ-010", employee: "Maria Garcia", amount: 2400, status: "completed", date: "2024-09-18", reason: "Innovation contribution" },
                              { id: "REQ-011", employee: "Robert Chen", amount: 2000, status: "pending", date: "2024-09-15", reason: "Quarterly performance review bonus" },
                              { id: "REQ-012", employee: "Amanda Lee", amount: 2750, status: "completed", date: "2024-09-12", reason: "Client relationship management excellence" },
                              { id: "REQ-013", employee: "Kevin Park", amount: 1450, status: "rejected", date: "2024-09-10", reason: "Process improvement initiative" },
                              { id: "REQ-014", employee: "Jessica White", amount: 3200, status: "completed", date: "2024-09-08", reason: "New product launch contribution" },
                              { id: "REQ-015", employee: "Thomas Miller", amount: 1750, status: "completed", date: "2024-09-05", reason: "Team leadership during crisis" },
                              { id: "REQ-016", employee: "Sandra Johnson", amount: 2300, status: "pending", date: "2024-09-03", reason: "Training program development" },
                              { id: "REQ-017", employee: "Mark Williams", amount: 1950, status: "completed", date: "2024-09-01", reason: "Cost reduction initiative success" },
                              { id: "REQ-018", employee: "Rachel Green", amount: 2650, status: "rejected", date: "2024-08-28", reason: "Quality assurance improvements" },
                              { id: "REQ-019", employee: "Daniel Kim", amount: 2100, status: "completed", date: "2024-08-25", reason: "Cross-functional collaboration" },
                              { id: "REQ-020", employee: "Michelle Taylor", amount: 1800, status: "pending", date: "2024-08-22", reason: "Customer service excellence award" }
                            ].map((request) => (
                              <tr key={request.id} className="hover:bg-slate-700/20">
                                <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{request.id}</td>
                                <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{request.employee}</td>
                                <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">₱{request.amount.toLocaleString()}</td>
                                <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{request.date}</td>
                                <td className="px-4 py-3 text-center">
                                  <Badge className={
                                    request.status === "completed" ? "bg-sky-400/20 text-sky-400 border-sky-400" :
                                    request.status === "rejected" ? "bg-pink-500/20 text-pink-400 border-pink-400" :
                                    "bg-yellow-500/20 text-yellow-400 border-yellow-400"
                                  }>
                                    {request.status}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate" title={request.reason}>
                                  {request.reason}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            <DialogFooter className="flex justify-end border-t border-slate-600 pt-3 flex-shrink-0 mt-2">
              {activeTab === "details" ? (
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Configuration
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
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Setup - Step 1
    budgetName: "",
    period: "monthly",
    dataControlEnabled: true, // Enabled by default
    limitMin: "",
    limitMax: "",
    budgetControlEnabled: false,
    budgetControlLimit: "",
    budgetCarryoverEnabled: false,
    carryoverPercentage: "100",
    accessibleOU: [], // Who can use this configuration
    accessibleChildOU: [], // Child OUs that can use this configuration
    
    // Country/Geo - Step 2  
    countries: [],
    siteLocation: [], // Renamed from geo
    clients: [],
    ou: [],
    childOU: [],
    
    // Tenure & Approvers - Step 3
    selectedTenureGroups: [], // Changed from tenureGroups to selectedTenureGroups
    approverL1: "",
    backupApproverL1: "",
    approverL2: "",
    backupApproverL2: "",
    approverL3: "",
    backupApproverL3: "",
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    console.log("Configuration submitted:", formData);
    alert("Budget configuration created successfully!");
  };

  return (
    <div className="space-y-6">
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
                      <Select value={formData.period} onValueChange={(value) => updateField("period", value)}>
                        <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-gray-300">
                          <SelectItem value="monthly" className="text-white">Monthly</SelectItem>
                          <SelectItem value="quarterly" className="text-white">Quarterly</SelectItem>
                          <SelectItem value="semi-annually" className="text-white">Every 6 Months</SelectItem>
                          <SelectItem value="yearly" className="text-white">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
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

                {/* Control Panels - Access, Data, and Budget Control */}
                <div className="grid gap-4 lg:grid-cols-3 md:grid-cols-2">
                  {/* Access Control Panel */}
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-white">Access Control</h4>
                    <p className="text-sm text-gray-400">Define who can use this configuration</p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white">Accessible OU *</Label>
                        <Select value={formData.accessibleOU.length > 0 ? formData.accessibleOU[0] : ""} onValueChange={(value) => updateField("accessibleOU", value ? [value] : [])}>
                          <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-gray-300">
                            <SelectItem value="it-dept" className="text-white">IT Department</SelectItem>
                            <SelectItem value="hr-dept" className="text-white">HR Department</SelectItem>
                            <SelectItem value="finance-dept" className="text-white">Finance Department</SelectItem>
                            <SelectItem value="operations" className="text-white">Operations</SelectItem>
                            <SelectItem value="customer-service" className="text-white">Customer Service</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Child OU</Label>
                        <Select value={formData.accessibleChildOU.length > 0 ? formData.accessibleChildOU[0] : ""} onValueChange={(value) => updateField("accessibleChildOU", value ? [value] : [])}>
                          <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                            <SelectValue placeholder="Select child unit" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-gray-300">
                            <SelectItem value="dev-team" className="text-white">Development Team</SelectItem>
                            <SelectItem value="qa-team" className="text-white">QA Team</SelectItem>
                            <SelectItem value="support-team" className="text-white">Support Team</SelectItem>
                            <SelectItem value="infrastructure" className="text-white">Infrastructure</SelectItem>
                            <SelectItem value="security" className="text-white">Security</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

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

                  {/* Budget Control Panel */}
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">Budget Control</h4>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="budgetControl"
                          checked={formData.budgetControlEnabled}
                          onCheckedChange={(checked) => updateField("budgetControlEnabled", checked)}
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
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Enable to set budget limits</p>
                    )}
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
                  {/* Left: Location Settings Panel */}
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-white">Location Settings</h4>
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
                    </div>
                  </div>

                  {/* Right: Client & Organization Panel */}
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-white">Client & Organization</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white">Clients</Label>
                        <Select value={formData.clients.length > 0 ? formData.clients[0] : ""} onValueChange={(value) => updateField("clients", value ? [value] : [])}>
                          <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-gray-300">
                            <SelectItem value="pldt" className="text-white">PLDT</SelectItem>
                            <SelectItem value="globe" className="text-white">Globe Telecom</SelectItem>
                            <SelectItem value="smart" className="text-white">Smart Communications</SelectItem>
                            <SelectItem value="converge" className="text-white">Converge ICT</SelectItem>
                            <SelectItem value="dito" className="text-white">DITO Telecommunity</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Organizational Units (OU)</Label>
                        <Select value={formData.ou.length > 0 ? formData.ou[0] : ""} onValueChange={(value) => updateField("ou", value ? [value] : [])}>
                          <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                            <SelectValue placeholder="Select organizational unit" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-gray-300">
                            <SelectItem value="it-dept" className="text-white">IT Department</SelectItem>
                            <SelectItem value="hr-dept" className="text-white">HR Department</SelectItem>
                            <SelectItem value="finance-dept" className="text-white">Finance Department</SelectItem>
                            <SelectItem value="operations" className="text-white">Operations</SelectItem>
                            <SelectItem value="customer-service" className="text-white">Customer Service</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Child OU</Label>
                        <Select value={formData.childOU.length > 0 ? formData.childOU[0] : ""} onValueChange={(value) => updateField("childOU", value ? [value] : [])}>
                          <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                            <SelectValue placeholder="Select child organizational unit" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-gray-300">
                            <SelectItem value="dev-team" className="text-white">Development Team</SelectItem>
                            <SelectItem value="qa-team" className="text-white">QA Team</SelectItem>
                            <SelectItem value="support-team" className="text-white">Support Team</SelectItem>
                            <SelectItem value="infrastructure" className="text-white">Infrastructure</SelectItem>
                            <SelectItem value="security" className="text-white">Security</SelectItem>
                          </SelectContent>
                        </Select>
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
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateField("selectedTenureGroups", [...formData.selectedTenureGroups, tenure.value]);
                              } else {
                                updateField("selectedTenureGroups", formData.selectedTenureGroups.filter(t => t !== tenure.value));
                              }
                            }}
                            className="w-5 h-5"
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
                          <Select value={formData.approverL1} onValueChange={(value) => updateField("approverL1", value)}>
                            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                              <SelectValue placeholder="Select primary approver" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-gray-300">
                              <SelectItem value="john-smith" className="text-white">John Smith</SelectItem>
                              <SelectItem value="jane-doe" className="text-white">Jane Doe</SelectItem>
                              <SelectItem value="mike-wilson" className="text-white">Mike Wilson</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="backupApproverL1" className="text-white">Backup Approver *</Label>
                          <Select value={formData.backupApproverL1} onValueChange={(value) => updateField("backupApproverL1", value)}>
                            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                              <SelectValue placeholder="Select backup approver" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-gray-300">
                              <SelectItem value="sarah-jones" className="text-white">Sarah Jones</SelectItem>
                              <SelectItem value="bob-martinez" className="text-white">Bob Martinez</SelectItem>
                              <SelectItem value="alice-chen" className="text-white">Alice Chen</SelectItem>
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
                          <Select value={formData.approverL2} onValueChange={(value) => updateField("approverL2", value)}>
                            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                              <SelectValue placeholder="Select primary approver" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-gray-300">
                              <SelectItem value="michael-johnson" className="text-white">Michael Johnson</SelectItem>
                              <SelectItem value="sarah-wilson" className="text-white">Sarah Wilson</SelectItem>
                              <SelectItem value="robert-taylor" className="text-white">Robert Taylor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="backupApproverL2" className="text-white">Backup Approver *</Label>
                          <Select value={formData.backupApproverL2} onValueChange={(value) => updateField("backupApproverL2", value)}>
                            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                              <SelectValue placeholder="Select backup approver" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-gray-300">
                              <SelectItem value="emily-davis" className="text-white">Emily Davis</SelectItem>
                              <SelectItem value="anna-thompson" className="text-white">Anna Thompson</SelectItem>
                              <SelectItem value="mark-williams" className="text-white">Mark Williams</SelectItem>
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
                          <Select value={formData.approverL3} onValueChange={(value) => updateField("approverL3", value)}>
                            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                              <SelectValue placeholder="Select primary approver" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-gray-300">
                              <SelectItem value="david-brown" className="text-white">David Brown</SelectItem>
                              <SelectItem value="lisa-garcia" className="text-white">Lisa Garcia</SelectItem>
                              <SelectItem value="jennifer-lee" className="text-white">Jennifer Lee</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="backupApproverL3" className="text-white">Backup Approver *</Label>
                          <Select value={formData.backupApproverL3} onValueChange={(value) => updateField("backupApproverL3", value)}>
                            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                              <SelectValue placeholder="Select backup approver" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-gray-300">
                              <SelectItem value="kevin-wong" className="text-white">Kevin Wong</SelectItem>
                              <SelectItem value="patricia-miller" className="text-white">Patricia Miller</SelectItem>
                              <SelectItem value="daniel-kim" className="text-white">Daniel Kim</SelectItem>
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
                        <span className="text-white text-sm text-right max-w-[60%] leading-relaxed">{formData.budgetDescription || "No description provided"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 font-medium">Period:</span>
                        <span className="text-white font-semibold capitalize">{formData.period}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-gray-300 font-medium">Accessible OU:</span>
                        <span className="text-white text-sm text-right max-w-[60%]">{formData.accessibleOU.length ? formData.accessibleOU.map(code => {
                          const ouMap = { "it-dept": "IT Department", "hr-dept": "HR Department", "finance-dept": "Finance Department", operations: "Operations", "customer-service": "Customer Service" };
                          return ouMap[code] || code;
                        }).join(", ") : "Not specified"}</span>
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
                        <span className="text-gray-300 font-medium">OU:</span>
                        <span className="text-white font-semibold text-right max-w-[60%]">{formData.ou.length ? formData.ou.map(code => {
                          const ouMap = { "it-dept": "IT Department", "hr-dept": "HR Department", "finance-dept": "Finance Department", operations: "Operations", "customer-service": "Customer Service" };
                          return ouMap[code] || code;
                        }).join(", ") : "None selected"}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-gray-300 font-medium">Child OU:</span>
                        <span className="text-white font-semibold text-right max-w-[60%]">{formData.childOU.length ? formData.childOU.map(code => {
                          const childOUMap = { "dev-team": "Development Team", "qa-team": "QA Team", "support-team": "Support Team", infrastructure: "Infrastructure", security: "Security" };
                          return childOUMap[code] || code;
                        }).join(", ") : "None selected"}</span>
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
                            <span className="text-white font-semibold">{formData.approverL1 || "Not specified"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">L1 Backup:</span>
                            <span className="text-white font-semibold">{formData.backupApproverL1 || "Not specified"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">L2 Primary:</span>
                            <span className="text-white font-semibold">{formData.approverL2 || "Not specified"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">L2 Backup:</span>
                            <span className="text-white font-semibold">{formData.backupApproverL2 || "Not specified"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">L3 Primary:</span>
                            <span className="text-white font-semibold">{formData.approverL3 || "Not specified"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">L3 Backup:</span>
                            <span className="text-white font-semibold">{formData.backupApproverL3 || "Not specified"}</span>
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
                disabled={currentStep === 0} 
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                  <Check className="mr-2 h-4 w-4" />
                  Create Configuration
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
