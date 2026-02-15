import { useState } from 'react'
import { generateRFQ } from '../utils/api'

const SUPPLY_OPTIONS = [
  { value: 'water', label: 'Drinking Water', unit: 'gallons' },
  { value: 'non_perishable', label: 'Non-Perishable Meals (MREs)', unit: 'meals' },
  { value: 'fresh_produce', label: 'Fresh Produce', unit: 'lbs' },
  { value: 'canned_goods', label: 'Canned Goods', unit: 'cans' },
  { value: 'baby_formula', label: 'Baby Formula', unit: 'cans' },
  { value: 'medical_nutrition', label: 'Medical Nutrition', unit: 'units' },
  { value: 'shelf_stable', label: 'Shelf-Stable Food', unit: 'units' },
  { value: 'grains_cereals', label: 'Grains & Cereals', unit: 'lbs' },
  { value: 'protein', label: 'Protein', unit: 'lbs' },
  { value: 'dairy', label: 'Dairy Products', unit: 'units' },
  { value: 'hygiene_supplies', label: 'Hygiene Kits', unit: 'kits' },
]

const $  = (v) => typeof v === 'number' ? '$' + v.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A'
const $k = (v) => typeof v === 'number' ? '$' + v.toLocaleString() : 'N/A'

export default function CostEstimator() {
  const [destZip, setDestZip] = useState('')
  const [items, setItems] = useState([{ supply_type: 'water', quantity: 1000 }])
  const [rfq, setRfq] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('suppliers')

  const addItem = () => setItems([...items, { supply_type: 'non_perishable', quantity: 500 }])
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i, field, value) => {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: field === 'quantity' ? Number(value) : value }
    setItems(updated)
  }

  const handleGenerate = async () => {
    if (!destZip || items.length === 0) { setError('Enter a destination ZIP and at least one item.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await generateRFQ({ destination_zip: destZip, items })
      setRfq(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate RFQ')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-1">
          <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded">RFQ</span>
          <h1 className="text-xl font-bold text-white">Sample RFQ Generator</h1>
        </div>
        <p className="text-gray-400 text-sm">
          Generate cost estimates using market rate data — mileage, weight, truck capacity, and routes.
          Each vendor and distributor provides unique pricing based on stock, distance, and capabilities.
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Destination ZIP Code *</label>
          <input type="text" value={destZip} onChange={e => setDestZip(e.target.value)}
            className="w-48 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500"
            placeholder="e.g. 38614" maxLength={10} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">Supply Items *</label>
            <button onClick={addItem} className="text-xs text-amber-400 hover:text-amber-300 font-medium">+ Add Item</button>
          </div>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <select value={item.supply_type} onChange={e => updateItem(i, 'supply_type', e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white">
                  {SUPPLY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input type="number" value={item.quantity} min={1}
                  onChange={e => updateItem(i, 'quantity', e.target.value)}
                  className="w-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white" placeholder="Qty" />
                <span className="text-xs text-gray-500 w-16">
                  {SUPPLY_OPTIONS.find(o => o.value === item.supply_type)?.unit}
                </span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <div className="text-sm text-red-400 bg-red-900/30 px-4 py-2 rounded-lg border border-red-800">{error}</div>}

        <button onClick={handleGenerate} disabled={loading}
          className="px-6 py-2.5 text-sm font-bold bg-amber-500 text-black rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors">
          {loading ? 'Generating RFQ...' : 'Generate Sample RFQ'}
        </button>
      </div>

      {/* RFQ Results */}
      {rfq && (
        <div className="space-y-6">
          {/* RFQ Header */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-amber-400 font-bold tracking-wider">SAMPLE REQUEST FOR QUOTE</p>
                <h2 className="text-lg font-bold text-white mt-1">{rfq.title}</h2>
                <p className="text-sm text-gray-400 font-mono">{rfq.rfq_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">{rfq.destination.city}, {rfq.destination.state}</p>
                <p className="text-xs text-gray-400">ZIP {rfq.destination.zip_code}</p>
                {rfq.need_score && (
                  <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded ${
                    rfq.need_score >= 75 ? 'bg-red-600 text-white' : rfq.need_score >= 60 ? 'bg-amber-500 text-black' : 'bg-green-600 text-white'
                  }`}>NEED: {rfq.need_score}</span>
                )}
              </div>
            </div>

            {/* Specs bar */}
            <div className="grid grid-cols-4 gap-4 bg-gray-800 rounded-lg p-3 mb-4">
              <div><p className="text-xs text-gray-500">Total Weight</p><p className="text-sm font-bold text-white">{rfq.total_weight_lbs?.toLocaleString()} lbs</p></div>
              <div><p className="text-xs text-gray-500">Refrigeration</p><p className="text-sm font-bold text-white">{rfq.needs_refrigeration ? 'REQUIRED' : 'Standard'}</p></div>
              <div><p className="text-xs text-gray-500">Suppliers Eval.</p><p className="text-sm font-bold text-white">{rfq.total_suppliers_evaluated}</p></div>
              <div><p className="text-xs text-gray-500">Distributors Eval.</p><p className="text-sm font-bold text-white">{rfq.total_distributors_evaluated}</p></div>
            </div>

            {/* Line items spreadsheet */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="text-left py-2 px-3 rounded-tl-lg">Item</th>
                    <th className="text-right py-2 px-3">Qty</th>
                    <th className="text-right py-2 px-3">Unit</th>
                    <th className="text-right py-2 px-3">Unit Cost</th>
                    <th className="text-right py-2 px-3">Weight</th>
                    <th className="text-right py-2 px-3 rounded-tr-lg">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {rfq.line_items.map((li, i) => (
                    <tr key={i} className="border-b border-gray-800 text-white">
                      <td className="py-2.5 px-3 font-medium">{li.description}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{li.quantity.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-gray-400">{li.unit}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{$(li.unit_cost)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-400">{li.weight_lbs.toLocaleString()} lbs</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{$k(li.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-800 text-white font-bold">
                    <td colSpan={5} className="py-2.5 px-3 rounded-bl-lg">BASE SUPPLY COST</td>
                    <td className="py-2.5 px-3 text-right font-mono rounded-br-lg text-amber-400">{$k(rfq.subtotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Tab nav for quotes */}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-xl p-1">
            {[
              { key: 'suppliers', label: `Supplier Quotes (${rfq.supplier_quotes?.length || 0})` },
              { key: 'distributors', label: `Distributor Quotes (${rfq.distributor_quotes?.length || 0})` },
              { key: 'combos', label: `Best Combos (${rfq.combo_rankings?.length || 0})` },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === t.key ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* SUPPLIER QUOTES — Spreadsheet style */}
          {activeTab === 'suppliers' && (
            <div className="space-y-4">
              {(rfq.supplier_quotes || []).map((sq, i) => (
                <div key={i} className={`bg-gray-900 border rounded-xl overflow-hidden ${i === 0 ? 'border-green-500 ring-1 ring-green-500/30' : 'border-gray-700'}`}>
                  {i === 0 && <div className="bg-green-600 text-white text-xs font-bold px-4 py-1 text-center">LOWEST SUPPLY COST</div>}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-lg">{sq.organization.name}</h3>
                          <span className="text-xs px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded font-medium">SUPPLIER</span>
                          {sq.has_inventory && <span className="text-xs px-2 py-0.5 bg-green-600/30 text-green-300 rounded font-medium">IN STOCK</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          {sq.organization.uei && <span className="font-mono bg-gray-800 px-2 py-0.5 rounded">UEI: {sq.organization.uei}</span>}
                          {(sq.organization.naics_codes || []).map(n => (
                            <span key={n} className="font-mono bg-gray-800 px-2 py-0.5 rounded">NAICS {n}</span>
                          ))}
                          <span>{sq.distance_miles} mi</span>
                          <span>{sq.estimated_lead_days} day lead</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-white">{$k(sq.supply_subtotal)}</p>
                        <p className="text-xs text-gray-500">supply total</p>
                      </div>
                    </div>

                    {/* Per-item quote spreadsheet */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-800 text-gray-500 uppercase tracking-wider">
                            <th className="text-left py-1.5 px-2">Item</th>
                            <th className="text-right py-1.5 px-2">Qty</th>
                            <th className="text-right py-1.5 px-2">Unit Price</th>
                            <th className="text-right py-1.5 px-2">Line Total</th>
                            <th className="text-center py-1.5 px-2">In Stock</th>
                            <th className="text-right py-1.5 px-2">Available</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sq.item_quotes.map((iq, j) => (
                            <tr key={j} className="border-b border-gray-800/50">
                              <td className="py-1.5 px-2 text-gray-300 font-medium">{iq.description}</td>
                              <td className="py-1.5 px-2 text-right text-gray-300 font-mono">{iq.quantity.toLocaleString()}</td>
                              <td className="py-1.5 px-2 text-right text-white font-mono font-bold">{$(iq.unit_price)}</td>
                              <td className="py-1.5 px-2 text-right text-white font-mono font-bold">{$k(iq.line_total)}</td>
                              <td className="py-1.5 px-2 text-center">
                                {iq.in_stock
                                  ? <span className="text-green-400 font-bold">YES</span>
                                  : <span className="text-gray-600">NO</span>}
                              </td>
                              <td className="py-1.5 px-2 text-right text-gray-400 font-mono">{iq.stock_available > 0 ? iq.stock_available.toLocaleString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Certs */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(sq.certifications || []).map((c, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 bg-gray-800 text-amber-400 rounded">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DISTRIBUTOR QUOTES — Transport spreadsheet */}
          {activeTab === 'distributors' && (
            <div className="space-y-4">
              {(rfq.distributor_quotes || []).map((dq, i) => (
                <div key={i} className={`bg-gray-900 border rounded-xl overflow-hidden ${i === 0 ? 'border-green-500 ring-1 ring-green-500/30' : 'border-gray-700'}`}>
                  {i === 0 && <div className="bg-green-600 text-white text-xs font-bold px-4 py-1 text-center">LOWEST LOGISTICS COST</div>}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-lg">{dq.organization.name}</h3>
                          <span className="text-xs px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded font-medium">DISTRIBUTOR</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          {dq.organization.uei && <span className="font-mono bg-gray-800 px-2 py-0.5 rounded">UEI: {dq.organization.uei}</span>}
                          {(dq.organization.naics_codes || []).map(n => (
                            <span key={n} className="font-mono bg-gray-800 px-2 py-0.5 rounded">NAICS {n}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-white">{$k(dq.total_logistics_cost)}</p>
                        <p className="text-xs text-gray-500">total logistics</p>
                      </div>
                    </div>

                    {/* Transport breakdown spreadsheet */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-800 text-gray-500 uppercase tracking-wider">
                            <th className="text-left py-1.5 px-2">Cost Category</th>
                            <th className="text-right py-1.5 px-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-300">
                          <tr className="border-b border-gray-800/50">
                            <td className="py-1.5 px-2">Base Mileage ({dq.distance_miles} mi x {dq.truck_type})</td>
                            <td className="py-1.5 px-2 text-right font-mono text-white">{$(dq.transport_breakdown?.base_mileage)}</td>
                          </tr>
                          <tr className="border-b border-gray-800/50">
                            <td className="py-1.5 px-2">Fuel Surcharge (18%)</td>
                            <td className="py-1.5 px-2 text-right font-mono text-white">{$(dq.transport_breakdown?.fuel_surcharge)}</td>
                          </tr>
                          {dq.transport_breakdown?.weight_surcharge > 0 && (
                            <tr className="border-b border-gray-800/50">
                              <td className="py-1.5 px-2">Weight Surcharge (80%+ capacity)</td>
                              <td className="py-1.5 px-2 text-right font-mono text-white">{$(dq.transport_breakdown?.weight_surcharge)}</td>
                            </tr>
                          )}
                          {dq.transport_breakdown?.daily_rate > 0 && (
                            <tr className="border-b border-gray-800/50">
                              <td className="py-1.5 px-2">Daily Rate ({dq.estimated_transit_days} days x {dq.trucks_needed} trucks)</td>
                              <td className="py-1.5 px-2 text-right font-mono text-white">{$(dq.transport_breakdown?.daily_rate)}</td>
                            </tr>
                          )}
                          <tr className="border-b border-gray-800/50">
                            <td className="py-1.5 px-2">Handling Fee ({rfq.total_weight_lbs?.toLocaleString()} lbs)</td>
                            <td className="py-1.5 px-2 text-right font-mono text-white">{$(dq.handling_fee)}</td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-800 font-bold text-white">
                            <td className="py-1.5 px-2">TOTAL LOGISTICS</td>
                            <td className="py-1.5 px-2 text-right font-mono text-amber-400">{$k(dq.total_logistics_cost)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-5 gap-3 mt-3 bg-gray-800 rounded-lg p-2 text-xs">
                      <div><span className="text-gray-500">Trucks</span><p className="font-bold text-white">{dq.trucks_needed}</p></div>
                      <div><span className="text-gray-500">Type</span><p className="font-bold text-white">{dq.truck_type}</p></div>
                      <div><span className="text-gray-500">Transit</span><p className="font-bold text-white">{dq.estimated_transit_days} day(s)</p></div>
                      <div><span className="text-gray-500">$/Mile</span><p className="font-bold text-white">{$(dq.cost_per_mile)}</p></div>
                      <div><span className="text-gray-500">$/Lb</span><p className="font-bold text-white">{$(dq.cost_per_lb)}</p></div>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {(dq.certifications || []).map((c, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 bg-gray-800 text-amber-400 rounded">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* COMBO RANKINGS — Supplier + Distributor pairs */}
          {activeTab === 'combos' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="text-left py-2.5 px-3">#</th>
                    <th className="text-left py-2.5 px-3">Supplier</th>
                    <th className="text-right py-2.5 px-3">Supply Cost</th>
                    <th className="text-left py-2.5 px-3">Distributor</th>
                    <th className="text-right py-2.5 px-3">Logistics Cost</th>
                    <th className="text-right py-2.5 px-3 font-bold">Total Cost</th>
                    <th className="text-right py-2.5 px-3">Delivery</th>
                    <th className="text-right py-2.5 px-3">Route Mi</th>
                  </tr>
                </thead>
                <tbody>
                  {(rfq.combo_rankings || []).map((c, i) => (
                    <tr key={i} className={`border-b border-gray-800 ${i === 0 ? 'bg-green-900/20' : ''}`}>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-black ${
                          i === 0 ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'
                        }`}>{i + 1}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-white">{c.supplier.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{c.supplier.uei || ''} · {c.supplier.distance} mi {c.supplier.has_inventory ? '· IN STOCK' : ''}</p>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{$k(c.supplier.supply_cost)}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-white">{c.distributor.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{c.distributor.uei || ''} · {c.distributor.trucks} truck(s)</p>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{$k(c.distributor.logistics_cost)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-amber-400 text-lg">{$k(c.total_cost)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-300">{c.total_delivery_days} days</td>
                      <td className="py-2.5 px-3 text-right text-gray-400">{c.route_distance} mi</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
