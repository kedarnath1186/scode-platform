const { dbRun } = require('../db/database');

/**
 * Log an administrative action to the audit_log table.
 * 
 * @param {Object} params
 * @param {number|null} params.admin_id - The admin ID who performed the action
 * @param {string} params.action - e.g. 'CREATE', 'UPDATE', 'SOFT_DELETE', 'RESTORE', 'HARD_DELETE', 'MANUAL_PAYMENT'
 * @param {string} params.entity_type - e.g. 'business', 'lead', 'payment', 'setting', 'user'
 * @param {number|null} params.entity_id - ID of the entity affected
 * @param {Object|string|null} params.details - JSON serializable object or string of change details
 */
const logAudit = async ({ admin_id, action, entity_type, entity_id, details }) => {
  try {
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : (details || null);
    await dbRun(`
      INSERT INTO audit_log (admin_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [admin_id || null, action, entity_type, entity_id || null, detailsStr]);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};

module.exports = {
  logAudit
};
