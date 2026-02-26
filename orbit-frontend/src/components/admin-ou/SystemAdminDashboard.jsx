import { useEffect, useState } from 'react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '../ui';
import { ChevronDown, ChevronRight, Plus, Edit3, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { handlePaste, handleRestrictedKeyDown, sanitizeOuText } from '../../utils/inputSanitizer';
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

export function SystemAdminDashboard({ hideDetails = false, onSelectionChange } = {}) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedOrgIds, setSelectedOrgIds] = useState(new Set());
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [editingOrg, setEditingOrg] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [isBulkAddingDept, setIsBulkAddingDept] = useState(false);
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [showAddOrgDialog, setShowAddOrgDialog] = useState(false);
  const [showAddDeptDialog, setShowAddDeptDialog] = useState(false);
  const [showConfirmAddDept, setShowConfirmAddDept] = useState(false);
  const [confirmDeptLabel, setConfirmDeptLabel] = useState('');
  const [pendingDeptAction, setPendingDeptAction] = useState(null);
  const [organizationData, setOrganizationData] = useState([]);
  const [newOrgCode, setNewOrgCode] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptParentId, setNewDeptParentId] = useState('');
  const [bulkDepartments, setBulkDepartments] = useState([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkFileError, setBulkFileError] = useState('');
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgDesc, setEditOrgDesc] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationVariant, setNotificationVariant] = useState('success');

  const token = localStorage.getItem('authToken');
  const isUuid = (value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
  const createdBy = isUuid(user?.id) ? user.id : null;

  const fetchOrganizations = async () => {
    try {
      const data = await getOrganizations(token);
      setOrganizationData(buildOrgTree(data));
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setOrganizationData([]);
    }
  };

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

  const getParentCompanyId = () => {
    if (!selectedOrg) return null;
    return selectedOrg.type === 'company' ? selectedOrg.org_id : selectedOrg.parent_org_id;
  };

  const openConfirmAddDept = (label, action) => {
    setConfirmDeptLabel(label);
    setPendingDeptAction(() => action);
    setShowConfirmAddDept(true);
  };

  const handleConfirmAddDept = async () => {
    if (!pendingDeptAction) return;
    if (isCreatingDept || isBulkAddingDept) return;
    await pendingDeptAction();
    setShowConfirmAddDept(false);
    setPendingDeptAction(null);
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (!selectedOrg) return;

    const match = findOrgById(organizationData, selectedOrg.org_id);
    if (!match) {
      setSelectedOrg(null);
      return;
    }

    const shouldUpdate =
      match.org_name !== selectedOrg.org_name ||
      match.org_description !== selectedOrg.org_description ||
      match.company_code !== selectedOrg.company_code ||
      match.parent_org_id !== selectedOrg.parent_org_id ||
      match.type !== selectedOrg.type ||
      match.created_at !== selectedOrg.created_at;

    if (shouldUpdate) {
      setSelectedOrg(match);
    }
  }, [organizationData, selectedOrg]);

  useEffect(() => {
    if (selectedOrgIds.size > 0) {
      const existing = new Set();
      const collectIds = (nodes) => {
        nodes.forEach((node) => {
          existing.add(node.org_id);
          if (node.children?.length) {
            collectIds(node.children);
          }
        });
      };
      collectIds(organizationData);
      const filtered = new Set([...selectedOrgIds].filter((id) => existing.has(id)));
      if (filtered.size !== selectedOrgIds.size) {
        setSelectedOrgIds(filtered);
      }
    }
  }, [organizationData, selectedOrgIds]);

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedOrg);
    }
  }, [selectedOrg, onSelectionChange]);

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
        const childHasMatch = children.length > 0;

        if (nodeMatches) {
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

    if (isDeletingOrg) return;
    setIsDeletingOrg(true);

    try {
      await deleteOrganization(selectedOrg.org_id, token);
      await fetchOrganizations();
      setSelectedOrg(null);
      setSelectedOrgIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedOrg.org_id);
        return next;
      });
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
      notify('Organization deleted successfully.');
    } catch (error) {
      console.error('Failed to delete organization:', error);
      notify('Failed to delete organization.', 'error');
    } finally {
      setIsDeletingOrg(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedOrgIds.size === 0) return;

    if (isBulkDeleting) return;
    setIsBulkDeleting(true);

    try {
      for (const orgId of selectedOrgIds) {
        await deleteOrganization(orgId, token);
      }
      setSelectedOrgIds(new Set());
      setShowBulkDeleteDialog(false);
      setBulkDeleteConfirmText('');
      await fetchOrganizations();
      notify('Selected organizations deleted successfully.');
    } catch (error) {
      console.error('Failed to delete selected organizations:', error);
      notify('Failed to delete selected organizations.', 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;

    if (isCreatingOrg) return;
    setIsCreatingOrg(true);

    try {
      await createOrganization(
        {
          org_name: newOrgName.trim(),
          company_code: newOrgCode.trim() || null,
          org_description: newOrgDesc.trim(),
          created_by: createdBy,
        },
        token
      );
      setNewOrgCode('');
      setNewOrgName('');
      setNewOrgDesc('');
      setShowAddOrgDialog(false);
      await fetchOrganizations();
      notify('Company added successfully.');
    } catch (error) {
      console.error('Failed to create organization:', error);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleCreateDept = async () => {
    if (!selectedOrg || !newDeptName.trim()) return;

    const parentOrgId = getParentCompanyId();
    const parentCompanyCode = selectedOrg.type === 'company'
      ? selectedOrg.company_code
      : selectedOrg.parent_org_id
        ? organizationData.find((org) => org.org_id === selectedOrg.parent_org_id)?.company_code
        : null;

    if (!parentOrgId) return;

    if (isCreatingDept) return;
    setIsCreatingDept(true);

    try {
      await createOrganization(
        {
          org_name: newDeptName.trim(),
          org_description: newDeptDesc.trim(),
          parent_org_id: parentOrgId,
          company_code: parentCompanyCode || null,
          created_by: createdBy,
        },
        token
      );
      setNewDeptName('');
      setNewDeptDesc('');
      setShowAddOrgDialog(false);
      setShowAddDeptDialog(false);
      await fetchOrganizations();
      notify('Department added successfully.');
    } catch (error) {
      console.error('Failed to create department:', error);
    } finally {
      setIsCreatingDept(false);
    }
  };

  const handleCreateDeptFromTab = async () => {
    if (!newDeptParentId || !newDeptName.trim() || !newDeptDesc.trim()) return;

    const parentCompany = findOrgById(organizationData, newDeptParentId);
    if (!parentCompany || parentCompany.type !== 'company') return;

    if (isCreatingDept) return;
    setIsCreatingDept(true);

    try {
      await createOrganization(
        {
          org_name: newDeptName.trim(),
          org_description: newDeptDesc.trim(),
          parent_org_id: parentCompany.org_id,
          company_code: parentCompany.company_code || null,
          created_by: createdBy,
        },
        token
      );
      setNewDeptName('');
      setNewDeptDesc('');
      setNewDeptParentId('');
      setShowAddOrgDialog(false);
      await fetchOrganizations();
      notify('Department added successfully.');
    } catch (error) {
      console.error('Failed to create department:', error);
    } finally {
      setIsCreatingDept(false);
    }
  };

  const handleBulkFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const rows = lines.map((line) => line.split(',')).filter((parts) => parts.length > 0);

      const hasHeader = rows[0]?.[0]?.toLowerCase().includes('department');
      const dataRows = hasHeader ? rows.slice(1) : rows;

      const parsed = dataRows
        .map((parts) => ({
          name: (parts[0] || '').trim(),
          description: parts.slice(1).join(',').trim(),
        }))
        .filter((item) => item.name);

      setBulkDepartments(parsed);
      setBulkFileName(file.name);
      setBulkFileError(parsed.length ? '' : 'No valid departments found in file.');
    } catch (error) {
      console.error('Failed to parse bulk file:', error);
      setBulkFileError('Failed to parse file. Please upload a CSV.');
      setBulkDepartments([]);
      setBulkFileName('');
    }
  };

  const handleDownloadTemplate = () => {
    const header = 'department_name,description\n';
    const blob = new Blob([header], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'department_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkAddDepartments = async () => {
    if (!bulkDepartments.length) return;
    const parentOrgId = getParentCompanyId();
    const parentCompanyCode = selectedOrg?.type === 'company'
      ? selectedOrg.company_code
      : selectedOrg?.parent_org_id
        ? organizationData.find((org) => org.org_id === selectedOrg.parent_org_id)?.company_code
        : null;
    if (!parentOrgId) return;

    if (isBulkAddingDept) return;
    setIsBulkAddingDept(true);

    try {
      for (const dept of bulkDepartments) {
        await createOrganization(
          {
            org_name: dept.name,
            org_description: dept.description,
            parent_org_id: parentOrgId,
            company_code: parentCompanyCode || null,
            created_by: createdBy,
          },
          token
        );
      }
      setBulkDepartments([]);
      setBulkFileName('');
      setBulkFileError('');
      await fetchOrganizations();
      notify(`Added ${bulkDepartments.length} departments successfully.`);
    } catch (error) {
      console.error('Failed to bulk add departments:', error);
    } finally {
      setIsBulkAddingDept(false);
    }
  };

  const companyCodeForDetails = selectedOrg?.type === 'company'
    ? selectedOrg.company_code
    : selectedOrg?.parent_org_id
      ? organizationData.find((org) => org.org_id === selectedOrg.parent_org_id)?.company_code
      : null;

  const toggleOrgSelection = (orgId) => {
    setSelectedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  };

  const handleEditOrg = async () => {
    if (!editingOrg || !editOrgName.trim()) return;

    if (isUpdatingOrg) return;
    setIsUpdatingOrg(true);

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
      notify('Organization updated successfully.');
    } catch (error) {
      console.error('Failed to update organization:', error);
    } finally {
      setIsUpdatingOrg(false);
    }
  };

  const handleSelectOrg = (org) => {
    setSelectedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(org.org_id)) {
        next.delete(org.org_id);
        if (selectedOrg?.org_id === org.org_id) {
          setSelectedOrg(null);
        }
      } else {
        next.add(org.org_id);
        setSelectedOrg(org);
      }
      return next;
    });
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
      const isSelected = selectedOrgIds.has(node.org_id);

      return (
        <div key={node.org_id} className="space-y-0">
          <div
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
              selectedOrg?.org_id === node.org_id
                ? 'bg-primary/20 border border-primary'
                : 'hover:bg-card/50 hover:border-slate-500/60 border border-transparent'
            }`}
            onClick={() => handleSelectOrg(node)}
          >
            <div onClick={(event) => event.stopPropagation()}>
              <Checkbox checked={isSelected} onCheckedChange={() => toggleOrgSelection(node.org_id)} />
            </div>
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
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">{node.org_name}</span>
                <div className="flex items-center gap-1">
                  {node.type === 'company' ? (
                    <Badge variant="outline" className="text-xs">{node.children.length}</Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-secondary/20 text-secondary border-secondary/30"
                    >
                      Department
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div
              className={`ml-4 pl-3 border-l border-border space-y-0 ${
                node.type === 'company' ? 'max-h-[280px] overflow-y-auto pr-1' : ''
              }`}
            >
              {renderOrgTree(node.children)}
            </div>
          )}
        </div>
      );
    });
  };

  if (hideDetails) {
    return (
      <div className="w-full">
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
        <Card
          className="p-3 flex flex-col bg-slate-800/80 border-slate-700 text-white"
          style={{
            minHeight: 'fit-content',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-base">Organizations</h3>
              <p className="text-xs text-muted-foreground">Companies & Departments</p>
            </div>
            <Dialog
              open={showAddOrgDialog}
              onOpenChange={(open) => {
                if (isCreatingOrg) return;
                setShowAddOrgDialog(open);
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
                  <DialogTitle>Add Company</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Company Code</Label>
                      <Input
                        placeholder="Enter company code"
                        value={newOrgCode}
                        onChange={handleOuInputChange(setNewOrgCode)}
                        onPaste={handleOuPaste()}
                        onKeyDown={handleOuKeyDown()}
                        maxLength={10}
                        className="bg-input border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Company Name</Label>
                      <Input
                        placeholder="Enter company name"
                        value={newOrgName}
                        onChange={handleOuInputChange(setNewOrgName)}
                        onPaste={handleOuPaste()}
                        onKeyDown={handleOuKeyDown()}
                        maxLength={50}
                        className="bg-input border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Description</Label>
                      <Textarea
                        placeholder="Enter description"
                        value={newOrgDesc}
                        onChange={handleOuInputChange(setNewOrgDesc, true)}
                        onPaste={handleOuPaste(true)}
                        onKeyDown={handleOuKeyDown(true)}
                        maxLength={255}
                        className="bg-input border-border text-foreground min-h-[128px]"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
                        disabled={isCreatingOrg}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                        onClick={handleCreateOrg}
                        disabled={isCreatingOrg}
                      >
                        Add Company
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

          {selectedOrgIds.size > 1 && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-400">
                {selectedOrgIds.size} selected
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
    );
  }

  // Full vertical layout when hideDetails={false}
  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
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
      <Card
        className="p-3 flex flex-col bg-slate-800/80 border-slate-700 text-white flex-1 overflow-y-auto min-h-0"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-base">Organizations</h3>
          </div>
            <Dialog
              open={showAddOrgDialog}
              onOpenChange={(open) => {
                if (isCreatingOrg) return;
                setShowAddOrgDialog(open);
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
                  <DialogTitle>Add Company</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Company Code</Label>
                      <Input
                        placeholder="Enter company code"
                        value={newOrgCode}
                        onChange={handleOuInputChange(setNewOrgCode)}
                        onPaste={handleOuPaste()}
                        onKeyDown={handleOuKeyDown()}
                        maxLength={10}
                        className="bg-input border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Company Name</Label>
                      <Input
                        placeholder="Enter company name"
                        value={newOrgName}
                        onChange={handleOuInputChange(setNewOrgName)}
                        onPaste={handleOuPaste()}
                        onKeyDown={handleOuKeyDown()}
                        maxLength={50}
                        className="bg-input border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Description</Label>
                      <Textarea
                        placeholder="Enter description"
                        value={newOrgDesc}
                        onChange={handleOuInputChange(setNewOrgDesc, true)}
                        onPaste={handleOuPaste(true)}
                        onKeyDown={handleOuKeyDown(true)}
                        maxLength={255}
                        className="bg-input border-border text-foreground min-h-[128px]"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
                        disabled={isCreatingOrg}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                        onClick={handleCreateOrg}
                        disabled={isCreatingOrg}
                      >
                        Add Company
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

          {selectedOrgIds.size > 1 && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-400">
                {selectedOrgIds.size} selected
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

      {selectedOrg ? (
        <Card className="p-0 bg-slate-800/80 border-slate-700 text-white" style={{ maxHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <div className="p-3 flex-1 overflow-y-auto space-y-3">
            <h3 className="text-base font-semibold text-white mb-2">Details</h3>

            <div className="space-y-2 text-sm mb-3">
              <div>
                <p className="text-xs text-slate-400 mb-1">
                  {selectedOrg?.type === 'department' ? 'Department Name' : 'Organization Name'}
                </p>
                <p className="text-white font-medium">{selectedOrg.org_name}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1">Company Code</p>
                <p className="text-white font-mono text-xs">{companyCodeForDetails || '—'}</p>
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
          </div>

          <div className="p-3 flex items-center justify-end gap-2 bg-slate-800/80 border-t border-slate-700/50">
            <Dialog
              open={showEditDialog}
              onOpenChange={(open) => {
                if (isUpdatingOrg) return;
                setShowEditDialog(open);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingOrg(selectedOrg);
                    setEditOrgName(selectedOrg?.org_name || '');
                    setEditOrgDesc(selectedOrg?.org_description || '');
                  }}
                  className="gap-1 bg-blue-500/80 hover:bg-blue-500 text-white"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {selectedOrg?.type === 'department' ? 'Edit Department' : 'Edit Organization'}
                  </DialogTitle>
                </DialogHeader>
                {editingOrg && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">
                        {selectedOrg?.type === 'department' ? 'Department Name' : 'Organization Name'}
                      </Label>
                      <Input
                        placeholder="Enter name"
                        value={editOrgName}
                        onChange={handleOuInputChange(setEditOrgName)}
                        onPaste={handleOuPaste()}
                        onKeyDown={handleOuKeyDown()}
                        maxLength={50}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Description</Label>
                      <Textarea
                        placeholder="Enter description"
                        value={editOrgDesc}
                        onChange={handleOuInputChange(setEditOrgDesc, true)}
                        onPaste={handleOuPaste(true)}
                        onKeyDown={handleOuKeyDown(true)}
                        maxLength={255}
                        className="bg-slate-700 border-slate-600 text-white min-h-[128px]"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
                        disabled={isUpdatingOrg}
                        onClick={() => setShowEditDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                        onClick={handleEditOrg}
                        disabled={isUpdatingOrg}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {selectedOrg.type === 'company' && (
              <Dialog
                open={showAddDeptDialog}
                onOpenChange={(open) => {
                  if (isCreatingDept || isBulkAddingDept) return;
                  setShowAddDeptDialog(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1 !bg-fuchsia-700 hover:!bg-fuchsia-600 !text-white">
                    <Plus className="w-3 h-3" />
                    Add Dept
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
                        <TabsTrigger
                          value="individual"
                          className="text-xs border border-transparent data-[state=active]:border-fuchsia-500 data-[state=active]:text-white data-[state=active]:bg-fuchsia-600/30"
                        >
                          Individual Add
                        </TabsTrigger>
                        <TabsTrigger
                          value="bulk"
                          className="text-xs border border-transparent data-[state=active]:border-fuchsia-500 data-[state=active]:text-white data-[state=active]:bg-fuchsia-600/30"
                        >
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
                            onChange={handleOuInputChange(setNewDeptName)}
                            onPaste={handleOuPaste()}
                            onKeyDown={handleOuKeyDown()}
                            maxLength={50}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white text-sm">Description</Label>
                          <Textarea
                            placeholder="Enter description"
                            className="bg-slate-700 border-slate-600 text-white text-sm"
                            value={newDeptDesc}
                            onChange={handleOuInputChange(setNewDeptDesc, true)}
                            onPaste={handleOuPaste(true)}
                            onKeyDown={handleOuKeyDown(true)}
                            maxLength={255}
                            rows={6}
                          />
                        </div>

                        <div className="flex gap-2 justify-end pt-4 border-t border-border">
                          <Button
                            variant="outline"
                            className="border-slate-600 text-white bg-slate-700/60 text-sm hover:bg-slate-600"
                            onClick={() => setShowAddDeptDialog(false)}
                            disabled={isCreatingDept}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="!bg-fuchsia-700 hover:!bg-fuchsia-600 !text-white text-sm"
                            onClick={() => openConfirmAddDept('Add department', handleCreateDept)}
                            disabled={isCreatingDept}
                          >
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
                              onClick={handleDownloadTemplate}
                            >
                              Generate Template
                            </Button>
                          </div>
                          <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-fuchsia-500/50 transition-colors cursor-pointer bg-slate-700/30">
                            <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                            <p className="text-xs text-slate-400 mb-2">Drag and drop your file here</p>
                            <input
                              type="file"
                              accept=".csv"
                              className="hidden"
                              id="bulk-file-input"
                              onChange={handleBulkFileChange}
                            />
                            <label htmlFor="bulk-file-input" className="text-xs text-fuchsia-300 hover:underline cursor-pointer">
                              Browse files
                            </label>
                          </div>
                          {bulkFileName && (
                            <div className="flex items-center justify-between gap-2 border border-slate-600 rounded-lg px-3 py-2 bg-slate-800/60">
                              <p className="text-xs text-slate-300">Selected file: {bulkFileName}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-slate-300 hover:text-red-300 hover:bg-red-500/20"
                                onClick={() => {
                                  setBulkDepartments([]);
                                  setBulkFileName('');
                                  setBulkFileError('');
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          {bulkFileError && (
                            <p className="text-xs text-red-300">{bulkFileError}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-white">Preview ({bulkDepartments.length} departments)</p>
                          <div className="border border-slate-600 rounded-lg overflow-hidden bg-slate-800 max-h-64 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-700/60 sticky top-0 border-b border-slate-600">
                                <tr>
                                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-300">#</th>
                                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-300">Department Name</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bulkDepartments.map((dept, index) => (
                                  <tr key={`${dept.name}-${index}`} className="border-b border-slate-700/60">
                                    <td className="px-4 py-2 text-xs text-slate-300">{index + 1}</td>
                                    <td className="px-4 py-2 text-xs text-white">{dept.name}</td>
                                  </tr>
                                ))}
                                {bulkDepartments.length === 0 && (
                                  <tr>
                                    <td colSpan={2} className="px-4 py-3 text-xs text-slate-400">
                                      No departments loaded
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-4 border-t border-border">
                          <Button
                            variant="outline"
                            className="border-slate-600 text-white bg-slate-700/60 text-sm hover:bg-slate-600"
                            onClick={() => setShowAddDeptDialog(false)}
                            disabled={isBulkAddingDept}
                          >
                            Cancel
                          </Button>
                          <Button
                            disabled={bulkDepartments.length === 0 || isBulkAddingDept}
                            className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm disabled:opacity-50"
                            onClick={() => openConfirmAddDept('Add all departments', handleBulkAddDepartments)}
                          >
                            Add All ({bulkDepartments.length}) Departments
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Dialog
              open={showDeleteDialog}
              onOpenChange={(open) => {
                if (isDeletingOrg) return;
                setShowDeleteDialog(open);
                if (!open) {
                  setDeleteConfirmText('');
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 !bg-red-500/80 hover:!bg-red-500 !text-white">
                  <Trash2 className="w-3 h-3" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-destructive">
                    {selectedOrg?.type === 'department' ? 'Delete Department' : 'Delete Organization'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-white">
                    Are you sure you want to delete <span className="font-bold">{selectedOrg.org_name}</span>? This action cannot be undone.
                  </p>
                  <div>
                    <Label className="text-xs text-slate-400">Type CONFIRM to continue</Label>
                    <Input
                      value={deleteConfirmText}
                      onChange={handleOuInputChange(setDeleteConfirmText, false, (value) => value.toUpperCase())}
                      onPaste={handleOuPaste(false, (value) => value.toUpperCase())}
                      onKeyDown={(event) => {
                        handleRestrictedKeyDown(event);
                        if (event.key === 'Enter' && deleteConfirmText === 'CONFIRM' && !isDeletingOrg) {
                          event.preventDefault();
                          handleDeleteOrg();
                        }
                      }}
                      maxLength={7}
                      placeholder="CONFIRM"
                      className="mt-1"
                    />
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-sm text-red-300">
                      {selectedOrg?.type === 'department'
                        ? 'Warning: This will permanently delete this department.'
                        : 'Warning: This will permanently delete this organization and all its departments.'}
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
                      onClick={() => setShowDeleteDialog(false)}
                      disabled={isDeletingOrg}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDeleteOrg}
                      className="!bg-red-500/80 hover:!bg-red-500 !text-white"
                      disabled={deleteConfirmText !== 'CONFIRM' || isDeletingOrg}
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
        <Card className="p-3 bg-slate-800/80 border-slate-700 text-white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="text-slate-400 text-xs">Select an organization to view details</p>
        </Card>
      )}

      <Dialog
        open={showConfirmAddDept}
        onOpenChange={(open) => {
          if (isCreatingDept || isBulkAddingDept) return;
          setShowConfirmAddDept(open);
        }}
      >
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm {confirmDeptLabel}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-300">
            Are you sure you want to {confirmDeptLabel.toLowerCase()}?
          </p>
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button
              variant="outline"
              className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
              onClick={() => setShowConfirmAddDept(false)}
              disabled={isCreatingDept || isBulkAddingDept}
            >
              Cancel
            </Button>
            <Button
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
              onClick={handleConfirmAddDept}
              disabled={isCreatingDept || isBulkAddingDept}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <DialogTitle className="text-destructive">Delete Selected Organizations</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-300">
            Delete {selectedOrgIds.size} selected item(s)? This action cannot be undone.
          </p>
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
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button
              variant="outline"
              className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={isBulkDeleting}
            >
              Cancel
            </Button>
            <Button
              className="!bg-red-500/80 hover:!bg-red-500 !text-white"
              onClick={handleDeleteSelected}
              disabled={bulkDeleteConfirmText !== 'CONFIRM' || isBulkDeleting}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
