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
      navigate('/solicitations?type=commercial')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 mb-4">You must be logged in to post a contract.</p>
        <Link to="/login" className="text-slate-700 hover:text-slate-900 font-medium">Login</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-1">Post a Commercial Contract</h1>
      <p className="text-sm text-slate-400 mb-6">List a food distribution opportunity for your company.</p>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Company Name *</label>
            <input
              type="text" required value={form.company_name}
              onChange={e => update('company_name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-slate-400 focus:border-slate-400 outline-none"
              placeholder="e.g. Acme Food Distribution"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Contact Email *</label>
            <input
              type="email" required value={form.company_email}
              onChange={e => update('company_email', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-slate-400 focus:border-slate-400 outline-none"
              placeholder="contracts@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Contract Title *</label>
          <input
            type="text" required value={form.title}
            onChange={e => update('title', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-slate-400 focus:border-slate-400 outline-none"
            placeholder="e.g. Regional Produce Distribution Partner Needed"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Description *</label>
          <textarea
            rows={4} required value={form.description}
            onChange={e => update('description', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-slate-400 focus:border-slate-400 outline-none"
            placeholder="Describe the contract opportunity, requirements, and expectations..."
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">ZIP Code *</label>
            <input
              type="text" required value={form.zip_code}
              onChange={e => update('zip_code', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-slate-400 focus:border-slate-400 outline-none"
              placeholder="e.g. 38614"
              maxLength={10}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Estimated Value ($)</label>
            <input
              type="number" value={form.estimated_value}
              onChange={e => update('estimated_value', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-slate-400 focus:border-slate-400 outline-none"
              placeholder="e.g. 100000"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Response Deadline</label>
            <input
              type="date" value={form.response_deadline}
              onChange={e => update('response_deadline', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-slate-400 focus:border-slate-400 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-2">
            Categories <span className="text-slate-300">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                type="button" key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  form.categories.includes(cat)
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Posting...' : 'Post Contract'}
        </button>
      </form>
    </div>
  )
}
