import { LayoutDashboard, Users, Shield, GitBranch, FileText, BarChart3, Settings } from "lucide-react"

export default function AdminSidebar({ activeItem = "dashboard" }) {
  const menuItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "users", icon: Users, label: "Users" },
    { id: "roles", icon: Shield, label: "Roles" },
    { id: "workflows", icon: GitBranch, label: "Workflows" },
    { id: "audit", icon: FileText, label: "Audit Logs" },
    { id: "reports", icon: BarChart3, label: "Reports" },
    { id: "settings", icon: Settings, label: "Settings" },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-slate-900 flex flex-col items-center py-6 gap-6 z-50 border-r border-slate-800">
      {/* Logo */}
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
        O
      </div>

      {/* Menu Items */}
      <nav className="flex flex-col gap-4 mt-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = item.id === activeItem
          return (
            <button
              key={item.id}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                isActive ? "bg-slate-800 text-fuchsia-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title={item.label}
            >
              <Icon size={20} />
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
