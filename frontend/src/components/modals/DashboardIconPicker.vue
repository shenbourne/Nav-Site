<template>
  <BaseModal :visible="visible" title="Dashboard Icons" width="520px" @close="$emit('close')">
    <div class="icon-picker">
      <!-- 搜索框 -->
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索图标 (如: plex, nextcloud, git...)"
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

      <!-- 图标列表 -->
      <div v-else-if="icons.length > 0" class="icons-grid">
        <div
          v-for="icon in icons"
          :key="icon.name"
          class="icon-item"
          :class="{ active: selectedName === icon.name }"
          @click="selectIcon(icon)"
          :title="icon.name + (icon.aliases.length ? ' (' + icon.aliases.join(', ') + ')' : '')"
        >
          <div class="icon-image">
            <img :src="icon.pngUrl" :alt="icon.name" loading="lazy" @error="handleImageError" />
          </div>
          <span class="icon-name">{{ formatIconName(icon.name) }}</span>
          <!-- 变体指示器 -->
          <div v-if="icon.colors || icon.hasVariants" class="variant-indicator">
            <span v-if="icon.colors?.light || icon.name.endsWith('-dark')" title="有浅色变体">☀</span>
            <span v-if="icon.colors?.dark || icon.name.endsWith('-light')" title="有深色变体">🌙</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="searchQuery && !loading" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <p>未找到匹配的图标</p>
        <p class="empty-hint">试试其他关键词，如: docker, nginx, mysql</p>
      </div>

      <!-- 初始提示 -->
      <div v-else class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <p>输入关键词搜索图标</p>
        <p class="empty-hint">支持 1800+ 个自托管服务图标</p>
      </div>

      <!-- 底部信息 -->
      <div class="picker-footer">
        <span class="icons-count">
          <template v-if="icons.length > 0">共 {{ icons.length }} 个结果</template>
        </span>
        <a href="https://dashboardicons.com/" target="_blank" rel="noopener noreferrer" class="source-link">
          dashboardicons.com
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  visible: Boolean,
  selectedName: { type: String, default: '' }
})

const emit = defineEmits(['close', 'select'])

const searchQuery = ref('')
const icons = ref([])
const loading = ref(false)
let searchTimeout = null

// 使用全局 store 的搜索方法
const store = window.__navStore__

// 监听 visible 变化，打开时自动聚焦
watch(() => props.visible, (val) => {
  if (val) {
    searchQuery.value = ''
    icons.value = []
    loading.value = false
    // 如果有 store 缓存，尝试加载
    setTimeout(() => {
      const input = document.querySelector('.dashboard-icon-picker .search-input')
      input?.focus()
    }, 100)
  }
})

function onSearchInput() {
  clearTimeout(searchTimeout)
  if (!searchQuery.value.trim()) {
    icons.value = []
    loading.value = false
    return
  }
  
  loading.value = true
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 300) // 防抖 300ms
}

async function performSearch() {
  const query = searchQuery.value.trim()
  if (!query) {
    icons.value = []
    loading.value = false
    return
  }

  try {
    // 使用全局 store
    const storeModule = await import('../../stores/navStore.js')
    const { useNavStore } = storeModule
    const navStore = useNavStore()
    
    const results = await navStore.searchDashboardIcons(query, 24)
    icons.value = results
  } catch (err) {
    console.error('搜索 Dashboard Icons 失败:', err)
    icons.value = []
  } finally {
    loading.value = false
  }
}

function clearSearch() {
  searchQuery.value = ''
  icons.value = []
  loading.value = false
}

function selectIcon(icon) {
  // 构建返回结果，包含亮色和暗色两个 URL
  const result = {
    light: null,
    dark: null,
    name: icon.name
  }
  
  // 辅助函数：构建 PNG URL
  const toPngUrl = (name) => {
    if (!name) return null
    return `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${name}.png`
  }
  
  // 特殊情况：github 的命名与其他图标相反
  // github.png 是暗色图标（适合浅色背景），github-light.png 是浅色图标（适合深色背景）
  if (icon.name === 'github') {
    result.light = toPngUrl('github')      // 亮色主题使用 github.png（暗色图标）
    result.dark = toPngUrl('github-light') // 暗色主题使用 github-light.png（浅色图标）
    emit('select', result)
    emit('close')
    return
  }
  
  // 优先使用 colors 字段（metadata 中定义的变体关系）
  if (icon.colors) {
    // colors.dark 指向暗色版本的名称（通常是当前图标本身）
    // colors.light 指向亮色版本的名称
    if (icon.colors.light) {
      result.light = toPngUrl(icon.colors.light)
    }
    if (icon.colors.dark) {
      result.dark = toPngUrl(icon.colors.dark)
    }
  }
  // 如果没有 colors 字段，使用传统的 -light/-dark 后缀判断
  else {
    // 情况1：图标本身以 -light 结尾
    if (icon.name.endsWith('-light')) {
      result.light = icon.pngUrl
      result.dark = toPngUrl(icon.name.replace('-light', ''))
    }
    // 情况2：图标本身以 -dark 结尾
    else if (icon.name.endsWith('-dark')) {
      result.dark = icon.pngUrl
      result.light = toPngUrl(icon.name.replace('-dark', '') + '-light')
    }
    // 情况3：无变体
    else {
      result.light = icon.pngUrl
    }
  }
  
  // 确保 light 有值（保底）
  if (!result.light) {
    result.light = icon.pngUrl
  }
  
  emit('select', result)
  emit('close')
}

function formatIconName(name) {
  // 将 kebab-case 转换为更友好的显示
  if (name.length > 12) {
    return name.slice(0, 10) + '...'
  }
  return name
}

function handleImageError(e) {
  // 如果 PNG 加载失败，尝试使用备用图片
  e.target.style.display = 'none'
}
</script>

<style scoped>
.icon-picker {
  display: flex;
  flex-direction: column;
  max-height: 60vh;
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

.icons-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  overflow-y: auto;
  padding: 4px;
  max-height: 360px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition-base);
  border: 2px solid transparent;
  position: relative;
}

.icon-item:hover {
  background: var(--color-primary-light);
}

.icon-item.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.icon-image {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-section);
  border-radius: 8px;
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

.icon-item:hover .icon-name {
  color: var(--color-primary);
}

.variant-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  gap: 2px;
  font-size: 10px;
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

.source-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-primary);
  transition: var(--transition-base);
}

.source-link:hover {
  text-decoration: underline;
}

/* 滚动条样式 */
.icons-grid::-webkit-scrollbar {
  width: 6px;
}

.icons-grid::-webkit-scrollbar-track {
  background: transparent;
}

.icons-grid::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.icons-grid::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-hint);
}
</style>
