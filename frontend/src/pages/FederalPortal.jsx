import { useState, useEffect } from 'react'
import { fetchFederalVendors, federalTriMatch, generateRFQ } from '../utils/api'

const CATEGORIES = [
  'fresh produce', 'cold storage', 'last mile delivery', 'warehouse distribution',
  'refrigerated transport', 'meal preparation', 'institutional food service',
  'mobile food pantry', 'community nutrition', 'emergency supply', 'disaster relief',
  'shelf-stable goods', 'SNAP distribution', 'USDA commodities', 'food rescue',
]

const SUPPLY_OPTIONS = [
  { value: 'water', label: 'Drinking Water', unit: 'gallons' },
  { value: 'non_perishable', label: 'Non-Perishable Meals', unit: 'meals' },
  { value: 'fresh_produce', label: 'Fresh Produce', unit: 'lbs' },
  { value: 'canned_goods', label: 'Canned Goods', unit: 'cans' },
  { value: 'shelf_stable', label: 'Shelf-Stable Food', unit: 'units' },
  { value: 'baby_formula', label: 'Baby Formula', unit: 'cans' },
  { value: 'medical_nutrition', label: 'Medical Nutrition', unit: 'units' },
  { value: 'protein', label: 'Protein', unit: 'lbs' },
  { value: 'hygiene_supplies', label: 'Hygiene Kits', unit: 'kits' },
]

