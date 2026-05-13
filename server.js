const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
const DATA_DIR = path.join(ROOT, 'data');
const SESSION_DIR = path.join(DATA_DIR, 'sessions');
const DB_PATH = path.join(DATA_DIR, 'site.db');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(SESSION_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_key TEXT UNIQUE NOT NULL,
    title TEXT DEFAULT '',
    subtitle TEXT DEFAULT '',
    body TEXT DEFAULT '',
    button_primary_label TEXT DEFAULT '',
    button_primary_link TEXT DEFAULT '',
    button_secondary_label TEXT DEFAULT '',
    button_secondary_link TEXT DEFAULT '',
    extra_json TEXT DEFAULT '{}',
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS portfolio_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category_id INTEGER,
    media_type TEXT NOT NULL,
    file_path TEXT DEFAULT '',
    external_url TEXT DEFAULT '',
    featured INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    level INTEGER DEFAULT 90,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    role TEXT DEFAULT '',
    quote TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS social_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT UNIQUE NOT NULL,
    label TEXT DEFAULT '',
    url TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    project_type TEXT DEFAULT '',
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

function slugify(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function safeJson(value, fallback = {}) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return fallback;
  }
}

function fileToWebPath(filePath = '') {
  if (!filePath) return '';
  return filePath.replace(PUBLIC_DIR, '').replace(/\\/g, '/');
}

function removeLocalFile(relPath = '') {
  if (!relPath || !relPath.startsWith('/uploads/')) return;
  const abs = path.join(PUBLIC_DIR, relPath);
  if (fs.existsSync(abs)) fs.unlinkSync(abs);
}

