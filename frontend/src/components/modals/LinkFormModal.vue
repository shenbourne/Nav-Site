<template>
  <BaseModal :visible="visible" :title="isEdit ? '编辑链接' : '添加链接'" width="560px" @close="$emit('close')">
    <form @submit.prevent="handleSubmit">
      <!-- URL + Auto Fetch -->
      <div class="form-group">
        <label>网址</label>
        <div class="url-row">
          <input
            v-model="form.url"
            type="url"
            placeholder="https://example.com"
            required
          />
          <button
            type="button"
            class="btn btn-fetch"
            :disabled="fetching || !form.url"
            @click="autoFetch"
          >
            <span v-if="fetching" class="spinner"></span>
            <span v-else>自动获取</span>
          </button>
        </div>
      </div>

      <!-- Category Select -->
      <div class="form-row">
        <div class="form-group half">
          <label>一级分类</label>
          <select v-model="form.categoryId" required @change="onCategoryChange">
            <option value="" disabled>选择分类</option>
            <option v-for="cat in categoriesWithSubs" :key="cat.id" :value="cat.id">
              {{ cat.icon }} {{ cat.name }}
            </option>
          </select>
        </div>
        <div class="form-group half">
          <label>二级分类</label>
          <select v-model="form.subCategoryId" required>
            <option value="" disabled>选择二级分类</option>
            <option v-for="sub in availableSubCategories" :key="sub.id" :value="sub.id">
              {{ sub.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Title -->
      <div class="form-group">
        <label>标题</label>
        <input v-model="form.title" type="text" placeholder="网站标题" />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label>描述</label>
        <textarea v-model="form.description" rows="2" placeholder="简短描述"></textarea>
      </div>

      <!-- Favicon Preview -->
      <div class="form-group">
        <label>图标网址</label>
        <div class="favicon-row">
          <input v-model="form.favicon" type="text" placeholder="https://example.com/favicon.ico" />
          <button
            type="button"
            class="btn btn-fetch-icon"
            :disabled="fetchingIcon || !form.url"
            @click="fetchIconFromLocal"
          >
            <span v-if="fetchingIcon" class="spinner-small"></span>
            <span v-else>本地获取</span>
          </button>
          <div class="favicon-preview" v-if="form.favicon">
            <img :src="form.favicon" @error="($event.target.style.display = 'none')" />
          </div>
        </div>
      </div>

      <!-- Custom Buttons -->
      <div class="form-group">
        <label>
          自定义按钮
          <button type="button" class="btn-add-row" @click="addButton">+ 添加</button>
        </label>
        <draggable
          v-model="form.customButtons"
          item-key="id"
          handle=".drag-handle"
          animation="200"
          ghost-class="drag-ghost"
          chosen-class="drag-chosen"
          drag-class="drag-dragging"
        >
          <template #item="{ element, index }">
            <div class="button-row">
              <div class="drag-handle" title="拖动排序">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="6" r="1.5" fill="currentColor"/>
                  <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="9" cy="18" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="6" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
                </svg>
              </div>
              <input v-model="element.label" type="text" placeholder="按钮文字" class="btn-label-input" />
              <input v-model="element.url" type="url" placeholder="https://..." class="btn-url-input" />
              <button type="button" class="btn-remove-row" @click="removeButton(index)" title="移除">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </template>
        </draggable>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-cancel" @click="$emit('close')">取消</button>
        <button type="submit" class="btn btn-primary">{{ isEdit ? '保存' : '添加' }}</button>
      </div>
    </form>
  </BaseModal>

  <!-- 图标选择弹窗（放在 BaseModal 外，通过 Teleport 渲染到 body） -->
  <IconSelectModal 
    v-if="iconSelectorVisible"
    :visible="iconSelectorVisible"
    :icons="matchedIcons"
    @close="iconSelectorVisible = false"
    @select="onIconSelected"
  />
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import draggable from 'vuedraggable'
import BaseModal from './BaseModal.vue'
import IconSelectModal from './IconSelectModal.vue'
import { useNavStore } from '../../stores/navStore.js'

const props = defineProps({
  visible: Boolean,
  link: { type: Object, default: null },
  categoryId: { type: String, default: '' },
  subCategoryId: { type: String, default: '' },
  categories: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'submit'])

const store = useNavStore()
const fetching = ref(false)
const fetchingIcon = ref(false)
const isEdit = ref(false)
const iconSelectorVisible = ref(false)
const matchedIcons = ref([])

const form = ref(getDefaultForm())

function getDefaultForm() {
  return {
    url: '',
    title: '',
    description: '',
    favicon: '',
    categoryId: '',
    subCategoryId: '',
    customButtons: [],
  }
}

// Filter categories that have subCategories
const categoriesWithSubs = computed(() => {
  return props.categories.filter(c => c.subCategories && c.subCategories.length > 0)
})

// Get available sub-categories for selected category
const availableSubCategories = computed(() => {
  const cat = props.categories.find(c => c.id === form.value.categoryId)
  return cat?.subCategories || []
})

function onCategoryChange() {
  form.value.subCategoryId = ''
}

watch(
  () => props.visible,
  (val) => {
    if (val && props.link) {
      isEdit.value = true
      form.value = {
        url: props.link.url,
        title: props.link.title,
        description: props.link.description,
        favicon: props.link.favicon,
        categoryId: props.categoryId,
        subCategoryId: props.subCategoryId,
        customButtons: (props.link.customButtons || []).map(b => ({ ...b })),
      }
    } else if (val) {
      isEdit.value = false
      form.value = getDefaultForm()
      if (props.categoryId) {
        form.value.categoryId = props.categoryId
      }
      if (props.subCategoryId) {
        form.value.subCategoryId = props.subCategoryId
      }
    }
  }
)

async function autoFetch() {
  if (!form.value.url) return
  fetching.value = true
  try {
    const meta = await store.fetchMeta(form.value.url, { skipIconSource: true })
    if (meta) {
      if (meta.title) form.value.title = meta.title
      if (meta.description) form.value.description = meta.description
      if (meta.favicon) form.value.favicon = meta.favicon
    }
  } catch {
    // Silently fail
  } finally {
    fetching.value = false
  }
}

async function fetchIconFromLocal() {
  if (!form.value.url) return
  fetchingIcon.value = true
  try {
    const icons = await store.matchIcons(form.value.url)
    if (icons && icons.length > 0) {
      matchedIcons.value = icons
      iconSelectorVisible.value = true
    } else {
      alert('未匹配到任何图标')
    }
  } catch (err) {
    console.error('本地获取图标失败:', err)
    alert('获取图标失败，请检查网络或稍后重试')
  } finally {
    fetchingIcon.value = false
  }
}

function onIconSelected(iconUrl) {
  form.value.favicon = iconUrl
}

function addButton() {
  form.value.customButtons.push({ label: '', url: '' })
}

function removeButton(i) {
  form.value.customButtons.splice(i, 1)
}

function handleSubmit() {
  emit('submit', {
    isEdit: isEdit.value,
    linkId: props.link?.id,
    categoryId: form.value.categoryId,
    subCategoryId: form.value.subCategoryId,
    data: {
      url: form.value.url,
      title: form.value.title,
      description: form.value.description,
      favicon: form.value.favicon,
      customButtons: form.value.customButtons.filter(b => b.label && b.url),
    },
  })
}
</script>

<style scoped>
.form-group {
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-group.half {
  flex: 1;
}

.form-group label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.form-group input,
.form-group textarea,
.form-group select {
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

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  border-color: var(--color-primary);
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.url-row {
  display: flex;
  gap: 8px;
}

.url-row input {
  flex: 1;
}

.btn-fetch {
  padding: 10px 16px;
  background: var(--color-primary);
  color: #fff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  min-width: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-base);
}

.btn-fetch:hover:not(:disabled) {
  background: #3d7bc7;
}

.btn-fetch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-fetch-icon {
  padding: 10px 16px;
  background: var(--color-btn-secondary);
  color: var(--color-text-primary);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  min-width: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-base);
}

.btn-fetch-icon:hover:not(:disabled) {
  background: var(--color-btn-secondary-hover);
}

.btn-fetch-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-text-hint);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
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

.favicon-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.favicon-row input {
  flex: 1;
}

.favicon-preview {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-section);
  display: flex;
  align-items: center;
  justify-content: center;
}

.favicon-preview img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.btn-add-row {
  font-size: 12px;
  color: var(--color-primary);
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  transition: var(--transition-base);
}

.btn-add-row:hover {
  background: var(--color-primary-light);
}

.button-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.drag-handle {
  width: 24px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: var(--color-text-hint);
  border-radius: 6px;
  transition: var(--transition-base);
}

.drag-handle:hover {
  background: var(--color-btn-secondary);
  color: var(--color-text-secondary);
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-ghost {
  opacity: 0.5;
  background: var(--color-primary-light);
  border-radius: 8px;
}

.drag-chosen {
  background: var(--bg-card);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.drag-dragging {
  opacity: 0.8;
}

.btn-label-input {
  width: 100px !important;
  flex: none !important;
}

.btn-url-input {
  flex: 1;
}

.btn-remove-row {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-hint);
  transition: var(--transition-base);
}

.btn-remove-row:hover {
  background: #fef0ef;
  color: var(--color-danger);
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
