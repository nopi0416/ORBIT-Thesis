"use client"

import { useState } from "react"

export default function Profile() {
  const [profileImage, setProfileImage] = useState(null)
  const [notifications, setNotifications] = useState({
    email: true,
    system: true,
    security: false,
  })
  const [darkMode, setDarkMode] = useState(true)

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveChanges = () => {
    alert("Settings saved successfully!")
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 px-6 py-4 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
          <p className="text-sm text-white/80">Manage your account information and preferences</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Profile Card */}
          <div className="bg-slate-800/80 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Profile Information</h3>
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 bg-gradient-to-br from-fuchsia-500 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
                  {profileImage ? (
                    <img
                      src={profileImage || "/placeholder.svg"}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "AU"
                  )}
                </div>
                <label className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 transition-colors cursor-pointer">
                  Change Picture
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
                  <div className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white">
                    Admin User
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Employee ID</label>
                  <div className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white">
                    ADMIN001
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
                  <div className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white">
                    admin@orbit.com
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Role</label>
                  <div className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white">
                    System Administrator
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Department</label>
                  <div className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white">
                    IT Department
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Status</label>
                  <div className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                    <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-slate-800/80 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Notification Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Email Notifications</p>
                  <p className="text-xs text-slate-400">Receive email alerts for important events</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-fuchsia-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fuchsia-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">System Notifications</p>
                  <p className="text-xs text-slate-400">Get notified about system updates and maintenance</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.system}
                    onChange={(e) => setNotifications({ ...notifications, system: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-fuchsia-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fuchsia-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Security Alerts</p>
                  <p className="text-xs text-slate-400">Receive alerts for security-related events</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.security}
                    onChange={(e) => setNotifications({ ...notifications, security: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-fuchsia-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fuchsia-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="bg-slate-800/80 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Theme Settings</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Dark Mode</p>
                <p className="text-xs text-slate-400">Toggle between light and dark theme</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-fuchsia-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fuchsia-600"></div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveChanges}
              className="px-6 py-3 bg-fuchsia-600 text-white rounded-lg font-medium hover:bg-fuchsia-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