function seedDefaults() {
  const adminEmail = process.env.ADMIN_EMAIL || 'Islemsalmi90@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'islemsalmi12';

  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) {
    const passwordHash = bcrypt.hashSync(adminPassword, 10);
    db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(adminEmail, passwordHash);
  }

  const defaultSections = [
    {
      section_key: 'hero',
      title: 'Visual Storytelling Through Cinematic Frames',
      subtitle: 'IP Production crafts premium photography, filmmaking, editing, and high-impact content for brands, artists, and modern campaigns.',
      body: 'A dark luxury portfolio experience designed to feel immersive, artistic, and unmistakably premium.',
      button_primary_label: 'View Portfolio',
      button_primary_link: '#portfolio',
      button_secondary_label: 'Contact Us',
      button_secondary_link: '#contact',
      extra_json: JSON.stringify({ eyebrow: 'IP Production', ambience: 'cinematic' })
    },
    {
      section_key: 'about',
      title: 'Creative studio for elite visual production',
      subtitle: 'Photography, videography, editing, and social media storytelling.',
      body: 'IP Production specializes in cinematic photography, branded video production, creative direction, studio work, advertising campaigns, and premium social content crafted for modern platforms.',
      button_primary_label: '',
      button_primary_link: '',
      button_secondary_label: '',
      button_secondary_link: '',
      extra_json: JSON.stringify({ stats: ['Studio work', 'Advertising campaigns', 'Professional production'] })
    },
    {
      section_key: 'contact',
      title: 'Let\'s build your next visual campaign',
      subtitle: 'Tell us about your project, launch, campaign, or content plan.',
      body: 'Use the form, WhatsApp, or your preferred social platform. Every message is stored inside the admin dashboard.',
      button_primary_label: 'Start a Project',
      button_primary_link: '#contact-form',
      button_secondary_label: '',
      button_secondary_link: '',
      extra_json: JSON.stringify({ whatsapp: '', email: adminEmail })
    }
  ];

  for (const section of defaultSections) {
    const exists = db.prepare('SELECT id FROM sections WHERE section_key = ?').get(section.section_key);
    if (!exists) {
      db.prepare(`
        INSERT INTO sections (
          section_key, title, subtitle, body, button_primary_label, button_primary_link,
          button_secondary_label, button_secondary_link, extra_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        section.section_key,
        section.title,
        section.subtitle,
        section.body,
        section.button_primary_label,
        section.button_primary_link,
        section.button_secondary_label,
        section.button_secondary_link,
        section.extra_json
      );
    }
  }

  const categories = [
    'Photography',
    'Cinematic Videos',
    'Commercial Content',
    'Portraits',
    'Social Media Reels',
    'Brand Campaigns'
  ];

  for (const name of categories) {
    const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (!exists) {
      db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run(name, slugify(name));
    }
  }

  const skills = [
    ['Adobe Premiere Pro', 95],
    ['DaVinci Resolve', 92],
    ['Lightroom', 94],
    ['Photoshop', 88],
    ['Camera Operation', 96],
    ['Color Grading', 91],
    ['Video Editing', 95],
    ['Creative Direction', 90]
  ];

  for (const [name, level] of skills) {
    const exists = db.prepare('SELECT id FROM skills WHERE name = ?').get(name);
    if (!exists) {
      db.prepare('INSERT INTO skills (name, level) VALUES (?, ?)').run(name, level);
    }
  }

  const services = [
    ['Professional Photography', 'Editorial, portrait, fashion, and branded still photography with a refined cinematic finish.'],
    ['Video Production', 'Concept development, filming, and final delivery for modern cinematic productions.'],
    ['Social Media Content', 'Platform-native reels, vertical edits, launch assets, and performance-driven visual storytelling.'],
    ['Brand Campaigns', 'Creative direction and premium campaign production for products, brands, and experiences.'],
    ['Editing & Color Grading', 'Polished post-production workflows with filmic color, rhythm, and luxury presentation.']
  ];

  for (const [title, description] of services) {
    const exists = db.prepare('SELECT id FROM services WHERE title = ?').get(title);
    if (!exists) {
      db.prepare('INSERT INTO services (title, description) VALUES (?, ?)').run(title, description);
    }
  }

  const testimonials = [
    ['Nadia B.', 'Brand Manager', 'IP Production elevated our campaign visuals with a cinematic feel that looked far beyond a standard studio shoot.'],
    ['Youssef K.', 'Creative Director', 'From reels to hero visuals, the execution felt premium, fast, and deeply intentional.'],
    ['Salma R.', 'Founder', 'We needed elegant content with performance in mind — the result was artistic and commercially sharp.']
  ];

  for (const [client_name, role, quote] of testimonials) {
    const exists = db.prepare('SELECT id FROM testimonials WHERE client_name = ? AND quote = ?').get(client_name, quote);
    if (!exists) {
      db.prepare('INSERT INTO testimonials (client_name, role, quote) VALUES (?, ?, ?)').run(client_name, role, quote);
    }
  }

  const socials = [
    ['Instagram', 'Instagram', 'https://www.instagram.com/linstant_precieux09?igsh=M2d4ZTZ4N3dwanYy'],
    ['Facebook', 'Facebook', 'https://www.facebook.com/share/1EMwnwhZri/?mibextid=wwXIfr'],
    ['Email', 'Email', 'mailto:Islemsalmi90@gmail.com'],
    ['WhatsApp', 'WhatsApp', 'https://wa.me/']
  ];

  for (const [platform, label, url] of socials) {
    const exists = db.prepare('SELECT id FROM social_links WHERE platform = ?').get(platform);
    if (!exists) {
      db.prepare('INSERT INTO social_links (platform, label, url) VALUES (?, ?, ?)').run(platform, label, url);
    }
  }
}

seedDefaults();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(
  session({
    store: new FileStore({ path: SESSION_DIR, logFn: () => {} }),
    secret: process.env.SESSION_SECRET || 'ip-production-ultra-secure-session',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(PUBLIC_DIR));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = slugify(path.basename(file.originalname || 'media', ext)) || 'media';
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 250
  }
});

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function sectionMap() {
  const rows = db.prepare('SELECT * FROM sections ORDER BY section_key').all();
  return rows.reduce((acc, row) => {
    acc[row.section_key] = {
      ...row,
      extra: safeJson(row.extra_json, {})
    };
    delete acc[row.section_key].extra_json;
    return acc;
  }, {});
}

function publicData() {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  const portfolio = db.prepare(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM portfolio_items p
    LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.featured DESC, p.created_at DESC
  `).all().map(item => ({
    ...item,
    file_path: item.file_path || '',
    category_name: item.category_name || 'Uncategorized'
  }));

  return {
    brand: 'IP Production',
    sections: sectionMap(),
    categories,
    portfolio,
    skills: db.prepare('SELECT * FROM skills ORDER BY level DESC, name').all(),
    services: db.prepare('SELECT * FROM services ORDER BY created_at DESC').all(),
    testimonials: db.prepare('SELECT * FROM testimonials ORDER BY created_at DESC').all(),
    socials: db.prepare('SELECT * FROM social_links ORDER BY platform').all()
  };
}

app.get('/api/public/site', (_, res) => {
  res.json(publicData());
});

app.post('/api/public/contact', (req, res) => {
  const { name = '', email = '', phone = '', project_type = '', message = '' } = req.body;
  if (!name.trim() || !message.trim()) {
    return res.status(400).json({ error: 'Name and message are required.' });
  }

  db.prepare(`
    INSERT INTO messages (name, email, phone, project_type, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), email.trim(), phone.trim(), project_type.trim(), message.trim());

  res.json({ success: true, message: 'Message received successfully.' });
});

app.post('/api/auth/login', (req, res) => {
  const { email = '', password = '' } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email.trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  req.session.userId = user.id;
  req.session.email = user.email;
  res.json({ success: true, email: user.email });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) {
    return res.json({ authenticated: false });
  }
  res.json({ authenticated: true, email: req.session.email || '' });
});

app.get('/api/admin/content', requireAuth, (_, res) => {
  res.json({
    ...publicData(),
    messages: db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all(),
    counts: {
      media: db.prepare('SELECT COUNT(*) AS count FROM portfolio_items').get().count,
      messages: db.prepare('SELECT COUNT(*) AS count FROM messages').get().count,
      categories: db.prepare('SELECT COUNT(*) AS count FROM categories').get().count,
      testimonials: db.prepare('SELECT COUNT(*) AS count FROM testimonials').get().count
    }
  });
});

app.put('/api/admin/sections/:key', requireAuth, (req, res) => {
  const { key } = req.params;
  const current = db.prepare('SELECT * FROM sections WHERE section_key = ?').get(key);
  if (!current) return res.status(404).json({ error: 'Section not found.' });

  const payload = {
    title: req.body.title ?? current.title,
    subtitle: req.body.subtitle ?? current.subtitle,
    body: req.body.body ?? current.body,
    button_primary_label: req.body.button_primary_label ?? current.button_primary_label,
    button_primary_link: req.body.button_primary_link ?? current.button_primary_link,
    button_secondary_label: req.body.button_secondary_label ?? current.button_secondary_label,
    button_secondary_link: req.body.button_secondary_link ?? current.button_secondary_link,
    extra_json: JSON.stringify(req.body.extra || safeJson(current.extra_json, {}))
  };

  db.prepare(`
    UPDATE sections
    SET title = ?, subtitle = ?, body = ?, button_primary_label = ?, button_primary_link = ?,
        button_secondary_label = ?, button_secondary_link = ?, extra_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE section_key = ?
  `).run(
    payload.title,
    payload.subtitle,
    payload.body,
    payload.button_primary_label,
    payload.button_primary_link,
    payload.button_secondary_label,
    payload.button_secondary_link,
    payload.extra_json,
    key
  );

  res.json({ success: true, section: sectionMap()[key] });
});

app.put('/api/admin/account', requireAuth, (req, res) => {
  const { email = '', currentPassword = '', newPassword = '' } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const nextEmail = email.trim() || user.email;
  const nextHash = newPassword.trim() ? bcrypt.hashSync(newPassword.trim(), 10) : user.password_hash;
  db.prepare('UPDATE users SET email = ?, password_hash = ? WHERE id = ?').run(nextEmail, nextHash, user.id);
  req.session.email = nextEmail;
  res.json({ success: true, email: nextEmail });
});

app.get('/api/admin/categories', requireAuth, (_, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

app.post('/api/admin/categories', requireAuth, (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required.' });

  const info = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run(name, slugify(name));
  res.json({ success: true, item: db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid) });
});

app.put('/api/admin/categories/:id', requireAuth, (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required.' });

  db.prepare('UPDATE categories SET name = ?, slug = ? WHERE id = ?').run(name, slugify(name), Number(req.params.id));
  res.json({ success: true });
});

app.delete('/api/admin/categories/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE portfolio_items SET category_id = NULL WHERE category_id = ?').run(id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ success: true });
});

app.get('/api/admin/portfolio', requireAuth, (_, res) => {
  res.json(publicData().portfolio);
});

app.post('/api/admin/portfolio', requireAuth, upload.single('media'), (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Media title is required.' });

  const categoryId = req.body.category_id ? Number(req.body.category_id) : null;
  const mediaType = (req.body.media_type || '').trim() || (req.file?.mimetype?.startsWith('video') ? 'video' : 'image');
  const filePath = req.file ? `/uploads/${req.file.filename}` : '';
  const externalUrl = (req.body.external_url || '').trim();
  const featured = String(req.body.featured || '0') === '1' ? 1 : 0;

  const info = db.prepare(`
    INSERT INTO portfolio_items (title, description, category_id, media_type, file_path, external_url, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    (req.body.description || '').trim(),
    categoryId,
    mediaType,
    filePath,
    externalUrl,
    featured
  );

  res.json({ success: true, item: db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(info.lastInsertRowid) });
});

app.put('/api/admin/portfolio/:id', requireAuth, upload.single('media'), (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Portfolio item not found.' });

  let nextFilePath = current.file_path;
  if (req.file) {
    removeLocalFile(current.file_path);
    nextFilePath = `/uploads/${req.file.filename}`;
  }

  db.prepare(`
    UPDATE portfolio_items
    SET title = ?, description = ?, category_id = ?, media_type = ?, file_path = ?, external_url = ?, featured = ?
    WHERE id = ?
  `).run(
    (req.body.title || current.title).trim(),
    (req.body.description ?? current.description).trim(),
    req.body.category_id ? Number(req.body.category_id) : null,
    (req.body.media_type || current.media_type).trim(),
    nextFilePath,
    (req.body.external_url ?? current.external_url).trim(),
    String(req.body.featured ?? current.featured) === '1' ? 1 : 0,
    id
  );

  res.json({ success: true });
});

app.delete('/api/admin/portfolio/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(id);
  if (current) removeLocalFile(current.file_path);
  db.prepare('DELETE FROM portfolio_items WHERE id = ?').run(id);
  res.json({ success: true });
});

app.get('/api/admin/skills', requireAuth, (_, res) => {
  res.json(db.prepare('SELECT * FROM skills ORDER BY level DESC, name').all());
});

app.post('/api/admin/skills', requireAuth, (req, res) => {
  const name = (req.body.name || '').trim();
  const level = Number(req.body.level || 90);
  if (!name) return res.status(400).json({ error: 'Skill name is required.' });
  const info = db.prepare('INSERT INTO skills (name, level) VALUES (?, ?)').run(name, level);
  res.json({ success: true, item: db.prepare('SELECT * FROM skills WHERE id = ?').get(info.lastInsertRowid) });
});

app.put('/api/admin/skills/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE skills SET name = ?, level = ? WHERE id = ?').run((req.body.name || '').trim(), Number(req.body.level || 90), Number(req.params.id));
  res.json({ success: true });
});

