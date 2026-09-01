const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Helper for running queries with Promises
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize schema
const initDB = async () => {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      tagline TEXT,
      description TEXT,
      about_text TEXT,
      logo_url TEXT,
      hero_bg_url TEXT,
      phone TEXT,
      whatsapp TEXT,
      email TEXT,
      address TEXT,
      google_map_url TEXT,
      status TEXT DEFAULT 'live', -- 'live', 'upcoming'
      expiry_date TEXT,
      theme_color TEXT DEFAULT '#3b82f6',
      is_featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'bi-gear-fill',
      price TEXT,
      display_order INTEGER DEFAULT 0,
      FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      client_name TEXT NOT NULL,
      client_role TEXT,
      company TEXT,
      quote TEXT NOT NULL,
      rating INTEGER DEFAULT 5,
      avatar_url TEXT,
      FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS gallery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      title TEXT,
      image_url TEXT NOT NULL,
      category TEXT,
      FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER, -- NULL if platform-level lead
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      message TEXT,
      service_requested TEXT,
      status TEXT DEFAULT 'new', -- 'new', 'contacted', 'closed'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE SET NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  console.log('Database tables verified / initialized successfully.');
};

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  initDB
};
