import { useState } from "react"
import { Users, Shield, Clock, Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import AdminHeader from "../components/AdminHeader"
import AdminStatCard from "../components/AdminStatCard"
import AdminActivityItem from "../components/AdminActivityItem"

export default function AdminDashboard() {
  const stats = [
    { title: "Total Users", value: "156", change: "+12 from last month", icon: <Users size={20} /> },
    { title: "Active Roles", value: "8", change: "+1 new role", icon: <Shield size={20} /> },
    { title: "Pending Approvals", value: "12", change: "3 urgent", icon: <Clock size={20} /> },
    { title: "System Uptime", value: "99.8%", change: "Last 30 days", icon: <Activity size={20} /> },
  ]

  const recentActivities = [
    {
      id: "1",
      type: "user_created",
      user: "Sarah Johnson",
      action: "New user account created",
      timestamp: "2 minutes ago",
      status: "success",
    },
    {
      id: "2",
      type: "role_assigned",
      user: "Michael Chen",
      action: "Assigned Budget Manager role",
      timestamp: "15 minutes ago",
      status: "success",
    },
    {
      id: "3",
      type: "access_modified",
      user: "Emily Rodriguez",
      action: "Access permissions updated",
      timestamp: "1 hour ago",
      status: "pending",
    },
    {
      id: "4",
      type: "workflow_updated",
      user: "David Kim",
      action: "Approval workflow modified",
      timestamp: "2 hours ago",
      status: "success",
    },
    {
      id: "5",
      type: "user_created",
      user: "Lisa Anderson",
      action: "New user registration pending",
      timestamp: "3 hours ago",
      status: "pending",
    },
  ]

  const pendingRoleRequests = [
    {
      id: "1",
      userName: "Alex Thompson",
      requestedRole: "Budget Manager",
      department: "Finance",
      requestDate: "2 hours ago",
      priority: "high",
    },
    {
      id: "2",
      userName: "Maria Garcia",
      requestedRole: "Department Head",
      department: "HR",
      requestDate: "5 hours ago",
      priority: "medium",
    },
    {
      id: "3",
      userName: "James Wilson",
      requestedRole: "Approver",
      department: "Operations",
      requestDate: "1 day ago",
      priority: "low",
    },
    {
      id: "4",
      userName: "Sophie Chen",
      requestedRole: "Requestor",
      department: "Marketing",
      requestDate: "1 day ago",
      priority: "low",
    },
  ]

  const auditLogSummary = [
    {
      id: "1",
      event: "Failed Login Attempt",
      user: "unknown@example.com",
      timestamp: "5 minutes ago",
      severity: "warning",
      details: "3 consecutive failures",
    },
    {
      id: "2",
      event: "Role Permission Changed",
      user: "Admin User",
      timestamp: "1 hour ago",
      severity: "info",
      details: "Budget Manager permissions updated",
    },
    {
      id: "3",
      event: "Database Backup Completed",
      user: "System",
      timestamp: "2 hours ago",
      severity: "success",
      details: "Automated backup successful",
    },
    {
      id: "4",
      event: "Workflow Configuration Modified",
      user: "Admin User",
      timestamp: "3 hours ago",
      severity: "info",
      details: "Approval hierarchy updated",
    },
    {
      id: "5",
      event: "Unauthorized Access Blocked",
      user: "192.168.1.45",
      timestamp: "4 hours ago",
      severity: "critical",
      details: "IP blocked for 24 hours",
    },
  ]

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "text-red-400 bg-red-500/10 border-red-500/30"
      case "medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
      case "low":
        return "text-cyan-400 bg-cyan-500/10 border-cyan-500/30"
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/30"
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "critical":
        return <XCircle size={16} className="text-red-400" />
      case "warning":
        return <AlertTriangle size={16} className="text-yellow-400" />
      case "success":
        return <CheckCircle size={16} className="text-green-400" />
      default:
        return <Activity size={16} className="text-cyan-400" />
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <AdminHeader />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <AdminStatCard key={index} title={stat.title} value={stat.value} change={stat.change} icon={stat.icon} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Recent User Activity */}
        <div className="lg:col-span-2 bg-slate-900/80 rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-white font-semibold text-lg mb-4">Recent User Activity</h2>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <AdminActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>

        {/* Pending Role Requests */}
        <div className="bg-slate-900/80 rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-white font-semibold text-lg mb-4">Pending Role Requests</h2>
          <div className="space-y-3">
            {pendingRoleRequests.map((request) => (
              <div
                key={request.id}
                className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30 hover:border-fuchsia-500/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium text-sm">{request.userName}</p>
                    <p className="text-slate-400 text-xs">{request.department}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(request.priority)}`}>
                    {request.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={14} className="text-fuchsia-400" />
                  <p className="text-slate-300 text-sm">{request.requestedRole}</p>
                </div>
                <p className="text-slate-500 text-xs">{request.requestDate}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Summary */}
      <div className="bg-slate-900/80 rounded-xl p-6 border border-slate-700/50">
        <h2 className="text-white font-semibold text-lg mb-4">Audit Log Summary</h2>
        <div className="space-y-3">
          {auditLogSummary.map((log) => (
            <div
              key={log.id}
              className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30 hover:border-fuchsia-500/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">{getSeverityIcon(log.severity)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-medium text-sm">{log.event}</p>
                      <span className="text-slate-500 text-xs">{log.timestamp}</span>
                    </div>
                    <p className="text-slate-400 text-xs mb-1">User: {log.user}</p>
                    <p className="text-slate-500 text-xs">{log.details}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
