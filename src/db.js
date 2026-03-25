import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'chronolab.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const defaultMenus = [
  { id: 'home', labelKo: '메인페이지', labelEn: 'Main', path: '/main' },
  { id: 'notice', labelKo: '공지사항', labelEn: 'Notice', path: '/notice' },
  { id: 'shop', labelKo: '쇼핑몰', labelEn: 'Shop', path: '/shop' },
  { id: 'qc', labelKo: 'QC', labelEn: 'QC', path: '/qc' },
  { id: 'review', labelKo: '구매후기', labelEn: 'Reviews', path: '/review' },
  { id: 'inquiry', labelKo: '문의', labelEn: 'Inquiry', path: '/inquiry' }
];

const defaultSettings = {
  siteName: 'Chrono Lab',
  headerColor: '#111827',
  headerLogoPath: '',
  headerSymbolPath: '',
  footerLogoPath: '',
  backgroundType: 'color',
  backgroundValue: '#f7f7f8',
  menus: JSON.stringify(defaultMenus),
  bankAccountInfo: '입금계좌: 은행명 000-0000-0000 (예금주: Chrono Lab)',
  contactInfo: '고객센터: 010-0000-0000 / 카카오톡: @chronolab',
  businessInfo: '상호: Chrono Lab | 대표: Chrono Team | 사업자번호: 000-00-00000',
  languageDefault: 'ko'
};

function upsertDefaultSetting(key, value) {
  db.prepare('INSERT OR IGNORE INTO site_settings (setting_key, setting_value) VALUES (?, ?)').run(
    key,
    String(value)
  );
}

function upsertMetric(key, value = 0) {
  db.prepare('INSERT OR IGNORE INTO metrics (metric_key, metric_value) VALUES (?, ?)').run(key, value);
}

function ensureAdminUser() {
  const countRow = db.prepare('SELECT COUNT(*) AS count FROM users WHERE is_admin = 1').get();
  if (countRow.count > 0) {
    return;
  }

  const passwordHash = bcrypt.hashSync('Admin123!', 10);
  db.prepare(
    `
      INSERT INTO users (email, username, password_hash, agreed_terms, is_admin)
      VALUES (?, ?, ?, 1, 1)
    `
  ).run('admin@chronolab.local', 'admin', passwordHash);
}

function seedProducts() {
  const countRow = db.prepare('SELECT COUNT(*) AS count FROM products').get();
  if (countRow.count > 0) {
    return;
  }

  const insert = db.prepare(
    `
      INSERT INTO products (
        brand,
        model,
        sub_model,
        reference,
        factory_name,
        version_name,
        movement,
        case_size,
        dial_color,
        case_material,
        strap_material,
        features,
        price,
        shipping_period,
        image_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  );

  const rows = [
    [
      'Rolex',
      'Submariner',
      'Black',
      '126610LN',
      'Clean',
      'V4',
      '3235',
      '41mm',
      'Black',
      'Steel',
      'Steel Oyster',
      'Ceramic bezel, 300m style',
      1580000,
      '7~14일',
      ''
    ],
    [
      'Rolex',
      'Submariner',
      'Starbucks',
      '126610LV',
      'VSF',
      'V3',
      '3235',
      '41mm',
      'Black',
      'Steel',
      'Steel Oyster',
      'Green bezel, glide-lock',
      1690000,
      '7~14일',
      ''
    ],
    [
      'Patek Philippe',
      'Nautilus',
      'Blue Dial',
      '5711/1A',
      '3KF',
      'V2',
      '324SC',
      '40mm',
      'Blue',
      'Steel',
      'Integrated Steel',
      'Horizontal embossed dial',
      1890000,
      '10~20일',
      ''
    ]
  ];

  const tx = db.transaction(() => {
    for (const row of rows) {
      insert.run(...row);
    }
  });

  tx();
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      agreed_terms INTEGER NOT NULL DEFAULT 1,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      sub_model TEXT,
      reference TEXT,
      factory_name TEXT,
      version_name TEXT,
      movement TEXT,
      case_size TEXT,
      dial_color TEXT,
      case_material TEXT,
      strap_material TEXT,
      features TEXT,
      price INTEGER NOT NULL,
      shipping_period TEXT,
      image_path TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      product_id INTEGER NOT NULL,
      buyer_name TEXT NOT NULL,
      buyer_contact TEXT NOT NULL,
      buyer_address TEXT NOT NULL,
      bank_depositor_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      total_price INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_TRANSFER',
      created_by_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_path TEXT,
      is_popup INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS qc_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL,
      image_path TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_path TEXT,
      reply_content TEXT,
      replied_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS metrics (
      metric_key TEXT PRIMARY KEY,
      metric_value INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS daily_visits (
      visit_date TEXT PRIMARY KEY,
      visit_count INTEGER NOT NULL DEFAULT 0
    );
  `);

  for (const [key, value] of Object.entries(defaultSettings)) {
    upsertDefaultSetting(key, value);
  }

  const menuRow = db
    .prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1')
    .get('menus');
  if (menuRow?.setting_value) {
    try {
      const parsed = JSON.parse(menuRow.setting_value);
      if (Array.isArray(parsed)) {
        const normalized = parsed.map((menu) => {
          if (!menu || typeof menu !== 'object') {
            return menu;
          }
          const cloned = { ...menu };
          if (cloned.path === '/') cloned.path = '/main';
          if (cloned.path === '/notices') cloned.path = '/notice';
          if (cloned.path === '/reviews') cloned.path = '/review';
          if (cloned.path === '/inquiries') cloned.path = '/inquiry';
          return cloned;
        });
        setSetting('menus', JSON.stringify(normalized));
      }
    } catch {
      setSetting('menus', JSON.stringify(defaultMenus));
    }
  }

  upsertMetric('totalVisits', 0);

  ensureAdminUser();
  seedProducts();
}

