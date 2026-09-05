const { dbAll, dbGet } = require('../db/database');

/**
 * AnalyticsService
 * Handles aggregation-style admin questions that userSearchService cannot answer:
 * counts, revenue calculations, expiry tracking, "top N", status/category/city breakdowns,
 * and date-range filters.
 * Every answer is produced by a real parameterized SQL query — no hallucination,
 * no guessing, purely local (no external API calls).
 */

const ENTITY_CONFIG = {
  business: {
    table: 'businesses',
    labelSingular: 'business',
    labelPlural: 'businesses',
    nameCol: 'name',
    dateCol: 'created_at',
    filters: {
      status: 'status',
      category: 'category',
      city: 'city'
    }
  },
  lead: {
    table: 'leads',
    labelSingular: 'lead / inquiry',
    labelPlural: 'leads / inquiries',
    nameCol: 'name',
    dateCol: 'created_at',
    filters: {
      status: 'status'
    }
  },
  user: {
    table: 'users',
    labelSingular: 'customer',
    labelPlural: 'customers',
    nameCol: 'name',
    dateCol: 'created_at',
    filters: {
      status: 'status',
      city: 'city',
      role: 'role'
    }
  },
  service: {
    table: 'services',
    labelSingular: 'service',
    labelPlural: 'services',
    nameCol: 'title',
    dateCol: null,
    filters: {}
  },
  payment: {
    table: 'payments',
    labelSingular: 'payment',
    labelPlural: 'payments',
    nameCol: 'razorpay_order_id',
    dateCol: 'created_at',
    filters: {
      status: 'status',
      payment_method: 'payment_method'
    }
  },
  plan: {
    table: 'plans',
    labelSingular: 'hosting plan',
    labelPlural: 'hosting plans',
    nameCol: 'name',
    dateCol: 'created_at',
    filters: {
      is_active: 'is_active'
    }
  },
  subscription: {
    table: 'businesses',
    labelSingular: 'subscription',
    labelPlural: 'subscriptions',
    nameCol: 'name',
    dateCol: 'expiry_date',
    filters: {
      status: 'status'
    }
  },
  approval: {
    table: 'approval_log',
    labelSingular: 'approval audit log',
    labelPlural: 'approval audit logs',
    nameCol: 'action',
    dateCol: 'created_at',
    filters: {
      action: 'action'
    }
  }
};

// Words that map to a canonical entity key. Extend freely as vocabulary grows.
const ENTITY_SYNONYMS = {
  business: ['business', 'businesses', 'company', 'companies', 'site', 'sites', 'shop', 'shops'],
  lead: ['lead', 'leads', 'inquiry', 'inquiries', 'enquiry', 'enquiries', 'request', 'requests'],
  user: ['user', 'users', 'customer', 'customers', 'client', 'clients', 'people', 'person'],
  service: ['service', 'services', 'offering', 'offerings'],
  payment: ['payment', 'payments', 'transaction', 'transactions', 'order', 'orders', 'invoice', 'invoices'],
  plan: ['plan', 'plans', 'tier', 'tiers', 'pricing'],
  subscription: ['subscription', 'subscriptions', 'renewal', 'renewals', 'expiry', 'expiring'],
  approval: ['approval', 'approvals', 'audit log', 'audit logs', 'review log', 'review logs']
};

const STATUS_SYNONYMS = {
  new: ['new', 'unattended', 'unhandled', 'fresh'],
  contacted: ['contacted', 'followed up', 'in progress'],
  closed: ['closed', 'done', 'completed', 'resolved'],
  live: ['live', 'active', 'published'],
  pending_review: ['pending review', 'pending approval', 'awaiting approval', 'unapproved', 'pending_review', 'under review', 'need review', 'needs review', 'to review'],
  rejected: ['rejected', 'declined', 'disapproved', 'refused'],
  upcoming: ['upcoming', 'draft', 'not live'],
  suspended: ['suspended', 'expired', 'inactive', 'disabled'],
  paid: ['paid', 'successful', 'settled', 'completed'],
  created: ['created', 'pending payment', 'unpaid'],
  failed: ['failed', 'declined', 'cancelled']
};

function normalize(text) {
  return (text || '').toLowerCase().trim();
}

/**
 * Detect which entity table a message is talking about.
 */
function detectEntity(lower) {
  for (const [entity, words] of Object.entries(ENTITY_SYNONYMS)) {
    for (const w of words) {
      if (lower.includes(w)) return entity;
    }
  }
  return null;
}

/**
 * Detect a status filter mentioned in the message.
 */
function detectStatus(lower) {
  for (const [status, words] of Object.entries(STATUS_SYNONYMS)) {
    for (const w of words) {
      if (lower.includes(w)) return status;
    }
  }
  return null;
}

