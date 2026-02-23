export default function AdminBudgetBar({ department, current, total }) {
  const percentage = (current / total) * 100

  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium text-sm">{department}</span>
        <span className="text-slate-400 text-sm">
          ${current.toLocaleString('en-US')} / ${total.toLocaleString('en-US')}
        </span>
      </div>
      <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
