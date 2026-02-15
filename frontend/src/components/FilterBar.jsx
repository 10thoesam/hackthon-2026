export default function FilterBar({ filters, values, onChange }) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {filters.map(f => (
        <div key={f.key} className="flex flex-col">
          <label className="text-xs text-slate-400 mb-1">{f.label}</label>
          {f.type === 'select' ? (
            <select
              value={values[f.key] || ''}
              onChange={e => onChange({ ...values, [f.key]: e.target.value })}
              className="border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
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
              className="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          )}
        </div>
      ))}
    </div>
  )
}
