const express = require('express');
const router = express.Router();
const { dbGet, dbAll } = require('../db/database');
const { verifyAdmin } = require('../middleware/auth');

// GET /api/stats/dashboard (Admin only)
router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    const totalBusinesses = (await dbGet('SELECT COUNT(*) as count FROM businesses WHERE deleted_at IS NULL')).count;
    const liveBusinesses = (await dbGet("SELECT COUNT(*) as count FROM businesses WHERE status = 'live' AND deleted_at IS NULL")).count;
    const upcomingBusinesses = (await dbGet("SELECT COUNT(*) as count FROM businesses WHERE status = 'upcoming' AND deleted_at IS NULL")).count;
    const trashBusinesses = (await dbGet("SELECT COUNT(*) as count FROM businesses WHERE deleted_at IS NOT NULL")).count;
    const totalLeads = (await dbGet('SELECT COUNT(*) as count FROM leads WHERE deleted_at IS NULL')).count;
    const newLeads = (await dbGet("SELECT COUNT(*) as count FROM leads WHERE status = 'new' AND deleted_at IS NULL")).count;
    const totalServices = (await dbGet('SELECT COUNT(*) as count FROM services')).count;

    const recentLeads = await dbAll(`
      SELECT l.*, b.name as business_name, b.slug as business_slug
      FROM leads l
      LEFT JOIN businesses b ON l.business_id = b.id
      WHERE l.deleted_at IS NULL
      ORDER BY l.created_at DESC
      LIMIT 6
    `);

    const businessesByCategory = await dbAll(`
      SELECT category, COUNT(*) as count
      FROM businesses
      WHERE deleted_at IS NULL
      GROUP BY category
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        totalBusinesses,
        liveBusinesses,
        upcomingBusinesses,
        trashBusinesses,
        totalLeads,
        newLeads,
        totalServices,
        recentLeads,
        businessesByCategory
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/stats/public (Public overview metrics for homepage counters)
router.get('/public', async (req, res) => {
  try {
    const totalBusinesses = (await dbGet("SELECT COUNT(*) as count FROM businesses WHERE status = 'live' AND deleted_at IS NULL")).count;
    const allCount = (await dbGet('SELECT COUNT(*) as count FROM businesses WHERE deleted_at IS NULL')).count;

    res.json({
      success: true,
      data: {
        liveCount: totalBusinesses,
        totalCount: allCount,
        domainHassle: '₹0',
        setupTime: '24hr'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch public stats' });
  }
});

// GET /api/stats/audit-logs (Admin only)
router.get('/audit-logs', verifyAdmin, async (req, res) => {
  try {
    const logs = await dbAll(`
      SELECT a.*, u.username as admin_username, u.role as admin_role
      FROM audit_log a
      LEFT JOIN admin_users u ON a.admin_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
