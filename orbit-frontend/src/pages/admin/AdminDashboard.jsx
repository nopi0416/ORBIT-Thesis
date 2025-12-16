export default function Dashboard() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome back, Admin</h1>
            <p className="text-sm text-white/80">Your Administrator dashboard</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Total Users</p>
                <p className="text-2xl font-bold text-white">248</p>
                <p className="text-xs text-emerald-400 mt-1">+12 from last month</p>
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
                <p className="text-xs text-slate-400 mb-1">Active Roles</p>
                <p className="text-2xl font-bold text-white">8</p>
                <p className="text-xs text-slate-400 mt-1">Across organization</p>
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

          <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Pending Approvals</p>
                <p className="text-2xl font-bold text-white">15</p>
                <p className="text-xs text-amber-400 mt-1">Requires attention</p>
              </div>
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">System Uptime</p>
                <p className="text-2xl font-bold text-white">99.9%</p>
                <p className="text-xs text-emerald-400 mt-1">All systems operational</p>
              </div>
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-6 pb-4 grid grid-cols-2 gap-4 overflow-hidden">
        {/* Recent User Activity */}
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white">Recent User Activity</h3>
            <p className="text-xs text-slate-400 mt-1">Monitor user actions and changes</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {[
              { user: "John Smith", action: "User created", time: "5 minutes ago", type: "create" },
              { user: "Sarah Johnson", action: "Role assigned: Budget Officer", time: "15 minutes ago", type: "role" },
              { user: "Mike Davis", action: "Access modified", time: "1 hour ago", type: "access" },
              { user: "Emily Chen", action: "Password reset", time: "2 hours ago", type: "security" },
              { user: "Robert Wilson", action: "User deactivated", time: "3 hours ago", type: "deactivate" },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-slate-700/50 rounded border border-slate-600 hover:border-fuchsia-500/50 transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 ${
                    activity.type === "create"
                      ? "bg-emerald-400"
                      : activity.type === "role"
                        ? "bg-blue-400"
                        : activity.type === "access"
                          ? "bg-purple-400"
                          : activity.type === "security"
                            ? "bg-amber-400"
                            : "bg-red-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white">{activity.user}</p>
                  <p className="text-xs text-slate-400">{activity.action}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Role Requests */}
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white">Pending Role Requests</h3>
            <p className="text-xs text-slate-400 mt-1">Users awaiting role assignment</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {[
              { name: "Alex Turner", email: "alex.turner@orbit.com", role: "Budget Officer", priority: "high" },
              { name: "Lisa Anderson", email: "lisa.anderson@orbit.com", role: "Approver", priority: "medium" },
              { name: "David Brown", email: "david.brown@orbit.com", role: "Requestor", priority: "medium" },
              { name: "Maria Garcia", email: "maria.garcia@orbit.com", role: "Budget Officer", priority: "low" },
            ].map((request, index) => (
              <div
                key={index}
                className="p-3 bg-slate-700/50 rounded border border-slate-600 hover:border-fuchsia-500/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-medium text-white">{request.name}</p>
                    <p className="text-xs text-slate-400">{request.email}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      request.priority === "high"
                        ? "bg-red-500/20 text-red-400"
                        : request.priority === "medium"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {request.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Requested: {request.role}</p>
                  <div className="flex gap-1">
                    <button className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/30 transition-colors">
                      Approve
                    </button>
                    <button className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors">
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
