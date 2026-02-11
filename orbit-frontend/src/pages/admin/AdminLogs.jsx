"use client"

import { useEffect, useState } from "react"
import { getAdminLogs } from "../../services/userService"

export default function AdminLogs() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterAction, setFilterAction] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterDate, setFilterDate] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [logsData, setLogsData] = useState([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [logsError, setLogsError] = useState("")

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoadingLogs(true)
      setLogsError("")
      try {
        const token = localStorage.getItem('authToken')
        const data = await getAdminLogs(token)
        setLogsData(Array.isArray(data) ? data : [])
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch admin logs"
        setLogsError(errorMessage)
        setLogsData([])
      } finally {
        setIsLoadingLogs(false)
      }
    }

    loadLogs()
  }, [])

  const formatTimestamp = (value) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toISOString().replace('T', ' ').slice(0, 19)
  }

  const actionOptions = Array.from(new Set(logsData.map((log) => log.action).filter(Boolean))).sort()
  const targetTableOptions = Array.from(new Set(logsData.map((log) => log.target_table).filter(Boolean))).sort()

  const filteredLogs = logsData.filter((log) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesQuery = !query || [
      log.admin_id,
      log.action,
      log.target_table,
      log.target_id,
      log.description,
      log.created_at,
    ].some((value) => (value || "").toString().toLowerCase().includes(query))

    const matchesAction = filterAction === "all" || (log.action || "") === filterAction
    const matchesTargetTable = filterStatus === "all" || (log.target_table || "") === filterStatus

    let matchesDate = true
    if (filterDate !== "all" && log.created_at) {
      const createdAt = new Date(log.created_at)
      const now = new Date()
      if (filterDate === "today") {
        matchesDate = createdAt.toDateString() === now.toDateString()
      } else if (filterDate === "week") {
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        matchesDate = createdAt >= weekAgo
      } else if (filterDate === "month") {
        const monthAgo = new Date(now)
        monthAgo.setDate(now.getDate() - 30)
        matchesDate = createdAt >= monthAgo
      }
    }

    return matchesQuery && matchesAction && matchesTargetTable && matchesDate
  })

  const getCurrentData = () => filteredLogs
  const totalPages = Math.max(1, Math.ceil(getCurrentData().length / 10))

  const exportToCSV = () => {
    const data = getCurrentData()
    let csv = ""

    if (activeTab === "logs") {
      csv = "Created At,Admin ID,Action,Target Table,Target ID,Description\n"
      data.forEach((row) => {
        csv += `${formatTimestamp(row.created_at)},${row.admin_id},${row.action},${row.target_table},${row.target_id},${row.description}\n`
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
            <option value="all">Filter by Action</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option value="all">Filter by Table</option>
            {targetTableOptions.map((table) => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
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

      {/* Table */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          {logsError && <div className="px-6 py-3 text-sm text-red-400">{logsError}</div>}
          <table className="w-full">
            <thead className="bg-slate-800/80 sticky top-0 z-10">
              <tr className="border-b border-slate-700">
                <th className="text-left p-3.5 text-xs font-medium text-slate-300">Created At</th>
                <th className="text-left p-3.5 text-xs font-medium text-slate-300">Admin ID</th>
                <th className="text-left p-3.5 text-xs font-medium text-slate-300">Action</th>
                <th className="text-left p-3.5 text-xs font-medium text-slate-300">Target Table</th>
                <th className="text-left p-3.5 text-xs font-medium text-slate-300">Target ID</th>
                <th className="text-left p-3.5 text-xs font-medium text-slate-300">Description</th>
              </tr>
            </thead>
            <tbody>
              {getCurrentData()
                .slice((currentPage - 1) * 10, currentPage * 10)
                .map((item) => (
                  <tr
                    key={item.admin_log_id}
                    className="border-b border-slate-700/50 hover:bg-slate-800/50"
                  >
                    <td className="p-4 text-sm text-slate-300">{formatTimestamp(item.created_at)}</td>
                    <td className="p-4 text-sm text-white">{item.admin_id}</td>
                    <td className="p-4 text-sm text-slate-300">{item.action}</td>
                    <td className="p-4 text-sm text-slate-300">{item.target_table}</td>
                    <td className="p-4 text-sm text-slate-300">{item.target_id}</td>
                    <td className="p-4 text-sm text-slate-300">{item.description}</td>
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
