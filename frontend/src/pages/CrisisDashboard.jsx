import { useState, useEffect } from 'react'
import { fetchCrisisDashboard, fetchEmergencyCapacity } from '../utils/api'
import MapView from '../components/MapView'

export default function CrisisDashboard() {
  const [data, setData] = useState(null)
  const [capacities, setCapacities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchCrisisDashboard().then(r => r.data),
      fetchEmergencyCapacity().then(r => r.data),
    ])
      .then(([dashboard, caps]) => {
        setData(dashboard)
        setCapacities(caps)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-12 text-gray-400">Loading crisis dashboard...</div>
  if (!data) return <div className="text-center py-12 text-gray-400">Failed to load data</div>

  const { regions, summary } = data
  const criticalRegions = regions.filter(r => r.avg_need_score >= 70)

  // Build map markers from capacities
  const capMarkers = capacities.filter(c => c.lat && c.lng).map(c => ({
    lat: c.lat, lng: c.lng, name: c.item_name,
    zip_code: c.zip_code, org_type: 'supplier',
  }))

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-1">
          <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded">CRISIS</span>
          <h1 className="text-xl font-bold text-white">Crisis Activation Dashboard</h1>
        </div>
        <p className="text-sm text-gray-400">Available emergency capacity by region</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-400">Capacity Registrations</p>
          <p className="text-2xl font-bold text-white">{summary.total_capacity_registrations}</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-400">Total Quantity</p>
          <p className="text-2xl font-bold text-white">{summary.total_quantity.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-400">Organizations</p>
          <p className="text-2xl font-bold text-white">{summary.total_organizations}</p>
        </div>
        <div className="bg-gray-900 border border-red-600/30 rounded-lg p-4">
          <p className="text-xs text-red-400">Critical Regions</p>
          <p className="text-2xl font-bold text-red-400">{summary.critical_regions}</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-400">Supply Types Available</p>
          <p className="text-2xl font-bold text-white">{Object.keys(summary.by_supply_type).length}</p>
        </div>
      </div>

      {/* Supply type breakdown */}
      {Object.keys(summary.by_supply_type).length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">Available Supply by Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(summary.by_supply_type).sort((a, b) => b[1] - a[1]).map(([type, qty]) => (
              <div key={type} className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400">{type.replace(/_/g, ' ')}</p>
                <p className="text-lg font-bold text-white">{qty.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map of capacity locations */}
      {capMarkers.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Capacity Locations</h2>
          <MapView
            organizations={capMarkers}
            solicitations={[]}
            height="300px"
          />
        </div>
      )}

      {/* Regions table */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Regional Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-500">
                <th className="px-5 py-2 font-medium">State</th>
                <th className="px-5 py-2 font-medium">Cities</th>
                <th className="px-5 py-2 font-medium">Need Score</th>
                <th className="px-5 py-2 font-medium">Population</th>
                <th className="px-5 py-2 font-medium">Critical ZIPs</th>
                <th className="px-5 py-2 font-medium">Capacity Items</th>
                <th className="px-5 py-2 font-medium">Organizations</th>
              </tr>
            </thead>
            <tbody>
              {regions.map(r => (
                <tr key={r.state} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                  <td className="px-5 py-3 font-bold text-white">{r.state}</td>
                  <td className="px-5 py-3 text-gray-400">{r.cities.slice(0, 3).join(', ')}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                      r.avg_need_score >= 75 ? 'bg-red-600/20 text-red-400' :
                      r.avg_need_score >= 60 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-green-600/20 text-green-400'
                    }`}>{r.avg_need_score}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-300">{r.total_population.toLocaleString()}</td>
                  <td className="px-5 py-3 text-white font-medium">{r.critical_zips}</td>
                  <td className="px-5 py-3 text-gray-300">{r.capacity_items.length}</td>
                  <td className="px-5 py-3 text-gray-300">{r.organizations.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Critical regions detail */}
      {criticalRegions.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Critical Regions — Capacity Details</h2>
          <div className="grid gap-3">
            {criticalRegions.map(r => (
              <div key={r.state} className="bg-gray-900 border border-red-600/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white">{r.state} — {r.cities.join(', ')}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-red-600/20 text-red-400 font-bold">Need: {r.avg_need_score}</span>
                </div>
                {r.capacity_items.length > 0 ? (
                  <div className="space-y-1">
                    {r.capacity_items.map((item, i) => (
                      <div key={i} className="text-sm text-gray-400 flex items-center gap-2">
                        <span className="text-xs px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">{item.supply_type.replace(/_/g, ' ')}</span>
                        <span className="text-white">{item.item_name} — {item.quantity} {item.unit}</span>
                        <span className="text-gray-600">via {item.org_name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-red-400 font-bold">No pre-registered capacity — CRITICAL GAP</p>
                )}
                {r.organizations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.organizations.map((o, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded">{o.name} ({o.type})</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
