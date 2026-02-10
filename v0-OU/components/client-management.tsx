'use client';

import { TabsContent } from "@/components/ui/tabs"
import { TabsTrigger } from "@/components/ui/tabs"
import { TabsList } from "@/components/ui/tabs"
import { Tabs } from "@/components/ui/tabs"
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit3, Power } from 'lucide-react';
import { Users } from 'lucide-react'; // Added import for Users component

interface Client {
  client_org_id: string;
  parent_org_id?: string;
  client_code: string;
  client_name: string;
  client_description?: string;
  client_status: 'active' | 'inactive';
  contract_start_date?: string;
  contract_end_date?: string;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
}

interface ClientManagementProps {
  role: 'system' | 'company';
}

export function ClientManagement({ role }: ClientManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCode, setNewClientCode] = useState('');
  const [newClientDesc, setNewClientDesc] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientDesc, setEditClientDesc] = useState('');

  // Current user's organization (simulated, would come from auth context)
  const currentUserOrgId = '1';

  const [clients, setClients] = useState<Client[]>([
    {
      client_org_id: '1',
      client_code: 'CLIENT-001',
      client_name: 'Acme Client One',
      client_description: 'Main client for Acme Corporation',
      client_status: 'active',
      contract_start_date: '2024-01-15',
      contract_end_date: '2025-01-15',
      created_at: '2024-01-15',
    },
    {
      client_org_id: '1',
      client_code: 'CLIENT-002',
      client_name: 'Acme Client Two',
      client_description: 'Secondary client',
      client_status: 'active',
      contract_start_date: '2024-02-01',
      created_at: '2024-02-01',
    },
    {
      client_org_id: '1',
      client_code: 'CLIENT-003',
      client_name: 'Acme Client Three',
      client_description: 'Inactive client',
      client_status: 'inactive',
      contract_start_date: '2024-02-10',
      created_at: '2024-02-10',
    },
  ]);

  const [organizations] = useState<Organization[]>([
    { id: '1', name: 'Acme Corporation' },
    { id: '2', name: 'TechCorp Inc' },
    { id: '3', name: 'Global Solutions Ltd' },
  ]);

  const currentOrg = organizations.find((org) => org.id === currentUserOrgId);

  const filteredClients = clients
    .filter((c) => c.client_org_id === currentUserOrgId)
    .filter((c) => c.client_name.toLowerCase().includes(searchTerm.toLowerCase()) || c.client_code.toLowerCase().includes(searchTerm.toLowerCase()));

  const activeClients = filteredClients.filter((c) => c.client_status === 'active').length;
  const totalClients = filteredClients.length;

  const handleCreateClient = () => {
    if (newClientName.trim() && newClientCode.trim()) {
      const newClient: Client = {
        client_org_id: currentUserOrgId,
        client_code: newClientCode,
        client_name: newClientName,
        client_description: newClientDesc,
        client_status: 'active',
        contract_start_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString().split('T')[0],
      };
      setClients([...clients, newClient]);
      setShowCreateDialog(false);
      setNewClientName('');
      setNewClientCode('');
      setNewClientDesc('');
    }
  };

  const handleEditClient = () => {
    if (!editingClient || !editClientName.trim()) return;
    const updated = clients.map((c) =>
      c.client_org_id === editingClient.client_org_id && c.client_code === editingClient.client_code
        ? { ...c, client_name: editClientName, client_description: editClientDesc }
        : c
    );
    setClients(updated);
    setSelectedClient(
      selectedClient && selectedClient.client_code === editingClient.client_code
        ? { ...selectedClient, client_name: editClientName, client_description: editClientDesc }
        : selectedClient
    );
    setShowEditDialog(false);
    setEditingClient(null);
  };

  const handleDeactivateClient = () => {
    if (!selectedClient) return;
    const updated = clients.map((c) =>
      c.client_org_id === selectedClient.client_org_id && c.client_code === selectedClient.client_code
        ? { ...c, client_status: 'inactive' as const }
        : c
    );
    setClients(updated);
    setSelectedClient(null);
    setShowDeactivateDialog(false);
  };

  const handleReactivateClient = () => {
    if (!selectedClient) return;
    const updated = clients.map((c) =>
      c.client_org_id === selectedClient.client_org_id && c.client_code === selectedClient.client_code
        ? { ...c, client_status: 'active' as const }
        : c
    );
    setClients(updated);
    setSelectedClient({ ...selectedClient, client_status: 'active' });
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setEditClientName(client.client_name);
    setEditClientDesc(client.client_description || '');
    setShowEditDialog(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Clients List */}
      <div className="lg:col-span-2">
        <Card className="p-3 flex flex-col" style={{ height: totalClients > 7 ? Math.min(totalClients, 7) * 64 + 115 : 'fit-content' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-base">Client Management</h3>
              <p className="text-xs text-muted-foreground truncate">
                {currentOrg ? `${currentOrg.name}` : 'No organization'}
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-3 w-3" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Client</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="clientCode">Code</Label>
                    <Input
                      id="clientCode"
                      placeholder="e.g., CLIENT-001"
                      value={newClientCode}
                      onChange={(e) => setNewClientCode(e.target.value)}
                      size={8 as any}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientName">Name</Label>
                    <Input
                      id="clientName"
                      placeholder="Client name"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientDesc">Description</Label>
                    <Input
                      id="clientDesc"
                      placeholder="Optional"
                      value={newClientDesc}
                      onChange={(e) => setNewClientDesc(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Auto-assigned to: <span className="font-semibold">{currentOrg?.name}</span></p>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleCreateClient}>Create</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 mb-2 text-sm" />

          <div className={`space-y-1 ${totalClients > 7 ? 'overflow-y-auto pr-2' : 'overflow-hidden'}`} style={{ height: totalClients > 7 ? Math.min(totalClients, 7) * 64 : 'auto', maxHeight: Math.min(totalClients, 7) * 64 }}>
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
                  <Badge variant={client.client_status === 'active' ? 'default' : 'destructive'} className="text-xs">{client.client_status}</Badge>
                </div>
              </Card>
            ))}
            {filteredClients.length === 0 && <p className="text-center text-muted-foreground text-xs py-4">No clients</p>}
          </div>
        </Card>
      </div>

      {/* Details Panel */}
      <div>
        <Card className="p-3" style={{ height: 'fit-content' }}>
          {selectedClient ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base truncate">{selectedClient.client_name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{selectedClient.client_code}</p>
                </div>
                <Badge variant={selectedClient.client_status === 'active' ? 'default' : 'destructive'} className="text-xs">{selectedClient.client_status}</Badge>
              </div>

              <div className="space-y-2 text-sm">
                {selectedClient.client_description && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p className="text-sm">{selectedClient.client_description}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p className="text-sm">{selectedClient.created_at}</p>
                </div>
                {selectedClient.contract_start_date && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Contract Start</Label>
                    <p className="text-sm">{selectedClient.contract_start_date}</p>
                  </div>
                )}
                {selectedClient.contract_end_date && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Contract End</Label>
                    <p className="text-sm">{selectedClient.contract_end_date}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-2 space-y-1">
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1 text-xs bg-transparent"
                      onClick={() => openEditDialog(selectedClient)}
                    >
                      <Edit3 className="h-3 w-3" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Client</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="editName">Name</Label>
                        <Input
                          id="editName"
                          value={editClientName}
                          onChange={(e) => setEditClientName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="editDesc">Description</Label>
                        <Input
                          id="editDesc"
                          value={editClientDesc}
                          onChange={(e) => setEditClientDesc(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setShowEditDialog(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleEditClient}>Save</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {selectedClient.client_status === 'active' ? (
                  <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="w-full gap-1 text-xs">
                        <Power className="h-3 w-3" />
                        Deactivate
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Deactivate?</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm">Deactivate {selectedClient.client_name}? You can reactivate it later.</p>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setShowDeactivateDialog(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleDeactivateClient}>
                          Deactivate
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button size="sm" variant="outline" className="w-full text-xs bg-transparent" onClick={handleReactivateClient}>
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
