const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { fetchMeta, matchIconsFromSource, searchDashboardIcons, searchLobeIcons } = require('./services/meta-fetcher');
const { DataStore } = require('./services/data-store');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

const store = new DataStore(DATA_DIR);

if (!fs.existsSync(store.getUploadsDir())) {
  fs.mkdirSync(store.getUploadsDir(), { recursive: true });
}

// Multer config for logo upload
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, store.getUploadsDir()),
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
app.use('/uploads', express.static(store.getUploadsDir()));

// --- Auth middleware ---

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未授权，请先登录' });
  }

  const token = authHeader.split(' ')[1];
  const authConfig = store.getAuthConfig();

  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
  }
}

// --- Auth routes ---

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const authConfig = store.getAuthConfig();

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

app.get('/api/auth/check', authMiddleware, (req, res) => {
  res.json({ success: true, data: { username: req.user.username } });
});

app.put('/api/auth/password', authMiddleware, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const authConfig = store.getAuthConfig();

    const isMatch = bcrypt.compareSync(oldPassword, authConfig.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: '当前密码错误' });
    }

    store.updateAuthConfig({ password: bcrypt.hashSync(newPassword, 10) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/auth/username', authMiddleware, (req, res) => {
  try {
    const { newUsername, password } = req.body;
    if (!newUsername || newUsername.trim().length < 2) {
      return res.status(400).json({ success: false, error: '用户名至少需要2个字符' });
    }

    const authConfig = store.getAuthConfig();
    const isMatch = bcrypt.compareSync(password, authConfig.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: '密码验证失败' });
    }

    store.updateAuthConfig({ username: newUsername.trim() });

    const updatedConfig = store.getAuthConfig();
    const token = jwt.sign({ username: updatedConfig.username }, updatedConfig.jwtSecret, { expiresIn: '7d' });
    res.json({ success: true, data: { username: updatedConfig.username, token } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Category routes ---

app.get('/api/categories', (req, res) => {
  try {
    const categories = store.getAllCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Reorder routes (must be BEFORE parameterized routes) ---

app.put('/api/categories/reorder', authMiddleware, (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: 'orderedIds must be an array' });
    }
    store.reorderCategories(orderedIds);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/categories/:catId/subcategories/reorder', authMiddleware, (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: 'orderedIds must be an array' });
    }
    store.reorderSubCategories(req.params.catId, orderedIds);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/categories/:catId/subcategories/:subId/links/reorder', authMiddleware, (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: 'orderedIds must be an array' });
    }
    store.reorderLinks(req.params.catId, req.params.subId, orderedIds);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Category CRUD ---

app.post('/api/categories', authMiddleware, (req, res) => {
  try {
    const { name, icon } = req.body;
    const cat = store.createCategory({ name, icon });
    res.json({ success: true, data: cat });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/categories/:catId', authMiddleware, (req, res) => {
  try {
    const cat = store.updateCategory(req.params.catId, { name: req.body.name, icon: req.body.icon });
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });
    res.json({ success: true, data: cat });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/categories/:catId', authMiddleware, (req, res) => {
  try {
    const ok = store.deleteCategory(req.params.catId);
    if (!ok) return res.status(404).json({ success: false, error: 'Category not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SubCategory CRUD ---

app.post('/api/categories/:catId/subcategories', authMiddleware, (req, res) => {
  try {
    const { name, color } = req.body;
    const sub = store.createSubCategory(req.params.catId, { name, color });
    if (!sub) return res.status(404).json({ success: false, error: 'Category not found' });
    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/categories/:catId/subcategories/:subId', authMiddleware, (req, res) => {
  try {
    const { name, color } = req.body;
    const sub = store.updateSubCategory(req.params.catId, req.params.subId, { name, color });
    if (!sub) return res.status(404).json({ success: false, error: 'Sub-category not found' });
    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/categories/:catId/subcategories/:subId', authMiddleware, (req, res) => {
  try {
    const ok = store.deleteSubCategory(req.params.catId, req.params.subId);
    if (!ok) return res.status(404).json({ success: false, error: 'Sub-category not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/subcategories/move', authMiddleware, (req, res) => {
  try {
    const { subId, fromCatId, toCatId } = req.body;
    if (!subId || !fromCatId || !toCatId) {
      return res.status(400).json({ success: false, error: 'subId, fromCatId and toCatId are required' });
    }
    if (fromCatId === toCatId) {
      return res.status(400).json({ success: false, error: 'Source and target category cannot be the same' });
    }
    const sub = store.moveSubCategory(subId, fromCatId, toCatId);
    if (!sub) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Link CRUD ---

app.post('/api/categories/:catId/subcategories/:subId/links', authMiddleware, (req, res) => {
  try {
    const link = store.createLink(req.params.catId, req.params.subId, req.body);
    if (!link) return res.status(404).json({ success: false, error: 'Category or sub-category not found' });
    res.json({ success: true, data: link });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/categories/:catId/subcategories/:subId/links/:linkId', authMiddleware, (req, res) => {
  try {
    const link = store.updateLink(req.params.catId, req.params.subId, req.params.linkId, req.body);
    if (!link) return res.status(404).json({ success: false, error: 'Link not found' });
    res.json({ success: true, data: link });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/links/move', authMiddleware, (req, res) => {
  try {
    const { linkId, fromCatId, fromSubId, toCatId, toSubId, data: linkData } = req.body;
    const link = store.moveLink(linkId, fromCatId, fromSubId, toCatId, toSubId, linkData);
    if (!link) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: link });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/categories/:catId/subcategories/:subId/links/:linkId', authMiddleware, (req, res) => {
  try {
    const ok = store.deleteLink(req.params.catId, req.params.subId, req.params.linkId);
    if (!ok) return res.status(404).json({ success: false, error: 'Link not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Site settings routes ---

app.get('/api/settings', (req, res) => {
  try {
    const settings = store.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/settings', authMiddleware, (req, res) => {
  try {
    const settings = store.updateSettings(req.body);
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings/logo', authMiddleware, (req, res) => {
  uploadLogo.single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请选择一个图片文件' });
    }
    try {
      // Remove old logo files with different extensions
      const uploadsDir = store.getUploadsDir();
      const oldFiles = fs.readdirSync(uploadsDir).filter(f => f.startsWith('logo.') && f !== req.file.filename);
      oldFiles.forEach(f => fs.unlinkSync(path.join(uploadsDir, f)));

      const result = store.updateLogoUrl('/uploads/' + req.file.filename);
      res.json({ success: true, data: result });
    } catch (writeErr) {
      res.status(500).json({ success: false, error: writeErr.message });
    }
  });
});

// --- Meta fetch route ---

app.post('/api/fetch-meta', authMiddleware, async (req, res) => {
  try {
    const { url, skipIconSource } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL is required' });
    const meta = await fetchMeta(url, { skipIconSource });
    res.json({ success: true, data: meta });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Icon matching routes ---

app.post('/api/match-icons', authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL is required' });
    const matchedIcons = await matchIconsFromSource(url, { forceRefresh: true });
    res.json({ success: true, data: matchedIcons });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/search-dashboard-icons', authMiddleware, async (req, res) => {
  try {
    const { query, limit } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    const icons = await searchDashboardIcons(query, { limit: limit || 20 });
    res.json({ success: true, data: icons });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/search-lobe-icons', authMiddleware, async (req, res) => {
  try {
    const { query, limit } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    const icons = await searchLobeIcons(query, { limit: limit || 20 });
    res.json({ success: true, data: icons });
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
