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
} from '../ui';
import { Plus, Edit3, Trash2, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  createOrganization,
  deleteOrganization,
  getOrganizations,
  updateOrganization,
} from '../../services/budgetConfigService';

export function CompanyAdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('departments');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showManageMembersDialog, setShowManageMembersDialog] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyDesc, setNewCompanyDesc] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [companyScopeId, setCompanyScopeId] = useState(null);

  const token = localStorage.getItem('authToken');
  const updatedBy = user?.id || user?.email || user?.name || 'system';

  const resolveCompanyScope = (orgs) => {
    if (user?.org_id) return user.org_id;
    if (user?.company_code) {
      const match = orgs.find(
        (org) => org.company_code === user.company_code && !org.parent_org_id
      );
      return match?.org_id || null;
    }
    return null;
  };

  const fetchOrganizations = async () => {
    try {
      const data = await getOrganizations(token);
      setOrganizations(data);
      const scopeId = resolveCompanyScope(data);
      setCompanyScopeId(scopeId);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setOrganizations([]);
      setCompanyScopeId(null);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const companies = useMemo(() => {
    const topLevel = organizations.filter((org) => !org.parent_org_id);
    const scoped = companyScopeId ? topLevel.filter((org) => org.org_id === companyScopeId) : topLevel;
    return scoped.map((org) => ({
      id: org.org_id,
      name: org.org_name,
      description: org.org_description,
      created_at: org.created_at,
      departments_count: organizations.filter((child) => child.parent_org_id === org.org_id).length,
    }));
  }, [organizations, companyScopeId]);

  useEffect(() => {
    if (!selectedCompany && companies.length > 0) {
      setSelectedCompany(companies[0]);
    }
    if (selectedCompany && companies.length > 0) {
      const exists = companies.find((company) => company.id === selectedCompany.id);
      if (!exists) {
        setSelectedCompany(companies[0]);
      }
    }
  }, [companies, selectedCompany]);

  const departments = useMemo(() => {
    if (!selectedCompany?.id) return [];
    return organizations
      .filter((org) => org.parent_org_id === selectedCompany.id)
      .map((org) => ({
        id: org.org_id,
        name: org.org_name,
        users: 0,
        status: 'active',
        description: org.org_description,
        members: [],
      }));
  }, [organizations, selectedCompany]);

  useEffect(() => {
    if (selectedDept && !departments.find((dept) => dept.id === selectedDept.id)) {
      setSelectedDept(null);
    }
  }, [departments, selectedDept]);

  const handleAddDepartment = async (name, description) => {
    if (!name.trim() || !selectedCompany?.id) return;

    try {
      await createOrganization(
        {
          org_name: name.trim(),
          org_description: description,
          parent_org_id: selectedCompany.id,
          created_by: updatedBy,
        },
        token
      );
      setNewDeptName('');
      setNewDeptDesc('');
      await fetchOrganizations();
    } catch (error) {
      console.error('Failed to create department:', error);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return;

    try {
      await createOrganization(
        {
          org_name: newCompanyName.trim(),
          org_description: newCompanyDesc,
          created_by: updatedBy,
        },
        token
      );
      setNewCompanyName('');
      setNewCompanyDesc('');
      await fetchOrganizations();
    } catch (error) {
      console.error('Failed to create company:', error);
    }
  };

  const handleEditDept = async (name, description) => {
    if (!editingDept || !name.trim()) return;

    try {
      await updateOrganization(
        editingDept.id,
        {
          org_name: name.trim(),
          org_description: description,
          updated_by: updatedBy,
        },
        token
      );
      setShowEditDialog(false);
      setEditingDept(null);
      await fetchOrganizations();
    } catch (error) {
      console.error('Failed to update department:', error);
    }
  };

  const handleDeleteDept = async () => {
    if (!selectedDept) return;

    try {
      await deleteOrganization(selectedDept.id, token);
      setSelectedDept(null);
      setShowDeleteDialog(false);
      await fetchOrganizations();
    } catch (error) {
      console.error('Failed to delete department:', error);
    }
  };

  const filteredDepts = departments.filter((dept) => {
    const matchesSearch = dept.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || dept.status === activeFilter;
    return matchesSearch && matchesFilter;
  });


  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <Card
            className="p-3 flex flex-col bg-slate-800/80 border-slate-700 text-white"
            style={{
              height:
                activeTab === 'departments'
                  ? filteredDepts.length > 7
                    ? Math.min(filteredDepts.length, 7) * 64 + 145
                    : 'fit-content'
                  : companies.length > 7
                    ? Math.min(companies.length, 7) * 64 + 145
                    : 'fit-content',
              minHeight: 'fit-content',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-base">
                  {activeTab === 'departments' ? 'Departments' : 'Companies'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {activeTab === 'departments' ? 'Organization Units' : 'Organizational Entities'}
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1 bg-fuchsia-600 hover:bg-fuchsia-700 text-white">
                    <Plus className="h-3 w-3" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
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
                          onChange={(event) => setNewDeptName(event.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Description</Label>
                        <Input
                          placeholder="Optional"
                          value={newDeptDesc}
                          onChange={(event) => setNewDeptDesc(event.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex gap-2 justify-end pt-2 border-t">
                        <Button size="sm" variant="outline" className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600">
                          Cancel
                        </Button>
                        <Button size="sm" className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white" onClick={() => handleAddDepartment(newDeptName, newDeptDesc)}>
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
                          value={newCompanyName}
                          onChange={(event) => setNewCompanyName(event.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Description</Label>
                        <Input
                          placeholder="Optional"
                          value={newCompanyDesc}
                          onChange={(event) => setNewCompanyDesc(event.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex gap-2 justify-end pt-2 border-t">
                        <Button size="sm" variant="outline" className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600">
                          Cancel
                        </Button>
                        <Button size="sm" className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white" onClick={handleAddCompany}>
                          Add
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex gap-2 mb-2 border-b border-slate-700">
              <button
                onClick={() => setActiveTab('departments')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'departments'
                    ? 'text-white border-b-2 border-fuchsia-500 -mb-0.5'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Departments
              </button>
              <button
                onClick={() => setActiveTab('companies')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'companies'
                    ? 'text-white border-b-2 border-fuchsia-500 -mb-0.5'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Companies
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

            {activeTab === 'departments' ? (
              <div
                className={`space-y-1 ${filteredDepts.length > 7 ? 'overflow-y-auto pr-2' : 'overflow-hidden'}`}
                style={{
                  height: filteredDepts.length > 7 ? Math.min(filteredDepts.length, 7) * 64 : 'auto',
                  maxHeight: Math.min(filteredDepts.length, 7) * 64,
                }}
              >
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
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          dept.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {dept.status}
                      </span>
                    </div>
                  </Card>
                ))}
                {filteredDepts.length === 0 && (
                  <p className="text-center text-muted-foreground text-xs py-4">No departments</p>
                )}
              </div>
            ) : (
              <div
                className={`space-y-1 ${companies.length > 7 ? 'overflow-y-auto pr-2' : 'overflow-hidden'}`}
                style={{
                  height: companies.length > 7 ? Math.min(companies.length, 7) * 64 : 'auto',
                  maxHeight: Math.min(companies.length, 7) * 64,
                }}
              >
                {companies.map((company) => (
                  <Card
                    key={company.id}
                    className="p-2 cursor-pointer transition-colors bg-slate-900/40 border-slate-700 hover:bg-slate-700/40"
                    onClick={() => {
                      setSelectedDept(null);
                      setSelectedCompany(company);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white truncate">{company.name}</p>
                        <p className="text-xs text-slate-300 truncate">{company.departments_count} departments</p>
                      </div>
                      <Badge variant="outline" className="text-xs text-slate-200 border-slate-600">
                        Company
                      </Badge>
                    </div>
                  </Card>
                ))}
                {companies.length === 0 && (
                  <p className="text-center text-slate-400 text-xs py-4">No companies</p>
                )}
              </div>
            )}
          </Card>
        </div>

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
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      selectedDept.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {selectedDept.status}
                  </span>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => setEditingDept(selectedDept)}
                      className="w-full bg-blue-500/80 hover:bg-blue-500 text-white gap-2 text-sm"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Department
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-white">Edit Department</DialogTitle>
                    </DialogHeader>
                    {editingDept && (
                      <EditDepartmentDialog
                        ou={editingDept}
                        onEditOU={handleEditDept}
                        onCancel={() => setShowEditDialog(false)}
                      />
                    )}
                  </DialogContent>
                </Dialog>

                <Dialog open={showManageMembersDialog} onOpenChange={setShowManageMembersDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full !bg-indigo-500/80 hover:!bg-indigo-500 !text-white gap-2 text-sm">
                      <Users className="w-4 h-4" />
                      Manage Members
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-white">Manage Department Members</DialogTitle>
                    </DialogHeader>
                    {selectedDept && (
                      <ManageMembersDialog
                        dept={selectedDept}
                        onClose={() => setShowManageMembersDialog(false)}
                      />
                    )}
                  </DialogContent>
                </Dialog>

                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full !bg-red-500/80 hover:!bg-red-500 !text-white gap-2 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Department
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-destructive">Delete Department</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-white text-sm">
                        Are you sure you want to delete <span className="font-bold">{selectedDept.name}</span>? This action
                        cannot be undone.
                      </p>
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-sm text-red-300">Warning: This will permanently delete this department.</p>
                      </div>
                      <div className="flex gap-2 justify-end pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteDialog(false)}
                          className="border-slate-600 text-white bg-slate-700/60 text-sm hover:bg-slate-600"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleDeleteDept}
                          className="bg-red-500/80 hover:bg-red-500 text-white text-sm"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          ) : selectedCompany ? (
            <Card className="p-3 bg-slate-800/80 border-slate-700 text-white" style={{ height: 'fit-content' }}>
              <h3 className="text-base font-semibold text-white mb-2">Company Details</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Name</p>
                  <p className="text-sm font-medium text-white">{selectedCompany.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Departments</p>
                  <p className="text-sm text-white">{selectedCompany.departments_count}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Created</p>
                  <p className="text-sm text-white">{selectedCompany.created_at}</p>
                </div>
                {selectedCompany.description && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Description</p>
                    <p className="text-sm text-white">{selectedCompany.description}</p>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-3 bg-slate-800/80 border-slate-700 text-white" style={{ height: 'fit-content' }}>
              <p className="text-center text-slate-400 text-xs py-8">
                {activeTab === 'companies' ? 'Select a company' : 'Select a department'}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function EditDepartmentDialog({ ou, onEditOU, onCancel }) {
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
          onChange={(event) => setName(event.target.value)}
          className="bg-input border-border text-foreground text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground text-sm">Description</Label>
        <Input
          placeholder="Enter description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="bg-input border-border text-foreground text-sm"
        />
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-slate-600 text-white bg-slate-700/60 text-sm hover:bg-slate-600"
        >
          Cancel
        </Button>
        <Button onClick={handleSave} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm">
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function ManageMembersDialog({ dept, onClose }) {
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [activeTab, setActiveTab] = useState('current');

  const members = dept.members || [];

  const handleAddMember = () => {
    if (newMemberName.trim() && newMemberEmail.trim()) {
      setNewMemberName('');
      setNewMemberEmail('');
    }
  };

  const handleRemoveMember = () => {};

  const toggleMemberSelection = (memberId) => {
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
      <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
        <p className="text-xs text-slate-400 mb-1">Department</p>
        <p className="text-sm font-semibold text-white">{dept.name}</p>
        <p className="text-xs text-slate-400 mt-2">{members.length} member(s)</p>
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
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-muted/30 transition-colors"
                >
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
            <Label className="text-sm text-white">Member Name</Label>
            <Input
              placeholder="Enter member name"
              value={newMemberName}
              onChange={(event) => setNewMemberName(event.target.value)}
              className="bg-slate-700 border-slate-600 text-white mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-sm text-white">Email Address</Label>
            <Input
              placeholder="Enter email address"
              type="email"
              value={newMemberEmail}
              onChange={(event) => setNewMemberEmail(event.target.value)}
              className="bg-slate-700 border-slate-600 text-white mt-1 text-sm"
            />
          </div>
          <Button
            onClick={handleAddMember}
            className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white gap-2 text-sm"
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
          className="border-slate-600 text-white bg-slate-700/60 text-sm hover:bg-slate-600"
        >
          Close
        </Button>
        {activeTab === 'current' && selectedMembers.size > 0 && (
          <Button
            variant="ghost"
            className="text-red-300 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-sm"
            onClick={() => {
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
