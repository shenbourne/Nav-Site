<template>
  <BaseModal :visible="visible" title="选择图标" width="520px" :z-index="1010" @close="$emit('close')">
    <div class="icon-select-modal">
      <p class="modal-description">找到多个匹配的图标，请选择一个作为网站图标：</p>
      
      <div class="icon-grid">
        <div 
          v-for="(item, index) in icons" 
          :key="index"
          class="icon-option"
          :class="{ selected: selectedIcon === item.icon }"
          @click="selectIcon(item.icon)"
        >
          <div class="icon-preview">
            <img :src="item.icon" :alt="item.icon" />
          </div>
          <div class="icon-info">
            <div class="icon-name">{{ getIconName(item.icon) }}</div>
            <div class="icon-score">
              <span class="score-badge" :class="item.type">{{ getTypeLabel(item.type) }}</span>
              <span class="score-value">匹配度：{{ Math.round(item.score * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-cancel" @click="$emit('close')">取消</button>
        <button type="button" class="btn btn-primary" :disabled="!selectedIcon" @click="confirm">
          确认选择
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  visible: Boolean,
  icons: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'select'])

const selectedIcon = ref('')

function selectIcon(icon) {
  selectedIcon.value = icon
}

function getIconName(iconUrl) {
  const parts = iconUrl.split('/')
  return parts[parts.length - 1]
}

function getTypeLabel(type) {
  const labels = {
    exact: '完全匹配',
    contains: '包含匹配',
    fuzzy: '模糊匹配',
  }
  return labels[type] || '未知'
}

function confirm() {
  if (selectedIcon.value) {
    emit('select', selectedIcon.value)
    emit('close')
  }
}
</script>

<style scoped>
.icon-select-modal {
  padding: 8px 0;
}

.modal-description {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

.icon-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 2px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all var(--transition-base);
  background: var(--bg-card);
}

.icon-option:hover {
  border-color: var(--color-primary-light);
  background: var(--color-primary-light);
}

.icon-option.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.icon-preview {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-section);
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-preview img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.icon-info {
  flex: 1;
  min-width: 0;
}

.icon-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon-score {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.score-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.score-badge.exact {
  background: #d4edda;
  color: #155724;
}

.score-badge.contains {
  background: #fff3cd;
  color: #856404;
}

.score-badge.fuzzy {
  background: #e2e3e5;
  color: #383d41;
}

.score-value {
  color: var(--color-text-hint);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
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

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
