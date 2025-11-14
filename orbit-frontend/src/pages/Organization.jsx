import React, { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { 
  Building2, 
  MapPin, 
  Users, 
  Mail, 
  Phone, 
  Search 
} from "../components/icons";

export default function OrganizationPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Organization" 
        description="View organization information and manage members" 
      />

      <div className="flex-1 p-6 space-y-8 overflow-y-auto">
        <OrganizationInfo />
        <MembersList />
      </div>
    </div>
  );
}

// Organization Info Component
function OrganizationInfo() {
  const orgData = {
    name: "ORBIT Technologies Inc.",
    industry: "Technology & Software",
    size: "500-1000 employees",
    founded: "2015",
    headquarters: "Manila, Philippines",
    website: "www.orbit-tech.com",
    email: "contact@orbit-tech.com",
    phone: "+63 2 1234 5678",
    description:
      "ORBIT Technologies is a leading provider of enterprise software solutions, specializing in budget management and approval workflow systems for organizations across Southeast Asia.",
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div>
          <CardTitle className="text-white">Organization Information</CardTitle>
          <CardDescription className="text-gray-400">
            View your organization details
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-white">Organization Name</Label>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span>{orgData.name}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Industry</Label>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span>{orgData.industry}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Company Size</Label>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Users className="h-4 w-4 text-gray-400" />
              <span>{orgData.size}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Founded</Label>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span>{orgData.founded}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Headquarters</Label>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>{orgData.headquarters}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Website</Label>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span>{orgData.website}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Email</Label>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>{orgData.email}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Phone</Label>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{orgData.phone}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-white">Description</Label>
          <p className="text-sm text-gray-300">{orgData.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Members List Component
function MembersList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const members = [
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@orbit.com",
      role: "l1",
      department: "IT Department",
      position: "Team Lead",
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane.smith@orbit.com",
      role: "l2",
      department: "HR Department",
      position: "Manager",
    },
    {
      id: "3",
      name: "Mike Johnson",
      email: "mike.johnson@orbit.com",
      role: "l3",
      department: "Finance",
      position: "VP",
    },
    {
      id: "4",
      name: "Sarah Williams",
      email: "sarah.williams@orbit.com",
      role: "payroll",
      department: "Finance",
      position: "Payroll Staff",
    },
    {
      id: "5",
      name: "Robert Brown",
      email: "robert.brown@orbit.com",
      role: "requestor",
      department: "Operations",
      position: "Employee",
    },
    {
      id: "6",
      name: "Lisa Garcia",
      email: "lisa.garcia@orbit.com",
      role: "requestor",
      department: "Marketing",
      position: "Specialist",
    },
    {
      id: "7",
      name: "David Chen",
      email: "david.chen@orbit.com",
      role: "l1",
      department: "Engineering",
      position: "Senior Developer",
    },
    {
      id: "8",
      name: "Maria Rodriguez",
      email: "maria.rodriguez@orbit.com",
      role: "requestor",
      department: "Sales",
      position: "Account Manager",
    },
  ];

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

  const filteredMembers = members.filter((member) => {
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
          <div className="relative flex-1">
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
              <SelectItem value="requestor">Requestor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Members List with Scroll */}
        <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-track-slate-700 scrollbar-thumb-slate-500">
          <div className="space-y-3 pr-2">
            {filteredMembers.length > 0 ? (
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
                        <span className={`text-xs font-medium ${roleBadge.color.split(' ')[1]}`}>
                          {roleBadge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                        <span>•</span>
                        <span>{member.position}</span>
                        <span>•</span>
                        <span>{member.department}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
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