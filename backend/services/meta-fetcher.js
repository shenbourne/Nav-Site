const axios = require('axios');
const cheerio = require('cheerio');

// 图标源配置
const ICON_SOURCE_URL = 'https://cdn.jsdelivr.net/gh/shenbourne/Image-Hosting-Service@main/icons';
const ICON_LIST_URL = `${ICON_SOURCE_URL}/.list.txt`;

// 缓存图标列表
let iconListCache = null;
let iconListCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 获取图标列表
async function getIconList(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && iconListCache && (now - iconListCacheTime) < CACHE_TTL) {
    return iconListCache;
  }

  try {
    const { data } = await axios.get(ICON_LIST_URL, { timeout: 5000 });
    iconListCache = data.split('\n').filter(line => line.trim() && line.endsWith('.png'));
    iconListCacheTime = now;
    return iconListCache;
  } catch {
    return iconListCache || [];
  }
}

// 从 URL 提取所有待匹配的关键词（hostname + 路径片段）
function extractKeywords(url) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    // 如果直接传入的是 hostname，则当作 hostname 处理
    return [cleanHostname(url)];
  }

  const keywords = new Set();

  // 1. hostname 关键词
  const hostKw = cleanHostname(parsedUrl.hostname);
  if (hostKw) keywords.add(hostKw);

  // 2. 路径片段关键词（按 / 分割，过滤空串）
  const pathParts = parsedUrl.pathname
    .toLowerCase()
    .split('/')
    .map(p => p.trim())
    .filter(p => p.length > 1);

  for (const part of pathParts) {
    // 将 kebab-case / camelCase / PascalCase 拆开
    const subParts = part.split(/[-_.]/).filter(s => s.length > 1);
    for (const sp of subParts) {
      keywords.add(sp);
    }
    keywords.add(part);
  }

  return [...keywords];
}

function cleanHostname(hostname) {
  return hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\.com$|\.cn$|\.org$|\.net$|\.io$|\.co\.\w+$/, '')
    .replace(/\./g, '');
}

// 模糊匹配图标 - 返回所有匹配的图标（按相似度排序）
async function matchIconsFromSource(urlOrHostname, { forceRefresh = false } = {}) {
  const icons = await getIconList(forceRefresh);
  if (!icons.length) return [];

  const keywords = extractKeywords(urlOrHostname);

  // iconUrl -> 最高分记录
  const bestMatchMap = new Map();

  for (const keyword of keywords) {
    for (const icon of icons) {
      const iconName = icon.toLowerCase().replace('.png', '');
      const iconUrl = `${ICON_SOURCE_URL}/${icon}`;

      let score = 0;
      let type = 'fuzzy';

      // 完全匹配
      if (iconName === keyword) {
        score = 1.0;
        type = 'exact';
      }
      // 包含关系匹配
      else if (iconName.includes(keyword) || keyword.includes(iconName)) {
        score = calculateSimilarity(keyword, iconName);
        type = score >= 0.9 ? 'exact' : 'contains';
        if (score <= 0.6) continue;
      }
      // 模糊匹配
      else {
        score = calculateSimilarity(keyword, iconName);
        if (score <= 0.5) continue;
        type = 'fuzzy';
      }

      const existing = bestMatchMap.get(iconUrl);
      if (!existing || score > existing.score) {
        bestMatchMap.set(iconUrl, { icon: iconUrl, score, type });
      }
    }
  }

  const matches = [...bestMatchMap.values()];

  // 按相似度降序排序
  matches.sort((a, b) => b.score - a.score);

  return matches.slice(0, 10); // 最多返回 10 个匹配结果
}

// 简单相似度计算
function calculateSimilarity(a, b) {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

async function fetchMeta(url, options = {}) {
  const result = { title: '', description: '', favicon: '' };
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    return result;
  }

  // 优先使用图标源匹配（除非指定了 skipIconSource）
  if (!options.skipIconSource) {
    const matchedIcons = await matchIconsFromSource(url);
    if (matchedIcons.length > 0) {
      result.favicon = matchedIcons[0].icon; // 默认使用最佳匹配
      result.matchedIcons = matchedIcons; // 返回所有匹配结果供用户选择
    }
  }

  try {
    const { data: html } = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      maxRedirects: 5,
      responseType: 'text',
    });

    const $ = cheerio.load(html);

    // Title
    result.title =
      $('title').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('meta[name="twitter:title"]').attr('content')?.trim() ||
      '';

    // Description
    result.description =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      $('meta[name="twitter:description"]').attr('content')?.trim() ||
      '';

    // Favicon - try multiple sources (如果图标源未匹配到)
    if (!result.favicon) {
      const iconSelectors = [
        'link[rel="icon"]',
        'link[rel="shortcut icon"]',
        'link[rel="apple-touch-icon"]',
        'link[rel="apple-touch-icon-precomposed"]',
      ];

      let faviconHref = '';
      for (const sel of iconSelectors) {
        const href = $(sel).attr('href');
        if (href) {
          faviconHref = href;
          break;
        }
      }

      if (faviconHref) {
        // Resolve relative URL to absolute
        try {
          result.favicon = new URL(faviconHref, parsedUrl.origin).href;
        } catch {
          result.favicon = faviconHref;
        }
      } else {
        // Fallback: try /favicon.ico directly
        result.favicon = `${parsedUrl.origin}/favicon.ico`;
      }
    }
  } catch (err) {
    // If fetch fails, use domain name as title
    result.title = parsedUrl.hostname;
    // 如果图标源未匹配到，使用 Google favicon API
    if (!result.favicon) {
      result.favicon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;
    }
  }

  // Final fallback for favicon (如果图标源和网页抓取都未获取到)
  if (!result.favicon) {
    result.favicon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;
  }

  // Fallback title to hostname
  if (!result.title) {
    result.title = parsedUrl.hostname;
  }

  return result;
}

module.exports = { fetchMeta, matchIconsFromSource };
