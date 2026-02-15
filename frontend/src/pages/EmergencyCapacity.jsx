import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import {
  fetchEmergencyCapacity,
  registerEmergencyCapacity,
  deleteEmergencyCapacity,
  fetchOrganizations,
} from '../utils/api'

const SUPPLY_TYPES = [
  { value: 'water', label: 'Drinking Water' },
  { value: 'non_perishable', label: 'Non-Perishable Food' },
  { value: 'fresh_produce', label: 'Fresh Produce' },
  { value: 'canned_goods', label: 'Canned Goods' },
  { value: 'baby_formula', label: 'Baby Formula' },
  { value: 'medical_nutrition', label: 'Medical Nutrition' },
  { value: 'shelf_stable', label: 'Shelf-Stable Meals' },
  { value: 'grains_cereals', label: 'Grains & Cereals' },
  { value: 'protein', label: 'Protein (Meat/Beans)' },
  { value: 'dairy', label: 'Dairy Products' },
  { value: 'hygiene_supplies', label: 'Hygiene Supplies' },
]

const UNITS = ['units', 'lbs', 'pallets', 'cases', 'gallons', 'cans', 'kits', 'meals']

export default function EmergencyCapacity() {
  const { user } = useAuth()
  const [capacities, setCapacities] = useState([])
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    organization_id: '', supply_type: 'water', item_name: '',
    quantity: '', unit: 'units', unit_cost: '', zip_code: '',
    service_radius_miles: '200', available_date: '', expiry_date: '',
  })

  const load = () => {
    setLoading(true)
    const params = filter ? { supply_type: filter } : {}
    fetchEmergencyCapacity(params)
      .then(res => setCapacities(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])
  useEffect(() => {
    fetchOrganizations({ org_type: 'supplier' })
      .then(res => setOrgs(res.data))
      .catch(() => {})
  }, [])

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await registerEmergencyCapacity({
        ...form,
        organization_id: Number(form.organization_id),
        quantity: Number(form.quantity),
        unit_cost: form.unit_cost ? Number(form.unit_cost) : 0,
        service_radius_miles: Number(form.service_radius_miles),
      })
      setShowForm(false)
      setForm({
        organization_id: '', supply_type: 'water', item_name: '',
        quantity: '', unit: 'units', unit_cost: '', zip_code: '',
        service_radius_miles: '200', available_date: '', expiry_date: '',
      })
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register capacity')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this capacity registration?')) return
    try {
      await deleteEmergencyCapacity(id)
      load()
    } catch {
      // ignore
    }
  }

  // Group by supply type for summary
  const byType = {}
  capacities.forEach(c => {
    if (!byType[c.supply_type]) byType[c.supply_type] = { count: 0, totalQty: 0 }
    byType[c.supply_type].count++
    byType[c.supply_type].totalQty += c.quantity
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Emergency Capacity Registry</h1>
          <p className="text-sm text-slate-400">Pre-register supply capacity before disasters strike</p>
        </div>
        {user && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Register Capacity'}
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-400">Total Registrations</p>
          <p className="text-2xl font-semibold text-slate-800">{capacities.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-400">Supply Types</p>
          <p className="text-2xl font-semibold text-slate-800">{Object.keys(byType).length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-400">Total Quantity</p>
          <p className="text-2xl font-semibold text-slate-800">{capacities.reduce((s, c) => s + c.quantity, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-400">Est. Value</p>
          <p className="text-2xl font-semibold text-slate-800">${capacities.reduce((s, c) => s + c.quantity * c.unit_cost, 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Registration form */}
      {showForm && user && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Register Emergency Capacity</h2>
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Organization *</label>
                <select
                  required value={form.organization_id}
                  onChange={e => update('organization_id', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Select organization...</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Supply Type *</label>
                <select
                  required value={form.supply_type}
                  onChange={e => update('supply_type', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {SUPPLY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Item Name *</label>
                <input
                  type="text" required value={form.item_name}
                  onChange={e => update('item_name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="e.g. Bottled Water 16oz"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Quantity *</label>
                <input
                  type="number" required value={form.quantity} min={1}
                  onChange={e => update('quantity', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Unit</label>
                <select value={form.unit} onChange={e => update('unit', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Unit Cost ($)</label>
                <input type="number" step="0.01" value={form.unit_cost}
                  onChange={e => update('unit_cost', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">ZIP Code *</label>
                <input type="text" required value={form.zip_code} maxLength={10}
                  onChange={e => update('zip_code', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Available Date</label>
                <input type="date" value={form.available_date}
                  onChange={e => update('available_date', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Expiry Date</label>
                <input type="date" value={form.expiry_date}
                  onChange={e => update('expiry_date', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
            <button type="submit" disabled={submitting}
              className="px-6 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
              {submitting ? 'Registering...' : 'Register Capacity'}
            </button>
          </form>
        </div>
      )}

      {!user && (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-400 mb-3">Log in to register emergency capacity for your organization.</p>
          <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900">Login</Link>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setFilter('')}
          className={`px-3 py-1 rounded-full text-sm ${!filter ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
          All
        </button>
        {SUPPLY_TYPES.map(t => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={`px-3 py-1 rounded-full text-sm ${filter === t.value ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Capacity list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : capacities.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg text-slate-400">
          No emergency capacity registered yet. Be the first to pre-register supplies.
        </div>
      ) : (
        <div className="grid gap-3">
          {capacities.map(cap => (
            <div key={cap.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-800">{cap.item_name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                      {SUPPLY_TYPES.find(t => t.value === cap.supply_type)?.label || cap.supply_type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${cap.status === 'available' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                      {cap.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{cap.organization?.name || 'Unknown Org'} — ZIP {cap.zip_code}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                    <span>{cap.quantity.toLocaleString()} {cap.unit}</span>
                    {cap.unit_cost > 0 && <span>${cap.unit_cost}/{cap.unit}</span>}
                    <span>{cap.service_radius_miles} mi radius</span>
                    {cap.expiry_date && <span>Expires: {cap.expiry_date}</span>}
                  </div>
                </div>
                {user && (user.is_admin || user.id === cap.user_id) && (
                  <button onClick={() => handleDelete(cap.id)}
                    className="text-xs text-red-400 hover:text-red-600">Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
