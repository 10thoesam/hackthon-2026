import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Dashboard from './pages/Dashboard'
import Solicitations from './pages/Solicitations'
import Organizations from './pages/Organizations'
import SolicitationDetail from './pages/SolicitationDetail'
import JoinForm from './pages/JoinForm'
import PostContract from './pages/PostContract'
import Login from './pages/Login'
import Register from './pages/Register'

const publicNavLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/solicitations', label: 'Solicitations' },
  { to: '/organizations/suppliers', label: 'Suppliers' },
  { to: '/organizations/distributors', label: 'Distributors' },
  { to: '/organizations/nonprofits', label: 'Nonprofits' },
]

const authNavLinks = [
  { to: '/join', label: 'Join' },
  { to: '/post-contract', label: 'Post Contract' },
]

export default function App() {
  const location = useLocation()
  const { user, logout } = useAuth()

  const navLinks = user ? [...publicNavLinks, ...authNavLinks] : publicNavLinks

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="text-lg font-semibold text-slate-900 tracking-tight">
              FoodMatch
            </Link>
            <div className="flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    (location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to)))
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <div className="flex items-center gap-2 ml-3 pl-3 border-l border-slate-200">
                  <span className="text-sm text-slate-500">{user.name}</span>
                  <button
                    onClick={logout}
                    className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 ml-3 pl-3 border-l border-slate-200">
                  <Link
                    to="/login"
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      location.pathname === '/login' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-1.5 rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/solicitations" element={<Solicitations />} />
          <Route path="/solicitations/:id" element={<SolicitationDetail />} />
          <Route path="/organizations/suppliers" element={<Organizations defaultType="supplier" />} />
          <Route path="/organizations/distributors" element={<Organizations defaultType="distributor" />} />
          <Route path="/organizations/nonprofits" element={<Organizations defaultType="nonprofit" />} />
          <Route path="/join" element={<JoinForm />} />
          <Route path="/post-contract" element={<PostContract />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
    </div>
  )
}
