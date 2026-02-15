export default function StatsCard({ label, value, subtitle }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}
