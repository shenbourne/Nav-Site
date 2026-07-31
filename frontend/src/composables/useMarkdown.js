/**
 * Markdown 渲染工具
 *
 * 基于 marked 库，通过自定义 renderer 和 HTML 后处理注入项目 CSS class。
 * 接口与旧的手写实现完全兼容 — 调用方无需修改。
 */
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: false,
})

/**
 * 将 Markdown 文本渲染为 HTML
 * @param {string} text - Markdown 文本
 * @returns {string} HTML 字符串
 */
export function renderMarkdown(text) {
  if (!text) return ''
  const html = marked.parse(text)
  return postProcessHtml(html)
}

/**
 * 后处理 HTML — 为元素注入项目约定的 CSS class。
 * marked 的默认 renderer 在 v18 中给元素添加了不固定的属性，
 * 这里统一替换为项目需要的 class 名称。
 */
function postProcessHtml(html) {
  return html
    // 标题
    .replace(/<h1/g, '<h1 class="md-h1"')
    .replace(/<h2/g, '<h2 class="md-h2"')
    .replace(/<h3/g, '<h3 class="md-h3"')
    // 段落
    .replace(/<p>/g, '<p class="md-p">')
    // 行内
    .replace(/<strong>/g, '<strong class="md-strong">')
    .replace(/<em>/g, '<em class="md-em">')
    .replace(/<del>/g, '<del class="md-del">')
    // 代码
    .replace(/<code>/g, '<code class="md-code">')
    .replace(/<pre>/g, '<pre class="md-code-block">')
    // 链接 (给非 class 的链接添加 class)
    .replace(/<a /g, '<a class="md-link" ')
    // 图片
    .replace(/<img([^>]*)>/g, '<img$1 class="md-img" loading="lazy">')
    // 引用
    .replace(/<blockquote>/g, '<blockquote class="md-blockquote">')
    // 分隔线
    .replace(/<hr>/g, '<hr class="md-hr" />').replace(/<hr \/>/g, '<hr class="md-hr" />')
    // 列表
    .replace(/<ul>/g, '<ul class="md-ul">')
    .replace(/<ol>/g, '<ol class="md-ol">')
    .replace(/<li>/g, '<li class="md-li">')
    // 表格（使用负向预查避免重复替换已带 class 的标签）
    .replace(/<table>/g, '<table class="md-table">')
    .replace(/<th(?=\s|>)(?!\s+class=)/g, '<th class="md-th"')
    .replace(/<td(?=\s|>)(?!\s+class=)/g, '<td class="md-td"')
}

/**
 * 提取 Markdown 纯文本（用于预览或摘要）
 * @param {string} text - Markdown 文本
 * @returns {string} 纯文本
 */
export function extractPlainText(text) {
  if (!text) return ''

  const html = marked.parse(text)
  return html
    .replace(/<[^>]*>/g, '')   // 移除所有 HTML 标签
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n+/g, ' ')      // 换行转空格
    .trim()
}

/**
 * Composable: useMarkdown
 * @returns {{ renderMarkdown, extractPlainText }}
 */
export function useMarkdown() {
  return {
    renderMarkdown,
    extractPlainText,
  }
}

export default useMarkdown
