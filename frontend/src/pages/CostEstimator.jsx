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

export default function CostEstimator() {
  const [destZip, setDestZip] = useState('')
  const [items, setItems] = useState([{ supply_type: 'water', quantity: 1000 }])
  const [rfq, setRfq] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addItem = () => setItems([...items, { supply_type: 'non_perishable', quantity: 500 }])
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i, field, value) => {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: field === 'quantity' ? Number(value) : value }
    setItems(updated)
  }

  const handleGenerate = async () => {
    if (!destZip || items.length === 0) {
      setError('Please enter a destination ZIP and at least one item.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await generateRFQ({ destination_zip: destZip, items })
      setRfq(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate RFQ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Cost Estimator & Sample RFQ</h1>
        <p className="text-sm text-slate-400">
          For federal agencies and nonprofits — generate a sample RFQ with cost estimates from real supplier and distributor data
        </p>
      </div>

      {/* Input form */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Destination ZIP Code *</label>
          <input type="text" value={destZip} onChange={e => setDestZip(e.target.value)}
            className="w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="e.g. 38614" maxLength={10} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-600">Supply Items *</label>
            <button onClick={addItem} className="text-xs text-slate-500 hover:text-slate-700">+ Add Item</button>
          </div>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <select value={item.supply_type} onChange={e => updateItem(i, 'supply_type', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  {SUPPLY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input type="number" value={item.quantity} min={1}
                  onChange={e => updateItem(i, 'quantity', e.target.value)}
                  className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Qty" />
                <span className="text-xs text-slate-400 w-16">
                  {SUPPLY_OPTIONS.find(o => o.value === item.supply_type)?.unit}
                </span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button onClick={handleGenerate} disabled={loading}
          className="px-6 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
          {loading ? 'Generating RFQ...' : 'Generate Sample RFQ'}
        </button>
      </div>

      {/* RFQ Result */}
      {rfq && (
        <div className="space-y-5">
          {/* RFQ Header */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-slate-400">SAMPLE RFQ</p>
                <h2 className="text-lg font-semibold text-slate-800">{rfq.title}</h2>
                <p className="text-sm text-slate-400">{rfq.rfq_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Destination</p>
                <p className="text-sm font-medium">{rfq.destination.city}, {rfq.destination.state}</p>
                <p className="text-xs text-slate-400">ZIP {rfq.destination.zip_code}</p>
                {rfq.need_score && (
                  <p className="text-xs mt-1">
                    <span className={`px-2 py-0.5 rounded-md ${
                      rfq.need_score >= 75 ? 'bg-red-50 text-red-600' : rfq.need_score >= 60 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                    }`}>Need Score: {rfq.need_score}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Line items */}
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-400">
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 font-medium">Qty</th>
                  <th className="py-2 font-medium">Unit</th>
                  <th className="py-2 font-medium">Unit Cost</th>
                  <th className="py-2 font-medium text-right">Total</th>
                  <th className="py-2 font-medium text-right">Weight</th>
                </tr>
              </thead>
              <tbody>
                {rfq.line_items.map((li, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2">{li.description}</td>
                    <td className="py-2">{li.quantity.toLocaleString()}</td>
                    <td className="py-2 text-slate-400">{li.unit}</td>
                    <td className="py-2">${li.unit_cost.toFixed(2)}</td>
                    <td className="py-2 text-right font-medium">${li.total_cost.toLocaleString()}</td>
                    <td className="py-2 text-right text-slate-400">{li.weight_lbs.toLocaleString()} lbs</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan={4} className="py-2 font-medium">Subtotal (Supply Cost)</td>
                  <td className="py-2 text-right font-semibold">${rfq.subtotal.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Vendor Quotes */}
          <div>
            <h2 className="text-sm font-medium text-slate-700 mb-3">
              Vendor Quotes ({rfq.total_vendors_evaluated} vendors evaluated)
            </h2>
            {rfq.vendor_quotes.length > 0 ? (
              <div className="grid gap-3">
                {rfq.vendor_quotes.map((v, i) => (
                  <div key={i} className={`bg-white border rounded-lg p-4 ${i === 0 ? 'border-green-200 ring-1 ring-green-100' : 'border-slate-200'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-800">{v.organization.name}</h3>
                          {i === 0 && <span className="text-xs px-2 py-0.5 rounded-md bg-green-50 text-green-600">Best Value</span>}
                          {v.has_pre_registered_inventory && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">Has Inventory</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {v.organization.org_type} — {v.distance_miles} mi — Est. {v.estimated_delivery_days} day(s) delivery
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {v.certifications.map((c, j) => (
                            <span key={j} className="text-xs px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded">{c}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-800">${v.total_estimate.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">
                          Supply: ${v.supply_cost.toLocaleString()} + Transport: ${v.transport_cost.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white border border-slate-200 rounded-lg text-slate-400">
                No vendors found in range for this destination.
              </div>
            )}
          </div>

          {/* Comparison summary */}
          {rfq.best_value && rfq.vendor_quotes.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Quote Comparison</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Lowest Cost</p>
                  <p className="font-semibold">{rfq.best_value.organization.name}</p>
                  <p className="text-slate-500">${rfq.best_value.total_estimate.toLocaleString()}</p>
                </div>
                {rfq.fastest_delivery && (
                  <div>
                    <p className="text-xs text-slate-400">Fastest Delivery</p>
                    <p className="font-semibold">{rfq.fastest_delivery.organization.name}</p>
                    <p className="text-slate-500">{rfq.fastest_delivery.estimated_delivery_days} day(s)</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400">Price Range</p>
                  <p className="font-semibold">
                    ${rfq.vendor_quotes[0].total_estimate.toLocaleString()} — ${rfq.vendor_quotes[rfq.vendor_quotes.length - 1].total_estimate.toLocaleString()}
                  </p>
                  <p className="text-slate-500">
                    Spread: ${(rfq.vendor_quotes[rfq.vendor_quotes.length - 1].total_estimate - rfq.vendor_quotes[0].total_estimate).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
