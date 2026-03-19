<template>
  <BaseModal :visible="visible" title="选择图标" width="480px" @close="$emit('close')">
    <div class="icon-picker">
      <!-- 搜索框 -->
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索图标 (如: github, docker, vue...)"
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- 图标列表 -->
      <div class="icons-grid">
        <div
          v-for="icon in filteredIcons"
          :key="icon.slug"
          class="icon-item"
          :class="{ active: selectedSlug === icon.slug }"
          @click="selectIcon(icon)"
          :title="icon.title"
        >
          <div class="icon-svg" v-html="icon.svg"></div>
          <span class="icon-name">{{ icon.shortName }}</span>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredIcons.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <p>未找到匹配的图标</p>
      </div>

      <!-- 底部信息 -->
      <div class="picker-footer">
        <span class="icons-count">共 {{ filteredIcons.length }} 个图标</span>
        <a href="https://simpleicons.org/" target="_blank" rel="noopener noreferrer" class="source-link">
          Simple Icons
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
import { ref, computed } from 'vue'
import * as simpleIcons from 'simple-icons'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  visible: Boolean,
  selectedSlug: { type: String, default: '' }
})

const emit = defineEmits(['close', 'select'])

const searchQuery = ref('')

// 处理图标数据
const allIcons = computed(() => {
  return Object.values(simpleIcons).map(icon => {
    // 获取品牌色
    const brandColor = icon.hex ? `#${icon.hex}` : '#666'
    
    // 创建带颜色的 SVG
    const coloredSvg = icon.svg.replace(
      '<svg ',
      `<svg fill="${brandColor}" `
    )
    
    return {
      slug: icon.slug,
      title: icon.title,
      shortName: icon.title.length > 8 ? icon.title.slice(0, 6) + '...' : icon.title,
      svg: coloredSvg,
      source: icon.source,
      hex: icon.hex,
      brandColor
    }
  }).sort((a, b) => a.title.localeCompare(b.title))
})

// 搜索过滤
const filteredIcons = computed(() => {
  if (!searchQuery.value.trim()) {
    return allIcons.value.slice(0, 100) // 默认显示前100个
  }
  const query = searchQuery.value.toLowerCase()
  return allIcons.value.filter(icon => 
    icon.title.toLowerCase().includes(query) ||
    icon.slug.toLowerCase().includes(query)
  )
})

function selectIcon(icon) {
  // 返回 SVG 字符串，可以在 LinkCard 中直接使用
  emit('select', {
    slug: icon.slug,
    title: icon.title,
    svg: icon.svg,
    brandColor: icon.brandColor
  })
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

.icons-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  overflow-y: auto;
  padding: 4px;
  max-height: 400px;
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
}

.icon-item:hover {
  background: var(--color-primary-light);
}

.icon-item.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.icon-svg {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-svg :deep(svg) {
  width: 100%;
  height: 100%;
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
