import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Textarea,
} from '../ui';
import { Plus, Edit3, Power } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { handlePaste, handleRestrictedKeyDown, sanitizeOuText } from '../../utils/inputSanitizer';
import {
  createClient,
  getClientsByParentOrg,
  getOrganizations,
  updateClient,
} from '../../services/budgetConfigService';

export function ClientManagement({ role }) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedClientIds, setSelectedClientIds] = useState(new Set());
  const [editingClient, setEditingClient] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [deactivateConfirmText, setDeactivateConfirmText] = useState('');
  const [reactivateConfirmText, setReactivateConfirmText] = useState('');
  const [clientStatusTab, setClientStatusTab] = useState('active');
  const [newClientName, setNewClientName] = useState('');
  const [newClientCode, setNewClientCode] = useState('');
  const [newClientDesc, setNewClientDesc] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientDesc, setEditClientDesc] = useState('');
  const [clients, setClients] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [companyOrgId, setCompanyOrgId] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationVariant, setNotificationVariant] = useState('success');

  const token = localStorage.getItem('authToken');
  const isUuid = (value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
  const updatedBy = isUuid(user?.id) ? user.id : null;
  const userRole = role || user?.role || 'company_admin';

  const resolveCompanyOrgId = (orgs) => {
    if (user?.org_id) return user.org_id;
    if (user?.company_code) {
      const match = orgs.find(
        (org) => org.company_code === user.company_code && !org.parent_org_id
      );
      return match?.org_id || null;
    }
    const firstCompany = orgs.find((org) => !org.parent_org_id);
    return firstCompany?.org_id || null;
  };

  const fetchOrganizations = async () => {
    try {
      const data = await getOrganizations(token);
      setOrganizations(data);
      setCompanyOrgId(resolveCompanyOrgId(data));
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setOrganizations([]);
      setCompanyOrgId(null);
    }
  };

  const fetchClients = async (orgIds = []) => {
    try {
      if (!orgIds.length) {
        setClients([]);
        return;
      }
      const data = await getClientsByParentOrg(orgIds, token);
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
      setClients([]);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const companyOrgs = useMemo(
    () => organizations.filter((org) => !org.parent_org_id),
    [organizations]
  );

  const getScopedOrgIds = () => (
    userRole === 'system_admin'
      ? companyOrgs.map((org) => org.org_id)
      : companyOrgId
        ? [companyOrgId]
        : []
  );

  useEffect(() => {
    fetchClients(getScopedOrgIds());
  }, [companyOrgs, companyOrgId, userRole]);

  const currentOrg = useMemo(() => {
    if (userRole === 'system_admin') {
      return companyOrgs.length === 1 ? companyOrgs[0] : null;
    }
    return organizations.find((org) => org.org_id === companyOrgId) || null;
  }, [companyOrgs, companyOrgId, organizations, userRole]);

  const currentOrgLabel = userRole === 'system_admin'
    ? companyOrgs.length > 1
      ? 'All organizations'
      : currentOrg?.org_name || 'No organization'
    : currentOrg?.org_name || 'No organization';

  const createOrg = currentOrg || companyOrgs[0] || null;
  const createOrgLabel = createOrg?.org_name || currentOrgLabel;

  const isDeactivateConfirmed = deactivateConfirmText === 'CONFIRM';
  const isReactivateConfirmed = reactivateConfirmText === 'CONFIRM';

  const filteredClients = useMemo(() => (
    clients.filter((client) => {
      const statusValue = (client.client_status || '').toLowerCase();
      const matchesStatus = statusValue === clientStatusTab;
      const matchesSearch =
        client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.client_code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    })
  ), [clients, clientStatusTab, searchTerm]);

  const filteredClientIdSet = useMemo(
    () => new Set(filteredClients.map((client) => client.client_org_id)),
    [filteredClients]
  );

  const totalClients = filteredClients.length;

  useEffect(() => {
    if (!selectedClient) return;

    const match = clients.find((client) => client.client_org_id === selectedClient.client_org_id);
    if (!match) {
      setSelectedClient(null);
      return;
    }

    const shouldUpdate =
      match.client_name !== selectedClient.client_name ||
      match.client_description !== selectedClient.client_description ||
      match.client_code !== selectedClient.client_code ||
      match.client_status !== selectedClient.client_status ||
      match.contract_start_date !== selectedClient.contract_start_date ||
      match.contract_end_date !== selectedClient.contract_end_date;

    if (shouldUpdate) {
      setSelectedClient(match);
    }
  }, [clients, selectedClient]);

  useEffect(() => {
    setSelectedClientIds((prev) => {
      const next = new Set([...prev].filter((id) => filteredClientIdSet.has(id)));
      if (next.size === prev.size) {
        const unchanged = [...next].every((id) => prev.has(id));
        if (unchanged) {
          return prev;
        }
      }
      return next;
    });
  }, [filteredClientIdSet]);

  const notify = (message, variant = 'success') => {
    setNotificationMessage(message);
    setNotificationVariant(variant);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 4000);
  };

  const handleOuInputChange = (setter, allowNewlines = false, transform = null) => (event) => {
    const sanitized = sanitizeOuText(event.target.value, allowNewlines);
    setter(transform ? transform(sanitized) : sanitized);
  };

  const handleOuPaste = (allowNewlines = false, transform = null) => (event) => {
    handlePaste(event, (value) => {
      const sanitized = sanitizeOuText(value, allowNewlines);
      return transform ? transform(sanitized) : sanitized;
    });
  };

  const handleOuKeyDown = (allowEnter = false) => (event) => {
    handleRestrictedKeyDown(event, { allowEnter });
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim() || !newClientCode.trim()) return;

    const parentOrgId = createOrg?.org_id;
    if (!parentOrgId) {
      notify('No organization available to assign this client.', 'error');
      return;
    }

    if (isCreatingClient) return;
    setIsCreatingClient(true);

    try {
      const createdClient = await createClient(
        {
          parent_org_id: parentOrgId,
          client_code: newClientCode.trim(),
          client_name: newClientName.trim(),
          client_description: newClientDesc,
          created_by: updatedBy,
        },
        token
      );
      setShowCreateDialog(false);
      setNewClientName('');
      setNewClientCode('');
      setNewClientDesc('');
      if (createdClient) {
        setClients((prev) => [createdClient, ...prev]);
      }
      await fetchClients(getScopedOrgIds());
      notify('Client created successfully.');
    } catch (error) {
      console.error('Failed to create client:', error);
      notify('Failed to create client.', 'error');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleEditClient = async () => {
    if (!editingClient || !editClientName.trim()) return;

    if (isEditingClient) return;
    setIsEditingClient(true);

    try {
      await updateClient(
        editingClient.client_org_id,
        {
          client_name: editClientName.trim(),
          client_description: editClientDesc,
          updated_by: updatedBy,
        },
        token
      );
      setShowEditDialog(false);
      setEditingClient(null);
      await fetchClients(getScopedOrgIds());
      notify('Client updated successfully.');
    } catch (error) {
      console.error('Failed to update client:', error);
      notify('Failed to update client.', 'error');
    } finally {
      setIsEditingClient(false);
    }
  };

  const handleDeactivateClient = async () => {
    if (!selectedClient) return;

    if (isStatusUpdating) return;
    setIsStatusUpdating(true);

    try {
      await updateClient(
        selectedClient.client_org_id,
        { client_status: 'INACTIVE', updated_by: updatedBy },
        token
      );
      setSelectedClient({ ...selectedClient, client_status: 'INACTIVE' });
      setShowDeactivateDialog(false);
      setDeactivateConfirmText('');
      await fetchClients(getScopedOrgIds());
      notify('Client deactivated successfully.');
    } catch (error) {
      console.error('Failed to deactivate client:', error);
      notify('Failed to deactivate client.', 'error');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleReactivateClient = async () => {
    if (!selectedClient) return;

    if (isStatusUpdating) return;
    setIsStatusUpdating(true);

    try {
      await updateClient(
        selectedClient.client_org_id,
        { client_status: 'ACTIVE', updated_by: updatedBy },
        token
      );
      setSelectedClient({ ...selectedClient, client_status: 'ACTIVE' });
      setReactivateConfirmText('');
      await fetchClients(getScopedOrgIds());
      notify('Client reactivated successfully.');
    } catch (error) {
      console.error('Failed to reactivate client:', error);
      notify('Failed to reactivate client.', 'error');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const toggleClientSelection = (clientId) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const handleBulkStatusUpdate = async () => {
    const ids = Array.from(selectedClientIds);
    if (ids.length === 0) return;

    if (isBulkUpdating) return;
    setIsBulkUpdating(true);

    const nextStatus = clientStatusTab === 'active' ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = nextStatus === 'ACTIVE' ? 'reactivated' : 'deactivated';

    try {
      await Promise.all(
        ids.map((id) => updateClient(id, { client_status: nextStatus, updated_by: updatedBy }, token))
      );
      setSelectedClientIds(new Set());
      setShowBulkDeleteDialog(false);
      setBulkDeleteConfirmText('');
      setSelectedClient(null);
      await fetchClients(getScopedOrgIds());
      notify(`Selected clients ${actionLabel} successfully.`);
    } catch (error) {
      console.error('Failed to update selected clients:', error);
      notify('Failed to update selected clients.', 'error');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const openEditDialog = (client) => {
    setEditingClient(client);
    setEditClientName(client.client_name);
    setEditClientDesc(client.client_description || '');
    setShowEditDialog(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 w-full max-w-md">
          {notificationVariant === 'error' ? (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-400 flex-1">{notificationMessage}</p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/45 border border-emerald-400/80 rounded-lg p-4 backdrop-blur-sm shadow-2xl ring-1 ring-emerald-300/60">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-emerald-400 flex-1">{notificationMessage}</p>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="lg:col-span-2">
        <Card
          className="p-3 flex flex-col bg-slate-800/80 border-slate-700 text-white"
          style={{ height: totalClients > 7 ? Math.min(totalClients, 7) * 64 + 115 : 'fit-content' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-base">Client Management</h3>
              <p className="text-xs text-muted-foreground truncate">
                {currentOrgLabel}
              </p>
            </div>
            <Dialog
              open={showCreateDialog}
              onOpenChange={(open) => {
                if (isCreatingClient) return;
                setShowCreateDialog(open);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 bg-fuchsia-600 hover:bg-fuchsia-700 text-white">
                  <Plus className="h-3 w-3" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Client</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="clientCode">Code</Label>
                    <Input
                      id="clientCode"
                      placeholder="e.g., CLIENT-001"
                      value={newClientCode}
                      onChange={handleOuInputChange(setNewClientCode)}
                      onPaste={handleOuPaste()}
                      onKeyDown={handleOuKeyDown()}
                      maxLength={10}
                      size={8}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientName">Name</Label>
                    <Input
                      id="clientName"
                      placeholder="Client name"
                      value={newClientName}
                      onChange={handleOuInputChange(setNewClientName)}
                      onPaste={handleOuPaste()}
                      onKeyDown={handleOuKeyDown()}
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientDesc">Description</Label>
                    <Textarea
                      id="clientDesc"
                      placeholder="Optional"
                      value={newClientDesc}
                      onChange={handleOuInputChange(setNewClientDesc, true)}
                      onPaste={handleOuPaste(true)}
                      onKeyDown={handleOuKeyDown(true)}
                      maxLength={255}
                      className="min-h-[128px]"
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    Auto-assigned to: <span className="font-semibold">{createOrgLabel}</span>
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                      className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
                      disabled={isCreatingClient}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                      onClick={handleCreateClient}
                      disabled={isCreatingClient}
                    >
                      Create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={handleOuInputChange(setSearchTerm)}
            onPaste={handleOuPaste()}
            onKeyDown={handleOuKeyDown()}
            maxLength={50}
            className="h-8 mb-2 text-sm"
          />

          <div className="flex gap-1 mb-2">
            {['active', 'inactive'].map((status) => (
              <Button
                key={status}
                size="sm"
                variant={clientStatusTab === status ? 'default' : 'outline'}
                onClick={() => setClientStatusTab(status)}
                className={`text-xs border-slate-600 ${
                  clientStatusTab === status
                    ? 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white'
                    : 'bg-slate-700/40 hover:bg-slate-600/60 text-slate-100'
                }`}
              >
                {status === 'active' ? 'Active' : 'Inactive'}
              </Button>
            ))}
          </div>

          <div
            className={`space-y-1 ${totalClients > 7 ? 'overflow-y-auto pr-2' : 'overflow-hidden'}`}
            style={{
              height: totalClients > 7 ? Math.min(totalClients, 7) * 64 : 'auto',
              maxHeight: Math.min(totalClients, 7) * 64,
            }}
          >
            {filteredClients.map((client) => (
              <Card
                key={`${client.client_org_id}-${client.client_code}`}
                className={`p-2 cursor-pointer transition-colors ${
                  selectedClient?.client_code === client.client_code ? 'bg-accent border-primary' : 'hover:bg-accent'
                }`}
                onClick={() => {
                  setSelectedClientIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(client.client_org_id)) {
                      next.delete(client.client_org_id);
                      if (selectedClient?.client_org_id === client.client_org_id) {
                        setSelectedClient(null);
                      }
                    } else {
                      next.add(client.client_org_id);
                      setSelectedClient(client);
                    }
                    return next;
                  });
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Checkbox
                      checked={selectedClientIds.has(client.client_org_id)}
                      onCheckedChange={() => toggleClientSelection(client.client_org_id)}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{client.client_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.client_code}</p>
                    </div>
                  </div>
                  {(() => {
                    const statusValue = (client.client_status || '').toLowerCase();
                    return (
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      statusValue === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {client.client_status}
                  </span>
                    );
                  })()}
                </div>
              </Card>
            ))}
            {filteredClients.length === 0 && (
              <p className="text-center text-muted-foreground text-xs py-4">No clients</p>
            )}
          </div>

          {selectedClientIds.size > 1 && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-400">
                {selectedClientIds.size} selected
              </p>
              <Button
                size="sm"
                className={
                  clientStatusTab === 'active'
                    ? '!bg-red-500/80 hover:!bg-red-500 !text-white'
                    : '!bg-emerald-500/80 hover:!bg-emerald-500 !text-white'
                }
                onClick={() => setShowBulkDeleteDialog(true)}
                disabled={isBulkUpdating}
              >
                {clientStatusTab === 'active' ? 'Deactivate Selected' : 'Reactivate Selected'}
              </Button>
            </div>
          )}
        </Card>
      </div>

      <div>
        <Card className="p-3 bg-slate-800/80 border-slate-700 text-white" style={{ height: 'fit-content' }}>
          {selectedClient ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base truncate">{selectedClient.client_name}</h3>
                  <p className="text-xs text-slate-400 truncate">{selectedClient.client_code}</p>
                </div>
                {(() => {
                  const statusValue = (selectedClient.client_status || '').toLowerCase();
                  return (
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        statusValue === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {selectedClient.client_status}
                    </span>
                  );
                })()}
              </div>

              <div className="space-y-2 text-sm">
                {selectedClient.client_description && (
                  <div>
                    <Label className="text-xs text-slate-400">Description</Label>
                    <p className="text-sm">{selectedClient.client_description}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-slate-400">Created</Label>
                  <p className="text-sm">{selectedClient.created_at}</p>
                </div>
                {selectedClient.contract_start_date && (
                  <div>
                    <Label className="text-xs text-slate-400">Contract Start</Label>
                    <p className="text-sm">{selectedClient.contract_start_date}</p>
                  </div>
                )}
                {selectedClient.contract_end_date && (
                  <div>
                    <Label className="text-xs text-slate-400">Contract End</Label>
                    <p className="text-sm">{selectedClient.contract_end_date}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-2 space-y-1">
                <Dialog
                  open={showEditDialog}
                  onOpenChange={(open) => {
                    if (isEditingClient) return;
                    setShowEditDialog(open);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="w-full gap-1 text-xs bg-blue-500/80 hover:bg-blue-500 text-white"
                      onClick={() => openEditDialog(selectedClient)}
                    >
                      <Edit3 className="h-3 w-3" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Edit Client</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="editName">Name</Label>
                        <Input
                          id="editName"
                          value={editClientName}
                          onChange={handleOuInputChange(setEditClientName)}
                          onPaste={handleOuPaste()}
                          onKeyDown={handleOuKeyDown()}
                          maxLength={50}
                        />
                      </div>
                      <div>
                        <Label htmlFor="editDesc">Description</Label>
                        <Textarea
                          id="editDesc"
                          value={editClientDesc}
                          onChange={handleOuInputChange(setEditClientDesc, true)}
                          onPaste={handleOuPaste(true)}
                          onKeyDown={handleOuKeyDown(true)}
                          maxLength={255}
                          className="min-h-[128px]"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowEditDialog(false)}
                          className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
                          disabled={isEditingClient}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                          onClick={handleEditClient}
                          disabled={isEditingClient}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {(() => {
                  const statusValue = (selectedClient.client_status || '').toLowerCase();
                  return statusValue === 'active';
                })() ? (
                  <Dialog
                    open={showDeactivateDialog}
                    onOpenChange={(open) => {
                      if (isStatusUpdating) return;
                      setShowDeactivateDialog(open);
                      if (!open) {
                        setDeactivateConfirmText('');
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" className="w-full gap-1 text-xs !bg-red-500/80 hover:!bg-red-500 !text-white">
                        <Power className="h-3 w-3" />
                        Deactivate
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-800 border-slate-700">
                      <DialogHeader>
                        <DialogTitle>Deactivate?</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm">
                        Deactivate {selectedClient.client_name}? You can reactivate it later.
                      </p>
                      <div>
                        <Label className="text-xs text-slate-400">Type CONFIRM to continue</Label>
                        <Input
                          value={deactivateConfirmText}
                          onChange={handleOuInputChange(setDeactivateConfirmText, false, (value) => value.toUpperCase())}
                          onPaste={handleOuPaste(false, (value) => value.toUpperCase())}
                          onKeyDown={(event) => {
                            handleRestrictedKeyDown(event);
                            if (event.key === 'Enter' && isDeactivateConfirmed && !isStatusUpdating) {
                              event.preventDefault();
                              handleDeactivateClient();
                            }
                          }}
                          maxLength={7}
                          placeholder="CONFIRM"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowDeactivateDialog(false)}
                          className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
                          disabled={isStatusUpdating}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="!bg-red-500/80 hover:!bg-red-500 !text-white"
                          onClick={handleDeactivateClient}
                          disabled={!isDeactivateConfirmed || isStatusUpdating}
                        >
                          Deactivate
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Dialog
                    open={showReactivateDialog}
                    onOpenChange={(open) => {
                      if (isStatusUpdating) return;
                      setShowReactivateDialog(open);
                      if (!open) {
                        setReactivateConfirmText('');
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="w-full gap-1 text-xs !bg-emerald-500/80 hover:!bg-emerald-500 !text-white"
                      >
                        <Power className="h-3 w-3" />
                        Reactivate
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-800 border-slate-700">
                      <DialogHeader>
                        <DialogTitle>Reactivate?</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm">
                        Reactivate {selectedClient.client_name}? This will set the status back to ACTIVE.
                      </p>
                      <div>
                        <Label className="text-xs text-slate-400">Type CONFIRM to continue</Label>
                        <Input
                          value={reactivateConfirmText}
                          onChange={handleOuInputChange(setReactivateConfirmText, false, (value) => value.toUpperCase())}
                          onPaste={handleOuPaste(false, (value) => value.toUpperCase())}
                          onKeyDown={(event) => {
                            handleRestrictedKeyDown(event);
                            if (event.key === 'Enter' && isReactivateConfirmed && !isStatusUpdating) {
                              event.preventDefault();
                              handleReactivateClient();
                            }
                          }}
                          maxLength={7}
                          placeholder="CONFIRM"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowReactivateDialog(false)}
                          className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
                          disabled={isStatusUpdating}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="!bg-emerald-500/80 hover:!bg-emerald-500 !text-white"
                          onClick={handleReactivateClient}
                          disabled={!isReactivateConfirmed || isStatusUpdating}
                        >
                          Reactivate
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-center text-muted-foreground text-xs">Select a client</p>
            </div>
          )}
        </Card>
      </div>

      <Dialog
        open={showBulkDeleteDialog}
        onOpenChange={(open) => {
          if (isBulkUpdating) return;
          setShowBulkDeleteDialog(open);
          if (!open) {
            setBulkDeleteConfirmText('');
          }
        }}
      >
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className={clientStatusTab === 'active' ? 'text-destructive' : 'text-emerald-400'}>
              {clientStatusTab === 'active' ? 'Deactivate Selected Clients' : 'Reactivate Selected Clients'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-white text-sm">
              You are about to {clientStatusTab === 'active' ? 'deactivate' : 'reactivate'} {selectedClientIds.size} client{selectedClientIds.size === 1 ? '' : 's'}.
            </p>
            <div
              className={
                clientStatusTab === 'active'
                  ? 'bg-red-500/10 border border-red-500/30 rounded-lg p-3'
                  : 'bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3'
              }
            >
              <p className={clientStatusTab === 'active' ? 'text-sm text-red-300' : 'text-sm text-emerald-300'}>
                {clientStatusTab === 'active'
                  ? 'Warning: Selected clients will be set to INACTIVE.'
                  : 'Selected clients will be set to ACTIVE.'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-400">Type CONFIRM to continue</Label>
              <Input
                value={bulkDeleteConfirmText}
                onChange={handleOuInputChange(setBulkDeleteConfirmText, false, (value) => value.toUpperCase())}
                onPaste={handleOuPaste(false, (value) => value.toUpperCase())}
                onKeyDown={(event) => {
                  handleRestrictedKeyDown(event);
                  if (event.key === 'Enter' && bulkDeleteConfirmText === 'CONFIRM' && !isBulkUpdating) {
                    event.preventDefault();
                    handleBulkStatusUpdate();
                  }
                }}
                maxLength={7}
                placeholder="CONFIRM"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowBulkDeleteDialog(false)}
                className="border-slate-600 text-white bg-slate-700/60 text-sm hover:bg-slate-600"
                disabled={isBulkUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkStatusUpdate}
                className={
                  clientStatusTab === 'active'
                    ? 'bg-red-500/80 hover:bg-red-500 text-white text-sm'
                    : 'bg-emerald-500/80 hover:bg-emerald-500 text-white text-sm'
                }
                disabled={bulkDeleteConfirmText !== 'CONFIRM' || isBulkUpdating}
              >
                {clientStatusTab === 'active' ? 'Deactivate Selected' : 'Reactivate Selected'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
