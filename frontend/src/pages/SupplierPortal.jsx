import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchOrganizations, fetchSupplierMatches, federalTriMatch } from '../utils/api'

const CATEGORIES = [
  'fresh produce', 'cold storage', 'last mile delivery', 'warehouse distribution',
  'refrigerated transport', 'meal preparation', 'institutional food service',
  'mobile food pantry', 'emergency supply', 'disaster relief', 'shelf-stable goods',
]

export default function SupplierPortal() {
  const [suppliers, setSuppliers] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [matches, setMatches] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [tab, setTab] = useState('matches')
  // Matchmaker state
  const [matchZip, setMatchZip] = useState('')
  const [matchCats, setMatchCats] = useState([])
  const [matchResults, setMatchResults] = useState(null)
  const [matchLoading, setMatchLoading] = useState(false)

  useEffect(() => {
    fetchOrganizations({ org_type: 'supplier' })
      .then(res => setSuppliers(res.data))
      .catch(console.error)
      .finally(() => setInitLoading(false))
  }, [])

  const handleSelect = async (id) => {
    setSelectedId(id)
    if (!id) { setMatches(null); return }
    setLoading(true)
    try {
      const res = await fetchSupplierMatches(id)
      setMatches(res.data)
    } catch { setMatches(null) }
    finally { setLoading(false) }
  }

  const handleMatch = async () => {
    if (!matchZip) return
    setMatchLoading(true)
    try {
      const res = await federalTriMatch({ destination_zip: matchZip, categories: matchCats })
      setMatchResults(res.data)
    } catch { setMatchResults(null) }
    finally { setMatchLoading(false) }
  }

  if (initLoading) return <div className="text-center py-12 text-gray-400">Loading suppliers...</div>

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-1">
          <span className="bg-blue-600 text-white text-xs font-black px-2 py-0.5 rounded">SUP</span>
          <h1 className="text-xl font-bold text-white">Supplier Portal</h1>
        </div>
        <p className="text-gray-400 text-sm">Find solicitations that match your capabilities and connect with distributors</p>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
        <label className="block text-sm font-medium text-gray-300 mb-2">Select your organization</label>
        <select value={selectedId} onChange={e => handleSelect(e.target.value)}
          className="w-full max-w-md px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white">
          <option value="">Choose a supplier...</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name} — {s.zip_code}</option>
          ))}
        </select>
      </div>

      {matches?.supplier && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-white text-lg">{matches.supplier.name}</h2>
              <p className="text-sm text-gray-400 mt-1">{matches.supplier.services_description || matches.supplier.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(matches.supplier.naics_codes || []).map(n => (
                  <span key={n} className="text-xs px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded font-mono">NAICS {n}</span>
                ))}
                {matches.supplier.uei && (
                  <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded font-mono">UEI: {matches.supplier.uei}</span>
                )}
                {matches.supplier.small_business && (
                  <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-medium">Small Business</span>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-gray-400">
              <p className="text-white font-bold">{matches.supplier.service_radius_miles} mi radius</p>
              <p>{matches.supplier.employee_count} employees</p>
              {matches.supplier.years_in_business && <p>{matches.supplier.years_in_business} yrs</p>}
            </div>
          </div>
        </div>
      )}

      {/* Tab nav */}
      {selectedId && (
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-xl p-1">
          <button onClick={() => setTab('matches')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'matches' ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            Matched Solicitations
          </button>
          <button onClick={() => setTab('matchmaker')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'matchmaker' ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            Find Contracts
          </button>
        </div>
      )}

      {loading && <div className="text-center py-8 text-gray-400">Finding matches...</div>}

      {/* Matched solicitations */}
      {tab === 'matches' && matches && !loading && (
        <div>
          <h2 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">
            Matched Opportunities ({matches.total_matches})
          </h2>
          {matches.matched_solicitations.length === 0 ? (
            <div className="text-center py-8 bg-gray-900 border border-gray-700 rounded-xl text-gray-500">
              No matching solicitations found for your capabilities and location.
            </div>
          ) : (
            <div className="grid gap-4">
              {matches.matched_solicitations.map((m, i) => (
                <div key={i} className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Link to={`/solicitations/${m.solicitation.id}`}
                        className="font-bold text-white hover:text-amber-300 text-lg transition-colors">
                        {m.solicitation.title}
                      </Link>
                      <p className="text-sm text-gray-400">{m.solicitation.agency} — ZIP {m.solicitation.zip_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-amber-400">{m.match_score}</p>
                      <p className="text-xs text-gray-500">match score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-sm mb-3 bg-gray-800 rounded-lg p-3">
                    <div><span className="text-xs text-gray-500">Capability</span><p className="font-bold text-white">{m.capability_match}%</p></div>
                    <div><span className="text-xs text-gray-500">Distance</span><p className="font-bold text-white">{m.distance_miles} mi</p></div>
                    <div><span className="text-xs text-gray-500">Need Score</span><p className="font-bold text-white">{m.need_score}</p></div>
                    <div><span className="text-xs text-gray-500">Value</span><p className="font-bold text-white">{m.solicitation.estimated_value ? `$${m.solicitation.estimated_value.toLocaleString()}` : 'N/A'}</p></div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {m.overlapping_capabilities.map(c => (
                      <span key={c} className="text-xs px-2 py-0.5 bg-green-600/20 text-green-400 rounded">{c}</span>
                    ))}
                  </div>

                  {m.distributor_partners.length > 0 && (
                    <div className="border-t border-gray-800 pt-3">
                      <p className="text-xs text-gray-500 font-bold mb-2 uppercase tracking-wider">Available Distributor Partners:</p>
                      <div className="grid gap-2">
                        {m.distributor_partners.slice(0, 3).map((dp, j) => (
                          <div key={j} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-white">{dp.distributor.name}</p>
                              <p className="text-xs text-gray-400">
                                {dp.distance_to_supplier} mi from you — {dp.distance_to_solicitation} mi to destination
                              </p>
                              {dp.distributor.uei && (
                                <span className="text-xs text-gray-500 font-mono">UEI: {dp.distributor.uei}</span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-amber-400">{dp.capability_match}%</p>
                              <p className="text-xs text-gray-500">capability</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Matchmaker */}
      {tab === 'matchmaker' && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
            <p className="text-sm text-gray-400">
              Search for contracts by destination ZIP and required capabilities. Find the best distributor partners for your bids.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Destination ZIP Code *</label>
              <input type="text" value={matchZip} onChange={e => setMatchZip(e.target.value)}
                className="w-48 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500" placeholder="e.g. 38614" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Capabilities</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} type="button"
                    onClick={() => setMatchCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      matchCats.includes(cat) ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleMatch} disabled={matchLoading || !matchZip}
              className="px-6 py-2 text-sm font-bold bg-amber-500 text-black rounded-lg hover:bg-amber-400 disabled:opacity-50">
              {matchLoading ? 'Searching...' : 'Find Matches'}
            </button>
          </div>

          {matchResults && (
            <div>
              <div className="bg-gray-800 rounded-lg p-3 mb-4 text-sm text-gray-300">
                Destination: <span className="font-bold text-white">{matchResults.destination.city}, {matchResults.destination.state}</span>
                — Need: <span className="font-bold text-amber-400">{matchResults.destination.need_score}</span>
                — <span className="font-bold text-white">{matchResults.total_combos_evaluated}</span> combos evaluated
              </div>
              <div className="grid gap-4">
                {matchResults.matches.slice(0, 10).map((combo, i) => (
                  <div key={i} className={`bg-gray-900 border rounded-xl p-5 ${i === 0 ? 'border-green-500 ring-1 ring-green-500/30' : 'border-gray-700'}`}>
                    {i === 0 && <p className="text-xs text-green-400 font-black mb-2">BEST MATCH</p>}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-600/10 rounded-lg p-3 border border-blue-600/30">
                        <p className="text-xs text-blue-400 font-bold">SUPPLIER</p>
                        <p className="font-bold text-white">{combo.supplier.name}</p>
                        <p className="text-xs text-gray-400">{combo.supplier_distance} mi — {combo.supplier_capability_match}% cap</p>
                      </div>
                      <div className="bg-purple-600/10 rounded-lg p-3 border border-purple-600/30">
                        <p className="text-xs text-purple-400 font-bold">DISTRIBUTOR</p>
                        <p className="font-bold text-white">{combo.distributor.name}</p>
                        <p className="text-xs text-gray-400">{combo.distributor_distance} mi — {combo.distributor_capability_match}% cap</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mt-3 bg-gray-800 rounded-lg p-2 text-xs">
                      <div><span className="text-gray-500">Score</span><p className="font-black text-amber-400">{combo.combo_score}</p></div>
                      <div><span className="text-gray-500">Transport</span><p className="font-bold text-white">${combo.estimated_transport_cost.toLocaleString()}</p></div>
                      <div><span className="text-gray-500">S→D Dist</span><p className="font-bold text-white">{combo.supplier_to_distributor_distance} mi</p></div>
                      <div><span className="text-gray-500">Past Perf</span><p className="font-bold text-white">{combo.past_performance_score}%</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
