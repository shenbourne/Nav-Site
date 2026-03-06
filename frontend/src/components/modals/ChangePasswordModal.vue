<template>
  <BaseModal :visible="visible" title="修改密码" @close="$emit('close')">
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>当前密码</label>
        <div class="input-wrapper">
          <input
            v-model="form.oldPassword"
            :type="showOld ? 'text' : 'password'"
            placeholder="请输入当前密码"
            required
            autocomplete="current-password"
          />
          <button type="button" class="eye-btn" @click="showOld = !showOld" tabindex="-1">
            <svg v-if="showOld" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>新密码</label>
        <div class="input-wrapper">
          <input
            v-model="form.newPassword"
            :type="showNew ? 'text' : 'password'"
            placeholder="请输入新密码"
            required
            autocomplete="new-password"
            minlength="6"
          />
          <button type="button" class="eye-btn" @click="showNew = !showNew" tabindex="-1">
            <svg v-if="showNew" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>确认新密码</label>
        <div class="input-wrapper">
          <input
            v-model="form.confirmPassword"
            :type="showConfirm ? 'text' : 'password'"
            placeholder="请再次输入新密码"
            required
            autocomplete="new-password"
          />
          <button type="button" class="eye-btn" @click="showConfirm = !showConfirm" tabindex="-1">
            <svg v-if="showConfirm" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </button>
        </div>
      </div>

      <div class="msg error" v-if="error">{{ error }}</div>
      <div class="msg success" v-if="success">{{ success }}</div>

      <div class="form-actions">
        <button type="button" class="btn btn-cancel" @click="$emit('close')">取消</button>
        <button type="submit" class="btn btn-primary" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span v-else>确认修改</span>
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import { useAuthStore } from '../../stores/authStore.js'

const props = defineProps({
  visible: Boolean,
})

const emit = defineEmits(['close'])

const authStore = useAuthStore()
const form = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const loading = ref(false)
const error = ref('')
const success = ref('')
const showOld = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

watch(
  () => props.visible,
  (val) => {
    if (val) {
      form.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
      error.value = ''
      success.value = ''
      showOld.value = false
      showNew.value = false
      showConfirm.value = false
    }
  }
)

async function handleSubmit() {
  error.value = ''
  success.value = ''

  if (form.value.newPassword.length < 6) {
    error.value = '新密码至少需要6个字符'
    return
  }

  if (form.value.newPassword !== form.value.confirmPassword) {
    error.value = '两次输入的新密码不一致'
    return
  }

  loading.value = true
  try {
    await authStore.changePassword(form.value.oldPassword, form.value.newPassword)
    success.value = '密码修改成功'
    form.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err) {
    error.value = err.response?.data?.error || '修改失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.form-group {
  margin-bottom: 16px;
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
}

.input-wrapper {
  position: relative;
}

.input-wrapper input {
  padding-right: 42px;
}

.eye-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--color-text-hint);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-base);
}

.eye-btn:hover {
  color: var(--color-text-secondary);
}

.form-group input:focus {
  border-color: var(--color-primary);
}

.msg {
  font-size: 13px;
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: 6px;
}

.msg.error {
  color: var(--color-danger);
  background: #fef0ef;
}

.msg.success {
  color: #27ae60;
  background: #eafaf1;
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
  min-width: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.btn-primary:hover:not(:disabled) {
  background: #3d7bc7;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
