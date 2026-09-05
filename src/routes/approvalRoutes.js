const express = require('express');
const router = express.Router();
const { dbRun, dbGet, dbAll } = require('../db/database');
const { verifyAdmin } = require('../middleware/auth');
const userSearchService = require('../services/userSearchService');
const subscriptionService = require('../services/subscriptionService');
const { logAudit } = require('../services/auditService');

/**
 * Helper: Compute completeness checklist for a business submission
 */
const computeCompletenessChecklist = (biz, servicesCount, galleryCount) => {
  const items = [
    {
      key: 'name',
      label: 'Business Name',
      passed: Boolean(biz.name && biz.name.trim().length >= 3)
    },
    {
      key: 'description',
      label: 'Description / About (min 20 chars)',
      passed: Boolean((biz.description && biz.description.trim().length >= 20) || (biz.about_text && biz.about_text.trim().length >= 20))
    },
    {
      key: 'valid_phone',
      label: 'Valid Phone Number',
      passed: Boolean(biz.phone && /^[0-9+ -]{10,15}$/.test(biz.phone.trim()))
    },
    {
      key: 'valid_email',
      label: 'Valid Email Address',
      passed: Boolean(biz.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(biz.email.trim()))
    },
    {
      key: 'address',
      label: 'Address / Location',
      passed: Boolean((biz.address && biz.address.trim().length >= 5) || (biz.city && biz.city.trim().length >= 2))
    },
    {
      key: 'services',
      label: 'Services Listed in Catalog',
      passed: servicesCount > 0
    },
    {
      key: 'gallery',
      label: 'Gallery Images',
      passed: galleryCount > 0
    }
  ];

  const passedCount = items.filter(i => i.passed).length;
  const score = Math.round((passedCount / items.length) * 100);
  const missing = items.filter(i => !i.passed).map(i => i.label);

  return { items, passedCount, totalCount: items.length, score, missing };
};

/**
 * 1. GET /api/approvals/pending - List all businesses in pending review or rejected state
 */
router.get('/pending', verifyAdmin, async (req, res) => {
  try {
    const { status = 'pending_review' } = req.query;
    let sql = `
      SELECT b.*, p.name as plan_name, p.price as plan_price, p.duration_months as plan_duration
      FROM businesses b
      LEFT JOIN plans p ON b.current_plan_id = p.id
      WHERE (b.deleted_at IS NULL)
    `;
    const params = [];

    if (status !== 'all') {
      sql += ' AND b.status = ?';
      params.push(status);
    } else {
      sql += ' AND b.status IN ("pending_review", "rejected")';
    }

    sql += ' ORDER BY b.created_at ASC';

    const rawBusinesses = await dbAll(sql, params);
    const enrichedList = [];

    for (const b of rawBusinesses) {
      // 1. Fetch counts
      const services = await dbAll('SELECT id, title FROM services WHERE business_id = ?', [b.id]);
      const galleryItems = await dbAll('SELECT id FROM gallery_items WHERE business_id = ?', [b.id]);

      // 2. Fetch linked payment record
      const payment = await dbGet(`
        SELECT p.*, pl.name as plan_name 
        FROM payments p 
        LEFT JOIN plans pl ON p.plan_id = pl.id 
        WHERE p.business_id = ? OR (p.status = 'paid' AND p.notes LIKE '%' || ? || '%')
        ORDER BY p.id DESC LIMIT 1
      `, [b.id, b.slug]);

      // 3. Completeness checklist
      const checklist = computeCompletenessChecklist(b, services.length, galleryItems.length);

      // 4. Duplicate checks (Phone, Email, GST)
      const duplicateMatches = [];
      if (b.phone || b.email || b.gst_number) {
        const potentialDups = await dbAll(`
          SELECT id, name, slug, phone, email, gst_number 
          FROM businesses 
          WHERE id != ? AND (
            (? != '' AND phone = ?) OR 
            (? != '' AND email = ?) OR 
            (? != '' AND gst_number IS NOT NULL AND gst_number != '' AND gst_number = ?)
          )
        `, [
          b.id,
          b.phone || '', b.phone || '',
          b.email || '', b.email || '',
          b.gst_number || '', b.gst_number || ''
        ]);

        for (const dup of potentialDups) {
          const matchedFields = [];
          if (b.phone && dup.phone === b.phone) matchedFields.push(`Phone (${b.phone})`);
          if (b.email && dup.email === b.email) matchedFields.push(`Email (${b.email})`);
          if (b.gst_number && dup.gst_number === b.gst_number) matchedFields.push(`GST (${b.gst_number})`);

          duplicateMatches.push({
            business_id: dup.id,
            business_name: dup.name,
            business_slug: dup.slug,
            matched_fields: matchedFields
          });
        }
      }

      // 5. Calculate pending duration
      const createdAtMs = new Date(b.created_at).getTime();
      const nowMs = Date.now();
      const pendingHours = Math.max(0, Math.floor((nowMs - createdAtMs) / (1000 * 60 * 60)));
      const isOver24h = pendingHours >= 24;

      enrichedList.push({
        ...b,
        services,
        gallery_count: galleryItems.length,
        payment,
        checklist,
        duplicates: duplicateMatches,
        has_duplicates: duplicateMatches.length > 0,
        pending_hours: pendingHours,
        is_over_24h: isOver24h
      });
    }

    res.json({
      success: true,
      count: enrichedList.length,
      over_24h_count: enrichedList.filter(b => b.is_over_24h).length,
      data: enrichedList
    });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending approvals' });
  }
});

