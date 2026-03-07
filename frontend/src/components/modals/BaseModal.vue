<template>
  <Teleport to="body">
    <Transition name="modal">
      <div class="modal-overlay" v-if="visible" :style="overlayStyle" @mousedown.self="$emit('close')">
        <div class="modal-content" :style="{ maxWidth: width }">
          <div class="modal-header">
            <h3>{{ title }}</h3>
            <button class="modal-close" @click="$emit('close')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  title: { type: String, default: '' },
  width: { type: String, default: '520px' },
  zIndex: { type: Number, default: 1000 },
})
defineEmits(['close'])

const overlayStyle = computed(() => {
  return props.zIndex !== 1000 ? { zIndex: props.zIndex } : undefined
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content {
  background: var(--bg-card);
  border-radius: 20px;
  box-shadow: var(--shadow-modal);
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: var(--transition-base);
}

.modal-close:hover {
  background: var(--color-btn-secondary);
  color: var(--color-text-primary);
}

.modal-body {
  padding: 20px 24px 24px;
}
</style>
