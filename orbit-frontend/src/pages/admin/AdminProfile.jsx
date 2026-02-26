"use client"

import { useAuth } from "../../context/AuthContext"

const formatRole = (value) => {
  const normalized = (value || "").toString().trim()
  if (!normalized) return "—"

  return normalized
    .replace(/_/g, " ")
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

export default function AdminProfile() {
  const { user } = useAuth()

  const fullName = user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "—"
  const email = user?.email || "—"
  const role = formatRole(user?.role)
  const organization = user?.org_name || user?.orgName || user?.org_id || user?.orgId || "—"
  const sessionDataRaw = localStorage.getItem("session_cache")

  let sessionExpiresAt = "—"
  let sessionDurationLabel = "—"
  try {
    const parsed = sessionDataRaw ? JSON.parse(sessionDataRaw) : null
    if (parsed?.expiresAt) {
      const expiryDate = new Date(parsed.expiresAt)
      if (!Number.isNaN(expiryDate.getTime())) {
        sessionExpiresAt = expiryDate.toLocaleString()

        const assumedSessionStartMs = expiryDate.getTime() - (24 * 60 * 60 * 1000)
        const elapsedMs = Math.max(0, Date.now() - assumedSessionStartMs)
        const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000))
        const elapsedHours = Math.floor(elapsedMinutes / 60)
        const remainingMinutes = elapsedMinutes % 60
        sessionDurationLabel = `${elapsedHours}h ${remainingMinutes}m`
      }
    }
  } catch {
    sessionExpiresAt = "—"
    sessionDurationLabel = "—"
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 px-6 py-4 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Profile</h1>
          <p className="text-sm text-white/80">Your account information</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto min-h-full flex flex-col justify-center gap-8">
          <div className="bg-slate-800/80 rounded-lg border border-slate-700 p-8">
            <h3 className="text-lg font-semibold text-white mb-6">Profile Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
                <div className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white">
                  {fullName}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
                <div className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white break-all">
                  {email}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Role</label>
                <div className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white">
                  {role}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Organization Unit</label>
                <div className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white">
                  {organization}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-lg border border-slate-700 p-8">
            <h3 className="text-lg font-semibold text-white mb-6">Account Summary</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Session Duration</p>
                <p className="text-sm text-white font-medium" title={sessionDurationLabel}>
                  {sessionDurationLabel}
                </p>
              </div>

              <div className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Session Expiry</p>
                <p className="text-sm text-white font-medium truncate" title={sessionExpiresAt}>
                  {sessionExpiresAt}
                </p>
              </div>

              <div className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">User ID</p>
                <p className="text-sm text-white font-medium truncate" title={user?.id || "—"}>
                  {user?.id || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
