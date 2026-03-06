const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { fetchMeta } = require('./services/meta-fetcher');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'nav-data.json');
const AUTH_FILE = path.join(__dirname, 'data', 'auth-config.json');
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize nav-data.json if not present
if (!fs.existsSync(DATA_FILE)) {
  const defaultNavData = {
    siteSettings: { title: 'My Nav 的主页', logoUrl: '' },
    categories: [
      { id: 'cat_001', name: '全部', icon: '📋', order: 0 },
    ],
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(defaultNavData, null, 2), 'utf-8');
  console.log('Created default nav-data.json');
}

// Initialize auth-config.json if not present
if (!fs.existsSync(AUTH_FILE)) {
  const crypto = require('crypto');
  const defaultAuthConfig = {
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    jwtSecret: crypto.randomBytes(32).toString('hex'),
  };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(defaultAuthConfig, null, 2), 'utf-8');
  console.log('Created default auth-config.json (username: admin, password: admin123)');
}

// Multer config for logo upload
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, 'logo' + ext);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Data helpers ---

function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function readAuthConfig() {
  const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeAuthConfig(config) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// --- Auth middleware ---

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未授权，请先登录' });
  }

  const token = authHeader.split(' ')[1];
  const authConfig = readAuthConfig();

  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
  }
}

// --- Auth routes ---

