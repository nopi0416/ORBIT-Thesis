export default function AdminStatCard({ title, value, change, icon }) {
  return (
    <div className="bg-slate-800 dark:bg-slate-900/80 rounded-xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
        {icon && <div className="text-slate-500">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-white">{value}</p>
        {change && <span className="text-xs text-slate-500">{change}</span>}
      </div>
    </div>
  )
}
