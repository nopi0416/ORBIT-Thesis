"use client"

import { useState } from "react"

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("users")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterOU, setFilterOU] = useState("all")
  const [filterRole, setFilterRole] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [addUserTab, setAddUserTab] = useState("individual")
  const [showEditModal, setShowEditModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [confirmAction, setConfirmAction] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [selectedUsers, setSelectedUsers] = useState([])
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [passwordConfig, setPasswordConfig] = useState({
    basePassword: "",
    isUnique: false,
    uniqueCount: 3,
    uniqueType: "numeric",
  })

  const users = [
    {
      id: 1,
      employeeId: "EMP001",
      name: "John Doe",
      email: "john@orbit.com",
      ou: "IT Department",
      role: "Admin",
      status: "Active",
    },
    {
      id: 2,
      employeeId: "EMP002",
      name: "Jane Smith",
      email: "jane@orbit.com",
      ou: "HR Department",
      role: "Budget Officer",
      status: "First-Time",
    },
    {
      id: 3,
      employeeId: "EMP003",
      name: "Bob Johnson",
      email: "bob@orbit.com",
      ou: "Finance",
      role: "Approver",
      status: "Active",
    },
    {
      id: 4,
      employeeId: "EMP004",
      name: "Alice Williams",
      email: "alice@orbit.com",
      ou: "Operations",
      role: "Requestor",
      status: "First-Time",
    },
    {
      id: 5,
      employeeId: "EMP005",
      name: "Charlie Brown",
      email: "charlie@orbit.com",
      ou: "IT Department",
      role: "Budget Officer",
      status: "Active",
    },
  ]

  const tickets = [
    {
      id: 1,
      employeeId: "EMP006",
      name: "David Lee",
      email: "david@orbit.com",
      ou: "Marketing",
      role: "Requestor",
      status: "Pending",
      requestDate: "2024-01-15",
    },
    {
      id: 2,
      employeeId: "EMP007",
      name: "Emma Davis",
      email: "emma@orbit.com",
      ou: "Sales",
      role: "Approver",
      status: "Pending",
      requestDate: "2024-01-14",
    },
    {
      id: 3,
      employeeId: "EMP008",
      name: "Frank Miller",
      email: "frank@orbit.com",
      ou: "IT Department",
      role: "Admin",
      status: "Pending",
      requestDate: "2024-01-13",
    },
  ]

  const locked = [
    {
      id: 1,
      employeeId: "EMP009",
      name: "Grace Taylor",
      email: "grace@orbit.com",
      ou: "Finance",
      role: "Budget Officer",
      status: "Locked",
      lockedDate: "2024-01-10",
    },
    {
      id: 2,
      employeeId: "EMP010",
      name: "Henry Wilson",
      email: "henry@orbit.com",
      ou: "Operations",
      role: "Requestor",
      status: "Locked",
      lockedDate: "2024-01-09",
    },
  ]

  const deactivated = [
    {
      id: 1,
      employeeId: "EMP011",
      name: "Ivy Martinez",
      email: "ivy@orbit.com",
      ou: "HR Department",
      role: "Approver",
      status: "Deactivated",
      deactivatedDate: "2024-01-05",
    },
    {
      id: 2,
      employeeId: "EMP012",
      name: "Jack Anderson",
      email: "jack@orbit.com",
      ou: "Marketing",
      role: "Requestor",
      status: "Deactivated",
      deactivatedDate: "2024-01-03",
    },
  ]

  const getCurrentData = () => {
    switch (activeTab) {
      case "tickets":
        return tickets
      case "locked":
        return locked
      case "deactivated":
        return deactivated
      default:
        return users
    }
  }

  const totalPages = Math.ceil(getCurrentData().length / 10)

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(getCurrentData().map((item) => item.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (id) => {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((userId) => userId !== id) : [...prev, id]))
  }

  const handleBulkAction = (action) => {
    if (action === "reset") {
      setShowPasswordResetModal(true)
    } else {
      setConfirmAction({ type: action, count: selectedUsers.length })
      setShowConfirmModal(true)
    }
  }

  const handlePasswordReset = () => {
    const selectedUserData = tickets.filter((t) => selectedUsers.includes(t.id))

    // Generate passwords for selected users
    const resetResults = selectedUserData.map((user, index) => {
      let password = passwordConfig.basePassword
      if (passwordConfig.isUnique) {
        const suffix = generateUniqueSuffix(index, passwordConfig.uniqueType, passwordConfig.uniqueCount)
        password = `${password}${suffix}`
      }
      return { ...user, newPassword: password }
    })

    setNotificationMessage(
      `Password reset successful for ${resetResults.length} user${resetResults.length > 1 ? "s" : ""}`,
    )
    setShowNotification(true)
    setShowPasswordResetModal(false)
    setSelectedUsers([])
    setTimeout(() => setShowNotification(false), 5000)
  }

  const generateUniqueSuffix = (index, type, count) => {
    if (type === "numeric") {
      return String(index + 1).padStart(count, "0")
    } else if (type === "alphanumeric") {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      return Array.from({ length: count }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    } else {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      return Array.from({ length: count }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    }
  }

  const handleConfirmAction = () => {
    if (confirmText !== "CONFIRM") return

    const action = confirmAction.type
    const count = confirmAction.count
    let message = ""

    switch (action) {
      case "edit":
        message = `Successfully edited ${count} user${count > 1 ? "s" : ""}`
        break
      case "lock":
        message = `Successfully locked ${count} user${count > 1 ? "s" : ""}`
        break
      case "deactivate":
        message = `Successfully deactivated ${count} user${count > 1 ? "s" : ""}`
        break
      case "unlock":
        message = `Successfully unlocked ${count} user${count > 1 ? "s" : ""}`
        break
      case "reactivate":
        message = `Successfully reactivated ${count} user${count > 1 ? "s" : ""}`
        break
    }

    setNotificationMessage(message)
    setShowNotification(true)
    setShowConfirmModal(false)
    setConfirmText("")
    setSelectedUsers([])
    setTimeout(() => setShowNotification(false), 5000)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Success Notification - Floating at top */}
      {showNotification && (
        <div className="absolute top-0 left-0 right-0 z-50 p-4">
          <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-emerald-400">{notificationMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-sm text-white/80">Manage users, roles, and access</p>
          </div>
          <button
            onClick={() => setShowAddUserModal(true)}
            className="px-4 py-2 bg-white text-fuchsia-600 rounded-lg font-medium hover:bg-white/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>
      </div>

      {/* Filters and Search */}
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
              placeholder="Search by name, employee ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
          </div>
          <select
            value={filterOU}
            onChange={(e) => setFilterOU(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option value="all">Filter by OU</option>
            <option value="it">IT Department</option>
            <option value="hr">HR Department</option>
            <option value="finance">Finance</option>
            <option value="operations">Operations</option>
          </select>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option value="all">Filter by Role</option>
            <option value="admin">Admin</option>
            <option value="officer">Budget Officer</option>
            <option value="approver">Approver</option>
            <option value="requestor">Requestor</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-slate-700">
        <div className="flex gap-1">
          {[
            { id: "users", label: "Users", count: users.length },
            { id: "tickets", label: "Tickets", count: tickets.length },
            { id: "locked", label: "Locked", count: locked.length },
            { id: "deactivated", label: "Deactivated", count: deactivated.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setCurrentPage(1)
                setSelectedUsers([])
              }}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? "text-fuchsia-400" : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label} ({tab.count})
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
                <th className="text-left p-3 text-xs font-medium text-slate-300">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === getCurrentData().length && getCurrentData().length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500 accent-fuchsia-500"
                  />
                </th>
                <th className="text-left p-3 text-xs font-medium text-slate-300">Employee ID</th>
                <th className="text-left p-3 text-xs font-medium text-slate-300">Name</th>
                <th className="text-left p-3 text-xs font-medium text-slate-300">Email</th>
                <th className="text-left p-3 text-xs font-medium text-slate-300">OU</th>
                <th className="text-left p-3 text-xs font-medium text-slate-300">Role</th>
                <th className="text-left p-3 text-xs font-medium text-slate-300">Status</th>
                <th className="text-right p-3 text-xs font-medium text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {getCurrentData()
                .slice((currentPage - 1) * 10, currentPage * 10)
                .map((item) => (
                  <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(item.id)}
                        onChange={() => handleSelectUser(item.id)}
                        className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500 accent-fuchsia-500"
                      />
                    </td>
                    <td className="p-3 text-sm text-slate-300">{item.employeeId}</td>
                    <td className="p-3 text-sm text-white font-medium">{item.name}</td>
                    <td className="p-3 text-sm text-slate-300">{item.email}</td>
                    <td className="p-3 text-sm text-slate-300">{item.ou}</td>
                    <td className="p-3 text-sm text-slate-300">{item.role}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          item.status === "Active"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : item.status === "First-Time"
                              ? "bg-blue-500/20 text-blue-400"
                              : item.status === "Pending"
                                ? "bg-amber-500/20 text-amber-400"
                                : item.status === "Locked"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === "users" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedUser(item)
                                setShowEditModal(true)
                              }}
                              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                              title="Edit"
                            >
                              <svg
                                className="w-4 h-4 text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setConfirmAction({ type: "lock", count: 1 })
                                setShowConfirmModal(true)
                              }}
                              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                              title="Lock"
                            >
                              <svg
                                className="w-4 h-4 text-amber-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setConfirmAction({ type: "deactivate", count: 1 })
                                setShowConfirmModal(true)
                              }}
                              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                              title="Deactivate"
                            >
                              <svg
                                className="w-4 h-4 text-red-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                />
                              </svg>
                            </button>
                          </>
                        )}
                        {activeTab === "tickets" && (
                          <button
                            onClick={() => {
                              setSelectedUsers([item.id])
                              setShowPasswordResetModal(true)
                            }}
                            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                            title="Reset Password"
                          >
                            <svg
                              className="w-4 h-4 text-blue-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                          </button>
                        )}
                        {activeTab === "locked" && (
                          <button
                            onClick={() => {
                              setConfirmAction({ type: "unlock", count: 1 })
                              setShowConfirmModal(true)
                            }}
                            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                            title="Unlock"
                          >
                            <svg
                              className="w-4 h-4 text-emerald-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </button>
                        )}
                        {activeTab === "deactivated" && (
                          <button
                            onClick={() => {
                              setConfirmAction({ type: "reactivate", count: 1 })
                              setShowConfirmModal(true)
                            }}
                            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                            title="Reactivate"
                          >
                            <svg
                              className="w-4 h-4 text-emerald-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination with Bulk Actions */}
        <div className="border-t border-slate-700 px-6 py-3 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-2">
            {selectedUsers.length > 0 && (
              <>
                {activeTab === "users" && (
                  <>
                    <button
                      onClick={() => handleBulkAction("edit")}
                      className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30 transition-colors"
                    >
                      Edit All ({selectedUsers.length})
                    </button>
                    <button
                      onClick={() => handleBulkAction("lock")}
                      className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded text-sm hover:bg-amber-500/30 transition-colors"
                    >
                      Lock All ({selectedUsers.length})
                    </button>
                    <button
                      onClick={() => handleBulkAction("deactivate")}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30 transition-colors"
                    >
                      Deactivate All ({selectedUsers.length})
                    </button>
                  </>
                )}
                {activeTab === "tickets" && (
                  <button
                    onClick={() => handleBulkAction("reset")}
                    className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30 transition-colors"
                  >
                    Reset All ({selectedUsers.length})
                  </button>
                )}
                {activeTab === "locked" && (
                  <button
                    onClick={() => handleBulkAction("unlock")}
                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded text-sm hover:bg-emerald-500/30 transition-colors"
                  >
                    Unlock All ({selectedUsers.length})
                  </button>
                )}
                {activeTab === "deactivated" && (
                  <button
                    onClick={() => handleBulkAction("reactivate")}
                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded text-sm hover:bg-emerald-500/30 transition-colors"
                  >
                    Reactivate All ({selectedUsers.length})
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
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

      {/* Password Reset Modal */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Reset Password</h3>
              <p className="text-sm text-slate-400 mt-1">
                Configure new password for {selectedUsers.length} user{selectedUsers.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Base Password</label>
                <input
                  type="text"
                  value={passwordConfig.basePassword}
                  onChange={(e) => setPasswordConfig((prev) => ({ ...prev, basePassword: e.target.value }))}
                  placeholder="Enter base password (e.g., Orbit2025)"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="uniquePassword"
                  checked={passwordConfig.isUnique}
                  onChange={(e) => setPasswordConfig((prev) => ({ ...prev, isUnique: e.target.checked }))}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500 accent-fuchsia-500"
                />
                <label htmlFor="uniquePassword" className="text-sm text-slate-300">
                  Generate unique passwords per user
                </label>
              </div>

              {passwordConfig.isUnique && (
                <div className="space-y-3 pl-6 border-l-2 border-fuchsia-500/30">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Unique Identifier Count</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={passwordConfig.uniqueCount}
                      onChange={(e) =>
                        setPasswordConfig((prev) => ({ ...prev, uniqueCount: Number.parseInt(e.target.value) }))
                      }
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Identifier Type</label>
                    <select
                      value={passwordConfig.uniqueType}
                      onChange={(e) => setPasswordConfig((prev) => ({ ...prev, uniqueType: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    >
                      <option value="numeric">Numeric (e.g., 001, 002)</option>
                      <option value="alphanumeric">Alphanumeric (e.g., A3F, B7K)</option>
                      <option value="alphabet">Alphabet Only (e.g., ABC, DEF)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-400">
                  <strong>Preview:</strong> {passwordConfig.basePassword}
                  {passwordConfig.isUnique ? "001" : ""} (users will receive emails with their new passwords)
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPasswordResetModal(false)
                  setSelectedUsers([])
                }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordReset}
                disabled={!passwordConfig.basePassword}
                className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Passwords
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals remain the same... */}
      {/* Add User Modal, Edit Modal, Confirm Modal */}
    </div>
  )
}
