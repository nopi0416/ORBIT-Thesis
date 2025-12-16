"use client"

import { useState } from "react"

export default function AdminHeader() {
  const [showNotifications, setShowNotifications] = useState(false)

  const notifications = [
    { id: 1, type: "info", message: "New user registration pending approval", time: "5 min ago" },
    { id: 2, type: "warning", message: "System backup scheduled for tonight", time: "1 hour ago" },
    { id: 3, type: "success", message: "Database optimization completed", time: "2 hours ago" },
  ]

  return (
    <div className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-white">Admin Portal</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-fuchsia-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 border-b border-slate-700/50 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 ${
                          notification.type === "info"
                            ? "bg-blue-400"
                            : notification.type === "warning"
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm text-white">{notification.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-700">
                <button className="w-full text-sm text-fuchsia-400 hover:text-fuchsia-300 transition-colors">
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-white">Admin User</p>
            <p className="text-xs text-slate-400">System Administrator</p>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">AU</span>
          </div>
        </div>
      </div>
    </div>
  )
}
