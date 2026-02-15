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

const $ = (v) => typeof v === 'number' ? '$' + v.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A'
const $k = (v) => typeof v === 'number' ? '$' + v.toLocaleString() : 'N/A'

export default function FederalPortal() {
  const [tab, setTab] = useState('vendors')
  const [vendors, setVendors] = useState([])
  const [vendorFilter, setVendorFilter] = useState({ org_type: '', capability: '', small_business: '' })
  const [vendorLoading, setVendorLoading] = useState(true)
  const [expandedVendor, setExpandedVendor] = useState(null)

  const [matchZip, setMatchZip] = useState('')
  const [matchCategories, setMatchCategories] = useState([])
  const [matchResults, setMatchResults] = useState(null)
  const [matchLoading, setMatchLoading] = useState(false)

  const [rfqZip, setRfqZip] = useState('')
  const [rfqItems, setRfqItems] = useState([{ supply_type: 'water', quantity: 1000 }])
  const [rfq, setRfq] = useState(null)
  const [rfqLoading, setRfqLoading] = useState(false)
  const [rfqTab, setRfqTab] = useState('suppliers')

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
    setMatchCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-1">
          <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded">FED</span>
          <h1 className="text-xl font-bold text-white">Federal Agency & Nonprofit Portal</h1>
        </div>
        <p className="text-gray-400 text-sm">Vendor directory, supplier-distributor matching, and sample RFQ generation</p>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-xl p-1">
        {[
          { key: 'vendors', label: 'Vendor Directory' },
          { key: 'match', label: 'Match Service' },
          { key: 'rfq', label: 'Sample RFQ' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* VENDOR DIRECTORY */}
      {tab === 'vendors' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select value={vendorFilter.org_type}
              onChange={e => setVendorFilter(p => ({ ...p, org_type: e.target.value }))}
              className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white">
              <option value="">All Types</option>
              <option value="supplier">Suppliers</option>
              <option value="distributor">Distributors</option>
              <option value="nonprofit">Nonprofits</option>
            </select>
            <input type="text" placeholder="Search capability..."
              value={vendorFilter.capability}
              onChange={e => setVendorFilter(p => ({ ...p, capability: e.target.value }))}
              className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 w-48" />
            <label className="flex items-center gap-1.5 text-sm text-gray-400">
              <input type="checkbox" checked={vendorFilter.small_business === 'true'}
                onChange={e => setVendorFilter(p => ({ ...p, small_business: e.target.checked ? 'true' : '' }))}
                className="rounded" />
              Small Business Only
            </label>
            <span className="text-xs text-amber-400 font-bold">{vendors.length} vendors</span>
          </div>

          {vendorLoading ? (
            <div className="text-center py-8 text-gray-400">Loading vendors...</div>
          ) : (
            <div className="grid gap-3">
              {vendors.map(v => (
                <div key={v.id} className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-lg">{v.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          v.org_type === 'supplier' ? 'bg-blue-600/30 text-blue-300' :
                          v.org_type === 'distributor' ? 'bg-purple-600/30 text-purple-300' :
                          'bg-green-600/30 text-green-300'
                        }`}>{v.org_type}</span>
                        {v.small_business && (
                          <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-medium">Small Business</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{v.services_description || v.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {v.uei && <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded font-mono">UEI: {v.uei}</span>}
                        {(v.naics_codes || []).map(n => (
                          <span key={n} className="text-xs px-2 py-0.5 bg-blue-600/20 text-blue-300 rounded font-mono">NAICS {n}</span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(v.capabilities || []).map(c => (
                          <span key={c} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded">{c}</span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(v.certifications || []).map(c => (
                          <span key={c} className="text-xs px-2 py-0.5 bg-green-600/20 text-green-400 rounded">{c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-400 ml-4 shrink-0">
                      <p className="text-white font-bold">ZIP {v.zip_code}</p>
                      <p>{v.service_radius_miles} mi radius</p>
                      {v.employee_count && <p>{v.employee_count} employees</p>}
                      {v.years_in_business && <p>{v.years_in_business} yrs</p>}
                      {v.annual_revenue && <p className="text-amber-400 font-bold">${(v.annual_revenue / 1000000).toFixed(1)}M</p>}
                      <button onClick={() => setExpandedVendor(expandedVendor === v.id ? null : v.id)}
                        className="text-xs text-amber-400 hover:text-amber-300 mt-2 font-medium">
                        {expandedVendor === v.id ? 'Hide' : 'Past Performance'}
                      </button>
                    </div>
                  </div>

                  {expandedVendor === v.id && (v.past_performance || []).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Past Performance</h4>
                      <div className="grid gap-2">
                        {v.past_performance.map((pp, j) => (
                          <div key={j} className="bg-gray-800 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-bold text-white">{pp.contract}</p>
                                <p className="text-xs text-gray-400">{pp.agency} — {pp.year}</p>
                                <p className="text-xs text-gray-500 mt-1">{pp.description}</p>
                              </div>
                              <p className="text-sm font-black text-amber-400">${pp.value?.toLocaleString()}</p>
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

      {/* MATCH SERVICE */}
      {tab === 'match' && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
            <p className="text-sm text-gray-400">
              Find the best supplier + distributor combination for your destination.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Destination ZIP Code *</label>
              <input type="text" value={matchZip} onChange={e => setMatchZip(e.target.value)}
                className="w-48 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500" placeholder="e.g. 38614" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Required Capabilities</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      matchCategories.includes(cat) ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleMatch} disabled={matchLoading || !matchZip}
              className="px-6 py-2 text-sm font-bold bg-amber-500 text-black rounded-lg hover:bg-amber-400 disabled:opacity-50">
              {matchLoading ? 'Finding matches...' : 'Find Supplier + Distributor Matches'}
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
                {matchResults.matches.map((combo, i) => (
                  <div key={i} className={`bg-gray-900 border rounded-xl p-5 ${i === 0 ? 'border-green-500 ring-1 ring-green-500/30' : 'border-gray-700'}`}>
                    {i === 0 && <p className="text-xs text-green-400 font-black mb-2">BEST MATCH</p>}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-600/10 rounded-lg p-3 border border-blue-600/30">
                        <p className="text-xs text-blue-400 font-bold">SUPPLIER</p>
                        <p className="font-bold text-white">{combo.supplier.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{combo.supplier.services_description || combo.supplier.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {combo.supplier.uei && <span className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded font-mono">UEI: {combo.supplier.uei}</span>}
                          {(combo.supplier.naics_codes || []).map(n => (
                            <span key={n} className="text-xs px-1.5 py-0.5 bg-gray-800 text-blue-300 rounded font-mono">NAICS {n}</span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{combo.supplier_distance} mi — {combo.supplier_capability_match}% cap</p>
                      </div>
                      <div className="bg-purple-600/10 rounded-lg p-3 border border-purple-600/30">
                        <p className="text-xs text-purple-400 font-bold">DISTRIBUTOR</p>
                        <p className="font-bold text-white">{combo.distributor.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{combo.distributor.services_description || combo.distributor.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {combo.distributor.uei && <span className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded font-mono">UEI: {combo.distributor.uei}</span>}
                          {(combo.distributor.naics_codes || []).map(n => (
                            <span key={n} className="text-xs px-1.5 py-0.5 bg-gray-800 text-purple-300 rounded font-mono">NAICS {n}</span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{combo.distributor_distance} mi — {combo.distributor_capability_match}% cap</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-3 mt-3 bg-gray-800 rounded-lg p-2 text-xs">
                      <div><span className="text-gray-500">Score</span><p className="font-black text-amber-400">{combo.combo_score}</p></div>
                      <div><span className="text-gray-500">S→D Dist</span><p className="font-bold text-white">{combo.supplier_to_distributor_distance} mi</p></div>
                      <div><span className="text-gray-500">Transport</span><p className="font-bold text-white">${combo.estimated_transport_cost.toLocaleString()}</p></div>
                      <div><span className="text-gray-500">Past Perf</span><p className="font-bold text-white">{combo.past_performance_score}%</p></div>
                      <div><span className="text-gray-500">Certs</span>
                        <div className="flex flex-wrap gap-0.5">
                          {combo.combined_certifications.slice(0, 3).map(c => (
                            <span key={c} className="text-xs px-1 py-0.5 bg-green-600/20 text-green-400 rounded">{c}</span>
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

      {/* SAMPLE RFQ */}
      {tab === 'rfq' && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
            <p className="text-sm text-gray-400">
              Generate a sample RFQ with cost estimates. Each vendor and distributor provides unique quotes based on their stock, distance, and market rates.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Destination ZIP Code *</label>
              <input type="text" value={rfqZip} onChange={e => setRfqZip(e.target.value)}
                className="w-48 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500" placeholder="e.g. 38614" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Supply Items *</label>
                <button onClick={() => setRfqItems([...rfqItems, { supply_type: 'non_perishable', quantity: 500 }])}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium">+ Add Item</button>
              </div>
              {rfqItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 mb-2">
                  <select value={item.supply_type}
                    onChange={e => { const u = [...rfqItems]; u[i] = { ...u[i], supply_type: e.target.value }; setRfqItems(u) }}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white">
                    {SUPPLY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" value={item.quantity} min={1}
                    onChange={e => { const u = [...rfqItems]; u[i] = { ...u[i], quantity: Number(e.target.value) }; setRfqItems(u) }}
                    className="w-28 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white" />
                  <span className="text-xs text-gray-500 w-14">{SUPPLY_OPTIONS.find(o => o.value === item.supply_type)?.unit}</span>
                  {rfqItems.length > 1 && (
                    <button onClick={() => setRfqItems(rfqItems.filter((_, idx) => idx !== i))}
                      className="text-xs text-red-400">Remove</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={handleRFQ} disabled={rfqLoading || !rfqZip}
              className="px-6 py-2 text-sm font-bold bg-amber-500 text-black rounded-lg hover:bg-amber-400 disabled:opacity-50">
              {rfqLoading ? 'Generating...' : 'Generate Sample RFQ'}
            </button>
          </div>

          {rfq && (
            <div className="space-y-4">
              {/* RFQ Header */}
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-amber-400 font-bold tracking-wider">SAMPLE REQUEST FOR QUOTE</p>
                    <h2 className="text-lg font-bold text-white mt-1">{rfq.title}</h2>
                    <p className="text-sm text-gray-400 font-mono">{rfq.rfq_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{rfq.destination.city}, {rfq.destination.state}</p>
                    {rfq.need_score && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        rfq.need_score >= 75 ? 'bg-red-600 text-white' : 'bg-amber-500 text-black'
                      }`}>NEED: {rfq.need_score}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 bg-gray-800 rounded-lg p-3 mb-4">
                  <div><p className="text-xs text-gray-500">Weight</p><p className="text-sm font-bold text-white">{rfq.total_weight_lbs?.toLocaleString()} lbs</p></div>
                  <div><p className="text-xs text-gray-500">Refrigeration</p><p className="text-sm font-bold text-white">{rfq.needs_refrigeration ? 'REQUIRED' : 'Standard'}</p></div>
                  <div><p className="text-xs text-gray-500">Suppliers</p><p className="text-sm font-bold text-white">{rfq.total_suppliers_evaluated}</p></div>
                  <div><p className="text-xs text-gray-500">Distributors</p><p className="text-sm font-bold text-white">{rfq.total_distributors_evaluated}</p></div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="text-left py-2 px-3">Item</th>
                      <th className="text-right py-2 px-3">Qty</th>
                      <th className="text-right py-2 px-3">Unit Cost</th>
                      <th className="text-right py-2 px-3">Weight</th>
                      <th className="text-right py-2 px-3">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfq.line_items.map((li, i) => (
                      <tr key={i} className="border-b border-gray-800 text-white">
                        <td className="py-2 px-3">{li.description}</td>
                        <td className="py-2 px-3 text-right font-mono">{li.quantity.toLocaleString()} {li.unit}</td>
                        <td className="py-2 px-3 text-right font-mono">{$(li.unit_cost)}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-400">{li.weight_lbs.toLocaleString()} lbs</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{$k(li.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-800 font-bold text-white">
                      <td colSpan={4} className="py-2 px-3">BASE SUPPLY COST</td>
                      <td className="py-2 px-3 text-right font-mono text-amber-400">{$k(rfq.subtotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Quote tabs */}
              <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-xl p-1">
                {[
                  { key: 'suppliers', label: `Suppliers (${rfq.supplier_quotes?.length || 0})` },
                  { key: 'distributors', label: `Distributors (${rfq.distributor_quotes?.length || 0})` },
                  { key: 'combos', label: `Combos (${rfq.combo_rankings?.length || 0})` },
                ].map(t => (
                  <button key={t.key} onClick={() => setRfqTab(t.key)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      rfqTab === t.key ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}>{t.label}</button>
                ))}
              </div>

              {rfqTab === 'suppliers' && (rfq.supplier_quotes || []).map((sq, i) => (
                <div key={i} className={`bg-gray-900 border rounded-xl p-4 ${i === 0 ? 'border-green-500' : 'border-gray-700'}`}>
                  {i === 0 && <div className="text-xs text-green-400 font-black mb-2">LOWEST SUPPLY COST</div>}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-white">{sq.organization.name}</h3>
                      <div className="flex gap-2 mt-1 text-xs text-gray-400">
                        {sq.organization.uei && <span className="font-mono bg-gray-800 px-2 py-0.5 rounded">UEI: {sq.organization.uei}</span>}
                        <span>{sq.distance_miles} mi</span>
                        <span>{sq.estimated_lead_days}d lead</span>
                      </div>
                    </div>
                    <p className="text-xl font-black text-white">{$k(sq.supply_subtotal)}</p>
                  </div>
                  <table className="w-full text-xs">
                    <thead><tr className="bg-gray-800 text-gray-500 uppercase">
                      <th className="text-left py-1 px-2">Item</th><th className="text-right py-1 px-2">Price</th>
                      <th className="text-right py-1 px-2">Total</th><th className="text-center py-1 px-2">Stock</th>
                    </tr></thead>
                    <tbody>
                      {sq.item_quotes.map((iq, j) => (
                        <tr key={j} className="border-b border-gray-800/50">
                          <td className="py-1 px-2 text-gray-300">{iq.description}</td>
                          <td className="py-1 px-2 text-right text-white font-mono">{$(iq.unit_price)}</td>
                          <td className="py-1 px-2 text-right text-white font-mono font-bold">{$k(iq.line_total)}</td>
                          <td className="py-1 px-2 text-center">{iq.in_stock ? <span className="text-green-400 font-bold">YES</span> : <span className="text-gray-600">NO</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {rfqTab === 'distributors' && (rfq.distributor_quotes || []).map((dq, i) => (
                <div key={i} className={`bg-gray-900 border rounded-xl p-4 ${i === 0 ? 'border-green-500' : 'border-gray-700'}`}>
                  {i === 0 && <div className="text-xs text-green-400 font-black mb-2">LOWEST LOGISTICS</div>}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-white">{dq.organization.name}</h3>
                      <div className="flex gap-2 mt-1 text-xs text-gray-400">
                        {dq.organization.uei && <span className="font-mono bg-gray-800 px-2 py-0.5 rounded">UEI: {dq.organization.uei}</span>}
                        <span>{dq.distance_miles} mi</span>
                        <span>{dq.trucks_needed} {dq.truck_type}</span>
                        <span>{dq.estimated_transit_days}d transit</span>
                      </div>
                    </div>
                    <p className="text-xl font-black text-white">{$k(dq.total_logistics_cost)}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2 bg-gray-800 rounded-lg p-2 text-xs">
                    <div><span className="text-gray-500">Mileage</span><p className="font-bold text-white">{$(dq.transport_breakdown?.base_mileage)}</p></div>
                    <div><span className="text-gray-500">Fuel</span><p className="font-bold text-white">{$(dq.transport_breakdown?.fuel_surcharge)}</p></div>
                    <div><span className="text-gray-500">Handling</span><p className="font-bold text-white">{$(dq.handling_fee)}</p></div>
                    <div><span className="text-gray-500">$/lb</span><p className="font-bold text-amber-400">{$(dq.cost_per_lb)}</p></div>
                  </div>
                </div>
              ))}

              {rfqTab === 'combos' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                        <th className="text-left py-2 px-3">#</th>
                        <th className="text-left py-2 px-3">Supplier</th>
                        <th className="text-right py-2 px-3">Supply</th>
                        <th className="text-left py-2 px-3">Distributor</th>
                        <th className="text-right py-2 px-3">Logistics</th>
                        <th className="text-right py-2 px-3">Total</th>
                        <th className="text-right py-2 px-3">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rfq.combo_rankings || []).map((c, i) => (
                        <tr key={i} className={`border-b border-gray-800 ${i === 0 ? 'bg-green-900/20' : ''}`}>
                          <td className="py-2 px-3"><span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-black ${i === 0 ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'}`}>{i+1}</span></td>
                          <td className="py-2 px-3"><p className="font-medium text-white">{c.supplier.name}</p></td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-white">{$k(c.supplier.supply_cost)}</td>
                          <td className="py-2 px-3"><p className="font-medium text-white">{c.distributor.name}</p></td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-white">{$k(c.distributor.logistics_cost)}</td>
                          <td className="py-2 px-3 text-right font-mono font-black text-amber-400 text-lg">{$k(c.total_cost)}</td>
                          <td className="py-2 px-3 text-right text-gray-300">{c.total_delivery_days}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
