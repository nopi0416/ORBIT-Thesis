export interface AdminStats {
  totalUsers: number
  activeRoles: number
  pendingApprovals: number
  systemUptime: string
  changeFromLastPeriod: {
    totalUsers: number
    activeRoles: number
    pendingApprovals: number
  }
}

export interface UserActivity {
  id: string
  type: "user_created" | "role_assigned" | "access_modified" | "workflow_updated"
  user: string
  action: string
  timestamp: string
  status: "success" | "pending" | "failed"
}

export interface SystemMetric {
  name: string
  status: "healthy" | "warning" | "critical"
  value: string
  description: string
}

export interface QuickAction {
  id: string
  label: string
  icon: string
  description: string
}
