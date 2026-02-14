import { useState, useEffect } from 'react'
import { fetchOrganizations } from '../utils/api'
import FilterBar from '../components/FilterBar'

const typeFilters = [
  { value: 'supplier', label: 'Supplier' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'nonprofit', label: 'Nonprofit' },
]

export default function Organizations() {
  const [organizations, setOrganizations] = useState([])
  const [filters, setFilters] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (filters.type) params.type = filters.type
    fetchOrganizations(params)
      .then(res => setOrganizations(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filters])

  const typeBadge = {
    supplier: 'bg-blue-100 text-blue-700',
    distributor: 'bg-purple-100 text-purple-700',
    nonprofit: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Organizations</h1>
        <p className="text-slate-500">Suppliers, distributors, and nonprofits</p>
      </div>

      <FilterBar
        filters={[
          { key: 'type', label: 'Type', type: 'select', options: typeFilters },
        ]}
        values={filters}
        onChange={setFilters}
      />

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {organizations.map(org => (
            <div key={org.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-slate-800">{org.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge[org.org_type] || ''}`}>
                  {org.org_type}
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-3">{org.description}</p>

              <div className="mb-2">
                <span className="text-xs text-slate-500">Capabilities:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(org.capabilities || []).map(cap => (
                    <span key={cap} className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full">{cap}</span>
                  ))}
                </div>
              </div>

              {org.certifications?.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-slate-500">Certifications:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {org.certifications.map(cert => (
                      <span key={cert} className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full">{cert}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                <span>ZIP: {org.zip_code}</span>
                <span>Radius: {org.service_radius_miles} mi</span>
                {org.contact_email && <span>{org.contact_email}</span>}
              </div>
            </div>
          ))}
          {organizations.length === 0 && (
            <div className="text-center py-12 text-slate-500 col-span-2">No organizations found</div>
          )}
        </div>
      )}
    </div>
  )
}
