/**
 * DataStore — Nav-Site 数据持久化层。
 *
 * 封装所有 JSON 文件 I/O，为路由处理器提供一个深度接口：
 * 调用方只关心「做什么」（创建/更新/删除），不关心内部查找/排序/写回。
 *
 * 接口（约 18 个方法）背后隐藏了 ~400 行实现逻辑 —
 * 每一个路由处理器都从中获得了显著的 leverage。
 */
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

class DataStore {
  /**
   * @param {string} dataDir — 数据目录路径
   */
  constructor(dataDir) {
    this.DATA_FILE = path.join(dataDir, 'nav-data.json');
    this.AUTH_FILE = path.join(dataDir, 'auth-config.json');
    this.UPLOADS_DIR = path.join(dataDir, 'uploads');

    this.#ensureDataDir(dataDir);
    this.#ensureUploadsDir();
    this.#initDataFile();
    this.#initAuthFile();
  }

  // ---------- private helpers ----------

  #ensureDataDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  #ensureUploadsDir() {
    if (!fs.existsSync(this.UPLOADS_DIR)) {
      fs.mkdirSync(this.UPLOADS_DIR, { recursive: true });
    }
  }

  #initDataFile() {
    if (!fs.existsSync(this.DATA_FILE)) {
      const defaultData = {
        siteSettings: { title: 'My Nav 的主页', logoUrl: '' },
        categories: [{ id: 'cat_001', name: '全部', icon: '📋', order: 0 }],
      };
      this.#writeData(defaultData);
      console.log('Created default nav-data.json');
    }
  }

  #initAuthFile() {
    if (!fs.existsSync(this.AUTH_FILE)) {
      const crypto = require('crypto');
      const bcrypt = require('bcryptjs');
      const defaultAuth = {
        username: 'admin',
        password: bcrypt.hashSync('admin123', 10),
        jwtSecret: crypto.randomBytes(32).toString('hex'),
      };
      this.#writeAuth(defaultAuth);
      console.log('Created default auth-config.json (username: admin, password: admin123)');
    }
  }

  #readData() {
    return JSON.parse(fs.readFileSync(this.DATA_FILE, 'utf-8'));
  }

  #writeData(data) {
    fs.writeFileSync(this.DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  #readAuth() {
    return JSON.parse(fs.readFileSync(this.AUTH_FILE, 'utf-8'));
  }

  #writeAuth(config) {
    fs.writeFileSync(this.AUTH_FILE, JSON.stringify(config, null, 2), 'utf-8');
  }

  // ---------- public: Auth ----------

  getAuthConfig() {
    return this.#readAuth();
  }

  updateAuthConfig(updates) {
    const config = this.#readAuth();
    Object.assign(config, updates);
    this.#writeAuth(config);
    return config;
  }

  // ---------- public: Category ----------

  getAllCategories() {
    const data = this.#readData();
    data.categories.sort((a, b) => a.order - b.order);
    data.categories.forEach(cat => {
      if (cat.subCategories) {
        cat.subCategories.sort((a, b) => a.order - b.order);
        cat.subCategories.forEach(sub => {
          if (sub.links) sub.links.sort((a, b) => a.order - b.order);
        });
      }
    });
    return data.categories;
  }

  createCategory({ name, icon }) {
    const data = this.#readData();
    const cat = {
      id: 'cat_' + nanoid(8),
      name: name || 'New Category',
      icon: icon || '📁',
      order: data.categories.length,
      subCategories: [],
    };
    data.categories.push(cat);
    this.#writeData(data);
    return cat;
  }

  updateCategory(catId, { name, icon }) {
    const data = this.#readData();
    const cat = data.categories.find(c => c.id === catId);
    if (!cat) return null;
    if (name !== undefined) cat.name = name;
    if (icon !== undefined) cat.icon = icon;
    this.#writeData(data);
    return cat;
  }

  deleteCategory(catId) {
    const data = this.#readData();
    const idx = data.categories.findIndex(c => c.id === catId);
    if (idx === -1) return false;
    data.categories.splice(idx, 1);
    data.categories.forEach((c, i) => (c.order = i));
    this.#writeData(data);
    return true;
  }

  reorderCategories(orderedIds) {
    const data = this.#readData();
    const map = new Map(data.categories.map(c => [c.id, c]));
    orderedIds.forEach((id, index) => {
      const cat = map.get(id);
      if (cat) cat.order = index;
    });
    data.categories.sort((a, b) => a.order - b.order);
    this.#writeData(data);
  }

  // ---------- public: SubCategory ----------

  createSubCategory(catId, { name, color }) {
    const data = this.#readData();
    const cat = data.categories.find(c => c.id === catId);
    if (!cat) return null;
    if (!cat.subCategories) cat.subCategories = [];
    const sub = {
      id: 'sub_' + nanoid(8),
      name: name || 'New Sub-Category',
      color: color || '#4facfe',
      order: cat.subCategories.length,
      links: [],
    };
    cat.subCategories.push(sub);
    this.#writeData(data);
    return sub;
  }

  updateSubCategory(catId, subId, { name, color }) {
    const data = this.#readData();
    const cat = data.categories.find(c => c.id === catId);
    if (!cat) return null;
    const sub = (cat.subCategories || []).find(s => s.id === subId);
    if (!sub) return null;
    if (name !== undefined) sub.name = name;
    if (color !== undefined) sub.color = color;
    this.#writeData(data);
    return sub;
  }

  deleteSubCategory(catId, subId) {
    const data = this.#readData();
    const cat = data.categories.find(c => c.id === catId);
    if (!cat) return false;
    const idx = (cat.subCategories || []).findIndex(s => s.id === subId);
    if (idx === -1) return false;
    cat.subCategories.splice(idx, 1);
    cat.subCategories.forEach((s, i) => (s.order = i));
    this.#writeData(data);
    return true;
  }

  moveSubCategory(subId, fromCatId, toCatId) {
    const data = this.#readData();
    const fromCat = data.categories.find(c => c.id === fromCatId);
    if (!fromCat) return null;
    const toCat = data.categories.find(c => c.id === toCatId);
    if (!toCat) return null;
    const subIdx = (fromCat.subCategories || []).findIndex(s => s.id === subId);
    if (subIdx === -1) return null;
    const [sub] = fromCat.subCategories.splice(subIdx, 1);
    fromCat.subCategories.forEach((s, i) => (s.order = i));
    if (!toCat.subCategories) toCat.subCategories = [];
    sub.order = toCat.subCategories.length;
    toCat.subCategories.push(sub);
    this.#writeData(data);
    return sub;
  }

  reorderSubCategories(catId, orderedIds) {
    const data = this.#readData();
    const cat = data.categories.find(c => c.id === catId);
    if (!cat) return;
    const map = new Map((cat.subCategories || []).map(s => [s.id, s]));
    orderedIds.forEach((id, index) => {
      const sub = map.get(id);
      if (sub) sub.order = index;
    });
    if (cat.subCategories) cat.subCategories.sort((a, b) => a.order - b.order);
    this.#writeData(data);
  }

  // ---------- public: Link ----------

  #sanitizeLinkPayload(payload) {
    return {
      id: 'lnk_' + nanoid(8),
      title: payload.title || '',
      url: payload.url || '',
      description: payload.description || '',
      favicon: payload.favicon || '',
      faviconDark: payload.faviconDark || '',
      order: payload.order ?? 0,
      platforms: payload.platforms || [],
      imageGallery: (payload.imageGallery || []).filter(img => img && img.trim()),
      detailDescription: payload.detailDescription || '',
      customButtons: (payload.customButtons || [])
        .filter(btn => (btn.label || btn.iconSvg || btn.icon) && btn.url)
        .map(btn => ({
          id: btn.id || 'btn_' + nanoid(8),
          label: btn.label || '',
          url: btn.url || '',
          iconSlug: btn.iconSlug,
          iconSvg: btn.iconSvg,
          iconBrandColor: btn.iconBrandColor,
          icon: btn.icon,
        })),
    };
  }

  #applyLinkUpdates(link, payload) {
    const fields = ['title', 'url', 'description', 'favicon', 'faviconDark',
      'platforms', 'imageGallery', 'detailDescription', 'customButtons'];
    for (const f of fields) {
      if (payload[f] === undefined) continue;
      if (f === 'imageGallery') {
        link[f] = (payload[f] || []).filter(img => img && img.trim());
      } else if (f === 'platforms') {
        link[f] = payload[f] || [];
      } else if (f === 'customButtons') {
        link[f] = payload[f]
          .filter(btn => (btn.label || btn.iconSvg || btn.icon) && btn.url)
          .map(btn => ({
            id: btn.id || 'btn_' + nanoid(8),
            label: btn.label || '',
            url: btn.url || '',
            iconSlug: btn.iconSlug,
            iconSvg: btn.iconSvg,
            iconBrandColor: btn.iconBrandColor,
            icon: btn.icon,
          }));
      } else if (f === 'faviconDark') {
        link[f] = payload[f] || '';
      } else {
        link[f] = payload[f];
      }
    }
  }

  createLink(catId, subId, payload) {
    const data = this.#readData();
    const cat = data.categories.find(c => c.id === catId);
    if (!cat) return null;
    const sub = (cat.subCategories || []).find(s => s.id === subId);
    if (!sub) return null;
    const link = this.#sanitizeLinkPayload(payload);
    link.order = sub.links.length;
    sub.links.push(link);
    this.#writeData(data);
    return link;
  }

  updateLink(catId, subId, linkId, payload) {
    const data = this.#readData();
    const cat = data.categories.find(c => c.id === catId);
    if (!cat) return null;
    const sub = (cat.subCategories || []).find(s => s.id === subId);
    if (!sub) return null;
    const link = sub.links.find(l => l.id === linkId);
    if (!link) return null;
    this.#applyLinkUpdates(link, payload);
    this.#writeData(data);
    return link;
  }

  moveLink(linkId, fromCatId, fromSubId, toCatId, toSubId, linkData) {
    const data = this.#readData();
    const fromCat = data.categories.find(c => c.id === fromCatId);
    if (!fromCat) return null;
    const fromSub = (fromCat.subCategories || []).find(s => s.id === fromSubId);
    if (!fromSub) return null;
    const idx = fromSub.links.findIndex(l => l.id === linkId);
    if (idx === -1) return null;
    const [link] = fromSub.links.splice(idx, 1);
    fromSub.links.forEach((l, i) => (l.order = i));
    if (linkData) this.#applyLinkUpdates(link, linkData);
    const toCat = data.categories.find(c => c.id === toCatId);
    if (!toCat) return null;
    const toSub = (toCat.subCategories || []).find(s => s.id === toSubId);
    if (!toSub) return null;
    link.order = toSub.links.length;
    toSub.links.push(link);
    this.#writeData(data);
    return link;
  }

  deleteLink(catId, subId, linkId) {
    const data = this.#readData();
    const cat = data.categories.find(c => c.id === catId);
    if (!cat) return false;
    const sub = (cat.subCategories || []).find(s => s.id === subId);
    if (!sub) return false;
    const idx = sub.links.findIndex(l => l.id === linkId);
    if (idx === -1) return false;
    sub.links.splice(idx, 1);
    sub.links.forEach((l, i) => (l.order = i));
    this.#writeData(data);
    return true;
  }

  reorderLinks(catId, subId, orderedIds) {
    const data = this.#readData();
    const cat = data.categories.find(c => c.id === catId);
    if (!cat) return;
    const sub = (cat.subCategories || []).find(s => s.id === subId);
    if (!sub || !sub.links) return;
    const map = new Map(sub.links.map(l => [l.id, l]));
    orderedIds.forEach((id, index) => {
      const link = map.get(id);
      if (link) link.order = index;
    });
    sub.links.sort((a, b) => a.order - b.order);
    this.#writeData(data);
  }

  // ---------- public: Settings ----------

  static DEFAULT_SETTINGS = {
    title: 'My Nav 的主页',
    logoUrl: '',
    githubJsdelivr: false,
    galleryAutoPlay: true,
    galleryAutoPlayInterval: 5000,
    galleryTransition: 'fade',
    galleryMasonryAutoScroll: true,
    galleryMasonryScrollSpeed: 20,
    galleryDefaultMode: 'carousel',
    galleryCarouselTimeout: 10000,
  };

  getSettings() {
    const data = this.#readData();
    return { ...DataStore.DEFAULT_SETTINGS, ...data.siteSettings };
  }

  updateSettings(payload) {
    const data = this.#readData();
    if (!data.siteSettings) data.siteSettings = { ...DataStore.DEFAULT_SETTINGS };
    const s = data.siteSettings;
    const fields = ['title', 'logoUrl', 'githubJsdelivr', 'galleryAutoPlay',
      'galleryAutoPlayInterval', 'galleryTransition', 'galleryMasonryAutoScroll',
      'galleryMasonryScrollSpeed', 'galleryDefaultMode', 'galleryCarouselTimeout'];
    for (const f of fields) {
      if (payload[f] !== undefined) {
        if (f === 'galleryAutoPlayInterval' || f === 'galleryMasonryScrollSpeed' || f === 'galleryCarouselTimeout') {
          s[f] = Number(payload[f]) || 0;
        } else if (f === 'githubJsdelivr' || f === 'galleryAutoPlay' || f === 'galleryMasonryAutoScroll') {
          s[f] = !!payload[f];
        } else {
          s[f] = payload[f];
        }
      }
    }
    this.#writeData(data);
    return s;
  }

  updateLogoUrl(logoUrl) {
    const data = this.#readData();
    if (!data.siteSettings) data.siteSettings = { ...DataStore.DEFAULT_SETTINGS };
    data.siteSettings.logoUrl = logoUrl;
    this.#writeData(data);
    return { logoUrl };
  }

  // ---------- public: Uploads ----------

  getUploadsDir() {
    return this.UPLOADS_DIR;
  }
}

module.exports = { DataStore };
