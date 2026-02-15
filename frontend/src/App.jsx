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

function NavTab({ to, path, children }) {
  const active = to === '/' ? path === '/' : path.startsWith(to)
  return (
    <Link to={to} className={`px-2.5 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
      active ? 'bg-amber-500/20 text-amber-300' : 'text-gray-300 hover:text-white hover:bg-white/10'
    }`}>{children}</Link>
  )
}

export default function App() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const path = location.pathname

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top warning bar */}
      <div className="bg-amber-500 text-black text-center py-1 text-xs font-bold tracking-wide">
        FOODMATCH EMERGENCY DISTRIBUTION COORDINATION SYSTEM — AUTHORIZED PERSONNEL
      </div>

      <nav className="bg-gray-900 border-b border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              <Link to="/" className="text-lg font-bold text-white tracking-tight mr-3 flex items-center gap-2 shrink-0">
                <span className="bg-red-600 text-white text-xs font-black px-1.5 py-0.5 rounded">FM</span>
                FoodMatch
              </Link>

              <NavTab to="/" path={path}>Command</NavTab>
              <NavTab to="/solicitations" path={path}>Solicitations</NavTab>
              <NavTab to="/portal/suppliers" path={path}>Suppliers</NavTab>
              <NavTab to="/portal/distributors" path={path}>Distributors</NavTab>
              <NavTab to="/portal/federal" path={path}>Federal/NGO</NavTab>
              <NavTab to="/emergency" path={path}>Emergency</NavTab>
              <NavTab to="/crisis" path={path}>Crisis</NavTab>
              <NavTab to="/predictions" path={path}>Predictions</NavTab>
              <NavTab to="/rfq" path={path}>Cost Estimator</NavTab>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
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