/**
 * Detect a relative or explicit date range and return {from, to} as ISO date strings (SQLite comparable).
 */
function detectDateRange(lower) {
  const today = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const toISO = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

  if (lower.includes('today')) {
    const from = startOfDay(today);
    return { from: toISO(from), to: toISO(new Date(today.getTime() + 86400000)), label: 'today' };
  }
  if (lower.includes('yesterday')) {
    const from = startOfDay(new Date(today.getTime() - 86400000));
    const to = startOfDay(today);
    return { from: toISO(from), to: toISO(to), label: 'yesterday' };
  }
  if (lower.includes('this week')) {
    const day = today.getDay(); // 0 = Sunday
    const from = startOfDay(new Date(today.getTime() - day * 86400000));
    return { from: toISO(from), to: toISO(new Date(today.getTime() + 7 * 86400000)), label: 'this week' };
  }
  if (lower.includes('next week')) {
    const from = startOfDay(today);
    const to = new Date(today.getTime() + 7 * 86400000);
    return { from: toISO(from), to: toISO(to), label: 'next week' };
  }
  if (lower.includes('last week')) {
    const day = today.getDay();
    const startThisWeek = startOfDay(new Date(today.getTime() - day * 86400000));
    const from = new Date(startThisWeek.getTime() - 7 * 86400000);
    return { from: toISO(from), to: toISO(startThisWeek), label: 'last week' };
  }
  if (lower.includes('this month')) {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    return { from: toISO(from), to: toISO(to), label: 'this month' };
  }
  if (lower.includes('last month')) {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toISO(from), to: toISO(to), label: 'last month' };
  }
  const lastNDaysMatch = lower.match(/last\s+(\d+)\s+days?/);
  if (lastNDaysMatch) {
    const n = parseInt(lastNDaysMatch[1], 10);
    const from = startOfDay(new Date(today.getTime() - n * 86400000));
    return { from: toISO(from), to: toISO(new Date()), label: `last ${n} days` };
  }
  const nextNDaysMatch = lower.match(/next\s+(\d+)\s+days?/);
  if (nextNDaysMatch) {
    const n = parseInt(nextNDaysMatch[1], 10);
    const from = startOfDay(today);
    const to = new Date(today.getTime() + n * 86400000);
    return { from: toISO(from), to: toISO(to), label: `next ${n} days` };
  }
  return null;
}

/**
 * Detect a city/category value referenced with "in <place>" or "from <place>" or "of <category>"
 * by scanning against actual distinct values present in the DB (avoids false positives on stopwords).
 */
async function detectKnownValue(lower, entity) {
  const cfg = ENTITY_CONFIG[entity];
  if (!cfg || !cfg.filters) return null;

  const candidates = [];
  if (cfg.filters.city) candidates.push({ field: 'city', column: cfg.filters.city });
  if (cfg.filters.category) candidates.push({ field: 'category', column: cfg.filters.category });

  for (const c of candidates) {
    const rows = await dbAll(`SELECT DISTINCT ${c.column} AS v FROM ${cfg.table} WHERE ${c.column} IS NOT NULL AND ${c.column} != ''`);
    for (const row of rows) {
      const v = normalize(row.v);
      if (v && lower.includes(v)) {
        return { field: c.field, value: row.v };
      }
    }
  }
  return null;
}

/**
 * Determine whether the message is asking for a REVENUE, COUNT, or LIST/TOP.
 */
function detectQueryShape(lower) {
  const revenueTriggers = ['revenue', 'earnings', 'sales', 'how much money', 'total collections', 'income', 'total earned', 'how much revenue'];
  if (revenueTriggers.some(t => lower.includes(t))) return 'REVENUE';

  const countTriggers = ['how many', 'count of', 'total number', 'number of', 'total count'];
  if (countTriggers.some(t => lower.includes(t))) return 'COUNT';

  const topMatch = lower.match(/top\s+(\d+)/);
  if (topMatch) return { shape: 'LIST', limit: parseInt(topMatch[1], 10) };

  if (/^(list|show|display|get)\s+(all|every)\b/.test(lower) || lower.includes('list all') || lower.includes('show all') || lower.includes('expiring')) {
    return { shape: 'LIST', limit: 50 };
  }

  return null;
}

