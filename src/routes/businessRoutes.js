const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { dbRun, dbGet, dbAll } = require('../db/database');
const { verifyAdmin, requireSuperAdmin, JWT_SECRET } = require('../middleware/auth');
const userSearchService = require('../services/userSearchService');
const { logAudit } = require('../services/auditService');

// Utility to generate a URL-friendly slug
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// GET /api/businesses/admin/trash - View soft-deleted businesses (Admin only)
router.get('/admin/trash', verifyAdmin, async (req, res) => {
  try {
    const trash = await dbAll('SELECT * FROM businesses WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
    res.json({ success: true, count: trash.length, data: trash });
  } catch (error) {
    console.error('Error fetching trash businesses:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trash items' });
  }
});

// GET /api/businesses - List active businesses (Excludes soft-deleted)
router.get('/', async (req, res) => {
  try {
    const { status, category, search, featured } = req.query;
    let sql = 'SELECT * FROM businesses WHERE (deleted_at IS NULL)';
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (category && category !== 'all') {
      sql += ' AND category LIKE ?';
      params.push(`%${category}%`);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ? OR tagline LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (featured === '1' || featured === 'true') {
      sql += ' AND is_featured = 1';
    }

    sql += ' ORDER BY is_featured DESC, status ASC, created_at DESC';

    const businesses = await dbAll(sql, params);

    // Attach services count
    for (const b of businesses) {
      const services = await dbAll('SELECT id, title, icon FROM services WHERE business_id = ? ORDER BY display_order ASC', [b.id]);
      b.services = services;
    }

    res.json({ success: true, count: businesses.length, data: businesses });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch businesses' });
  }
});

// GET /api/businesses/:slugOrId - Get single business with full details
router.get('/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;
    let business;

    if (!isNaN(slugOrId)) {
      business = await dbGet('SELECT * FROM businesses WHERE id = ?', [slugOrId]);
    } else {
      business = await dbGet('SELECT * FROM businesses WHERE slug = ?', [slugOrId]);
    }

    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    // Check Admin Authentication for Preview Mode
    let isAdmin = false;
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    } else if (req.query.admin_token) {
      token = req.query.admin_token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded) isAdmin = true;
      } catch (e) {
        isAdmin = false;
      }
    }

    // Feature 1b: Public route enforcement.
    // If not live, only render full content for verified admin in preview mode.
    if (business.status !== 'live' && !isAdmin) {
      return res.json({
        success: true,
        is_restricted: true,
        data: {
          id: business.id,
          name: business.name,
          slug: business.slug,
          status: business.status,
          category: business.category,
          tagline: business.tagline,
          theme_color: business.theme_color
        }
      });
    }

    // Fetch related services, testimonials, gallery
    const services = await dbAll('SELECT * FROM services WHERE business_id = ? ORDER BY display_order ASC', [business.id]);
    const testimonials = await dbAll('SELECT * FROM testimonials WHERE business_id = ? ORDER BY id DESC', [business.id]);
    const gallery = await dbAll('SELECT * FROM gallery_items WHERE business_id = ? ORDER BY id DESC', [business.id]);

    res.json({
      success: true,
      data: {
        ...business,
        is_preview: business.status !== 'live' && isAdmin,
        services,
        testimonials,
        gallery
      }
    });
  } catch (error) {
    console.error('Error fetching business detail:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch business details' });
  }
});

