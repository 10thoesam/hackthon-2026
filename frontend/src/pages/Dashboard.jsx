import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboardStats, fetchZipScores, fetchSolicitations, fetchOrganizations, fetchCrisisForecast } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import StatsCard from '../components/StatsCard'
import MapView from '../components/MapView'

const riskBadge = (risk) => {
  switch (risk) {
    case 'critical': return 'bg-red-100 text-red-700'
    case 'high': return 'bg-orange-100 text-orange-700'
    default: return 'bg-amber-100 text-amber-700'
  }
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [zipScores, setZipScores] = useState([])
  const [solicitations, setSolicitations] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [forecast, setForecast] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [mapLayers, setMapLayers] = useState({ need: true, solicitations: true, organizations: true, gaps: false })

  useEffect(() => {
    Promise.all([
      fetchDashboardStats(),
      fetchZipScores(),
      fetchSolicitations(),
      fetchOrganizations(),
    ]).then(([statsRes, zipsRes, solsRes, orgsRes]) => {
      setStats(statsRes.data)
      setZipScores(zipsRes.data)
      setSolicitations(solsRes.data)
      setOrganizations(orgsRes.data)
    }).catch(console.error)
      .finally(() => setLoading(false))

    fetchCrisisForecast()
      .then(res => setForecast(res.data))
      .catch(console.error)
      .finally(() => setForecastLoading(false))
  }, [])

  const categoryBreakdown = useMemo(() => {
    const counts = {}
    solicitations.forEach(s => {
      (s.categories || []).forEach(cat => {
        counts[cat] = (counts[cat] || 0) + 1
      })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  }, [solicitations])

  const maxCatCount = categoryBreakdown.length > 0 ? categoryBreakdown[0][1] : 1

  const coverageGaps = useMemo(() => {
    if (!zipScores.length) return []
    const solZips = new Set(solicitations.map(s => s.zip_code))
    const orgZips = new Set(organizations.map(o => o.zip_code))
    return zipScores
      .filter(z => z.need_score >= 70 && !solZips.has(z.zip_code) && !orgZips.has(z.zip_code))
      .sort((a, b) => b.need_score - a.need_score)
      .slice(0, 8)
  }, [zipScores, solicitations, organizations])

  const filteredSolicitations = mapLayers.solicitations ? solicitations : []
  const filteredOrganizations = mapLayers.organizations ? organizations : []
  const filteredZipScores = mapLayers.need ? zipScores : (mapLayers.gaps ? coverageGaps : [])

  const recentSolicitations = solicitations.slice(0, 5)

  const highestNeedAreas = useMemo(() => {
    return [...zipScores].sort((a, b) => b.need_score - a.need_score).slice(0, 8)
  }, [zipScores])

  const toggleLayer = (layer) => setMapLayers(prev => ({ ...prev, [layer]: !prev[layer] }))

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>
  }

  return (
    <div className="space-y-6">

      {/* Hero */}
      <div style={{ background: '#111827' }} className="rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-white">Crisis Command Center</h1>
              {forecast && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-white/10 text-white/80">
                  {forecast.threat_level}
                </span>
              )}
            </div>
            <p className="text-slate-300 text-sm max-w-xl">
              {forecast ? forecast.headline : 'AI-powered food crisis detection and rapid response coordination'}
            </p>
            <div className="flex gap-3 mt-5">
              {user ? (
                <>
                  <Link to="/post-contract" className="bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
                    Post Contract
                  </Link>
                  <Link to="/join" className="bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors">
                    Register Organization
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
                    Get Started
                  </Link>
                  <Link to="/solicitations" className="bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors">
                    View Solicitations
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end gap-4">
            <div className="text-right">
              <div className="text-4xl font-bold text-white">{stats?.population_at_risk ? (stats.population_at_risk / 1000000).toFixed(1) + 'M' : stats?.avg_need_score || 0}</div>
              <div className="text-slate-400 text-xs">{stats?.population_at_risk ? 'People at Risk' : 'Avg Need Score'}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{stats?.critical_zones || zipScores.filter(z => z.need_score >= 80).length}</div>
              <div className="text-slate-400 text-xs">Critical Zones</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label="Solicitations" value={stats?.total_solicitations || 0} subtitle={`${stats?.open_count || 0} open`} />
        <StatsCard label="Organizations" value={stats?.total_organizations || 0} subtitle={`${stats?.suppliers || 0}S / ${stats?.distributors || 0}D / ${stats?.nonprofits || 0}N`} />
        <StatsCard label="AI Matches" value={stats?.total_matches || 0} subtitle={`${stats?.high_confidence_matches || 0} high confidence`} />
        <StatsCard label="People at Risk" value={stats?.population_at_risk ? `${(stats.population_at_risk / 1000).toFixed(0)}K` : '0'} subtitle={`${stats?.critical_zones || 0} critical zones`} />
      </div>

      {/* AI Threat Assessment */}
      {forecast && forecast.predictions && forecast.predictions.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">AI Threat Assessment</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {forecast.predictions.map((pred, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskBadge(pred.risk)}`}>
                    {pred.risk}
                  </span>
                  <span className="font-medium text-sm text-slate-800">{pred.region}</span>
                </div>
                <p className="text-sm text-slate-600">{pred.prediction}</p>
                <p className="text-xs text-slate-400 mt-2">Action: {pred.recommended_action}</p>
              </div>
            ))}
          </div>
          {forecast.immediate_actions && (
            <div className="mt-3 bg-slate-900 text-white rounded-lg p-4">
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Immediate Actions</h3>
              <ul className="space-y-1">
                {forecast.immediate_actions.map((action, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-slate-500 shrink-0">{i + 1}.</span>
                    {action}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 mt-3">{forecast.estimated_impact}</p>
            </div>
          )}
        </div>
      )}

      {forecastLoading && (
        <div className="bg-slate-100 rounded-lg p-6 text-center">
          <p className="text-sm text-slate-400">Generating AI forecast...</p>
        </div>
      )}

      {/* Map */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Map</h2>
          <div className="flex gap-2">
            {[
              { key: 'need', label: 'Need Scores' },
              { key: 'solicitations', label: 'Solicitations' },
              { key: 'organizations', label: 'Organizations' },
              { key: 'gaps', label: 'Coverage Gaps' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => toggleLayer(f.key)}
                className={`px-3 py-1 rounded-md text-xs transition-colors ${
                  mapLayers[f.key] ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <MapView
              solicitations={filteredSolicitations}
              organizations={filteredOrganizations}
              zipScores={mapLayers.gaps ? coverageGaps : filteredZipScores}
              height="500px"
            />
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-y-auto" style={{ maxHeight: '500px' }}>
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Highest Need</h3>
            <div className="space-y-1">
              {highestNeedAreas.map(z => (
                <div key={z.zip_code} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium text-white ${
                    z.need_score >= 85 ? 'bg-red-500' : z.need_score >= 75 ? 'bg-orange-500' : 'bg-amber-500'
                  }`}>
                    {z.need_score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{z.city}, {z.state}</p>
                    <p className="text-xs text-slate-400">{z.zip_code}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Operations & Match Quality */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Source Breakdown</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Government</span>
                <span className="text-slate-400">{stats?.government_count || 0}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full"
                  style={{ width: `${stats?.total_solicitations ? (stats.government_count / stats.total_solicitations * 100) : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Commercial</span>
                <span className="text-slate-400">{stats?.commercial_count || 0}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-600 rounded-full"
                  style={{ width: `${stats?.total_solicitations ? (stats.commercial_count / stats.total_solicitations * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Match Quality</h3>
          <div className="flex items-center gap-8">
            <div>
              <div className="text-3xl font-bold text-slate-800">{stats?.avg_match_score || 0}</div>
              <div className="text-xs text-slate-400">Avg Score</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-800">{stats?.high_confidence_matches || 0}</div>
              <div className="text-xs text-slate-400">High Confidence</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-800">{stats?.total_matches || 0}</div>
              <div className="text-xs text-slate-400">Total</div>
            </div>
          </div>
          {stats?.total_matches > 0 && (
            <div className="mt-3">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-slate-700" style={{ width: `${(stats.high_confidence_matches / stats.total_matches) * 100}%` }} />
                <div className="h-full bg-slate-300" style={{ width: `${100 - (stats.high_confidence_matches / stats.total_matches) * 100}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1">{Math.round((stats.high_confidence_matches / stats.total_matches) * 100)}% high confidence</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid md:grid-cols-3 gap-4">

        {/* Recent */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Recent Solicitations</h3>
          <div className="space-y-2">
            {recentSolicitations.map(sol => (
              <Link
                key={sol.id}
                to={`/solicitations/${sol.id}`}
                className="block p-2 rounded-md hover:bg-slate-50 transition-colors"
              >
                <p className="text-sm text-slate-700 truncate">{sol.title}</p>
                <p className="text-xs text-slate-400 truncate">{sol.source_type === 'commercial' ? sol.company_name : sol.agency}</p>
              </Link>
            ))}
            {recentSolicitations.length === 0 && (
              <p className="text-sm text-slate-400">No solicitations yet.</p>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Categories</h3>
          <div className="space-y-2">
            {categoryBreakdown.map(([cat, count]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm mb-0.5">
                  <span className="text-slate-600 truncate">{cat}</span>
                  <span className="text-slate-400 text-xs ml-2 shrink-0">{count}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400 rounded-full"
                    style={{ width: `${(count / maxCatCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {categoryBreakdown.length === 0 && (
              <p className="text-sm text-slate-400">No categories yet.</p>
            )}
          </div>
        </div>

        {/* Coverage Gaps */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Coverage Gaps</h3>
          {coverageGaps.length > 0 ? (
            <div className="space-y-2">
              {coverageGaps.map(z => (
                <div key={z.zip_code} className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
                  <div className="w-6 h-6 rounded-md bg-red-500 text-white flex items-center justify-center text-xs font-medium">
                    {z.need_score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{z.city}, {z.state}</p>
                    <p className="text-xs text-slate-400">{z.zip_code} · {(z.food_insecurity_rate * 100).toFixed(0)}% insecure</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">All critical areas covered.</p>
          )}
        </div>
      </div>
    </div>
  )
}
