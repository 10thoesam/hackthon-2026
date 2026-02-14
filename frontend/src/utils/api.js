import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

export const fetchSolicitations = (params) => api.get('/solicitations', { params })
export const fetchSolicitation = (id) => api.get(`/solicitations/${id}`)
export const fetchOrganizations = (params) => api.get('/organizations', { params })
export const fetchOrganization = (id) => api.get(`/organizations/${id}`)
export const generateMatches = (solicitationId) => api.post('/matches/generate', { solicitation_id: solicitationId })
export const fetchMatches = (params) => api.get('/matches', { params })
export const fetchDashboardStats = () => api.get('/dashboard/stats')
export const fetchZipScores = () => api.get('/dashboard/zip-scores')

export default api
