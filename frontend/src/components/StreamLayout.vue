<template>
  <div class="stream-layout">
    <template v-for="cat in visibleCategories" :key="cat.id">
      <div class="stream-section" :id="'section-' + cat.id">
        <div class="stream-section-header">
          <span class="stream-section-icon">{{ cat.icon }}</span>
          <h2 class="stream-section-title">{{ cat.name }}</h2>
        </div>

        <draggable
          v-if="showActions"
          v-model="cat.subCategories"
          item-key="id"
          :animation="200"
          ghost-class="sortable-ghost"
          drag-class="sortable-drag"
          handle=".section-header"
          @end="onSubDragEnd(cat.id)"
        >
          <template #item="{ element: sub }">
            <SubCategorySection
              :subCategory="sub"
              :showActions="true"
              :catId="cat.id"
              :subId="sub.id"
              @edit="$emit('editSubCategory', cat.id, sub)"
              @delete="$emit('deleteSubCategory', cat.id, sub)"
              @addLink="$emit('addLink', cat.id, sub.id)"
              @editLink="(link) => $emit('editLink', link, cat.id, sub.id)"
              @deleteLink="(link) => $emit('deleteLink', link, cat.id, sub.id)"
            />
          </template>
        </draggable>
        <template v-else>
          <SubCategorySection
            v-for="sub in cat.subCategories || []"
            :key="sub.id"
            :subCategory="sub"
            :showActions="false"
            :catId="cat.id"
            :subId="sub.id"
            @edit="$emit('editSubCategory', cat.id, sub)"
            @delete="$emit('deleteSubCategory', cat.id, sub)"
            @addLink="$emit('addLink', cat.id, sub.id)"
            @editLink="(link) => $emit('editLink', link, cat.id, sub.id)"
            @deleteLink="(link) => $emit('deleteLink', link, cat.id, sub.id)"
          />
        </template>

        <div class="add-sub-section" v-if="showActions">
          <button class="add-sub-btn" @click="$emit('addSubCategory', cat.id)">
            + 添加二级分类
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import draggable from 'vuedraggable'
import SubCategorySection from './SubCategorySection.vue'
import { useNavStore } from '../stores/navStore.js'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  showActions: { type: Boolean, default: false },
})

defineEmits([
  'editSubCategory',
  'deleteSubCategory',
  'addLink',
  'editLink',
  'deleteLink',
  'addSubCategory',
])

const store = useNavStore()

const visibleCategories = computed(() => {
  return props.categories.filter(c => c.id !== 'cat_001')
})

async function onSubDragEnd(catId) {
  const cat = props.categories.find(c => c.id === catId)
  if (!cat || !cat.subCategories) return
  const orderedIds = cat.subCategories.map(s => s.id)
  try {
    await store.reorderSubCategories(catId, orderedIds)
  } catch (err) {
    console.error('Failed to reorder sub-categories:', err)
  }
}
</script>

<style scoped>
.stream-layout {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.stream-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--color-primary);
}

.stream-section-icon {
  font-size: 22px;
}

.stream-section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.add-sub-section {
  margin-top: 8px;
}

.add-sub-btn {
  width: 100%;
  padding: 14px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-card);
  color: var(--color-text-hint);
  font-size: 14px;
  transition: var(--transition-base);
}

.add-sub-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
}
</style>
