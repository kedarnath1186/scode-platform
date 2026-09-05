const { dbAll, dbGet } = require('../db/database');

/**
 * Text Normalization & Tokenization Utilities
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[\-_/\\,;:!?'"()[\]{}#@+]/g, ' ') // replace punctuation/symbols with space
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  const norm = normalizeText(text);
  if (!norm) return [];
  // Filter out conversational question fillers, auxiliary verbs, and labels
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'for', 'with', 'from', 'in', 'at', 'by', 'on', 'to', 'of',
    'who', 'whose', 'whom', 'which', 'what', 'where', 'when', 'why', 'how',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'show', 'find', 'get', 'give', 'tell', 'search', 'fetch', 'display', 'list', 'details', 'info', 'about',
    'his', 'her', 'their', 'my', 'our', 'your', 'its', 'that', 'this', 'one', 'all', 'any',
    'company', 'companies', 'business', 'businesses', 'customer', 'customers', 'user', 'users', 'client', 'clients',
    'record', 'records', 'profile', 'profiles', 'related', 'associated', 'having', 'with', 'number', 'please', 'know'
  ]);
  return norm.split(' ').filter(t => t.length > 0 && !stopWords.has(t));
}

function getAllTokens(text) {
  const norm = normalizeText(text);
  if (!norm) return [];
  return norm.split(' ').filter(t => t.length > 0);
}

/**
 * Levenshtein distance between two strings
 */
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // deletion
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return d[m][n];
}

function stringSimilarity(s1, s2) {
  const n1 = normalizeText(s1);
  const n2 = normalizeText(s2);
  if (!n1 || !n2) return 0;
  if (n1 === n2) return 1.0;
  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(n1, n2);
  return Math.max(0, 1.0 - dist / maxLen);
}

/**
 * Soundex phonetic key — catches spelling variants that Levenshtein misses
 * (e.g. "Sunil" vs "Suneel", "Shreya" vs "Shraya"). Fully local, no dependency.
 */
function soundex(str) {
  const s = (str || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) return '';
  const codes = { B: 1, F: 1, P: 1, V: 1, C: 2, G: 2, J: 2, K: 2, Q: 2, S: 2, X: 2, Z: 2, D: 3, T: 3, L: 4, M: 5, N: 5, R: 6 };
  let result = s[0];
  let prevCode = codes[s[0]] || 0;
  for (let i = 1; i < s.length && result.length < 4; i++) {
    const code = codes[s[i]] || 0;
    if (code !== 0 && code !== prevCode) result += code;
    prevCode = code;
  }
  return (result + '000').slice(0, 4);
}

/**
 * Relative importance of each field when multiple tokens hit different fields
 * in the same Canonical Document (Stage 3 compound scoring). Name fields carry
 * the most weight; noisy free-text fields like inquiry messages carry the least,
 * so a coincidental keyword match there can no longer outrank a real name match.
 */
const FIELD_WEIGHTS = {
  customerName: 1.0,
  businessName: 1.0,
  city: 0.6,
  category: 0.5,
  service: 0.35,
  inquiry: 0.25
};

/**
 * Database-Aware Canonical Entity Search & Retrieval Service
 * Strict Zero-Hallucination & Relational Graph Grounding
 */
class UserSearchService {
  constructor() {
    // In-memory cache of built Canonical Documents, invalidated on any
    // business/lead/user/service write so search never serves stale data.
    this._cache = null;
    this._cacheVersion = 0;
  }

  /**
   * Call this after any INSERT/UPDATE/DELETE on users, businesses, leads,
   * or services so the next search rebuilds fresh Canonical Documents.
   */
  invalidateCache() {
    this._cacheVersion++;
  }

  /**
   * Fetch all relational data for a customer by Customer ID
   * Grounded directly by primary and foreign keys
   * @param {number} customerId
   * @returns {Promise<Object|null>}
   */
  async getCustomerEntityById(customerId) {
    if (!customerId) return null;

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [customerId]);
    if (!user) return null;

    // Fetch related business (via business_id or owner_id)
    let business = null;
    if (user.business_id) {
      business = await dbGet('SELECT * FROM businesses WHERE id = ?', [user.business_id]);
    } else {
      business = await dbGet('SELECT * FROM businesses WHERE owner_id = ?', [user.id]);
    }

