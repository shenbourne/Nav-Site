<template>
  <BaseModal :visible="visible" title="选择图标" width="640px" @close="$emit('close')">
    <div class="icon-picker">
      <!-- 搜索框 -->
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索图标 (如: github, claude, docker...)"
          class="search-input"
          @input="onSearchInput"
        />
        <button v-if="searchQuery" class="clear-btn" @click="clearSearch">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        <span>搜索中...</span>
      </div>

      <!-- 搜索结果 -->
      <div v-else-if="hasResults" class="results-container">
        <!-- 本地图标 -->
        <div v-if="localIcons.length > 0" class="source-section">
          <div class="source-header">
            <span class="source-name">本地图标</span>
            <span class="source-count">{{ localIcons.length }}</span>
          </div>
          <div class="icons-grid">
            <div
              v-for="icon in localIcons"
              :key="'local-' + icon.icon"
              class="icon-item"
              @click="selectLocalIcon(icon)"
              :title="getIconName(icon.icon)"
            >
              <div class="icon-image">
                <img :src="icon.icon" :alt="getIconName(icon.icon)" loading="lazy" @error="handleImageError" />
              </div>
              <span class="icon-name">{{ formatIconName(getIconName(icon.icon)) }}</span>
              <span class="match-badge" :class="icon.type">{{ getMatchLabel(icon.type) }}</span>
            </div>
          </div>
        </div>

        <!-- Dashboard Icons -->
        <div v-if="dashboardIcons.length > 0" class="source-section">
          <div class="source-header">
            <span class="source-name">Dashboard Icons</span>
            <span class="source-count">{{ dashboardIcons.length }}</span>
          </div>
          <div class="icons-grid">
            <div
              v-for="icon in dashboardIcons"
              :key="'db-' + icon.name"
              class="icon-item"
              @click="selectDashboardIcon(icon)"
              :title="icon.name"
            >
              <div class="icon-image">
                <img :src="icon.pngUrl" :alt="icon.name" loading="lazy" @error="handleImageError" />
              </div>
              <span class="icon-name">{{ formatIconName(icon.name) }}</span>
              <div v-if="icon.colors" class="variant-indicator">
                <span>☀🌙</span>
              </div>
            </div>
          </div>
        </div>

        <!-- LobeHub Icons -->
        <div v-if="lobeIcons.length > 0" class="source-section">
          <div class="source-header">
            <span class="source-name">LobeHub Icons</span>
            <span class="source-count">{{ lobeIcons.length }}</span>
          </div>
          <div class="icons-grid">
            <div
              v-for="icon in lobeIcons"
              :key="'lobe-' + icon.name"
              class="icon-item"
              @click="selectLobeIcon(icon)"
              :title="icon.name"
            >
              <div class="icon-image">
                <img :src="icon.light" :alt="icon.name" loading="lazy" @error="handleImageError" />
              </div>
              <span class="icon-name">{{ formatIconName(icon.name) }}</span>
              <div class="variant-indicator">
                <span>☀🌙</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="searchQuery && !loading && searched" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <p>未找到匹配的图标</p>
        <p class="empty-hint">试试其他关键词</p>
      </div>

      <!-- 初始提示 -->
      <div v-else class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <p>输入关键词搜索图标</p>
        <p class="empty-hint">同时搜索本地、Dashboard Icons 和 LobeHub Icons</p>
      </div>

      <!-- 底部信息 -->
      <div class="picker-footer">
        <span class="icons-count">
          <template v-if="totalCount > 0">共 {{ totalCount }} 个结果</template>
        </span>
        <div class="source-links">
          <a href="https://dashboardicons.com/" target="_blank" rel="noopener noreferrer">Dashboard Icons</a>
          <span class="divider">·</span>
          <a href="https://github.com/lobehub/lobe-icons" target="_blank" rel="noopener noreferrer">LobeHub Icons</a>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  visible: Boolean,
})

const emit = defineEmits(['close', 'select'])

const searchQuery = ref('')
const localIcons = ref([])
const dashboardIcons = ref([])
const lobeIcons = ref([])
const loading = ref(false)
const searched = ref(false)
let searchTimeout = null

const totalCount = computed(() => localIcons.value.length + dashboardIcons.value.length + lobeIcons.value.length)
const hasResults = computed(() => totalCount.value > 0)

// 监听 visible 变化
watch(() => props.visible, (val) => {
  if (val) {
    searchQuery.value = ''
    localIcons.value = []
    dashboardIcons.value = []
    lobeIcons.value = []
    loading.value = false
    searched.value = false
    setTimeout(() => {
      const input = document.querySelector('.icon-picker .search-input')
      input?.focus()
    }, 100)
  }
})

function onSearchInput() {
  clearTimeout(searchTimeout)
  if (!searchQuery.value.trim()) {
    localIcons.value = []
    dashboardIcons.value = []
    lobeIcons.value = []
    loading.value = false
    searched.value = false
    return
  }
  
  loading.value = true
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 300)
}

