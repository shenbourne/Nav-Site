<template>
  <BaseModal :visible="visible" title="确认删除" @close="$emit('cancel')">
    <p class="confirm-text">{{ message }}</p>
    <div class="confirm-actions">
      <button class="btn btn-cancel" @click="$emit('cancel')">取消</button>
      <button class="btn btn-danger" @click="$emit('confirm')">删除</button>
    </div>
  </BaseModal>
</template>

<script setup>
import BaseModal from './BaseModal.vue'

defineProps({
  visible: Boolean,
  message: { type: String, default: '确定要删除此项吗？' },
})

defineEmits(['confirm', 'cancel'])
</script>

<style scoped>
.confirm-text {
  font-size: 15px;
  color: var(--color-text-secondary);
  margin-bottom: 24px;
  line-height: 1.6;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 8px 20px;
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

.btn-danger {
  background: var(--color-danger);
  color: #fff;
}

.btn-danger:hover {
  background: #c0392b;
}
</style>
