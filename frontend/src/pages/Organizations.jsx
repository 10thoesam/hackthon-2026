import { useState, useEffect } from 'react'
import { fetchOrganizations } from '../utils/api'

const typeLabels = {
  supplier: 'Suppliers',
  distributor: 'Distributors',
  nonprofit: 'Nonprofits',
}

export default function Organizations({ defaultType }) {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (defaultType) params.type = defaultType
    fetchOrganizations(params)
      .then(res => setOrganizations(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [defaultType])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{typeLabels[defaultType] || 'Organizations'}</h1>
        <p className="text-sm text-slate-400">{defaultType ? `Showing all ${typeLabels[defaultType].toLowerCase()}` : 'Suppliers, distributors, and nonprofits'}</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {organizations.map(org => (
            <div key={org.id} className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-slate-800">{org.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">
                  {org.org_type}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-3">{org.description}</p>

              <div className="mb-2">
                <div className="flex flex-wrap gap-1 mt-1">
                  {(org.capabilities || []).map(cap => (
                    <span key={cap} className="bg-slate-50 text-slate-500 text-xs px-2 py-0.5 rounded-md">{cap}</span>
                  ))}
                </div>
              </div>

              {org.certifications?.length > 0 && (
                <div className="mb-2">
                  <div className="flex flex-wrap gap-1 mt-1">
                    {org.certifications.map(cert => (
                      <span key={cert} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-md">{cert}</span>
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
            <div className="text-center py-12 text-slate-400 col-span-2">No organizations found</div>
          )}
        </div>
      )}
    </div>
  )
}
