<template>
  <BaseModal :visible="visible" :title="isEdit ? '编辑分类' : '添加分类'" @close="$emit('close')">
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>分类名称</label>
        <input v-model="form.name" type="text" placeholder="例如：开发工具" required />
      </div>

      <div class="form-group">
        <label>图标 (Emoji)</label>
        <div class="icon-input-wrapper">
          <div class="icon-preview" @click="togglePicker">{{ form.icon }}</div>
          <input
            v-model="form.icon"
            type="text"
            placeholder="输入 emoji 或 :shortcode:"
            class="icon-text-input"
            @input="onIconInput"
          />
          <button type="button" class="picker-toggle-btn" @click="togglePicker" title="选择 Emoji">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </button>
        </div>

        <!-- Emoji Picker Dropdown -->
        <div v-if="showPicker" class="emoji-picker" ref="pickerRef">
          <div class="picker-search">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索 emoji (:shortcode: 或关键词)..."
              class="picker-search-input"
              ref="searchInput"
            />
          </div>

          <div class="picker-tabs">
            <button
              v-for="cat in emojiCategories"
              :key="cat.key"
              type="button"
              class="picker-tab"
              :class="{ active: activeTab === cat.key }"
              @click="activeTab = cat.key"
              :title="cat.name"
            >
              {{ cat.emojis[0]?.emoji }}
            </button>
          </div>

          <div class="picker-body">
            <template v-if="searchQuery">
              <div class="picker-category-label">搜索结果</div>
              <div class="picker-grid" v-if="filteredEmojis.length">
                <button
                  v-for="item in filteredEmojis"
                  :key="item.code"
                  type="button"
                  class="emoji-btn"
                  :title="item.code"
                  @click="selectEmoji(item)"
                >
                  {{ item.emoji }}
                </button>
              </div>
              <div v-else class="picker-empty">未找到匹配的 emoji</div>
            </template>
            <template v-else>
              <template v-for="cat in emojiCategories" :key="cat.key">
                <div v-show="activeTab === cat.key">
                  <div class="picker-category-label">{{ cat.name }}</div>
                  <div class="picker-grid">
                    <button
                      v-for="item in cat.emojis"
                      :key="item.code"
                      type="button"
                      class="emoji-btn"
                      :title="item.code"
                      @click="selectEmoji(item)"
                    >
                      {{ item.emoji }}
                    </button>
                  </div>
                </div>
              </template>
            </template>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-cancel" @click="$emit('close')">取消</button>
        <button type="submit" class="btn btn-primary">{{ isEdit ? '保存' : '创建' }}</button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import BaseModal from './BaseModal.vue'
import { emojiCategories, resolveShortcode } from '../../assets/emojiData.js'

const props = defineProps({
  visible: Boolean,
  category: { type: Object, default: null },
})

const emit = defineEmits(['close', 'submit'])

const isEdit = ref(false)
const form = ref({ name: '', icon: '📁' })
const showPicker = ref(false)
const searchQuery = ref('')
const activeTab = ref('smileys')
const pickerRef = ref(null)
const searchInput = ref(null)

const filteredEmojis = computed(() => {
  if (!searchQuery.value) return []
  const q = searchQuery.value.toLowerCase()
  const results = []
  for (const cat of emojiCategories) {
    for (const item of cat.emojis) {
      if (item.code.toLowerCase().includes(q) || item.emoji.includes(q)) {
        results.push(item)
      }
    }
  }
  return results
})

function togglePicker() {
  showPicker.value = !showPicker.value
  if (showPicker.value) {
    searchQuery.value = ''
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
}

function selectEmoji(item) {
  form.value.icon = item.emoji
  showPicker.value = false
}

function onIconInput() {
  const val = form.value.icon.trim()
  // Auto-resolve shortcode when user finishes typing (e.g. :smile:)
  if (val.startsWith(':') && val.endsWith(':') && val.length > 2) {
    const resolved = resolveShortcode(val)
    if (resolved !== val) {
      form.value.icon = resolved
    }
  }
}

function handleClickOutside(e) {
  if (showPicker.value && pickerRef.value && !pickerRef.value.contains(e.target)) {
    // Check if the click was on the toggle button or preview
    const wrapper = pickerRef.value.parentElement
    if (wrapper && !wrapper.contains(e.target)) {
      showPicker.value = false
    }
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

watch(
  () => props.visible,
  (val) => {
    showPicker.value = false
    if (val && props.category) {
      isEdit.value = true
      form.value.name = props.category.name
      form.value.icon = props.category.icon
    } else {
      isEdit.value = false
      form.value = { name: '', icon: '📁' }
    }
  }
)

function handleSubmit() {
  emit('submit', {
    name: form.value.name,
    icon: form.value.icon,
  })
}
</script>

<style scoped>
.form-group {
  margin-bottom: 18px;
  position: relative;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color var(--transition-base);
  background: var(--bg-card);
  color: var(--color-text-primary);
}

.form-group input:focus {
  border-color: var(--color-primary);
}

/* Icon input wrapper */
.icon-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-preview {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  background: var(--bg-section);
  flex-shrink: 0;
  transition: border-color var(--transition-base), background var(--transition-base);
}

.icon-preview:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.icon-text-input {
  flex: 1;
  min-width: 0;
}

.picker-toggle-btn {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-secondary);
  background: var(--bg-section);
  flex-shrink: 0;
  transition: all var(--transition-base);
}

.picker-toggle-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
}

/* Emoji Picker */
.emoji-picker {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  margin-top: 6px;
  background: var(--bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

[data-theme="dark"] .emoji-picker {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}

.picker-search {
  padding: 8px 8px 0;
}

.picker-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  background: var(--bg-section);
  color: var(--color-text-primary);
  transition: border-color var(--transition-base);
}

.picker-search-input:focus {
  border-color: var(--color-primary);
}

.picker-tabs {
  display: flex;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
  overflow-x: auto;
}

.picker-tab {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border-radius: 6px;
  flex-shrink: 0;
  transition: background var(--transition-base);
}

.picker-tab:hover {
  background: var(--bg-section);
}

.picker-tab.active {
  background: var(--color-primary-light);
}

.picker-body {
  max-height: 220px;
  overflow-y: auto;
  padding: 6px 8px 8px;
}

.picker-category-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-hint);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 2px 6px;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
  gap: 2px;
}

.emoji-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border-radius: 6px;
  transition: background var(--transition-base), transform 0.1s ease;
}

.emoji-btn:hover {
  background: var(--bg-section);
  transform: scale(1.15);
}

.picker-empty {
  text-align: center;
  color: var(--color-text-hint);
  font-size: 13px;
  padding: 20px 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.btn {
  padding: 9px 22px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: var(--transition-base);
}

.btn-cancel {
  background: var(--color-btn-secondary);
  color: var(--color-text-primary);
}

.btn-cancel:hover {
  background: var(--color-btn-secondary-hover);
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
}

.btn-primary:hover {
  background: #3d7bc7;
}
</style>
