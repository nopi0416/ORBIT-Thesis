import { useEffect, useState } from 'react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui';
import { ChevronDown, ChevronRight, Plus, Edit3, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  createOrganization,
  deleteOrganization,
  getOrganizations,
  updateOrganization,
} from '../../services/budgetConfigService';

const buildOrgTree = (orgs = []) => {
  const orgMap = {};
  orgs.forEach((org) => {
    orgMap[org.org_id] = {
      ...org,
      status: 'active',
      users: 0,
      type: org.parent_org_id ? 'department' : 'company',
      children: [],
    };
  });

  const roots = [];
  Object.values(orgMap).forEach((org) => {
    if (org.parent_org_id && orgMap[org.parent_org_id]) {
      orgMap[org.parent_org_id].children.push(org);
    } else {
      roots.push(org);
    }
  });

  return roots;
};

const findOrgById = (nodes, orgId) => {
  for (const node of nodes) {
    if (node.org_id === orgId) return node;
    if (node.children?.length) {
      const found = findOrgById(node.children, orgId);
      if (found) return found;
    }
  }
  return null;
};

export function SystemAdminDashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('organizations');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [editingOrg, setEditingOrg] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddOrgDialog, setShowAddOrgDialog] = useState(false);
  const [showAddDeptDialog, setShowAddDeptDialog] = useState(false);
  const [organizationData, setOrganizationData] = useState([]);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgDesc, setEditOrgDesc] = useState('');

  const token = localStorage.getItem('authToken');
  const createdBy = user?.id || user?.email || user?.name || 'system';

  const fetchOrganizations = async () => {
    try {
      const data = await getOrganizations(token);
      setOrganizationData(buildOrgTree(data));
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setOrganizationData([]);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg && !findOrgById(organizationData, selectedOrg.org_id)) {
      setSelectedOrg(null);
    }
  }, [organizationData, selectedOrg]);

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const getFilteredOUs = (nodes) => {
    return nodes
      .map((node) => {
        const children = getFilteredOUs(node.children);
        const nodeMatches = node.org_name.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatches = activeFilter === 'all' || node.status === activeFilter;
        const childHasMatch = children.length > 0;

        if (nodeMatches && statusMatches) {
          return { ...node, children };
        }

        if (childHasMatch) {
          return { ...node, children };
        }

        return null;
      })
      .filter((node) => node !== null);
  };


  const handleDeleteOrg = async () => {
    if (!selectedOrg) return;

    try {
      await deleteOrganization(selectedOrg.org_id, token);
      await fetchOrganizations();
      setSelectedOrg(null);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete organization:', error);
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;

    try {
      await createOrganization(
        {
          org_name: newOrgName.trim(),
          org_description: newOrgDesc.trim(),
          created_by: createdBy,
        },
        token
      );
      setNewOrgName('');
      setNewOrgDesc('');
      setShowAddOrgDialog(false);
      await fetchOrganizations();
    } catch (error) {
      console.error('Failed to create organization:', error);
    }
  };

  const handleCreateDept = async () => {
    if (!selectedOrg || !newDeptName.trim()) return;

    const parentOrgId = selectedOrg.type === 'company'
      ? selectedOrg.org_id
      : selectedOrg.parent_org_id;

    if (!parentOrgId) return;

    try {
      await createOrganization(
        {
          org_name: newDeptName.trim(),
          org_description: newDeptDesc.trim(),
          parent_org_id: parentOrgId,
          created_by: createdBy,
        },
        token
      );
      setNewDeptName('');
      setNewDeptDesc('');
      setShowAddDeptDialog(false);
      await fetchOrganizations();
    } catch (error) {
      console.error('Failed to create department:', error);
    }
  };

  const handleEditOrg = async () => {
    if (!editingOrg || !editOrgName.trim()) return;

    try {
      await updateOrganization(
        editingOrg.org_id,
        {
          org_name: editOrgName.trim(),
          org_description: editOrgDesc.trim(),
          updated_by: createdBy,
        },
        token
      );
      setShowEditDialog(false);
      setEditingOrg(null);
      await fetchOrganizations();
    } catch (error) {
      console.error('Failed to update organization:', error);
    }
  };

  const handleSelectOrg = (org) => {
    setSelectedOrg(org);
  };

  const getAllDepartments = (nodes) => {
    let departments = [];
    nodes.forEach((node) => {
      if (node.type === 'department') {
        departments.push(node);
      }
      if (node.children.length > 0) {
        departments = [...departments, ...getAllDepartments(node.children)];
      }
    });
    return departments;
  };

  const getCompanies = (nodes) => {
    return nodes.filter((node) => node.type === 'company');
  };

  const renderOrgTree = (nodes) => {
    return nodes.map((node) => {
      const isExpanded = expandedIds.has(node.org_id);
      const hasChildren = node.children.length > 0;

      return (
        <div key={node.org_id} className="space-y-0">
          <div
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
              selectedOrg?.org_id === node.org_id
                ? 'bg-primary/20 border border-primary'
                : 'hover:bg-card/50 border border-transparent'
            }`}
            onClick={() => handleSelectOrg(node)}
          >
            {hasChildren && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  toggleExpand(node.org_id);
                }}
                className="p-0 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-primary" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-4" />}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">{node.org_name}</span>
                <Badge
                  variant="outline"
                  className={
                    node.type === 'company'
                      ? 'bg-primary/20 text-primary border-primary/30'
                      : 'bg-secondary/20 text-secondary border-secondary/30'
                  }
                >
                  {node.type === 'company' ? 'Company' : 'Department'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {node.users} users • {node.status}
              </div>
            </div>

            <span
              className={`text-xs px-2 py-1 rounded ${
                node.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-500/20 text-slate-400'
              }`}
            >
              {node.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>

          {hasChildren && isExpanded && (
            <div className="ml-4 pl-3 border-l border-border space-y-0">
              {renderOrgTree(node.children)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="lg:col-span-2">
        <Card
          className="p-3 flex flex-col bg-slate-800/80 border-slate-700 text-white"
          style={{
            height:
              activeTab === 'organizations'
                ? getCompanies(getFilteredOUs(organizationData)).length > 7
                  ? Math.min(getCompanies(getFilteredOUs(organizationData)).length, 7) * 56 + 145
                  : 'fit-content'
                : getAllDepartments(getFilteredOUs(organizationData)).length > 7
                  ? Math.min(getAllDepartments(getFilteredOUs(organizationData)).length, 7) * 56 + 145
                  : 'fit-content',
            minHeight: 'fit-content',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-base">
                {activeTab === 'organizations' ? 'Organizations' : 'Departments'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {activeTab === 'organizations' ? 'Companies' : 'Organizational Units'}
              </p>
            </div>
            <Dialog open={showAddOrgDialog} onOpenChange={setShowAddOrgDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 bg-fuchsia-600 hover:bg-fuchsia-700 text-white">
                  <Plus className="h-3 w-3" />
                  New
                </Button>
              </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle>{activeTab === 'organizations' ? 'Add Company' : 'Add Department'}</DialogTitle>
                </DialogHeader>
                {activeTab === 'organizations' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Company Name</Label>
                      <Input
                        placeholder="Enter company name"
                        value={newOrgName}
                        onChange={(event) => setNewOrgName(event.target.value)}
                        className="bg-input border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Description</Label>
                      <Input
                        placeholder="Enter description"
                        value={newOrgDesc}
                        onChange={(event) => setNewOrgDesc(event.target.value)}
                        className="bg-input border-border text-foreground"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-4 border-t border-border">
                      <Button variant="outline" className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600">
                        Cancel
                      </Button>
                      <Button className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white" onClick={handleCreateOrg}>
                        Add Company
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Department Name</Label>
                      <Input
                        placeholder="Enter department name"
                        value={newDeptName}
                        onChange={(event) => setNewDeptName(event.target.value)}
                        className="bg-input border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Description</Label>
                      <Input
                        placeholder="Enter description"
                        value={newDeptDesc}
                        onChange={(event) => setNewDeptDesc(event.target.value)}
                        className="bg-input border-border text-foreground"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-4 border-t border-border">
                      <Button variant="outline" className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600">
                        Cancel
                      </Button>
                      <Button className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white" onClick={handleCreateDept}>
                        Add Department
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex gap-2 mb-2 border-b border-border">
            <button
              onClick={() => setActiveTab('organizations')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'organizations'
                  ? 'text-primary border-b-2 border-primary -mb-0.5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Organizations
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'departments'
                  ? 'text-primary border-b-2 border-primary -mb-0.5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Departments
            </button>
          </div>

          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-8 mb-2 text-sm"
          />

          <div className="flex gap-1 mb-2">
            {['all', 'active', 'inactive'].map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={activeFilter === filter ? 'default' : 'outline'}
                onClick={() => setActiveFilter(filter)}
                className={`text-xs border-slate-600 ${
                  activeFilter === filter
                    ? 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white'
                    : 'bg-slate-700/40 hover:bg-slate-600/60 text-slate-100'
                }`}
              >
                {filter === 'all' ? 'All' : filter === 'active' ? 'Active' : 'Inactive'}
              </Button>
            ))}
          </div>

          {activeTab === 'organizations' ? (
            <div
              className={`space-y-0 ${
                getCompanies(getFilteredOUs(organizationData)).length > 7 ? 'overflow-y-auto pr-2' : 'overflow-visible'
              }`}
              style={{
                height:
                  getCompanies(getFilteredOUs(organizationData)).length > 7
                    ? Math.min(getCompanies(getFilteredOUs(organizationData)).length, 7) * 56
                    : 'auto',
              }}
            >
              {renderOrgTree(getCompanies(getFilteredOUs(organizationData)))}
            </div>
          ) : (
            <div
              className={`space-y-0 ${
                getAllDepartments(getFilteredOUs(organizationData)).length > 7 ? 'overflow-y-auto pr-2' : 'overflow-visible'
              }`}
              style={{
                height:
                  getAllDepartments(getFilteredOUs(organizationData)).length > 7
                    ? Math.min(getAllDepartments(getFilteredOUs(organizationData)).length, 7) * 56
                    : 'auto',
              }}
            >
              {renderOrgTree(getAllDepartments(getFilteredOUs(organizationData)))}
            </div>
          )}
        </Card>
      </div>

      <div>
        {selectedOrg ? (
          <Card className="p-3 bg-slate-800/80 border-slate-700 text-white" style={{ height: 'fit-content' }}>
            <h3 className="text-base font-semibold text-white mb-2">Details</h3>

            <div className="space-y-2 text-sm mb-3">
              <div>
                <p className="text-xs text-slate-400 mb-1">Organization Name</p>
                <p className="text-white font-medium">{selectedOrg.org_name}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1">Organization ID</p>
                <p className="text-white font-mono text-xs">{selectedOrg.org_id}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1">Users in Organization</p>
                <p className="text-white">{selectedOrg.users || 0} users</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1">Status</p>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    selectedOrg.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}
                >
                  {selectedOrg.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>

              {selectedOrg.org_description && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Description</p>
                  <p className="text-white text-xs">{selectedOrg.org_description}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-400 mb-1">Created</p>
                <p className="text-white text-xs">{selectedOrg.created_at}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingOrg(selectedOrg);
                      setEditOrgName(selectedOrg?.org_name || '');
                      setEditOrgDesc(selectedOrg?.org_description || '');
                    }}
                    className="w-full bg-blue-500/80 hover:bg-blue-500 text-white gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Edit Organization</DialogTitle>
                  </DialogHeader>
                  {editingOrg && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white">Organization Name</Label>
                        <Input
                          placeholder="Enter name"
                          value={editOrgName}
                          onChange={(event) => setEditOrgName(event.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Description</Label>
                        <Input
                          placeholder="Enter description"
                          value={editOrgDesc}
                          onChange={(event) => setEditOrgDesc(event.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-4 border-t border-border">
                        <Button variant="outline" className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600">
                          Cancel
                        </Button>
                        <Button className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white" onClick={handleEditOrg}>
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {selectedOrg.type === 'company' && (
                <Dialog open={showAddDeptDialog} onOpenChange={setShowAddDeptDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white gap-2">
                      <Plus className="w-4 h-4" />
                      Add Department
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-white">Add Department</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-slate-700/50 p-3 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Parent Company</p>
                        <p className="text-sm font-medium text-white">{selectedOrg.org_name}</p>
                      </div>

                      <Tabs defaultValue="individual" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-700/60">
                          <TabsTrigger value="individual" className="text-xs">
                            Individual Add
                          </TabsTrigger>
                          <TabsTrigger value="bulk" className="text-xs">
                            Bulk Import
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="individual" className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-white text-sm">Department Name</Label>
                            <Input
                              placeholder="Enter department name"
                              className="bg-slate-700 border-slate-600 text-white text-sm"
                              value={newDeptName}
                              onChange={(event) => setNewDeptName(event.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-white text-sm">Description</Label>
                            <Input
                              placeholder="Enter description"
                              className="bg-slate-700 border-slate-600 text-white text-sm"
                              value={newDeptDesc}
                              onChange={(event) => setNewDeptDesc(event.target.value)}
                            />
                          </div>

                          <div className="flex gap-2 justify-end pt-4 border-t border-border">
                            <Button
                              variant="outline"
                              className="border-slate-600 text-white bg-slate-700/60 text-sm hover:bg-slate-600"
                            >
                              Cancel
                            </Button>
                            <Button className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm" onClick={handleCreateDept}>
                              Add Department
                            </Button>
                          </div>
                        </TabsContent>

                        <TabsContent value="bulk" className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-white text-sm">Upload File</Label>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-600 text-white bg-slate-700/60 text-xs hover:bg-slate-600"
                              >
                                Download Template
                              </Button>
                            </div>
                            <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-fuchsia-500/50 transition-colors cursor-pointer bg-slate-700/30">
                              <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                              <p className="text-xs text-slate-400 mb-2">Drag and drop your file here</p>
                              <input type="file" accept=".txt,.csv" className="hidden" id="bulk-file-input" />
                              <button className="text-xs text-fuchsia-300 hover:underline">Browse files</button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-medium text-white">Preview (0 departments)</p>
                            <div className="border border-slate-600 rounded-lg overflow-hidden bg-slate-800 max-h-64 overflow-y-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-700/60 sticky top-0 border-b border-slate-600">
                                  <tr>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-300">#</th>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-300">Department Name</th>
                                  </tr>
                                </thead>
                                <tbody>{/* Departments will be listed here */}</tbody>
                              </table>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-4 border-t border-border">
                            <Button
                              variant="outline"
                              className="border-slate-600 text-white bg-slate-700/60 text-sm hover:bg-slate-600"
                            >
                              Cancel
                            </Button>
                            <Button
                              disabled
                              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm disabled:opacity-50"
                            >
                              Add All (0) Departments
                            </Button>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-destructive">Delete Organization</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-white">
                      Are you sure you want to delete <span className="font-bold">{selectedOrg.org_name}</span>? This action
                      cannot be undone.
                    </p>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <p className="text-sm text-red-300">
                        Warning: This will permanently delete this organization and all its departments.
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end pt-4 border-t border-border">
                      <Button variant="outline" className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600">
                        Cancel
                      </Button>
                      <Button onClick={handleDeleteOrg} className="bg-red-500/80 hover:bg-red-500 text-white">
                        Delete
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        ) : (
          <Card className="p-3 bg-slate-800/80 border-slate-700 text-white" style={{ height: 'fit-content' }}>
            <p className="text-center text-slate-400 text-xs py-8">Select an organization</p>
          </Card>
        )}
      </div>
    </div>
  );
}
