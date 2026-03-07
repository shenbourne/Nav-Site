<template>
  <BaseModal :visible="visible" title="管理后台" width="480px" @close="$emit('close')">
    <!-- User Info & Logout -->
    <div class="user-bar">
      <div class="user-info">
        <svg class="user-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <span>{{ username }}</span>
      </div>
      <div class="user-actions">
        <button class="user-action-btn" @click="$emit('changeUsername')" title="修改用户名">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          修改用户名
        </button>
        <button class="user-action-btn" @click="$emit('changePassword')" title="修改密码">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          修改密码
        </button>
        <button class="user-action-btn logout" @click="$emit('logout')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          退出登录
        </button>
      </div>
    </div>

    <!-- Site Settings -->
    <div class="admin-section">
      <h4>站点设置</h4>
      <div class="settings-form">
        <div class="form-row">
          <label class="form-label">站点标题</label>
          <input
            class="form-input"
            v-model="settingsForm.title"
            placeholder="请输入站点标题"
          />
        </div>
        <div class="form-row">
          <label class="form-label">站点 Logo</label>
          <div class="logo-mode-tabs">
            <button
              class="logo-mode-btn"
              :class="{ active: logoInputMode === 'url' }"
              @click="logoInputMode = 'url'"
            >图片 URL</button>
            <button
              class="logo-mode-btn"
              :class="{ active: logoInputMode === 'upload' }"
              @click="logoInputMode = 'upload'"
            >上传文件</button>
          </div>
          <input
            v-if="logoInputMode === 'url'"
            class="form-input"
            v-model="settingsForm.logoUrl"
            placeholder="https://example.com/logo.png 或留空使用默认图标"
          />
          <div v-else class="upload-row">
            <input type="file" accept="image/*" @change="onFileChange" ref="fileInput" />
          </div>
        </div>
        <div class="logo-preview" v-if="currentLogoPreview">
          <img :src="currentLogoPreview" alt="Logo 预览" />
          <button class="clear-logo-btn" @click="clearLogo">清除 Logo</button>
        </div>
        <div class="settings-msg error" v-if="settingsError">{{ settingsError }}</div>
        <div class="settings-msg success" v-if="settingsSuccess">{{ settingsSuccess }}</div>
        <button class="save-settings-btn" @click="handleSaveSettings" :disabled="settingsLoading">
          {{ settingsLoading ? '保存中...' : '保存设置' }}
        </button>
      </div>
    </div>

    <div class="admin-section">
      <h4>一级分类管理</h4>
      <div class="admin-list">
        <div v-for="cat in categories" :key="cat.id" class="admin-item">
          <span class="item-icon">{{ cat.icon }}</span>
          <span class="item-name">{{ cat.name }}</span>
          <div class="item-actions">
            <button class="item-btn" @click="$emit('editCategory', cat)" title="编辑">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="item-btn danger" @click="$emit('deleteCategory', cat)" title="删除">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <button class="add-btn" @click="$emit('addCategory')">
        + 添加一级分类
      </button>
    </div>

    <div class="admin-section" v-if="selectedCategory">
      <h4>
        二级分类管理
        <span class="section-hint">（{{ selectedCategory.icon }} {{ selectedCategory.name }}）</span>
      </h4>
      <div class="admin-list" v-if="selectedCategory.subCategories?.length">
        <div v-for="sub in selectedCategory.subCategories" :key="sub.id" class="admin-item">
          <span class="item-badge" :style="{ background: sub.color }"></span>
          <span class="item-name">{{ sub.name }}</span>
          <div class="item-actions">
            <button class="item-btn" @click="$emit('editSubCategory', selectedCategory.id, sub)" title="编辑">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="item-btn danger" @click="$emit('deleteSubCategory', selectedCategory.id, sub)" title="删除">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div class="empty-sub" v-else>暂无二级分类</div>
      <button class="add-btn" @click="$emit('addSubCategory', selectedCategory.id)">
        + 添加二级分类
      </button>
    </div>

    <div class="category-select" v-if="categoriesWithSubs.length">
      <label>选择一级分类以管理其二级分类：</label>
      <select v-model="selectedCatId">
        <option v-for="cat in categoriesWithSubs" :key="cat.id" :value="cat.id">
          {{ cat.icon }} {{ cat.name }}
        </option>
      </select>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import BaseModal from './BaseModal.vue'
import { useNavStore } from '../../stores/navStore.js'

const navStore = useNavStore()

const props = defineProps({
  visible: Boolean,
  categories: { type: Array, default: () => [] },
  username: { type: String, default: 'admin' },
})

defineEmits([
  'close',
  'logout',
  'changePassword',
  'changeUsername',
  'addCategory',
  'editCategory',
  'deleteCategory',
  'addSubCategory',
  'editSubCategory',
  'deleteSubCategory',
])

const selectedCatId = ref('')

// --- Site settings ---
const settingsForm = ref({ title: '', logoUrl: '' })
const logoInputMode = ref('url')
const logoFile = ref(null)
const settingsLoading = ref(false)
const settingsError = ref('')
const settingsSuccess = ref('')

