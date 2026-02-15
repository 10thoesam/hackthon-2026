export default function FilterBar({ filters, values, onChange }) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {filters.map(f => (
        <div key={f.key} className="flex flex-col">
          <label className="text-xs text-gray-400 mb-1">{f.label}</label>
          {f.type === 'select' ? (
            <select
              value={values[f.key] || ''}
              onChange={e => onChange({ ...values, [f.key]: e.target.value })}
              className="border border-gray-600 rounded-md px-3 py-1.5 text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All</option>
              {f.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={values[f.key] || ''}
              onChange={e => onChange({ ...values, [f.key]: e.target.value })}
              placeholder={f.placeholder || ''}
              className="border border-gray-600 rounded-md px-3 py-1.5 text-sm bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          )}
        </div>
      ))}
    </div>
  )
}
