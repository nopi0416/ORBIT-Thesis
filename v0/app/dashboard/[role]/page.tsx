"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getSession, logout, refreshSession } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  LogOut,
  Shield,
  FileText,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Settings,
  BarChart3,
  AlertCircle,
} from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const params = useParams()
  const [session, setSession] = useState(getSession())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const currentSession = getSession()

    if (!currentSession) {
      router.push("/")
      return
    }

    // Verify role matches URL
    if (currentSession.role !== params.role) {
      router.push(`/dashboard/${currentSession.role}`)
      return
    }

    setSession(currentSession)
    setIsLoading(false)

    // Refresh session on activity
    const interval = setInterval(() => {
      refreshSession()
    }, 60000) // Every minute

    return () => clearInterval(interval)
  }, [params.role, router])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  const getRoleInfo = () => {
    switch (session.role) {
      case "requester":
        return {
          title: "Requester Dashboard",
          description: "Submit and track your budget requests",
          icon: FileText,
          color: "bg-blue-500",
          stats: [
            { label: "Pending Requests", value: "3", icon: Clock },
            { label: "Approved", value: "12", icon: CheckCircle },
            { label: "Total Budget", value: "$45,000", icon: DollarSign },
          ],
        }
      case "l1-approver":
        return {
          title: "L1 Approver Dashboard",
          description: "Review and approve Level 1 budget requests",
          icon: CheckCircle,
          color: "bg-green-500",
          stats: [
            { label: "Pending Approvals", value: "8", icon: Clock },
            { label: "Approved Today", value: "5", icon: CheckCircle },
            { label: "Total Reviewed", value: "156", icon: BarChart3 },
          ],
        }
      case "l2-approver":
        return {
          title: "L2 Approver Dashboard",
          description: "Review and approve Level 2 budget requests",
          icon: CheckCircle,
          color: "bg-emerald-500",
          stats: [
            { label: "Pending Approvals", value: "5", icon: Clock },
            { label: "Approved Today", value: "3", icon: CheckCircle },
            { label: "Total Reviewed", value: "89", icon: BarChart3 },
          ],
        }
      case "l3-approver":
        return {
          title: "L3 Approver Dashboard",
          description: "Review and approve Level 3 budget requests",
          icon: CheckCircle,
          color: "bg-teal-500",
          stats: [
            { label: "Pending Approvals", value: "2", icon: Clock },
            { label: "Approved Today", value: "1", icon: CheckCircle },
            { label: "Total Reviewed", value: "34", icon: BarChart3 },
          ],
        }
      case "payroll":
        return {
          title: "Payroll Dashboard",
          description: "Process approved budget requests and payments",
          icon: DollarSign,
          color: "bg-yellow-500",
          stats: [
            { label: "Pending Payments", value: "6", icon: Clock },
            { label: "Processed Today", value: "12", icon: CheckCircle },
            { label: "Total Amount", value: "$125,000", icon: DollarSign },
          ],
        }
      case "admin":
        return {
          title: "Administrator Dashboard",
          description: "Manage users, roles, and system settings",
          icon: Settings,
          color: "bg-purple-500",
          stats: [
            { label: "Active Users", value: "45", icon: Users },
            { label: "System Alerts", value: "2", icon: AlertCircle },
            { label: "Total Requests", value: "234", icon: BarChart3 },
          ],
        }
      default:
        return {
          title: "Dashboard",
          description: "Welcome to ORBIT",
          icon: Shield,
          color: "bg-gray-500",
          stats: [],
        }
    }
  }

  const roleInfo = getRoleInfo()
  const RoleIcon = roleInfo.icon

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#2d3b8f] to-[#e91e8c] rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">ORBIT</h1>
                <p className="text-xs text-muted-foreground">Budget Intelligence Tool</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{session.name}</p>
                <Badge variant="secondary" className="text-xs">
                  {session.role.replace("-", " ").toUpperCase()}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 bg-transparent">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 ${roleInfo.color} rounded-xl flex items-center justify-center`}>
              <RoleIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">{roleInfo.title}</h2>
              <p className="text-muted-foreground">{roleInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {roleInfo.stats.map((stat, index) => {
            const StatIcon = stat.icon
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <StatIcon className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Your Dashboard</CardTitle>
            <CardDescription>This is a demo dashboard for the {session.role.replace("-", " ")} role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">In a production environment, this dashboard would display:</p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Real-time budget request data</li>
              <li>Approval workflows and status tracking</li>
              <li>Financial reports and analytics</li>
              <li>User management and audit logs</li>
              <li>Role-specific actions and notifications</li>
            </ul>
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Your session will automatically expire after 30 minutes of inactivity for security purposes.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
