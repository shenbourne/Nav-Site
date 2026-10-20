/**
 * 渲染白名单净化器。
 *
 * 站点会把后台录入的 Markdown、自定义按钮 SVG 直接交给 v-html，
 * 这些内容一旦被注入就是存储型 XSS。这里使用浏览器原生的惰性解析
 * （DOMParser / template）做白名单过滤，只保留排版需要的标签与属性。
 */

const HTML_ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'del', 's', 'code', 'pre', 'a', 'img',
  'blockquote', 'hr', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot',
  'tr', 'th', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div',
  'sub', 'sup', 'input',
])

const HTML_GLOBAL_ATTRS = new Set(['class'])

const HTML_ALLOWED_ATTRS = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'loading', 'width', 'height']),
  th: new Set(['colspan', 'rowspan', 'align']),
  td: new Set(['colspan', 'rowspan', 'align']),
  input: new Set(['type', 'checked', 'disabled']),
}

// 这些标签连同内容一起删除；其余未知标签只保留其文本/子节点
const HTML_DROP_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base',
  'form', 'button', 'select', 'textarea', 'svg', 'math', 'template', 'noscript',
])

const SVG_ALLOWED_TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline',
  'polygon', 'defs', 'lineargradient', 'radialgradient', 'stop', 'title', 'desc',
])

const SVG_ALLOWED_ATTRS = new Set([
  'xmlns', 'viewbox', 'width', 'height', 'fill', 'stroke', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray',
  'stroke-dashoffset', 'opacity', 'fill-opacity', 'stroke-opacity', 'fill-rule',
  'clip-rule', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'x1', 'x2', 'y', 'y1',
  'y2', 'points', 'transform', 'offset', 'stop-color', 'stop-opacity', 'gradientunits',
  'gradienttransform', 'preserveaspectratio', 'class', 'role', 'aria-hidden',
  'aria-label', 'focusable',
])

const EMPTY_ATTRS = new Set()
// 相对地址只用于判断协议，实际导航由浏览器按当前站点解析
const URL_BASE = 'https://nav-site.local/'

function isSafeLinkUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return false
  if (raw.startsWith('//')) return false
  if (raw.startsWith('#')) return true
  try {
    const url = new URL(raw, URL_BASE)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol)
  } catch {
    return false
  }
}

/**
 * 只允许浏览导航使用的绝对 http/https 地址。
 * 无效或危险协议返回空串，调用方应阻止点击。
 */
export function safeExternalUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

function isSafeImageUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return false
  if (raw.startsWith('//')) return false
  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(raw)) return true
  if (/^data:/i.test(raw)) return false
  try {
    const url = new URL(raw, URL_BASE)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function sanitizeElementAttributes(el, tag) {
  const allowed = HTML_ALLOWED_ATTRS[tag] || EMPTY_ATTRS
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase()
    if (name.startsWith('on') || name === 'style') {
      el.removeAttribute(attr.name)
      continue
    }
    if (!allowed.has(name) && !HTML_GLOBAL_ATTRS.has(name)) {
      el.removeAttribute(attr.name)
      continue
    }
    if (name === 'href' && !isSafeLinkUrl(attr.value)) {
      el.removeAttribute(attr.name)
    }
    if (name === 'src' && !isSafeImageUrl(attr.value)) {
      el.removeAttribute(attr.name)
    }
  }
}

/**
 * 净化 Markdown 等富文本生成的 HTML，返回可安全交给 v-html 的字符串。
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string' || !html) return ''

  const doc = new DOMParser().parseFromString(
    `<!doctype html><html><body><div id="__sanitize_root">${html}</div></body></html>`,
    'text/html'
  )
  const root = doc.getElementById('__sanitize_root')
  if (!root) return ''

  // DOMParser 生成的文档是惰性的：脚本不会执行、图片不会加载
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (HTML_DROP_TAGS.has(el.tagName.toLowerCase())) el.remove()
  }

  // 先处理深层节点，再处理外层，避免 unwrap 后遗漏新暴露的节点
  for (const el of Array.from(root.querySelectorAll('*')).reverse()) {
    const tag = el.tagName.toLowerCase()
    if (!HTML_ALLOWED_TAGS.has(tag)) {
      el.replaceWith(...Array.from(el.childNodes))
      continue
    }

    sanitizeElementAttributes(el, tag)

    if (tag === 'a') {
      if (!el.getAttribute('href')) {
        el.replaceWith(...Array.from(el.childNodes))
        continue
      }
      el.setAttribute('target', '_blank')
      el.setAttribute('rel', 'noopener noreferrer nofollow')
    }

    if (tag === 'img') {
      if (!el.getAttribute('src')) {
        el.remove()
        continue
      }
      el.setAttribute('loading', 'lazy')
    }

    if (tag === 'input') {
      if ((el.getAttribute('type') || '').toLowerCase() !== 'checkbox') {
        el.remove()
        continue
      }
      el.setAttribute('disabled', '')
    }
  }

  return root.innerHTML
}

/**
 * 净化 Simple Icons 等来源的 SVG 字符串。不是合法 SVG 时返回空串，
 * 调用方可以据此回退到文字图标。
 */
export function sanitizeSvg(svg) {
  if (typeof svg !== 'string' || !svg.trim()) return ''
  if (!/<svg[\s>]/i.test(svg)) return ''

  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  if (doc.querySelector('parsererror')) return ''

  const root = doc.documentElement
  if (!root || root.tagName.toLowerCase() !== 'svg') return ''

  const nodes = [root, ...Array.from(root.querySelectorAll('*'))]
  for (const el of nodes) {
    const tag = el.tagName.toLowerCase()
    if (!SVG_ALLOWED_TAGS.has(tag)) {
      if (el === root) return ''
      el.remove()
      continue
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      const value = attr.value

      if (name.startsWith('on') || name === 'style') {
        el.removeAttribute(attr.name)
        continue
      }
      if (name === 'href' || name === 'xlink:href') {
        if (!value.trim().startsWith('#')) el.removeAttribute(attr.name)
        continue
      }
      if (!SVG_ALLOWED_ATTRS.has(name)) {
        el.removeAttribute(attr.name)
        continue
      }
      // 允许 url(#gradient)，禁止 url(javascript:...) 等外部引用
      if (/url\s*\(\s*['"]?\s*(?!#)/i.test(value) || /javascript:/i.test(value)) {
        el.removeAttribute(attr.name)
      }
    }
  }

  return new XMLSerializer().serializeToString(root)
}

export function useSanitize() {
  return { sanitizeHtml, sanitizeSvg, safeExternalUrl }
}

export default useSanitize