export function getSetting(key, fallback = '') {
  const row = db
    .prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1')
    .get(key);
  if (!row) {
    return fallback;
  }
  return row.setting_value;
}

export function setSetting(key, value) {
  db.prepare(
    `
      INSERT INTO site_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON CONFLICT(setting_key)
      DO UPDATE SET setting_value = excluded.setting_value
    `
  ).run(key, String(value));
}

export function incrementVisit(visitDate) {
  db.prepare(
    `
      INSERT INTO daily_visits (visit_date, visit_count)
      VALUES (?, 1)
      ON CONFLICT(visit_date)
      DO UPDATE SET visit_count = daily_visits.visit_count + 1
    `
  ).run(visitDate);

  db.prepare('UPDATE metrics SET metric_value = metric_value + 1 WHERE metric_key = ?').run('totalVisits');
}

export function getVisitCounts(visitDate) {
  const todayRow = db.prepare('SELECT visit_count FROM daily_visits WHERE visit_date = ?').get(visitDate);
  const totalRow = db
    .prepare('SELECT metric_value FROM metrics WHERE metric_key = ? LIMIT 1')
    .get('totalVisits');

  return {
    today: todayRow ? Number(todayRow.visit_count) : 0,
    total: totalRow ? Number(totalRow.metric_value) : 0
  };
}

export function getPostCounts(visitDate) {
  const todayPosts = db
    .prepare(
      `
        SELECT (
          (SELECT COUNT(*) FROM notices WHERE date(created_at, '+9 hours') = ?) +
          (SELECT COUNT(*) FROM reviews WHERE date(created_at, '+9 hours') = ?) +
          (SELECT COUNT(*) FROM inquiries WHERE date(created_at, '+9 hours') = ?) +
          (SELECT COUNT(*) FROM qc_items WHERE date(created_at, '+9 hours') = ?)
        ) AS count
      `
    )
    .get(visitDate, visitDate, visitDate, visitDate);

  const totalPosts = db
    .prepare(
      `
        SELECT (
          (SELECT COUNT(*) FROM notices) +
          (SELECT COUNT(*) FROM reviews) +
          (SELECT COUNT(*) FROM inquiries) +
          (SELECT COUNT(*) FROM qc_items)
        ) AS count
      `
    )
    .get();

  return {
    today: Number(todayPosts.count || 0),
    total: Number(totalPosts.count || 0)
  };
}

export function getDefaultMenus() {
  return defaultMenus;
}
