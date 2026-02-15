import { useState, useRef, useEffect } from 'react'
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
import EmergencyCapacity from './pages/EmergencyCapacity'
import CrisisDashboard from './pages/CrisisDashboard'
import Predictions from './pages/Predictions'
import CostEstimator from './pages/CostEstimator'
import SupplierPortal from './pages/SupplierPortal'
import DistributorPortal from './pages/DistributorPortal'
import FederalPortal from './pages/FederalPortal'

function Dropdown({ label, items, isActive }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          isActive
            ? 'bg-amber-500/20 text-amber-300'
            : 'text-gray-300 hover:text-white hover:bg-white/10'
        }`}
      >
        {label}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
          {items.map(item => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-amber-500/20 hover:text-amber-300 transition-colors"
            >
              <span className="font-medium">{item.label}</span>
              {item.desc && <span className="block text-xs text-gray-500 mt-0.5">{item.desc}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const path = location.pathname

  const isPortalActive = path.startsWith('/portal/')
  const isOpsActive = ['/crisis', '/emergency', '/predictions'].some(p => path.startsWith(p))

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top warning bar */}
      <div className="bg-amber-500 text-black text-center py-1 text-xs font-bold tracking-wide">
        FOODMATCH EMERGENCY DISTRIBUTION COORDINATION SYSTEM — AUTHORIZED PERSONNEL
      </div>

      <nav className="bg-gray-900 border-b border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-1">
              <Link to="/" className="text-lg font-bold text-white tracking-tight mr-4 flex items-center gap-2">
                <span className="bg-red-600 text-white text-xs font-black px-1.5 py-0.5 rounded">FM</span>
                FoodMatch
              </Link>

              <Link to="/" className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                path === '/' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}>Command</Link>

              <Link to="/solicitations" className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                path.startsWith('/solicitations') ? 'bg-amber-500/20 text-amber-300' : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}>Solicitations</Link>

              <Dropdown label="Portals" isActive={isPortalActive} items={[
                { to: '/portal/suppliers', label: 'Supplier Portal', desc: 'Find matched contracts & distributors' },
                { to: '/portal/distributors', label: 'Distributor Portal', desc: 'Find solicitations & suppliers' },
                { to: '/portal/federal', label: 'Federal / Nonprofit', desc: 'Vendor directory & RFQ matching' },
              ]} />

              <Dropdown label="Operations" isActive={isOpsActive} items={[
                { to: '/crisis', label: 'Crisis Dashboard', desc: 'Regional capacity & activation' },
                { to: '/emergency', label: 'Emergency Registry', desc: 'Pre-disaster supply registration' },
                { to: '/predictions', label: 'AI Predictions', desc: 'Food insecurity forecasting' },
              ]} />

              <Link to="/rfq" className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                path === '/rfq' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}>Sample RFQ</Link>
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Link to="/post-contract"
                    className="px-3 py-1.5 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">
                    + Contract
                  </Link>
                  <Link to="/join"
                    className="px-3 py-1.5 rounded text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                    Register Org
                  </Link>
                  <div className="h-5 w-px bg-gray-700 mx-1"></div>
                  <span className="text-sm text-amber-400 font-medium">{user.name}</span>
                  <button onClick={logout}
                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login"
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      path === '/login' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                    }`}>
                    Login
                  </Link>
                  <Link to="/register"
                    className="px-3 py-1.5 rounded text-sm font-bold bg-amber-500 text-black hover:bg-amber-400 transition-colors">
                    Register
                  </Link>
                </>
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
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/crisis" element={<CrisisDashboard />} />
          <Route path="/emergency" element={<EmergencyCapacity />} />
          <Route path="/rfq" element={<CostEstimator />} />
          <Route path="/portal/suppliers" element={<SupplierPortal />} />
          <Route path="/portal/distributors" element={<DistributorPortal />} />
          <Route path="/portal/federal" element={<FederalPortal />} />
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