app.delete('/api/admin/skills/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM skills WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

app.get('/api/admin/services', requireAuth, (_, res) => {
  res.json(db.prepare('SELECT * FROM services ORDER BY created_at DESC').all());
});

app.post('/api/admin/services', requireAuth, (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Service title is required.' });
  const info = db.prepare('INSERT INTO services (title, description) VALUES (?, ?)').run(title, (req.body.description || '').trim());
  res.json({ success: true, item: db.prepare('SELECT * FROM services WHERE id = ?').get(info.lastInsertRowid) });
});

app.put('/api/admin/services/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE services SET title = ?, description = ? WHERE id = ?').run((req.body.title || '').trim(), (req.body.description || '').trim(), Number(req.params.id));
  res.json({ success: true });
});

app.delete('/api/admin/services/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM services WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

app.get('/api/admin/testimonials', requireAuth, (_, res) => {
  res.json(db.prepare('SELECT * FROM testimonials ORDER BY created_at DESC').all());
});

app.post('/api/admin/testimonials', requireAuth, (req, res) => {
  const clientName = (req.body.client_name || '').trim();
  const quote = (req.body.quote || '').trim();
  if (!clientName || !quote) return res.status(400).json({ error: 'Client name and quote are required.' });
  const info = db.prepare('INSERT INTO testimonials (client_name, role, quote) VALUES (?, ?, ?)').run(clientName, (req.body.role || '').trim(), quote);
  res.json({ success: true, item: db.prepare('SELECT * FROM testimonials WHERE id = ?').get(info.lastInsertRowid) });
});

app.put('/api/admin/testimonials/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE testimonials SET client_name = ?, role = ?, quote = ? WHERE id = ?').run((req.body.client_name || '').trim(), (req.body.role || '').trim(), (req.body.quote || '').trim(), Number(req.params.id));
  res.json({ success: true });
});

