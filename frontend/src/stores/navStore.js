import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../composables/useApi.js'

export const useNavStore = defineStore('nav', () => {
  const categories = ref([])
  const loading = ref(false)
  const activeTabId = ref('')
  const searchQuery = ref('')
  const siteSettings = ref({
    title: 'My Nav 的主页',
    logoUrl: '',
    githubJsdelivr: false,
    galleryAutoPlay: true,
    galleryAutoPlayInterval: 5000,
    galleryTransition: 'fade',
  })

  // Get all links across all categories for "全部" tab
  const allLinks = computed(() => {
    const links = []
    categories.value.forEach(cat => {
      if (cat.subCategories) {
        cat.subCategories.forEach(sub => {
          if (sub.links) {
            sub.links.forEach(link => {
              links.push({
                ...link,
                categoryId: cat.id,
                categoryName: cat.name,
                subCategoryId: sub.id,
                subCategoryName: sub.name,
                subCategoryColor: sub.color,
              })
            })
          }
        })
      }
    })
    return links
  })

  // Filter links by search query
  const filteredLinks = computed(() => {
    if (!searchQuery.value.trim()) return allLinks.value
    const q = searchQuery.value.toLowerCase()
    return allLinks.value.filter(link =>
      link.title.toLowerCase().includes(q) ||
      link.description.toLowerCase().includes(q) ||
      link.url.toLowerCase().includes(q)
    )
  })

  async function fetchAll() {
    loading.value = true
    try {
      const [catRes, settingsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/settings'),
      ])
      if (catRes.data.success) {
        categories.value = catRes.data.data
        if (catRes.data.data.length && !activeTabId.value) {
          activeTabId.value = catRes.data.data[0].id
        }
      }
      if (settingsRes.data.success) {
        siteSettings.value = settingsRes.data.data
      }
    } finally {
      loading.value = false
    }
  }

  // --- Top-level Category ---

  async function addCategory(payload) {
    const { data: res } = await api.post('/categories', payload)
    if (res.success) {
      categories.value.push(res.data)
    }
    return res.data
  }

  async function updateCategory(catId, payload) {
    const { data: res } = await api.put(`/categories/${catId}`, payload)
    if (res.success) {
      const idx = categories.value.findIndex(c => c.id === catId)
      if (idx !== -1) Object.assign(categories.value[idx], res.data)
    }
  }

  async function deleteCategory(catId) {
    const { data: res } = await api.delete(`/categories/${catId}`)
    if (res.success) {
      categories.value = categories.value.filter(c => c.id !== catId)
      if (activeTabId.value === catId && categories.value.length) {
        activeTabId.value = categories.value[0].id
      }
    }
  }

  // --- SubCategory (二级分类) ---

  async function addSubCategory(catId, payload) {
    const { data: res } = await api.post(`/categories/${catId}/subcategories`, payload)
    if (res.success) {
      const cat = categories.value.find(c => c.id === catId)
      if (cat) {
        if (!cat.subCategories) cat.subCategories = []
        cat.subCategories.push(res.data)
      }
    }
    return res.data
  }

  async function updateSubCategory(catId, subId, payload) {
    const { data: res } = await api.put(`/categories/${catId}/subcategories/${subId}`, payload)
    if (res.success) {
      const cat = categories.value.find(c => c.id === catId)
      if (cat && cat.subCategories) {
        const idx = cat.subCategories.findIndex(s => s.id === subId)
        if (idx !== -1) Object.assign(cat.subCategories[idx], res.data)
      }
    }
  }

  async function deleteSubCategory(catId, subId) {
    const { data: res } = await api.delete(`/categories/${catId}/subcategories/${subId}`)
    if (res.success) {
      const cat = categories.value.find(c => c.id === catId)
      if (cat && cat.subCategories) {
        cat.subCategories = cat.subCategories.filter(s => s.id !== subId)
      }
    }
  }

  // --- Links ---

  async function addLink(catId, subId, payload) {
    const { data: res } = await api.post(`/categories/${catId}/subcategories/${subId}/links`, payload)
    if (res.success) {
      const cat = categories.value.find(c => c.id === catId)
      if (cat && cat.subCategories) {
        const sub = cat.subCategories.find(s => s.id === subId)
        if (sub) sub.links.push(res.data)
      }
    }
    return res.data
  }

  async function updateLink(catId, subId, linkId, payload) {
    const { data: res } = await api.put(`/categories/${catId}/subcategories/${subId}/links/${linkId}`, payload)
    if (res.success) {
      const cat = categories.value.find(c => c.id === catId)
      if (cat && cat.subCategories) {
        const sub = cat.subCategories.find(s => s.id === subId)
        if (sub) {
          const idx = sub.links.findIndex(l => l.id === linkId)
          if (idx !== -1) Object.assign(sub.links[idx], res.data)
        }
      }
    }
  }

  async function moveLink(linkId, fromCatId, fromSubId, toCatId, toSubId, payload) {
    const { data: res } = await api.post('/links/move', {
      linkId, fromCatId, fromSubId, toCatId, toSubId, data: payload,
    })
    if (res.success) {
      // Remove from source
      const fromCat = categories.value.find(c => c.id === fromCatId)
      if (fromCat && fromCat.subCategories) {
        const fromSub = fromCat.subCategories.find(s => s.id === fromSubId)
        if (fromSub) fromSub.links = fromSub.links.filter(l => l.id !== linkId)
      }
      // Add to destination
      const toCat = categories.value.find(c => c.id === toCatId)
      if (toCat && toCat.subCategories) {
        const toSub = toCat.subCategories.find(s => s.id === toSubId)
        if (toSub) toSub.links.push(res.data)
      }
    }
  }

  async function deleteLink(catId, subId, linkId) {
    const { data: res } = await api.delete(`/categories/${catId}/subcategories/${subId}/links/${linkId}`)
    if (res.success) {
      const cat = categories.value.find(c => c.id === catId)
      if (cat && cat.subCategories) {
        const sub = cat.subCategories.find(s => s.id === subId)
        if (sub) sub.links = sub.links.filter(l => l.id !== linkId)
      }
    }
  }

  async function fetchMeta(url, options = {}) {
    const { data: res } = await api.post('/fetch-meta', { url, skipIconSource: options.skipIconSource })
    return res.success ? res.data : null
  }

  async function matchIcons(url) {
    const { data: res } = await api.post('/match-icons', { url })
    return res.success ? res.data : []
  }

  async function searchDashboardIcons(query, limit = 20) {
    const { data: res } = await api.post('/search-dashboard-icons', { query, limit })
    return res.success ? res.data : []
  }

  async function searchLobeIcons(query, limit = 20) {
    const { data: res } = await api.post('/search-lobe-icons', { query, limit })
    return res.success ? res.data : []
  }

  // --- Site settings ---

  async function updateSettings(payload) {
    const { data: res } = await api.put('/settings', payload)
    if (res.success) {
      siteSettings.value = res.data
    }
  }

  async function uploadLogo(file) {
    const formData = new FormData()
    formData.append('logo', file)
    const { data: res } = await api.post('/settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (res.success) {
      siteSettings.value.logoUrl = res.data.logoUrl
    }
  }

  // 将 GitHub raw 直链转换为 jsdelivr 加速链接
  function accelerateUrl(url) {
    if (!url || !siteSettings.value.githubJsdelivr) return url
    return url.replace(
      /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/,
      'https://cdn.jsdelivr.net/gh/$1/$2@$3/$4'
    )
  }

  // --- Reorder ---

  async function reorderCategories(orderedIds) {
    await api.put('/categories/reorder', { orderedIds })
    // Update local order
    const catMap = new Map(categories.value.map(c => [c.id, c]))
    orderedIds.forEach((id, index) => {
      const cat = catMap.get(id)
      if (cat) cat.order = index
    })
    categories.value.sort((a, b) => a.order - b.order)
  }

  async function reorderSubCategories(catId, orderedIds) {
    await api.put(`/categories/${catId}/subcategories/reorder`, { orderedIds })
    const cat = categories.value.find(c => c.id === catId)
    if (cat && cat.subCategories) {
      const subMap = new Map(cat.subCategories.map(s => [s.id, s]))
      orderedIds.forEach((id, index) => {
        const sub = subMap.get(id)
        if (sub) sub.order = index
      })
      cat.subCategories.sort((a, b) => a.order - b.order)
    }
  }

  async function reorderLinks(catId, subId, orderedIds) {
    await api.put(`/categories/${catId}/subcategories/${subId}/links/reorder`, { orderedIds })
    const cat = categories.value.find(c => c.id === catId)
    if (cat && cat.subCategories) {
      const sub = cat.subCategories.find(s => s.id === subId)
      if (sub && sub.links) {
        const linkMap = new Map(sub.links.map(l => [l.id, l]))
        orderedIds.forEach((id, index) => {
          const link = linkMap.get(id)
          if (link) link.order = index
        })
        sub.links.sort((a, b) => a.order - b.order)
      }
    }
  }

  return {
    categories,
    loading,
    activeTabId,
    searchQuery,
    siteSettings,
    allLinks,
    filteredLinks,
    fetchAll,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    addLink,
    updateLink,
    moveLink,
    deleteLink,
    fetchMeta,
    matchIcons,
    searchDashboardIcons,
    searchLobeIcons,
    updateSettings,
    uploadLogo,
    accelerateUrl,
    reorderCategories,
    reorderSubCategories,
    reorderLinks,
  }
})
