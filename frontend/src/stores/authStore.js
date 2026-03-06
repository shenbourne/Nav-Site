import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../composables/useApi.js'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('nav_token') || '')
  const username = ref(localStorage.getItem('nav_user') || '')

  const isLoggedIn = computed(() => !!token.value)

  async function login(user, pass) {
    const { data: res } = await api.post('/auth/login', { username: user, password: pass })
    if (res.success) {
      token.value = res.data.token
      username.value = res.data.username
      localStorage.setItem('nav_token', res.data.token)
      localStorage.setItem('nav_user', res.data.username)
      return true
    }
    return false
  }

  function logout() {
    token.value = ''
    username.value = ''
    localStorage.removeItem('nav_token')
    localStorage.removeItem('nav_user')
  }

  async function checkAuth() {
    if (!token.value) return false
    try {
      const { data: res } = await api.get('/auth/check')
      return res.success
    } catch {
      logout()
      return false
    }
  }

  async function changePassword(oldPassword, newPassword) {
    const { data: res } = await api.put('/auth/password', { oldPassword, newPassword })
    return res.success
  }

  // Listen for auth expired event
  if (typeof window !== 'undefined') {
    window.addEventListener('auth-expired', () => {
      logout()
    })
  }

  return {
    token,
    username,
    isLoggedIn,
    login,
    logout,
    checkAuth,
    changePassword,
  }
})
