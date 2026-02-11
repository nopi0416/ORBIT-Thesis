import { useEffect, useMemo, useState } from "react"
import { getAdminLogs, getAllUsers } from "../services/userService"
import { useAuth } from "../context/AuthContext"

export default function AdminDashboard() {
  const { user } = useAuth()
  const [totalUsers, setTotalUsers] = useState(0)
  const [activeUsers, setActiveUsers] = useState(0)
  const [recentAdminActivity, setRecentAdminActivity] = useState([])

  const adminName = user?.name || user?.email || "Admin"

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const token = localStorage.getItem('authToken')
        const users = await getAllUsers(token)
        const nonAdminUsers = users.filter((item) => item.userType !== 'admin')
        const activeCount = nonAdminUsers.filter((item) => {
          const statusValue = (item.status || "").toString().toLowerCase()
          return statusValue === "active" || statusValue === "first-time" || statusValue === "first_time"
        }).length

        setTotalUsers(nonAdminUsers.length)
        setActiveUsers(activeCount)
      } catch (error) {
        setTotalUsers(0)
        setActiveUsers(0)
      }
    }

    loadMetrics()
  }, [])

  useEffect(() => {
    const loadAdminActivity = async () => {
      try {
        const token = localStorage.getItem('authToken')
        const logs = await getAdminLogs(token)
        const items = (Array.isArray(logs) ? logs : []).slice(0, 8).map((log) => ({
          id: log.admin_log_id,
          user: log.tbladminusers?.full_name || log.admin_id || "Admin",
          action: log.description || log.action || "Activity",
          time: log.created_at,
        }))
        setRecentAdminActivity(items)
      } catch (error) {
        setRecentAdminActivity([])
      }
    }

    loadAdminActivity()
  }, [])

  const timeAgo = (value) => {
    if (!value) return ""
    const timestamp = new Date(value)
    if (Number.isNaN(timestamp.getTime())) return value
    const diffMs = Date.now() - timestamp.getTime()
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  }

  const activityItems = useMemo(() => {
    return recentAdminActivity.map((activity) => ({
      ...activity,
      time: timeAgo(activity.time),
    }))
  }, [recentAdminActivity])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome back, {adminName}</h1>
            <p className="text-sm text-white/80">Your Administrator dashboard</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Total Users</p>
                <p className="text-2xl font-bold text-white">{totalUsers}</p>
                <p className="text-xs text-slate-400 mt-1">Whole app</p>
              </div>
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Active Users</p>
                <p className="text-2xl font-bold text-white">{activeUsers}</p>
                <p className="text-xs text-slate-400 mt-1">Active or first-time</p>
              </div>
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-6 pb-4 grid grid-cols-1 gap-4 overflow-hidden">
        {/* Recent Admin Activity */}
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white">Recent Admin Activity</h3>
            <p className="text-xs text-slate-400 mt-1">Latest admin actions in the system</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activityItems.length === 0 ? (
              <div className="text-xs text-slate-400">No recent admin activity.</div>
            ) : activityItems.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 bg-slate-700/50 rounded border border-slate-600 hover:border-fuchsia-500/50 transition-colors"
              >
                <div className="w-2 h-2 rounded-full mt-1.5 bg-fuchsia-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white">{activity.user}</p>
                  <p className="text-xs text-slate-400">{activity.action}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
