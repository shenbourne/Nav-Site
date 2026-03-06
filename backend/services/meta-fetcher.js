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
async function getIconList() {
  const now = Date.now();
  if (iconListCache && (now - iconListCacheTime) < CACHE_TTL) {
    return iconListCache;
  }

  try {
    const { data } = await axios.get(ICON_LIST_URL, { timeout: 5000 });
    iconListCache = data.split('\n').filter(line => line.trim() && line.endsWith('.png'));
    iconListCacheTime = now;
    return iconListCache;
  } catch {
    return [];
  }
}

// 模糊匹配图标
async function matchIconFromSource(hostname) {
  const icons = await getIconList();
  if (!icons.length) return null;

  // 清理主机名用于匹配
  const cleanHost = hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\.com$|\.cn$|\.org$|\.net$|\.io$|\.co\.\w+$/, '')
    .replace(/\./g, '');

  // 尝试直接匹配
  for (const icon of icons) {
    const iconName = icon.toLowerCase().replace('.png', '');
    // 完全匹配
    if (iconName === cleanHost) {
      return `${ICON_SOURCE_URL}/${icon}`;
    }
    // 包含关系匹配
    if (iconName.includes(cleanHost) || cleanHost.includes(iconName)) {
      return `${ICON_SOURCE_URL}/${icon}`;
    }
  }

  // 模糊匹配：计算相似度
  let bestMatch = null;
  let bestScore = 0;

  for (const icon of icons) {
    const iconName = icon.toLowerCase().replace('.png', '');
    const score = calculateSimilarity(cleanHost, iconName);
    if (score > bestScore && score > 0.5) {
      bestScore = score;
      bestMatch = icon;
    }
  }

  return bestMatch ? `${ICON_SOURCE_URL}/${bestMatch}` : null;
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
    const matchedIcon = await matchIconFromSource(parsedUrl.hostname);
    if (matchedIcon) {
      result.favicon = matchedIcon;
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

module.exports = { fetchMeta };
