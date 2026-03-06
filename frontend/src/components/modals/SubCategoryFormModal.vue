<template>
  <BaseModal :visible="visible" :title="isEdit ? '编辑二级分类' : '添加二级分类'" @close="$emit('close')">
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>分类名称</label>
        <input v-model="form.name" type="text" placeholder="例如：常用链接" required />
      </div>

      <div class="form-group">
        <label>标签颜色</label>
        <div class="color-grid">
          <button
            v-for="(c, i) in colorPresets"
            :key="i"
            type="button"
            class="color-item"
            :class="{ active: selectedColor === i }"
            :style="{ background: c }"
            @click="selectedColor = i"
          />
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
import { ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  visible: Boolean,
  subCategory: { type: Object, default: null },
})

const emit = defineEmits(['close', 'submit'])

const isEdit = ref(false)

const colorPresets = [
  '#4a90d9',
  '#43e97b',
  '#f093fb',
  '#fa709a',
  '#4facfe',
  '#f6d365',
  '#a18cd1',
  '#30cfd0',
]

const form = ref({ name: '' })
const selectedColor = ref(0)

watch(
  () => props.visible,
  (val) => {
    if (val && props.subCategory) {
      isEdit.value = true
      form.value.name = props.subCategory.name
      const idx = colorPresets.indexOf(props.subCategory.color)
      selectedColor.value = idx >= 0 ? idx : 0
    } else {
      isEdit.value = false
      form.value = { name: '' }
      selectedColor.value = 0
    }
  }
)

function handleSubmit() {
  emit('submit', {
    name: form.value.name,
    color: colorPresets[selectedColor.value],
  })
}
</script>

<style scoped>
.form-group {
  margin-bottom: 18px;
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

.form-group input:focus {
  border-color: var(--color-primary);
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.color-item {
  height: 36px;
  border-radius: 8px;
  border: 3px solid transparent;
  cursor: pointer;
  transition: var(--transition-base);
}

.color-item.active {
  border-color: var(--color-text-primary);
  transform: scale(1.08);
}

.color-item:hover {
  transform: scale(1.08);
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
