<template>
  <div class="link-card" @click="goToUrl" @mouseenter="showTooltip" @mouseleave="hideTooltip" @mousemove="moveTooltip">
    <div class="card-favicon">
      <img
        v-if="!faviconError"
        :src="link.favicon"
        :alt="link.title"
        @error="faviconError = true"
        class="favicon-img"
      />
      <span v-else class="favicon-fallback" :style="{ background: fallbackColor }">
        {{ fallbackLetter }}
      </span>
    </div>
    <div class="card-content">
      <h3 class="card-title">{{ link.title }}</h3>
      <p class="card-desc" v-if="link.description">{{ link.description }}</p>
      <span class="card-url">{{ displayUrl }}</span>
    </div>
    <div class="card-actions" v-if="showActions" @click.stop>
      <button class="action-btn" @click="$emit('edit')" title="编辑">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="action-btn danger" @click="$emit('delete')" title="删除">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
    <div class="card-buttons" v-if="link.customButtons && link.customButtons.length" @click.stop>
      <a
        v-for="btn in link.customButtons"
        :key="btn.id"
        :href="btn.url"
        target="_blank"
        rel="noopener noreferrer"
        class="custom-btn"
      >
        {{ btn.label }}
      </a>
    </div>
    <Teleport to="body">
      <div
        v-if="tooltipVisible"
        class="card-tooltip"
        :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
      >
        <div class="tooltip-title">{{ link.title }}</div>
        <div class="tooltip-desc" v-if="link.description" v-html="parsedDescription"></div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'

const props = defineProps({
  link: { type: Object, required: true },
  showActions: { type: Boolean, default: false },
})

defineEmits(['edit', 'delete'])

const faviconError = ref(false)
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
let tooltipTimer = null

const parsedDescription = computed(() => {
  const text = props.link.description || ''
  if (!text) return ''
  
  // 转义 HTML 特殊字符
  let html = text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
  
  // 解析图片语法 ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="tooltip-img" />')
  
  // 解析分隔线 --- 或 *** 或 ___
  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr class="tooltip-hr" />')
  
  // 解析代码语法 `code`
  html = html.replace(/`([^`]+)`/g, '<code class="tooltip-code">$1</code>')
  
  // 解析强调语法 **bold** 或 __bold__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="tooltip-strong">$1</strong>')
  html = html.replace(/__([^_]+)__/g, '<strong class="tooltip-strong">$1</strong>')
  
  // 解析斜体语法 *italic* 或 _italic_
  html = html.replace(/\*([^*]+)\*/g, '<em class="tooltip-em">$1</em>')
  html = html.replace(/_([^_]+)_/g, '<em class="tooltip-em">$1</em>')
  
  // 解析换行符，每行用 div 包裹
  const lines = html.split('\n')
  return lines.map(line => `<div class="tooltip-line">${line || '&nbsp;'}</div>`).join('')
})

function showTooltip() {
  tooltipTimer = setTimeout(() => {
    tooltipVisible.value = true
  }, 300)
}

function hideTooltip() {
  clearTimeout(tooltipTimer)
  tooltipVisible.value = false
}

function moveTooltip(e) {
  tooltipX.value = e.clientX + 12
  tooltipY.value = e.clientY + 12
}

onBeforeUnmount(() => {
  clearTimeout(tooltipTimer)
})

const displayUrl = computed(() => {
  try {
    const u = new URL(props.link.url)
    return u.hostname
  } catch {
    return props.link.url
  }
})

const fallbackLetter = computed(() => {
  return (props.link.title || props.link.url || '?').charAt(0).toUpperCase()
})

const fallbackColor = computed(() => {
  const colors = ['#4a90d9', '#43e97b', '#f093fb', '#fa709a', '#4facfe', '#30cfd0', '#a18cd1', '#f6d365']
  let hash = 0
  const str = props.link.url || props.link.title || ''
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
})

function goToUrl() {
  if (props.link.url) {
    window.open(props.link.url, '_blank', 'noopener,noreferrer')
  }
}
</script>

<style scoped>
.link-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 20px;
  background: var(--bg-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: var(--transition-base);
  position: relative;
}

.link-card:hover {
  box-shadow: var(--shadow-hover);
}

.card-favicon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-section);
}

.favicon-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.favicon-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  font-weight: 600;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}

.card-url {
  font-size: 12px;
  color: var(--color-text-hint);
}

.card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-base);
}

.link-card:hover .card-actions {
  opacity: 1;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-hint);
  transition: var(--transition-base);
}

.action-btn:hover {
  background: var(--color-btn-secondary);
  color: var(--color-primary);
}

.action-btn.danger:hover {
  background: #fef0ef;
  color: var(--color-danger);
}

.card-buttons {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
}

.custom-btn {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: 12px;
  transition: var(--transition-base);
}

.custom-btn:hover {
  background: var(--color-primary-light);
}

.card-tooltip {
  position: fixed;
  z-index: 9999;
  max-width: 320px;
  padding: 10px 14px;
  background: var(--bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

.tooltip-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
  word-break: break-word;
}

.tooltip-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  word-break: break-word;
}

.tooltip-line {
  margin-bottom: 0.75em;
}

.tooltip-line:last-child {
  margin-bottom: 0;
}

.tooltip-strong {
  font-weight: 600;
  color: var(--color-text-primary);
}

.tooltip-em {
  font-style: italic;
}

.tooltip-code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11px;
  background: var(--bg-section);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--color-primary);
}

.tooltip-hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 8px 0;
}

.tooltip-img {
  max-width: 100%;
  border-radius: 4px;
  margin: 4px 0;
}
</style>
