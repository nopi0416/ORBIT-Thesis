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
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { handlePaste, handleRestrictedKeyDown, sanitizeOuText } from '../../utils/inputSanitizer';
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
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedDeptIds, setSelectedDeptIds] = useState(new Set());
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showAddDeptDialog, setShowAddDeptDialog] = useState(false);
  const [isDeletingDept, setIsDeletingDept] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [isUpdatingDept, setIsUpdatingDept] = useState(false);
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newCompanyCode, setNewCompanyCode] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyDesc, setNewCompanyDesc] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [companyScopeId, setCompanyScopeId] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationVariant, setNotificationVariant] = useState('success');

  const token = localStorage.getItem('authToken');
  const isUuid = (value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
  const updatedBy = isUuid(user?.id) ? user.id : null;

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

  useEffect(() => {
    setSelectedDeptIds(new Set());
  }, [selectedCompany, activeTab]);

  const departments = useMemo(() => {
    if (!selectedCompany?.id) return [];
    return organizations
      .filter((org) => org.parent_org_id === selectedCompany.id)
      .map((org) => ({
        id: org.org_id,
        name: org.org_name,
        description: org.org_description,
      }));
  }, [organizations, selectedCompany]);

  useEffect(() => {
    if (!selectedDept) return;

    const match = departments.find((dept) => dept.id === selectedDept.id);
    if (!match) {
      setSelectedDept(null);
      return;
    }

    const shouldUpdate =
      match.name !== selectedDept.name ||
      match.description !== selectedDept.description;

    if (shouldUpdate) {
      setSelectedDept(match);
    }
  }, [departments, selectedDept]);

  useEffect(() => {
    setSelectedDeptIds((prev) => {
      const next = new Set([...prev].filter((id) => departments.some((dept) => dept.id === id)));
      return next;
    });
  }, [departments]);

  const handleAddDepartment = async (name, description) => {
    if (!name.trim() || !selectedCompany?.id) return;

    if (isCreatingDept) return;
    setIsCreatingDept(true);

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
      setShowAddDeptDialog(false);
      await fetchOrganizations();
      notify('Department created successfully.');
    } catch (error) {
      console.error('Failed to create department:', error);
      notify('Failed to create department.', 'error');
    } finally {
      setIsCreatingDept(false);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return;

    try {
      const createdCompany = await createOrganization(
        {
          org_name: newCompanyName.trim(),
          company_code: newCompanyCode.trim() || null,
          org_description: newCompanyDesc,
          created_by: updatedBy,
        },
        token
      );
      setNewCompanyCode('');
      setNewCompanyName('');
      setNewCompanyDesc('');
      await fetchOrganizations();
      if (createdCompany?.org_id) {
        setCompanyScopeId(createdCompany.org_id);
        setSelectedCompany({
          id: createdCompany.org_id,
          name: createdCompany.org_name,
          description: createdCompany.org_description,
          created_at: createdCompany.created_at,
          departments_count: 0,
        });
      }
      notify('Company created successfully.');
    } catch (error) {
      console.error('Failed to create company:', error);
      notify('Failed to create company.', 'error');
    }
  };

  const handleEditDept = async (name, description) => {
    if (!editingDept || !name.trim()) return;

    if (isUpdatingDept) return;
    setIsUpdatingDept(true);

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
      notify('Department updated successfully.');
    } catch (error) {
      console.error('Failed to update department:', error);
      notify('Failed to update department.', 'error');
    } finally {
      setIsUpdatingDept(false);
    }
  };

  const handleDeleteDept = async () => {
    if (!selectedDept) return;

    if (isDeletingDept) return;
    setIsDeletingDept(true);

    try {
      await deleteOrganization(selectedDept.id, token);
      setSelectedDeptIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedDept.id);
        return next;
      });
      setSelectedDept(null);
      setShowDeleteDialog(false);
      await fetchOrganizations();
      notify('Department deleted successfully.');
    } catch (error) {
      console.error('Failed to delete department:', error);
      notify('Failed to delete department.', 'error');
    } finally {
      setIsDeletingDept(false);
    }
  };

  const toggleDeptSelection = (deptId) => {
    setSelectedDeptIds((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedDeptIds);
    if (ids.length === 0) return;

    if (isBulkDeleting) return;
    setIsBulkDeleting(true);

    try {
      await Promise.all(ids.map((id) => deleteOrganization(id, token)));
      setSelectedDeptIds(new Set());
      setShowBulkDeleteDialog(false);
      setBulkDeleteConfirmText('');
      setSelectedDept(null);
      await fetchOrganizations();
      notify(`${ids.length} department${ids.length === 1 ? '' : 's'} deleted successfully.`);
    } catch (error) {
      console.error('Failed to delete selected departments:', error);
      notify('Failed to delete selected departments.', 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const filteredDepts = departments.filter((dept) => {
    const matchesSearch = dept.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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


  return (
    <div>
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
              {activeTab === 'departments' && (
                <Dialog
                  open={showAddDeptDialog}
                  onOpenChange={(open) => {
                    if (isCreatingDept) return;
                    setShowAddDeptDialog(open);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1 bg-fuchsia-600 hover:bg-fuchsia-700 text-white">
                      <Plus className="h-3 w-3" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Department</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm">Name</Label>
                        <Input
                          placeholder="Department name"
                          value={newDeptName}
                          onChange={handleOuInputChange(setNewDeptName)}
                          onPaste={handleOuPaste()}
                          onKeyDown={handleOuKeyDown()}
                          maxLength={50}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Description</Label>
                        <Textarea
                          placeholder="Optional"
                          value={newDeptDesc}
                          onChange={handleOuInputChange(setNewDeptDesc, true)}
                          onPaste={handleOuPaste(true)}
                          onKeyDown={handleOuKeyDown(true)}
                          maxLength={255}
                          className="text-sm min-h-[128px]"
                        />
                      </div>
                      <div className="flex gap-2 justify-end pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
                          onClick={() => setShowAddDeptDialog(false)}
                          disabled={isCreatingDept}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                          onClick={() => handleAddDepartment(newDeptName, newDeptDesc)}
                          disabled={isCreatingDept}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
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
              onChange={handleOuInputChange(setSearchTerm)}
              onPaste={handleOuPaste()}
              onKeyDown={handleOuKeyDown()}
              maxLength={50}
              className="h-8 mb-2 text-sm"
            />

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
                    onClick={() => {
                      setSelectedDeptIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(dept.id)) {
                          next.delete(dept.id);
                          if (selectedDept?.id === dept.id) {
                            setSelectedDept(null);
                          }
                        } else {
                          next.add(dept.id);
                          setSelectedDept(dept);
                        }
                        return next;
                      });
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedDeptIds.has(dept.id)}
                          onCheckedChange={() => toggleDeptSelection(dept.id)}
                          onClick={(event) => event.stopPropagation()}
                        />
                        <p className="font-semibold text-sm truncate">{dept.name}</p>
                      </div>
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

            {activeTab === 'departments' && selectedDeptIds.size > 1 && (
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-400">
                  {selectedDeptIds.size} selected
                </p>
                <Button
                  size="sm"
                  className="!bg-red-500/80 hover:!bg-red-500 !text-white"
                  onClick={() => setShowBulkDeleteDialog(true)}
                  disabled={isBulkDeleting}
                >
                  Delete Selected
                </Button>
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
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <Dialog
                  open={showEditDialog}
                  onOpenChange={(open) => {
                    if (isUpdatingDept) return;
                    setShowEditDialog(open);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => setEditingDept(selectedDept)}
                      className="w-full bg-blue-500/80 hover:bg-blue-500 text-white gap-2 text-sm"
                      disabled={isUpdatingDept}
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
                        isSaving={isUpdatingDept}
                      />
                    )}
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={showDeleteDialog}
                  onOpenChange={(open) => {
                    if (isDeletingDept) return;
                    setShowDeleteDialog(open);
                  }}
                >
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
                          disabled={isDeletingDept}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleDeleteDept}
                          className="!bg-red-500/80 hover:!bg-red-500 !text-white text-sm"
                          disabled={isDeletingDept}
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

      <Dialog
        open={showBulkDeleteDialog}
        onOpenChange={(open) => {
          if (isBulkDeleting) return;
          setShowBulkDeleteDialog(open);
          if (!open) {
            setBulkDeleteConfirmText('');
          }
        }}
      >
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Selected Departments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-white text-sm">
              You are about to delete {selectedDeptIds.size} department{selectedDeptIds.size === 1 ? '' : 's'}. This action cannot be undone.
            </p>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-300">Warning: This will permanently delete the selected departments.</p>
            </div>
            <div>
              <Label className="text-xs text-slate-400">Type CONFIRM to continue</Label>
              <Input
                value={bulkDeleteConfirmText}
                onChange={handleOuInputChange(setBulkDeleteConfirmText, false, (value) => value.toUpperCase())}
                onPaste={handleOuPaste(false, (value) => value.toUpperCase())}
                onKeyDown={(event) => {
                  handleRestrictedKeyDown(event);
                  if (event.key === 'Enter' && bulkDeleteConfirmText === 'CONFIRM' && !isBulkDeleting) {
                    event.preventDefault();
                    handleDeleteSelected();
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
                disabled={isBulkDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteSelected}
                className="!bg-red-500/80 hover:!bg-red-500 !text-white text-sm"
                disabled={bulkDeleteConfirmText !== 'CONFIRM' || isBulkDeleting}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditDepartmentDialog({ ou, onEditOU, onCancel, isSaving }) {
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
          onChange={(event) => setName(sanitizeOuText(event.target.value))}
          onPaste={(event) => handlePaste(event, sanitizeOuText)}
          onKeyDown={(event) => handleRestrictedKeyDown(event)}
          maxLength={50}
          className="bg-input border-border text-foreground text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground text-sm">Description</Label>
        <Textarea
          placeholder="Enter description"
          value={description}
          onChange={(event) => setDescription(sanitizeOuText(event.target.value, true))}
          onPaste={(event) => handlePaste(event, (value) => sanitizeOuText(value, true))}
          onKeyDown={(event) => handleRestrictedKeyDown(event, { allowEnter: true })}
          maxLength={255}
          className="bg-input border-border text-foreground text-sm min-h-[128px]"
        />
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-slate-600 text-white bg-slate-700/60 text-sm hover:bg-slate-600"
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm"
          disabled={isSaving}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