// POST login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const authConfig = readAuthConfig();

    if (username !== authConfig.username) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    const isMatch = bcrypt.compareSync(password, authConfig.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    const token = jwt.sign({ username }, authConfig.jwtSecret, { expiresIn: '7d' });
    res.json({ success: true, data: { token, username } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET check auth status
app.get('/api/auth/check', authMiddleware, (req, res) => {
  res.json({ success: true, data: { username: req.user.username } });
});

// PUT change password (requires auth)
app.put('/api/auth/password', authMiddleware, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const authConfig = readAuthConfig();

    const isMatch = bcrypt.compareSync(oldPassword, authConfig.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: '当前密码错误' });
    }

    authConfig.password = bcrypt.hashSync(newPassword, 10);
    writeAuthConfig(authConfig);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Category routes (top-level tabs) ---

// GET all categories (public)
app.get('/api/categories', (req, res) => {
  try {
    const data = readData();
    data.categories.sort((a, b) => a.order - b.order);
    data.categories.forEach(cat => {
      if (cat.subCategories) {
        cat.subCategories.sort((a, b) => a.order - b.order);
        cat.subCategories.forEach(sub => {
          if (sub.links) sub.links.sort((a, b) => a.order - b.order);
        });
      }
    });
    res.json({ success: true, data: data.categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Reorder routes (must be BEFORE parameterized routes) ---

// PUT reorder top-level categories (protected)
app.put('/api/categories/reorder', authMiddleware, (req, res) => {
  try {
    const data = readData();
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: 'orderedIds must be an array' });
    }
    const catMap = new Map(data.categories.map(c => [c.id, c]));
    orderedIds.forEach((id, index) => {
      const cat = catMap.get(id);
      if (cat) cat.order = index;
    });
    data.categories.sort((a, b) => a.order - b.order);
    writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT reorder sub-categories within a category (protected)
app.put('/api/categories/:catId/subcategories/reorder', authMiddleware, (req, res) => {
  try {
    const data = readData();
    const cat = data.categories.find(c => c.id === req.params.catId);
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });

    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: 'orderedIds must be an array' });
    }
    const subMap = new Map((cat.subCategories || []).map(s => [s.id, s]));
    orderedIds.forEach((id, index) => {
      const sub = subMap.get(id);
      if (sub) sub.order = index;
    });
    if (cat.subCategories) cat.subCategories.sort((a, b) => a.order - b.order);
    writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT reorder links within a sub-category (protected)
app.put('/api/categories/:catId/subcategories/:subId/links/reorder', authMiddleware, (req, res) => {
  try {
    const data = readData();
    const cat = data.categories.find(c => c.id === req.params.catId);
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });

    const sub = (cat.subCategories || []).find(s => s.id === req.params.subId);
    if (!sub) return res.status(404).json({ success: false, error: 'Sub-category not found' });

    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: 'orderedIds must be an array' });
    }
    const linkMap = new Map((sub.links || []).map(l => [l.id, l]));
    orderedIds.forEach((id, index) => {
      const link = linkMap.get(id);
      if (link) link.order = index;
    });
    if (sub.links) sub.links.sort((a, b) => a.order - b.order);
    writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create top-level category (protected)
app.post('/api/categories', authMiddleware, (req, res) => {
  try {
    const data = readData();
    const { name, icon } = req.body;
    const newCat = {
      id: 'cat_' + nanoid(8),
      name: name || 'New Category',
      icon: icon || '📁',
      order: data.categories.length,
      subCategories: [],
    };
    data.categories.push(newCat);
    writeData(data);
    res.json({ success: true, data: newCat });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update top-level category (protected)
app.put('/api/categories/:catId', authMiddleware, (req, res) => {
  try {
    const data = readData();
    const cat = data.categories.find(c => c.id === req.params.catId);
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });

    const { name, icon } = req.body;
    if (name !== undefined) cat.name = name;
    if (icon !== undefined) cat.icon = icon;

    writeData(data);
    res.json({ success: true, data: cat });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE top-level category (protected)
app.delete('/api/categories/:catId', authMiddleware, (req, res) => {
  try {
    const data = readData();
    const idx = data.categories.findIndex(c => c.id === req.params.catId);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Category not found' });

    data.categories.splice(idx, 1);
    data.categories.forEach((c, i) => (c.order = i));
    writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SubCategory routes (二级分类) ---

// POST create sub-category (protected)
app.post('/api/categories/:catId/subcategories', authMiddleware, (req, res) => {
  try {
    const data = readData();
    const cat = data.categories.find(c => c.id === req.params.catId);
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });

    if (!cat.subCategories) cat.subCategories = [];

    const { name, color } = req.body;
    const newSub = {
      id: 'sub_' + nanoid(8),
      name: name || 'New Sub-Category',
      color: color || '#4facfe',
      order: cat.subCategories.length,
      links: [],
    };
    cat.subCategories.push(newSub);
    writeData(data);
    res.json({ success: true, data: newSub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update sub-category (protected)
app.put('/api/categories/:catId/subcategories/:subId', authMiddleware, (req, res) => {
  try {
    const data = readData();
    const cat = data.categories.find(c => c.id === req.params.catId);
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });

    const sub = (cat.subCategories || []).find(s => s.id === req.params.subId);
    if (!sub) return res.status(404).json({ success: false, error: 'Sub-category not found' });

    const { name, color } = req.body;
    if (name !== undefined) sub.name = name;
    if (color !== undefined) sub.color = color;

    writeData(data);
    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE sub-category (protected)
app.delete('/api/categories/:catId/subcategories/:subId', authMiddleware, (req, res) => {
  try {
    const data = readData();
    const cat = data.categories.find(c => c.id === req.params.catId);
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });

    const idx = (cat.subCategories || []).findIndex(s => s.id === req.params.subId);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Sub-category not found' });

    cat.subCategories.splice(idx, 1);
    cat.subCategories.forEach((s, i) => (s.order = i));
    writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Link routes ---

// POST add link to sub-category (protected)
app.post('/api/categories/:catId/subcategories/:subId/links', authMiddleware, (req, res) => {
  try {
    const data = readData();
    const cat = data.categories.find(c => c.id === req.params.catId);
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });

    const sub = (cat.subCategories || []).find(s => s.id === req.params.subId);
    if (!sub) return res.status(404).json({ success: false, error: 'Sub-category not found' });

    const { title, url, description, favicon, customButtons } = req.body;
    const newLink = {
      id: 'lnk_' + nanoid(8),
      title: title || '',
      url: url || '',
      description: description || '',
      favicon: favicon || '',
      order: sub.links.length,
      customButtons: (customButtons || []).map(btn => ({
        id: 'btn_' + nanoid(8),
        label: btn.label || '',
        url: btn.url || '',
      })),
    };
    sub.links.push(newLink);
    writeData(data);
    res.json({ success: true, data: newLink });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update link (protected)
app.put('/api/categories/:catId/subcategories/:subId/links/:linkId', authMiddleware, (req, res) => {
  try {
    const data = readData();
    const cat = data.categories.find(c => c.id === req.params.catId);
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });

    const sub = (cat.subCategories || []).find(s => s.id === req.params.subId);
    if (!sub) return res.status(404).json({ success: false, error: 'Sub-category not found' });

    const link = sub.links.find(l => l.id === req.params.linkId);
    if (!link) return res.status(404).json({ success: false, error: 'Link not found' });

    const { title, url, description, favicon, customButtons } = req.body;
    if (title !== undefined) link.title = title;
    if (url !== undefined) link.url = url;
    if (description !== undefined) link.description = description;
    if (favicon !== undefined) link.favicon = favicon;
    if (customButtons !== undefined) {
      link.customButtons = customButtons.map(btn => ({
        id: btn.id || 'btn_' + nanoid(8),
        label: btn.label || '',
        url: btn.url || '',
      }));
    }

    writeData(data);
    res.json({ success: true, data: link });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST move link between categories (protected)
app.post('/api/links/move', authMiddleware, (req, res) => {
  try {
    const { linkId, fromCatId, fromSubId, toCatId, toSubId, data: linkData } = req.body;
    const data = readData();

    // Find and remove from source
    const fromCat = data.categories.find(c => c.id === fromCatId);
    if (!fromCat) return res.status(404).json({ success: false, error: 'Source category not found' });
    const fromSub = (fromCat.subCategories || []).find(s => s.id === fromSubId);
    if (!fromSub) return res.status(404).json({ success: false, error: 'Source sub-category not found' });
    const linkIdx = fromSub.links.findIndex(l => l.id === linkId);
    if (linkIdx === -1) return res.status(404).json({ success: false, error: 'Link not found' });

    const [link] = fromSub.links.splice(linkIdx, 1);
    fromSub.links.forEach((l, i) => (l.order = i));

    // Update link fields
    if (linkData) {
      if (linkData.title !== undefined) link.title = linkData.title;
      if (linkData.url !== undefined) link.url = linkData.url;
      if (linkData.description !== undefined) link.description = linkData.description;
      if (linkData.favicon !== undefined) link.favicon = linkData.favicon;
      if (linkData.customButtons !== undefined) {
        link.customButtons = linkData.customButtons.map(btn => ({
          id: btn.id || 'btn_' + nanoid(8),
          label: btn.label || '',
          url: btn.url || '',
        }));
      }
    }

    // Add to destination
    const toCat = data.categories.find(c => c.id === toCatId);
    if (!toCat) return res.status(404).json({ success: false, error: 'Target category not found' });
    const toSub = (toCat.subCategories || []).find(s => s.id === toSubId);
    if (!toSub) return res.status(404).json({ success: false, error: 'Target sub-category not found' });

    link.order = toSub.links.length;
    toSub.links.push(link);

    writeData(data);
    res.json({ success: true, data: link });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE link (protected)
app.delete('/api/categories/:catId/subcategories/:subId/links/:linkId', authMiddleware, (req, res) => {
  try {
    const data = readData();
    const cat = data.categories.find(c => c.id === req.params.catId);
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });

    const sub = (cat.subCategories || []).find(s => s.id === req.params.subId);
    if (!sub) return res.status(404).json({ success: false, error: 'Sub-category not found' });

    const idx = sub.links.findIndex(l => l.id === req.params.linkId);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Link not found' });

    sub.links.splice(idx, 1);
    sub.links.forEach((l, i) => (l.order = i));
    writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Site settings routes ---

const DEFAULT_SETTINGS = { title: 'My Nav 的主页', logoUrl: '' };

// GET site settings (public)
app.get('/api/settings', (req, res) => {
  try {
    const data = readData();
    res.json({ success: true, data: data.siteSettings || DEFAULT_SETTINGS });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update site settings (protected)
app.put('/api/settings', authMiddleware, (req, res) => {
  try {
    const data = readData();
    if (!data.siteSettings) data.siteSettings = { ...DEFAULT_SETTINGS };

    const { title, logoUrl } = req.body;
    if (title !== undefined) data.siteSettings.title = title;
    if (logoUrl !== undefined) data.siteSettings.logoUrl = logoUrl;

    writeData(data);
    res.json({ success: true, data: data.siteSettings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST upload logo (protected)
app.post('/api/settings/logo', authMiddleware, (req, res) => {
  uploadLogo.single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请选择一个图片文件' });
    }
    try {
      const data = readData();
      if (!data.siteSettings) data.siteSettings = { ...DEFAULT_SETTINGS };

      // Remove old logo files with different extensions
      const oldFiles = fs.readdirSync(UPLOADS_DIR).filter(f => f.startsWith('logo.') && f !== req.file.filename);
      oldFiles.forEach(f => fs.unlinkSync(path.join(UPLOADS_DIR, f)));

      data.siteSettings.logoUrl = '/uploads/' + req.file.filename;
      writeData(data);
      res.json({ success: true, data: { logoUrl: data.siteSettings.logoUrl } });
    } catch (writeErr) {
      res.status(500).json({ success: false, error: writeErr.message });
    }
  });
});

// --- Meta fetch route (protected) ---

app.post('/api/fetch-meta', authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL is required' });

    const meta = await fetchMeta(url);
    res.json({ success: true, data: meta });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Serve frontend static files in production ---
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('{*path}', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nav-site backend running on http://localhost:${PORT}`);
});
