const axios = require('axios');
const cheerio = require('cheerio');

async function fetchMeta(url) {
  const result = { title: '', description: '', favicon: '' };
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    return result;
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

    // Favicon - try multiple sources
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
  } catch (err) {
    // If fetch fails, use domain name as title and Google favicon API
    result.title = parsedUrl.hostname;
    result.favicon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;
  }

  // Final fallback for favicon
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
