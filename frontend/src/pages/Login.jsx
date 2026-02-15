import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await loginUser(form)
      login(res.data.token, res.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Login</h1>
      <p className="text-slate-500 mb-6">Sign in to your FoodMatch account.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="Enter your password"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="text-sm text-slate-500 mt-4 text-center">
        Don't have an account? <Link to="/register" className="text-green-700 hover:text-green-800 font-medium">Register</Link>
      </p>
    </div>
  )
}
