/**
 * Markdown 渲染工具
 * 轻量级实现，支持常用 Markdown 语法
 */

/**
 * 将 Markdown 文本渲染为 HTML
 * @param {string} text - Markdown 文本
 * @returns {string} HTML 字符串
 */
export function renderMarkdown(text) {
  if (!text) return ''
  
  // 转义 HTML 特殊字符
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // 代码块（需要在其他替换之前处理）
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="md-code-block"><code>$1</code></pre>')
  
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
  
  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
  
  // 粗体和斜体（顺序：*** > ** > *）
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="md-strong">$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em class="md-em">$1</em>')
  html = html.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>')
  html = html.replace(/__([^_]+)__/g, '<strong class="md-strong">$1</strong>')
  html = html.replace(/_([^_]+)_/g, '<em class="md-em">$1</em>')
  
  // 删除线
  html = html.replace(/~~([^~]+)~~/g, '<del class="md-del">$1</del>')
  
  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>')
  
  // 图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-img" loading="lazy" />')
  
  // 无序列表（逐行处理）
  const lines = html.split('\n')
  const result = []
  let inList = false
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // 检查是否是列表项
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        result.push('<ul class="md-ul">')
        inList = true
      }
      const content = trimmed.slice(2)
      result.push(`<li class="md-li">${content}</li>`)
    } else if (trimmed.match(/^\d+\.\s/)) {
      // 有序列表项
      if (!inList) {
        result.push('<ol class="md-ol">')
        inList = true
      }
      const content = trimmed.replace(/^\d+\.\s/, '')
      result.push(`<li class="md-li">${content}</li>`)
    } else {
      if (inList) {
        result.push('</ul>')
        inList = false
      }
      result.push(line)
    }
  }
  
  if (inList) {
    result.push('</ul>')
  }
  
  html = result.join('\n')
  
  // 引用
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>')
  
  // 分隔线
  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr class="md-hr" />')
  
  // 表格（简化支持）
  html = processTables(html)
  
  // 段落处理
  const paragraphs = html.split('\n\n')
  html = paragraphs.map(p => {
    p = p.trim()
    if (!p) return ''
    // 如果已经是块级元素，不包裹
    if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol') || 
        p.startsWith('<pre') || p.startsWith('<blockquote') || p.startsWith('<hr') ||
        p.startsWith('<table') || p.startsWith('<li')) {
      return p
    }
    return `<p class="md-p">${p.replace(/\n/g, '<br>')}</p>`
  }).filter(Boolean).join('')
  
  return html
}

/**
 * 处理 Markdown 表格
 * @param {string} html - HTML 字符串
 * @returns {string} 处理后的 HTML
 */
function processTables(html) {
  const lines = html.split('\n')
  const result = []
  let inTable = false
  let tableRows = []
  let alignments = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // 检查是否是表格行（包含 | 且不在代码块中）
    if (trimmed.includes('|') && !trimmed.startsWith('<pre')) {
      if (!inTable) {
        inTable = true
        tableRows = []
        alignments = []
      }
      
      // 检查是否是分隔行（|---|---| 或 |:---:|:---:|:---:|）
      const separatorContent = trimmed.replace(/\|/g, '').trim()
      if (/^[-:\s]+$/.test(separatorContent) && separatorContent.includes('-')) {
        // 解析对齐方式
        const cells = trimmed.split('|').map(c => c.trim()).filter(c => c)
        alignments = cells.map(cell => {
          const left = cell.startsWith(':')
          const right = cell.endsWith(':')
          if (left && right) return 'center'
          if (right) return 'right'
          return 'left'
        })
        continue
      }
      
      // 解析单元格
      const cells = trimmed.split('|').map(c => c.trim()).filter(c => c)
      if (cells.length > 0) {
        tableRows.push(cells)
      }
    } else {
      if (inTable && tableRows.length > 0) {
        // 输出表格
        result.push(renderTable(tableRows, alignments))
        tableRows = []
        alignments = []
        inTable = false
      }
      result.push(line)
    }
  }
  
  // 处理末尾的表格
  if (inTable && tableRows.length > 0) {
    result.push(renderTable(tableRows, alignments))
  }
  
  return result.join('\n')
}

/**
 * 渲染表格
 * @param {string[][]} rows - 表格行数据
 * @param {string[]} alignments - 列对齐方式
 * @returns {string} HTML 表格
 */
function renderTable(rows, alignments = []) {
  if (rows.length === 0) return ''
  
  const header = rows[0]
  const body = rows.slice(1)
  
  let html = '<table class="md-table"><thead><tr>'
  header.forEach((cell, index) => {
    const align = alignments[index] || 'left'
    const style = align !== 'left' ? ` style="text-align: ${align};"` : ''
    html += `<th class="md-th"${style}>${cell}</th>`
  })
  html += '</tr></thead><tbody>'
  
  body.forEach(row => {
    html += '<tr>'
    row.forEach((cell, index) => {
      const align = alignments[index] || 'left'
      const style = align !== 'left' ? ` style="text-align: ${align};"` : ''
      html += `<td class="md-td"${style}>${cell}</td>`
    })
    // 补齐单元格
    for (let i = row.length; i < header.length; i++) {
      const align = alignments[i] || 'left'
      const style = align !== 'left' ? ` style="text-align: ${align};"` : ''
      html += `<td class="md-td"${style}></td>`
    }
    html += '</tr>'
  })
  
  html += '</tbody></table>'
  return html
}

/**
 * 提取 Markdown 纯文本（用于预览或摘要）
 * @param {string} text - Markdown 文本
 * @returns {string} 纯文本
 */
export function extractPlainText(text) {
  if (!text) return ''
  
  return text
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/`([^`]+)`/g, '$1') // 行内代码
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // 图片
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接
    .replace(/[#*_~`>-]/g, '') // Markdown 标记
    .replace(/\n+/g, ' ') // 换行转空格
    .trim()
}

/**
 * Composable: useMarkdown
 * @returns {Object} Markdown 工具函数
 */
export function useMarkdown() {
  return {
    renderMarkdown,
    extractPlainText,
  }
}

export default useMarkdown
