import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchOrganizations, fetchDistributorMatches } from '../utils/api'

export default function DistributorPortal() {
  const [distributors, setDistributors] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [matches, setMatches] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)

  useEffect(() => {
    fetchOrganizations({ org_type: 'distributor' })
      .then(res => setDistributors(res.data))
      .catch(console.error)
      .finally(() => setInitLoading(false))
  }, [])

  const handleSelect = async (id) => {
    setSelectedId(id)
    if (!id) { setMatches(null); return }
    setLoading(true)
    try {
      const res = await fetchDistributorMatches(id)
      setMatches(res.data)
    } catch { setMatches(null) }
    finally { setLoading(false) }
  }

  if (initLoading) return <div className="text-center py-12 text-slate-400">Loading distributors...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Distributor Portal</h1>
        <p className="text-sm text-slate-400">Find solicitations and suppliers to partner with for distribution contracts</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <label className="block text-sm text-slate-600 mb-2">Select your organization</label>
        <select value={selectedId} onChange={e => handleSelect(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-slate-200 rounded-lg text-sm">
          <option value="">Choose a distributor...</option>
          {distributors.map(d => (
            <option key={d.id} value={d.id}>{d.name} — {d.zip_code}</option>
          ))}
        </select>
      </div>

      {/* Distributor profile */}
      {matches?.distributor && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-medium text-slate-800">{matches.distributor.name}</h2>
              <p className="text-sm text-slate-400 mt-1">{matches.distributor.services_description || matches.distributor.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {(matches.distributor.naics_codes || []).map(n => (
                  <span key={n} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md">NAICS {n}</span>
                ))}
                {matches.distributor.uei && (
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">UEI: {matches.distributor.uei}</span>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-slate-400">
              <p>{matches.distributor.service_radius_miles} mi radius</p>
              <p>{matches.distributor.employee_count} employees</p>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8 text-slate-400">Finding matches...</div>}

      {matches && !loading && (
        <div>
          <h2 className="text-sm font-medium text-slate-700 mb-3">
            Matched Solicitations ({matches.total_matches})
          </h2>
          {matches.matched_solicitations.length === 0 ? (
            <div className="text-center py-8 bg-white border border-slate-200 rounded-lg text-slate-400">
              No matching solicitations found.
            </div>
          ) : (
            <div className="grid gap-4">
              {matches.matched_solicitations.map((m, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Link to={`/solicitations/${m.solicitation.id}`}
                        className="font-medium text-slate-800 hover:text-slate-600">
                        {m.solicitation.title}
                      </Link>
                      <p className="text-sm text-slate-400">{m.solicitation.agency} — ZIP {m.solicitation.zip_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-800">{m.match_score}</p>
                      <p className="text-xs text-slate-400">match score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-xs text-slate-400">Capability</span>
                      <p className="font-medium">{m.capability_match}%</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Distance</span>
                      <p className="font-medium">{m.distance_miles} mi</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Need Score</span>
                      <p className="font-medium">{m.need_score}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Value</span>
                      <p className="font-medium">{m.solicitation.estimated_value ? `$${m.solicitation.estimated_value.toLocaleString()}` : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {m.overlapping_capabilities.map(c => (
                      <span key={c} className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-md">{c}</span>
                    ))}
                  </div>

                  {/* Supplier partners */}
                  {m.supplier_partners.length > 0 && (
                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs text-slate-400 font-medium mb-2">Available Supplier Partners:</p>
                      <div className="grid gap-2">
                        {m.supplier_partners.slice(0, 3).map((sp, j) => (
                          <div key={j} className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-700">{sp.supplier.name}</p>
                              <p className="text-xs text-slate-400">
                                {sp.distance_to_distributor} mi from you
                                {sp.pre_registered_capacity > 0 && ` — ${sp.pre_registered_capacity} items pre-registered`}
                              </p>
                              <div className="flex gap-1 mt-1">
                                {(sp.supplier.naics_codes || []).slice(0, 2).map(n => (
                                  <span key={n} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded">{n}</span>
                                ))}
                                {sp.supplier.uei && (
                                  <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded">{sp.supplier.uei}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{sp.capability_match}%</p>
                              <p className="text-xs text-slate-400">capability</p>
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
    </div>
  )
}
