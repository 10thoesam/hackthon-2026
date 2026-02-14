export default function ScoreBar({ score, label }) {
  const getColor = (s) => {
    if (s >= 75) return 'bg-green-500'
    if (s >= 50) return 'bg-yellow-500'
    if (s >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-xs text-slate-500 w-20 shrink-0">{label}</span>}
      <div className="flex-1 bg-slate-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${getColor(score)}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-slate-700 w-10 text-right">{Math.round(score)}</span>
    </div>
  )
}
