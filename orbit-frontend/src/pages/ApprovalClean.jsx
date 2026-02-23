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
import { getBudgetConfigurations } from '../services/budgetConfigService';

const getToken = () => localStorage.getItem('authToken') || '';

const normalizeConfig = (config) => ({
  id: config.budget_id || config.id,
  name: config.budget_name || config.name || config.budgetName || 'Untitled Budget',
  department: config.department || config.budget_department || 'All',
  description: config.budget_description || config.description || '',
  maxAmount: config.max_limit || config.maxAmount || config.budgetControlLimit || config.total_budget || 0,
  usedAmount: config.budget_used || config.usedAmount || 0,
});

const normalizeRequest = (request) => ({
  id: request.approval_request_id || request.id || request.request_id,
  title: request.title || request.request_title || 'Untitled Request',
  description: request.description || request.request_description || '',
  amount: request.total_request_amount || request.amount || 0,
  status: request.status || 'draft',
  submittedAt: request.submitted_at || request.created_at || '',
  budgetName: request.budget_name || request.configName || 'Budget Configuration',
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

export default function ApprovalClean() {
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

  const [myRequests, setMyRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [requestMode, setRequestMode] = useState('individual');
  const [requestDetails, setRequestDetails] = useState({
    title: '',
    description: '',
    totalAmount: '',
  });
  const [individualRequest, setIndividualRequest] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    position: '',
    rewardType: '',
    amount: '',
    isDeduction: false,
    notes: '',
  });
  const [bulkItemsText, setBulkItemsText] = useState('');
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const token = useMemo(() => getToken(), [refreshKey]);

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

  const handleOpenModal = (config) => {
    setSelectedConfig(config);
    setRequestMode('individual');
    setRequestDetails({ title: '', description: '', totalAmount: '' });
    setIndividualRequest({
      employeeId: '',
      employeeName: '',
      department: '',
      position: '',
      rewardType: '',
      amount: '',
      isDeduction: false,
      notes: '',
    });
    setBulkItemsText('');
    setSubmitError(null);
    setSubmitSuccess(null);
    setShowModal(true);
  };

  const buildCreatePayload = (totalAmount) => ({
    budget_id: selectedConfig?.id,
    title: requestDetails.title.trim(),
    description: requestDetails.description.trim(),
    total_request_amount: totalAmount,
  });

  const validateCommon = () => {
    if (!selectedConfig?.id) return 'Select a budget configuration.';
    if (!requestDetails.title.trim()) return 'Request title is required.';
    if (!requestDetails.description.trim()) return 'Request summary is required.';
    return null;
  };

  const handleSubmitIndividual = async () => {
    const commonError = validateCommon();
    if (commonError) {
      setSubmitError(commonError);
      return;
    }

    if (!individualRequest.employeeId || !individualRequest.employeeName || !individualRequest.department || !individualRequest.position || !individualRequest.rewardType || !individualRequest.amount) {
      setSubmitError('Complete all required individual fields.');
      return;
    }

    const amountValue = Number(individualRequest.amount);
    if (!amountValue || Number.isNaN(amountValue)) {
      setSubmitError('Enter a valid amount.');
      return;
    }

    const totalAmount = Number(requestDetails.totalAmount || amountValue);

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
          item_type: individualRequest.rewardType,
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

    let parsedItems = [];
    try {
      parsedItems = JSON.parse(bulkItemsText || '[]');
      if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
        throw new Error('Provide at least one line item.');
      }
    } catch (error) {
      setSubmitError(error.message || 'Invalid bulk JSON format.');
      return;
    }

    const totalAmount = Number(
      requestDetails.totalAmount ||
        parsedItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const created = await approvalRequestService.createApprovalRequest(buildCreatePayload(totalAmount), token);
      const requestId = created?.id || created?.request_id || created?.approval_request_id;
      if (!requestId) throw new Error('Approval request ID not returned.');

      await approvalRequestService.addLineItemsBulk(
        requestId,
        { line_items: parsedItems },
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
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Submit New Approval Request</CardTitle>
          <CardDescription className="text-gray-400">
            Select a budget configuration and submit approval requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <div className="text-sm text-gray-400">Loading configurations...</div>
          ) : configError ? (
            <div className="text-sm text-red-400">{configError}</div>
          ) : configurations.length === 0 ? (
            <div className="text-sm text-gray-400">No configurations available.</div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1">
              {configurations.map((config) => (
                <div
                  key={config.id}
                  className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:bg-slate-700/70 transition-colors flex flex-col"
                >
                  <div className="space-y-2 flex-1">
                    <div>
                      <h3 className="font-semibold text-white text-sm">{config.name}</h3>
                      <p className="text-xs text-gray-400">{config.department}</p>
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-2">
                      {config.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="text-center text-xs text-gray-400">
                      Used Budget: ₱{Number(config.usedAmount || 0).toLocaleString('en-US')} / ₱{Number(config.maxAmount || 0).toLocaleString('en-US')}
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

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">My Ongoing Approval Requests</CardTitle>
          <CardDescription className="text-gray-400">
            Track status for your submitted approval requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <div className="text-sm text-gray-400">Loading requests...</div>
          ) : requestsError ? (
            <div className="text-sm text-red-400">{requestsError}</div>
          ) : myRequests.length === 0 ? (
            <div className="text-sm text-gray-400">No approval requests submitted yet.</div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <div key={request.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusBadgeClass(request.status)}>
                          {request.status.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-gray-400">{request.id}</span>
                      </div>
                      <h4 className="text-white font-medium">{request.title}</h4>
                      <p className="text-xs text-gray-300">{request.budgetName}</p>
                      <p className="text-xs text-gray-500">Submitted: {request.submittedAt || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-white">₱{Number(request.amount || 0).toLocaleString('en-US')}</p>
                      <p className="text-xs text-gray-400">{request.description || 'No summary provided.'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white w-full max-w-4xl p-4">
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
            <div className="border border-slate-600 rounded-lg p-3 bg-slate-900/50">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-400">Budget Configuration</p>
                  <p className="text-white font-medium">{selectedConfig?.name}</p>
                  <p className="text-xs text-slate-400">{selectedConfig?.description || 'No description provided.'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Budget Usage</p>
                  <p className="text-white text-sm">
                    ₱{Number(selectedConfig?.usedAmount || 0).toLocaleString('en-US')} / ₱{Number(selectedConfig?.maxAmount || 0).toLocaleString('en-US')}
                  </p>
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
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Employee Name *</Label>
                    <Input
                      value={individualRequest.employeeName}
                      onChange={(e) => setIndividualRequest((prev) => ({ ...prev, employeeName: e.target.value }))}
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Department *</Label>
                    <Input
                      value={individualRequest.department}
                      onChange={(e) => setIndividualRequest((prev) => ({ ...prev, department: e.target.value }))}
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Position *</Label>
                    <Input
                      value={individualRequest.position}
                      onChange={(e) => setIndividualRequest((prev) => ({ ...prev, position: e.target.value }))}
                      className="bg-slate-700 border-gray-300 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Reward Type *</Label>
                    <Select value={individualRequest.rewardType} onValueChange={(value) => setIndividualRequest((prev) => ({ ...prev, rewardType: value }))}>
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
                    <Label className="text-white">Amount *</Label>
                    <Input
                      type="number"
                      value={individualRequest.amount}
                      onChange={(e) => setIndividualRequest((prev) => ({ ...prev, amount: e.target.value }))}
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
                  <Label htmlFor="isDeduction" className="text-white text-sm">Mark as deduction</Label>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Notes</Label>
                  <Textarea
                    value={individualRequest.notes}
                    onChange={(e) => setIndividualRequest((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="bg-slate-700 border-gray-300 text-white"
                  />
                </div>
              </TabsContent>

              <TabsContent value="bulk" className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-white">Bulk Items (JSON) *</Label>
                  <Textarea
                    value={bulkItemsText}
                    onChange={(e) => setBulkItemsText(e.target.value)}
                    rows={6}
                    className="bg-slate-700 border-gray-300 text-white"
                    placeholder='[{"employee_id":"EMP001","employee_name":"Juan Dela Cruz","department":"Operations","position":"Team Lead","item_type":"performance_bonus","amount":2500}]'
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-white">Request Title *</Label>
                <Input
                  value={requestDetails.title}
                  onChange={(e) => setRequestDetails((prev) => ({ ...prev, title: e.target.value }))}
                  className="bg-slate-700 border-gray-300 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Total Request Amount</Label>
                <Input
                  type="number"
                  value={requestDetails.totalAmount}
                  onChange={(e) => setRequestDetails((prev) => ({ ...prev, totalAmount: e.target.value }))}
                  className="bg-slate-700 border-gray-300 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Request Summary *</Label>
              <Textarea
                value={requestDetails.description}
                onChange={(e) => setRequestDetails((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="bg-slate-700 border-gray-300 text-white"
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
                Submit Request
              </Button>
            ) : (
              <Button
                onClick={handleSubmitBulk}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Submit Bulk Request
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
                    <p className="text-lg font-semibold text-white">₱{Number(approval.amount || 0).toLocaleString('en-US')}</p>
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
      record.id?.toString().toLowerCase().includes(term) ||
      record.title?.toLowerCase().includes(term) ||
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
            placeholder="Search by ID, title, or configuration"
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
                      <span className="text-xs text-gray-400">{record.id}</span>
                    </div>
                    <h4 className="text-white font-medium">{record.title}</h4>
                    <p className="text-xs text-gray-300">{record.budgetName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">₱{Number(record.amount || 0).toLocaleString('en-US')}</p>
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
