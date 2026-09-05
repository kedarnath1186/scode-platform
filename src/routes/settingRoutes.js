const express = require('express');
const router = express.Router();
const { dbRun, dbAll } = require('../db/database');
const { verifyAdmin } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// GET /api/settings - Get all platform settings (Public)
router.get('/', async (req, res) => {
  try {
    const rows = await dbAll('SELECT key, value FROM platform_settings');
    const settings = {};
    rows.forEach(r => {
      settings[r.key] = r.value;
    });
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// PUT /api/settings - Update settings (Admin only)
router.put('/', verifyAdmin, async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await dbRun(
        'INSERT OR REPLACE INTO platform_settings (key, value) VALUES (?, ?)',
        [key, String(value)]
      );
    }

    await logAudit({
      admin_id: req.admin?.id,
      action: 'UPDATE',
      entity_type: 'setting',
      entity_id: null,
      details: { updated_keys: Object.keys(settings) }
    });

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

module.exports = router;
