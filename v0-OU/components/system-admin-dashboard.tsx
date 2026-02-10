'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, ChevronRight, Plus, Edit3, Trash2, Upload } from 'lucide-react';

interface Organization {
  org_id: string;
  org_name: string;
  parent_org_id?: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  org_description?: string;
  children: Organization[];
  users?: number;
  status: 'active' | 'inactive';
  type: 'company' | 'department';
}

interface SystemAdminDashboardProps {}

export function SystemAdminDashboard({}: SystemAdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [activeTab, setActiveTab] = useState<'organizations' | 'departments'>('organizations');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddOrgDialog, setShowAddOrgDialog] = useState(false);
  const [showAddDeptDialog, setShowAddDeptDialog] = useState(false);

  const [organizationData, setOrganizationData] = useState<Organization[]>([
    {
      org_id: '1',
      org_name: 'Acme Corporation',
      created_by: 'admin',
      created_at: '2024-01-10',
      updated_by: 'admin',
      updated_at: '2024-01-10',
      org_description: 'Main company organization',
      children: [
        {
          org_id: '1-1',
          org_name: 'Finance Department',
          parent_org_id: '1',
          created_by: 'admin',
          created_at: '2024-01-15',
          updated_by: 'admin',
          updated_at: '2024-01-15',
          org_description: 'Handles financial operations',
          children: [],
          users: 12,
          status: 'active',
          type: 'department',
        },
        {
          org_id: '1-2',
          org_name: 'IT Department',
          parent_org_id: '1',
          created_by: 'admin',
          created_at: '2024-01-15',
          updated_by: 'admin',
          updated_at: '2024-01-15',
          org_description: 'Technology and infrastructure',
          children: [],
          users: 18,
          status: 'active',
          type: 'department',
        },
        {
          org_id: '1-3',
          org_name: 'Human Resources',
          parent_org_id: '1',
          created_by: 'admin',
          created_at: '2024-01-20',
          updated_by: 'admin',
          updated_at: '2024-01-20',
          org_description: 'HR operations',
          children: [],
          users: 15,
          status: 'inactive',
          type: 'department',
        },
      ],
      users: 45,
      status: 'active',
      type: 'company',
    },
    {
      org_id: '2',
      org_name: 'TechCorp Inc',
      created_by: 'admin',
      created_at: '2024-01-20',
      updated_by: 'admin',
      updated_at: '2024-01-20',
      org_description: 'Technology company',
      children: [
        {
          org_id: '2-1',
          org_name: 'Product Development',
          parent_org_id: '2',
          created_by: 'admin',
          created_at: '2024-01-25',
          updated_by: 'admin',
          updated_at: '2024-01-25',
          org_description: 'Product development team',
          children: [],
          users: 25,
          status: 'active',
          type: 'department',
        },
      ],
      users: 25,
      status: 'active',
      type: 'company',
    },
  ]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const getFilteredOUs = (nodes: Organization[]): Organization[] => {
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
      .filter((node): node is Organization => node !== null);
  };

  const handleAddOrg = (name: string, description: string) => {
    const newOrg: Organization = {
      org_id: `${Date.now()}`,
      org_name: name,
      created_by: 'admin',
      created_at: new Date().toISOString().split('T')[0],
      updated_by: 'admin',
      updated_at: new Date().toISOString().split('T')[0],
      org_description: description,
      children: [],
      users: 0,
      status: 'active',
      type: 'company',
    };

    setOrganizationData([...organizationData, newOrg]);
    setShowAddOrgDialog(false);
  };

  const handleAddDept = (name: string, description: string, parentId: string, isBulk = false) => {
    const newDept: Organization = {
      org_id: `${Date.now()}-${Math.random()}`,
      org_name: name,
      parent_org_id: parentId,
      created_by: 'admin',
      created_at: new Date().toISOString().split('T')[0],
      updated_by: 'admin',
      updated_at: new Date().toISOString().split('T')[0],
      org_description: description,
      children: [],
      users: 0,
      status: 'active',
      type: 'department',
    };

    const addToParent = (nodes: Organization[]): Organization[] => {
      return nodes.map((node) => {
        if (node.org_id === parentId) {
          return { ...node, children: [...node.children, newDept] };
        }
        if (node.children.length > 0) {
          return { ...node, children: addToParent(node.children) };
        }
        return node;
      });
    };

    setOrganizationData(addToParent(organizationData));
    setExpandedIds(new Set([...expandedIds, parentId]));
    if (!isBulk) {
      setShowAddDeptDialog(false);
    }
  };

  const handleEditOrg = (name: string, description: string) => {
    if (!editingOrg || !name.trim()) return;

    const updateOrgName = (nodes: Organization[]): Organization[] => {
      return nodes.map((node) => {
        if (node.org_id === editingOrg.org_id) {
          return { ...node, org_name: name, org_description: description };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateOrgName(node.children) };
        }
        return node;
      });
    };

    const updatedData = updateOrgName(organizationData);
    setOrganizationData(updatedData);
    setSelectedOrg({ ...editingOrg, org_name: name, org_description: description });
    setShowEditDialog(false);
    setEditingOrg(null);
  };

  const handleDeleteOrg = () => {
    if (!selectedOrg) return;

    const deleteOrg = (nodes: Organization[]): Organization[] => {
      return nodes
        .map((node) => {
          if (node.org_id === selectedOrg.org_id) {
            return null;
          }
          if (node.children.length > 0) {
            return { ...node, children: deleteOrg(node.children) };
          }
          return node;
        })
        .filter((node): node is Organization => node !== null);
    };

    setOrganizationData(deleteOrg(organizationData));
    setSelectedOrg(null);
    setShowDeleteDialog(false);
  };

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
  };

  const getAllDepartments = (nodes: Organization[]): Organization[] => {
    let departments: Organization[] = [];
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

  const getCompanies = (nodes: Organization[]): Organization[] => {
    return nodes.filter((node) => node.type === 'company');
  };

  const renderOrgTree = (nodes: Organization[]) => {
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
                onClick={(e) => {
                  e.stopPropagation();
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

            <Badge
              variant={node.status === 'active' ? 'default' : 'secondary'}
              className={
                node.status === 'active'
                  ? 'bg-green-900/30 text-green-400 border-green-900/50'
                  : 'bg-gray-900/30 text-gray-400 border-gray-900/50'
              }
            >
              {node.status === 'active' ? '● Active' : '● Inactive'}
            </Badge>
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
      {/* Organizations/Departments List */}
      <div className="lg:col-span-2">
        <Card className="p-3 flex flex-col" style={{ height: activeTab === 'organizations' ? (getCompanies(getFilteredOUs(organizationData)).length > 7 ? Math.min(getCompanies(getFilteredOUs(organizationData)).length, 7) * 56 + 145 : 'fit-content') : (getAllDepartments(getFilteredOUs(organizationData)).length > 7 ? Math.min(getAllDepartments(getFilteredOUs(organizationData)).length, 7) * 56 + 145 : 'fit-content'), minHeight: 'fit-content' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-base">{activeTab === 'organizations' ? 'Organizations' : 'Departments'}</h3>
              <p className="text-xs text-muted-foreground">{activeTab === 'organizations' ? 'Companies' : 'Organizational Units'}</p>
            </div>
            <Dialog open={showAddOrgDialog} onOpenChange={setShowAddOrgDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-3 w-3" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{activeTab === 'organizations' ? 'Add Company' : 'Add Department'}</DialogTitle>
                </DialogHeader>
                {activeTab === 'organizations' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Company Name</Label>
                      <Input placeholder="Enter company name" className="bg-input border-border text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Description</Label>
                      <Input placeholder="Enter description" className="bg-input border-border text-foreground" />
                    </div>
                    <div className="flex gap-2 justify-end pt-4 border-t border-border">
                      <Button variant="outline" className="border-border text-foreground bg-transparent">
                        Cancel
                      </Button>
                      <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                        Add Company
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Department Name</Label>
                      <Input placeholder="Enter department name" className="bg-input border-border text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Description</Label>
                      <Input placeholder="Enter description" className="bg-input border-border text-foreground" />
                    </div>
                    <div className="flex gap-2 justify-end pt-4 border-t border-border">
                      <Button variant="outline" className="border-border text-foreground bg-transparent">
                        Cancel
                      </Button>
                      <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                        Add Department
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabs */}
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

          <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 mb-2 text-sm" />

          <div className="flex gap-1 mb-2">
            {(['all', 'active', 'inactive'] as const).map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={activeFilter === filter ? 'default' : 'outline'}
                onClick={() => setActiveFilter(filter)}
                className="text-xs bg-transparent border-border"
              >
                {filter === 'all' ? 'All' : filter === 'active' ? 'Active' : 'Inactive'}
              </Button>
            ))}
          </div>

          {activeTab === 'organizations' ? (
            <div className={`space-y-0 ${getCompanies(getFilteredOUs(organizationData)).length > 7 ? 'overflow-y-auto pr-2' : 'overflow-visible'}`} style={{ height: getCompanies(getFilteredOUs(organizationData)).length > 7 ? Math.min(getCompanies(getFilteredOUs(organizationData)).length, 7) * 56 : 'auto' }}>
              {renderOrgTree(getCompanies(getFilteredOUs(organizationData)))}
            </div>
          ) : (
            <div className={`space-y-0 ${getAllDepartments(getFilteredOUs(organizationData)).length > 7 ? 'overflow-y-auto pr-2' : 'overflow-visible'}`} style={{ height: getAllDepartments(getFilteredOUs(organizationData)).length > 7 ? Math.min(getAllDepartments(getFilteredOUs(organizationData)).length, 7) * 56 : 'auto' }}>
              {renderOrgTree(getAllDepartments(getFilteredOUs(organizationData)))}
            </div>
          )}
        </Card>
      </div>

      {/* Details Panel */}
      <div>
        {selectedOrg ? (
          <Card className="p-3" style={{ height: 'fit-content' }}>
            <h3 className="text-base font-semibold text-foreground mb-2">Details</h3>

            <div className="space-y-2 text-sm mb-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Organization Name</p>
                <p className="text-foreground font-medium">{selectedOrg.org_name}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Organization ID</p>
                <p className="text-foreground font-mono text-xs">{selectedOrg.org_id}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Users in Organization</p>
                <p className="text-foreground">{selectedOrg.users || 0} users</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge
                  className={
                    selectedOrg.status === 'active'
                      ? 'bg-green-900/30 text-green-400 border-green-900/50'
                      : 'bg-gray-900/30 text-gray-400 border-gray-900/50'
                  }
                >
                  {selectedOrg.status === 'active' ? '● Active' : '● Inactive'}
                </Badge>
              </div>

              {selectedOrg.org_description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-foreground text-xs">{selectedOrg.org_description}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-foreground text-xs">{selectedOrg.created_at}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setEditingOrg(selectedOrg)}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Edit Organization</DialogTitle>
                  </DialogHeader>
                  {editingOrg && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Organization Name</Label>
                        <Input placeholder="Enter name" className="bg-input border-border text-foreground" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground">Description</Label>
                        <Input placeholder="Enter description" className="bg-input border-border text-foreground" />
                      </div>

                      <div className="flex gap-2 justify-end pt-4 border-t border-border">
                        <Button variant="outline" className="border-border text-foreground bg-transparent">
                          Cancel
                        </Button>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
                    <Button className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2">
                      <Plus className="w-4 h-4" />
                      Add Department
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Add Department</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Parent Company</p>
                        <p className="text-sm font-medium text-foreground">{selectedOrg.org_name}</p>
                      </div>

                      <Tabs value="individual" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-muted">
                          <TabsTrigger value="individual" className="text-xs">
                            Individual Add
                          </TabsTrigger>
                          <TabsTrigger value="bulk" className="text-xs">
                            Bulk Import
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="individual" className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-foreground text-sm">Department Name</Label>
                            <Input placeholder="Enter department name" className="bg-input border-border text-foreground text-sm" />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-foreground text-sm">Description</Label>
                            <Input placeholder="Enter description" className="bg-input border-border text-foreground text-sm" />
                          </div>

                          <div className="flex gap-2 justify-end pt-4 border-t border-border">
                            <Button variant="outline" className="border-border text-foreground bg-transparent text-sm">
                              Cancel
                            </Button>
                            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground text-sm">
                              Add Department
                            </Button>
                          </div>
                        </TabsContent>

                        <TabsContent value="bulk" className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-foreground text-sm">Upload File</Label>
                              <Button variant="outline" size="sm" className="border-border text-foreground bg-transparent text-xs">
                                Download Template
                              </Button>
                            </div>
                            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/20">
                              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground mb-2">Drag and drop your file here</p>
                              <input type="file" accept=".txt,.csv" className="hidden" id="bulk-file-input" />
                              <button className="text-xs text-primary hover:underline">
                                Browse files
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-medium text-foreground">Preview (0 departments)</p>
                            <div className="border border-border rounded-lg overflow-hidden bg-card max-h-64 overflow-y-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/50 sticky top-0 border-b border-border">
                                  <tr>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">#</th>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Department Name</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* Departments will be listed here */}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-4 border-t border-border">
                            <Button variant="outline" className="border-border text-foreground bg-transparent text-sm">
                              Cancel
                            </Button>
                            <Button disabled className="bg-secondary hover:bg-secondary/90 text-secondary-foreground text-sm disabled:opacity-50">
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
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-destructive">Delete Organization</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-foreground">
                      Are you sure you want to delete <span className="font-bold">{selectedOrg.org_name}</span>? This action cannot be undone.
                    </p>
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                      <p className="text-sm text-destructive">Warning: This will permanently delete this organization and all its departments.</p>
                    </div>
                    <div className="flex gap-2 justify-end pt-4 border-t border-border">
                      <Button variant="outline" className="border-border text-foreground bg-transparent">
                        Cancel
                      </Button>
                      <Button onClick={handleDeleteOrg} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        Delete
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        ) : (
          <Card className="p-3" style={{ height: 'fit-content' }}>
            <p className="text-center text-muted-foreground text-xs py-8">Select an organization</p>
          </Card>
        )}
      </div>
    </div>
  );
}