const currentLogoPreview = computed(() => {
  if (logoInputMode.value === 'upload' && logoFile.value) {
    return URL.createObjectURL(logoFile.value)
  }
  return settingsForm.value.logoUrl || ''
})

function onFileChange(e) {
  const file = e.target.files[0]
  logoFile.value = file || null
}

function clearLogo() {
  settingsForm.value.logoUrl = ''
  logoFile.value = null
  logoInputMode.value = 'url'
}

async function handleSaveSettings() {
  settingsLoading.value = true
  settingsError.value = ''
  settingsSuccess.value = ''
  try {
    if (logoInputMode.value === 'upload' && logoFile.value) {
      await navStore.uploadLogo(logoFile.value)
      logoFile.value = null
    } else {
      await navStore.updateSettings({ logoUrl: settingsForm.value.logoUrl })
    }
    await navStore.updateSettings({ title: settingsForm.value.title })
    settingsSuccess.value = '设置已保存'
    setTimeout(() => { settingsSuccess.value = '' }, 2000)
  } catch (err) {
    settingsError.value = err.response?.data?.error || '保存失败，请重试'
  } finally {
    settingsLoading.value = false
  }
}

const categoriesWithSubs = computed(() => {
  return props.categories.filter(c => c.id !== 'cat_001')
})

const selectedCategory = computed(() => {
  return props.categories.find(c => c.id === selectedCatId.value)
})

watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (categoriesWithSubs.value.length) {
        selectedCatId.value = categoriesWithSubs.value[0].id
      }
      // Sync site settings to form
      settingsForm.value = {
        title: navStore.siteSettings.title || '',
        logoUrl: navStore.siteSettings.logoUrl || '',
      }
      logoFile.value = null
      settingsError.value = ''
      settingsSuccess.value = ''
    }
  }
)
</script>

<style scoped>
.user-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--bg-section);
  border-radius: 8px;
  margin-bottom: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text-primary);
}

.user-icon {
  color: var(--color-primary);
}

.user-actions {
  display: flex;
  gap: 6px;
}

.user-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
  border-radius: 6px;
  transition: var(--transition-base);
}

.user-action-btn:hover {
  background: var(--color-btn-secondary-hover);
  color: var(--color-primary);
}

.user-action-btn.logout:hover {
  color: var(--color-danger);
}

.admin-section {
  margin-bottom: 24px;
}

.admin-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-hint {
  font-weight: 400;
  font-size: 12px;
  color: var(--color-text-hint);
}

.admin-list {
  background: var(--bg-section);
  border-radius: 8px;
  overflow: hidden;
}

.admin-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border);
}

.admin-item:last-child {
  border-bottom: none;
}

.item-icon {
  font-size: 16px;
}

.item-badge {
  width: 4px;
  height: 16px;
  border-radius: 2px;
}

.item-name {
  flex: 1;
  font-size: 14px;
}

.item-actions {
  display: flex;
  gap: 4px;
}

.item-btn {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-hint);
  transition: var(--transition-base);
}

.item-btn:hover {
  background: var(--color-border);
  color: var(--color-primary);
}

.item-btn.danger:hover {
  background: #fef0ef;
  color: var(--color-danger);
}

.empty-sub {
  padding: 20px;
  text-align: center;
  color: var(--color-text-hint);
  font-size: 13px;
  background: var(--bg-section);
  border-radius: 8px;
}

.add-btn {
  width: 100%;
  padding: 10px;
  margin-top: 8px;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 500;
  transition: var(--transition-base);
}

.add-btn:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.category-select {
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.category-select label {
  display: block;
  font-size: 12px;
  color: var(--color-text-hint);
  margin-bottom: 8px;
}

.category-select select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--bg-card);
  color: var(--color-text-primary);
}

.category-select select:focus {
  border-color: var(--color-primary);
}

/* Site settings */
.settings-form {
  background: var(--bg-section);
  border-radius: 8px;
  padding: 14px;
}

.form-row {
  margin-bottom: 12px;
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  background: var(--bg-card);
  color: var(--color-text-primary);
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--color-primary);
}

.logo-mode-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.logo-mode-btn {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 4px;
  color: var(--color-text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--color-border);
  transition: var(--transition-base);
}

.logo-mode-btn.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.upload-row input[type="file"] {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.logo-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 8px;
  background: var(--bg-card);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.logo-preview img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 4px;
}

.clear-logo-btn {
  font-size: 12px;
  color: var(--color-danger);
  padding: 4px 8px;
  border-radius: 4px;
  transition: var(--transition-base);
}

.clear-logo-btn:hover {
  background: #fef0ef;
}

.settings-msg {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.settings-msg.error {
  color: var(--color-danger);
  background: #fef0ef;
}

.settings-msg.success {
  color: #16a34a;
  background: #f0fdf4;
}

.save-settings-btn {
  width: 100%;
  padding: 8px;
  background: var(--color-primary);
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: var(--transition-base);
}

.save-settings-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.save-settings-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
