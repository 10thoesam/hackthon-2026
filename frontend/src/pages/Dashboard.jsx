import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboardStats, fetchZipScores, fetchSolicitations, fetchOrganizations, fetchCrisisForecast } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import StatsCard from '../components/StatsCard'
import MapView from '../components/MapView'

const threatColors = {
  SEVERE: { bg: 'bg-red-700', text: 'text-red-100', border: 'border-red-500', pulse: true },
  HIGH: { bg: 'bg-red-600', text: 'text-red-100', border: 'border-red-400', pulse: true },
  ELEVATED: { bg: 'bg-orange-600', text: 'text-orange-100', border: 'border-orange-400', pulse: false },
  MODERATE: { bg: 'bg-amber-600', text: 'text-amber-100', border: 'border-amber-400', pulse: false },
}

const riskBadge = (risk) => {
  switch (risk) {
    case 'critical': return 'bg-red-600 text-white'
    case 'high': return 'bg-orange-500 text-white'
    default: return 'bg-amber-500 text-white'
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

  const riskAlerts = useMemo(() => {
    const alerts = []
    const criticalGaps = zipScores.filter(z => z.need_score >= 85)
    if (criticalGaps.length > 0) {
      alerts.push({
        level: 'red',
        title: 'Critical Food Insecurity',
        message: `${criticalGaps.length} areas with need scores above 85 require immediate intervention`,
        icon: '!',
      })
    }
    const gulfStates = ['TX', 'LA', 'MS', 'AL', 'FL']
    const gulfSolicitations = solicitations.filter(s =>
      zipScores.find(z => z.zip_code === s.zip_code && gulfStates.includes(z.state))
    )
    if (gulfSolicitations.length > 0) {
      alerts.push({
        level: 'amber',
        title: 'Hurricane Season Preparedness',
        message: `${gulfSolicitations.length} active contracts in Gulf Coast hurricane zone — verify cold chain & staging readiness`,
        icon: '~',
      })
    }
    const unmatchedCount = solicitations.filter(s => s.status === 'open').length
    if (unmatchedCount > 5) {
      alerts.push({
        level: 'amber',
        title: 'Open Solicitations Backlog',
        message: `${unmatchedCount} open solicitations awaiting organization matches`,
        icon: '?',
      })
    }
    if (coverageGaps.length >= 3) {
      alerts.push({
        level: 'red',
        title: 'Coverage Gaps Detected',
        message: `${coverageGaps.length} high-need areas have zero active solicitations or organizations`,
        icon: '!',
      })
    }
    return alerts
  }, [solicitations, zipScores, coverageGaps])

  const filteredSolicitations = mapLayers.solicitations ? solicitations : []
  const filteredOrganizations = mapLayers.organizations ? organizations : []
  const filteredZipScores = mapLayers.need ? zipScores : (mapLayers.gaps ? coverageGaps : [])

  const recentSolicitations = solicitations.slice(0, 5)

  const highestNeedAreas = useMemo(() => {
    return [...zipScores].sort((a, b) => b.need_score - a.need_score).slice(0, 8)
  }, [zipScores])

  const toggleLayer = (layer) => setMapLayers(prev => ({ ...prev, [layer]: !prev[layer] }))

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Loading crisis dashboard...</div>
  }

  const tc = forecast ? (threatColors[forecast.threat_level] || threatColors.ELEVATED) : threatColors.ELEVATED

  return (
    <div className="space-y-6">

      {/* HERO - Crisis Command Center */}
      <div style={{ background: '#1a1a2e' }} className="rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 80% 20%, #991b1b 0%, transparent 50%), radial-gradient(circle at 20% 80%, #9a3412 0%, transparent 50%)' }}></div>
        <div className="relative flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">FoodMatch Crisis Command</h1>
              {forecast && (
                <span className={`text-xs px-3 py-1 rounded-full font-bold ${tc.bg} ${tc.text} ${tc.pulse ? 'animate-pulse' : ''}`}>
                  THREAT LEVEL: {forecast.threat_level}
                </span>
              )}
            </div>
            <p className="text-orange-300 text-lg font-medium">
              {forecast ? forecast.headline : 'AI-powered food crisis detection and rapid response coordination'}
            </p>
            <p className="text-slate-300 mt-1 text-sm max-w-2xl">
              {forecast ? forecast.situation_summary : 'Monitoring food insecurity across the nation. Connecting agencies, distributors, and nonprofits to prevent catastrophic food shortages.'}
            </p>
            <div className="flex gap-3 mt-5">
              {user ? (
                <>
                  <Link to="/post-contract" className="bg-red-600 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-red-700 transition-colors">
                    Deploy Emergency Contract
                  </Link>
                  <Link to="/join" className="bg-slate-700 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-slate-600 transition-colors border border-slate-500">
                    Register Response Org
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="bg-red-600 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-red-700 transition-colors">
                    Join Crisis Response
                  </Link>
                  <Link to="/solicitations" className="bg-slate-700 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-slate-600 transition-colors border border-slate-500">
                    View Active Operations
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end text-right gap-3">
            <div>
              <div className="text-5xl font-bold text-red-300">{stats?.population_at_risk ? (stats.population_at_risk / 1000000).toFixed(1) + 'M' : stats?.avg_need_score || 0}</div>
              <div className="text-slate-300 text-sm">{stats?.population_at_risk ? 'People at Risk' : 'Avg Need Score'}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-300">{stats?.critical_zones || zipScores.filter(z => z.need_score >= 80).length}</div>
              <div className="text-slate-300 text-sm">Critical Zones</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{zipScores.length}</div>
              <div className="text-slate-300 text-sm">Monitored Areas</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Threat Assessment */}
      {forecast && forecast.predictions && forecast.predictions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            AI Threat Assessment
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {forecast.predictions.map((pred, i) => (
              <div key={i} className={`rounded-xl border p-4 ${
                pred.risk === 'critical' ? 'bg-red-50 border-red-200' :
                pred.risk === 'high' ? 'bg-orange-50 border-orange-200' :
                'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${riskBadge(pred.risk)}`}>
                    {pred.risk}
                  </span>
                  <span className="font-semibold text-sm text-slate-800">{pred.region}</span>
                </div>
                <p className="text-sm text-slate-700">{pred.prediction}</p>
                <p className="text-xs text-slate-500 mt-2 italic">Action: {pred.recommended_action}</p>
              </div>
            ))}
          </div>
          {forecast.immediate_actions && (
            <div className="mt-3 bg-slate-900 text-white rounded-xl p-4">
              <h3 className="text-sm font-bold text-red-400 mb-2">IMMEDIATE ACTIONS REQUIRED</h3>
              <ul className="space-y-1">
                {forecast.immediate_actions.map((action, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-red-400 font-bold shrink-0">{i + 1}.</span>
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
        <div className="bg-slate-100 rounded-xl p-6 text-center">
          <div className="animate-pulse text-slate-500">
            <p className="font-medium">AI analyzing threat data...</p>
            <p className="text-sm mt-1">Generating crisis forecast from {zipScores.length} monitored zones</p>
          </div>
        </div>
      )}

      {/* Risk Radar */}
      {riskAlerts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Risk Radar
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {riskAlerts.map((alert, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 flex items-start gap-3 ${
                  alert.level === 'red'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  alert.level === 'red'
                    ? 'bg-red-200 text-red-700'
                    : 'bg-amber-200 text-amber-700'
                }`}>
                  {alert.icon}
                </div>
                <div>
                  <p className={`font-semibold text-sm ${
                    alert.level === 'red' ? 'text-red-800' : 'text-amber-800'
                  }`}>{alert.title}</p>
                  <p className={`text-xs mt-0.5 ${
                    alert.level === 'red' ? 'text-red-600' : 'text-amber-600'
                  }`}>{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="Active Operations"
          value={stats?.total_solicitations || 0}
          subtitle={`${stats?.open_count || 0} requiring response`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          color="blue"
        />
        <StatsCard
          label="Response Orgs"
          value={stats?.total_organizations || 0}
          subtitle={`${stats?.suppliers || 0}S / ${stats?.distributors || 0}D / ${stats?.nonprofits || 0}N`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
          color="green"
        />
        <StatsCard
          label="AI Matches"
          value={stats?.total_matches || 0}
          subtitle={`${stats?.high_confidence_matches || 0} high confidence`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          color="purple"
        />
        <StatsCard
          label="People at Risk"
          value={stats?.population_at_risk ? `${(stats.population_at_risk / 1000).toFixed(0)}K` : '0'}
          subtitle={`${stats?.critical_zones || 0} critical zones`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
          color="red"
        />
      </div>

      {/* Government vs Commercial Split + Match Quality */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Operations Breakdown</h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-blue-700 font-medium">Government</span>
                <span className="text-slate-500">{stats?.government_count || 0}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${stats?.total_solicitations ? (stats.government_count / stats.total_solicitations * 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-purple-700 font-medium">Commercial</span>
                <span className="text-slate-500">{stats?.commercial_count || 0}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${stats?.total_solicitations ? (stats.commercial_count / stats.total_solicitations * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            {stats?.open_count || 0} of {stats?.total_solicitations || 0} currently active
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">AI Match Quality</h3>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{stats?.avg_match_score || 0}</div>
              <div className="text-xs text-slate-500">Avg Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats?.high_confidence_matches || 0}</div>
              <div className="text-xs text-slate-500">High Confidence (80+)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-600">{stats?.total_matches || 0}</div>
              <div className="text-xs text-slate-500">Total Matches</div>
            </div>
          </div>
          {stats?.total_matches > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Match confidence distribution</span>
                <span>{Math.round((stats.high_confidence_matches / stats.total_matches) * 100)}% high</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${(stats.high_confidence_matches / stats.total_matches) * 100}%` }}
                />
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${100 - (stats.high_confidence_matches / stats.total_matches) * 100}%` }}
                />
              </div>
            </div>
          )}
          {stats?.total_matches === 0 && (
            <p className="text-xs text-slate-400 mt-3">No matches generated yet. Run "Find Matches" on a solicitation to deploy AI matching.</p>
          )}
        </div>
      </div>

      {/* Map + Highest Need Areas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-700">Crisis Map — National Overview</h2>
          <div className="flex gap-2">
            {[
              { key: 'need', label: 'Need Scores', activeColor: 'bg-orange-100 text-orange-700 border-orange-300' },
              { key: 'solicitations', label: 'Operations', activeColor: 'bg-blue-100 text-blue-700 border-blue-300' },
              { key: 'organizations', label: 'Response Orgs', activeColor: 'bg-green-100 text-green-700 border-green-300' },
              { key: 'gaps', label: 'Coverage Gaps', activeColor: 'bg-red-100 text-red-700 border-red-300' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => toggleLayer(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  mapLayers[f.key] ? f.activeColor : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
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
          <div className="bg-white border border-slate-200 rounded-xl p-4 overflow-y-auto" style={{ maxHeight: '500px' }}>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Highest Need Areas</h3>
            <div className="space-y-2">
              {highestNeedAreas.map(z => (
                <div key={z.zip_code} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    z.need_score >= 85 ? 'bg-red-500' : z.need_score >= 75 ? 'bg-orange-500' : 'bg-amber-500'
                  }`}>
                    {z.need_score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{z.city}, {z.state}</p>
                    <p className="text-xs text-slate-500">{z.zip_code} &middot; Pop: {z.population?.toLocaleString()}</p>
                  </div>
                  <div className="w-16">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          z.need_score >= 85 ? 'bg-red-500' : z.need_score >= 75 ? 'bg-orange-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${z.need_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid md:grid-cols-3 gap-4">

        {/* Recent Activity */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Latest Operations</h3>
          <div className="space-y-3">
            {recentSolicitations.map(sol => (
              <Link
                key={sol.id}
                to={`/solicitations/${sol.id}`}
                className="block p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{sol.title}</p>
                    <p className="text-xs text-slate-500 truncate">{sol.source_type === 'commercial' ? sol.company_name : sol.agency}</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ml-2 ${
                    sol.source_type === 'commercial' ? 'bg-purple-100 text-purple-700' :
                    sol.source_type === 'state_local' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {sol.source_type === 'commercial' ? 'COM' : sol.source_type === 'state_local' ? 'S/L' : 'GOV'}
                  </span>
                </div>
                {sol.estimated_value && (
                  <p className="text-xs text-green-600 font-medium mt-1">${sol.estimated_value.toLocaleString()}</p>
                )}
              </Link>
            ))}
            {recentSolicitations.length === 0 && (
              <p className="text-sm text-slate-400">No active operations.</p>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Response Categories</h3>
          <div className="space-y-2">
            {categoryBreakdown.map(([cat, count]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm mb-0.5">
                  <span className="text-slate-700 truncate">{cat}</span>
                  <span className="text-slate-400 text-xs ml-2 shrink-0">{count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
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
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-red-700 mb-1">Unprotected Zones</h3>
          <p className="text-xs text-slate-400 mb-3">Critical areas with no active operations or response organizations</p>
          {coverageGaps.length > 0 ? (
            <div className="space-y-2">
              {coverageGaps.map(z => (
                <div key={z.zip_code} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-100">
                  <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">
                    {z.need_score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800 truncate">{z.city}, {z.state}</p>
                    <p className="text-xs text-red-500">{z.zip_code} &middot; Insecurity: {(z.food_insecurity_rate * 100).toFixed(0)}%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-2xl mb-1">&#10003;</div>
              <p className="text-sm text-green-600 font-medium">All critical areas covered</p>
              <p className="text-xs text-slate-400">Every area with need score 70+ has active operations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
