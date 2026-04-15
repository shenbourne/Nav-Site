<template>
  <div class="tabs-wrapper" ref="tabsRef">
    <div class="tabs-container">
      <template v-for="cat in displayCategories" :key="cat.id">
        <button
          class="tab-item"
          :class="{ active: cat.id === activeId }"
          @click="handleTabClick(cat.id)"
        >
          <span class="tab-icon">{{ cat.icon }}</span>
          <span class="tab-name">{{ cat.name }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, toRef } from 'vue'
import { useWheelTab } from '../composables/useWheelTab.js'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  activeId: { type: String, default: '' },
  layoutMode: { type: String, default: 'paginated' },
})

const emit = defineEmits(['update:activeId'])

const tabsRef = ref(null)

const displayCategories = computed(() => {
  if (props.layoutMode === 'stream') {
    // In stream mode, replace "全部" with scroll-to-top
    return props.categories.filter(c => c.id !== 'cat_001')
  }
  return props.categories
})

function handleTabClick(catId) {
  if (props.layoutMode === 'stream') {
    const el = document.getElementById('section-' + catId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  } else {
    emit('update:activeId', catId)
  }
}

const isPaginated = computed(() => props.layoutMode === 'paginated')

useWheelTab({
  wrapperRef: tabsRef,
  categories: toRef(props, 'categories'),
  activeTabId: toRef(props, 'activeId'),
  enabled: isPaginated,
  onSwitch: (id) => emit('update:activeId', id),
})
</script>

<style scoped>
.tabs-wrapper {
  background: var(--bg-card);
  border-bottom: 1px solid var(--color-border);
  padding: 0 20px;
}

.tabs-container {
  display: flex;
  justify-content: center;
  gap: 8px;
  max-width: 1400px;
  margin: 0 auto;
  overflow-x: auto;
  padding: 0 10px 12px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.tabs-container::-webkit-scrollbar {
  display: none;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-btn);
  font-size: 14px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  transition: var(--transition-base);
}

.tab-item:hover {
  background: var(--bg-section);
  color: var(--color-text-primary);
}

.tab-item.active {
  background: var(--color-primary);
  color: #fff;
}

.tab-icon {
  font-size: 15px;
}

.tab-name {
  font-weight: 500;
}

@media (max-width: 640px) {
  .tabs-container {
    justify-content: flex-start;
  }

  .tab-item {
    padding: 6px 12px;
    font-size: 13px;
  }
}
</style>