// POST /api/businesses - Create new business (Admin only)
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const {
      name,
      slug: customSlug,
      category,
      tagline,
      description,
      about_text,
      logo_url,
      hero_bg_url,
      phone,
      whatsapp,
      email,
      address,
      google_map_url,
      status = 'live',
      expiry_date,
      theme_color = '#3b82f6',
      is_featured = 0,
      services = []
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Business Name and Category are required' });
    }

    let slug = customSlug ? generateSlug(customSlug) : generateSlug(name);
    
    // Check if slug exists
    const existing = await dbGet('SELECT id FROM businesses WHERE slug = ?', [slug]);
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const result = await dbRun(`
      INSERT INTO businesses (
        name, slug, category, tagline, description, about_text,
        logo_url, hero_bg_url, phone, whatsapp, email, address,
        google_map_url, status, expiry_date, theme_color, is_featured,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      name, slug, category, tagline || '', description || '', about_text || '',
      logo_url || '', hero_bg_url || '', phone || '', whatsapp || phone || '',
      email || '', address || '', google_map_url || '', status, expiry_date || '',
      theme_color, is_featured ? 1 : 0
    ]);

    const businessId = result.lastID;

    // Insert services if provided
    if (Array.isArray(services) && services.length > 0) {
      for (let i = 0; i < services.length; i++) {
        const s = services[i];
        if (s.title) {
          await dbRun(`
            INSERT INTO services (business_id, title, description, icon, price, display_order)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [businessId, s.title, s.description || '', s.icon || 'bi-gear-fill', s.price || '', i + 1]);
        }
      }
    }

    const created = await dbGet('SELECT * FROM businesses WHERE id = ?', [businessId]);

    await logAudit({
      admin_id: req.admin?.id,
      action: 'CREATE',
      entity_type: 'business',
      entity_id: businessId,
      details: { name: created.name, slug: created.slug, category: created.category }
    });

    userSearchService.invalidateCache();
    res.status(201).json({ success: true, message: 'Business created successfully', data: created });
  } catch (error) {
    console.error('Error creating business:', error);
    res.status(500).json({ success: false, message: 'Failed to create business' });
  }
});

