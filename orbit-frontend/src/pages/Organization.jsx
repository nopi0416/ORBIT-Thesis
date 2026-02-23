import React, { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Building2, Users, Mail, Search } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import { getOrganizations, getUsersList } from "../services/budgetConfigService";

export default function OrganizationPage() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const token = user?.token || localStorage.getItem("authToken") || "";

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoadingOrg(true);
      setLoadingMembers(true);
      try {
        const [orgData, userData] = await Promise.all([
          getOrganizations(token),
          getUsersList(token),
        ]);

        if (!active) return;
        setOrganizations(Array.isArray(orgData) ? orgData : []);
        setMembers(Array.isArray(userData) ? userData : []);
      } catch (error) {
        if (!active) return;
        console.error("[OrganizationPage] Failed to load org data:", error);
        setOrganizations([]);
        setMembers([]);
      } finally {
        if (!active) return;
        setLoadingOrg(false);
        setLoadingMembers(false);
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [token]);

  const currentOrg = useMemo(() => {
    if (!organizations.length) return null;
    const byUserOrg = organizations.find((org) => String(org.org_id) === String(user?.org_id || ""));
    return byUserOrg || organizations[0] || null;
  }, [organizations, user?.org_id]);

  const companyOrg = useMemo(() => {
    if (!currentOrg || !organizations.length) return currentOrg;

    const byId = new Map((organizations || []).map((org) => [String(org.org_id), org]));
    const visited = new Set();
    let pointer = currentOrg;

    while (pointer?.parent_org_id && !visited.has(String(pointer.org_id))) {
      visited.add(String(pointer.org_id));
      const parent = byId.get(String(pointer.parent_org_id));
      if (!parent) break;
      pointer = parent;
    }

    return pointer || currentOrg;
  }, [currentOrg, organizations]);

  const companyDepartments = useMemo(() => {
    if (!companyOrg?.org_id) return [];
    return (organizations || [])
      .filter((org) => String(org.parent_org_id || "") === String(companyOrg.org_id))
      .sort((a, b) => String(a.org_name || "").localeCompare(String(b.org_name || "")));
  }, [companyOrg?.org_id, organizations]);

  const orgMembers = useMemo(() => {
    const orgNameById = new Map((organizations || []).map((org) => [String(org.org_id), org.org_name]));
    const allowedIds = new Set([
      String(companyOrg?.org_id || ""),
      ...companyDepartments.map((dept) => String(dept.org_id || "")),
    ].filter(Boolean));

    const scopedMembers = !allowedIds.size
      ? (members || [])
      : (members || []).filter((member) => {
          const userOrg = String(member.org_id || "");
          const userDept = String(member.department_id || "");
          return allowedIds.has(userOrg) || allowedIds.has(userDept);
        });

    return scopedMembers.map((member) => ({
      ...member,
      department:
        member.department ||
        orgNameById.get(String(member.department_id || "")) ||
        orgNameById.get(String(member.org_id || "")) ||
        "—",
    }));
  }, [members, organizations, companyOrg?.org_id, companyDepartments]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Organization" 
        description="View organization information and manage members" 
      />

      <div className="flex-1 p-6 space-y-8 overflow-y-auto">
        <OrganizationInfo organization={companyOrg} departments={companyDepartments} loading={loadingOrg} />
        <MembersList members={orgMembers} loading={loadingMembers} />
      </div>
    </div>
  );
}

// Organization Info Component
function OrganizationInfo({ organization, departments, loading }) {
  const orgName = organization?.org_name || "—";
  const orgDescription = organization?.org_description || "No description available.";

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div>
          <CardTitle className="text-white">Organization Information</CardTitle>
          <CardDescription className="text-gray-400">View your organization details</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading organization data...</p>
        ) : (
        <div className="grid gap-6 md:grid-cols-1">
          <div className="space-y-2">
            <Label className="text-white">Organization Name</Label>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span>{orgName}</span>
            </div>
          </div>
        </div>
        )}

        <div className="space-y-2">
          <Label className="text-white">Description</Label>
          <p className="text-sm text-gray-300">{orgDescription}</p>
        </div>

        <div className="space-y-2">
          <Label className="text-white">Departments</Label>
          {loading ? (
            <p className="text-sm text-gray-400">Loading departments...</p>
          ) : departments?.length ? (
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <span
                  key={dept.org_id}
                  className="inline-flex items-center rounded-md border border-slate-600 bg-slate-700/40 px-2 py-1 text-xs text-gray-200"
                >
                  {dept.org_name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No departments found under this company.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Members List Component
function MembersList({ members, loading }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const normalizeRoleValue = (role) => {
    const value = String(role || "").trim().toLowerCase();
    if (value.includes("l1")) return "l1";
    if (value.includes("l2")) return "l2";
    if (value.includes("l3")) return "l3";
    if (value.includes("payroll")) return "payroll";
    if (value.includes("admin")) return "admin";
    if (value.includes("requestor") || value.includes("requester")) return "requestor";
    return "requestor";
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "l1":
        return { label: "L1 Approver", color: "bg-blue-500/20 text-blue-400 border-blue-400" };
      case "l2":
        return { label: "L2 Approver", color: "bg-purple-500/20 text-purple-400 border-purple-400" };
      case "l3":
        return { label: "L3 Approver", color: "bg-pink-500/20 text-pink-400 border-pink-400" };
      case "payroll":
        return { label: "Payroll", color: "bg-green-500/20 text-green-400 border-green-400" };
      case "admin":
        return { label: "Admin", color: "bg-amber-500/20 text-amber-400 border-amber-400" };
      default:
        return { label: "Requestor", color: "bg-gray-500/20 text-gray-400 border-gray-400" };
    }
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getAvatarColor = (role) => {
    switch (role) {
      case "l1":
        return "bg-blue-500";
      case "l2":
        return "bg-purple-500";
      case "l3":
        return "bg-pink-500";
      case "payroll":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const normalizedMembers = (members || []).map((member) => ({
    id: member.user_id || member.id,
    name: member.full_name || `${member.first_name || ""} ${member.last_name || ""}`.trim() || "—",
    email: member.email || "—",
    role: normalizeRoleValue((member.roles && member.roles[0]) || member.role || "requestor"),
    department: member.department || "—",
  }));

  const filteredMembers = normalizedMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Organization Members
            </CardTitle>
            <CardDescription className="text-gray-400">
              {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} found
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1 min-w-[620px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px] bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="l1">L1 Approver</SelectItem>
              <SelectItem value="l2">L2 Approver</SelectItem>
              <SelectItem value="l3">L3 Approver</SelectItem>
              <SelectItem value="payroll">Payroll</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="requestor">Requestor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Members List with Scroll */}
        <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-track-slate-700 scrollbar-thumb-slate-500">
          <div className="space-y-3 pr-2">
            {loading && (
              <div className="text-center py-8 text-gray-400">Loading organization members...</div>
            )}

            {!loading && filteredMembers.length > 0 &&
              filteredMembers.map((member) => {
                const roleBadge = getRoleBadge(member.role);
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-slate-700/30 border border-slate-600/50 hover:bg-slate-700/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={`${getAvatarColor(member.role)} text-white text-sm font-medium`}>
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-white text-sm">{member.name}</h4>
                        <span className={`text-xs font-medium ${roleBadge.color.split(" ")[1]}`}>
                          {roleBadge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                        <span>•</span>
                        <span>{member.department}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

            {!loading && filteredMembers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No members found matching your search criteria.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}