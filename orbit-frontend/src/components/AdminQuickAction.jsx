export default function AdminQuickAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-700/50 hover:bg-slate-700 rounded-xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all group"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="text-slate-400 group-hover:text-fuchsia-400 transition-colors">{icon}</div>
        <span className="text-white font-medium text-sm">{label}</span>
      </div>
    </button>
  )
}
