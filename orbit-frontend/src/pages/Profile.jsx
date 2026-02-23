import React, { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Briefcase } from "../components/icons";
import { getUserById } from "../services/budgetConfigService";

const getRoleLabel = (roles = [], fallback = "") => {
  const roleValue = String(roles?.[0] || fallback || "").toLowerCase();
  if (roleValue.includes("l1")) return "L1 Approver";
  if (roleValue.includes("l2")) return "L2 Approver";
  if (roleValue.includes("l3")) return "L3 Approver";
  if (roleValue.includes("payroll")) return "Payroll";
  if (roleValue.includes("admin")) return "Admin";
  return "Requestor";
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  const token = user?.token || localStorage.getItem("authToken") || "";

  useEffect(() => {
    let active = true;

    const fetchProfile = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const data = await getUserById(user.id, token);
        if (!active) return;
        setProfile(data || null);
      } catch (error) {
        if (!active) return;
        console.error("[ProfilePage] Failed to load profile:", error);
        setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      active = false;
    };
  }, [user?.id, token]);

  const fullName = useMemo(() => {
    const first = profile?.first_name || user?.firstName || "";
    const last = profile?.last_name || user?.lastName || "";
    const combined = `${first} ${last}`.trim();
    return combined || user?.name || "User";
  }, [profile, user]);

  const initials = useMemo(() => {
    const parts = String(fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    return parts.map((part) => part[0]).join("").toUpperCase() || "U";
  }, [fullName]);

  const roleLabel = useMemo(() => {
    const roleFromProfile = (profile?.tbluserroles || [])
      .filter((entry) => entry?.is_active !== false)
      .map((entry) => {
        const roleObj = Array.isArray(entry?.tblroles) ? entry.tblroles[0] : entry?.tblroles;
        return roleObj?.role_name;
      })
      .filter(Boolean);

    return getRoleLabel(roleFromProfile, user?.role);
  }, [profile, user?.role]);

  const email = profile?.email || user?.email || "—";
  const department = profile?.department || profile?.org_name || "—";

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Profile"
        description="Your account details"
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl font-bold bg-pink-500 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold text-white">{fullName}</h2>
                  <p className="mt-1 text-xs text-gray-400">Role: {roleLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Profile Information</CardTitle>
              <CardDescription className="text-gray-400">
                {loading ? "Loading latest data..." : "Fetched from database"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white">Full Name</Label>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{fullName}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Email Address</Label>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{email}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Role</Label>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <span>{roleLabel}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Department</Label>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <span>{department}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}