import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { fetchSolicitation, generateMatches, deleteSolicitation } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import MapView from '../components/MapView'
import MatchCard from '../components/MatchCard'

export default function SolicitationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sol, setSol] = useState(null)
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const loadSolicitation = () => {
    setLoading(true)
    fetchSolicitation(id)
      .then(res => setSol(res.data))
      .catch(() => setError('Failed to load solicitation'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadSolicitation() }, [id])

  const handleGenerateMatches = () => {
    setMatching(true)
    generateMatches(id)
      .then(() => loadSolicitation())
      .catch(() => setError('Failed to generate matches'))
      .finally(() => setMatching(false))
  }

  const handleDelete = () => {
    if (!window.confirm('Are you sure you want to delete this solicitation? This cannot be undone.')) return
    setDeleting(true)
    deleteSolicitation(id)
      .then(() => {
        navigate('/solicitations')
      })
      .catch(() => setError('Failed to delete solicitation'))
      .finally(() => setDeleting(false))
  }

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>
  if (!sol) return <div className="text-center py-12 text-slate-500">Not found</div>

  const matchOrgs = (sol.matches || [])
    .filter(m => m.organization)
    .map(m => m.organization)

  return (
    <div className="space-y-6">
      <Link
        to="/solicitations"
        className="text-green-700 hover:text-green-800 text-sm"
      >
        &larr; Back to Solicitations
      </Link>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{sol.title}</h1>
              {sol.source_type === 'commercial' ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Commercial</span>
              ) : sol.source_type === 'state_local' ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">State/Local</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Government</span>
              )}
            </div>
            <p className="text-slate-500 mt-1">{sol.source_type === 'commercial' ? sol.company_name : sol.agency}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${
              sol.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {sol.status}
            </span>
            {user && (user.is_admin || (sol.user_id === user.id && sol.source_type !== 'government')) && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm px-3 py-1 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>

        <p className="text-slate-600 mt-4">{sol.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <span className="text-xs text-slate-500">Estimated Value</span>
            <p className="font-semibold">{sol.estimated_value ? `$${sol.estimated_value.toLocaleString()}` : 'N/A'}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">ZIP Code</span>
            <p className="font-semibold">{sol.zip_code}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Posted</span>
            <p className="font-semibold">{sol.posted_date}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Deadline</span>
            <p className="font-semibold">{sol.response_deadline || 'N/A'}</p>
          </div>
        </div>

        <div className="mt-4">
          <span className="text-xs text-slate-500">Categories</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {(sol.categories || []).map(cat => (
              <span key={cat} className="bg-slate-100 text-slate-600 text-sm px-3 py-1 rounded-full">{cat}</span>
            ))}
          </div>
        </div>

        {sol.set_aside_type && (
          <div className="mt-3">
            <span className="text-xs text-slate-500">Set-Aside: </span>
            <span className="bg-amber-50 text-amber-700 text-sm px-2 py-0.5 rounded-full">{sol.set_aside_type}</span>
          </div>
        )}

        {sol.naics_code && (
          <div className="mt-2">
            <span className="text-xs text-slate-500">NAICS: </span>
            <span className="text-sm text-slate-700">{sol.naics_code}</span>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Location & Matched Organizations</h2>
        <MapView
          solicitations={[sol]}
          organizations={matchOrgs}
          center={[sol.lat, sol.lng]}
          zoom={6}
          height="350px"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-700">
            Match Results ({(sol.matches || []).length})
          </h2>
          <button
            onClick={handleGenerateMatches}
            disabled={matching}
            className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {matching ? 'Generating...' : 'Find Matches'}
          </button>
        </div>

        {(sol.matches || []).length > 0 ? (
          <div className="grid gap-4">
            {sol.matches.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-xl text-slate-500">
            No matches yet. Click "Find Matches" to generate AI-scored matches.
          </div>
        )}
      </div>
    </div>
  )
}
