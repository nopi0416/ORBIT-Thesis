'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit3, Trash2, Users } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  users: number;
  status: 'active' | 'inactive';
  description?: string;
  members?: Member[];
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'manager';
  joinedDate: string;
}

interface Company {
  id: string;
  name: string;
  description: string;
  created_at: string;
  departments_count: number;
}

interface CompanyAdminDashboardProps {}

export function CompanyAdminDashboard({}: CompanyAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'departments' | 'companies'>('departments');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showManageMembersDialog, setShowManageMembersDialog] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  const [departments, setDepartments] = useState<Department[]>([
    {
      id: '1-1',
      name: 'Finance Department',
      users: 12,
      status: 'active',
      description: 'Handles financial planning, budgeting, and accounting operations.',
      members: [
        { id: '1', name: 'John Smith', email: 'john.smith@company.com', role: 'manager', joinedDate: '2024-01-15' },
        { id: '2', name: 'Sarah Johnson', email: 'sarah.johnson@company.com', role: 'member', joinedDate: '2024-02-20' },
        { id: '3', name: 'Mike Brown', email: 'mike.brown@company.com', role: 'member', joinedDate: '2024-03-10' },
      ],
    },
    {
      id: '1-2',
      name: 'IT Department',
      users: 18,
      status: 'active',
      description: 'Manages infrastructure, support, and technology initiatives.',
      members: [
        { id: '4', name: 'Alex Chen', email: 'alex.chen@company.com', role: 'manager', joinedDate: '2024-01-10' },
        { id: '5', name: 'Emma Wilson', email: 'emma.wilson@company.com', role: 'member', joinedDate: '2024-01-25' },
        { id: '6', name: 'David Lee', email: 'david.lee@company.com', role: 'member', joinedDate: '2024-02-15' },
      ],
    },
    {
      id: '1-3',
      name: 'Human Resources',
      users: 15,
      status: 'inactive',
      description: 'Oversees recruitment, training, and employee relations.',
      members: [
        { id: '8', name: 'Rachel Green', email: 'rachel.green@company.com', role: 'manager', joinedDate: '2024-01-01' },
      ],
    },
  ]);

  const [companies] = useState<Company[]>([
    {
      id: '1',
      name: 'Main Company',
      description: 'Primary organizational unit',
      created_at: '2024-01-01',
      departments_count: departments.length,
    },
  ]);

  const handleAddDepartment = (name: string, description: string) => {
    if (!name.trim()) return;
    const newDept: Department = {
      id: `1-${departments.length + 1}`,
      name,
      users: 0,
      status: 'active',
      description,
      members: [],
    };
    setDepartments([...departments, newDept]);
    setNewDeptName('');
    setNewDeptDesc('');
  };

  const handleEditDept = (name: string, description?: string) => {
    if (!editingDept || !name.trim()) return;
    setDepartments(
      departments.map((dept) =>
        dept.id === editingDept.id ? { ...dept, name, description } : dept
      )
    );
    setSelectedDept({ ...editingDept, name, description });
    setShowEditDialog(false);
    setEditingDept(null);
  };

  const handleDeleteDept = () => {
    if (!selectedDept) return;
    setDepartments(departments.filter((dept) => dept.id !== selectedDept.id));
    setSelectedDept(null);
    setShowDeleteDialog(false);
  };

  const filteredDepts = departments.filter((dept) => {
    const matchesSearch = dept.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || dept.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const totalUsers = departments.reduce((acc, dept) => acc + dept.users, 0);
  const activeDepts = departments.filter((d) => d.status === 'active').length;

  const onNavigateToClients = () => {
    // Implement navigation to client management
  };

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Departments/Companies List */}
        <div className="lg:col-span-2">
          <Card className="p-3 flex flex-col" style={{ height: activeTab === 'departments' ? (filteredDepts.length > 7 ? Math.min(filteredDepts.length, 7) * 64 + 145 : 'fit-content') : (companies.length > 7 ? Math.min(companies.length, 7) * 64 + 145 : 'fit-content'), minHeight: 'fit-content' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-base">{activeTab === 'departments' ? 'Departments' : 'Companies'}</h3>
                <p className="text-xs text-muted-foreground">{activeTab === 'departments' ? 'Organization Units' : 'Organizational Entities'}</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-3 w-3" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{activeTab === 'departments' ? 'Add Department' : 'Add Company'}</DialogTitle>
                  </DialogHeader>
                  {activeTab === 'departments' ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm">Name</Label>
                        <Input
                          placeholder="Department name"
                          value={newDeptName}
                          onChange={(e) => setNewDeptName(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Description</Label>
                        <Input
                          placeholder="Optional"
                          value={newDeptDesc}
                          onChange={(e) => setNewDeptDesc(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex gap-2 justify-end pt-2 border-t">
                        <Button size="sm" variant="outline">
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleAddDepartment(newDeptName, newDeptDesc)}>
                          Add
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm">Company Name</Label>
                        <Input
                          placeholder="Company name"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Description</Label>
                        <Input
                          placeholder="Optional"
                          className="text-sm"
                        />
                      </div>
                      <div className="flex gap-2 justify-end pt-2 border-t">
                        <Button size="sm" variant="outline">
                          Cancel
                        </Button>
                        <Button size="sm">
                          Add
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
                onClick={() => setActiveTab('departments')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'departments'
                    ? 'text-primary border-b-2 border-primary -mb-0.5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Departments
              </button>
              <button
                onClick={() => setActiveTab('companies')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'companies'
                    ? 'text-primary border-b-2 border-primary -mb-0.5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Companies
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

            {activeTab === 'departments' ? (
              <div className={`space-y-1 ${filteredDepts.length > 7 ? 'overflow-y-auto pr-2' : 'overflow-hidden'}`} style={{ height: filteredDepts.length > 7 ? Math.min(filteredDepts.length, 7) * 64 : 'auto', maxHeight: Math.min(filteredDepts.length, 7) * 64 }}>
                {filteredDepts.map((dept) => (
                  <Card
                    key={dept.id}
                    className={`p-2 cursor-pointer transition-colors ${
                      selectedDept?.id === dept.id ? 'bg-accent border-primary' : 'hover:bg-accent'
                    }`}
                    onClick={() => setSelectedDept(dept)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{dept.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{dept.users} users</p>
                      </div>
                      <Badge variant={dept.status === 'active' ? 'default' : 'destructive'} className="text-xs">{dept.status}</Badge>
                    </div>
                  </Card>
                ))}
                {filteredDepts.length === 0 && <p className="text-center text-muted-foreground text-xs py-4">No departments</p>}
              </div>
            ) : (
              <div className={`space-y-1 ${companies.length > 7 ? 'overflow-y-auto pr-2' : 'overflow-hidden'}`} style={{ height: companies.length > 7 ? Math.min(companies.length, 7) * 64 : 'auto', maxHeight: Math.min(companies.length, 7) * 64 }}>
                {companies.map((company) => (
                  <Card
                    key={company.id}
                    className="p-2 cursor-pointer transition-colors hover:bg-accent"
                    onClick={() => setSelectedDept(null)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{company.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{company.departments_count} departments</p>
                      </div>
                      <Badge variant="outline" className="text-xs">Company</Badge>
                    </div>
                  </Card>
                ))}
                {companies.length === 0 && <p className="text-center text-muted-foreground text-xs py-4">No companies</p>}
              </div>
            )}
          </Card>
        </div>

        {/* Details Panel */}
        <div>
          {selectedDept ? (
            <Card className="p-3" style={{ height: 'fit-content' }}>
              <h3 className="text-base font-semibold text-foreground mb-2">Details</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Name</p>
                  <p className="text-sm font-medium text-foreground">{selectedDept.name}</p>
                </div>
                {selectedDept.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Description</p>
                    <p className="text-sm text-foreground">{selectedDept.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Users</p>
                  <p className="text-sm font-medium text-foreground">{selectedDept.users}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                  <Badge
                    variant={selectedDept.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {selectedDept.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => setEditingDept(selectedDept)}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-sm"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Department
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Edit Department</DialogTitle>
                    </DialogHeader>
                    {editingDept && <EditDepartmentDialog ou={editingDept} onEditOU={handleEditDept} onCancel={() => setShowEditDialog(false)} />}
                  </DialogContent>
                </Dialog>

                <Dialog open={showManageMembersDialog} onOpenChange={setShowManageMembersDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-sm">
                      <Users className="w-4 h-4" />
                      Manage Members
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Manage Department Members</DialogTitle>
                    </DialogHeader>
                    {selectedDept && <ManageMembersDialog dept={selectedDept} onClose={() => setShowManageMembersDialog(false)} />}
                  </DialogContent>
                </Dialog>

                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 gap-2 text-sm">
                      <Trash2 className="w-4 h-4" />
                      Delete Department
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-destructive">Delete Department</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-foreground text-sm">
                        Are you sure you want to delete <span className="font-bold">{selectedDept.name}</span>? This action cannot be undone.
                      </p>
                      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                        <p className="text-sm text-destructive">Warning: This will permanently delete this department.</p>
                      </div>
                      <div className="flex gap-2 justify-end pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteDialog(false)}
                          className="border-border text-foreground bg-transparent text-sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleDeleteDept}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm"
                        >
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
              <p className="text-center text-muted-foreground text-xs py-8">Select a department</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface EditDepartmentDialogProps {
  ou: Department;
  onEditOU: (name: string, description?: string) => void;
  onCancel: () => void;
}

function EditDepartmentDialog({ ou, onEditOU, onCancel }: EditDepartmentDialogProps) {
  const [name, setName] = useState(ou.name);
  const [description, setDescription] = useState(ou.description || '');

  const handleSave = () => {
    if (name.trim()) {
      onEditOU(name, description);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-foreground text-sm">Department Name</Label>
        <Input
          placeholder="Enter department name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-input border-border text-foreground text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground text-sm">Description</Label>
        <Input
          placeholder="Enter description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-input border-border text-foreground text-sm"
        />
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-border text-foreground bg-transparent text-sm"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}

interface ManageMembersDialogProps {
  dept: Department;
  onClose: () => void;
}

function ManageMembersDialog({ dept, onClose }: ManageMembersDialogProps) {
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'current' | 'add'>('current');

  const members = dept.members || [];

  const handleAddMember = () => {
    if (newMemberName.trim() && newMemberEmail.trim()) {
      console.log('[v0] Adding member:', newMemberName, newMemberEmail);
      setNewMemberName('');
      setNewMemberEmail('');
    }
  };

  const handleRemoveMember = (memberId: string) => {
    console.log('[v0] Removing member:', memberId);
  };

  const toggleMemberSelection = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  return (
    <div className="space-y-3">
      <div className="bg-muted/30 p-3 rounded-lg">
        <p className="text-xs text-muted-foreground mb-1">Department</p>
        <p className="text-sm font-semibold text-foreground">{dept.name}</p>
        <p className="text-xs text-muted-foreground mt-2">{members.length} member(s)</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'current'
              ? 'text-primary border-b-2 border-primary -mb-0.5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Current Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'add'
              ? 'text-primary border-b-2 border-primary -mb-0.5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Add New Member
        </button>
      </div>

      {activeTab === 'current' ? (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No members in this department</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-muted/30 transition-colors">
                  <Checkbox
                    checked={selectedMembers.has(member.id)}
                    onCheckedChange={() => toggleMemberSelection(member.id)}
                    className="border-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={
                          member.role === 'manager'
                            ? 'bg-primary/20 text-primary border-primary/30'
                            : 'bg-secondary/20 text-secondary border-secondary/30'
                        }
                      >
                        {member.role === 'manager' ? 'Manager' : 'Member'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Joined {member.joinedDate}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label className="text-sm text-foreground">Member Name</Label>
            <Input
              placeholder="Enter member name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="bg-input border-border text-foreground mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-sm text-foreground">Email Address</Label>
            <Input
              placeholder="Enter email address"
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="bg-input border-border text-foreground mt-1 text-sm"
            />
          </div>
          <Button
            onClick={handleAddMember}
            className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </Button>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-3 border-t border-border">
        <Button
          variant="outline"
          onClick={onClose}
          className="border-border text-foreground bg-transparent text-sm"
        >
          Close
        </Button>
        {activeTab === 'current' && selectedMembers.size > 0 && (
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 text-sm"
            onClick={() => {
              console.log('[v0] Removing selected members');
              setSelectedMembers(new Set());
            }}
          >
            Remove Selected ({selectedMembers.size})
          </Button>
        )}
      </div>
    </div>
  );
}