export default function FederalPortal() {
  const [tab, setTab] = useState('vendors') // vendors, match, rfq
  const [vendors, setVendors] = useState([])
  const [vendorFilter, setVendorFilter] = useState({ org_type: '', capability: '', small_business: '' })
  const [vendorLoading, setVendorLoading] = useState(true)
  const [expandedVendor, setExpandedVendor] = useState(null)

  // Match state
  const [matchZip, setMatchZip] = useState('')
  const [matchCategories, setMatchCategories] = useState([])
  const [matchResults, setMatchResults] = useState(null)
  const [matchLoading, setMatchLoading] = useState(false)

  // RFQ state
  const [rfqZip, setRfqZip] = useState('')
  const [rfqItems, setRfqItems] = useState([{ supply_type: 'water', quantity: 1000 }])
  const [rfq, setRfq] = useState(null)
  const [rfqLoading, setRfqLoading] = useState(false)

  useEffect(() => { loadVendors() }, [vendorFilter])

  const loadVendors = () => {
    setVendorLoading(true)
    const params = {}
    if (vendorFilter.org_type) params.org_type = vendorFilter.org_type
    if (vendorFilter.capability) params.capability = vendorFilter.capability
    if (vendorFilter.small_business) params.small_business = vendorFilter.small_business
    fetchFederalVendors(params)
      .then(res => setVendors(res.data.vendors))
      .catch(console.error)
      .finally(() => setVendorLoading(false))
  }

  const handleMatch = async () => {
    if (!matchZip) return
    setMatchLoading(true)
    try {
      const res = await federalTriMatch({ destination_zip: matchZip, categories: matchCategories })
      setMatchResults(res.data)
    } catch { setMatchResults(null) }
    finally { setMatchLoading(false) }
  }

  const handleRFQ = async () => {
    if (!rfqZip) return
    setRfqLoading(true)
    try {
      const res = await generateRFQ({ destination_zip: rfqZip, items: rfqItems })
      setRfq(res.data)
    } catch { setRfq(null) }
    finally { setRfqLoading(false) }
  }

  const toggleCategory = (cat) => {
    setMatchCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Federal Agency & Nonprofit Portal</h1>
        <p className="text-sm text-slate-400">Vendor directory, supplier-distributor matching, and sample RFQ generation</p>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { key: 'vendors', label: 'Vendor Directory' },
          { key: 'match', label: 'Match Service' },
          { key: 'rfq', label: 'Sample RFQ' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ VENDOR DIRECTORY ═══ */}
      {tab === 'vendors' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <select value={vendorFilter.org_type}
              onChange={e => setVendorFilter(p => ({ ...p, org_type: e.target.value }))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
              <option value="">All Types</option>
              <option value="supplier">Suppliers</option>
              <option value="distributor">Distributors</option>
              <option value="nonprofit">Nonprofits</option>
            </select>
            <input type="text" placeholder="Search by capability..."
              value={vendorFilter.capability}
              onChange={e => setVendorFilter(p => ({ ...p, capability: e.target.value }))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm w-48" />
            <label className="flex items-center gap-1.5 text-sm text-slate-500">
              <input type="checkbox" checked={vendorFilter.small_business === 'true'}
                onChange={e => setVendorFilter(p => ({ ...p, small_business: e.target.checked ? 'true' : '' }))}
                className="rounded" />
              Small Business Only
            </label>
            <span className="text-xs text-slate-400">{vendors.length} vendors</span>
          </div>

          {vendorLoading ? (
            <div className="text-center py-8 text-slate-400">Loading vendors...</div>
          ) : (
            <div className="grid gap-3">
              {vendors.map(v => (
                <div key={v.id} className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-800">{v.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-md ${
                          v.org_type === 'supplier' ? 'bg-blue-50 text-blue-600' :
                          v.org_type === 'distributor' ? 'bg-purple-50 text-purple-600' :
                          'bg-green-50 text-green-600'
                        }`}>{v.org_type}</span>
                        {v.small_business && (
                          <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md">Small Business</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{v.services_description || v.description}</p>

                      {/* Business identifiers */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {v.uei && (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono">UEI: {v.uei}</span>
                        )}
                        {(v.naics_codes || []).map(n => (
                          <span key={n} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md">NAICS {n}</span>
                        ))}
                      </div>

                      {/* Capabilities */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(v.capabilities || []).map(c => (
                          <span key={c} className="text-xs px-2 py-0.5 bg-slate-50 text-slate-500 rounded">{c}</span>
                        ))}
                      </div>

                      {/* Certifications */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(v.certifications || []).map(c => (
                          <span key={c} className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded">{c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-400 ml-4 shrink-0">
                      <p>ZIP {v.zip_code}</p>
                      <p>{v.service_radius_miles} mi radius</p>
                      {v.employee_count && <p>{v.employee_count} employees</p>}
                      {v.years_in_business && <p>{v.years_in_business} yrs in business</p>}
                      {v.annual_revenue && <p>${(v.annual_revenue / 1000000).toFixed(1)}M revenue</p>}
                      <button onClick={() => setExpandedVendor(expandedVendor === v.id ? null : v.id)}
                        className="text-xs text-slate-500 hover:text-slate-700 mt-2 underline">
                        {expandedVendor === v.id ? 'Hide' : 'Past Performance'}
                      </button>
                    </div>
                  </div>

                  {/* Past Performance expanded */}
                  {expandedVendor === v.id && (v.past_performance || []).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-medium text-slate-500 mb-2">Past Performance</h4>
                      <div className="grid gap-2">
                        {v.past_performance.map((pp, j) => (
                          <div key={j} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium text-slate-700">{pp.contract}</p>
                                <p className="text-xs text-slate-400">{pp.agency} — {pp.year}</p>
                                <p className="text-xs text-slate-500 mt-1">{pp.description}</p>
                              </div>
                              <p className="text-sm font-semibold text-slate-700">${pp.value?.toLocaleString()}</p>
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

      {/* ═══ MATCH SERVICE ═══ */}
      {tab === 'match' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <p className="text-sm text-slate-500">
              Find the best supplier + distributor combination for your destination.
              Select categories and we'll match you with the optimal vendor pair.
            </p>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Destination ZIP Code *</label>
              <input type="text" value={matchZip} onChange={e => setMatchZip(e.target.value)}
                className="w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. 38614" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-2">Required Capabilities</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1 rounded-md text-xs transition-colors ${
                      matchCategories.includes(cat) ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleMatch} disabled={matchLoading || !matchZip}
              className="px-6 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
              {matchLoading ? 'Finding matches...' : 'Find Supplier + Distributor Matches'}
            </button>
          </div>

          {matchResults && (
            <div>
              <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-500">
                  Destination: <span className="font-medium text-slate-700">{matchResults.destination.city}, {matchResults.destination.state}</span>
                  — Need Score: <span className="font-medium">{matchResults.destination.need_score}</span>
                  — <span className="font-medium">{matchResults.total_combos_evaluated}</span> combinations evaluated
                </p>
              </div>

              <div className="grid gap-4">
                {matchResults.matches.map((combo, i) => (
                  <div key={i} className={`bg-white border rounded-lg p-5 ${i === 0 ? 'border-green-200 ring-1 ring-green-100' : 'border-slate-200'}`}>
                    {i === 0 && <p className="text-xs text-green-600 font-medium mb-2">BEST MATCH</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Supplier */}
                      <div className="bg-blue-50/50 rounded-lg p-3">
                        <p className="text-xs text-blue-500 font-medium">SUPPLIER</p>
                        <p className="font-medium text-slate-800">{combo.supplier.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{combo.supplier.services_description || combo.supplier.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {combo.supplier.uei && <span className="text-xs px-1.5 py-0.5 bg-white text-slate-500 rounded font-mono">UEI: {combo.supplier.uei}</span>}
                          {(combo.supplier.naics_codes || []).map(n => (
                            <span key={n} className="text-xs px-1.5 py-0.5 bg-white text-blue-500 rounded">NAICS {n}</span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">{combo.supplier_distance} mi — {combo.supplier_capability_match}% capability match</p>
                        {(combo.supplier.past_performance || []).length > 0 && (
                          <div className="mt-2 text-xs text-slate-500">
                            <p className="font-medium">Recent: {combo.supplier.past_performance[0].contract}</p>
                            <p>${combo.supplier.past_performance[0].value?.toLocaleString()} — {combo.supplier.past_performance[0].agency}</p>
                          </div>
                        )}
                      </div>
                      {/* Distributor */}
                      <div className="bg-purple-50/50 rounded-lg p-3">
                        <p className="text-xs text-purple-500 font-medium">DISTRIBUTOR</p>
                        <p className="font-medium text-slate-800">{combo.distributor.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{combo.distributor.services_description || combo.distributor.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {combo.distributor.uei && <span className="text-xs px-1.5 py-0.5 bg-white text-slate-500 rounded font-mono">UEI: {combo.distributor.uei}</span>}
                          {(combo.distributor.naics_codes || []).map(n => (
                            <span key={n} className="text-xs px-1.5 py-0.5 bg-white text-purple-500 rounded">NAICS {n}</span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">{combo.distributor_distance} mi — {combo.distributor_capability_match}% capability match</p>
                        {(combo.distributor.past_performance || []).length > 0 && (
                          <div className="mt-2 text-xs text-slate-500">
                            <p className="font-medium">Recent: {combo.distributor.past_performance[0].contract}</p>
                            <p>${combo.distributor.past_performance[0].value?.toLocaleString()} — {combo.distributor.past_performance[0].agency}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-3 mt-3 text-sm border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-xs text-slate-400">Combo Score</span>
                        <p className="font-semibold">{combo.combo_score}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">S→D Distance</span>
                        <p className="font-medium">{combo.supplier_to_distributor_distance} mi</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">Est. Transport</span>
                        <p className="font-medium">${combo.estimated_transport_cost.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">Past Perf.</span>
                        <p className="font-medium">{combo.past_performance_score}%</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">Certifications</span>
                        <div className="flex flex-wrap gap-0.5">
                          {combo.combined_certifications.slice(0, 3).map(c => (
                            <span key={c} className="text-xs px-1 py-0.5 bg-green-50 text-green-600 rounded">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ SAMPLE RFQ ═══ */}
      {tab === 'rfq' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <p className="text-sm text-slate-500">
              Generate a sample RFQ with estimated costs based on real supplier and distributor data.
              Compare vendors to find the best value for your program.
            </p>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Destination ZIP Code *</label>
              <input type="text" value={rfqZip} onChange={e => setRfqZip(e.target.value)}
                className="w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. 38614" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-600">Supply Items *</label>
                <button onClick={() => setRfqItems([...rfqItems, { supply_type: 'non_perishable', quantity: 500 }])}
                  className="text-xs text-slate-500 hover:text-slate-700">+ Add Item</button>
              </div>
              {rfqItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 mb-2">
                  <select value={item.supply_type}
                    onChange={e => { const u = [...rfqItems]; u[i] = { ...u[i], supply_type: e.target.value }; setRfqItems(u) }}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    {SUPPLY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" value={item.quantity} min={1}
                    onChange={e => { const u = [...rfqItems]; u[i] = { ...u[i], quantity: Number(e.target.value) }; setRfqItems(u) }}
                    className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <span className="text-xs text-slate-400 w-14">
                    {SUPPLY_OPTIONS.find(o => o.value === item.supply_type)?.unit}
                  </span>
                  {rfqItems.length > 1 && (
                    <button onClick={() => setRfqItems(rfqItems.filter((_, idx) => idx !== i))}
                      className="text-xs text-red-400">Remove</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={handleRFQ} disabled={rfqLoading || !rfqZip}
              className="px-6 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
              {rfqLoading ? 'Generating...' : 'Generate Sample RFQ'}
            </button>
          </div>

          {rfq && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-slate-400">SAMPLE RFQ</p>
                    <h2 className="text-lg font-semibold text-slate-800">{rfq.title}</h2>
                    <p className="text-sm text-slate-400">{rfq.rfq_number}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-slate-400">{rfq.destination.city}, {rfq.destination.state}</p>
                    {rfq.need_score && (
                      <span className={`text-xs px-2 py-0.5 rounded-md ${
                        rfq.need_score >= 75 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      }`}>Need: {rfq.need_score}</span>
                    )}
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-slate-400">
                      <th className="py-2 font-medium">Item</th>
                      <th className="py-2 font-medium">Qty</th>
                      <th className="py-2 font-medium">Unit Cost</th>
                      <th className="py-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfq.line_items.map((li, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-2">{li.description}</td>
                        <td className="py-2">{li.quantity.toLocaleString()} {li.unit}</td>
                        <td className="py-2">${li.unit_cost.toFixed(2)}</td>
                        <td className="py-2 text-right font-medium">${li.total_cost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200">
                      <td colSpan={3} className="py-2 font-medium">Subtotal</td>
                      <td className="py-2 text-right font-semibold">${rfq.subtotal.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {rfq.vendor_quotes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Vendor Quotes ({rfq.total_vendors_evaluated} evaluated)</h3>
                  <div className="grid gap-3">
                    {rfq.vendor_quotes.map((v, i) => (
                      <div key={i} className={`bg-white border rounded-lg p-4 ${i === 0 ? 'border-green-200' : 'border-slate-200'}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-800">{v.organization.name}</p>
                              {i === 0 && <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-md">Best Value</span>}
                            </div>
                            <p className="text-xs text-slate-400">{v.organization.org_type} — {v.distance_miles} mi — {v.estimated_delivery_days} day delivery</p>
                            <div className="flex gap-1 mt-1">
                              {v.organization.uei && <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">{v.organization.uei}</span>}
                              {(v.organization.naics_codes || []).slice(0, 2).map(n => (
                                <span key={n} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded">{n}</span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold">${v.total_estimate.toLocaleString()}</p>
                            <p className="text-xs text-slate-400">Supply ${v.supply_cost.toLocaleString()} + Transport ${v.transport_cost.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
