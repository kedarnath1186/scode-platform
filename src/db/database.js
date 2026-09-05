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
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      city TEXT,
      state TEXT DEFAULT 'Maharashtra',
      pincode TEXT,
      address TEXT,
      gst_number TEXT,
      business_id INTEGER,
      role TEXT DEFAULT 'user', -- 'user', 'business_owner', 'client'
      status TEXT DEFAULT 'active', -- 'active', 'inactive', 'pending'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE SET NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      price INTEGER NOT NULL, -- price in paise (e.g. 299900 = ₹2,999)
      duration_months INTEGER DEFAULT 12,
      max_services INTEGER DEFAULT 10,
      max_gallery_images INTEGER DEFAULT 10,
      is_featured_included INTEGER DEFAULT 0,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER, -- nullable until business is created
      plan_id INTEGER NOT NULL,
      user_id INTEGER,
      razorpay_order_id TEXT UNIQUE,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      amount INTEGER NOT NULL, -- in paise
      currency TEXT DEFAULT 'INR',
      status TEXT DEFAULT 'created', -- 'created', 'paid', 'failed', 'refunded'
      payment_method TEXT DEFAULT 'razorpay', -- 'razorpay', 'offline'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME,
      FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE SET NULL,
      FOREIGN KEY (plan_id) REFERENCES plans (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS approval_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      admin_id INTEGER,
      action TEXT NOT NULL, -- 'approve', 'reject', 'request_changes', 'direct_edit', 'submitted'
      reason TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'SOFT_DELETE', 'RESTORE', 'HARD_DELETE', 'MANUAL_PAYMENT'
      entity_type TEXT NOT NULL, -- 'business', 'lead', 'payment', 'setting', 'user'
      entity_id INTEGER,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
    )
  `);

  // Safe migrations for newly added columns if table already existed
  const addColumnIfNotExists = async (table, column, type) => {
    try {
      await dbRun(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch (e) {
      // Column already exists or table busy, ignore
    }
  };

  await addColumnIfNotExists('users', 'state', 'TEXT DEFAULT "Maharashtra"');
  await addColumnIfNotExists('users', 'pincode', 'TEXT');
  await addColumnIfNotExists('users', 'gst_number', 'TEXT');
  await addColumnIfNotExists('users', 'business_id', 'INTEGER');
  await addColumnIfNotExists('users', 'deleted_at', 'DATETIME');

  await addColumnIfNotExists('businesses', 'owner_id', 'INTEGER');
  await addColumnIfNotExists('businesses', 'city', 'TEXT');
  await addColumnIfNotExists('businesses', 'state', 'TEXT DEFAULT "Maharashtra"');
  await addColumnIfNotExists('businesses', 'pincode', 'TEXT');
  await addColumnIfNotExists('businesses', 'gst_number', 'TEXT');
  await addColumnIfNotExists('businesses', 'current_plan_id', 'INTEGER');
  await addColumnIfNotExists('businesses', 'approved_by', 'INTEGER');
  await addColumnIfNotExists('businesses', 'approved_at', 'DATETIME');
  await addColumnIfNotExists('businesses', 'rejection_reason', 'TEXT');
  await addColumnIfNotExists('businesses', 'change_request_notes', 'TEXT');
  await addColumnIfNotExists('businesses', 'deleted_at', 'DATETIME');

  await addColumnIfNotExists('leads', 'deleted_at', 'DATETIME');
  await addColumnIfNotExists('payments', 'updated_at', 'DATETIME');

  // Database Indexes for Fast Multi-Table Search & Joins
  const createIndexIfNotExists = async (indexName, table, columns) => {
    try {
      await dbRun(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table}(${columns})`);
    } catch (e) {
      // Ignore if index creation failed
    }
  };

  await createIndexIfNotExists('idx_approval_log_business_id', 'approval_log', 'business_id');
  await createIndexIfNotExists('idx_approval_log_action', 'approval_log', 'action');

  await createIndexIfNotExists('idx_audit_log_admin_id', 'audit_log', 'admin_id');
  await createIndexIfNotExists('idx_audit_log_entity', 'audit_log', 'entity_type, entity_id');
  await createIndexIfNotExists('idx_audit_log_action', 'audit_log', 'action');
  await createIndexIfNotExists('idx_audit_log_created_at', 'audit_log', 'created_at');

  await createIndexIfNotExists('idx_users_name', 'users', 'name');
  await createIndexIfNotExists('idx_users_email', 'users', 'email');
  await createIndexIfNotExists('idx_users_phone', 'users', 'phone');
  await createIndexIfNotExists('idx_users_city', 'users', 'city');
  await createIndexIfNotExists('idx_users_business_id', 'users', 'business_id');
  await createIndexIfNotExists('idx_users_deleted_at', 'users', 'deleted_at');

  await createIndexIfNotExists('idx_businesses_name', 'businesses', 'name');
  await createIndexIfNotExists('idx_businesses_category', 'businesses', 'category');
  await createIndexIfNotExists('idx_businesses_city', 'businesses', 'city');
  await createIndexIfNotExists('idx_businesses_owner_id', 'businesses', 'owner_id');
  await createIndexIfNotExists('idx_businesses_current_plan_id', 'businesses', 'current_plan_id');
  await createIndexIfNotExists('idx_businesses_expiry_date', 'businesses', 'expiry_date');
  await createIndexIfNotExists('idx_businesses_status', 'businesses', 'status');
  await createIndexIfNotExists('idx_businesses_deleted_at', 'businesses', 'deleted_at');

  await createIndexIfNotExists('idx_leads_business_id', 'leads', 'business_id');
  await createIndexIfNotExists('idx_leads_email', 'leads', 'email');
  await createIndexIfNotExists('idx_leads_phone', 'leads', 'phone');
  await createIndexIfNotExists('idx_leads_deleted_at', 'leads', 'deleted_at');

  await createIndexIfNotExists('idx_payments_business_id', 'payments', 'business_id');
  await createIndexIfNotExists('idx_payments_plan_id', 'payments', 'plan_id');
  await createIndexIfNotExists('idx_payments_order_id', 'payments', 'razorpay_order_id');
  await createIndexIfNotExists('idx_payments_status', 'payments', 'status');

  console.log('Database tables verified / initialized successfully.');
};

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  initDB
};
