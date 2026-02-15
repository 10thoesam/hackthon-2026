import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createSolicitation } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

const CATEGORIES = [
  'fresh produce', 'cold storage', 'last mile delivery', 'warehouse distribution',
  'refrigerated transport', 'meal preparation', 'institutional food service',
  'mobile food pantry', 'community nutrition', 'local sourcing', 'food hub operations',
  'shelf-stable goods', 'emergency supply', 'disaster relief', 'food rescue',
  'SNAP distribution', 'USDA commodities', 'culinary training', 'dietary accommodation',
  'senior nutrition', 'rural outreach', 'cultural food programs', 'food preservation',
  'technology platform', 'retail partnerships', 'farmers market',
]

export default function PostContract() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({
    company_name: '', company_email: '', title: '', description: '',
    zip_code: '', estimated_value: '', response_deadline: '',
    categories: [],
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const toggleCategory = (cat) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      }
      await createSolicitation(payload)
      navigate('/solicitations/commercial')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">You must be logged in to post a contract.</p>
        <Link to="/login" className="text-green-700 hover:text-green-800 font-medium">Login</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Post a Commercial Contract</h1>
      <p className="text-slate-500 mb-6">List a food distribution opportunity for your company.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
            <input
              type="text" required value={form.company_name}
              onChange={e => update('company_name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              placeholder="e.g. Acme Food Distribution"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email *</label>
            <input
              type="email" required value={form.company_email}
              onChange={e => update('company_email', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              placeholder="contracts@example.com"
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contract Title *</label>
          <input
            type="text" required value={form.title}
            onChange={e => update('title', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            placeholder="e.g. Regional Produce Distribution Partner Needed"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
          <textarea
            rows={4} required value={form.description}
            onChange={e => update('description', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            placeholder="Describe the contract opportunity, requirements, and expectations..."
          />
        </div>

        {/* ZIP, Value, Deadline */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code *</label>
            <input
              type="text" required value={form.zip_code}
              onChange={e => update('zip_code', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              placeholder="e.g. 38614"
              maxLength={10}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Value ($)</label>
            <input
              type="number" value={form.estimated_value}
              onChange={e => update('estimated_value', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              placeholder="e.g. 100000"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Response Deadline</label>
            <input
              type="date" value={form.response_deadline}
              onChange={e => update('response_deadline', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Categories <span className="text-slate-400 font-normal">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                type="button" key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  form.categories.includes(cat)
                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Posting...' : 'Post Contract'}
        </button>
      </form>
    </div>
  )
}