/**
 * 2. POST /api/approvals/:id/action - Execute approval decision (approve, reject, request_changes, direct_edit)
 */
router.post('/:id/action', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason = '', change_notes = '', updated_fields = {} } = req.body;
    const adminId = req.user?.id || 1;

    const business = await dbGet('SELECT * FROM businesses WHERE id = ?', [id]);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    if (action === 'approve') {
      await dbRun(`
        UPDATE businesses SET
          status = 'live',
          approved_by = ?,
          approved_at = CURRENT_TIMESTAMP,
          rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [adminId, id]);

      await dbRun(`
        INSERT INTO approval_log (business_id, admin_id, action, reason, details)
        VALUES (?, ?, 'approve', 'Business approved and published to live status', ?)
      `, [id, adminId, JSON.stringify({ previous_status: business.status })]);

      await logAudit({
        admin_id: adminId,
        action: 'APPROVE',
        entity_type: 'business',
        entity_id: id,
        details: { name: business.name, slug: business.slug, previous_status: business.status }
      });

      userSearchService.invalidateCache();

      return res.json({
        success: true,
        message: `🎉 "${business.name}" has been approved and is now LIVE!`,
        data: { status: 'live' }
      });
    }

    if (action === 'reject') {
      if (!reason || !reason.trim()) {
        return res.status(400).json({ success: false, message: 'Rejection reason is required' });
      }

      await dbRun(`
        UPDATE businesses SET
          status = 'rejected',
          rejection_reason = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [reason.trim(), id]);

      await dbRun(`
        INSERT INTO approval_log (business_id, admin_id, action, reason, details)
        VALUES (?, ?, 'reject', ?, ?)
      `, [id, adminId, reason.trim(), JSON.stringify({ previous_status: business.status })]);

      await logAudit({
        admin_id: adminId,
        action: 'REJECT',
        entity_type: 'business',
        entity_id: id,
        details: { name: business.name, reason: reason.trim() }
      });

      userSearchService.invalidateCache();

      return res.json({
        success: true,
        message: `Submission for "${business.name}" marked as rejected.`,
        data: { status: 'rejected', reason: reason.trim() }
      });
    }

    if (action === 'request_changes') {
      const notes = change_notes || reason;
      if (!notes || !notes.trim()) {
        return res.status(400).json({ success: false, message: 'Please specify the changes required' });
      }

      await dbRun(`
        UPDATE businesses SET
          status = 'pending_review',
          change_request_notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [notes.trim(), id]);

      await dbRun(`
        INSERT INTO approval_log (business_id, admin_id, action, reason, details)
        VALUES (?, ?, 'request_changes', ?, ?)
      `, [id, adminId, notes.trim(), JSON.stringify({ previous_status: business.status })]);

      await logAudit({
        admin_id: adminId,
        action: 'REQUEST_CHANGES',
        entity_type: 'business',
        entity_id: id,
        details: { name: business.name, notes: notes.trim() }
      });

      return res.json({
        success: true,
        message: `Change request logged for "${business.name}".`,
        data: { status: 'pending_review', change_notes: notes.trim() }
      });
    }

    if (action === 'direct_edit') {
      const { name, category, tagline, description, phone, email, address, city } = updated_fields;
      await dbRun(`
        UPDATE businesses SET
          name = COALESCE(?, name),
          category = COALESCE(?, category),
          tagline = COALESCE(?, tagline),
          description = COALESCE(?, description),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        name || null,
        category || null,
        tagline || null,
        description || null,
        phone || null,
        email || null,
        address || null,
        city || null,
        id
      ]);

      await dbRun(`
        INSERT INTO approval_log (business_id, admin_id, action, reason, details)
        VALUES (?, ?, 'direct_edit', 'Admin performed inline corrections', ?)
      `, [id, adminId, JSON.stringify(updated_fields)]);

      await logAudit({
        admin_id: adminId,
        action: 'DIRECT_EDIT',
        entity_type: 'business',
        entity_id: id,
        details: { updated_fields }
      });

      userSearchService.invalidateCache();

      const updated = await dbGet('SELECT * FROM businesses WHERE id = ?', [id]);
      return res.json({
        success: true,
        message: `Business details updated successfully.`,
        data: updated
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid action requested' });
  } catch (error) {
    console.error('Error executing approval action:', error);
    res.status(500).json({ success: false, message: 'Failed to process approval action' });
  }
});

