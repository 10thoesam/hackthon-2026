import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrganization } from '../utils/api'

const CAPABILITIES = [
  'fresh produce', 'cold storage', 'last mile delivery', 'warehouse distribution',
  'refrigerated transport', 'meal preparation', 'institutional food service',
  'mobile food pantry', 'community nutrition', 'local sourcing', 'food hub operations',
  'shelf-stable goods', 'emergency supply', 'disaster relief', 'food rescue',
  'SNAP distribution', 'USDA commodities', 'culinary training', 'dietary accommodation',
  'senior nutrition', 'rural outreach', 'cultural food programs', 'food preservation',
  'technology platform', 'retail partnerships', 'farmers market',
]

const CERTIFICATIONS = [
  'USDA', 'FDA', 'SBA 8(a)', 'HUBZone', 'Small Business',
  'Feeding America', 'FEMA vendor', 'ServSafe', 'GAP Certified',
  'SQF Certified', 'FedRAMP', 'DoD vendor', 'Indian Economic Enterprise',
]

const ORG_TYPES = [
  { value: 'supplier', label: 'Supplier', desc: 'You supply food products or services' },
  { value: 'distributor', label: 'Distributor', desc: 'You handle logistics and distribution' },
  { value: 'nonprofit', label: 'Nonprofit', desc: 'You run food assistance programs' },
]

export default function JoinForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', org_type: '', description: '', zip_code: '',
    contact_email: '', service_radius_miles: 100,
    capabilities: [], certifications: [],
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const toggleItem = (field, item) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await createOrganization(form)
      const typeRoute = form.org_type === 'supplier' ? 'suppliers'
        : form.org_type === 'distributor' ? 'distributors' : 'nonprofits'
      navigate(`/organizations/${typeRoute}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Join FoodMatch</h1>
      <p className="text-slate-500 mb-6">Register your organization to get matched with food distribution opportunities.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Org Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Organization Type *</label>
          <div className="grid grid-cols-3 gap-3">
            {ORG_TYPES.map(t => (
              <button
                type="button"
                key={t.value}
                onClick={() => update('org_type', t.value)}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  form.org_type === t.value
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-medium text-sm">{t.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Name & Email */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name *</label>
            <input
              type="text" required value={form.name}
              onChange={e => update('name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              placeholder="e.g. Delta Fresh Foods Co-op"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email *</label>
            <input
              type="email" required value={form.contact_email}
              onChange={e => update('contact_email', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              placeholder="contact@example.com"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            rows={3} value={form.description}
            onChange={e => update('description', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            placeholder="Describe your organization and what you do..."
          />
        </div>

        {/* ZIP & Radius */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code *</label>
            <input
              type="text" required value={form.zip_code}
              onChange={e => update('zip_code', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              placeholder="e.g. 38614"
              maxLength={10}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Service Radius (miles)</label>
            <input
              type="number" value={form.service_radius_miles}
              onChange={e => update('service_radius_miles', Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              min={1} max={2000}
            />
          </div>
        </div>

        {/* Capabilities */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Capabilities <span className="text-slate-400 font-normal">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CAPABILITIES.map(cap => (
              <button
                type="button" key={cap}
                onClick={() => toggleItem('capabilities', cap)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  form.capabilities.includes(cap)
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {cap}
              </button>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Certifications <span className="text-slate-400 font-normal">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CERTIFICATIONS.map(cert => (
              <button
                type="button" key={cert}
                onClick={() => toggleItem('certifications', cert)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  form.certifications.includes(cert)
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {cert}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !form.org_type}
          className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Registering...' : 'Register Organization'}
        </button>
      </form>
    </div>
  )
}
