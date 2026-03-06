import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nav_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('nav_token')
      localStorage.removeItem('nav_user')
      window.dispatchEvent(new Event('auth-expired'))
    }
    return Promise.reject(error)
  }
)

export default api
