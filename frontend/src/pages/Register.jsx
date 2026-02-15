import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setSubmitting(true)
    try {
      const res = await registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
      })
      login(res.data.token, res.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Create Account</h1>
      <p className="text-slate-500 mb-6">Join FoodMatch to post contracts and manage your organization.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input
            type="text" required value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            placeholder="John Smith"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email" required value={form.email}
            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            type="password" required value={form.password}
            onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
          <input
            type="password" required value={form.confirmPassword}
            onChange={e => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            placeholder="Repeat your password"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-sm text-slate-500 mt-4 text-center">
        Already have an account? <Link to="/login" className="text-green-700 hover:text-green-800 font-medium">Sign in</Link>
      </p>
    </div>
  )
}
