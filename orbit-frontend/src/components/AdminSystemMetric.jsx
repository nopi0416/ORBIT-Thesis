import { useState } from "react"

export default function AdminSystemMetric({ metric }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "healthy":
        return "bg-emerald-500"
      case "warning":
        return "bg-amber-500"
      case "critical":
        return "bg-red-500"
      default:
        return "bg-slate-500"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "healthy":
        return "text-emerald-400"
      case "warning":
        return "text-amber-400"
      case "critical":
        return "text-red-400"
      default:
        return "text-slate-400"
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/30">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${getStatusColor(metric.status)}`}></div>
        <div>
          <p className="text-sm font-medium text-slate-200">{metric.name}</p>
          <p className="text-xs text-slate-500">{metric.description}</p>
        </div>
      </div>
      <span className={`text-sm font-semibold ${getStatusText(metric.status)}`}>{metric.value}</span>
    </div>
  )
}
