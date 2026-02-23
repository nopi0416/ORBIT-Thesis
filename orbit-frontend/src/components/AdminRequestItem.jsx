export default function AdminRequestItem({ id, department, status, amount }) {
  const statusStyles = {
    pending: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    approved: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <div className="flex-1">
        <p className="text-white font-medium text-sm">{id}</p>
        <p className="text-slate-400 text-xs mt-0.5">{department}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        <span className="text-white font-semibold text-sm min-w-[80px] text-right">${amount.toLocaleString('en-US')}</span>
      </div>
    </div>
  )
}
