<template>
  <div class="search-wrapper">
    <div class="search-box">
      <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        type="text"
        class="search-input"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        placeholder="搜索书签..."
      />
      <button v-if="modelValue" class="clear-btn" @click="$emit('update:modelValue', '')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.search-wrapper {
  display: flex;
  justify-content: center;
  padding: 28px 20px 24px;
  background: var(--bg-card);
}

.search-box {
  position: relative;
  width: 100%;
  max-width: 600px;
}

.search-icon {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-hint);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-input);
  font-size: 14px;
  outline: none;
  transition: var(--transition-base);
  background: var(--bg-card);
  color: var(--color-text-primary);
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.search-input::placeholder {
  color: var(--color-text-hint);
}

.clear-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-hint);
  border-radius: 50%;
  transition: var(--transition-base);
}

.clear-btn:hover {
  background: var(--bg-section);
  color: var(--color-text-secondary);
}
</style>
