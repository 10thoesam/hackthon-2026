import { useState, useEffect } from 'react'
import { fetchPredictions, fetchSurplusMatching, fetchWasteReduction, fetchOrganizations } from '../utils/api'
import MapView from '../components/MapView'

const SEVERITY_COLORS = {
  critical: 'bg-red-600/20 text-red-400 border-red-600/30',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  elevated: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  moderate: 'bg-green-600/20 text-green-400 border-green-600/30',
}

export default function Predictions() {
  const [predictions, setPredictions] = useState(null)
  const [surplusMatches, setSurplusMatches] = useState(null)
  const [waste, setWaste] = useState(null)
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('predictions')
  const [severityFilter, setSeverityFilter] = useState('')
  const [selectedZip, setSelectedZip] = useState(null)
  const [timeHorizon, setTimeHorizon] = useState(30)

  useEffect(() => {
    Promise.all([
      fetchPredictions().then(r => r.data),
      fetchSurplusMatching().then(r => r.data),
      fetchWasteReduction().then(r => r.data),
      fetchOrganizations().then(r => r.data),
    ])
      .then(([pred, surplus, wasteData, orgData]) => {
        setPredictions(pred)
        setSurplusMatches(surplus)
        setWaste(wasteData)
        setOrgs(orgData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-12 text-gray-400">Running ML prediction model...</div>

  const filteredPredictions = predictions?.predictions?.filter(p =>
    !severityFilter || p.severity === severityFilter
  ) || []

  const probKey = timeHorizon === 30 ? 'probability_30_days' : timeHorizon === 60 ? 'probability_60_days' : 'probability_90_days'

  const mapSolicitations = filteredPredictions.map(p => ({
    id: p.zip_code, lat: p.lat, lng: p.lng,
    title: `${p.city}, ${p.state}`, zip_code: p.zip_code,
    need_score: p.composite_risk,
  }))

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-1">
          <span className="bg-amber-500 text-black text-xs font-black px-2 py-0.5 rounded">AI</span>
          <h1 className="text-xl font-bold text-white">Predictive Intelligence</h1>
        </div>
        <p className="text-sm text-gray-400">ML-powered food insecurity forecasting with climate and socioeconomic data</p>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-xl p-1">
        {[
          { key: 'predictions', label: 'Food Insecurity Forecast' },
          { key: 'surplus', label: 'Surplus-to-Shortage Matching' },
          { key: 'waste', label: 'Waste Reduction' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* === PREDICTIONS TAB === */}
      {tab === 'predictions' && predictions && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400">Zones Monitored</p>
              <p className="text-xl font-bold text-white">{predictions.summary.total_zones}</p>
            </div>
            <div className="bg-gray-900 border border-red-600/30 rounded-lg p-3">
              <p className="text-xs text-red-400">Critical</p>
              <p className="text-xl font-bold text-red-400">{predictions.summary.critical}</p>
            </div>
            <div className="bg-gray-900 border border-amber-500/30 rounded-lg p-3">
              <p className="text-xs text-amber-400">High Risk</p>
              <p className="text-xl font-bold text-amber-400">{predictions.summary.high}</p>
            </div>
            <div className="bg-gray-900 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-xs text-yellow-400">Elevated</p>
              <p className="text-xl font-bold text-yellow-400">{predictions.summary.elevated}</p>
            </div>
            <div className="bg-gray-900 border border-green-600/30 rounded-lg p-3">
              <p className="text-xs text-green-400">Moderate</p>
              <p className="text-xl font-bold text-green-400">{predictions.summary.moderate}</p>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400">Coverage Gaps</p>
              <p className="text-xl font-bold text-red-400">{predictions.summary.coverage_gaps}</p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <p className="text-sm text-gray-400">
              <span className="font-bold text-white">{predictions.summary.total_population_at_risk.toLocaleString()}</span> people
              in critical and high-risk zones. Model factors: socioeconomic vulnerability (35%), climate risk (25%), food desert score (25%), baseline need (15%).
              Accounts for racial demographics, SNAP participation, geographic disaster susceptibility.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Severity:</span>
              {['', 'critical', 'high', 'elevated', 'moderate'].map(s => (
                <button key={s} onClick={() => setSeverityFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    severityFilter === s ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'
                  }`}>
                  {s || 'All'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Forecast:</span>
              {[30, 60, 90].map(d => (
                <button key={d} onClick={() => setTimeHorizon(d)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    timeHorizon === d ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'
                  }`}>
                  {d} days
                </button>
              ))}
            </div>
          </div>

          {/* Map */}
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Food Insecurity Risk Map</h2>
            <MapView solicitations={mapSolicitations} organizations={orgs} height="400px" />
          </div>

          {/* Prediction cards */}
          <div className="grid gap-3">
            {filteredPredictions.map(p => (
              <div key={p.zip_code}
                className={`border rounded-xl p-4 cursor-pointer transition-colors ${
                  selectedZip === p.zip_code ? 'ring-2 ring-amber-500' : ''
                } ${SEVERITY_COLORS[p.severity]}`}
                onClick={() => setSelectedZip(selectedZip === p.zip_code ? null : p.zip_code)}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{p.city}, {p.state}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-black/20 font-bold">{p.severity.toUpperCase()}</span>
                      {p.coverage_status === 'gap' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-600/30 text-red-400 font-bold">COVERAGE GAP</span>
                      )}
                    </div>
                    <p className="text-xs mt-1 text-gray-400">ZIP {p.zip_code} — Pop: {p.population.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-white">{p[probKey]}%</p>
                    <p className="text-xs text-gray-400">{timeHorizon}-day probability</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mt-3 text-xs">
                  <div>
                    <span className="text-gray-500">Risk Score</span>
                    <p className="font-bold text-white">{p.composite_risk}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Food Insecurity</span>
                    <p className="font-bold text-white">{p.food_insecurity_rate}%</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Climate Risk</span>
                    <p className="font-bold text-white">{p.climate_risk}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Food Desert</span>
                    <p className="font-bold text-white">{p.food_desert_score}</p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {p.disaster_types.map(d => (
                    <span key={d} className="text-xs px-2 py-0.5 bg-black/20 rounded">{d}</span>
                  ))}
                  <span className="text-xs px-2 py-0.5 bg-black/20 rounded">{p.nearby_organizations} orgs nearby</span>
                </div>

                {selectedZip === p.zip_code && (
                  <div className="mt-4 pt-4 border-t border-current/10">
                    <h4 className="text-sm font-bold text-white mb-2">
                      This area will need emergency distribution in next {timeHorizon} days ({p[probKey]}% probability):
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {p.needed_supplies.map((s, i) => (
                        <div key={i} className="bg-black/20 rounded p-2">
                          <p className="text-xs font-medium text-gray-300">{s.name}</p>
                          <p className="text-sm font-bold text-white">{s.quantity.toLocaleString()} {s.unit}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">SNAP Rate</span>
                        <p className="font-bold text-white">{p.snap_participation_rate}%</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Socioeconomic Vuln.</span>
                        <p className="font-bold text-white">{p.socioeconomic_vulnerability}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">30d / 60d / 90d</span>
                        <p className="font-bold text-white">{p.probability_30_days}% / {p.probability_60_days}% / {p.probability_90_days}%</p>
                      </div>
                    </div>

                    {p.nearby_organizations > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-gray-300 mb-1">Local Vendors & Organizations:</p>
                        <div className="flex flex-wrap gap-1">
                          {orgs.filter(o => {
                            const dlat = Math.abs(o.lat - p.lat)
                            const dlng = Math.abs(o.lng - p.lng)
                            return dlat < 1.5 && dlng < 1.5
                          }).slice(0, 5).map(o => (
                            <span key={o.id} className="text-xs px-2 py-0.5 bg-black/30 rounded text-gray-300">
                              {o.name} ({o.org_type})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === SURPLUS MATCHING TAB === */}
      {tab === 'surplus' && surplusMatches && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <p className="text-sm text-gray-400">
              <span className="font-bold text-white">{surplusMatches.total_shortage_areas}</span> food desert / shortage areas identified.
              <span className="font-bold text-white"> {surplusMatches.total_matched}</span> matched with surplus vendors to prevent waste and expand coverage nationally.
            </p>
          </div>

          <div className="grid gap-4">
            {surplusMatches.matches.map((m, i) => (
              <div key={i} className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white">
                      {m.shortage_area.city}, {m.shortage_area.state}
                      <span className="text-xs ml-2 px-2 py-0.5 rounded bg-red-600/20 text-red-400 font-bold">FOOD DESERT</span>
                    </h3>
                    <p className="text-sm text-gray-400">
                      ZIP {m.shortage_area.zip_code} — Pop: {m.shortage_area.population.toLocaleString()} —
                      Need: {m.shortage_area.need_score} — Food Insecurity: {m.shortage_area.food_insecurity_rate}%
                    </p>
                  </div>
                </div>
                {m.matched_suppliers.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Matched Surplus Vendors:</p>
                    {m.matched_suppliers.map((s, j) => (
                      <div key={j} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">{s.organization.name}</p>
                          <p className="text-xs text-gray-400">
                            {s.organization.org_type} — {s.distance_miles} mi away
                            {s.available_capacity > 0 && ` — ${s.available_capacity} units pre-registered`}
                          </p>
                          {s.supply_types.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {s.supply_types.map(t => (
                                <span key={t} className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">{t.replace(/_/g, ' ')}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-amber-400">{s.score}</p>
                          <p className="text-xs text-gray-500">match score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-red-400 font-bold">No surplus vendors in range — critical gap</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === WASTE REDUCTION TAB === */}
      {tab === 'waste' && waste && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-900 border border-green-600/30 rounded-lg p-4">
              <p className="text-xs text-green-400">Waste Reduction Score</p>
              <p className="text-3xl font-black text-green-400">{waste.waste_reduction_score}/100</p>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400">Food Rescued</p>
              <p className="text-2xl font-bold text-white">{waste.total_lbs_rescued.toLocaleString()} lbs</p>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400">Meals Provided</p>
              <p className="text-2xl font-bold text-white">{waste.meals_provided.toLocaleString()}</p>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400">Value Saved</p>
              <p className="text-2xl font-bold text-amber-400">${waste.total_value_saved.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-300 mb-3">Environmental Impact</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400">CO2 Emissions Prevented</p>
                  <p className="text-xl font-bold text-white">{waste.co2_saved_lbs.toLocaleString()} lbs</p>
                  <p className="text-xs text-gray-500">~3.8 lbs CO2 per lb of food waste prevented</p>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, waste.waste_reduction_score)}%` }} />
                </div>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-300 mb-3">Expiring Inventory Alert</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400">Items Expiring Within 30 Days</p>
                  <p className="text-xl font-bold text-amber-400">{waste.expiring_soon_items}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Potential Waste if Not Redistributed</p>
                  <p className="text-xl font-bold text-red-400">{waste.potential_waste_lbs.toLocaleString()} lbs</p>
                </div>
                <p className="text-xs text-gray-500">Surplus-to-shortage matching helps redirect expiring inventory to high-need areas before it goes to waste.</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-300 mb-2">How Waste Reduction Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
              <div>
                <p className="font-bold text-white mb-1">1. Identify Surplus</p>
                <p>ML model identifies vendors with excess inventory or expiring stock that would otherwise go to waste.</p>
              </div>
              <div>
                <p className="font-bold text-white mb-1">2. Match to Shortage</p>
                <p>Algorithm matches surplus to food desert areas and high-need zones, optimizing for distance and urgency.</p>
              </div>
              <div>
                <p className="font-bold text-white mb-1">3. Track Impact</p>
                <p>Every rescued pound is tracked — meals provided, CO2 prevented, and cost savings for the supply chain.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
