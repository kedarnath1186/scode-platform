const express = require('express');
const router = express.Router();
const { dbRun, dbGet, dbAll } = require('../db/database');
const { verifyAdmin } = require('../middleware/auth');
const userSearchService = require('../services/userSearchService');

// Utility to generate a URL-friendly slug
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// GET /api/businesses - List businesses
router.get('/', async (req, res) => {
  try {
    const { status, category, search, featured } = req.query;
    let sql = 'SELECT * FROM businesses WHERE 1=1';
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

    // Fetch related services, testimonials, gallery
    const services = await dbAll('SELECT * FROM services WHERE business_id = ? ORDER BY display_order ASC', [business.id]);
    const testimonials = await dbAll('SELECT * FROM testimonials WHERE business_id = ? ORDER BY id DESC', [business.id]);
    const gallery = await dbAll('SELECT * FROM gallery_items WHERE business_id = ? ORDER BY id DESC', [business.id]);

    res.json({
      success: true,
      data: {
        ...business,
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
    userSearchService.invalidateCache();
    res.json({ success: true, message: 'Business updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({ success: false, message: 'Failed to update business' });
  }
});

// DELETE /api/businesses/:id - Delete business (Admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM services WHERE business_id = ?', [id]);
    await dbRun('DELETE FROM testimonials WHERE business_id = ?', [id]);
    await dbRun('DELETE FROM gallery_items WHERE business_id = ?', [id]);
    await dbRun('DELETE FROM businesses WHERE id = ?', [id]);

    userSearchService.invalidateCache();
    res.json({ success: true, message: 'Business deleted successfully' });
  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({ success: false, message: 'Failed to delete business' });
  }
});

module.exports = router;
