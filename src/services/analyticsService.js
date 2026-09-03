const { dbAll, dbGet } = require('../db/database');

/**
 * AnalyticsService
 * Handles aggregation-style admin questions that userSearchService cannot answer:
 * counts, "top N", status/category/city breakdowns, and date-range filters.
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
  }
};

// Words that map to a canonical entity key. Extend freely as vocabulary grows.
const ENTITY_SYNONYMS = {
  business: ['business', 'businesses', 'company', 'companies', 'site', 'sites', 'shop', 'shops'],
  lead: ['lead', 'leads', 'inquiry', 'inquiries', 'enquiry', 'enquiries', 'request', 'requests'],
  user: ['user', 'users', 'customer', 'customers', 'client', 'clients', 'people', 'person'],
  service: ['service', 'services', 'offering', 'offerings']
};

const STATUS_SYNONYMS = {
  new: ['new', 'unattended', 'unhandled', 'fresh'],
  contacted: ['contacted', 'followed up', 'in progress'],
  closed: ['closed', 'done', 'completed', 'resolved'],
  live: ['live', 'active', 'published'],
  upcoming: ['upcoming', 'pending', 'draft', 'not live']
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
    return { from: toISO(from), to: toISO(new Date()), label: 'today' };
  }
  if (lower.includes('yesterday')) {
    const from = startOfDay(new Date(today.getTime() - 86400000));
    const to = startOfDay(today);
    return { from: toISO(from), to: toISO(to), label: 'yesterday' };
  }
  if (lower.includes('this week')) {
    const day = today.getDay(); // 0 = Sunday
    const from = startOfDay(new Date(today.getTime() - day * 86400000));
    return { from: toISO(from), to: toISO(new Date()), label: 'this week' };
  }
  if (lower.includes('last week')) {
    const day = today.getDay();
    const startThisWeek = startOfDay(new Date(today.getTime() - day * 86400000));
    const from = new Date(startThisWeek.getTime() - 7 * 86400000);
    return { from: toISO(from), to: toISO(startThisWeek), label: 'last week' };
  }
  if (lower.includes('this month')) {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toISO(from), to: toISO(new Date()), label: 'this month' };
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
  return null;
}

/**
 * Detect a city/category value referenced with "in <place>" or "from <place>" or "of <category>"
 * by scanning against actual distinct values present in the DB (avoids false positives on stopwords).
 */
async function detectKnownValue(lower, entity) {
  const cfg = ENTITY_CONFIG[entity];
  if (!cfg) return null;

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
 * Determine whether the message is asking for a COUNT ("how many", "count", "total number of")
 * or a LIST/TOP ("list all", "show all", "top 5").
 */
function detectQueryShape(lower) {
  const countTriggers = ['how many', 'count of', 'total number', 'number of', 'total count'];
  if (countTriggers.some(t => lower.includes(t))) return 'COUNT';

  const topMatch = lower.match(/top\s+(\d+)/);
  if (topMatch) return { shape: 'LIST', limit: parseInt(topMatch[1], 10) };

  if (/^(list|show|display|get)\s+(all|every)\b/.test(lower) || lower.includes('list all') || lower.includes('show all')) {
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
    const limit = shapeInfo.limit || 50;
    const orderBy = cfg.dateCol ? `${cfg.dateCol} DESC` : `id DESC`;
    const rows = await dbAll(`SELECT * FROM ${cfg.table} ${whereSql} ORDER BY ${orderBy} LIMIT ?`, [...params, limit]);

    const filterText = describedFilters.length ? ` matching ${describedFilters.join(', ')}` : '';
    let reply = `📋 Found **${rows.length}** ${rows.length === 1 ? cfg.labelSingular : cfg.labelPlural}${filterText}:\n\n`;
    rows.forEach((r, idx) => {
      const title = r[cfg.nameCol] || `#${r.id}`;
      const statusText = r.status ? ` — ${r.status}` : '';
      const cityText = r.city ? ` (${r.city})` : '';
      reply += `${idx + 1}. **${title}**${cityText}${statusText} [ID: #${r.id}]\n`;
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
}

module.exports = new AnalyticsService();
