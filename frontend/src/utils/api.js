import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''
console.log('API_BASE:', API_BASE)

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor for logging
api.interceptors.request.use((config) => {
  console.log('API Request:', config.method?.toUpperCase(), config.url)
  return config
})

// Response interceptor for error normalisation
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('API Error:', err.config?.url, err.message, err.response?.status)
    const message =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'An unexpected error occurred'
    err.userMessage = message
    return Promise.reject(err)
  }
)

// ── Books/books ──────────────────────────────────────────────────────────────────

export const fetchBooks = (params = {}) =>
  api.get('/api/books/', { params }).then((r) => r.data)

export const fetchBook = (id) =>
  api.get(`/api/books/${id}`).then((r) => r.data)

export const fetchRecommendations = (id, limit = 5) =>
  api.get(`/api/books/${id}/recommendations`, { params: { limit } }).then((r) => r.data)

export const fetchGenres = () =>
  api.get('/api/books/genres').then((r) => r.data)

export const fetchStats = () =>
  api.get('/api/books/stats').then((r) => r.data)

// ── Scrape ─────────────────────────────────────────────────────────────────

export const triggerScrape = (payload) =>
  api.post('/api/books/scrape', payload).then((r) => r.data)

// ── Q&A ───────────────────────────────────────────────────────────────────

export const askQuestion = (payload) =>
  api.post('/api/books/ask', payload).then((r) => r.data)

// ── Health ─────────────────────────────────────────────────────────────────

export const fetchHealth = () =>
  api.get('/api/health').then((r) => r.data)

export default api
