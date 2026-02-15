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
  { to: '/solicitations/government', label: 'Government' },
  { to: '/solicitations/commercial', label: 'Commercial' },
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
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-700">FoodMatch</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">MVP</span>
            </Link>
            <div className="flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    (location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to)))
                      ? 'bg-green-50 text-green-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                  <span className="text-sm text-slate-600">{user.name}</span>
                  <button
                    onClick={logout}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200">
                  <Link
                    to="/login"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/login' ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
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
          <Route path="/solicitations/government" element={<Solicitations defaultSourceType="government" />} />
          <Route path="/solicitations/commercial" element={<Solicitations defaultSourceType="commercial" />} />
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
