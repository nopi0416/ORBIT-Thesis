import React, { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
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
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  FileText,
  Plus,
  FileDown,
  Upload,
} from "../components/icons";
import { cn } from "../utils/cn";

// Centralized budget configurations
const budgetConfigurations = {
  "Q4 Performance Incentives 2024": {
    totalBudget: 500000,
    currentAmount: 485000,
    description: "Quarterly performance bonuses for outstanding employee achievements across all departments"
  },
  "Q1 2024 Performance Bonus": {
    totalBudget: 250000,
    currentAmount: 180000,
    description: "First quarter performance incentives for goal achievement"
  },
  "Monthly Incentive Program": {
    totalBudget: 100000,
    currentAmount: 75000,
    description: "Regular monthly incentive disbursements for consistent performance"
  },
  "Training Achievement Reward": {
    totalBudget: 50000,
    currentAmount: 32000,
    description: "Professional development and certification completion rewards"
  },
  "Annual Recognition Awards": {
    totalBudget: 300000,
    currentAmount: 220000,
    description: "Annual employee recognition and achievement awards program"
  }
};

export default function ApprovalPage() {
  const { user } = useAuth();
  const userRole = user?.role || "l1"; // Temporarily set to l1 for testing
  
  // Add state for ongoing request details modal
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false);
  const [selectedOngoingRequest, setSelectedOngoingRequest] = useState(null);
  
  // State for managing expanded approval notes
  const [expandedApprovalNotes, setExpandedApprovalNotes] = useState({});
  
  // Helper function to toggle approval notes expansion
  const toggleApprovalNotes = (noteId) => {
    setExpandedApprovalNotes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };
  
  // Handler for viewing ongoing request details
  const handleViewOngoingRequestDetails = (approval) => {
    setSelectedOngoingRequest(approval);
    setShowRequestDetailModal(true);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Approval Management" 
        description="Submit, review, and track budget approval requests"
      />

      <div className="flex-1 p-6">
        <Tabs defaultValue="submit" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700 p-1">
            {/* Submit Approval - Available to Requestor/Employee, L1, Payroll */}
            {(userRole === "requestor" || userRole === "l1" || userRole === "payroll") && (
              <TabsTrigger 
                value="submit"
                className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
              >
                Submit Approval
              </TabsTrigger>
            )}
            
            {/* Approval Request - Available to L1-L3 and Payroll only */}
            {(userRole === "l1" || userRole === "l2" || userRole === "l3" || userRole === "payroll") && (
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

          {/* Submit Approval Tab */}
          {(userRole === "requestor" || userRole === "l1" || userRole === "payroll") && (
            <TabsContent value="submit">
              <SubmitApproval 
                userRole={userRole} 
                handleViewOngoingRequestDetails={handleViewOngoingRequestDetails}
              />
            </TabsContent>
          )}

          {/* Approval Requests Tab */}
          {(userRole === "l1" || userRole === "l2" || userRole === "l3" || userRole === "payroll") && (
            <TabsContent value="requests">
              <ApprovalRequests 
                userRole={userRole} 
                handleViewOngoingRequestDetails={handleViewOngoingRequestDetails}
                showRequestDetailModal={showRequestDetailModal}
                setShowRequestDetailModal={setShowRequestDetailModal}
                selectedOngoingRequest={selectedOngoingRequest}
                expandedApprovalNotes={expandedApprovalNotes}
                toggleApprovalNotes={toggleApprovalNotes}
              />
            </TabsContent>
          )}

          {/* History & Logs Tab */}
          <TabsContent value="history">
            <ApprovalHistory userRole={userRole} />
          </TabsContent>
        </Tabs>
      </div>

      {/* My Ongoing Request Details Modal */}
      <Dialog open={showRequestDetailModal} onOpenChange={setShowRequestDetailModal}>
        <DialogContent 
          className="bg-slate-800 border-slate-700 text-white w-full max-w-none h-[95vh] overflow-hidden flex flex-col" 
          style={{width: '70vw', maxWidth: '70vw'}}
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-white">
              My Request Details - {selectedOngoingRequest?.id}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Track your submitted approval request status and workflow progression
            </DialogDescription>
          </DialogHeader>
          
          <div 
            className="flex-1 overflow-y-scroll overflow-x-hidden"
            style={{
              scrollbarWidth: 'thick',
              scrollbarColor: '#64748b #1e293b',
              scrollbarGutter: 'stable'
            }}
          >
            <style>{`
              .flex-1::-webkit-scrollbar {
                width: 16px;
                display: block !important;
                visibility: visible !important;
              }
              .flex-1::-webkit-scrollbar-track {
                background: #1e293b;
                border-radius: 8px;
                border: 1px solid #334155;
                display: block !important;
              }
              .flex-1::-webkit-scrollbar-thumb {
                background: #64748b;
                border-radius: 8px;
                border: 2px solid #1e293b;
                min-height: 40px;
                display: block !important;
              }
              .flex-1::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
              .flex-1::-webkit-scrollbar-corner {
                background: #1e293b;
                display: block !important;
              }
              .flex-1::-webkit-scrollbar-button {
                display: block !important;
                height: 16px;
                background: #334155;
              }
              .flex-1::-webkit-scrollbar-button:hover {
                background: #475569;
              }
            `}</style>
            <div className="space-y-4 p-3 pr-6">

          {/* Budget Configuration Summary */}
          <div className="border border-slate-600 rounded-lg p-3 bg-slate-900/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-slate-400">Budget Configuration:</span>
                  <p className="text-white font-medium">{selectedOngoingRequest?.configName || 'Q4 Performance Incentives 2024'}</p>
                  <p className="text-slate-300 text-xs mt-1">Quarterly performance bonuses for outstanding employee achievements across all departments</p>
                </div>
                <div>
                  <span className="text-sm text-slate-400">Approval Description:</span>
                  <p className="text-slate-300 text-sm">{selectedOngoingRequest?.description || 'Outstanding performance in client project delivery and team collaboration'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-400">Request Total Amount:</span>
                  <p className="text-green-400 font-bold text-lg">+₱{selectedOngoingRequest?.amount?.toLocaleString() || '51,000'}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-400">Budget Status:</span>
                  {(() => {
                    const configName = selectedOngoingRequest?.configName || 'Q4 Performance Incentives 2024';
                    const budgetConfig = budgetConfigurations[configName] || budgetConfigurations['Q4 Performance Incentives 2024'];
                    const currentAmount = budgetConfig.currentAmount;
                    const totalBudget = budgetConfig.totalBudget;
                    const requestedAmount = selectedOngoingRequest?.amount || 51000;
                    const currentPercentage = (currentAmount / totalBudget) * 100;
                    const afterApprovalAmount = currentAmount + requestedAmount;
                    const requestedPercentage = (requestedAmount / totalBudget) * 100;
                    const exceedsBudget = afterApprovalAmount > totalBudget;
                    
                    return (
                      <>
                        <p className="text-white font-medium text-lg">₱{currentAmount.toLocaleString()} / ₱{totalBudget.toLocaleString()}</p>
                        <div className="w-full bg-slate-700 rounded-full h-2 mt-1 relative overflow-hidden">
                          {exceedsBudget ? (
                            <>
                              <div className="bg-blue-500 h-2 rounded-l-full" style={{width: `${currentPercentage}%`}}></div>
                              <div className="bg-orange-500 h-2 absolute top-0" style={{left: `${currentPercentage}%`, width: `${Math.min(requestedPercentage, 100 - currentPercentage)}%`}}></div>
                            </>
                          ) : (
                            <>
                              <div className="bg-blue-500 h-2 rounded-l-full" style={{width: `${currentPercentage}%`}}></div>
                              <div className="bg-green-500 h-2 absolute top-0" style={{left: `${currentPercentage}%`, width: `${requestedPercentage}%`}}></div>
                            </>
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                          <span>Current: ₱{currentAmount.toLocaleString()} ({currentPercentage.toFixed(1)}%)</span>
                          <span className="text-orange-400">+₱{requestedAmount.toLocaleString()} requested</span>
                        </div>
                        <p className={`text-xs ${exceedsBudget ? 'text-orange-400' : 'text-green-400'}`}>
                          After approval: ₱{afterApprovalAmount.toLocaleString()} / ₱{totalBudget.toLocaleString()} ({((afterApprovalAmount / totalBudget) * 100).toFixed(1)}%{exceedsBudget ? ` - ₱${(afterApprovalAmount - totalBudget).toLocaleString()} over budget` : ' - within budget'})
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 py-2 flex-1 overflow-hidden min-h-0">
            {/* File Preview Section */}
            <div className="border border-slate-600 rounded-lg p-3 flex flex-col h-[65vh]">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-medium">Uploaded Data</h3>
                  {(() => {
                    const employees = [
                      { id: "EMP001", name: "John Martinez", dept: "Sales", pos: "Senior Sales Representative", amount: "₱15,000", type: "Performance Bonus", notes: "Exceeded Q4 sales targets by 120%", isNegative: false, hasWarning: false },
                      { id: "EMP002", name: "Maria Santos", dept: "Marketing", pos: "Marketing Specialist", amount: "₱12,000", type: "Campaign Success", notes: "Led successful product launch campaign", isNegative: false, hasWarning: false },
                      { id: "EMP003", name: "Carlos Rivera", dept: "Engineering", pos: "Software Developer", amount: "₱18,000", type: "Innovation Bonus", notes: "Delivered critical system optimization ahead of schedule", isNegative: false, hasWarning: false },
                      { id: "EMP004", name: "Ana Gonzalez", dept: "Customer Service", pos: "Team Lead", amount: "-₱2,500", type: "Adjustment", notes: "Overtime compensation adjustment - previous overpayment", isNegative: true, hasWarning: true },
                      { id: "EMP005", name: "David Chen", dept: "Finance", pos: "Financial Analyst", amount: "₱8,500", type: "Performance Bonus", notes: "Outstanding budget variance analysis", isNegative: false, hasWarning: false },
                      { id: "EMP006", name: "Lisa Wang", dept: "Operations", pos: "Operations Manager", amount: "-₱1,200", type: "Deduction", notes: "Equipment damage deduction - laptop replacement", isNegative: true, hasWarning: true },
                      { id: "EMP007", name: "Robert Kim", dept: "IT - Development", pos: "Senior Developer", amount: "₱22,000", type: "Project Completion", notes: "Critical system migration completed ahead of schedule", isNegative: false, hasWarning: false },
                      { id: "EMP008", name: "Sarah Johnson", dept: "Human Resources", pos: "HR Manager", amount: "₱14,500", type: "Team Excellence", notes: "Successful Q4 recruitment drive", isNegative: false, hasWarning: false }
                    ];
                    const warningCount = employees.filter(emp => emp.hasWarning).length;
                    return warningCount > 0 && (
                      <span className="bg-yellow-600 text-yellow-100 text-xs px-2 py-1 rounded-full font-medium">
                        ⚠ {warningCount} Warning{warningCount > 1 ? 's' : ''}
                      </span>
                    );
                  })()}
                </div>
                <span className="text-xs text-slate-400">sample_request.xlsx</span>
              </div>
              
              <div className="bg-slate-900 rounded-lg p-2 flex-1 overflow-hidden min-h-0">
                <div 
                  className="h-full overflow-y-auto overflow-x-auto"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#475569 #1e293b'
                  }}
                >
                  <table className="w-full text-sm table-auto">
                    <thead className="bg-slate-700 sticky top-0">
                      <tr>
                        <th className="px-3 py-3 text-left font-medium text-slate-200 w-24 text-sm">
                          <div className="flex items-center gap-1 whitespace-nowrap">Employee ID</div>
                        </th>
                        <th className="px-3 py-3 text-left font-medium text-slate-200 w-40 text-sm">
                          <div className="flex items-center gap-1 whitespace-nowrap">Full Name</div>
                        </th>
                        <th className="px-3 py-3 text-left font-medium text-slate-200 w-36 text-sm">
                          <div className="flex items-center gap-1 whitespace-nowrap">Department</div>
                        </th>
                        <th className="px-3 py-3 text-left font-medium text-slate-200 w-40 text-sm">
                          <div className="flex items-center gap-1 whitespace-nowrap">Position</div>
                        </th>
                        <th className="px-3 py-3 text-left font-medium text-slate-200 w-28 text-sm">
                          <div className="flex items-center gap-1 whitespace-nowrap">Amount</div>
                        </th>
                        <th className="px-3 py-3 text-left font-medium text-slate-200 text-sm whitespace-nowrap">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-600">
                      {(() => {
                        const employees = [
                          { id: "EMP001", name: "John Martinez", dept: "Sales", pos: "Senior Sales Representative", amount: "₱15,000", type: "Performance Bonus", notes: "Exceeded Q4 sales targets by 120%", isNegative: false, hasWarning: false },
                          { id: "EMP002", name: "Maria Santos", dept: "Marketing", pos: "Marketing Specialist", amount: "₱12,000", type: "Campaign Success", notes: "Led successful product launch campaign", isNegative: false, hasWarning: false },
                          { id: "EMP003", name: "Carlos Rivera", dept: "Engineering", pos: "Software Developer", amount: "₱18,000", type: "Innovation Bonus", notes: "Delivered critical system optimization ahead of schedule", isNegative: false, hasWarning: false },
                          { id: "EMP004", name: "Ana Gonzalez", dept: "Customer Service", pos: "Team Lead", amount: "-₱2,500", type: "Adjustment", notes: "Overtime compensation adjustment - previous overpayment", isNegative: true, hasWarning: true },
                          { id: "EMP005", name: "David Chen", dept: "Finance", pos: "Financial Analyst", amount: "₱8,500", type: "Performance Bonus", notes: "Outstanding budget variance analysis", isNegative: false, hasWarning: false },
                          { id: "EMP006", name: "Lisa Wang", dept: "Operations", pos: "Operations Manager", amount: "-₱1,200", type: "Deduction", notes: "Equipment damage deduction - laptop replacement", isNegative: true, hasWarning: true },
                          { id: "EMP007", name: "Robert Kim", dept: "IT - Development", pos: "Senior Developer", amount: "₱22,000", type: "Project Completion", notes: "Critical system migration completed ahead of schedule", isNegative: false, hasWarning: false },
                          { id: "EMP008", name: "Sarah Johnson", dept: "Human Resources", pos: "HR Manager", amount: "₱14,500", type: "Team Excellence", notes: "Successful Q4 recruitment drive", isNegative: false, hasWarning: false }
                        ];
                        
                        return employees.map((employee, index) => (
                        <tr key={index} className={`hover:bg-slate-700/30 transition-colors ${employee.hasWarning ? 'bg-yellow-900/20' : ''}`}>
                          <td className={`px-3 py-3 text-white font-medium text-sm relative ${employee.hasWarning ? 'pl-6' : ''}`}>
                            {employee.hasWarning && <span className="absolute left-3 text-yellow-400">⚠</span>}
                            {employee.id}
                          </td>
                          <td className="px-3 py-3 text-slate-300 text-sm">{employee.name}</td>
                          <td className="px-3 py-3 text-slate-300 text-sm">{employee.dept}</td>
                          <td className="px-3 py-3 text-slate-300 text-sm">{employee.pos}</td>
                          <td className={`px-3 py-3 font-semibold text-sm ${employee.isNegative ? 'text-red-400' : 'text-green-400'}`}>
                            {employee.amount}
                          </td>
                          <td className="px-3 py-3 text-slate-400 text-sm">{employee.notes}</td>
                        </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
          {/* Approval Workflow Status */}
          <div className="border border-slate-600 rounded-lg p-4 bg-slate-900/50">
            <h3 className="text-white font-medium text-lg mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Approval Workflow Status
            </h3>
            <div className="space-y-3">
              {selectedOngoingRequest?.progress && Object.entries(selectedOngoingRequest.progress).map(([level, approval]) => {
                const levelName = level === "payroll" ? "Payroll Completion" : `Level ${level.replace('l', '')} Approval`;
                const isCompleted = approval.status === "approved";
                const isPending = approval.status === "pending";
                const isSelfRequest = approval.selfRequest;
                
                // Determine if this is a self-request scenario
                const selfRequestType = selectedOngoingRequest?.requestedBy;
                const showSelfRequestLabel = (
                  (level === "l1" && selfRequestType === "L1") ||
                  (level === "payroll" && selfRequestType === "payroll") ||
                  (level === "l3" && selfRequestType === "L3")
                );
                
                return (
                  <div key={level} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    isCompleted ? 'bg-green-800/20 border-green-600/50' : 
                    isPending ? 'bg-yellow-800/20 border-yellow-600/50' :
                    'bg-gray-800/20 border-gray-600/50'
                  }`}>
                    <div className="flex-shrink-0 mt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : isPending ? (
                        <Clock className="w-5 h-5 text-yellow-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-medium">{levelName}</h4>
                          {showSelfRequestLabel && (
                            <Badge className="bg-blue-600 text-white text-xs">
                              {level === "l1" ? "L1 Self-Request" : 
                               level === "l3" ? "L3 Self-Request" : 
                               "Payroll Self-Request"}
                            </Badge>
                          )}
                        </div>
                        <Badge className={
                          isCompleted ? "bg-green-600 text-white" :
                          isPending ? "bg-yellow-600 text-white" :
                          "bg-gray-600 text-white"
                        }>
                          {isCompleted ? "Approved" : "Pending"}
                        </Badge>
                      </div>
                      
                      {/* Show approved details for completed levels */}
                      {isCompleted && approval.approver && (
                        <div className="mt-2 grid grid-cols-12 gap-4">
                          {/* Left column - Approver details (4/12 width = 33%) */}
                          <div className="col-span-4 space-y-1">
                            <p className="text-sm text-gray-300">
                              <span className="font-medium">Approved by:</span> {approval.approver}
                            </p>
                            {approval.approverTitle && (
                              <p className="text-sm text-gray-400">
                                <span className="font-medium">Title:</span> {approval.approverTitle}
                              </p>
                            )}
                            {approval.date && (
                              <p className="text-sm text-gray-400">
                                <span className="font-medium">Approved on:</span> {approval.date}
                              </p>
                            )}
                            {showSelfRequestLabel && (
                              <p className="text-sm text-blue-400">
                                <span className="font-medium">Note:</span> Auto-approved as requestor
                              </p>
                            )}
                          </div>
                          
                          {/* Right column - Approval description (8/12 width = 67%) */}
                          <div className="col-span-8 space-y-1">
                            {approval.approvalDescription && (
                              <div className="bg-slate-700/30 rounded-lg p-3 border-l-4 border-green-500">
                                <p className="text-sm text-gray-300">
                                  <span className="font-medium text-green-400">Approval Notes:</span>
                                </p>
                                {(() => {
                                  const noteId = `modal1-${level}-${approval.approver}`;
                                  const showFullNotes = expandedApprovalNotes[noteId] || false;
                                  const fullNotes = [
                                    "Excellent performance metrics exceeded quarterly targets. Well-deserved recognition for outstanding client project delivery and exceptional team collaboration throughout the evaluation period.",
                                    "The employee demonstrated remarkable leadership qualities during critical project phases, successfully coordinating cross-functional teams and ensuring all deliverables met or exceeded client expectations. Their proactive approach to problem-solving has significantly contributed to the project's success.",
                                    "Furthermore, their mentorship of junior team members and knowledge sharing initiatives have created lasting value for the organization. This recognition serves to acknowledge their comprehensive contributions and encourage continued excellence in future endeavors."
                                  ];
                                  
                                  return (
                                    <div className="mt-1">
                                      <div className={`text-sm text-gray-300 italic space-y-2 transition-all duration-300 ${showFullNotes ? 'max-h-none' : 'max-h-16 overflow-hidden relative'}`}>
                                        {showFullNotes ? (
                                          <>
                                            <p>"{fullNotes[0]}"</p>
                                            <p>"{fullNotes[1]}"</p>
                                            <p>"{fullNotes[2]}"</p>
                                          </>
                                        ) : (
                                          <p>
                                            "{fullNotes[0].substring(0, 140)}..."
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => toggleApprovalNotes(noteId)}
                                        className="mt-2 text-xs text-green-400 hover:text-green-300 underline transition-colors"
                                      >
                                        {showFullNotes ? 'See less' : 'See more'}
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Show pending approver details */}
                      {isPending && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-400">
                            Waiting for approval from:
                          </p>
                          {approval.mainApprover && (
                            <p className="text-sm text-gray-300">
                              <span className="font-medium">Main Approver:</span> {approval.mainApprover}
                            </p>
                          )}
                          {approval.backupApprover && (
                            <p className="text-sm text-gray-300">
                              <span className="font-medium">Backup Approver:</span> {approval.backupApprover}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>

            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0">
            <Button 
              onClick={() => setShowRequestDetailModal(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Submit Approval Component
function SubmitApproval({ userRole, handleViewOngoingRequestDetails }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Mock user's accessible configurations with more dummy data
  const userConfigurations = [
    {
      id: "1",
      name: "Q1 2024 Performance Bonus",
      department: "IT",
      maxAmount: 5000,
      usedAmount: 3200,
      ongoingApprovals: 3,
      description: "Quarterly performance rewards for outstanding achievements"
    },
    {
      id: "2", 
      name: "Monthly Incentive Program",
      department: "HR",
      maxAmount: 2500,
      usedAmount: 1850,
      ongoingApprovals: 1,
      description: "Monthly recognition program for exceptional work"
    },
    {
      id: "3",
      name: "Project Completion Bonus",
      department: "Engineering",
      maxAmount: 7500,
      usedAmount: 2100,
      ongoingApprovals: 0,
      description: "Bonus for successful project deliveries"
    },
    {
      id: "4",
      name: "Sales Commission Q4",
      department: "Sales",
      maxAmount: 10000,
      usedAmount: 8750,
      ongoingApprovals: 2,
      description: "Quarterly sales performance commission"
    },
    {
      id: "5",
      name: "Overtime Compensation",
      department: "Operations",
      maxAmount: 3000,
      usedAmount: 2950,
      ongoingApprovals: 5,
      description: "Additional hours compensation program"
    },
    {
      id: "6",
      name: "Training Achievement Reward",
      department: "L&D",
      maxAmount: 1500,
      usedAmount: 450,
      ongoingApprovals: 0,
      description: "Certification and training completion rewards"
    },
    {
      id: "7",
      name: "Customer Service Excellence",
      department: "Customer Success",
      maxAmount: 2000,
      usedAmount: 1200,
      ongoingApprovals: 1,
      description: "Outstanding customer service recognition"
    },
    {
      id: "8",
      name: "Innovation Initiative Fund",
      department: "R&D",
      maxAmount: 8000,
      usedAmount: 3500,
      ongoingApprovals: 0,
      description: "Rewards for innovative solutions and ideas"
    },
    {
      id: "9",
      name: "Team Leadership Bonus",
      department: "Management",
      maxAmount: 6000,
      usedAmount: 4200,
      ongoingApprovals: 2,
      description: "Leadership excellence and team management"
    },
    {
      id: "10",
      name: "Quality Assurance Award",
      department: "QA",
      maxAmount: 2500,
      usedAmount: 1800,
      ongoingApprovals: 1,
      description: "Quality improvement and bug prevention rewards"
    },
    {
      id: "11",
      name: "Marketing Campaign Success",
      department: "Marketing",
      maxAmount: 4000,
      usedAmount: 1650,
      ongoingApprovals: 0,
      description: "Successful marketing campaign performance"
    },
    {
      id: "12",
      name: "Security Compliance Bonus",
      department: "IT Security",
      maxAmount: 3500,
      usedAmount: 2100,
      ongoingApprovals: 1,
      description: "Cybersecurity and compliance achievements"
    }
  ];

  // Mock ongoing approvals for current user
  // Mock database of all approval requests
  const mockApprovalDatabase = {
    // Employee/Requestor requests (when user is a regular employee)
    employee: [
      {
        id: "APP-101",
        configName: "Q1 2024 Performance Bonus",
        submittedAt: "2024-10-12",
        amount: 4500,
        status: "pending_l2",
        currentLevel: 2,
        description: "Exceptional performance in client project delivery",
        requestedBy: "employee",
        progress: {
          l1: { status: "approved", approver: "Sarah Johnson", date: "2024-10-13", approverTitle: "HR Manager", approvalDescription: "Excellent performance metrics exceeded quarterly targets. Well-deserved recognition for outstanding client project delivery." },
          l2: { status: "pending", approver: null, date: null, mainApprover: "Robert Kim", backupApprover: "Lisa Wang" },
          l3: { status: "pending", approver: null, date: null, mainApprover: "Jennifer Davis", backupApprover: "Mark Thompson" },
          payroll: { status: "pending", approver: null, date: null, mainApprover: "Payroll Team", backupApprover: "Finance Department" }
        }
      },
      {
        id: "APP-102",
        configName: "Monthly Incentive Program", 
        submittedAt: "2024-10-10",
        amount: 2000,
        status: "pending_l1",
        currentLevel: 1,
        description: "Outstanding customer service ratings this month",
        requestedBy: "employee",
        progress: {
          l1: { status: "pending", approver: null, date: null, mainApprover: "Sarah Johnson", backupApprover: "Michael Chen" },
          l2: { status: "pending", approver: null, date: null, mainApprover: "Robert Kim", backupApprover: "Lisa Wang" },
          l3: { status: "pending", approver: null, date: null, mainApprover: "Jennifer Davis", backupApprover: "Mark Thompson" },
          payroll: { status: "pending", approver: null, date: null, mainApprover: "Payroll Team", backupApprover: "Finance Department" }
        }
      },
      {
        id: "APP-103",
        configName: "Training Achievement Reward",
        submittedAt: "2024-10-08", 
        amount: 1200,
        status: "pending_payroll",
        currentLevel: "payroll",
        description: "Completed advanced certification program",
        requestedBy: "employee",
        progress: {
          l1: { status: "approved", approver: "Sarah Johnson", date: "2024-10-09", approverTitle: "HR Manager", approvalDescription: "Professional development investment shows commitment to growth. Certification directly benefits company objectives." },
          l2: { status: "approved", approver: "Robert Kim", date: "2024-10-10", approverTitle: "Finance Manager", approvalDescription: "Training budget well-utilized. Expected ROI justifies the investment in employee skill enhancement." },
          l3: { status: "approved", approver: "Jennifer Lee", date: "2024-10-11", approverTitle: "Operations Director", approvalDescription: "Strategic upskilling initiative aligns with operational efficiency goals. Approved for implementation." },
          payroll: { status: "pending", approver: null, date: null, mainApprover: "Payroll Team", backupApprover: "Finance Department" }
        }
      }
    ],
    // L1 Manager requests (can be self-requests or for their team)
    l1: [
      {
        id: "APP-201",
        configName: "Team Performance Incentive",
        submittedAt: "2024-10-15",
        amount: 8500,
        status: "pending_l2", 
        currentLevel: 2,
        description: "Team exceeded quarterly targets by 25%",
        requestedBy: "L1",
        progress: {
          l1: { status: "approved", approver: "Sarah Johnson", date: "2024-10-15", selfRequest: true, approverTitle: "HR Manager" },
          l2: { status: "pending", approver: null, date: null, mainApprover: "Robert Kim", backupApprover: "Lisa Wang" },
          l3: { status: "pending", approver: null, date: null, mainApprover: "Jennifer Davis", backupApprover: "Mark Thompson" },
          payroll: { status: "pending", approver: null, date: null, mainApprover: "Payroll Team", backupApprover: "Finance Department" }
        }
      },
      {
        id: "APP-202", 
        configName: "Professional Development Budget",
        submittedAt: "2024-10-13",
        amount: 2500,
        status: "pending_l2",
        currentLevel: 2,
        description: "Leadership training for department managers",
        requestedBy: "L1",
        progress: {
          l1: { status: "approved", approver: "Sarah Johnson", date: "2024-10-13", selfRequest: true, approverTitle: "HR Manager" },
          l2: { status: "pending", approver: null, date: null, mainApprover: "Robert Kim", backupApprover: "Lisa Wang" },
          l3: { status: "pending", approver: null, date: null, mainApprover: "Jennifer Davis", backupApprover: "Mark Thompson" },
          payroll: { status: "pending", approver: null, date: null, mainApprover: "Payroll Team", backupApprover: "Finance Department" }
        }
      }
    ],
    // Payroll requests (self-requests but still need approval)
    payroll: [
      {
        id: "APP-301",
        configName: "Payroll System Overtime",
        submittedAt: "2024-10-14",
        amount: 1200,
        status: "pending_l1",
        currentLevel: 1,
        description: "Extended hours for month-end payroll processing",
        requestedBy: "payroll",
        progress: {
          l1: { status: "pending", approver: null, date: null, mainApprover: "Sarah Johnson", backupApprover: "Michael Chen" },
          l2: { status: "pending", approver: null, date: null, mainApprover: "Robert Kim", backupApprover: "Lisa Wang" },
          l3: { status: "pending", approver: null, date: null, mainApprover: "Jennifer Davis", backupApprover: "Mark Thompson" },
          payroll: { status: "pending", approver: null, date: null, selfRequest: true, mainApprover: "Payroll Team", backupApprover: "Finance Department" }
        }
      },
      {
        id: "APP-302",
        configName: "Year-end Bonus Processing Fee",
        submittedAt: "2024-10-12",
        amount: 900,
        status: "pending_l2",
        currentLevel: 2, 
        description: "Additional processing fee for annual bonus calculations",
        requestedBy: "payroll",
        progress: {
          l1: { status: "approved", approver: "Sarah Johnson", date: "2024-10-13", approverTitle: "HR Manager" },
          l2: { status: "pending", approver: null, date: null, mainApprover: "Robert Kim", backupApprover: "Lisa Wang" },
          l3: { status: "pending", approver: null, date: null, mainApprover: "Jennifer Davis", backupApprover: "Mark Thompson" },
          payroll: { status: "pending", approver: null, date: null, selfRequest: true, mainApprover: "Payroll Team", backupApprover: "Finance Department" }
        }
      }
    ],
    // L3 Director requests (self-requests and high-level approvals)
    l3: [
      {
        id: "APP-401",
        configName: "Executive Bonus Pool",
        submittedAt: "2024-10-16",
        amount: 15000,
        status: "pending_payroll", 
        currentLevel: "payroll",
        description: "Strategic initiative completion bonus for senior management",
        requestedBy: "L3",
        progress: {
          l1: { status: "approved", approver: "Sarah Johnson", date: "2024-10-16" },
          l2: { status: "approved", approver: "Robert Kim", date: "2024-10-16" },
          l3: { status: "approved", approver: "Jennifer Lee", date: "2024-10-16", selfRequest: true },
          payroll: { status: "pending", approver: null, date: null }
        }
      },
      {
        id: "APP-402", 
        configName: "Department Restructuring Incentive",
        submittedAt: "2024-10-14",
        amount: 12000,
        status: "pending_payroll",
        currentLevel: "payroll",
        description: "Performance bonus for successful organizational transformation",
        requestedBy: "L3",
        progress: {
          l1: { status: "approved", approver: "Sarah Johnson", date: "2024-10-14" },
          l2: { status: "approved", approver: "Robert Kim", date: "2024-10-15" },
          l3: { status: "approved", approver: "Jennifer Lee", date: "2024-10-15", selfRequest: true },
          payroll: { status: "pending", approver: null, date: null }
        }
      },
      {
        id: "APP-403",
        configName: "Cross-Department Collaboration Award", 
        submittedAt: "2024-10-11",
        amount: 8000,
        status: "pending_l3",
        currentLevel: 3,
        description: "Recognition for successful inter-departmental project leadership",
        requestedBy: "employee", // This is a regular employee request that reached L3
        progress: {
          l1: { status: "approved", approver: "Sarah Johnson", date: "2024-10-12" },
          l2: { status: "approved", approver: "Robert Kim", date: "2024-10-13" },
          l3: { status: "pending", approver: null, date: null },
          payroll: { status: "pending", approver: null, date: null }
        }
      }
    ]
  };

  // Get role-specific approval requests
  const getMyOngoingApprovals = () => {
    switch (userRole) {
      case "l1":
        return mockApprovalDatabase.l1;
      case "l3":
        return mockApprovalDatabase.l3;
      case "payroll":
        return mockApprovalDatabase.payroll;
      default: // employee or other roles
        return mockApprovalDatabase.employee;
    }
  };

  const myOngoingApprovals = getMyOngoingApprovals();

  const handleSubmitApproval = (config) => {
    setSelectedConfig(config);
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending_l1": return "bg-yellow-600/80 border border-yellow-500/50";
      case "pending_l2": return "bg-orange-600/80 border border-orange-500/50";
      case "pending_l3": return "bg-purple-600/80 border border-purple-500/50";
      case "pending_payroll": return "bg-green-600/80 border border-green-500/50";
      default: return "bg-gray-600/80 border border-gray-500/50";
    }
  };

  const getStatusText = (status, level) => {
    if (status === "pending_payroll") return "Ready for Completion";
    return `Pending L${level} Approval`;
  };

  return (
    <div className="space-y-6">
      {/* Submit New Approval Request */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Submit New Approval Request</CardTitle>
          <CardDescription className="text-gray-400">
            Select a budget configuration to submit an approval request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto pr-2">
            <div className="grid gap-3 2xl:grid-cols-5 xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1">
              {userConfigurations.map((config) => (
                <div key={config.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 hover:bg-slate-700/70 transition-colors relative flex flex-col min-h-[200px]">
                  {/* Ongoing approvals circle - purple circle at panel tip with proper spacing */}
                  {config.ongoingApprovals > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-600 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-slate-900 z-10">
                      {config.ongoingApprovals}
                    </div>
                  )}
                  
                  <div className="flex flex-col h-full">
                    <div className="flex-grow space-y-2">
                      <div>
                        <h3 className="font-semibold text-white text-sm leading-tight pr-4">{config.name}</h3>
                        <p className="text-xs text-gray-400">{config.department}</p>
                      </div>
                      
                      <p className="text-xs text-gray-300 line-clamp-2">{config.description}</p>
                    </div>
                    
                    <div className="mt-auto space-y-2">
                      <div className="text-center py-1">
                        <p className="text-xs text-gray-400">Used Budget</p>
                        <p className="text-lg font-bold text-white">
                          ₱{config.usedAmount?.toLocaleString() || 0} / ₱{config.maxAmount.toLocaleString()}
                        </p>
                      </div>
                      
                      <Button 
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                        onClick={() => handleSubmitApproval(config)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Submit Request
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Ongoing Approvals */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">My Ongoing Approval Requests</CardTitle>
          <CardDescription className="text-gray-400">
            Track the status of your submitted approval requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[450px] overflow-y-auto pr-2">
            <div className="space-y-3">
              {myOngoingApprovals.map((approval) => (
                <div 
                  key={approval.id} 
                  className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 cursor-pointer hover:bg-slate-700/70 transition-colors"
                  onClick={() => handleViewOngoingRequestDetails(approval)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1 mr-4">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-500 text-black text-sm font-medium px-2 py-1">
                          {approval.id}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-300 font-medium">{approval.configName}</p>
                      <p className="text-xs text-gray-400 line-clamp-2">{approval.description}</p>
                      <p className="text-xs text-gray-500">Submitted: {approval.submittedAt}</p>
                      <p className="text-lg font-bold text-white">₱{approval.amount.toLocaleString()}</p>
                    </div>
                    
                    {/* Compact Approval Status on Right */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1">
                        {Object.entries(approval.progress).map(([level, info]) => (
                          <div key={level} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            info.status === 'approved' ? 'bg-green-500 text-white' :
                            info.status === 'pending' ? 'bg-yellow-500 text-white' :
                            'bg-gray-600 text-gray-400'
                          }`}>
                            {level === 'payroll' ? 'P' : level.toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <div className="text-center">
                        {approval.status === "pending_l3" ? (
                          <span className="text-purple-400 text-xs font-medium">
                            {getStatusText(approval.status, approval.currentLevel)}
                          </span>
                        ) : (
                          <Badge className={`text-white text-xs ${
                            approval.status === "pending_l1" ? "bg-yellow-600" :
                            approval.status === "pending_l2" ? "bg-orange-600" :
                            approval.status === "pending_l3" ? "bg-purple-600" :
                            approval.status === "pending_payroll" ? "bg-blue-600" :
                            "bg-gray-600"
                          }`}>
                            {getStatusText(approval.status, approval.currentLevel)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Approval Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent 
          className="bg-slate-800 border-slate-700 text-white w-full max-w-none h-[95vh] overflow-hidden flex flex-col" 
          style={{width: '70vw', maxWidth: '70vw'}}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Submit Approval Request
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedConfig?.name}
            </DialogDescription>
          </DialogHeader>

          {/* Budget Configuration Details */}
          <div className="border border-slate-600 rounded-lg p-3 bg-slate-900/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-400">Budget Configuration:</span>
                  <p className="text-white font-medium">{selectedConfig?.name || 'Q4 Performance Incentives 2024'}</p>
                  <p className="text-slate-300 text-xs mt-1">Quarterly performance bonuses for outstanding employee achievements across all departments</p>
                </div>
                <div>
                  <span className="text-sm text-slate-400">Total Budget:</span>
                  <p className="text-blue-400 font-medium">₱500,000</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-400">Approval Hierarchy:</span>
                  <div className="space-y-3 mt-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-medium">L1</span>
                        <span className="text-sm text-slate-300">Sarah Johnson (HR Manager)</span>
                      </div>
                      <div className="ml-6">
                        <span className="text-xs text-slate-500">Backup: </span>
                        <span className="text-xs text-slate-400">Michael Chen (Assistant HR Manager)</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded font-medium">L2</span>
                        <span className="text-sm text-slate-300">Robert Kim (Finance Manager)</span>
                      </div>
                      <div className="ml-6">
                        <span className="text-xs text-slate-500">Backup: </span>
                        <span className="text-xs text-slate-400">Lisa Wang (Senior Financial Analyst)</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 bg-indigo-600 text-white text-xs rounded font-medium">L3</span>
                        <span className="text-sm text-slate-300">Jennifer Lee (Operations Director)</span>
                      </div>
                      <div className="ml-6">
                        <span className="text-xs text-slate-500">Backup: </span>
                        <span className="text-xs text-slate-400">David Chen (Assistant Operations Director)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 py-4">
            {/* File Upload Section - First */}
            <div className="space-y-2">
              <Label className="text-white">Upload Data *</Label>
              
              {/* Action Buttons - Always visible, aligned left */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="border-slate-600 text-white hover:bg-slate-700"
                  onClick={() => setUploadedFile({ name: 'template.xlsx', type: 'generate' })}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Generate Template
                </Button>
                <Button 
                  variant="outline" 
                  className="border-slate-600 text-white hover:bg-slate-700"
                  onClick={() => setUploadedFile({ name: 'uploaded_data.xlsx', type: 'upload', validRows: 5, invalidRows: 5 })}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import Excel/Data
                </Button>
              </div>
              
              {/* Drag and Drop Area - Only show when no file uploaded */}
              {!uploadedFile && (
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 bg-slate-700/30 hover:bg-slate-700/50 transition-colors mt-4">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <Upload className="h-12 w-12 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-white text-lg font-medium">Drag and drop your Excel file here</p>
                      <p className="text-gray-400 text-sm mt-1">or use the buttons above to get started</p>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Supported formats: .xlsx, .xls, .csv</p>
                      <p>Maximum file size: 10MB</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Helper text - Only show when no file uploaded */}
              {!uploadedFile && (
                <div className="text-center text-sm text-gray-400">
                  Don't have the file ready? 
                  <button 
                    className="text-blue-400 hover:text-blue-300 ml-1 underline"
                    onClick={() => setUploadedFile({ name: 'template.xlsx', type: 'generate' })}
                  >
                    Download the template first
                  </button>
                </div>
              )}
            </div>

            {/* File Preview Section */}
            {uploadedFile && (
              <div className="space-y-2">
                <Label className="text-white">File Preview</Label>
                <div className="border border-slate-600 rounded-lg p-4 bg-slate-700/30">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-slate-300">{uploadedFile.name}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        5 valid (₱12,300)
                      </Badge>
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                        2 warnings (₱-8,200)
                      </Badge>
                      <Badge variant="outline" className="text-red-400 border-red-400">
                        5 invalid (₱0)
                      </Badge>
                    </div>
                  </div>
                  
                  <Tabs defaultValue="valid" className="space-y-4">
                    <TabsList className="bg-slate-700 border-slate-600 p-1">
                      <TabsTrigger 
                        value="valid" 
                        className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
                      >
                        Valid Data
                      </TabsTrigger>
                      <TabsTrigger 
                        value="warnings"
                        className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
                      >
                        Warnings
                      </TabsTrigger>
                      <TabsTrigger 
                        value="invalid"
                        className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-gray-300 border-0"
                      >
                        Invalid Data
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="valid" className="space-y-0">
                      <div className="max-h-64 overflow-y-auto border border-slate-600 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-600/50 sticky top-0">
                            <tr>
                              <th className="text-left p-3 text-gray-300 font-medium">Status</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Employee ID</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Employee Name</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Amount</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Department</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Uploader Notes</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Validation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-600">
                            <tr className="bg-green-500/5 hover:bg-green-500/10">
                              <td className="p-3">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                  <span className="text-green-400 text-xs">Valid</span>
                                </div>
                              </td>
                              <td className="p-3 text-white">IT001</td>
                              <td className="p-3 text-white">John Doe</td>
                              <td className="p-3 text-white font-medium">₱2,500</td>
                              <td className="p-3 text-slate-300">IT - Development</td>
                              <td className="p-3 text-slate-300 text-xs">Excellent project delivery</td>
                              <td className="p-3 text-green-400 text-xs">Valid employee ID and amount within limit</td>
                            </tr>
                            <tr className="bg-green-500/5 hover:bg-green-500/10">
                              <td className="p-3">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                  <span className="text-green-400 text-xs">Valid</span>
                                </div>
                              </td>
                              <td className="p-3 text-white">IT002</td>
                              <td className="p-3 text-white">Jane Smith</td>
                              <td className="p-3 text-white font-medium">₱1,800</td>
                              <td className="p-3 text-slate-300">IT - QA Testing</td>
                              <td className="p-3 text-slate-300 text-xs">Outstanding bug detection</td>
                              <td className="p-3 text-green-400 text-xs">Valid employee ID and amount within limit</td>
                            </tr>
                            <tr className="bg-green-500/5 hover:bg-green-500/10">
                              <td className="p-3">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                  <span className="text-green-400 text-xs">Valid</span>
                                </div>
                              </td>
                              <td className="p-3 text-white">IT003</td>
                              <td className="p-3 text-white">Mike Johnson</td>
                              <td className="p-3 text-white font-medium">₱3,000</td>
                              <td className="p-3 text-slate-300">IT - Infrastructure</td>
                              <td className="p-3 text-slate-300 text-xs">Server optimization completed</td>
                              <td className="p-3 text-green-400 text-xs">Valid employee ID and amount within limit</td>
                            </tr>
                            <tr className="bg-green-500/5 hover:bg-green-500/10">
                              <td className="p-3">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                  <span className="text-green-400 text-xs">Valid</span>
                                </div>
                              </td>
                              <td className="p-3 text-white">IT004</td>
                              <td className="p-3 text-white">Sarah Wilson</td>
                              <td className="p-3 text-white font-medium">₱2,200</td>
                              <td className="p-3 text-slate-300">IT - Support</td>
                              <td className="p-3 text-slate-300 text-xs">Customer satisfaction 98%</td>
                              <td className="p-3 text-green-400 text-xs">Valid employee ID and amount within limit</td>
                            </tr>
                            <tr className="bg-green-500/5 hover:bg-green-500/10">
                              <td className="p-3">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                  <span className="text-green-400 text-xs">Valid</span>
                                </div>
                              </td>
                              <td className="p-3 text-white">IT005</td>
                              <td className="p-3 text-white">David Brown</td>
                              <td className="p-3 text-white font-medium">₱2,800</td>
                              <td className="p-3 text-slate-300">IT - Security</td>
                              <td className="p-3 text-slate-300 text-xs">Zero security incidents</td>
                              <td className="p-3 text-green-400 text-xs">Valid employee ID and amount within limit</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>

                    <TabsContent value="warnings" className="space-y-0">
                      <div className="max-h-64 overflow-y-auto border border-slate-600 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-600/50 sticky top-0">
                            <tr>
                              <th className="text-left p-3 text-gray-300 font-medium">Status</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Employee ID</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Employee Name</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Amount</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Department</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Uploader Notes</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Warning Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-600">
                            <tr className="bg-yellow-500/5 hover:bg-yellow-500/10">
                              <td className="p-3">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                                  <span className="text-yellow-400 text-xs">Warning</span>
                                </div>
                              </td>
                              <td className="p-3 text-white">IT010</td>
                              <td className="p-3 text-white">Alex Turner</td>
                              <td className="p-3 text-white font-medium">₱-5,000</td>
                              <td className="p-3 text-slate-300">IT - Development</td>
                              <td className="p-3 text-slate-300 text-xs">Previously submitted performance bonus amount exceeded what he should have received - adjustment required</td>
                              <td className="p-3 text-yellow-400 text-xs">Negative amount</td>
                            </tr>
                            <tr className="bg-yellow-500/5 hover:bg-yellow-500/10">
                              <td className="p-3">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                                  <span className="text-yellow-400 text-xs">Warning</span>
                                </div>
                              </td>
                              <td className="p-3 text-white">IT011</td>
                              <td className="p-3 text-white">Lisa Chen</td>
                              <td className="p-3 text-white font-medium">₱-3,200</td>
                              <td className="p-3 text-slate-300">IT - QA Testing</td>
                              <td className="p-3 text-slate-300 text-xs">Prior performance bonus overpayment correction - amount was higher than entitled based on actual performance metrics</td>
                              <td className="p-3 text-yellow-400 text-xs">Negative amount</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>

                    <TabsContent value="invalid" className="space-y-0">
                      <div className="max-h-64 overflow-y-auto border border-slate-600 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-600/50 sticky top-0">
                            <tr>
                              <th className="text-left p-3 text-gray-300 font-medium">Status</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Employee ID</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Employee Name</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Amount</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Department</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Uploader Notes</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Error Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-600">
                            <tr className="bg-red-500/5 hover:bg-red-500/10">
                              <td className="p-3">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                                  <span className="text-red-400 text-xs">Invalid</span>
                                </div>
                              </td>
                              <td className="p-3 text-white">IT999</td>
                              <td className="p-3 text-white">Unknown Employee</td>
                              <td className="p-3 text-white font-medium">₱5,000</td>
                              <td className="p-3 text-slate-300">IT - Unknown</td>
                              <td className="p-3 text-slate-300 text-xs">New hire bonus</td>
                              <td className="p-3 text-red-400 text-xs">Employee ID not found in IT department</td>
                            </tr>
                            <tr className="bg-red-500/5 hover:bg-red-500/10">
                              <td className="p-3">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                                  <span className="text-red-400 text-xs">Invalid</span>
                                </div>
                              </td>
                              <td className="p-3 text-white">IT006</td>
                              <td className="p-3 text-white">Test User</td>
                              <td className="p-3 text-white font-medium">₱15,000</td>
                              <td className="p-3 text-slate-300">IT - Development</td>
                              <td className="p-3 text-slate-300 text-xs">Exceptional performance</td>
                              <td className="p-3 text-red-400 text-xs">Amount exceeds maximum limit of ₱5,000</td>
                            </tr>
                            <tr className="bg-red-500/5 hover:bg-red-500/10">
                              <td className="p-3">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                                  <span className="text-red-400 text-xs">Invalid</span>
                                </div>
                              </td>
                              <td className="p-3 text-white"></td>
                              <td className="p-3 text-white">Robert Lee</td>
                              <td className="p-3 text-white font-medium">₱2,500</td>
                              <td className="p-3 text-slate-300">IT - Support</td>
                              <td className="p-3 text-slate-300 text-xs">Good team collaboration</td>
                              <td className="p-3 text-red-400 text-xs">Missing employee ID</td>
                            </tr>
                            <tr className="bg-red-500/5 hover:bg-red-500/10">
                              <td className="p-3">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                                  <span className="text-red-400 text-xs">Invalid</span>
                                </div>
                              </td>
                              <td className="p-3 text-white">IT007</td>
                              <td className="p-3 text-white">Maria Garcia</td>
                              <td className="p-3 text-white font-medium">₱-15,000</td>
                              <td className="p-3 text-slate-300">IT - QA Testing</td>
                              <td className="p-3 text-slate-300 text-xs">Major project delay</td>
                              <td className="p-3 text-red-400 text-xs">Not within configured min and max limits</td>
                            </tr>
                            <tr className="bg-red-500/5 hover:bg-red-500/10">
                              <td className="p-3">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                                  <span className="text-red-400 text-xs">Invalid</span>
                                </div>
                              </td>
                              <td className="p-3 text-white">IT012</td>
                              <td className="p-3 text-white">Mark Rodriguez</td>
                              <td className="p-3 text-white font-medium">₱-7,000</td>
                              <td className="p-3 text-slate-300">IT - Infrastructure</td>
                              <td className="p-3 text-slate-300 text-xs">Previous performance bonus exceeded entitlement - requires manual review for correction amount</td>
                              <td className="p-3 text-red-400 text-xs">Not within configured min and max limits</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
            
            {/* Details/Description Section - Second */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Details/Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide detailed description for this request..."
                rows={3}
                className="bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Error Message for Invalid Data */}
          {uploadedFile && uploadedFile.type === 'upload' && uploadedFile.invalidRows > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                <p className="text-red-400 text-sm font-medium">
                  Cannot submit request with {uploadedFile.invalidRows} invalid row{uploadedFile.invalidRows > 1 ? 's' : ''}.
                </p>
              </div>
              <p className="text-red-300 text-xs mt-1 ml-4">
                Please fix all invalid entries in your file before submitting the approval request.
              </p>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="border-slate-600 text-white hover:bg-slate-700">
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!uploadedFile || (uploadedFile && (uploadedFile.type === 'upload' && uploadedFile.invalidRows > 0))}
            >
              <Send className="mr-2 h-4 w-4" />
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}

// Approval Requests Component
function ApprovalRequests({ userRole, handleViewOngoingRequestDetails, showRequestDetailModal, setShowRequestDetailModal, selectedOngoingRequest, expandedApprovalNotes, toggleApprovalNotes }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [approvalDescription, setApprovalDescription] = useState("");

  // Status color and text helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case "pending_l1": return "bg-yellow-600/80 border border-yellow-500/50";
      case "pending_l2": return "bg-orange-600/80 border border-orange-500/50";
      case "pending_l3": return "bg-purple-600/80 border border-purple-500/50";
      case "pending_payroll": return "bg-green-600/80 border border-green-500/50";
      default: return "bg-gray-600/80 border border-gray-500/50";
    }
  };

  const getStatusText = (status, level) => {
    if (status === "pending_payroll") return "Ready for Completion";
    return `Pending L${level} Approval`;
  };

  // Mock pending approvals for review
  const pendingApprovals = [
    {
      id: "APP-003",
      configName: "Q1 2024 Performance Bonus",
      employeeName: "John Doe",
      amount: 4000,
      status: "pending_l1",
      submittedAt: "2024-10-12",
      description: "Outstanding performance in client project delivery",
      currentLevel: 1,
      approvalLevels: {
        l1: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Sarah Johnson",
          backupApprover: "Michael Chen"
        },
        l2: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Robert Kim",
          backupApprover: "Lisa Wang"
        },
        l3: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Jennifer Lee",
          backupApprover: "David Martinez"
        },
        payroll: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Payroll Team",
          backupApprover: "Payroll Team"
        }
      }
    },
    {
      id: "APP-004",
      configName: "Monthly Incentive Program",
      employeeName: "Jane Smith", 
      amount: 2000,
      status: "pending_l2",
      submittedAt: "2024-10-11",
      description: "Exceeded monthly sales targets by 150%",
      currentLevel: 2,
      approvalLevels: {
        l1: { 
          status: "approved", 
          approver: "Sarah Johnson", 
          approverTitle: "HR Manager", 
          approvedAt: "2024-10-12 09:30 AM",
          approvalDescription: "Exceptional sales performance demonstrates clear value delivery to the organization. The 150% target achievement significantly contributes to quarterly revenue goals and sets an excellent example for the team.",
          mainApprover: "Sarah Johnson",
          backupApprover: "Michael Chen"
        },
        l2: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Robert Kim",
          backupApprover: "Lisa Wang"
        },
        l3: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Jennifer Lee",
          backupApprover: "David Martinez"
        },
        payroll: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Payroll Team",
          backupApprover: "Payroll Team"
        }
      }
    },
    {
      id: "APP-005",
      configName: "Annual Recognition Awards",
      employeeName: "Mike Johnson", 
      amount: 3500,
      status: "pending_payroll",
      submittedAt: "2024-10-09",
      description: "Exceptional leadership in team projects",
      currentLevel: "payroll",
      approvalLevels: {
        l1: { 
          status: "approved", 
          approver: "Sarah Johnson", 
          approverTitle: "HR Manager", 
          approvedAt: "2024-10-10 10:15 AM",
          approvalDescription: "Outstanding leadership qualities demonstrated through successful project coordination. Employee has consistently mentored team members and delivered results above expectations.",
          mainApprover: "Sarah Johnson",
          backupApprover: "Michael Chen"
        },
        l2: { 
          status: "approved", 
          approver: "Robert Kim", 
          approverTitle: "Finance Manager", 
          approvedAt: "2024-10-11 02:45 PM",
          approvalDescription: "Financial impact analysis confirms positive ROI from leadership initiatives. Budget allocation for this recognition is justified by measurable team performance improvements.",
          mainApprover: "Robert Kim",
          backupApprover: "Lisa Wang"
        },
        l3: { 
          status: "approved", 
          approver: "Jennifer Lee", 
          approverTitle: "Operations Director", 
          approvedAt: "2024-10-12 11:20 AM",
          approvalDescription: "Operational excellence achieved through effective team leadership. This employee's project management skills have resulted in 20% efficiency gains across multiple departments.",
          mainApprover: "Jennifer Lee",
          backupApprover: "David Martinez"
        },
        payroll: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Payroll Team",
          backupApprover: "Payroll Team"
        }
      }
    },
    {
      id: "APP-006",
      configName: "Project Completion Bonus",
      employeeName: "Alice Brown", 
      amount: 1500,
      status: "pending_payroll",
      submittedAt: "2024-10-08",
      description: "Successfully delivered critical project on time",
      currentLevel: "payroll",
      approvalLevels: {
        l1: { 
          status: "approved", 
          approver: "John Manager", 
          approverTitle: "Department Manager", 
          approvedAt: "2024-10-09 09:15 AM",
          mainApprover: "Sarah Johnson",
          backupApprover: "Michael Chen"
        },
        l2: { 
          status: "approved", 
          approver: "Sarah Director", 
          approverTitle: "Finance Director", 
          approvedAt: "2024-10-09 03:30 PM",
          mainApprover: "Robert Kim",
          backupApprover: "Lisa Wang"
        },
        l3: { 
          status: "approved", 
          approver: "Jennifer Lee", 
          approverTitle: "Operations Director", 
          approvedAt: "2024-10-09 06:45 PM",
          mainApprover: "Jennifer Lee",
          backupApprover: "David Martinez"
        },
        payroll: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Payroll Team",
          backupApprover: "Payroll Team"
        }
      }
    },
    {
      id: "APP-010",
      configName: "Special Project Bonus",
      employeeName: "Alice Johnson",
      amount: 3500,
      status: "pending_l1",
      submittedAt: "2024-10-13",
      description: "Completed critical project ahead of schedule",
      currentLevel: 1,
      approvalLevels: {
        l1: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Sarah Johnson",
          backupApprover: "Michael Chen"
        },
        l2: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Robert Kim",
          backupApprover: "Lisa Wang"
        },
        l3: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Jennifer Lee",
          backupApprover: "David Martinez"
        },
        payroll: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Payroll Team",
          backupApprover: "Payroll Team"
        }
      }
    },
    {
      id: "APP-011",
      configName: "Innovation Award",
      employeeName: "Robert Lee",
      amount: 2800,
      status: "pending_l1",
      submittedAt: "2024-10-14",
      description: "Innovative solution improved efficiency by 25%",
      currentLevel: 1,
      approvalLevels: {
        l1: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Sarah Johnson",
          backupApprover: "Michael Chen"
        },
        l2: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Robert Kim",
          backupApprover: "Lisa Wang"
        },
        l3: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Jennifer Lee",
          backupApprover: "David Martinez"
        },
        payroll: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Payroll Team",
          backupApprover: "Payroll Team"
        }
      }
    },
    // L1 Self-Request Example (Auto-approved at L1 level)
    {
      id: "APP-012",
      configName: "Training Budget Reimbursement",
      employeeName: "Sarah Johnson", // L1 Approver requesting for herself
      amount: 1200,
      status: "pending_l2",
      submittedAt: "2024-10-15",
      description: "Professional development course completion reimbursement",
      currentLevel: 2,
      requestedBy: "L1", // Indicates this was requested by an L1 approver
      approvalLevels: {
        l1: { 
          status: "approved", 
          approver: "Sarah Johnson", 
          approverTitle: "HR Manager", 
          approvedAt: "2024-10-15 10:00 AM",
          mainApprover: "Sarah Johnson",
          backupApprover: "Michael Chen",
          selfRequest: true
        },
        l2: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Robert Kim",
          backupApprover: "Lisa Wang"
        },
        l3: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Jennifer Lee",
          backupApprover: "David Martinez"
        },
        payroll: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Payroll Team",
          backupApprover: "Payroll Team"
        }
      }
    },
    // Payroll Self-Request Example (No auto-approval, but labeled)
    {
      id: "APP-013", 
      configName: "Overtime Payment Adjustment",
      employeeName: "Payroll Team", // Payroll staff requesting
      amount: 800,
      status: "pending_l1",
      submittedAt: "2024-10-16",
      description: "Overtime hours adjustment for previous month",
      currentLevel: 1,
      requestedBy: "payroll", // Indicates this was requested by payroll staff
      approvalLevels: {
        l1: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Sarah Johnson",
          backupApprover: "Michael Chen"
        },
        l2: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Robert Kim",
          backupApprover: "Lisa Wang"
        },
        l3: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Jennifer Lee",
          backupApprover: "David Martinez"
        },
        payroll: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Payroll Team",
          backupApprover: "Payroll Team",
          selfRequest: true
        }
      }
    },
    // L3 Director Self-Request
    {
      id: "APP-014",
      configName: "Strategic Leadership Bonus",
      employeeName: "Jennifer Lee", // L3 Director requesting for herself
      amount: 18000,
      status: "pending_payroll",
      submittedAt: "2024-10-17",
      description: "Successful completion of major organizational restructuring",
      currentLevel: "payroll",
      requestedBy: "L3",
      approvalLevels: {
        l1: { 
          status: "approved", 
          approver: "Sarah Johnson", 
          approverTitle: "HR Manager", 
          approvedAt: "2024-10-17 09:00 AM",
          mainApprover: "Sarah Johnson",
          backupApprover: "Michael Chen"
        },
        l2: { 
          status: "approved", 
          approver: "Robert Kim", 
          approverTitle: "Finance Manager", 
          approvedAt: "2024-10-17 11:30 AM",
          mainApprover: "Robert Kim",
          backupApprover: "Lisa Wang"
        },
        l3: { 
          status: "approved", 
          approver: "Jennifer Lee", 
          approverTitle: "Operations Director", 
          approvedAt: "2024-10-17 02:15 PM",
          mainApprover: "Jennifer Lee",
          backupApprover: "David Martinez",
          selfRequest: true
        },
        payroll: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Payroll Team",
          backupApprover: "Payroll Team"
        }
      }
    },
    // High-value request requiring L3 approval
    {
      id: "APP-015",
      configName: "Department Excellence Award",
      employeeName: "Mark Stevens",
      amount: 12000,
      status: "pending_l3",
      submittedAt: "2024-10-16",
      description: "Exceptional leadership in cross-department collaboration project",
      currentLevel: 3,
      requestedBy: "employee",
      approvalLevels: {
        l1: { 
          status: "approved", 
          approver: "Sarah Johnson", 
          approverTitle: "HR Manager", 
          approvedAt: "2024-10-16 10:45 AM",
          approvalDescription: "Outstanding leadership qualities demonstrated through successful project coordination. Employee has consistently mentored team members and delivered results above expectations throughout the evaluation period.",
          mainApprover: "Sarah Johnson",
          backupApprover: "Michael Chen"
        },
        l2: { 
          status: "approved", 
          approver: "Robert Kim", 
          approverTitle: "Finance Manager", 
          approvedAt: "2024-10-16 03:20 PM",
          approvalDescription: "Excellent financial performance metrics justify this recognition level. The cross-department collaboration has resulted in measurable cost savings and improved operational efficiency across multiple business units.",
          mainApprover: "Robert Kim",
          backupApprover: "Lisa Wang"
        },
        l3: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Jennifer Lee",
          backupApprover: "David Martinez"
        },
        payroll: { 
          status: "pending", 
          approver: null, 
          approverTitle: null, 
          approvedAt: null,
          mainApprover: "Payroll Team",
          backupApprover: "Payroll Team"
        }
      }
    },
  ];

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  // Filter approvals based on user role and what they can actually approve  
  const getFilteredApprovals = () => {
    const filtered = pendingApprovals.filter(request => {
      // For L1 users, show only L1 pending approvals
      if (userRole === "l1") {
        return request.status === "pending_l1";
      }
      // For L2 users, show only L2 pending approvals  
      if (userRole === "l2") {
        return request.status === "pending_l2";
      }
      // For L3 users, show only L3 pending approvals
      if (userRole === "l3") {
        return request.status === "pending_l3";
      }
      // For Payroll users, show only payroll pending approvals where L1-L3 have been completed
      if (userRole === "payroll") {
        return request.status === "pending_payroll" && isReadyForPayrollCompletion(request);
      }
      return false;
    });

    // Apply additional search filter if any
    if (searchTerm) {
      return filtered.filter(request => 
        request.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.configName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  // Check if an approval is ready for payroll completion (L1-L3 have approved)
  const isReadyForPayrollCompletion = (request) => {
    const levels = request.approvalLevels;
    // L1 must be approved
    const l1Ready = levels.l1.status === "approved";
    // L2 must be approved
    const l2Ready = levels.l2.status === "approved";
    // L3 must be approved  
    const l3Ready = levels.l3.status === "approved";
    
    return l1Ready && l2Ready && l3Ready;
  };

  const filteredApprovals = getFilteredApprovals();

  const handleApproval = (request, action) => {
    setSelectedRequest(request);
    setSelectedApproval(request);
    if (userRole === "payroll" && isReadyForPayrollCompletion(request)) {
      setShowCompletionModal(true);
    } else {
      setShowApprovalModal(true);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Pending Approval Requests</CardTitle>
          <CardDescription className="text-gray-400">
            Review and approve budget requests requiring your attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="mb-6 flex gap-4">
            <div className="relative flex-[3]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by ID, employee name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
            </div>
            <div className="flex-[1]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-gray-300">
                  <SelectItem value="pending" className="text-white">Pending</SelectItem>
                  <SelectItem value="all" className="text-white">All Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Approval Requests List */}
          <div className="grid gap-4 xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1">
            {filteredApprovals.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Pending Approvals</h3>
                <p className="text-gray-400">
                  {userRole === "payroll" 
                    ? "No approvals are ready for completion at this time."
                    : "You have no pending approval requests to review."}
                </p>
              </div>
            ) : (
              filteredApprovals.map((request) => (
                <div key={request.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:bg-slate-700/70 transition-colors">
                  <div className="space-y-3">
                    {/* Header with ID and Status */}
                    <div className="space-y-2">
                      <h3 className="font-bold text-white text-lg">{request.id}</h3>
                      <Badge className={
                        request.status === "pending_payroll" 
                          ? "bg-blue-500 text-white text-sm"
                          : "bg-yellow-500 text-white text-sm"
                      }>
                        {request.status === "pending_payroll" 
                          ? "Ready for Completion" 
                          : `Level ${request.currentLevel} Review`}
                      </Badge>
                      {userRole === "payroll" && (
                        <Badge variant="outline" className="border-green-500 text-green-400 text-sm ml-2">
                          All Levels Approved
                        </Badge>
                      )}
                    </div>
                    
                    {/* Configuration Name */}
                    <p className="text-sm text-gray-300 font-medium">{request.configName}</p>
                    
                    {/* Employee */}
                    <p className="text-base text-white">
                      <span className="font-semibold">Employee:</span> {request.employeeName}
                    </p>
                    
                    {/* Amount */}
                    <div className="text-center py-2">
                      <p className="text-2xl font-bold text-white">₱{request.amount.toLocaleString()}</p>
                    </div>
                    
                    {/* Approval Progress */}
                    <div className="space-y-1 text-xs">
                      <p className="text-gray-400 font-medium">Approval Progress:</p>
                      {Object.entries(request.approvalLevels).map(([level, approval]) => {
                        const levelName = level === "payroll" ? "Payroll" : `L${level.replace('l', '')}`;
                        const isCompleted = approval.status === "approved";
                        const isPending = approval.status === "pending";
                        
                        // Check for self-request scenarios
                        const selfRequestType = request?.requestedBy;
                        const isSelfRequest = (
                          (level === "l1" && selfRequestType === "L1") ||
                          (level === "payroll" && selfRequestType === "payroll")
                        );
                        
                        return (
                          <div key={level} className={`flex items-center text-xs p-1 rounded ${
                            isCompleted ? 'bg-green-800/30 text-green-300' : 
                            isPending ? 'bg-yellow-800/30 text-yellow-300' : 
                            'bg-gray-800/30 text-gray-400'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-3 h-3 mr-1.5 text-green-400" />
                            ) : isPending ? (
                              <Clock className="w-3 h-3 mr-1.5 text-yellow-400" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1.5 text-gray-400" />
                            )}
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{levelName}:</span>
                              {isSelfRequest && (
                                <Badge className="bg-blue-500 text-white text-[9px] px-1 py-0">
                                  {level === "l1" ? "Self-Req" : "Self-Req"}
                                </Badge>
                              )}
                            </div>
                            {isCompleted ? (
                              <span className="text-xs ml-1">
                                {approval.approver} ({approval.approvedAt})
                              </span>
                            ) : isPending ? (
                              <span className="text-xs ml-1">
                                {approval.mainApprover} / {approval.backupApprover}
                              </span>
                            ) : (
                              <span className="text-xs ml-1">Pending</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-gray-300 line-clamp-2">{request.description}</p>
                    
                    {/* Submitted Date */}
                    <p className="text-sm text-gray-400">Submitted: {request.submittedAt}</p>
                    
                    {/* View Details Button */}
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleViewDetails(request)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent 
          className="bg-slate-800 border-slate-700 text-white w-full max-w-none h-[95vh] overflow-hidden flex flex-col" 
          style={{width: '70vw', maxWidth: '70vw'}}
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-white">
              Approval Request Details
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedRequest?.description || 'No description available'}
            </DialogDescription>
          </DialogHeader>

          <div 
            className="flex-1 overflow-y-scroll overflow-x-hidden"
            style={{
              scrollbarWidth: 'thick',
              scrollbarColor: '#64748b #1e293b',
              scrollbarGutter: 'stable'
            }}
          >
            <style>{`
              .flex-1::-webkit-scrollbar {
                width: 16px;
                display: block !important;
                visibility: visible !important;
              }
              .flex-1::-webkit-scrollbar-track {
                background: #1e293b;
                border-radius: 8px;
                border: 1px solid #334155;
                display: block !important;
              }
              .flex-1::-webkit-scrollbar-thumb {
                background: #64748b;
                border-radius: 8px;
                border: 2px solid #1e293b;
                min-height: 40px;
                display: block !important;
              }
              .flex-1::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
              .flex-1::-webkit-scrollbar-corner {
                background: #1e293b;
                display: block !important;
              }
              .flex-1::-webkit-scrollbar-button {
                display: block !important;
                height: 16px;
                background: #334155;
              }
              .flex-1::-webkit-scrollbar-button:hover {
                background: #475569;
              }
            `}</style>
            <div className="space-y-4 p-3 pr-6">

          {/* Budget Configuration Summary */}
          <div className="border border-slate-600 rounded-lg p-3 bg-slate-900/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-slate-400">Budget Configuration:</span>
                  <p className="text-white font-medium">Q4 Performance Incentives 2024</p>
                  <p className="text-slate-300 text-xs mt-1">Quarterly performance bonuses for outstanding employee achievements across all departments</p>
                </div>
                <div>
                  <span className="text-sm text-slate-400">Approval Description:</span>
                  <p className="text-slate-300 text-sm">Outstanding performance in client project delivery and team collaboration</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-400">Request Total Amount:</span>
                  <p className="text-green-400 font-bold text-lg">+₱51,000</p>
                </div>
                <div>
                  <span className="text-sm text-slate-400">Budget Status:</span>
                  <p className="text-white font-medium text-lg">₱485,000 / ₱500,000</p>
                  <div className="w-full bg-slate-700 rounded-full h-2 mt-1 relative overflow-hidden">
                    {(() => {
                      const currentAmount = 485000;
                      const totalBudget = 500000;
                      const requestedAmount = 51000;
                      const currentPercentage = (currentAmount / totalBudget) * 100;
                      const afterApprovalAmount = currentAmount + requestedAmount;
                      const afterApprovalPercentage = (afterApprovalAmount / totalBudget) * 100;
                      const requestedPercentage = (requestedAmount / totalBudget) * 100;
                      const exceedsBudget = afterApprovalAmount > totalBudget;
                      
                      if (exceedsBudget) {
                        // If exceeds budget, show current + orange for the requested part
                        const maxRequestedPercentage = Math.min(requestedPercentage, 100 - currentPercentage);
                        return (
                          <>
                            <div className="bg-blue-500 h-2 rounded-l-full" style={{width: `${currentPercentage}%`}}></div>
                            <div className="bg-orange-500 h-2 absolute top-0" style={{left: `${currentPercentage}%`, width: `${maxRequestedPercentage}%`}}></div>
                          </>
                        );
                      } else {
                        // If within budget, show current + green for requested
                        return (
                          <>
                            <div className="bg-blue-500 h-2 rounded-l-full" style={{width: `${currentPercentage}%`}}></div>
                            <div className="bg-green-500 h-2 absolute top-0" style={{left: `${currentPercentage}%`, width: `${requestedPercentage}%`}}></div>
                          </>
                        );
                      }
                    })()}
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Current: ₱485,000 (97%)</span>
                    <span className="text-orange-400">+₱51,000 requested</span>
                  </div>
                  <p className="text-xs text-orange-400">After approval: ₱536,000 / ₱500,000 (107.2% - ₱36,000 over budget)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 py-2 flex-1 overflow-hidden min-h-0">
            {/* File Preview Section */}
            <div className="border border-slate-600 rounded-lg p-3 flex flex-col h-[65vh]">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-medium">Uploaded Data</h3>
                  {(() => {
                    const employees = [
                      { id: "EMP001", name: "John Martinez", dept: "Sales", pos: "Senior Sales Representative", amount: "₱15,000", type: "Performance Bonus", notes: "Exceeded Q4 sales targets by 120%", isNegative: false, hasWarning: false },
                      { id: "EMP002", name: "Maria Santos", dept: "Marketing", pos: "Marketing Specialist", amount: "₱12,000", type: "Campaign Success", notes: "Led successful product launch campaign", isNegative: false, hasWarning: false },
                      { id: "EMP003", name: "Carlos Rivera", dept: "Engineering", pos: "Software Developer", amount: "₱18,000", type: "Innovation Bonus", notes: "Delivered critical system optimization ahead of schedule", isNegative: false, hasWarning: false },
                      { id: "EMP004", name: "Ana Gonzalez", dept: "Customer Service", pos: "Team Lead", amount: "-₱2,500", type: "Adjustment", notes: "Overtime compensation adjustment - previous overpayment", isNegative: true, hasWarning: true },
                      { id: "EMP005", name: "David Chen", dept: "Finance", pos: "Financial Analyst", amount: "₱8,500", type: "Performance Bonus", notes: "Outstanding budget variance analysis", isNegative: false, hasWarning: false },
                      { id: "EMP006", name: "Lisa Wang", dept: "Operations", pos: "Operations Manager", amount: "-₱1,200", type: "Deduction", notes: "Equipment damage deduction - laptop replacement", isNegative: true, hasWarning: true }
                    ];
                    const warningCount = employees.filter(emp => emp.isNegative && emp.hasWarning).length;
                    return warningCount > 0 && (
                      <span className="bg-yellow-600 text-yellow-100 text-xs px-2 py-1 rounded-full font-medium">
                        ⚠ {warningCount} Warning{warningCount > 1 ? 's' : ''}
                      </span>
                    );
                  })()}
                </div>
                <span className="text-xs text-slate-400">sample_request.xlsx</span>
              </div>
              
              {/* Search Bar */}
              <div className="mb-2 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employees by name, ID, department, or position..."
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
              
              <div className="bg-slate-900 rounded-lg p-2 flex-1 overflow-hidden min-h-0">
                <div 
                  className="h-full overflow-y-auto overflow-x-auto"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#475569 #1e293b'
                  }}
                >
                  <table className="w-full text-sm table-auto">
                    <thead className="bg-slate-700 sticky top-0">
                      <tr>
                        <th 
                          className="px-3 py-3 text-left font-medium text-slate-200 w-24 cursor-pointer hover:bg-slate-600 transition-colors text-sm"
                          onClick={() => {
                            if (sortField === 'id') {
                              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('id');
                              setSortDirection('asc');
                            }
                          }}
                        >
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            Employee ID
                            {sortField === 'id' && (
                              <span className="text-sm">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-3 py-3 text-left font-medium text-slate-200 w-40 cursor-pointer hover:bg-slate-600 transition-colors text-sm"
                          onClick={() => {
                            if (sortField === 'name') {
                              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('name');
                              setSortDirection('asc');
                            }
                          }}
                        >
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            Full Name
                            {sortField === 'name' && (
                              <span className="text-sm">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-3 py-3 text-left font-medium text-slate-200 w-36 cursor-pointer hover:bg-slate-600 transition-colors text-sm"
                          onClick={() => {
                            if (sortField === 'dept') {
                              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('dept');
                              setSortDirection('asc');
                            }
                          }}
                        >
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            Department
                            {sortField === 'dept' && (
                              <span className="text-sm">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-3 py-3 text-left font-medium text-slate-200 w-40 cursor-pointer hover:bg-slate-600 transition-colors text-sm"
                          onClick={() => {
                            if (sortField === 'pos') {
                              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('pos');
                              setSortDirection('asc');
                            }
                          }}
                        >
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            Position
                            {sortField === 'pos' && (
                              <span className="text-sm">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-3 py-3 text-left font-medium text-slate-200 w-28 cursor-pointer hover:bg-slate-600 transition-colors text-sm"
                          onClick={() => {
                            if (sortField === 'amount') {
                              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('amount');
                              setSortDirection('desc'); // Default to highest amount first
                            }
                          }}
                        >
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            Amount
                            {sortField === 'amount' && (
                              <span className="text-sm">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th className="px-3 py-3 text-left font-medium text-slate-200 text-sm whitespace-nowrap">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-600">
                      {(() => {
                        const employeeData = [
                        { id: "IT001", name: "Michael Chen", dept: "IT - Development", pos: "Senior Developer", amount: "₱3,200", type: "Performance Bonus", notes: "Exceptional code quality and team leadership", isNegative: false, hasWarning: false },
                        { id: "IT002", name: "Anna Rodriguez", dept: "IT - Development", pos: "Full Stack Developer", amount: "₱2,800", type: "Project Completion", notes: "Successfully delivered client portal on time", isNegative: false, hasWarning: false },
                        { id: "IT003", name: "James Wilson", dept: "IT - Infrastructure", pos: "DevOps Engineer", amount: "-₱1,500", type: "Equipment Deduction", notes: "Laptop damage compensation deduction", isNegative: true, hasWarning: true },
                        { id: "IT004", name: "Sarah Wilson", dept: "IT - Support", pos: "Technical Support Lead", amount: "₱2,200", type: "Customer Excellence", notes: "Customer satisfaction 98%", isNegative: false, hasWarning: false },
                        { id: "IT005", name: "David Brown", dept: "IT - Security", pos: "Security Analyst", amount: "₱2,800", type: "Security Excellence", notes: "Zero security incidents", isNegative: false, hasWarning: false },
                        { id: "FIN001", name: "Linda Martinez", dept: "Finance", pos: "Senior Accountant", amount: "-₱800", type: "Adjustment", notes: "Previous month overtime adjustment - correction", isNegative: true, hasWarning: true },
                        { id: "FIN002", name: "Robert Kim", dept: "Finance", pos: "Financial Analyst", amount: "₱2,600", type: "Analysis Excellence", notes: "Outstanding budget variance analysis", isNegative: false, hasWarning: false },
                        { id: "HR001", name: "Jennifer Lee", dept: "Human Resources", pos: "HR Manager", amount: "₱3,000", type: "Team Development", notes: "Successful onboarding program launch", isNegative: false, hasWarning: false },
                        { id: "HR002", name: "Thomas Garcia", dept: "Human Resources", pos: "Recruiter", amount: "₱2,100", type: "Hiring Success", notes: "Exceeded quarterly hiring targets" },
                        { id: "MKT001", name: "Emily Davis", dept: "Marketing", pos: "Marketing Manager", amount: "₱2,700", type: "Campaign Success", notes: "Q3 campaign generated 150% ROI" },
                        { id: "MKT002", name: "Alex Johnson", dept: "Marketing", pos: "Digital Marketing Specialist", amount: "₱2,300", type: "Social Media Growth", notes: "Increased engagement by 85%" },
                        { id: "SAL001", name: "Maria Gonzalez", dept: "Sales", pos: "Sales Manager", amount: "₱3,500", type: "Sales Achievement", notes: "Exceeded annual target by 120%" },
                        { id: "SAL002", name: "Kevin Wang", dept: "Sales", pos: "Account Executive", amount: "₱2,900", type: "Client Retention", notes: "Retained 95% of key accounts" },
                        { id: "OPS001", name: "Nicole Taylor", dept: "Operations", pos: "Operations Manager", amount: "₱2,800", type: "Process Improvement", notes: "Reduced operational costs by 15%" },
                        { id: "OPS002", name: "Mark Anderson", dept: "Operations", pos: "Logistics Coordinator", amount: "₱2,000", type: "Efficiency Bonus", notes: "Optimized delivery routes, saved 20% time" },
                        { id: "IT006", name: "Rachel Green", dept: "IT - QA", pos: "QA Lead", amount: "₱2,500", type: "Quality Excellence", notes: "Zero critical bugs in production" },
                        { id: "IT007", name: "Carlos Lopez", dept: "IT - Development", pos: "Frontend Developer", amount: "₱2,400", type: "UI Innovation", notes: "Improved user experience metrics by 30%" },
                        { id: "FIN003", name: "Sophie Chen", dept: "Finance", pos: "Budget Analyst", amount: "₱2,300", type: "Cost Optimization", notes: "Identified ₱50k in cost savings" },
                        { id: "HR003", name: "Daniel Kim", dept: "Human Resources", pos: "Training Coordinator", amount: "₱2,200", type: "Training Excellence", notes: "95% training completion rate" },
                        { id: "MKT003", name: "Isabella White", dept: "Marketing", pos: "Content Creator", amount: "₱2,100", type: "Content Quality", notes: "Viral content reached 2M+ views" },
                        { id: "SAL003", name: "Ryan Foster", dept: "Sales", pos: "Inside Sales Rep", amount: "₱2,400", type: "Lead Conversion", notes: "Highest lead conversion rate this quarter" },
                        { id: "IT008", name: "Patricia Moore", dept: "IT - Support", pos: "Help Desk Manager", amount: "₱2,600", type: "Customer Service", notes: "Reduced ticket resolution time by 35%" },
                        { id: "FIN004", name: "Andrew Clark", dept: "Finance", pos: "Tax Specialist", amount: "₱2,500", type: "Compliance Excellence", notes: "Perfect tax compliance record" },
                        { id: "HR004", name: "Michelle Turner", dept: "Human Resources", pos: "Benefits Administrator", amount: "₱2,200", type: "Process Innovation", notes: "Streamlined benefits enrollment process" },
                        { id: "MKT004", name: "Christopher Hall", dept: "Marketing", pos: "SEO Specialist", amount: "₱2,300", type: "Traffic Growth", notes: "Increased organic traffic by 120%" },
                        { id: "SAL004", name: "Amanda Wright", dept: "Sales", pos: "Territory Manager", amount: "₱3,100", type: "Territory Expansion", notes: "Opened 3 new high-value territories" },
                        { id: "OPS003", name: "Gregory Adams", dept: "Operations", pos: "Supply Chain Analyst", amount: "₱2,400", type: "Cost Reduction", notes: "Optimized supply chain, saved ₱75k annually" },
                        { id: "IT009", name: "Rebecca Nelson", dept: "IT - Development", pos: "Mobile Developer", amount: "₱2,700", type: "App Innovation", notes: "Delivered award-winning mobile app" },
                        { id: "FIN005", name: "Jonathan Baker", dept: "Finance", pos: "Investment Analyst", amount: "₱2,800", type: "Portfolio Performance", notes: "Generated 15% above market returns" },
                        { id: "HR005", name: "Stephanie Lewis", dept: "Human Resources", pos: "Employee Relations", amount: "₱2,300", type: "Conflict Resolution", notes: "Resolved 100% of escalated cases" },
                        ];

                        // Add default values for missing properties and filter data based on search term
                        let filteredData = employeeData.map(emp => ({
                          ...emp,
                          isNegative: emp.isNegative !== undefined ? emp.isNegative : emp.amount.startsWith('-'),
                          hasWarning: emp.hasWarning !== undefined ? emp.hasWarning : emp.amount.startsWith('-')
                        })).filter(emp => 
                          emp.id.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                          emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                          emp.dept.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                          emp.pos.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                          emp.type.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                          emp.notes.toLowerCase().includes(employeeSearchTerm.toLowerCase())
                        );

                        // Sort data if sort field is set
                        if (sortField) {
                          filteredData.sort((a, b) => {
                            let aValue = a[sortField];
                            let bValue = b[sortField];
                            
                            // Handle amount sorting (remove ₱ and convert to number)
                            if (sortField === 'amount') {
                              aValue = parseInt(aValue.replace(/₱|,/g, ''));
                              bValue = parseInt(bValue.replace(/₱|,/g, ''));
                            } else {
                              aValue = aValue.toLowerCase();
                              bValue = bValue.toLowerCase();
                            }
                            
                            if (sortDirection === 'asc') {
                              return aValue > bValue ? 1 : -1;
                            } else {
                              return aValue < bValue ? 1 : -1;
                            }
                          });
                        }

                        return filteredData.map((emp, index) => (
                        <tr key={emp.id} className={`hover:bg-slate-700/30 transition-colors ${emp.hasWarning ? 'bg-yellow-900/20' : ''}`}>
                          <td className={`px-3 py-3 text-white font-medium text-sm relative ${emp.hasWarning ? 'pl-6' : ''}`}>
                            {emp.hasWarning && <span className="absolute left-3 text-yellow-400">⚠</span>}
                            {emp.id}
                          </td>
                          <td className="px-3 py-3 text-slate-300 text-sm">{emp.name}</td>
                          <td className="px-3 py-3 text-slate-300 text-sm">{emp.dept}</td>
                          <td className="px-3 py-3 text-slate-300 text-sm">{emp.pos}</td>
                          <td className={`px-3 py-3 font-semibold text-sm ${emp.isNegative ? 'text-red-400' : 'text-green-400'}`}>{emp.amount}</td>
                          <td className="px-3 py-3 text-slate-400 text-sm">{emp.notes}</td>
                        </tr>
                      ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Approval Workflow Status */}
          <div className="border border-slate-600 rounded-lg p-4 bg-slate-900/50">
            <h3 className="text-white font-medium text-lg mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Approval Workflow Status
            </h3>
            <div className="space-y-3">
              {selectedRequest?.approvalLevels && Object.entries(selectedRequest.approvalLevels).map(([level, approval]) => {
                const levelName = level === "payroll" ? "Payroll Completion" : `Level ${level.replace('l', '')} Approval`;
                const isCompleted = approval.status === "approved";
                const isPending = approval.status === "pending";
                const isSelfRequest = approval.selfRequest;
                
                // Determine if this is a self-request scenario
                const selfRequestType = selectedRequest?.requestedBy;
                const showSelfRequestLabel = (
                  (level === "l1" && selfRequestType === "L1") ||
                  (level === "payroll" && selfRequestType === "payroll")
                );
                
                return (
                  <div key={level} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    isCompleted ? 'bg-green-800/20 border-green-600/50' : 
                    isPending ? 'bg-yellow-800/20 border-yellow-600/50' :
                    'bg-gray-800/20 border-gray-600/50'
                  }`}>
                    <div className="flex-shrink-0 mt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : isPending ? (
                        <Clock className="w-5 h-5 text-yellow-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-medium">{levelName}</h4>
                          {showSelfRequestLabel && (
                            <Badge className="bg-blue-600 text-white text-xs">
                              {level === "l1" ? "L1 Self-Request" : "Payroll Self-Request"}
                            </Badge>
                          )}
                        </div>
                        <Badge className={
                          isCompleted ? "bg-green-600 text-white" :
                          isPending ? "bg-yellow-600 text-white" :
                          "bg-gray-600 text-white"
                        }>
                          {isCompleted ? "Approved" : "Pending"}
                        </Badge>
                      </div>
                      
                      {/* Show approved details for completed levels */}
                      {isCompleted && approval.approver && (
                        <div className="mt-2 grid grid-cols-12 gap-4">
                          {/* Left column - Approver details (4/12 width = 33%) */}
                          <div className="col-span-4 space-y-1">
                            <p className="text-sm text-gray-300">
                              <span className="font-medium">Approved by:</span> {approval.approver}
                            </p>
                            {approval.approverTitle && (
                              <p className="text-sm text-gray-400">
                                <span className="font-medium">Title:</span> {approval.approverTitle}
                              </p>
                            )}
                            {approval.approvedAt && (
                              <p className="text-sm text-gray-400">
                                <span className="font-medium">Approved on:</span> {approval.approvedAt}
                              </p>
                            )}
                          </div>
                          
                          {/* Right column - Approval description (8/12 width = 67%) */}
                          <div className="col-span-8 space-y-1">
                            {approval.approvalDescription && (
                              <div className="bg-slate-700/30 rounded-lg p-3 border-l-4 border-green-500">
                                <p className="text-sm text-gray-300">
                                  <span className="font-medium text-green-400">Approval Notes:</span>
                                </p>
                                {(() => {
                                  const noteId = `modal2-${level}-${approval.approver}`;
                                  const showFullNotes = expandedApprovalNotes[noteId] || false;
                                  let fullNotes = [];
                                  
                                  // Generate 3-paragraph notes based on the approval description
                                  if (approval.approvalDescription.includes("sales performance")) {
                                    fullNotes = [
                                      "Exceptional sales performance demonstrates clear value delivery to the organization. The 150% target achievement significantly contributes to quarterly revenue goals and sets an excellent example for the team.",
                                      "This outstanding performance reflects not only individual excellence but also effective implementation of our sales strategies and customer relationship management practices. The sustained high performance indicates strong market understanding and client engagement skills.",
                                      "Recognition at this level is well-deserved and should serve as motivation for continued excellence. The financial impact and positive client feedback further validate this approval decision and support future growth initiatives."
                                    ];
                                  } else if (approval.approvalDescription.includes("leadership")) {
                                    fullNotes = [
                                      "Outstanding leadership qualities demonstrated through successful project coordination. Employee has consistently mentored team members and delivered results above expectations throughout the evaluation period.",
                                      "The leadership approach shown in cross-functional team management has resulted in improved collaboration and innovative problem-solving methodologies. These skills have directly contributed to enhanced project outcomes and team productivity.",
                                      "Investment in leadership development through this recognition will continue to benefit the organization through improved team dynamics, knowledge transfer, and sustainable performance improvements across multiple departments."
                                    ];
                                  } else {
                                    fullNotes = [
                                      approval.approvalDescription,
                                      "This approval reflects thorough evaluation of performance metrics, contribution to team objectives, and alignment with organizational values. The demonstrated competencies and achievements warrant recognition at this level.",
                                      "Continued excellence in this role will contribute to departmental success and serve as a benchmark for professional development standards. This recognition supports both individual growth and organizational advancement goals."
                                    ];
                                  }
                                  
                                  return (
                                    <div className="mt-1">
                                      <div className={`text-sm text-gray-300 italic space-y-2 transition-all duration-300 ${showFullNotes ? 'max-h-none' : 'max-h-16 overflow-hidden relative'}`}>
                                        {showFullNotes ? (
                                          <>
                                            <p>"{fullNotes[0]}"</p>
                                            <p>"{fullNotes[1]}"</p>
                                            <p>"{fullNotes[2]}"</p>
                                          </>
                                        ) : (
                                          <p>
                                            "{fullNotes[0].substring(0, 140)}..."
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => toggleApprovalNotes(noteId)}
                                        className="mt-2 text-xs text-green-400 hover:text-green-300 underline transition-colors"
                                      >
                                        {showFullNotes ? 'See less' : 'See more'}
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Show pending approver details */}
                      {isPending && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-400">
                            Waiting for approval from:
                          </p>
                          {approval.mainApprover && (
                            <p className="text-sm text-gray-300">
                              <span className="font-medium">Main Approver:</span> {approval.mainApprover}
                            </p>
                          )}
                          {approval.backupApprover && (
                            <p className="text-sm text-gray-300">
                              <span className="font-medium">Backup Approver:</span> {approval.backupApprover}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description/Notes Section */}
          <div className="border border-slate-600 rounded-lg p-3 bg-slate-900/50">
            <Label htmlFor="approval-description" className="text-slate-300 text-sm font-medium">
              Approval/Rejection Description
            </Label>
            <Textarea
              id="approval-description"
              placeholder="Enter your comments, notes, or reasons for approval/rejection..."
              value={approvalDescription}
              onChange={(e) => setApprovalDescription(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 resize-none"
              rows={2}
            />
            <p className="text-xs text-slate-400 mt-1">
              This description will be included with your approval/rejection decision.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 pb-4">
            {userRole === "payroll" ? (
              <>
                <Button 
                  onClick={() => {
                    setSelectedApproval(selectedRequest);
                    setShowDetailsModal(false);
                    setShowApprovalModal(true);
                  }}
                  className="flex-1 !bg-gray-600 hover:!bg-gray-700 text-white border-0"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    setSelectedApproval(selectedRequest);
                    setShowDetailsModal(false);
                    setShowApprovalModal(true);
                  }}
                  className="flex-1 !bg-blue-600 hover:!bg-blue-700 text-white border-0"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => {
                    setSelectedApproval(selectedRequest);
                    setShowDetailsModal(false);
                    setShowApprovalModal(true);
                  }}
                  className="flex-1 !bg-pink-600 hover:!bg-pink-700 text-white border-0"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  onClick={() => {
                    setSelectedApproval(selectedRequest);
                    setShowDetailsModal(false);
                    setShowApprovalModal(true);
                  }}
                  className="flex-1 !bg-green-600 hover:!bg-green-700 text-white border-0"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Standard Approval/Rejection Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Review Approval Request
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedRequest?.id} - {selectedRequest?.configName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
              <p className="text-sm"><span className="font-medium text-white">Employee:</span> <span className="text-gray-300">{selectedRequest?.employeeName}</span></p>
              <p className="text-sm"><span className="font-medium text-white">Amount:</span> <span className="text-gray-300">₱{selectedRequest?.amount.toLocaleString()}</span></p>
              <p className="text-sm"><span className="font-medium text-white">Reason:</span> <span className="text-gray-300">{selectedRequest?.description}</span></p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="comments" className="text-white">Comments (Optional)</Label>
              <Textarea
                id="comments"
                placeholder="Add any comments about your decision..."
                rows={3}
                className="bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowApprovalModal(false)} className="border-slate-600 text-white hover:bg-slate-700">
              Cancel
            </Button>
            <Button variant="outline" className="border-pink-600 text-pink-400 hover:bg-pink-600 hover:text-white">
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payroll Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Complete Approval Process
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Final step: Complete the approved request for payroll processing
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
              <p className="text-sm"><span className="font-medium text-white">Request ID:</span> <span className="text-gray-300">{selectedRequest?.id}</span></p>
              <p className="text-sm"><span className="font-medium text-white">Employee:</span> <span className="text-gray-300">{selectedRequest?.employeeName}</span></p>
              <p className="text-sm"><span className="font-medium text-white">Amount:</span> <span className="text-gray-300">₱{selectedRequest?.amount.toLocaleString()}</span></p>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-green-400 font-medium">All Levels Approved</span>
              </div>
              <p className="text-xs text-green-300">This request has been approved by all required management levels and is ready for payroll completion.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payrollComments" className="text-white">Payroll Processing Notes</Label>
              <Textarea
                id="payrollComments"
                placeholder="Add any payroll processing notes..."
                rows={3}
                className="bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCompletionModal(false)} className="border-slate-600 text-white hover:bg-slate-700">
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Complete & Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detailed Request Modal */}
      <Dialog open={showRequestDetailModal} onOpenChange={setShowRequestDetailModal}>
        <DialogContent 
          className="bg-slate-800 border-slate-700 text-white w-full max-w-none h-[90vh] overflow-hidden flex flex-col" 
          style={{width: '70vw', maxWidth: '70vw'}}
        >
          <DialogHeader className="pb-4 border-b border-slate-600">
            <DialogTitle className="text-2xl font-bold text-white">
              Request Details - {selectedOngoingRequest?.id}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Complete approval workflow information and status tracking
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 #1e293b' }}>
            <div className="space-y-6 py-4">
              
              {/* Request Overview */}
              <div className="bg-slate-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Request Overview</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-400">Request ID:</span>
                      <p className="text-white font-medium">{selectedOngoingRequest?.id}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-400">Budget Configuration:</span>
                      <p className="text-white font-medium">{selectedOngoingRequest?.configName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-400">Description:</span>
                      <p className="text-gray-300">{selectedOngoingRequest?.description}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-400">Amount:</span>
                      <p className="text-2xl font-bold text-white">₱{selectedOngoingRequest?.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-400">Submitted:</span>
                      <p className="text-white">{selectedOngoingRequest?.submittedAt}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-400">Current Status:</span>
                      <Badge className={`${getStatusColor(selectedOngoingRequest?.status)} text-white`}>
                        {getStatusText(selectedOngoingRequest?.status, selectedOngoingRequest?.currentLevel)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Configuration Details */}
              <div className="bg-slate-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Budget Configuration Details</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-400">Configuration Name:</span>
                      <p className="text-white font-medium">{selectedOngoingRequest?.configName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-400">Total Budget:</span>
                      <p className="text-white font-medium">₱500,000</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-400">Budget Manager:</span>
                      <p className="text-white font-medium">Sarah Johnson - HR Manager</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-400">Description:</span>
                      <p className="text-gray-300">Performance-based bonus program for Q1 2024 achievements including individual and team bonuses for exceptional customer service and project delivery.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Approval Workflow Status */}
              <div className="bg-slate-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Approval Workflow Status</h3>
                <div className="space-y-4">
                  {selectedOngoingRequest?.progress && Object.entries(selectedOngoingRequest.progress).map(([level, info]) => (
                    <div key={level} className="flex items-start gap-4 p-4 bg-slate-600/30 rounded-lg">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        info.status === 'approved' ? 'bg-green-500 text-white' :
                        info.status === 'pending' ? 'bg-yellow-500 text-white' :
                        'bg-gray-600 text-gray-400'
                      }`}>
                        {level === 'payroll' ? 'P' : level.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-white">
                            {level === 'payroll' ? 'Payroll Processing' : `Level ${level.toUpperCase()} Approval`}
                          </h4>
                          <Badge className={`${
                            info.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            info.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}>
                            {info.status === 'approved' ? 'Approved' :
                             info.status === 'pending' ? 'Pending' : 'Waiting'}
                          </Badge>
                        </div>
                        {info.status === 'approved' && info.approver && info.date && (
                          <div className="mt-2 grid grid-cols-12 gap-4">
                            {/* Left column - Approver details (4/12 width = 33%) */}
                            <div className="col-span-4 space-y-1">
                              <p className="text-sm text-gray-300">
                                <span className="font-medium">Approved by:</span> {info.approver}
                              </p>
                              <p className="text-sm text-gray-400">
                                <span className="font-medium">Date:</span> {info.date}
                              </p>
                            </div>
                            
                            {/* Right column - Approval description (8/12 width = 67%) */}
                            <div className="col-span-8 space-y-1">
                              {info.approvalDescription && (
                                <div className="bg-slate-700/30 rounded-lg p-3 border-l-4 border-green-500">
                                  <p className="text-sm text-gray-300">
                                    <span className="font-medium text-green-400">Approval Notes:</span>
                                  </p>
                                  {(() => {
                                    const noteId = `modal3-${level}-${info.approver}`;
                                    const showFullNotes = expandedApprovalNotes[noteId] || false;
                                    const fullNotes = [
                                      info.approvalDescription,
                                      "The comprehensive evaluation process confirms that all criteria for this approval level have been met with distinction. Performance indicators and departmental feedback support this recognition decision.",
                                      "This approval represents not only acknowledgment of past achievements but also confidence in continued contributions to organizational success. The documented impact and stakeholder endorsements validate this decision."
                                    ];
                                    
                                    return (
                                      <div className="mt-1">
                                        <div className={`text-sm text-gray-300 italic space-y-2 transition-all duration-300 ${showFullNotes ? 'max-h-none' : 'max-h-16 overflow-hidden relative'}`}>
                                          {showFullNotes ? (
                                            <>
                                              <p>"{fullNotes[0]}"</p>
                                              <p>"{fullNotes[1]}"</p>
                                              <p>"{fullNotes[2]}"</p>
                                            </>
                                          ) : (
                                            <p>
                                              "{fullNotes[0].substring(0, 140)}..."
                                            </p>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => toggleApprovalNotes(noteId)}
                                          className="mt-2 text-xs text-green-400 hover:text-green-300 underline transition-colors"
                                        >
                                          {showFullNotes ? 'See less' : 'See more'}
                                        </button>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {info.status === 'pending' && (
                          <p className="text-sm text-gray-400">Awaiting approval from the next level approver</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-slate-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Approval Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-400">Submitted:</span>
                    <span className="text-white">{selectedOngoingRequest?.submittedAt}</span>
                  </div>
                  {selectedOngoingRequest?.progress && Object.entries(selectedOngoingRequest.progress)
                    .filter(([_, info]) => info.status === 'approved' && info.date)
                    .map(([level, info]) => (
                      <div key={level} className="flex items-center gap-3 text-sm">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-gray-400">
                          {level === 'payroll' ? 'Payroll' : `L${level.toUpperCase()}`} Approved:
                        </span>
                        <span className="text-white">{info.date}</span>
                        <span className="text-gray-400">by {info.approver}</span>
                      </div>
                    ))}
                </div>
              </div>

            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-600">
            <Button 
              variant="outline" 
              onClick={() => setShowRequestDetailModal(false)} 
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Approval History Component
function ApprovalHistory({ userRole }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Mock approval history
  const approvalHistory = [
    {
      id: "APP-001",
      configName: "Q4 2023 Performance Bonus",
      employeeName: "Sarah Wilson",
      amount: 3000,
      status: "completed",
      submittedAt: "2024-09-15",
      completedAt: "2024-09-18",
      approvedBy: ["John Manager", "Sarah Director", "Mike VP"],
      completedBy: "Payroll Team",
    },
    {
      id: "APP-002", 
      configName: "Project Milestone Reward",
      employeeName: "David Chen",
      amount: 1800,
      status: "rejected",
      submittedAt: "2024-09-10",
      rejectedAt: "2024-09-12",
      rejectedBy: "John Manager",
      rejectionReason: "Insufficient project completion documentation",
    },
  ];

  const getStatusBadge = (status) => {
    const variants = {
      completed: "bg-sky-400 text-white", // Light blue for completed
      rejected: "bg-pink-500 text-white", // Red-pink for rejected
      pending: "bg-yellow-500 text-white", // Yellow for pending
      done: "bg-green-500 text-white", // Green for done
    };
    return variants[status] || variants.pending;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Approval History & Logs</CardTitle>
          <CardDescription className="text-gray-400">
            Complete history of all approval requests and their outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="mb-6 flex gap-4">
            <div className="relative flex-[2]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by ID, employee name, configuration..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-gray-300 text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
            </div>
            <div className="flex-[1]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-gray-300">
                  <SelectItem value="all" className="text-white">All Status</SelectItem>
                  <SelectItem value="completed" className="text-white">Completed</SelectItem>
                  <SelectItem value="rejected" className="text-white">Rejected</SelectItem>
                  <SelectItem value="pending" className="text-white">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-[1]">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-gray-300">
                  <SelectItem value="all" className="text-white">All Time</SelectItem>
                  <SelectItem value="week" className="text-white">Last Week</SelectItem>
                  <SelectItem value="month" className="text-white">Last Month</SelectItem>
                  <SelectItem value="quarter" className="text-white">Last Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* History Table */}
          <div className="border border-slate-600 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">Request ID</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">Employee</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">Configuration</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">Submitted</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">Processed</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-600">
                {approvalHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-white font-medium">{record.id}</td>
                    <td className="px-4 py-3 text-slate-300">{record.employeeName}</td>
                    <td className="px-4 py-3 text-slate-300">{record.configName}</td>
                    <td className="px-4 py-3 text-white font-semibold">₱{record.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusBadge(record.status)}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">{record.submittedAt}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {record.status === "completed" ? record.completedAt : 
                       record.status === "rejected" ? record.rejectedAt : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