// PUT /api/businesses/:id - Update business (Admin only)
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      category,
      tagline,
      description,
      about_text,
      logo_url,
      hero_bg_url,
      phone,
      whatsapp,
      email,
      address,
      google_map_url,
      status,
      expiry_date,
      theme_color,
      is_featured,
      services,
      testimonials,
      gallery
    } = req.body;

    const existing = await dbGet('SELECT * FROM businesses WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const finalSlug = slug ? generateSlug(slug) : existing.slug;

    await dbRun(`
      UPDATE businesses SET
        name = ?,
        slug = ?,
        category = ?,
        tagline = ?,
        description = ?,
        about_text = ?,
        logo_url = ?,
        hero_bg_url = ?,
        phone = ?,
        whatsapp = ?,
        email = ?,
        address = ?,
        google_map_url = ?,
        status = ?,
        expiry_date = ?,
        theme_color = ?,
        is_featured = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name || existing.name,
      finalSlug,
      category || existing.category,
      tagline !== undefined ? tagline : existing.tagline,
      description !== undefined ? description : existing.description,
      about_text !== undefined ? about_text : existing.about_text,
      logo_url !== undefined ? logo_url : existing.logo_url,
      hero_bg_url !== undefined ? hero_bg_url : existing.hero_bg_url,
      phone !== undefined ? phone : existing.phone,
      whatsapp !== undefined ? whatsapp : existing.whatsapp,
      email !== undefined ? email : existing.email,
      address !== undefined ? address : existing.address,
      google_map_url !== undefined ? google_map_url : existing.google_map_url,
      status || existing.status,
      expiry_date !== undefined ? expiry_date : existing.expiry_date,
      theme_color || existing.theme_color,
      is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
      id
    ]);

    // If services array is passed, update services
    if (Array.isArray(services)) {
      await dbRun('DELETE FROM services WHERE business_id = ?', [id]);
      for (let i = 0; i < services.length; i++) {
        const s = services[i];
        if (s.title) {
          await dbRun(`
            INSERT INTO services (business_id, title, description, icon, price, display_order)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [id, s.title, s.description || '', s.icon || 'bi-gear-fill', s.price || '', i + 1]);
        }
      }
    }

    // If testimonials array is passed, update testimonials
    if (Array.isArray(testimonials)) {
      await dbRun('DELETE FROM testimonials WHERE business_id = ?', [id]);
      for (const t of testimonials) {
        if (t.client_name && t.quote) {
          await dbRun(`
            INSERT INTO testimonials (business_id, client_name, client_role, company, quote, rating, avatar_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [id, t.client_name, t.client_role || '', t.company || '', t.quote, t.rating || 5, t.avatar_url || '']);
        }
      }
    }

    // If gallery array is passed, update gallery
    if (Array.isArray(gallery)) {
      await dbRun('DELETE FROM gallery_items WHERE business_id = ?', [id]);
      for (const g of gallery) {
        if (g.image_url) {
          await dbRun(`
            INSERT INTO gallery_items (business_id, title, image_url, category)
            VALUES (?, ?, ?, ?)
          `, [id, g.title || '', g.image_url, g.category || '']);
        }
      }
    }

    const updated = await dbGet('SELECT * FROM businesses WHERE id = ?', [id]);

    await logAudit({
      admin_id: req.admin?.id,
      action: 'UPDATE',
      entity_type: 'business',
      entity_id: id,
      details: { name: updated.name, slug: updated.slug, status: updated.status }
    });

    userSearchService.invalidateCache();
    res.json({ success: true, message: 'Business updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({ success: false, message: 'Failed to update business' });
  }
});

// DELETE /api/businesses/:id - Soft-delete business (Admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const business = await dbGet('SELECT * FROM businesses WHERE id = ?', [id]);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    await dbRun(`
      UPDATE businesses SET
        deleted_at = CURRENT_TIMESTAMP,
        status = 'suspended',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    await logAudit({
      admin_id: req.admin?.id,
      action: 'SOFT_DELETE',
      entity_type: 'business',
      entity_id: id,
      details: { name: business.name, slug: business.slug, previous_status: business.status }
    });

    userSearchService.invalidateCache();
    res.json({ success: true, message: `Business "${business.name}" moved to trash (soft-deleted)` });
  } catch (error) {
    console.error('Error soft-deleting business:', error);
    res.status(500).json({ success: false, message: 'Failed to delete business' });
  }
});

// Restore business handler
const handleRestoreBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await dbGet('SELECT * FROM businesses WHERE id = ? AND deleted_at IS NOT NULL', [id]);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Soft-deleted business not found in trash' });
    }

    await dbRun(`
      UPDATE businesses SET
        deleted_at = NULL,
        status = 'upcoming',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    await logAudit({
      admin_id: req.admin?.id,
      action: 'RESTORE',
      entity_type: 'business',
      entity_id: id,
      details: { name: business.name, slug: business.slug }
    });

    userSearchService.invalidateCache();
    const restored = await dbGet('SELECT * FROM businesses WHERE id = ?', [id]);
    res.json({ success: true, message: `Business "${business.name}" restored from trash`, data: restored });
  } catch (error) {
    console.error('Error restoring business:', error);
    res.status(500).json({ success: false, message: 'Failed to restore business' });
  }
};

// POST /api/businesses/admin/trash/:id/restore and /api/businesses/:id/restore (Admin only)
router.post('/admin/trash/:id/restore', verifyAdmin, handleRestoreBusiness);
router.post('/:id/restore', verifyAdmin, handleRestoreBusiness);

// Permanent hard-delete handler (Superadmin only)
const handlePermanentDeleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await dbGet('SELECT * FROM businesses WHERE id = ?', [id]);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    await dbRun('DELETE FROM services WHERE business_id = ?', [id]);
    await dbRun('DELETE FROM testimonials WHERE business_id = ?', [id]);
    await dbRun('DELETE FROM gallery_items WHERE business_id = ?', [id]);
    await dbRun('DELETE FROM approval_log WHERE business_id = ?', [id]);
    await dbRun('DELETE FROM businesses WHERE id = ?', [id]);

    await logAudit({
      admin_id: req.admin?.id,
      action: 'HARD_DELETE',
      entity_type: 'business',
      entity_id: id,
      details: { name: business.name, slug: business.slug }
    });

    userSearchService.invalidateCache();
    res.json({ success: true, message: `Business "${business.name}" permanently deleted from database` });
  } catch (error) {
    console.error('Error permanently deleting business:', error);
    res.status(500).json({ success: false, message: 'Failed to permanently delete business' });
  }
};

// DELETE /api/businesses/admin/trash/:id and /api/businesses/:id/permanent (Superadmin only)
router.delete('/admin/trash/:id', verifyAdmin, requireSuperAdmin, handlePermanentDeleteBusiness);
router.delete('/:id/permanent', verifyAdmin, requireSuperAdmin, handlePermanentDeleteBusiness);

module.exports = router;
