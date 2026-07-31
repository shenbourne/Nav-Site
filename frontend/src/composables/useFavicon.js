import { ref, computed, watch } from 'vue'
import { useUiStore } from '../stores/uiStore.js'
import { useNavStore } from '../stores/navStore.js'

/**
 * 统一的 favicon 展示逻辑 composable。
 * 封装：主题感知的 favicon 选择、加载失败 fallback、URL 加速。
 *
 * @param {import('vue').Ref|Object} link - 响应式 link 对象（需含 favicon, faviconDark, title, url）
 * @returns {{ displayFavicon, faviconError, fallbackLetter, fallbackColor }}
 */
export function useFavicon(link) {
  const uiStore = useUiStore()
  const navStore = useNavStore()
  const faviconError = ref(false)

  const displayFavicon = computed(() => {
    const isDark =
      uiStore.theme === 'dark' ||
      (uiStore.theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)

    // 暗色主题且有暗色图标时使用暗色图标，否则使用亮色图标
    if (isDark && link.faviconDark) {
      return navStore.accelerateUrl(link.faviconDark)
    }
    return navStore.accelerateUrl(link.favicon)
  })

  // 当图标 URL 变化时（如主题切换），重置错误状态
  watch(displayFavicon, () => {
    faviconError.value = false
  })

  const fallbackLetter = computed(() => {
    return (link.title || link.url || '?').charAt(0).toUpperCase()
  })

  const fallbackColor = computed(() => {
    const colors = [
      '#4a90d9', '#43e97b', '#f093fb', '#fa709a',
      '#4facfe', '#30cfd0', '#a18cd1', '#f6d365',
    ]
    let hash = 0
    const str = link.url || link.title || ''
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  })

  return {
    displayFavicon,
    faviconError,
    fallbackLetter,
    fallbackColor,
  }
}

export default useFavicon