    // Fetch related inquiries from leads table (by business_id or email or phone)
    const inquiryClauses = [];
    const inqParams = [];
    if (business && business.id) {
      inquiryClauses.push('business_id = ?');
      inqParams.push(business.id);
    }
    if (user.email) {
      inquiryClauses.push('email = ?');
      inqParams.push(user.email);
    }
    if (user.phone) {
      inquiryClauses.push('phone = ?');
      inqParams.push(user.phone);
    }

    let inquiries = [];
    if (inquiryClauses.length > 0) {
      inquiries = await dbAll(
        `SELECT * FROM leads WHERE ${inquiryClauses.join(' OR ')} ORDER BY id DESC`,
        inqParams
      );
    }

    // Fetch related services if business exists
    let services = [];
    if (business && business.id) {
      services = await dbAll(
        'SELECT * FROM services WHERE business_id = ? ORDER BY display_order ASC, id ASC',
        [business.id]
      );
    }

    return this.buildCanonicalDocument(user, business, inquiries, services);
  }

  /**
   * Fetch all relational data for a business by Business ID
   * @param {number} businessId
   * @returns {Promise<Object|null>}
   */
  async getBusinessEntityById(businessId) {
    if (!businessId) return null;

    const business = await dbGet('SELECT * FROM businesses WHERE id = ?', [businessId]);
    if (!business) return null;

    // Fetch owner customer (via owner_id or user.business_id)
    let user = null;
    if (business.owner_id) {
      user = await dbGet('SELECT * FROM users WHERE id = ?', [business.owner_id]);
    } else {
      user = await dbGet('SELECT * FROM users WHERE business_id = ?', [business.id]);
    }

    const inquiries = await dbAll(
      'SELECT * FROM leads WHERE business_id = ? ORDER BY id DESC',
      [business.id]
    );

    const services = await dbAll(
      'SELECT * FROM services WHERE business_id = ? ORDER BY display_order ASC, id ASC',
      [business.id]
    );

    return this.buildCanonicalDocument(user, business, inquiries, services);
  }

  /**
   * Assemble a unified Canonical Entity Document representing the full relational cluster
   */
  buildCanonicalDocument(user, business, inquiries = [], services = []) {
    const doc = {
      entityType: user ? 'customer' : 'business',
      customerId: user ? user.id : null,
      customerName: user ? user.name : null,
      email: user ? user.email : (business ? business.email : null),
      phone: user ? user.phone : (business ? business.phone : null),
      city: user ? user.city : (business ? business.city : null),
      state: user ? (user.state || 'Maharashtra') : (business ? (business.state || 'Maharashtra') : null),
      pincode: user ? user.pincode : (business ? business.pincode : null),
      address: user ? user.address : (business ? business.address : null),
      customerGst: user ? user.gst_number : null,
      customerRole: user ? user.role : null,
      customerStatus: user ? user.status : null,
      customerCreatedAt: user ? user.created_at : null,

      businessId: business ? business.id : null,
      businessName: business ? business.name : null,
      businessSlug: business ? business.slug : null,
      businessCategory: business ? business.category : null,
      businessTagline: business ? business.tagline : null,
      businessDescription: business ? business.description : null,
      businessCity: business ? business.city : null,
      businessState: business ? business.state : null,
      businessPincode: business ? business.pincode : null,
      businessAddress: business ? business.address : null,
      businessGst: business ? business.gst_number : null,
      businessPhone: business ? business.phone : null,
      businessEmail: business ? business.email : null,
      businessStatus: business ? business.status : null,

      inquiries: (inquiries || []).map(inq => ({
        id: inq.id,
        name: inq.name,
        email: inq.email,
        phone: inq.phone,
        message: inq.message,
        serviceRequested: inq.service_requested,
        status: inq.status,
        createdAt: inq.created_at
      })),

      services: (services || []).map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        price: s.price
      })),

      // Flat searchable token bank
      searchableTokens: []
    };

    // Populate searchable token bank
    const tokens = new Set();
    const addTokensFrom = (val) => {
      if (!val) return;
      getAllTokens(String(val)).forEach(t => tokens.add(t));
    };

    addTokensFrom(doc.customerName);
    addTokensFrom(doc.businessName);
    addTokensFrom(doc.email);
    addTokensFrom(doc.phone);
    addTokensFrom(doc.city);
    addTokensFrom(doc.state);
    addTokensFrom(doc.address);
    addTokensFrom(doc.customerGst);
    addTokensFrom(doc.businessGst);
    addTokensFrom(doc.businessCategory);
    addTokensFrom(doc.businessDescription);

    doc.inquiries.forEach(inq => {
      addTokensFrom(inq.message);
      addTokensFrom(inq.serviceRequested);
    });

    doc.services.forEach(s => {
      addTokensFrom(s.title);
      addTokensFrom(s.description);
    });

    doc.searchableTokens = Array.from(tokens);
    return doc;
  }

  /**
   * Fetch all Canonical Entity Documents across the database
   * (Constructed dynamically with parameterized queries)
   */
  async getAllCanonicalEntities() {
    if (this._cache && this._cache.version === this._cacheVersion) {
      return this._cache.docs;
    }

    const users = await dbAll('SELECT * FROM users WHERE deleted_at IS NULL ORDER BY id ASC');
    const businesses = await dbAll('SELECT * FROM businesses WHERE deleted_at IS NULL ORDER BY id ASC');
    const leads = await dbAll('SELECT * FROM leads WHERE deleted_at IS NULL ORDER BY id DESC');
    const services = await dbAll('SELECT * FROM services ORDER BY business_id, display_order');

    const businessMap = new Map();
    businesses.forEach(b => businessMap.set(b.id, b));

    const leadsByBiz = new Map();
    const leadsByEmail = new Map();
    const leadsByPhone = new Map();
    leads.forEach(l => {
      if (l.business_id) {
        if (!leadsByBiz.has(l.business_id)) leadsByBiz.set(l.business_id, []);
        leadsByBiz.get(l.business_id).push(l);
      }
      if (l.email) {
        if (!leadsByEmail.has(l.email.toLowerCase())) leadsByEmail.set(l.email.toLowerCase(), []);
        leadsByEmail.get(l.email.toLowerCase()).push(l);
      }
      if (l.phone) {
        const cleanP = l.phone.replace(/[^0-9]/g, '');
        if (!leadsByPhone.has(cleanP)) leadsByPhone.set(cleanP, []);
        leadsByPhone.get(cleanP).push(l);
      }
    });

    const servicesByBiz = new Map();
    services.forEach(s => {
      if (!servicesByBiz.has(s.business_id)) servicesByBiz.set(s.business_id, []);
      servicesByBiz.get(s.business_id).push(s);
    });

    const canonicalDocs = [];
    const linkedBusinessIds = new Set();

    // 1. Build canonical documents for all users
    for (const u of users) {
      let biz = null;
      if (u.business_id && businessMap.has(u.business_id)) {
        biz = businessMap.get(u.business_id);
        linkedBusinessIds.add(biz.id);
      } else {
        // Check if owner_id links to this user
        biz = businesses.find(b => b.owner_id === u.id);
        if (biz) linkedBusinessIds.add(biz.id);
      }

      const inqs = [];
      if (biz && leadsByBiz.has(biz.id)) inqs.push(...leadsByBiz.get(biz.id));
      if (u.email && leadsByEmail.has(u.email.toLowerCase())) {
        leadsByEmail.get(u.email.toLowerCase()).forEach(l => {
          if (!inqs.some(existing => existing.id === l.id)) inqs.push(l);
        });
      }
      if (u.phone) {
        const cleanP = u.phone.replace(/[^0-9]/g, '');
        if (leadsByPhone.has(cleanP)) {
          leadsByPhone.get(cleanP).forEach(l => {
            if (!inqs.some(existing => existing.id === l.id)) inqs.push(l);
          });
        }
      }

      const srvs = biz ? (servicesByBiz.get(biz.id) || []) : [];
      canonicalDocs.push(this.buildCanonicalDocument(u, biz, inqs, srvs));
    }

    // 2. Build canonical documents for unlinked standalone businesses
    for (const b of businesses) {
      if (!linkedBusinessIds.has(b.id)) {
        const inqs = leadsByBiz.get(b.id) || [];
        const srvs = servicesByBiz.get(b.id) || [];
        canonicalDocs.push(this.buildCanonicalDocument(null, b, inqs, srvs));
      }
    }

    // 3. Build canonical documents for platform-level inquiries/leads (unlinked to any business)
    for (const l of leads) {
      if (!l.business_id) {
        const doc = {
          entityType: 'inquiry',
          customerId: null,
          customerName: l.name,
          email: l.email,
          phone: l.phone,
          city: null,
          state: null,
          pincode: null,
          address: null,
          customerGst: null,
          customerRole: 'lead',
          customerStatus: l.status,
          customerCreatedAt: l.created_at,
          businessId: null,
          businessName: null,
          businessSlug: null,
          businessCategory: l.service_requested,
          businessTagline: null,
          businessDescription: l.message,
          businessCity: null,
          businessState: null,
          businessPincode: null,
          businessAddress: null,
          businessGst: null,
          businessPhone: null,
          businessEmail: null,
          businessStatus: null,
          inquiries: [{
            id: l.id,
            name: l.name,
            email: l.email,
            phone: l.phone,
            message: l.message,
            serviceRequested: l.service_requested,
            status: l.status,
            createdAt: l.created_at
          }],
          services: [],
          searchableTokens: []
        };
        const tokens = new Set();
        getAllTokens(l.name + ' ' + (l.email || '') + ' ' + l.phone + ' ' + (l.message || '') + ' ' + (l.service_requested || '')).forEach(t => tokens.add(t));
        doc.searchableTokens = Array.from(tokens);
        canonicalDocs.push(doc);
      }
    }

    this._cache = { version: this._cacheVersion, docs: canonicalDocs };
    return canonicalDocs;
  }

  /**
   * Multi-Stage Hybrid Candidate Search & Relevance Ranking
   * Strict ground-truth evaluation across Canonical Documents
   * @param {Object} criteria
   * @returns {Promise<Array<Object>>}
   */
  async searchCanonical(criteria = {}) {
    const {
      query = '',
      id = null,
      email = '',
      phone = '',
      gst_number = '',
      limit = 50
    } = criteria;

    const rawQuery = (query || email || phone || gst_number || '').trim();
    const queryNorm = normalizeText(rawQuery);
    const queryTokens = tokenize(rawQuery);
    const allQueryTokens = getAllTokens(rawQuery);

    const docs = await this.getAllCanonicalEntities();

    if (!rawQuery && !id) {
      return docs.slice(0, limit).map(d => ({
        ...d,
        searchScore: 1.0,
        matchedFields: ['all'],
        matchReason: 'List all records',
        confidence: 'HIGH'
      }));
    }

    const scoredDocs = [];

    for (const doc of docs) {
      let score = 0;
      const matchedFields = [];
      const matchReasons = [];

      // ====================================================
      // STAGE 1: EXACT UNIQUE IDENTIFIER MATCH (Score: 1.00)
      // ====================================================
      if (id !== null && id !== undefined && id !== '') {
        const numId = Number(id);
        if (doc.customerId === numId || doc.businessId === numId) {
          score = 1.0;
          matchedFields.push('id');
          matchReasons.push(`Exact ID match #${numId}`);
        }
      }

      if (email || rawQuery.includes('@')) {
        const emailMatch = rawQuery.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const targetEmail = (email || (emailMatch ? emailMatch[0] : rawQuery)).toLowerCase().trim();
        if ((doc.email && doc.email.toLowerCase() === targetEmail) ||
            (doc.businessEmail && doc.businessEmail.toLowerCase() === targetEmail)) {
          score = 1.0;
          matchedFields.push('email');
          matchReasons.push(`Exact Email match: "${targetEmail}"`);
        }
      }

      const rawPhoneDigits = rawQuery.replace(/[^0-9]/g, '');
      if (phone || rawPhoneDigits.length >= 7) {
        const targetDigits = (phone || rawPhoneDigits).replace(/[^0-9]/g, '');
        const custPhoneDigits = (doc.phone || '').replace(/[^0-9]/g, '');
        const bizPhoneDigits = (doc.businessPhone || '').replace(/[^0-9]/g, '');

        if ((custPhoneDigits && custPhoneDigits.includes(targetDigits)) ||
            (bizPhoneDigits && bizPhoneDigits.includes(targetDigits))) {
          score = 1.0;
          matchedFields.push('phone');
          matchReasons.push(`Exact Phone match: "${targetDigits}"`);
        }
      }

      const gstMatch = rawQuery.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i);
      if (gst_number || gstMatch) {
        const targetGst = normalizeText(gst_number || (gstMatch ? gstMatch[1] : rawQuery));
        if ((doc.customerGst && normalizeText(doc.customerGst) === targetGst) ||
            (doc.businessGst && normalizeText(doc.businessGst) === targetGst)) {
          score = 1.0;
          matchedFields.push('gst_number');
          matchReasons.push(`Exact GST match: "${targetGst.toUpperCase()}"`);
        }
      }

      // If exact identifier found with 1.00, record and continue
      if (score >= 1.0) {
        scoredDocs.push({
          ...doc,
          searchScore: 1.0,
          matchedFields,
          matchReasons,
          confidence: 'HIGH'
        });
        continue;
      }

      // ====================================================
      // STAGE 2: NORMALIZED FULL MATCH & CONTINUOUS MATCH (Score: 0.90 - 0.98)
      // ====================================================
      const custNameNorm = normalizeText(doc.customerName);
      const bizNameNorm = normalizeText(doc.businessName);
      const queryCompressed = queryNorm.replace(/\s+/g, '');
      const custCompressed = custNameNorm ? custNameNorm.replace(/\s+/g, '') : '';
      const bizCompressed = bizNameNorm ? bizNameNorm.replace(/\s+/g, '') : '';

      if (custNameNorm && (custNameNorm === queryNorm)) {
        score = Math.max(score, 0.98);
        matchedFields.push('customerName');
        matchReasons.push(`Exact Customer Name: "${doc.customerName}"`);
      } else if (bizNameNorm && (bizNameNorm === queryNorm)) {
        score = Math.max(score, 0.98);
        matchedFields.push('businessName');
        matchReasons.push(`Exact Business Name: "${doc.businessName}"`);
      }

      // Continuous Match without spaces (e.g. "CleanWater" in "Clean Water Solutions")
      if (bizCompressed && (bizCompressed === queryCompressed || bizCompressed.includes(queryCompressed)) && queryCompressed.length >= 4) {
        const subScore = 0.90 + (queryCompressed.length / bizCompressed.length) * 0.08;
        if (subScore > score) {
          score = subScore;
          matchedFields.push('businessName_continuous');
          matchReasons.push(`Continuous Match in Business Name: "${doc.businessName}"`);
        }
      }

      if (custCompressed && (custCompressed === queryCompressed || custCompressed.includes(queryCompressed)) && queryCompressed.length >= 4) {
        const subScore = 0.90 + (queryCompressed.length / custCompressed.length) * 0.08;
        if (subScore > score) {
          score = subScore;
          matchedFields.push('customerName_continuous');
          matchReasons.push(`Continuous Match in Customer Name: "${doc.customerName}"`);
        }
      }

      // Prefix Match: partial typed names like "Rah" should confidently match
      // "Rahul" rather than falling through to weaker substring/fuzzy stages.
      if (custNameNorm && custNameNorm.startsWith(queryNorm) && queryNorm.length >= 2) {
        const prefixScore = 0.82 + (queryNorm.length / custNameNorm.length) * 0.10;
        if (prefixScore > score) {
          score = prefixScore;
          matchedFields.push('customerName_prefix');
          matchReasons.push(`Prefix match on Customer Name: "${doc.customerName}"`);
        }
      }

      if (bizNameNorm && bizNameNorm.startsWith(queryNorm) && queryNorm.length >= 2) {
        const prefixScore = 0.82 + (queryNorm.length / bizNameNorm.length) * 0.10;
        if (prefixScore > score) {
          score = prefixScore;
          matchedFields.push('businessName_prefix');
          matchReasons.push(`Prefix match on Business Name: "${doc.businessName}"`);
        }
      }

      // ====================================================
      // STAGE 3: MULTI-TOKEN CONTAINMENT & SUBSTRING MATCH (Score: 0.80 - 0.92)
      // ====================================================
      // Check full substring containment in customer or business name
      if (custNameNorm && custNameNorm.includes(queryNorm) && queryNorm.length >= 3) {
        const subScore = 0.88 + (queryNorm.length / custNameNorm.length) * 0.08;
        if (subScore > score) {
          score = subScore;
          matchedFields.push('customerName_substring');
          matchReasons.push(`Substring in Customer Name: "${doc.customerName}"`);
        }
      }

      if (bizNameNorm && bizNameNorm.includes(queryNorm) && queryNorm.length >= 3) {
        const subScore = 0.88 + (queryNorm.length / bizNameNorm.length) * 0.08;
        if (subScore > score) {
          score = subScore;
          matchedFields.push('businessName_substring');
          matchReasons.push(`Substring in Business Name: "${doc.businessName}"`);
        }
      }

      // Multi-token evaluation across the Canonical Document
      if (queryTokens.length > 0) {
        let matchedTokensCount = 0;
        const fieldHitCounts = new Map();

        for (const qToken of queryTokens) {
          let tokenMatched = false;

          // Check Customer Name
          if (custNameNorm && (custNameNorm.includes(qToken) || stringSimilarity(qToken, custNameNorm) >= 0.82)) {
            tokenMatched = true;
            fieldHitCounts.set('customerName', (fieldHitCounts.get('customerName') || 0) + 1);
          }

          // Check Business Name
          if (bizNameNorm && (bizNameNorm.includes(qToken) || stringSimilarity(qToken, bizNameNorm) >= 0.82)) {
            tokenMatched = true;
            fieldHitCounts.set('businessName', (fieldHitCounts.get('businessName') || 0) + 1);
          }

          // Check City
          const cityNorm = normalizeText(doc.city || doc.businessCity);
          if (cityNorm && (cityNorm === qToken || cityNorm.includes(qToken))) {
            tokenMatched = true;
            fieldHitCounts.set('city', (fieldHitCounts.get('city') || 0) + 1);
          }

          // Check Category
          const catNorm = normalizeText(doc.businessCategory);
          if (catNorm && (catNorm.includes(qToken))) {
            tokenMatched = true;
            fieldHitCounts.set('category', (fieldHitCounts.get('category') || 0) + 1);
          }

          // Check Inquiries
          const inqMatches = doc.inquiries.some(inq => {
            const inqNorm = normalizeText(inq.message + ' ' + inq.serviceRequested);
            return inqNorm.includes(qToken);
          });
          if (inqMatches) {
            tokenMatched = true;
            fieldHitCounts.set('inquiry', (fieldHitCounts.get('inquiry') || 0) + 1);
          }

          // Check Services
          const srvMatches = doc.services.some(s => {
            const srvNorm = normalizeText(s.title + ' ' + s.description);
            return srvNorm.includes(qToken);
          });
          if (srvMatches) {
            tokenMatched = true;
            fieldHitCounts.set('service', (fieldHitCounts.get('service') || 0) + 1);
          }

          if (tokenMatched) matchedTokensCount++;
        }

        const tokenRecall = matchedTokensCount / queryTokens.length;

        // If ALL query tokens match across the relational entity
        if (tokenRecall === 1.0) {
          // Co-occurrence Compound Boost, weighted by field importance instead
          // of a flat tier — a name+city match now clearly outranks a
          // coincidental match that only hit low-value fields like inquiries.
          let weightedSum = 0;
          for (const field of fieldHitCounts.keys()) {
            weightedSum += FIELD_WEIGHTS[field] || 0.3;
          }
          const avgWeight = weightedSum / fieldHitCounts.size;
          const distinctFieldsCount = fieldHitCounts.size;
          // Base band still rewards hitting more distinct fields, but scaled
          // down when those fields are low-value (e.g. only inquiry/service).
          let compoundScore = 0.72 + avgWeight * 0.16 + Math.min(distinctFieldsCount, 3) * 0.02;
          compoundScore = Math.min(0.96, compoundScore);

          if (compoundScore > score) {
            score = compoundScore;
            matchedFields.push(...Array.from(fieldHitCounts.keys()));
            matchReasons.push(`All ${queryTokens.length} query tokens (${queryTokens.join(', ')}) matched across [${Array.from(fieldHitCounts.keys()).join(', ')}]`);
          }
        } else if (tokenRecall >= 0.5) {
          const partialScore = 0.60 + tokenRecall * 0.22;
          if (partialScore > score) {
            score = partialScore;
            matchedFields.push(...Array.from(fieldHitCounts.keys()));
            matchReasons.push(`Partial tokens (${matchedTokensCount}/${queryTokens.length}) matched across [${Array.from(fieldHitCounts.keys()).join(', ')}]`);
          }
        }
      }

      // ====================================================
      // STAGE 4: CONTROLLED FUZZY MATCHING (Score: 0.65 - 0.78)
      // ====================================================
      // Levenshtein similarity is unreliable on short strings (a 3-4 letter
      // typo can accidentally clear a flat threshold against an unrelated
      // name), so require a stricter similarity the shorter the query is.
      const minFuzzySim = queryNorm.length <= 4 ? 0.85 : queryNorm.length <= 7 ? 0.80 : 0.75;

      if (custNameNorm && score < 0.75) {
        const sim = stringSimilarity(queryNorm, custNameNorm);
        if (sim >= minFuzzySim) {
          const fuzzyScore = sim * 0.80;
          if (fuzzyScore > score) {
            score = fuzzyScore;
            matchedFields.push('customerName_fuzzy');
            matchReasons.push(`Fuzzy match with Customer Name "${doc.customerName}" (${Math.round(sim * 100)}%)`);
          }
        }
      }

      if (bizNameNorm && score < 0.75) {
        const sim = stringSimilarity(queryNorm, bizNameNorm);
        if (sim >= minFuzzySim) {
          const fuzzyScore = sim * 0.80;
          if (fuzzyScore > score) {
            score = fuzzyScore;
            matchedFields.push('businessName_fuzzy');
            matchReasons.push(`Fuzzy match with Business Name "${doc.businessName}" (${Math.round(sim * 100)}%)`);
          }
        }
      }

      // ====================================================
      // STAGE 5: PHONETIC MATCHING (Score: ~0.68)
      // ====================================================
      // Catches spelling variants Levenshtein misses entirely, e.g.
      // "Suneel" vs "Sunil" — same sound, edit distance can be too high.
      if (custNameNorm && score < 0.70) {
        const custTokens = custNameNorm.split(' ');
        const queryFirstToken = queryNorm.split(' ')[0];
        const phoneticHit = queryFirstToken && custTokens.some(t => t && soundex(t) === soundex(queryFirstToken));
        if (phoneticHit) {
          const phoneticScore = 0.68;
          if (phoneticScore > score) {
            score = phoneticScore;
            matchedFields.push('customerName_phonetic');
            matchReasons.push(`Phonetic match with Customer Name "${doc.customerName}"`);
          }
        }
      }

      if (bizNameNorm && score < 0.70) {
        const bizTokens = bizNameNorm.split(' ');
        const queryFirstToken = queryNorm.split(' ')[0];
        const phoneticHit = queryFirstToken && bizTokens.some(t => t && soundex(t) === soundex(queryFirstToken));
        if (phoneticHit) {
          const phoneticScore = 0.66;
          if (phoneticScore > score) {
            score = phoneticScore;
            matchedFields.push('businessName_phonetic');
            matchReasons.push(`Phonetic match with Business Name "${doc.businessName}"`);
          }
        }
      }

      // Determine confidence level
      let confidence = 'ZERO';
      if (score >= 0.85) confidence = 'HIGH';
      else if (score >= 0.60) confidence = 'MEDIUM';
      else if (score >= 0.40) confidence = 'LOW';

      if (score >= 0.40) {
        scoredDocs.push({
          ...doc,
          searchScore: Number(score.toFixed(3)),
          matchedFields: Array.from(new Set(matchedFields)),
          matchReasons,
          confidence
        });
      }
    }

    // Sort by relevance score descending
    scoredDocs.sort((a, b) => b.searchScore - a.searchScore);

    // Development Debug Logging
    if (process.env.DEBUG_SEARCH === 'true' || process.env.NODE_ENV !== 'test_quiet') {
      console.log(`\n[Search Engine Debug] Query: "${rawQuery}" | Tokens: [${queryTokens.join(', ')}]`);
      console.log(`[Search Engine Debug] Found Candidates: ${scoredDocs.length}`);
      if (scoredDocs.length > 0) {
        const top = scoredDocs[0];
        console.log(`[Search Engine Debug] Top: [ID: #${top.customerId || top.businessId}] "${top.customerName || top.businessName}" | Score: ${top.searchScore} (${top.confidence}) | Fields: [${top.matchedFields.join(', ')}] | Reason: ${top.matchReasons[0]}`);
      }
    }

    return scoredDocs.slice(0, limit);
  }

  /**
   * Helper to retrieve all users formatted as canonical documents
   */
  async getAllUsers(limit = 100) {
    const docs = await this.getAllCanonicalEntities();
    return docs.filter(d => d.customerId !== null).slice(0, limit);
  }

  /**
   * Helper to retrieve all businesses formatted as canonical documents
   */
  async getAllBusinesses(limit = 100) {
    const docs = await this.getAllCanonicalEntities();
    return docs.filter(d => d.businessId !== null).slice(0, limit);
  }
}

module.exports = new UserSearchService();
