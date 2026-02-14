import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchSolicitations } from '../utils/api'
import FilterBar from '../components/FilterBar'

const statusFilters = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
]

export default function Solicitations() {
  const [solicitations, setSolicitations] = useState([])
  const [filters, setFilters] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.agency) params.agency = filters.agency
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
        <h1 className="text-2xl font-bold text-slate-800">Solicitations</h1>
        <p className="text-slate-500">Government food distribution opportunities</p>
      </div>

      <FilterBar
        filters={[
          { key: 'status', label: 'Status', type: 'select', options: statusFilters },
          { key: 'agency', label: 'Agency', type: 'text', placeholder: 'Search agency...' },
        ]}
        values={filters}
        onChange={setFilters}
      />

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {solicitations.map(sol => (
            <Link
              key={sol.id}
              to={`/solicitations/${sol.id}`}
              className="block bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 text-lg">{sol.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{sol.agency}</p>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">{sol.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(sol.categories || []).map(cat => (
                      <span key={cat} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    sol.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {sol.status}
                  </span>
                  <p className="text-sm font-semibold text-slate-700 mt-2">{formatCurrency(sol.estimated_value)}</p>
                  <p className="text-xs text-slate-400 mt-1">ZIP: {sol.zip_code}</p>
                  {sol.response_deadline && (
                    <p className="text-xs text-slate-400">Due: {sol.response_deadline}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
          {solicitations.length === 0 && (
            <div className="text-center py-12 text-slate-500">No solicitations found</div>
          )}
        </div>
      )}
    </div>
  )
}
