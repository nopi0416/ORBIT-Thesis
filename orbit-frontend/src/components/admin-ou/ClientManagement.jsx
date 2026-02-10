import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '../ui';
import { Plus, Edit3, Power } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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
  const [editingClient, setEditingClient] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCode, setNewClientCode] = useState('');
  const [newClientDesc, setNewClientDesc] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientDesc, setEditClientDesc] = useState('');
  const [clients, setClients] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [companyOrgId, setCompanyOrgId] = useState(null);

  const token = localStorage.getItem('authToken');
  const updatedBy = user?.id || user?.email || user?.name || 'system';
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

  const filteredClients = clients.filter((client) =>
    client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.client_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalClients = filteredClients.length;

  useEffect(() => {
    if (selectedClient && !clients.find((client) => client.client_org_id === selectedClient.client_org_id)) {
      setSelectedClient(null);
    }
  }, [clients, selectedClient]);

  const handleCreateClient = async () => {
    if (!newClientName.trim() || !newClientCode.trim()) return;

    const parentOrgId = createOrg?.org_id;
    if (!parentOrgId) return;

    try {
      await createClient(
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
      await fetchClients(getScopedOrgIds());
    } catch (error) {
      console.error('Failed to create client:', error);
    }
  };

  const handleEditClient = async () => {
    if (!editingClient || !editClientName.trim()) return;

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
    } catch (error) {
      console.error('Failed to update client:', error);
    }
  };

  const handleDeactivateClient = async () => {
    if (!selectedClient) return;

    try {
      await updateClient(
        selectedClient.client_org_id,
        { client_status: 'inactive', updated_by: updatedBy },
        token
      );
      setSelectedClient(null);
      setShowDeactivateDialog(false);
      await fetchClients(getScopedOrgIds());
    } catch (error) {
      console.error('Failed to deactivate client:', error);
    }
  };

  const handleReactivateClient = async () => {
    if (!selectedClient) return;

    try {
      await updateClient(
        selectedClient.client_org_id,
        { client_status: 'active', updated_by: updatedBy },
        token
      );
      await fetchClients(getScopedOrgIds());
    } catch (error) {
      console.error('Failed to reactivate client:', error);
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
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
                      onChange={(event) => setNewClientCode(event.target.value)}
                      size={8}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientName">Name</Label>
                    <Input
                      id="clientName"
                      placeholder="Client name"
                      value={newClientName}
                      onChange={(event) => setNewClientName(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientDesc">Description</Label>
                    <Input
                      id="clientDesc"
                      placeholder="Optional"
                      value={newClientDesc}
                      onChange={(event) => setNewClientDesc(event.target.value)}
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    Auto-assigned to: <span className="font-semibold">{createOrgLabel}</span>
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setShowCreateDialog(false)} className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600">
                      Cancel
                    </Button>
                    <Button size="sm" className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white" onClick={handleCreateClient}>
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
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-8 mb-2 text-sm"
          />

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
                onClick={() => setSelectedClient(client)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{client.client_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{client.client_code}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      client.client_status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {client.client_status}
                  </span>
                </div>
              </Card>
            ))}
            {filteredClients.length === 0 && (
              <p className="text-center text-muted-foreground text-xs py-4">No clients</p>
            )}
          </div>
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
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    selectedClient.client_status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}
                >
                  {selectedClient.client_status}
                </span>
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
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
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
                          onChange={(event) => setEditClientName(event.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="editDesc">Description</Label>
                        <Input
                          id="editDesc"
                          value={editClientDesc}
                          onChange={(event) => setEditClientDesc(event.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setShowEditDialog(false)} className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600">
                          Cancel
                        </Button>
                        <Button size="sm" className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white" onClick={handleEditClient}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {selectedClient.client_status === 'active' ? (
                  <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
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
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setShowDeactivateDialog(false)} className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600">
                          Cancel
                        </Button>
                        <Button size="sm" className="!bg-red-500/80 hover:!bg-red-500 !text-white" onClick={handleDeactivateClient}>
                          Deactivate
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button
                    size="sm"
                    className="w-full gap-1 text-xs !bg-emerald-500/80 hover:!bg-emerald-500 !text-white"
                    onClick={handleReactivateClient}
                  >
                    <Power className="h-3 w-3" />
                    Reactivate
                  </Button>
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
    </div>
  );
}
