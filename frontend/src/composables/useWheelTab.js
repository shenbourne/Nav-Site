import { onMounted, onUnmounted, watch } from 'vue'

export function useWheelTab({ wrapperRef, categories, activeTabId, enabled, onSwitch }) {
  let timer = null

  function handleWheel(e) {
    if (!enabled.value) return

    e.preventDefault()

    if (timer) return
    timer = setTimeout(() => { timer = null }, 200)

    const cats = categories.value
    if (!cats.length) return

    const currentIdx = cats.findIndex(c => c.id === activeTabId.value)
    if (currentIdx === -1) return

    if (e.deltaY > 0 && currentIdx < cats.length - 1) {
      onSwitch(cats[currentIdx + 1].id)
    } else if (e.deltaY < 0 && currentIdx > 0) {
      onSwitch(cats[currentIdx - 1].id)
    }
  }

  function bind() {
    const el = wrapperRef.value
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false })
    }
  }

  function unbind() {
    const el = wrapperRef.value
    if (el) {
      el.removeEventListener('wheel', handleWheel)
    }
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  onMounted(bind)
  onUnmounted(unbind)

  watch(wrapperRef, (newEl, oldEl) => {
    if (oldEl) oldEl.removeEventListener('wheel', handleWheel)
    if (newEl) newEl.addEventListener('wheel', handleWheel, { passive: false })
  })
}