/**
 * 3. GET /api/approvals/:id/history - Audit log history for a submission
 */
router.get('/:id/history', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await dbAll(`
      SELECT al.*, au.username as admin_username 
      FROM approval_log al
      LEFT JOIN admin_users au ON al.admin_id = au.id
      WHERE al.business_id = ?
      ORDER BY al.created_at DESC
    `, [id]);

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    console.error('Error fetching approval history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

/**
 * 4. GET /api/approvals/needs-attention - Single combined "Needs Attention" panel data
 */
router.get('/needs-attention', verifyAdmin, async (req, res) => {
  try {
    // 1. Pending approvals
    const pendingList = await dbAll(`
      SELECT b.id, b.name, b.slug, b.category, b.created_at, b.phone, b.email, p.name as plan_name
      FROM businesses b
      LEFT JOIN plans p ON b.current_plan_id = p.id
      WHERE b.status = 'pending_review'
      ORDER BY b.created_at ASC
    `);

    const pendingWithAge = pendingList.map(b => {
      const pendingHours = Math.max(0, Math.floor((Date.now() - new Date(b.created_at).getTime()) / (1000 * 60 * 60)));
      return {
        ...b,
        pending_hours: pendingHours,
        is_over_24h: pendingHours >= 24
      };
    });

    // 2. Expiring in 7 days & 30 days
    const expiring7Days = await subscriptionService.getExpiringInDays(7);
    const expiring30Days = await subscriptionService.getExpiringInDays(30);

    // 3. Failed payments
    const failedPayments = await dbAll(`
      SELECT p.*, b.name as business_name 
      FROM payments p 
      LEFT JOIN businesses b ON p.business_id = b.id
      WHERE p.status = 'failed'
      ORDER BY p.created_at DESC 
      LIMIT 10
    `);

    const totalAttentionCount = pendingWithAge.length + expiring7Days.length + failedPayments.length;

    res.json({
      success: true,
      data: {
        totalAttentionCount,
        pendingApprovals: {
          count: pendingWithAge.length,
          over24hCount: pendingWithAge.filter(p => p.is_over_24h).length,
          items: pendingWithAge
        },
        expiringSoon: {
          count7Days: expiring7Days.length,
          count30Days: expiring30Days.length,
          items7Days: expiring7Days,
          items30Days: expiring30Days
        },
        failedPayments: {
          count: failedPayments.length,
          items: failedPayments
        }
      }
    });
  } catch (error) {
    console.error('Error fetching needs-attention summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attention items' });
  }
});

module.exports = router;
