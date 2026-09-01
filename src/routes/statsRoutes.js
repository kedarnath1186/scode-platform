const express = require('express');
const router = express.Router();
const { dbGet, dbAll } = require('../db/database');
const { verifyAdmin } = require('../middleware/auth');

// GET /api/stats/dashboard (Admin only)
router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    const totalBusinesses = (await dbGet('SELECT COUNT(*) as count FROM businesses')).count;
    const liveBusinesses = (await dbGet("SELECT COUNT(*) as count FROM businesses WHERE status = 'live'")).count;
    const upcomingBusinesses = (await dbGet("SELECT COUNT(*) as count FROM businesses WHERE status = 'upcoming'")).count;
    const totalLeads = (await dbGet('SELECT COUNT(*) as count FROM leads')).count;
    const newLeads = (await dbGet("SELECT COUNT(*) as count FROM leads WHERE status = 'new'")).count;
    const totalServices = (await dbGet('SELECT COUNT(*) as count FROM services')).count;

    const recentLeads = await dbAll(`
      SELECT l.*, b.name as business_name, b.slug as business_slug
      FROM leads l
      LEFT JOIN businesses b ON l.business_id = b.id
      ORDER BY l.created_at DESC
      LIMIT 6
    `);

    const businessesByCategory = await dbAll(`
      SELECT category, COUNT(*) as count
      FROM businesses
      GROUP BY category
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        totalBusinesses,
        liveBusinesses,
        upcomingBusinesses,
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
    const totalBusinesses = (await dbGet("SELECT COUNT(*) as count FROM businesses WHERE status = 'live'")).count;
    const allCount = (await dbGet('SELECT COUNT(*) as count FROM businesses')).count;

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

module.exports = router;