class AnalyticsService {
  /**
   * Try to interpret the message as an analytics/aggregation query.
   * Returns null if it doesn't look like one (caller should fall back to entity search).
   */
  async tryHandle(message) {
    const lower = normalize(message);

    // 1. Check for Revenue Queries
    const isRevenueQuery = ['revenue', 'earnings', 'sales', 'how much money', 'total collection', 'income', 'total earned'].some(t => lower.includes(t));
    if (isRevenueQuery) {
      return await this.handleRevenueQuery(lower);
    }

    // 2. Check for Expiring Subscription Queries
    const isExpiringQuery = ['expiring', 'expire', 'renewal', 'renewals'].some(t => lower.includes(t));
    if (isExpiringQuery) {
      return await this.handleExpiringQuery(lower);
    }

    // 2.5 Check for Needs Attention / QC Queue Summary
    const isNeedsAttentionQuery = ['needs attention', 'need attention', 'pending approval', 'pending review', 'what needs review', 'qc queue'].some(t => lower.includes(t)) && !lower.includes('how many') && !lower.includes('list all') && !lower.includes('show all');
    if (isNeedsAttentionQuery) {
      return await this.handleNeedsAttentionQuery();
    }

    // 3. General Entity Aggregations
    const entity = detectEntity(lower);
    if (!entity) return null;

    const shapeInfo = detectQueryShape(lower);
    if (!shapeInfo) return null; // not clearly an aggregation query — let entity search handle it

    const cfg = ENTITY_CONFIG[entity];
    const where = [];
    const params = [];
    const describedFilters = [];

    // Status filter
    if (cfg.filters.status) {
      const status = detectStatus(lower);
      if (status) {
        where.push(`${cfg.filters.status} = ?`);
        params.push(status);
        describedFilters.push(`status = "${status}"`);
      }
    }

    // City / category filter (matched against real DB values to avoid false positives)
    const knownValue = await detectKnownValue(lower, entity);
    if (knownValue) {
      where.push(`${cfg.filters[knownValue.field]} = ?`);
      params.push(knownValue.value);
      describedFilters.push(`${knownValue.field} = "${knownValue.value}"`);
    }

    // Date range filter
    if (cfg.dateCol) {
      const range = detectDateRange(lower);
      if (range) {
        where.push(`${cfg.dateCol} >= ? AND ${cfg.dateCol} <= ?`);
        params.push(range.from, range.to);
        describedFilters.push(`created ${range.label}`);
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    if (shapeInfo === 'COUNT') {
      const row = await dbGet(`SELECT COUNT(*) AS count FROM ${cfg.table} ${whereSql}`, params);
      const filterText = describedFilters.length ? ` (${describedFilters.join(', ')})` : '';
      return {
        success: true,
        intent: 'ANALYTICS_COUNT',
        confidence: 'HIGH',
        type: 'analytics',
        message: 'Aggregate count computed from database',
        reply: `📊 There ${row.count === 1 ? 'is' : 'are'} **${row.count}** ${row.count === 1 ? cfg.labelSingular : cfg.labelPlural}${filterText} in the database.`,
        evidence: { sql: `SELECT COUNT(*) FROM ${cfg.table} ${whereSql}`, params, count: row.count },
        results: []
      };
    }

    // LIST / TOP shape
    const limit = (typeof shapeInfo === 'object' && shapeInfo.limit) ? shapeInfo.limit : 50;
    const orderBy = cfg.dateCol ? `${cfg.dateCol} DESC` : `id DESC`;
    const rows = await dbAll(`SELECT * FROM ${cfg.table} ${whereSql} ORDER BY ${orderBy} LIMIT ?`, [...params, limit]);

    const filterText = describedFilters.length ? ` matching ${describedFilters.join(', ')}` : '';
    let reply = `📋 Found **${rows.length}** ${rows.length === 1 ? cfg.labelSingular : cfg.labelPlural}${filterText}:\n\n`;
    rows.forEach((r, idx) => {
      const title = r[cfg.nameCol] || (r.name || r.title || r.slug || `#${r.id}`);
      const statusText = r.status ? ` — ${r.status}` : '';
      const cityText = r.city ? ` (${r.city})` : '';
      const amountText = r.amount ? ` [₹${(r.amount / 100).toLocaleString('en-IN')}]` : '';
      reply += `${idx + 1}. **${title}**${cityText}${statusText}${amountText} [ID: #${r.id}]\n`;
    });

    return {
      success: true,
      intent: 'ANALYTICS_LIST',
      confidence: 'HIGH',
      type: 'analytics',
      message: 'Records retrieved from database',
      reply,
      evidence: { sql: `SELECT * FROM ${cfg.table} ${whereSql} ORDER BY ${orderBy} LIMIT ${limit}`, params },
      results: rows
    };
  }

  /**
   * Handle revenue specific questions using parameterized SQL.
   */
  async handleRevenueQuery(lower) {
    let whereSql = "WHERE status = 'paid'";
    const params = [];
    let periodLabel = 'all-time';

    if (lower.includes('today')) {
      whereSql += " AND date(paid_at) = date('now')";
      periodLabel = 'today';
    } else if (lower.includes('this month')) {
      whereSql += " AND strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')";
      periodLabel = 'this month';
    } else if (lower.includes('this week')) {
      whereSql += " AND date(paid_at) >= date('now', '-7 days')";
      periodLabel = 'over the last 7 days';
    } else if (lower.includes('yesterday')) {
      whereSql += " AND date(paid_at) = date('now', '-1 day')";
      periodLabel = 'yesterday';
    }

    const row = await dbGet(`SELECT SUM(amount) as total_paise, COUNT(*) as count FROM payments ${whereSql}`, params);
    const totalPaise = row?.total_paise || 0;
    const totalRupees = (totalPaise / 100).toLocaleString('en-IN');
    const paymentCount = row?.count || 0;

    return {
      success: true,
      intent: 'ANALYTICS_REVENUE',
      confidence: 'HIGH',
      type: 'analytics',
      message: 'Revenue aggregate computed from database',
      reply: `💳 **Platform Revenue (${periodLabel})**:\n\n• **Total Collected**: **₹${totalRupees}**\n• **Paid Transactions**: ${paymentCount}\n• **Database Source**: \`payments\` table (filtered by \`status = 'paid'\`)`,
      evidence: { sql: `SELECT SUM(amount), COUNT(*) FROM payments ${whereSql}`, params, totalRupees, paymentCount },
      results: []
    };
  }

  /**
   * Handle subscription expiry questions.
   */
  async handleExpiringQuery(lower) {
    let days = 30;
    let label = 'in the next 30 days';

    if (lower.includes('this week') || lower.includes('7 days') || lower.includes('next week')) {
      days = 7;
      label = 'in the next 7 days';
    } else if (lower.includes('today')) {
      days = 1;
      label = 'today';
    }

    const rows = await dbAll(`
      SELECT b.id, b.name, b.slug, b.expiry_date, b.status, p.name as plan_name
      FROM businesses b
      LEFT JOIN plans p ON b.current_plan_id = p.id
      WHERE b.expiry_date IS NOT NULL
        AND b.expiry_date != ''
        AND date(b.expiry_date) >= date('now')
        AND date(b.expiry_date) <= date('now', '+' || ? || ' days')
      ORDER BY b.expiry_date ASC
    `, [days]);

    if (rows.length === 0) {
      return {
        success: true,
        intent: 'ANALYTICS_EXPIRY',
        confidence: 'HIGH',
        type: 'analytics',
        message: 'No expiring subscriptions found',
        reply: `📅 There are currently **0 business subscriptions** expiring ${label}.`,
        evidence: { days, count: 0 },
        results: []
      };
    }

    let reply = `📅 Found **${rows.length} subscription${rows.length === 1 ? '' : 's'}** expiring ${label}:\n\n`;
    rows.forEach((r, idx) => {
      reply += `${idx + 1}. **${r.name}** — Expiry: **${r.expiry_date}** (${r.plan_name || 'Hosting Plan'}) [ID: #${r.id}]\n`;
    });

    return {
      success: true,
      intent: 'ANALYTICS_EXPIRY',
      confidence: 'HIGH',
      type: 'analytics',
      message: 'Expiring subscriptions retrieved from database',
      reply,
      evidence: { days, count: rows.length },
      results: rows
    };
  }

  /**
   * Handle Needs Attention summary questions.
   */
  async handleNeedsAttentionQuery() {
    const pendingRow = await dbGet('SELECT COUNT(*) as count FROM businesses WHERE status = "pending_review"');
    const pendingCount = pendingRow?.count || 0;

    const expiring7Row = await dbGet(`
      SELECT COUNT(*) as count 
      FROM businesses 
      WHERE expiry_date IS NOT NULL 
        AND expiry_date != ''
        AND date(expiry_date) >= date('now')
        AND date(expiry_date) <= date('now', '+7 days')
    `);
    const expiring7Count = expiring7Row?.count || 0;

    const failedRow = await dbGet('SELECT COUNT(*) as count FROM payments WHERE status = "failed"');
    const failedCount = failedRow?.count || 0;

    const totalCount = pendingCount + expiring7Count + failedCount;

    let reply = `⚡ **Admin Needs Attention Summary**:\n\n`;
    reply += `• **Pending Approvals**: **${pendingCount}** submission(s) waiting for quality review\n`;
    reply += `• **Expiring in 7 Days**: **${expiring7Count}** subscription(s) due for renewal\n`;
    reply += `• **Failed Payments**: **${failedCount}** transaction alert(s)\n\n`;
    reply += totalCount === 0
      ? `✅ All clear! No urgent items require attention.`
      : `👉 Total **${totalCount} action item(s)** requiring administrative review.`;

    return {
      success: true,
      intent: 'ANALYTICS_NEEDS_ATTENTION',
      confidence: 'HIGH',
      type: 'analytics',
      message: 'Needs attention summary generated from database',
      reply,
      evidence: { pendingCount, expiring7Count, failedCount, totalCount },
      results: []
    };
  }
}

module.exports = new AnalyticsService();
