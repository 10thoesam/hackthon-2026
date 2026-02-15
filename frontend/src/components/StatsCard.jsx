const colorMap = {
  green: 'bg-green-50 text-green-700 border-green-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  red: 'bg-red-50 text-red-700 border-red-200',
}

const iconBgMap = {
  green: 'bg-green-100',
  blue: 'bg-blue-100',
  orange: 'bg-orange-100',
  purple: 'bg-purple-100',
  red: 'bg-red-100',
}

export default function StatsCard({ label, value, subtitle, icon, color = 'green' }) {
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color] || colorMap.green}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-lg ${iconBgMap[color] || iconBgMap.green} flex items-center justify-center text-lg`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
