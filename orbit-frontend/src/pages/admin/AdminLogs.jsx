"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { getAdminLogs, getLoginLogs } from "../../services/userService"
import { Popover, PopoverTrigger, PopoverContent } from "../../components/ui"

export default function AdminLogs() {
  const [activeTab, setActiveTab] = useState("admin")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterAction, setFilterAction] = useState("all")
  const [filterTable, setFilterTable] = useState("all")
  const [filterLoginStatus, setFilterLoginStatus] = useState("all")
  const [filterUserType, setFilterUserType] = useState("all")
  const [rangeStartDate, setRangeStartDate] = useState("")
  const [rangeEndDate, setRangeEndDate] = useState("")
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "none" })
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [logsData, setLogsData] = useState([])
  const [loginLogsData, setLoginLogsData] = useState([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [logsError, setLogsError] = useState("")
  const tableScrollRef = useRef(null)

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoadingLogs(true)
      setLogsError("")
      try {
        const token = localStorage.getItem('authToken')
        const [adminData, loginData] = await Promise.all([
          getAdminLogs(token),
          getLoginLogs(token),
        ])
        setLogsData(Array.isArray(adminData) ? adminData : [])
        setLoginLogsData(Array.isArray(loginData) ? loginData : [])
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch admin logs"
        setLogsError(errorMessage)
        setLogsData([])
        setLoginLogsData([])
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

  const toDateInputValue = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toISOString().slice(0, 10)
  }

  const isDateInRange = (value) => {
    if (!value) return false
    const inputDate = new Date(value)
    if (Number.isNaN(inputDate.getTime())) return false
    const normalizedDate = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate())

    const normalizedValue = toDateInputValue(normalizedDate)

    if (!rangeStartDate && !rangeEndDate) return true

    if (rangeStartDate && rangeEndDate) {
      return normalizedValue >= rangeStartDate && normalizedValue <= rangeEndDate
    }

    if (rangeStartDate) {
      return normalizedValue === rangeStartDate
    }

    return normalizedValue === rangeEndDate
  }

  const actionOptions = Array.from(new Set(logsData.map((log) => log.action).filter(Boolean))).sort()
  const targetTableOptions = Array.from(new Set(logsData.map((log) => log.target_table).filter(Boolean))).sort()
  const loginStatusOptions = Array.from(new Set(loginLogsData.map((log) => log.login_status).filter(Boolean))).sort()
  const userTypeOptions = Array.from(new Set(loginLogsData.map((log) => log.user_type).filter(Boolean))).sort()

  const filteredAdminLogs = logsData.filter((log) => {
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
    const matchesTargetTable = filterTable === "all" || (log.target_table || "") === filterTable
    const matchesDate = isDateInRange(log.created_at)

    return matchesQuery && matchesAction && matchesTargetTable && matchesDate
  })

  const filteredLoginLogs = loginLogsData.filter((log) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesQuery = !query || [
      log.email,
      log.user_id,
      log.login_status,
      log.user_type,
      log.ip_address,
      log.user_agent,
      log.logged_at,
    ].some((value) => (value || "").toString().toLowerCase().includes(query))

    const matchesStatus = filterLoginStatus === "all" || (log.login_status || "") === filterLoginStatus
    const matchesUserType = filterUserType === "all" || (log.user_type || "") === filterUserType
    const matchesDate = isDateInRange(log.logged_at)

    return matchesQuery && matchesStatus && matchesUserType && matchesDate
  })

  const getSortableValue = (item, key) => {
    const value = item?.[key]

    if (key === "created_at" || key === "logged_at") {
      const timestamp = new Date(value || "").getTime()
      return Number.isNaN(timestamp) ? 0 : timestamp
    }

    return (value || "").toString().toLowerCase()
  }

  const sortLogs = (items) => {
    if (!sortConfig.key || sortConfig.direction === "none") return items

    const sorted = [...items].sort((left, right) => {
      const leftValue = getSortableValue(left, sortConfig.key)
      const rightValue = getSortableValue(right, sortConfig.key)

      if (leftValue < rightValue) return sortConfig.direction === "asc" ? -1 : 1
      if (leftValue > rightValue) return sortConfig.direction === "asc" ? 1 : -1
      return 0
    })

    return sorted
  }

  const sortedAdminLogs = useMemo(() => sortLogs(filteredAdminLogs), [filteredAdminLogs, sortConfig])
  const sortedLoginLogs = useMemo(() => sortLogs(filteredLoginLogs), [filteredLoginLogs, sortConfig])

  const activeLogs = activeTab === "admin" ? sortedAdminLogs : sortedLoginLogs
  const effectivePageSize = rowsPerPage === "all" ? Math.max(activeLogs.length, 1) : rowsPerPage
  const totalPages = rowsPerPage === "all" ? 1 : Math.max(1, Math.ceil(activeLogs.length / effectivePageSize))

  const paginatedLogs = useMemo(() => {
    const pageStart = rowsPerPage === "all" ? 0 : (currentPage - 1) * effectivePageSize
    const pageEnd = rowsPerPage === "all" ? activeLogs.length : currentPage * effectivePageSize
    return activeLogs.slice(pageStart, pageEnd)
  }, [activeLogs, currentPage, rowsPerPage, effectivePageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, filterAction, filterTable, filterLoginStatus, filterUserType, rangeStartDate, rangeEndDate, rowsPerPage, sortConfig])

  useEffect(() => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTop = 0
    }
  }, [currentPage])

  useEffect(() => {
    setSortConfig({ key: null, direction: "none" })
  }, [activeTab])

  const getDateRangeLabel = () => {
    if (rangeStartDate && rangeEndDate) return `${rangeStartDate}_to_${rangeEndDate}`
    if (rangeStartDate) return rangeStartDate
    if (rangeEndDate) return rangeEndDate
    return "all_dates"
  }

  const getDateRangeDisplayLabel = () => {
    if (rangeStartDate && rangeEndDate) return `${rangeStartDate} → ${rangeEndDate}`
    if (rangeStartDate) return rangeStartDate
    if (rangeEndDate) return rangeEndDate
    return "Date Range"
  }

  const getTodayLabel = () => new Date().toISOString().slice(0, 10)

  const handleDateInputClick = (event) => {
    const inputElement = event.currentTarget
    if (typeof inputElement.showPicker === "function") {
      inputElement.showPicker()
    }
  }

  const handleSort = (key) => {
    setSortConfig((previous) => {
      if (previous.key !== key) {
        return { key, direction: "asc" }
      }

      if (previous.direction === "asc") {
        return { key, direction: "desc" }
      }

      if (previous.direction === "desc") {
        return { key: null, direction: "none" }
      }

      return { key, direction: "asc" }
    })
  }

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key || sortConfig.direction === "none") return "↕"
    return sortConfig.direction === "asc" ? "↑" : "↓"
  }

  const buildCsv = (data, tab) => {
    let csv = ""

    if (tab === "admin") {
      csv = "Created At,Admin ID,Action,Target Table,Target ID,Description\n"
      data.forEach((row) => {
        csv += `"${formatTimestamp(row.created_at)}","${(row.admin_id || "").toString().replaceAll('"', '""')}","${(row.action || "").toString().replaceAll('"', '""')}","${(row.target_table || "").toString().replaceAll('"', '""')}","${(row.target_id || "").toString().replaceAll('"', '""')}","${(row.description || "").toString().replaceAll('"', '""')}"\n`
      })
    } else {
      csv = "Logged At,Email,User ID,Status,User Type,IP Address,User Agent\n"
      data.forEach((row) => {
        csv += `"${formatTimestamp(row.logged_at)}","${(row.email || "").toString().replaceAll('"', '""')}","${(row.user_id || "").toString().replaceAll('"', '""')}","${(row.login_status || "").toString().replaceAll('"', '""')}","${(row.user_type || "").toString().replaceAll('"', '""')}","${(row.ip_address || "").toString().replaceAll('"', '""')}","${(row.user_agent || "").toString().replaceAll('"', '""')}"\n`
      })
    }

    return csv
  }

  const exportToCSV = (scope) => {
    const data = scope === "all" ? activeLogs : paginatedLogs
    const csv = buildCsv(data, activeTab)
    const tabLabel = activeTab === "admin" ? "Admin" : "Login"
    const fileName = `${tabLabel}_Logs_${getTodayLabel()}_${getDateRangeLabel()}.csv`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const tabs = [
    { id: "admin", label: "Admin", count: filteredAdminLogs.length },
    { id: "login", label: "Login", count: filteredLoginLogs.length },
  ]

  const currentRowsCount = paginatedLogs.length
  const exportAllLabel = activeTab === "admin" ? "Export All Admin Logs" : "Export All Login Logs"
  const exportSelectedLabel = `Export Selected (${currentRowsCount})`

  const minTableRows = 10
  const emptyRowsCount = Math.max(0, minTableRows - paginatedLogs.length)

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 px-6 py-4 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Logs</h1>
          <p className="text-sm text-white/80">Monitor admin and login audit activity</p>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="relative w-72 shrink-0">
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

          {activeTab === "admin" ? (
            <>
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
                value={filterTable}
                onChange={(e) => setFilterTable(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              >
                <option value="all">Filter by Table</option>
                {targetTableOptions.map((table) => (
                  <option key={table} value={table}>
                    {table}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <select
                value={filterLoginStatus}
                onChange={(e) => setFilterLoginStatus(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              >
                <option value="all">Filter by Status</option>
                {loginStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select
                value={filterUserType}
                onChange={(e) => setFilterUserType(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              >
                <option value="all">Filter by User Type</option>
                {userTypeOptions.map((userType) => (
                  <option key={userType} value={userType}>
                    {userType}
                  </option>
                ))}
              </select>
            </>
          )}

          <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 inline-flex items-center w-auto max-w-[220px]"
                title={getDateRangeDisplayLabel()}
              >
                <span className="whitespace-nowrap overflow-hidden text-ellipsis block">{getDateRangeDisplayLabel()}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="bg-slate-900 border-slate-700 w-auto p-3">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={rangeStartDate}
                  onChange={(e) => setRangeStartDate(e.target.value)}
                  onClick={handleDateInputClick}
                  onFocus={handleDateInputClick}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={rangeEndDate}
                  onChange={(e) => setRangeEndDate(e.target.value)}
                  onClick={handleDateInputClick}
                  onFocus={handleDateInputClick}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setRangeStartDate("")
                    setRangeEndDate("")
                    setIsDatePopoverOpen(false)
                  }}
                  className="px-3 py-1.5 bg-slate-700 text-slate-200 rounded text-xs hover:bg-slate-600 transition-colors"
                >
                  Clear
                </button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex-1" />
          <button
            onClick={() => exportToCSV("all")}
            className="px-3 py-1.5 bg-fuchsia-600 text-white rounded text-sm hover:bg-fuchsia-700 transition-colors whitespace-nowrap"
          >
            {exportAllLabel}
          </button>
          <button
            onClick={() => exportToCSV("selected")}
            className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30 transition-colors whitespace-nowrap"
          >
            {exportSelectedLabel}
          </button>
        </div>
      </div>

      <div className="px-6 border-b border-slate-700">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id ? "text-fuchsia-400" : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label} ({tab.count})
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fuchsia-500" />}
              </button>
            ))}
          </div>

          <div className="py-2" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div ref={tableScrollRef} className="flex-1 overflow-auto">
          {logsError && <div className="px-6 py-3 text-sm text-red-400">{logsError}</div>}
          {isLoadingLogs ? (
            <div className="px-6 py-6 text-sm text-slate-400">Loading logs...</div>
          ) : (
            <table className="w-full table-fixed">
              {activeTab === "admin" ? (
                <colgroup>
                  <col style={{ width: "220px" }} />
                  <col style={{ width: "180px" }} />
                  <col style={{ width: "200px" }} />
                  <col style={{ width: "220px" }} />
                  <col style={{ width: "180px" }} />
                  <col style={{ width: "auto" }} />
                </colgroup>
              ) : (
                <colgroup>
                  <col style={{ width: "220px" }} />
                  <col style={{ width: "260px" }} />
                  <col style={{ width: "180px" }} />
                  <col style={{ width: "170px" }} />
                  <col style={{ width: "180px" }} />
                  <col style={{ width: "210px" }} />
                  <col style={{ width: "auto" }} />
                </colgroup>
              )}
              <thead className="bg-slate-900 sticky top-0 z-20">
                {activeTab === "admin" ? (
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-[20px] py-[20px] text-xs font-medium text-slate-300 bg-slate-900">
                      <button type="button" onClick={() => handleSort("created_at")} className="inline-flex items-center gap-1 hover:text-white">
                        Created At <span>{getSortIndicator("created_at")}</span>
                      </button>
                    </th>
                    <th className="text-left px-[20px] py-[20px] text-xs font-medium text-slate-300 bg-slate-900">
                      <button type="button" onClick={() => handleSort("admin_id")} className="inline-flex items-center gap-1 hover:text-white">
                        Admin ID <span>{getSortIndicator("admin_id")}</span>
                      </button>
                    </th>
                    <th className="text-left px-[20px] py-[20px] text-xs font-medium text-slate-300 bg-slate-900">
                      <button type="button" onClick={() => handleSort("action")} className="inline-flex items-center gap-1 hover:text-white">
                        Action <span>{getSortIndicator("action")}</span>
                      </button>
                    </th>
                    <th className="text-left px-[20px] py-[20px] text-xs font-medium text-slate-300 bg-slate-900">
                      <button type="button" onClick={() => handleSort("target_table")} className="inline-flex items-center gap-1 hover:text-white">
                        Target Table <span>{getSortIndicator("target_table")}</span>
                      </button>
                    </th>
                    <th className="text-left px-[20px] py-[20px] text-xs font-medium text-slate-300 bg-slate-900">
                      <button type="button" onClick={() => handleSort("target_id")} className="inline-flex items-center gap-1 hover:text-white">
                        Target ID <span>{getSortIndicator("target_id")}</span>
                      </button>
                    </th>
                    <th className="text-left px-[20px] py-[20px] text-xs font-medium text-slate-300 bg-slate-900">
                      <button type="button" onClick={() => handleSort("description")} className="inline-flex items-center gap-1 hover:text-white">
                        Description <span>{getSortIndicator("description")}</span>
                      </button>
                    </th>
                  </tr>
                ) : (
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-[20px] py-[20px] text-xs font-medium text-slate-300 bg-slate-900">
                      <button type="button" onClick={() => handleSort("logged_at")} className="inline-flex items-center gap-1 hover:text-white">
                        Logged At <span>{getSortIndicator("logged_at")}</span>
                      </button>
                    </th>
                    <th className="text-left px-[20px] py-[20px] text-xs font-medium text-slate-300 bg-slate-900">
                      <button type="button" onClick={() => handleSort("email")} className="inline-flex items-center gap-1 hover:text-white">
                        Email <span>{getSortIndicator("email")}</span>
                      </button>
                    </th>
                    <th className="text-left px-[20px] py-[20px] text-xs font-medium text-slate-300 bg-slate-900">
                      <button type="button" onClick={() => handleSort("user_id")} className="inline-flex items-center gap-1 hover:text-white">
                        User ID <span>{getSortIndicator("user_id")}</span>
                      </button>
                    </th>
                    <th className="text-left px-[20px] py-[20px] text-xs font-medium text-slate-300 bg-slate-900">
                      <button type="button" onClick={() => handleSort("login_status")} className="inline-flex items-center gap-1 hover:text-white">
                        Status <span>{getSortIndicator("login_status")}</span>
                      </button>
                    </th>
                    <th className="text-left px-[20px] py-[20px] text-xs font-medium text-slate-300 bg-slate-900">
                      <button type="button" onClick={() => handleSort("user_type")} className="inline-flex items-center gap-1 hover:text-white">
                        User Type <span>{getSortIndicator("user_type")}</span>
                      </button>
                    </th>
                    <th className="text-left px-[20px] py-[20px] text-xs font-medium text-slate-300 bg-slate-900">
                      <button type="button" onClick={() => handleSort("ip_address")} className="inline-flex items-center gap-1 hover:text-white">
                        IP Address <span>{getSortIndicator("ip_address")}</span>
                      </button>
                    </th>
                    <th className="text-left px-[20px] py-[20px] text-xs font-medium text-slate-300 bg-slate-900">
                      <button type="button" onClick={() => handleSort("user_agent")} className="inline-flex items-center gap-1 hover:text-white">
                        User Agent <span>{getSortIndicator("user_agent")}</span>
                      </button>
                    </th>
                  </tr>
                )}
              </thead>
              <tbody>
                {paginatedLogs.length === 0 ? (
                  <tr className="border-b border-slate-700/50">
                    <td colSpan={activeTab === "admin" ? 6 : 7} className="px-[20px] py-[20px] text-sm text-slate-400 text-center">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((item) => (
                    activeTab === "admin" ? (
                      <tr key={item.admin_log_id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                        <td className="px-[20px] py-[20px] text-sm text-slate-300 truncate" title={formatTimestamp(item.created_at)}>{formatTimestamp(item.created_at)}</td>
                        <td className="px-[20px] py-[20px] text-sm text-white truncate" title={item.admin_id}>{item.admin_id}</td>
                        <td className="px-[20px] py-[20px] text-sm text-slate-300 truncate" title={item.action}>{item.action}</td>
                        <td className="px-[20px] py-[20px] text-sm text-slate-300 truncate" title={item.target_table}>{item.target_table}</td>
                        <td className="px-[20px] py-[20px] text-sm text-slate-300 truncate" title={item.target_id}>{item.target_id}</td>
                        <td className="px-[20px] py-[20px] text-sm text-slate-300 truncate" title={item.description}>{item.description}</td>
                      </tr>
                    ) : (
                      <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                        <td className="px-[20px] py-[20px] text-sm text-slate-300 truncate" title={formatTimestamp(item.logged_at)}>{formatTimestamp(item.logged_at)}</td>
                        <td className="px-[20px] py-[20px] text-sm text-white truncate" title={item.email}>{item.email}</td>
                        <td className="px-[20px] py-[20px] text-sm text-slate-300 truncate" title={item.user_id}>{item.user_id}</td>
                        <td className="px-[20px] py-[20px] text-sm text-slate-300 truncate" title={item.login_status}>{item.login_status}</td>
                        <td className="px-[20px] py-[20px] text-sm text-slate-300 truncate" title={item.user_type}>{item.user_type}</td>
                        <td className="px-[20px] py-[20px] text-sm text-slate-300 truncate" title={item.ip_address}>{item.ip_address}</td>
                        <td className="px-[20px] py-[20px] text-sm text-slate-300 truncate" title={item.user_agent}>{item.user_agent}</td>
                      </tr>
                    )
                  ))
                )}

                {Array.from({ length: emptyRowsCount }).map((_, index) => (
                  <tr key={`empty-${index}`} className="border-b border-slate-700/50">
                    <td colSpan={activeTab === "admin" ? 6 : 7} className="px-[20px] py-[20px] text-sm text-slate-500">
                      &nbsp;
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-slate-700 px-6 py-[14px] flex items-center justify-between bg-slate-800/50">
          <span className="text-sm text-slate-400">
            Showing {paginatedLogs.length} log{paginatedLogs.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">Rows</label>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value="all">All</option>
              </select>
            </div>
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
    </div>
  )
}