async function performSearch() {
  const query = searchQuery.value.trim()
  if (!query) {
    loading.value = false
    return
  }

  try {
    const storeModule = await import('../../stores/navStore.js')
    const { useNavStore } = storeModule
    const navStore = useNavStore()
    
    // 并行搜索三个源
    const [localResults, dashboardResults, lobeResults] = await Promise.allSettled([
      // 本地图标（需要 URL 才能搜索）
      Promise.resolve([]), // 本地获取需要 URL，这里先返回空，稍后处理
      navStore.searchDashboardIcons(query, 12),
      navStore.searchLobeIcons(query, 12)
    ])
    
    dashboardIcons.value = dashboardResults.status === 'fulfilled' ? dashboardResults.value : []
    lobeIcons.value = lobeResults.status === 'fulfilled' ? lobeResults.value : []
    localIcons.value = [] // 本地图标需要单独处理
    searched.value = true
  } catch (err) {
    console.error('搜索图标失败:', err)
  } finally {
    loading.value = false
  }
}

function clearSearch() {
  searchQuery.value = ''
  localIcons.value = []
  dashboardIcons.value = []
  lobeIcons.value = []
  loading.value = false
  searched.value = false
}

// 选择本地图标
function selectLocalIcon(icon) {
  emit('select', {
    source: 'local',
    light: icon.icon,
    dark: null,
    name: getIconName(icon.icon)
  })
  emit('close')
}

// 选择 Dashboard Icon
function selectDashboardIcon(icon) {
  // 辅助函数：将 SVG URL 转换为 PNG URL
  const toPngUrl = (svgUrl) => {
    if (!svgUrl) return null
    return svgUrl.replace('/svg/', '/png/').replace('.svg', '.png')
  }
  
  let light = null
  let dark = null
  
  // 特殊情况：github
  if (icon.name === 'github') {
    light = icon.pngUrl
    dark = toPngUrl(icon.variants?.light) || icon.pngUrl.replace('github.png', 'github-light.png')
  }
  // 有 colors 字段
  else if (icon.colors) {
    if (icon.colors.light) {
      light = `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${icon.colors.light}.png`
    }
    if (icon.colors.dark) {
      dark = `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${icon.colors.dark}.png`
    }
  }
  // 无变体
  else {
    light = icon.pngUrl
  }
  
  emit('select', {
    source: 'dashboard',
    light: light || icon.pngUrl,
    dark: dark,
    name: icon.name
  })
  emit('close')
}

// 选择 LobeHub Icon
function selectLobeIcon(icon) {
  emit('select', {
    source: 'lobehub',
    light: icon.light,
    dark: icon.dark,
    name: icon.name
  })
  emit('close')
}

function getIconName(iconUrl) {
  const parts = iconUrl.split('/')
  return parts[parts.length - 1]
}

function formatIconName(name) {
  if (name.length > 12) {
    return name.slice(0, 10) + '...'
  }
  return name
}

function getMatchLabel(type) {
  const labels = {
    exact: '精确',
    contains: '包含',
    fuzzy: '模糊'
  }
  return labels[type] || ''
}

function handleImageError(e) {
  e.target.style.display = 'none'
}
</script>

<style scoped>
.icon-picker {
  display: flex;
  flex-direction: column;
  max-height: 70vh;
}

.search-box {
  position: relative;
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-card);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-base);
}

.search-input:focus {
  border-color: var(--color-primary);
}

.clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-hint);
  border-radius: 4px;
  transition: var(--transition-base);
}

.clear-btn:hover {
  background: var(--color-btn-secondary);
  color: var(--color-text-secondary);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--color-text-secondary);
  gap: 12px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.results-container {
  overflow-y: auto;
  max-height: 480px;
  padding-right: 4px;
}

.source-section {
  margin-bottom: 20px;
}

.source-section:last-child {
  margin-bottom: 0;
}

.source-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border);
}

.source-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.source-count {
  font-size: 11px;
  color: var(--color-text-hint);
  background: var(--bg-section);
  padding: 2px 6px;
  border-radius: 10px;
}

.icons-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition-base);
  border: 2px solid transparent;
  position: relative;
}

.icon-item:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.icon-image {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-section);
  border-radius: 6px;
  padding: 4px;
}

.icon-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.icon-name {
  font-size: 10px;
  color: var(--color-text-secondary);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-badge {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--bg-section);
  color: var(--color-text-hint);
}

.match-badge.exact {
  background: #d4edda;
  color: #155724;
}

.match-badge.contains {
  background: #fff3cd;
  color: #856404;
}

.variant-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 9px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--color-text-hint);
  gap: 12px;
}

.empty-state p {
  font-size: 14px;
}

.empty-hint {
  font-size: 12px !important;
  color: var(--color-text-secondary);
}

.picker-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text-hint);
}

.source-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.source-links a {
  color: var(--color-primary);
  transition: var(--transition-base);
}

.source-links a:hover {
  text-decoration: underline;
}

.divider {
  color: var(--color-border);
}

/* 滚动条样式 */
.results-container::-webkit-scrollbar {
  width: 6px;
}

.results-container::-webkit-scrollbar-track {
  background: transparent;
}

.results-container::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.results-container::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-hint);
}
</style>
