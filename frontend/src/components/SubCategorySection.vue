<template>
  <section class="sub-category-section">
    <div class="section-header">
      <div class="header-left">
        <span class="section-badge" :style="{ background: subCategory.color }"></span>
        <h3 class="section-title">{{ subCategory.name }}</h3>
        <span class="link-count">{{ subCategory.links?.length || 0 }}</span>
      </div>
      <div class="header-actions" v-if="showActions">
        <button class="header-btn" @click="$emit('addLink')" title="添加链接">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button class="header-btn" @click="$emit('edit')" title="编辑分类">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="header-btn danger" @click="$emit('delete')" title="删除分类">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="card-grid" v-if="subCategory.links?.length">
      <draggable
        v-if="showActions"
        v-model="localLinks"
        item-key="id"
        :animation="200"
        ghost-class="sortable-ghost"
        drag-class="sortable-drag"
        class="card-grid-inner"
        @end="onDragEnd"
      >
        <template #item="{ element }">
          <LinkCard
            :link="element"
            :showActions="showActions"
            @edit="$emit('editLink', element)"
            @delete="$emit('deleteLink', element)"
            @showDetail="$emit('showDetail', $event)"
          />
        </template>
      </draggable>
      <TransitionGroup v-else name="card" tag="div" class="card-grid-inner">
        <LinkCard
          v-for="link in subCategory.links"
          :key="link.id"
          :link="link"
          :showActions="false"
          @edit="$emit('editLink', link)"
          @delete="$emit('deleteLink', link)"
          @showDetail="$emit('showDetail', $event)"
        />
      </TransitionGroup>
    </div>

    <div class="empty-state" v-else>
      <p v-if="showActions">暂无链接，点击 + 添加</p>
      <p v-else>暂无链接</p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import draggable from 'vuedraggable'
import LinkCard from './LinkCard.vue'
import { useNavStore } from '../stores/navStore.js'

const props = defineProps({
  subCategory: { type: Object, required: true },
  showActions: { type: Boolean, default: false },
  catId: { type: String, default: '' },
  subId: { type: String, default: '' },
})

defineEmits(['edit', 'delete', 'addLink', 'editLink', 'deleteLink', 'showDetail'])

const store = useNavStore()

const localLinks = computed({
  get: () => props.subCategory.links || [],
  set: (val) => {
    props.subCategory.links = val
  },
})

async function onDragEnd() {
  if (!props.catId || !props.subId) return
  const orderedIds = localLinks.value.map(l => l.id)
  try {
    await store.reorderLinks(props.catId, props.subId, orderedIds)
  } catch (err) {
    console.error('Failed to reorder links:', err)
  }
}
</script>

<style scoped>
.sub-category-section {
  background: var(--bg-section);
  border-radius: var(--radius-card);
  padding: 18px 20px;
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-badge {
  width: 4px;
  height: 20px;
  border-radius: 2px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.link-count {
  font-size: 12px;
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-base);
}

.sub-category-section:hover .header-actions {
  opacity: 1;
}

.header-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-hint);
  transition: var(--transition-base);
}

.header-btn:hover {
  background: var(--color-border);
  color: var(--color-primary);
}

.header-btn.danger:hover {
  background: #fef0ef;
  color: var(--color-danger);
}

.card-grid {
  /* wrapper */
}

.card-grid-inner {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}

.empty-state {
  text-align: center;
  padding: 30px 20px;
  color: var(--color-text-hint);
  font-size: 13px;
}

@media (max-width: 640px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