app.delete('/api/admin/testimonials/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM testimonials WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

app.get('/api/admin/socials', requireAuth, (_, res) => {
  res.json(db.prepare('SELECT * FROM social_links ORDER BY platform').all());
});

app.post('/api/admin/socials', requireAuth, (req, res) => {
  const platform = (req.body.platform || '').trim();
  const url = (req.body.url || '').trim();
  if (!platform || !url) return res.status(400).json({ error: 'Platform and URL are required.' });
  const info = db.prepare('INSERT INTO social_links (platform, label, url) VALUES (?, ?, ?)').run(platform, (req.body.label || platform).trim(), url);
  res.json({ success: true, item: db.prepare('SELECT * FROM social_links WHERE id = ?').get(info.lastInsertRowid) });
});

app.put('/api/admin/socials/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE social_links SET platform = ?, label = ?, url = ? WHERE id = ?').run((req.body.platform || '').trim(), (req.body.label || '').trim(), (req.body.url || '').trim(), Number(req.params.id));
  res.json({ success: true });
});

app.delete('/api/admin/socials/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM social_links WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

app.get('/api/admin/messages', requireAuth, (_, res) => {
  res.json(db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all());
});

app.put('/api/admin/messages/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE messages SET status = ? WHERE id = ?').run((req.body.status || 'read').trim(), Number(req.params.id));
  res.json({ success: true });
});

app.delete('/api/admin/messages/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM messages WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

app.get('/admin', (_, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.get('/admin/login', (_, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`IP Production is running on http://localhost:${PORT}`);
});
