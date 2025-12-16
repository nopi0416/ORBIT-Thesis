/**
 * Type definitions for ORBIT Admin Dashboard
 */

export type RequestStatus = "pending" | "approved" | "rejected"

export interface Request {
  id: string
  department: string
  status: RequestStatus
  amount: number
  createdAt: Date
  description?: string
}

export interface BudgetUtilization {
  department: string
  current: number
  total: number
}

export interface DashboardStats {
  totalRequests: number
  pendingRequests: number
  approvedRequests: number
  totalAmount: number
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
}
