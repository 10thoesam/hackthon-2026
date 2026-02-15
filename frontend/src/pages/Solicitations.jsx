import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchSolicitations } from '../utils/api'
import FilterBar from '../components/FilterBar'

const statusFilters = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
]

const sourceTypeFilters = [
  { value: 'government', label: 'Government' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'state_local', label: 'State/Local' },
]

const sourceTypeBadge = (type) => {
  const label = type === 'commercial' ? 'Commercial' : type === 'state_local' ? 'State/Local' : 'Government'
  return <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">{label}</span>
}

export default function Solicitations() {
  const [solicitations, setSolicitations] = useState([])
  const [filters, setFilters] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.agency) params.agency = filters.agency
    if (filters.source_type) params.source_type = filters.source_type
    fetchSolicitations(params)
      .then(res => setSolicitations(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filters])

  const formatCurrency = (val) => {
    if (!val) return 'N/A'
    return '$' + val.toLocaleString()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Solicitations</h1>
        <p className="text-sm text-slate-400">Food distribution opportunities</p>
      </div>

      <FilterBar
        filters={[
          { key: 'source_type', label: 'Type', type: 'select', options: sourceTypeFilters },
          { key: 'status', label: 'Status', type: 'select', options: statusFilters },
          { key: 'agency', label: 'Agency', type: 'text', placeholder: 'Search agency...' },
        ]}
        values={filters}
        onChange={setFilters}
      />

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : (
        <div className="grid gap-3">
          {solicitations.map(sol => (
            <Link
              key={sol.id}
              to={`/solicitations/${sol.id}`}
              className="block bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-800">{sol.title}</h3>
                    {sourceTypeBadge(sol.source_type)}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{sol.source_type === 'commercial' ? sol.company_name : sol.agency}</p>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">{sol.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(sol.categories || []).map(cat => (
                      <span key={cat} className="bg-slate-50 text-slate-500 text-xs px-2 py-0.5 rounded-md">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                    sol.status === 'open' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {sol.status}
                  </span>
                  <p className="text-sm font-medium text-slate-700 mt-2">{formatCurrency(sol.estimated_value)}</p>
                  <p className="text-xs text-slate-400 mt-1">ZIP: {sol.zip_code}</p>
                  {sol.response_deadline && (
                    <p className="text-xs text-slate-400">Due: {sol.response_deadline}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
          {solicitations.length === 0 && (
            <div className="text-center py-12 text-slate-400">No solicitations found</div>
          )}
        </div>
      )}
    </div>
  )
}
