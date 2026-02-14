import { useState, useEffect } from 'react'
import { fetchDashboardStats, fetchZipScores, fetchSolicitations, fetchOrganizations } from '../utils/api'
import StatsCard from '../components/StatsCard'
import MapView from '../components/MapView'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [zipScores, setZipScores] = useState([])
  const [solicitations, setSolicitations] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchDashboardStats(),
      fetchZipScores(),
      fetchSolicitations(),
      fetchOrganizations(),
    ]).then(([statsRes, zipsRes, solsRes, orgsRes]) => {
      setStats(statsRes.data)
      setZipScores(zipsRes.data)
      setSolicitations(solsRes.data)
      setOrganizations(orgsRes.data)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500">Food distribution opportunity matching overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label="Solicitations" value={stats?.total_solicitations || 0} color="blue" />
        <StatsCard label="Organizations" value={stats?.total_organizations || 0} color="green" />
        <StatsCard label="Matches Generated" value={stats?.total_matches || 0} color="purple" />
        <StatsCard label="Avg Need Score" value={stats?.avg_need_score || 0} color="orange" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">
          National Overview
          <span className="text-sm font-normal text-slate-500 ml-2">
            Blue = Solicitations | Green = Organizations | Circles = Food Insecurity
          </span>
        </h2>
        <MapView
          solicitations={solicitations}
          organizations={organizations}
          zipScores={zipScores}
          height="500px"
        />
      </div>
    </div>
  )
}
