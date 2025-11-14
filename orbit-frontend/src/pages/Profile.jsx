import React, { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { useAuth } from "../context/AuthContext";
import { 
  User, 
  Mail, 
  Briefcase, 
  Calendar, 
  Edit, 
  Save, 
  X 
} from "../components/icons";

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "+63 917 123 4567",
    department: "IT Department",
    position:
      user?.role === "l1"
        ? "Team Lead"
        : user?.role === "l2"
          ? "Manager"
          : user?.role === "l3"
            ? "VP"
            : user?.role === "payroll"
              ? "Payroll Staff"
              : "Employee",
    joinDate: "January 15, 2022",
  });

  const handleSave = () => {
    setIsEditing(false);
    alert("Profile updated successfully!");
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case "l1":
        return "bg-blue-500";
      case "l2":
        return "bg-purple-500";
      case "l3":
        return "bg-orange-500";
      case "payroll":
        return "bg-green-500";
      default:
        return "bg-pink-500";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Profile" 
        description="Manage your personal information and settings" 
      />

      <div className="flex-1 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Profile Header Card */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className={`text-2xl font-bold ${getRoleBadgeColor()} text-white`}>
                      {getInitials(formData.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{formData.name}</h2>
                    <p className="text-sm text-gray-400">{formData.position}</p>
                    <p className="mt-1 text-xs text-gray-400 capitalize">
                      Role:{" "}
                      {user?.role === "l1"
                        ? "L1 Approver"
                        : user?.role === "l2"
                          ? "L2 Approver"
                          : user?.role === "l3"
                            ? "L3 Approver"
                            : user?.role === "payroll"
                              ? "Payroll Staff"
                              : "Requestor"}
                    </p>
                  </div>
                </div>
                {!isEditing ? (
                  <Button 
                    onClick={() => setIsEditing(true)} 
                    variant="outline"
                    className="border-slate-600 text-white hover:bg-slate-700"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    <Button 
                      onClick={handleCancel} 
                      variant="outline" 
                      size="sm"
                      className="border-slate-600 text-white hover:bg-slate-700"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Personal Information</CardTitle>
              <CardDescription className="text-gray-400">
                Your basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{formData.name}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email Address</Label>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{formData.email}</span>
                  </div>
                  <p className="text-xs text-gray-400">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span>{formData.phone}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-white">Department</Label>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <span>{formData.department}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="text-white">Position</Label>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <span>{formData.position}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="joinDate" className="text-white">Join Date</Label>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formData.joinDate}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Statistics */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Account Activity</CardTitle>
              <CardDescription className="text-gray-400">
                Your activity summary in ORBIT
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-slate-600 bg-slate-700/30 p-4">
                  <p className="text-sm text-gray-400">Total Requests</p>
                  <p className="text-2xl font-bold text-white">24</p>
                  <p className="text-xs text-gray-400">Last 30 days</p>
                </div>
                <div className="rounded-lg border border-slate-600 bg-slate-700/30 p-4">
                  <p className="text-sm text-gray-400">Approved</p>
                  <p className="text-2xl font-bold text-green-400">18</p>
                  <p className="text-xs text-gray-400">Success rate: 75%</p>
                </div>
                <div className="rounded-lg border border-slate-600 bg-slate-700/30 p-4">
                  <p className="text-sm text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-400">6</p>
                  <p className="text-xs text-gray-400">Awaiting approval</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}