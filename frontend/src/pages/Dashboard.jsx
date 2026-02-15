import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboardStats, fetchZipScores, fetchSolicitations, fetchOrganizations, fetchMatches } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import StatsCard from '../components/StatsCard'
import MapView from '../components/MapView'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [zipScores, setZipScores] = useState([])
  const [solicitations, setSolicitations] = useState([])
  const [organizations, setOrganizations] = useState([])
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
  }, [])

  // #5 - Category breakdown (computed from solicitations)
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

  // #6 - Coverage gaps (high need zips with no nearby solicitations/orgs)
  const coverageGaps = useMemo(() => {
    if (!zipScores.length) return []

    const solZips = new Set(solicitations.map(s => s.zip_code))
    const orgZips = new Set(organizations.map(o => o.zip_code))

    return zipScores
      .filter(z => z.need_score >= 70 && !solZips.has(z.zip_code) && !orgZips.has(z.zip_code))
      .sort((a, b) => b.need_score - a.need_score)
      .slice(0, 8)
  }, [zipScores, solicitations, organizations])

  // #9 - Risk radar alerts (simulated based on real data)
  const riskAlerts = useMemo(() => {
    const alerts = []

    // High need areas without coverage
    const criticalGaps = zipScores.filter(z => z.need_score >= 85)
    if (criticalGaps.length > 0) {
      alerts.push({
        level: 'red',
        title: 'Critical Food Insecurity',
        message: `${criticalGaps.length} areas with need scores above 85 require immediate attention`,
        icon: '!',
      })
    }

    // Hurricane season - Gulf Coast check
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

    // Unmatched solicitations
    const unmatchedCount = solicitations.filter(s => s.status === 'open').length
    if (unmatchedCount > 5) {
      alerts.push({
        level: 'amber',
        title: 'Open Solicitations Backlog',
        message: `${unmatchedCount} open solicitations awaiting organization matches`,
        icon: '?',
      })
    }

    // Coverage gaps
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

  // #10 - Filtered map data
  const filteredSolicitations = mapLayers.solicitations ? solicitations : []
  const filteredOrganizations = mapLayers.organizations ? organizations : []
  const filteredZipScores = mapLayers.need ? zipScores : (mapLayers.gaps ? coverageGaps : [])

  // #4 - Recent solicitations
  const recentSolicitations = solicitations.slice(0, 5)

  // #3 - Highest need areas
  const highestNeedAreas = useMemo(() => {
    return [...zipScores].sort((a, b) => b.need_score - a.need_score).slice(0, 8)
  }, [zipScores])

  const toggleLayer = (layer) => setMapLayers(prev => ({ ...prev, [layer]: !prev[layer] }))

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">

      {/* #1 - Hero Banner */}
      <div className="bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">FoodMatch</h1>
            <p className="text-green-100 mt-2 text-lg">AI-powered food supply chain resilience for disaster preparedness</p>
            <p className="text-green-200 mt-1 text-sm">Connecting government agencies, commercial distributors, and nonprofits to ensure food reaches those who need it most.</p>
            <div className="flex gap-3 mt-4">
              {user ? (
                <>
                  <Link to="/post-contract" className="bg-white text-green-700 px-5 py-2 rounded-lg font-medium text-sm hover:bg-green-50 transition-colors">
                    Post a Contract
                  </Link>
                  <Link to="/join" className="bg-green-800 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-green-900 transition-colors border border-green-500">
                    Register Organization
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="bg-white text-green-700 px-5 py-2 rounded-lg font-medium text-sm hover:bg-green-50 transition-colors">
                    Join the Network
                  </Link>
                  <Link to="/solicitations/government" className="bg-green-800 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-green-900 transition-colors border border-green-500">
                    Browse Opportunities
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end text-right">
            <div className="text-5xl font-bold">{stats?.avg_need_score || 0}</div>
            <div className="text-green-200 text-sm">Avg National Need Score</div>
            <div className="text-4xl font-bold mt-2">{zipScores.length}</div>
            <div className="text-green-200 text-sm">Monitored ZIP Codes</div>
          </div>
        </div>
      </div>

      {/* #9 - Risk Radar */}
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

      {/* #2 - Stats Cards with icons and subtitles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="Solicitations"
          value={stats?.total_solicitations || 0}
          subtitle={`${stats?.open_count || 0} open`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          color="blue"
        />
        <StatsCard
          label="Organizations"
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
          label="Avg Need Score"
          value={stats?.avg_need_score || 0}
          subtitle={`${zipScores.filter(z => z.need_score >= 80).length} critical areas`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
          color="orange"
        />
      </div>

      {/* #7 - Government vs Commercial Split */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Solicitation Breakdown</h3>
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
            {stats?.open_count || 0} of {stats?.total_solicitations || 0} currently open
          </div>
        </div>

        {/* #8 - Match Quality Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Match Quality</h3>
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
            <p className="text-xs text-slate-400 mt-3">No matches generated yet. Run "Find Matches" on a solicitation to start.</p>
          )}
        </div>
      </div>

      {/* #3 - Split Map + Highest Need Areas & #10 - Map Filters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-700">National Overview</h2>
          {/* #10 - Interactive Map Filters */}
          <div className="flex gap-2">
            {[
              { key: 'need', label: 'Need Scores', activeColor: 'bg-orange-100 text-orange-700 border-orange-300' },
              { key: 'solicitations', label: 'Solicitations', activeColor: 'bg-blue-100 text-blue-700 border-blue-300' },
              { key: 'organizations', label: 'Organizations', activeColor: 'bg-green-100 text-green-700 border-green-300' },
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

        {/* #3 - Split layout: Map + Highest Need List */}
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

      {/* Bottom row: Recent Activity + Categories + Coverage Gaps */}
      <div className="grid md:grid-cols-3 gap-4">

        {/* #4 - Recent Activity Feed */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Latest Solicitations</h3>
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
                    sol.source_type === 'commercial' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {sol.source_type === 'commercial' ? 'COM' : 'GOV'}
                  </span>
                </div>
                {sol.estimated_value && (
                  <p className="text-xs text-green-600 font-medium mt-1">${sol.estimated_value.toLocaleString()}</p>
                )}
              </Link>
            ))}
            {recentSolicitations.length === 0 && (
              <p className="text-sm text-slate-400">No solicitations yet.</p>
            )}
          </div>
        </div>

        {/* #5 - Category Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Categories</h3>
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

        {/* #6 - Coverage Gaps */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Coverage Gaps</h3>
          <p className="text-xs text-slate-400 mb-3">High-need areas with no active solicitations or organizations</p>
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
              <p className="text-sm text-green-600 font-medium">All high-need areas covered</p>
              <p className="text-xs text-slate-400">Every area with need score 70+ has active solicitations or organizations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
