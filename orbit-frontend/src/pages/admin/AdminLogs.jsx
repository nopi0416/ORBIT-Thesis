"use client"

import { useState } from "react"

export default function AdminLogs() {
  const [activeTab, setActiveTab] = useState("logs")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterAction, setFilterAction] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterDate, setFilterDate] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [hiddenPasswords, setHiddenPasswords] = useState({})

  const logs = [
    {
      id: 1,
      timestamp: "2024-01-15 14:32:15",
      user: "admin@orbit.com",
      action: "User Created",
      target: "john.doe@orbit.com",
      ipAddress: "192.168.1.100",
      status: "Success",
    },
    {
      id: 2,
      timestamp: "2024-01-15 14:28:42",
      user: "admin@orbit.com",
      action: "Role Assigned",
      target: "jane.smith@orbit.com",
      ipAddress: "192.168.1.100",
      status: "Success",
    },
    {
      id: 3,
      timestamp: "2024-01-15 14:15:33",
      user: "admin@orbit.com",
      action: "User Deactivated",
      target: "bob.johnson@orbit.com",
      ipAddress: "192.168.1.100",
      status: "Success",
    },
    {
      id: 4,
      timestamp: "2024-01-15 13:45:21",
      user: "admin@orbit.com",
      action: "Password Reset",
      target: "alice.williams@orbit.com",
      ipAddress: "192.168.1.100",
      status: "Success",
    },
    {
      id: 5,
      timestamp: "2024-01-15 13:22:18",
      user: "admin@orbit.com",
      action: "Login Attempt",
      target: "System",
      ipAddress: "192.168.1.105",
      status: "Failed",
    },
    {
      id: 6,
      timestamp: "2024-01-15 12:58:09",
      user: "admin@orbit.com",
      action: "OU Modified",
      target: "IT Department",
      ipAddress: "192.168.1.100",
      status: "Success",
    },
    {
      id: 7,
      timestamp: "2024-01-15 12:35:44",
      user: "admin@orbit.com",
      action: "Access Modified",
      target: "charlie.brown@orbit.com",
      ipAddress: "192.168.1.100",
      status: "Success",
    },
    {
      id: 8,
      timestamp: "2024-01-15 11:42:33",
      user: "admin@orbit.com",
      action: "User Unlocked",
      target: "david.lee@orbit.com",
      ipAddress: "192.168.1.100",
      status: "Success",
    },
    {
      id: 9,
      timestamp: "2024-01-15 11:15:27",
      user: "admin@orbit.com",
      action: "Security Alert",
      target: "Multiple Failed Logins",
      ipAddress: "192.168.1.200",
      status: "Warning",
    },
    {
      id: 10,
      timestamp: "2024-01-15 10:48:12",
      user: "admin@orbit.com",
      action: "Database Backup",
      target: "System",
      ipAddress: "192.168.1.100",
      status: "Success",
    },
  ]

  const tickets = [
    {
      id: 1,
      timestamp: "2024-01-15 14:32:15",
      email: "john.doe@orbit.com",
      name: "John Doe",
      newPassword: "Orbit2025001",
    },
    {
      id: 2,
      timestamp: "2024-01-15 13:45:21",
      email: "alice.williams@orbit.com",
      name: "Alice Williams",
      newPassword: "Orbit2025002",
    },
    {
      id: 3,
      timestamp: "2024-01-15 12:18:45",
      email: "emma.davis@orbit.com",
      name: "Emma Davis",
      newPassword: "Orbit2025003",
    },
    {
      id: 4,
      timestamp: "2024-01-14 16:22:33",
      email: "frank.miller@orbit.com",
      name: "Frank Miller",
      newPassword: "Orbit2025004",
    },
    {
      id: 5,
      timestamp: "2024-01-14 14:55:12",
      email: "grace.taylor@orbit.com",
      name: "Grace Taylor",
      newPassword: "Orbit2025005",
    },
  ]

  const getCurrentData = () => (activeTab === "logs" ? logs : tickets)
  const totalPages = Math.ceil(getCurrentData().length / 10)

  const togglePasswordVisibility = (id) => {
    setHiddenPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const exportToCSV = () => {
    const data = getCurrentData()
    let csv = ""

    if (activeTab === "logs") {
      csv = "Timestamp,User,Action,Target,IP Address,Status\n"
      data.forEach((row) => {
        csv += `${row.timestamp},${row.user},${row.action},${row.target},${row.ipAddress},${row.status}\n`
      })
    } else {
      csv = "Timestamp,Email,Name,New Password\n"
      data.forEach((row) => {
        csv += `${row.timestamp},${row.email},${row.name},${row.newPassword}\n`
      })
    }

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${activeTab}_export_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Logs</h1>
            <p className="text-sm text-white/80">Monitor system activity and changes</p>
          </div>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-white text-fuchsia-600 rounded-lg font-medium hover:bg-white/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option value="all">Filter by Actions</option>
            <option value="user_created">User Created</option>
            <option value="role_assigned">Role Assigned</option>
            <option value="password_reset">Password Reset</option>
            <option value="user_deactivated">User Deactivated</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option value="all">Filter by Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="warning">Warning</option>
          </select>
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option value="all">Filter by Date</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-slate-700">
        <div className="flex gap-1">
          {[
            { id: "logs", label: "Logs" },
            { id: "tickets", label: "Tickets" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setCurrentPage(1)
              }}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? "text-fuchsia-400" : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fuchsia-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-800/80 sticky top-0 z-10">
              <tr className="border-b border-slate-700">
                {activeTab === "logs" ? (
                  <>
                    <th className="text-left p-3.5 text-xs font-medium text-slate-300">Timestamp</th>
                    <th className="text-left p-3.5 text-xs font-medium text-slate-300">User</th>
                    <th className="text-left p-3.5 text-xs font-medium text-slate-300">Action</th>
                    <th className="text-left p-3.5 text-xs font-medium text-slate-300">Target</th>
                    <th className="text-left p-3.5 text-xs font-medium text-slate-300">IP Address</th>
                    <th className="text-left p-3.5 text-xs font-medium text-slate-300">Status</th>
                  </>
                ) : (
                  <>
                    <th className="text-left p-3.5 text-xs font-medium text-slate-300">Timestamp</th>
                    <th className="text-left p-3.5 text-xs font-medium text-slate-300">Email</th>
                    <th className="text-left p-3.5 text-xs font-medium text-slate-300">Name</th>
                    <th className="text-left p-3.5 text-xs font-medium text-slate-300">New Password</th>
                    <th className="text-right p-3.5 text-xs font-medium text-slate-300">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {getCurrentData()
                .slice((currentPage - 1) * 10, currentPage * 10)
                .map((item) => (
                  <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                    <td className="p-4 text-sm text-slate-300">{item.timestamp}</td>
                    {activeTab === "logs" ? (
                      <>
                        <td className="p-4 text-sm text-white">{item.user}</td>
                        <td className="p-4 text-sm text-slate-300">{item.action}</td>
                        <td className="p-4 text-sm text-slate-300">{item.target}</td>
                        <td className="p-4 text-sm text-slate-300">{item.ipAddress}</td>
                        <td className="p-4">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              item.status === "Success"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : item.status === "Failed"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 text-sm text-white">{item.email}</td>
                        <td className="p-4 text-sm text-slate-300">{item.name}</td>
                        <td className="p-4 text-sm text-slate-300 font-mono">
                          {hiddenPasswords[item.id] ? item.newPassword : "••••••••••"}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => togglePasswordVisibility(item.id)}
                            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                            title={hiddenPasswords[item.id] ? "Hide password" : "Show password"}
                          >
                            {hiddenPasswords[item.id] ? (
                              <svg
                                className="w-4 h-4 text-slate-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-4 h-4 text-slate-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7m0 0L21 21"
                                />
                              </svg>
                            )}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-slate-700 px-6 py-3 flex items-center justify-between bg-slate-800/50">
          <span className="text-sm text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
