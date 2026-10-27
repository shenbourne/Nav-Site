import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const theme = ref(localStorage.getItem('nav_theme') || 'system')

  let mediaQuery = null
  let mediaHandler = null

  function resolveTheme() {
    if (theme.value === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme.value
  }

  function applyTheme() {
    const resolved = resolveTheme()
    document.documentElement.setAttribute('data-theme', resolved)
  }

  function removeMediaListener() {
    if (mediaQuery && mediaHandler) {
      mediaQuery.removeEventListener('change', mediaHandler)
      mediaQuery = null
      mediaHandler = null
    }
  }

  function addMediaListener() {
    removeMediaListener()
    if (theme.value === 'system') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaHandler = () => applyTheme()
      mediaQuery.addEventListener('change', mediaHandler)
    }
  }

  function setTheme(val) {
    theme.value = val
    localStorage.setItem('nav_theme', val)
    addMediaListener()
    applyTheme()
  }

  // Initialize on store creation
  addMediaListener()
  applyTheme()

  return {
    theme,
    setTheme,
  }
})
