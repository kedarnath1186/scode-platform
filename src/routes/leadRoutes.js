const express = require('express');
const router = express.Router();
const { dbRun, dbGet, dbAll } = require('../db/database');
const { verifyAdmin } = require('../middleware/auth');
const userSearchService = require('../services/userSearchService');
const { logAudit } = require('../services/auditService');

// POST /api/leads - Submit a lead/inquiry (Public)
router.post('/', async (req, res) => {
  try {
    const { business_id, name, email, phone, message, service_requested } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and Phone number are required' });
    }

    const result = await dbRun(`
      INSERT INTO leads (business_id, name, email, phone, message, service_requested, status)
      VALUES (?, ?, ?, ?, ?, ?, 'new')
    `, [business_id || null, name, email || '', phone, message || '', service_requested || 'General Inquiry']);

    const newLead = await dbGet('SELECT * FROM leads WHERE id = ?', [result.lastID]);

    userSearchService.invalidateCache();
    res.status(201).json({
      success: true,
      message: 'Thank you! Your inquiry has been received. We will contact you shortly.',
      data: newLead
    });
  } catch (error) {
    console.error('Error submitting lead:', error);
    res.status(500).json({ success: false, message: 'Failed to submit inquiry' });
  }
});

// GET /api/leads - Get all leads (Admin only, excludes soft-deleted)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { business_id, status } = req.query;
    let sql = `
      SELECT 
        l.*,
        b.name AS business_name,
        b.slug AS business_slug,
        b.category AS business_category
      FROM leads l
      LEFT JOIN businesses b ON l.business_id = b.id
      WHERE (l.deleted_at IS NULL)
    `;
    const params = [];

    if (business_id && business_id !== 'all') {
      if (business_id === 'platform') {
        sql += ' AND l.business_id IS NULL';
      } else {
        sql += ' AND l.business_id = ?';
        params.push(business_id);
      }
    }

    if (status && status !== 'all') {
      sql += ' AND l.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY l.created_at DESC';

    const leads = await dbAll(sql, params);
    res.json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leads' });
  }
});

// PATCH /api/leads/:id - Update lead status (Admin only)
router.patch('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'contacted', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    await dbRun('UPDATE leads SET status = ? WHERE id = ?', [status, id]);
    const updated = await dbGet('SELECT * FROM leads WHERE id = ?', [id]);

    await logAudit({
      admin_id: req.admin?.id,
      action: 'UPDATE',
      entity_type: 'lead',
      entity_id: id,
      details: { name: updated.name, new_status: status }
    });

    userSearchService.invalidateCache();
    res.json({ success: true, message: 'Lead status updated', data: updated });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({ success: false, message: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id - Soft-delete a lead (Admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await dbGet('SELECT * FROM leads WHERE id = ?', [id]);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    await dbRun('UPDATE leads SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

    await logAudit({
      admin_id: req.admin?.id,
      action: 'SOFT_DELETE',
      entity_type: 'lead',
      entity_id: id,
      details: { name: lead.name, email: lead.email, phone: lead.phone }
    });

    userSearchService.invalidateCache();
    res.json({ success: true, message: 'Lead moved to trash (soft-deleted)' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ success: false, message: 'Failed to delete lead' });
  }
});

module.exports = router;
