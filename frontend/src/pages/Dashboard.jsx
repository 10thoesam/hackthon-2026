import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboardStats, fetchZipScores, fetchSolicitations, fetchOrganizations, fetchCrisisForecast, runTriage } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import StatsCard from '../components/StatsCard'
import MapView from '../components/MapView'

const riskBadge = (risk) => {
  switch (risk) {
    case 'critical': return 'bg-red-600/20 text-red-400'
    case 'high': return 'bg-orange-500/20 text-orange-400'
    default: return 'bg-amber-500/20 text-amber-400'
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
  const [triage, setTriage] = useState(null)
  const [triageLoading, setTriageLoading] = useState(false)

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

  const handleTriage = () => {
    setTriageLoading(true)
    runTriage()
      .then(res => setTriage(res.data))
      .catch(console.error)
      .finally(() => setTriageLoading(false))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
  }

  return (
    <div className="space-y-6">

      {/* Hero */}
      <div className="bg-gray-900 rounded-xl p-8 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded">CMD</span>
              <h1 className="text-2xl font-bold text-white">Crisis Command Center</h1>
              {forecast && (
                <span className="text-xs px-2.5 py-0.5 rounded font-medium bg-amber-500/20 text-amber-400">
                  {forecast.threat_level}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm max-w-xl">
              {forecast ? forecast.headline : 'AI-powered food crisis detection and rapid response coordination'}
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleTriage}
                disabled={triageLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {triageLoading ? 'Running Triage...' : 'Run Triage'}
              </button>
              {user ? (
                <>
                  <Link to="/post-contract" className="bg-amber-500 text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-400 transition-colors">
                    Post Contract
                  </Link>
                  <Link to="/join" className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
                    Register Organization
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="bg-amber-500 text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-400 transition-colors">
                    Get Started
                  </Link>
                  <Link to="/solicitations" className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
                    View Solicitations
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end gap-4">
            <div className="text-right">
              <div className="text-4xl font-black text-amber-400">{stats?.population_at_risk ? (stats.population_at_risk / 1000000).toFixed(1) + 'M' : stats?.avg_need_score || 0}</div>
              <div className="text-gray-500 text-xs">{stats?.population_at_risk ? 'People at Risk' : 'Avg Need Score'}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-red-400">{stats?.critical_zones || zipScores.filter(z => z.need_score >= 80).length}</div>
              <div className="text-gray-500 text-xs">Critical Zones</div>
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

      {/* Triage Results */}
      {triageLoading && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-gray-400">Running AI triage across all open solicitations...</p>
          <p className="text-xs text-gray-500 mt-1">Matching organizations to highest-need zones first</p>
        </div>
      )}

      {triage && triage.action_plan && triage.action_plan.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Triage Action Plan — {triage.total_solicitations} solicitations ranked by urgency
            </h2>
            <button
              onClick={() => setTriage(null)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-2">
            {triage.action_plan.map((item) => (
              <Link
                key={item.solicitation.id}
                to={`/solicitations/${item.solicitation.id}`}
                className="block bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                    item.need_score >= 85 ? 'bg-red-600' : item.need_score >= 75 ? 'bg-orange-500' : item.need_score >= 60 ? 'bg-amber-500' : 'bg-gray-600'
                  }`}>
                    #{item.priority}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{item.solicitation.title}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 shrink-0">
                        {item.solicitation.source_type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {item.solicitation.agency} · ZIP {item.solicitation.zip_code} · Need: {item.need_score}
                      {item.solicitation.estimated_value ? ` · $${item.solicitation.estimated_value.toLocaleString()}` : ''}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    {item.top_match ? (
                      <>
                        <p className="text-sm font-bold text-white">{item.top_match.organization_name}</p>
                        <p className="text-xs text-gray-500">
                          Score: {item.top_match.score} · {item.top_match.distance_miles} mi
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">No matches found</p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded font-medium ${
                      item.recommended_action.startsWith('Deploy') ? 'bg-red-600/20 text-red-400' :
                      item.recommended_action.startsWith('Contact') ? 'bg-amber-500/20 text-amber-400' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {item.recommended_action.split('—')[0].trim()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* AI Threat Assessment */}
      {forecast && forecast.predictions && forecast.predictions.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">AI Threat Assessment</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {forecast.predictions.map((pred, i) => (
              <div key={i} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${riskBadge(pred.risk)}`}>
                    {pred.risk}
                  </span>
                  <span className="font-bold text-sm text-white">{pred.region}</span>
                </div>
                <p className="text-sm text-gray-300">{pred.prediction}</p>
                <p className="text-xs text-gray-500 mt-2">Action: {pred.recommended_action}</p>
              </div>
            ))}
          </div>
          {forecast.immediate_actions && (
            <div className="mt-3 bg-gray-900 border border-red-600/30 rounded-xl p-4">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Immediate Actions</h3>
              <ul className="space-y-1">
                {forecast.immediate_actions.map((action, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-gray-600 shrink-0">{i + 1}.</span>
                    {action}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-3">{forecast.estimated_impact}</p>
            </div>
          )}
        </div>
      )}

      {forecastLoading && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-400">Generating AI forecast...</p>
        </div>
      )}

      {/* Map */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Map</h2>
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
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  mapLayers[f.key] ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'
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
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 overflow-y-auto" style={{ maxHeight: '500px' }}>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Highest Need</h3>
            <div className="space-y-1">
              {highestNeedAreas.map(z => (
                <div key={z.zip_code} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-800">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white ${
                    z.need_score >= 85 ? 'bg-red-600' : z.need_score >= 75 ? 'bg-orange-500' : 'bg-amber-500'
                  }`}>
                    {z.need_score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{z.city}, {z.state}</p>
                    <p className="text-xs text-gray-500">{z.zip_code}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Operations & Match Quality */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Source Breakdown</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-300">Government</span>
                <span className="text-gray-500">{stats?.government_count || 0}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${stats?.total_solicitations ? (stats.government_count / stats.total_solicitations * 100) : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-300">Commercial</span>
                <span className="text-gray-500">{stats?.commercial_count || 0}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${stats?.total_solicitations ? (stats.commercial_count / stats.total_solicitations * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Match Quality</h3>
          <div className="flex items-center gap-8">
            <div>
              <div className="text-3xl font-black text-amber-400">{stats?.avg_match_score || 0}</div>
              <div className="text-xs text-gray-500">Avg Score</div>
            </div>
            <div>
              <div className="text-3xl font-black text-white">{stats?.high_confidence_matches || 0}</div>
              <div className="text-xs text-gray-500">High Confidence</div>
            </div>
            <div>
              <div className="text-3xl font-black text-white">{stats?.total_matches || 0}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>
          {stats?.total_matches > 0 && (
            <div className="mt-3">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-amber-500" style={{ width: `${(stats.high_confidence_matches / stats.total_matches) * 100}%` }} />
                <div className="h-full bg-gray-700" style={{ width: `${100 - (stats.high_confidence_matches / stats.total_matches) * 100}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{Math.round((stats.high_confidence_matches / stats.total_matches) * 100)}% high confidence</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid md:grid-cols-3 gap-4">

        {/* Recent */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Solicitations</h3>
          <div className="space-y-2">
            {recentSolicitations.map(sol => (
              <Link
                key={sol.id}
                to={`/solicitations/${sol.id}`}
                className="block p-2 rounded-md hover:bg-gray-800 transition-colors"
              >
                <p className="text-sm text-white truncate">{sol.title}</p>
                <p className="text-xs text-gray-500 truncate">{sol.source_type === 'commercial' ? sol.company_name : sol.agency}</p>
              </Link>
            ))}
            {recentSolicitations.length === 0 && (
              <p className="text-sm text-gray-500">No solicitations yet.</p>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Categories</h3>
          <div className="space-y-2">
            {categoryBreakdown.map(([cat, count]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm mb-0.5">
                  <span className="text-gray-300 truncate">{cat}</span>
                  <span className="text-gray-500 text-xs ml-2 shrink-0">{count}</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${(count / maxCatCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {categoryBreakdown.length === 0 && (
              <p className="text-sm text-gray-500">No categories yet.</p>
            )}
          </div>
        </div>

        {/* Coverage Gaps */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Coverage Gaps</h3>
          {coverageGaps.length > 0 ? (
            <div className="space-y-2">
              {coverageGaps.map(z => (
                <div key={z.zip_code} className="flex items-center gap-2 p-2 bg-gray-800 rounded-md">
                  <div className="w-6 h-6 rounded-md bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                    {z.need_score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{z.city}, {z.state}</p>
                    <p className="text-xs text-gray-500">{z.zip_code} · {(z.food_insecurity_rate * 100).toFixed(0)}% insecure</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">All critical areas covered.</p>
          )}
        </div>
      </div>
    </div>
  )
}
