export default function AdminActivityItem({ activity }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
      case "pending":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case "user_created":
        return "👤"
      case "role_assigned":
        return "🔑"
      case "access_modified":
        return "🔒"
      case "workflow_updated":
        return "⚙️"
      default:
        return "📋"
    }
  }

  return (
    <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-colors">
      <div className="text-2xl">{getTypeIcon(activity.type)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-slate-200">{activity.action}</p>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(activity.status)}`}>
            {activity.status}
          </span>
        </div>
        <p className="text-xs text-slate-400">{activity.user}</p>
        <p className="text-xs text-slate-500 mt-1">{activity.timestamp}</p>
      </div>
    </div>
  )
}
