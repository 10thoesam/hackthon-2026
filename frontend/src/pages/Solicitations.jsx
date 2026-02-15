import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchSolicitations } from '../utils/api'
import FilterBar from '../components/FilterBar'

const sourceTypes = [
  { value: '', label: 'All' },
  { value: 'government', label: 'Government' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'state_local', label: 'State & Local' },
]

const statusFilters = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
]

const badgeStyles = {
  government: 'bg-blue-600/20 text-blue-400',
  commercial: 'bg-purple-600/20 text-purple-400',
  state_local: 'bg-amber-500/20 text-amber-400',
}

const badgeLabels = {
  government: 'Government',
  commercial: 'Commercial',
  state_local: 'State & Local',
}

export default function Solicitations() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [solicitations, setSolicitations] = useState([])
  const [filters, setFilters] = useState({})
  const [sourceType, setSourceType] = useState(searchParams.get('type') || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.agency) params.agency = filters.agency
    if (sourceType) params.source_type = sourceType
    fetchSolicitations(params)
      .then(res => setSolicitations(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filters, sourceType])

  const handleSourceType = (value) => {
    setSourceType(value)
    if (value) {
      setSearchParams({ type: value })
    } else {
      setSearchParams({})
    }
  }

  const formatCurrency = (val) => {
    if (!val) return 'N/A'
    return '$' + val.toLocaleString()
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
        <h1 className="text-xl font-bold text-white">Solicitations</h1>
        <p className="text-gray-400 text-sm">Browse food distribution opportunities across all sectors</p>
      </div>

      {/* Source type pill filters */}
      <div className="flex items-center gap-2">
        {sourceTypes.map(st => (
          <button
            key={st.value}
            onClick={() => handleSourceType(st.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              sourceType === st.value
                ? 'bg-amber-500 text-black font-bold'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      <FilterBar
        filters={[
          { key: 'status', label: 'Status', type: 'select', options: statusFilters },
          { key: 'agency', label: 'Search', type: 'text', placeholder: 'Search agency or company...' },
        ]}
        values={filters}
        onChange={setFilters}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="grid gap-3">
          {solicitations.map(sol => (
            <Link
              key={sol.id}
              to={`/solicitations/${sol.id}`}
              className="block bg-gray-900 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg">{sol.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${badgeStyles[sol.source_type] || badgeStyles.government}`}>
                      {badgeLabels[sol.source_type] || sol.source_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {sol.source_type === 'commercial' ? sol.company_name : sol.agency}
                  </p>
                  <p className="text-sm text-gray-300 mt-2 line-clamp-2">{sol.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(sol.categories || []).map(cat => (
                      <span key={cat} className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    sol.status === 'open' ? 'bg-green-600/20 text-green-400' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {sol.status}
                  </span>
                  <p className="text-sm font-bold text-amber-400 mt-2">{formatCurrency(sol.estimated_value)}</p>
                  <p className="text-xs text-gray-500 mt-1">ZIP: {sol.zip_code}</p>
                  {sol.response_deadline && (
                    <p className="text-xs text-gray-500">Due: {sol.response_deadline}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
          {solicitations.length === 0 && (
            <div className="text-center py-12 text-gray-500">No solicitations found</div>
          )}
        </div>
      )}
    </div>
  )
}
