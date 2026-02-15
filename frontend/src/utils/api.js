import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
    }
    return Promise.reject(error)
  }
)

export const fetchSolicitations = (params) => api.get('/solicitations', { params })
export const fetchSolicitation = (id) => api.get(`/solicitations/${id}`)
export const fetchOrganizations = (params) => api.get('/organizations', { params })
export const fetchOrganization = (id) => api.get(`/organizations/${id}`)
export const generateMatches = (solicitationId) => api.post('/matches/generate', { solicitation_id: solicitationId })
export const fetchMatches = (params) => api.get('/matches', { params })
export const fetchDashboardStats = () => api.get('/dashboard/stats')
export const fetchZipScores = () => api.get('/dashboard/zip-scores')
export const fetchCrisisForecast = () => api.get('/dashboard/crisis-forecast')
export const createOrganization = (data) => api.post('/organizations', data)
export const createSolicitation = (data) => api.post('/solicitations', data)
export const deleteSolicitation = (id) => api.delete(`/solicitations/${id}`)
export const registerUser = (data) => api.post('/auth/register', data)
export const loginUser = (data) => api.post('/auth/login', data)
export const fetchCurrentUser = () => api.get('/auth/me')
export const runTriage = () => api.post('/matches/triage')

// Emergency capacity
export const fetchEmergencyCapacity = (params) => api.get('/emergency/capacity', { params })
export const registerEmergencyCapacity = (data) => api.post('/emergency/capacity', data)
export const deleteEmergencyCapacity = (id) => api.delete(`/emergency/capacity/${id}`)
export const fetchCrisisDashboard = () => api.get('/emergency/crisis-dashboard')
export const fetchSupplyTypes = () => api.get('/emergency/supply-types')

// Predictions
export const fetchPredictions = (params) => api.get('/predictions/food-insecurity', { params })
export const fetchSurplusMatching = () => api.get('/predictions/surplus-matching')
export const fetchWasteReduction = () => api.get('/predictions/waste-reduction')

// RFQ
export const generateRFQ = (data) => api.post('/rfq/estimate', data)
export const fetchSupplyCosts = () => api.get('/rfq/supply-costs')

// Portals
export const fetchSupplierMatches = (orgId) => api.get(`/portal/supplier/${orgId}/matches`)
export const fetchDistributorMatches = (orgId) => api.get(`/portal/distributor/${orgId}/matches`)
export const fetchFederalVendors = (params) => api.get('/portal/federal/vendors', { params })
export const federalTriMatch = (data) => api.post('/portal/federal/match', data)

export default api
