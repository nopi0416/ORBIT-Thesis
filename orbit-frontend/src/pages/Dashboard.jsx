import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  Users,
  ArrowUpRight,
  Settings,
  Download,
  BarChart,
  Bell,
} from '../components/icons';

export default function DashboardPage() {
  const { user } = useAuth();
  const userRole = user?.role || "requestor";

  const getStatsForRole = () => {
    switch (userRole) {
      case "requestor":
        return [
          {
            title: "My Requests",
            value: "8",
            change: "+2 from last period",
            changeType: "positive",
            icon: <FileText className="h-4 w-4" />,
            iconColor: "text-blue-400",
            bgColor: "bg-slate-800",
            borderColor: "border-blue-500",
          },
          {
            title: "Pending",
            value: "3",
            change: "+1 from last period",
            changeType: "neutral",
            icon: <Clock className="h-4 w-4" />,
            iconColor: "text-yellow-400",
            bgColor: "bg-slate-800",
            borderColor: "border-yellow-500",
          },
          {
            title: "Approved",
            value: "4",
            change: "+1 from last period",
            changeType: "positive",
            icon: <CheckCircle2 className="h-4 w-4" />,
            iconColor: "text-blue-400",
            bgColor: "bg-slate-800",
            borderColor: "border-blue-500",
          },
          {
            title: "Total Amount",
            value: "₱12,400",
            change: "+₱2,500 from last period",
            changeType: "positive",
            icon: <DollarSign className="h-4 w-4" />,
            iconColor: "text-green-400",
            bgColor: "bg-slate-800",
            borderColor: "border-green-500",
          },
        ];
      case "l1":
      case "l2":
      case "l3":
        return [
          {
            title: "Pending Approvals",
            value: "12",
            change: "+3 from last period",
            changeType: "neutral",
            icon: <Clock className="h-4 w-4" />,
            iconColor: "text-yellow-400",
            bgColor: "bg-slate-800",
            borderColor: "border-yellow-500",
          },
          {
            title: "Approved",
            value: "48",
            change: "+12 from last period",
            changeType: "positive",
            icon: <CheckCircle2 className="h-4 w-4" />,
            iconColor: "text-blue-400",
            bgColor: "bg-slate-800",
            borderColor: "border-blue-500",
          },
          {
            title: "Rejected",
            value: "3",
            change: "-1 from last period",
            changeType: "positive",
            icon: <XCircle className="h-4 w-4" />,
            iconColor: "text-red-400",
            bgColor: "bg-slate-800",
            borderColor: "border-red-500",
          },
          {
            title: "Total Budget",
            value: "₱124,500",
            change: "+₱15,000 from last period",
            changeType: "positive",
            icon: <DollarSign className="h-4 w-4" />,
            iconColor: "text-green-400",
            bgColor: "bg-slate-800",
            borderColor: "border-green-500",
          },
        ];
      case "payroll":
        return [
          {
            title: "To Process",
            value: "15",
            change: "+5 from last period",
            changeType: "neutral",
            icon: <Clock className="h-4 w-4" />,
            iconColor: "text-yellow-400",
            bgColor: "bg-slate-800",
            borderColor: "border-yellow-500",
          },
          {
            title: "Completed",
            value: "89",
            change: "+23 from last period",
            changeType: "positive",
            icon: <CheckCircle2 className="h-4 w-4" />,
            iconColor: "text-blue-400",
            bgColor: "bg-slate-800",
            borderColor: "border-blue-500",
          },
          {
            title: "Cancelled",
            value: "2",
            change: "0 from last period",
            changeType: "neutral",
            icon: <XCircle className="h-4 w-4" />,
            iconColor: "text-red-400",
            bgColor: "bg-slate-800",
            borderColor: "border-red-500",
          },
          {
            title: "Total Processed",
            value: "₱245,800",
            change: "+₱45,000 from last period",
            changeType: "positive",
            icon: <DollarSign className="h-4 w-4" />,
            iconColor: "text-green-400",
            bgColor: "bg-slate-800",
            borderColor: "border-green-500",
          },
        ];
      default:
        return [];
    }
  };

  const stats = getStatsForRole();

  const recentRequests = [
    {
      id: "REQ-2024-001",
      status: "pending",
      amount: "₱2,500",
      department: "IT Department",
      date: "2 hours ago",
    },
    {
      id: "REQ-2024-002",
      status: "approved",
      amount: "₱1,800",
      department: "HR Department",
      date: "5 hours ago",
    },
    { 
      id: "REQ-2024-003", 
      status: "pending", 
      amount: "₱3,200", 
      department: "Marketing", 
      date: "1 day ago" 
    },
    { 
      id: "REQ-2024-004", 
      status: "approved", 
      amount: "₱950", 
      department: "Operations", 
      date: "2 days ago" 
    },
  ];

  const budgetData = [
    { department: "IT Department", used: 75000, total: 100000, color: "bg-blue-600" },
    { department: "HR Department", used: 48000, total: 80000, color: "bg-green-600" },
    { department: "Marketing", used: 54000, total: 120000, color: "bg-yellow-500" },
    { department: "Operations", used: 76500, total: 90000, color: "bg-purple-600" },
  ];

  const getRoleDisplayName = (role) => {
    switch (role) {
      case "l1": return "L1 Approver";
      case "l2": return "L2 Approver";
      case "l3": return "L3 Approver";
      case "payroll": return "Payroll Staff";
      default: return "Requestor";
    }
  };

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name || "User"}`}
        description={`Your ${getRoleDisplayName(userRole)} dashboard`}
      />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <RecentRequests
            requests={recentRequests}
            title={userRole === "requestor" ? "My Recent Requests" : "Recent Requests"}
          />
          <BudgetUtilization budgets={budgetData} />
        </div>

        {/* Analytics and Notifications Section */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Analytics />
          </div>
          <div className="lg:col-span-2">
            <Notifications />
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({ title, value, change, changeType = "neutral", icon, iconColor, bgColor, borderColor }) {
  return (
    <Card className={cn("border-l-4", bgColor, borderColor)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
        <div className={cn("h-4 w-4", iconColor)}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {change && (
          <p className="text-xs text-gray-400 mt-1">
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Recent Requests Component
function RecentRequests({ requests, title }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-orange-500";
      case "approved":
        return "bg-blue-500";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="bg-slate-800">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">{request.id}</p>
                <p className="text-xs text-gray-400">{request.department}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white",
                    getStatusColor(request.status)
                  )}
                >
                  {request.status}
                </span>
                <p className="text-sm font-medium text-white">{request.amount}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Budget Utilization Component
function BudgetUtilization({ budgets }) {
  return (
    <Card className="bg-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Budget Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {budgets.map((budget) => {
            const percentage = (budget.used / budget.total) * 100;
            return (
              <div key={budget.department} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white">{budget.department}</span>
                  <span className="text-gray-400">
                    ₱{budget.used.toLocaleString()} / ₱{budget.total.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Analytics Component with Bar Chart
function Analytics() {
  const monthlyData = [
    { year: '2020', itDepartment: 35, hrDepartment: 25 },
    { year: '2021', itDepartment: 40, hrDepartment: 43 },
    { year: '2022', itDepartment: 25, hrDepartment: 28 },
    { year: '2023', itDepartment: 30, hrDepartment: 40 },
    { year: '2024', itDepartment: 43, hrDepartment: 22 },
  ];

  const maxValue = 45; // Fixed max value to match the scale
  const chartHeight = 180; // Reduced chart height to fit properly

  return (
    <Card className="bg-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          Budget Analysis by Department
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="relative">
          {/* Chart Container */}
          <div className="relative mb-6" style={{ height: `${chartHeight + 40}px` }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 flex flex-col justify-between text-xs text-gray-400" style={{ height: `${chartHeight}px` }}>
              <span>45</span>
              <span>40</span>
              <span>35</span>
              <span>30</span>
              <span>25</span>
              <span>20</span>
              <span>15</span>
              <span>10</span>
              <span>5</span>
              <span>0</span>
            </div>
            
            {/* Chart area with bars */}
            <div className="ml-8 flex items-end justify-between gap-3" style={{ height: `${chartHeight}px` }}>
              {monthlyData.map((data, index) => (
                <div key={data.year} className="flex items-end justify-center gap-1" style={{ width: '50px' }}>
                  {/* IT Department bar */}
                  <div className="w-5 flex items-end">
                    <div
                      className="bg-red-500 w-full min-h-[2px]"
                      style={{ 
                        height: `${(data.itDepartment / maxValue) * chartHeight}px`,
                      }}
                    />
                  </div>
                  {/* HR Department bar */}
                  <div className="w-5 flex items-end">
                    <div
                      className="bg-blue-500 w-full min-h-[2px]"
                      style={{ 
                        height: `${(data.hrDepartment / maxValue) * chartHeight}px`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {/* X-axis labels */}
            <div className="absolute ml-8 flex justify-between gap-3" style={{ top: `${chartHeight + 5}px`, width: 'calc(100% - 32px)' }}>
              {monthlyData.map((data) => (
                <div key={data.year} className="text-center" style={{ width: '50px' }}>
                  <span className="text-blue-400 font-bold text-sm">{data.year}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex justify-center gap-6 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500"></div>
              <span className="text-gray-300 text-xs">IT Department</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500"></div>
              <span className="text-gray-300 text-xs">HR Department</span>
            </div>
          </div>
          
          {/* X-axis label */}
          <div className="text-center mb-2">
            <span className="text-red-500 font-bold text-xs">Years →</span>
          </div>
          
          {/* Scale info */}
          <div className="text-right">
            <span className="text-gray-500 text-xs">Scale: 1 unit length = 5k budget</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Notifications Component
function Notifications() {
  const notifications = [
    {
      id: 1,
      type: 'approval',
      title: 'Budget Request Approved',
      message: 'Your request REQ-2024-001 has been approved by L2 Approver',
      time: '2 hours ago',
      unread: true,
    },
    {
      id: 2,
      type: 'warning',
      title: 'Budget Limit Warning',
      message: 'IT Department has reached 85% of monthly budget',
      time: '4 hours ago',
      unread: true,
    },
    {
      id: 3,
      type: 'info',
      title: 'New Budget Configuration',
      message: 'Q4 budget configuration is now available for review',
      time: '1 day ago',
      unread: false,
    },
    {
      id: 4,
      type: 'approval',
      title: 'Request Submitted',
      message: 'REQ-2024-004 has been submitted for L1 approval',
      time: '2 days ago',
      unread: false,
    },
    {
      id: 5,
      type: 'info',
      title: 'Monthly Report Generated',
      message: 'September budget report is ready for download',
      time: '3 days ago',
      unread: false,
    },
  ];

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'approval':
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'info':
        return <Bell className="h-4 w-4 text-blue-400" />;
      default:
        return <Bell className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="bg-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </div>
          <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
            {notifications.filter(n => n.unread).length} new
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "flex gap-3 p-3 rounded-lg transition-colors hover:bg-slate-700",
                notification.unread ? "bg-slate-700/50" : "bg-transparent"
              )}
            >
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <h4 className={cn(
                    "text-sm font-medium",
                    notification.unread ? "text-white" : "text-gray-300"
                  )}>
                    {notification.title}
                  </h4>
                  {notification.unread && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}