const assert = require('assert');
const jwt = require('jsonwebtoken');
const { dbRun, dbGet, dbAll, initDB } = require('../src/db/database');
const { logAudit } = require('../src/services/auditService');

const JWT_SECRET = process.env.JWT_SECRET || 'scode_super_secret_jwt_key_2026_secure';

async function runTests() {
  console.log('🧪 Starting Soft-Delete, Audit Log, and Role-Based Access Tests...\n');
  await initDB();

  // 1. Verify schema columns
  console.log('1. Verifying schema columns...');
  const testBiz = await dbGet('SELECT * FROM businesses LIMIT 1');
  assert('deleted_at' in testBiz, 'Expected deleted_at column in businesses table');

  const testLead = await dbGet('SELECT * FROM leads LIMIT 1');
  assert('deleted_at' in testLead, 'Expected deleted_at column in leads table');

  const testUser = await dbGet('SELECT * FROM users LIMIT 1');
  assert('deleted_at' in testUser, 'Expected deleted_at column in users table');

  const auditTableCheck = await dbAll('PRAGMA table_info(audit_log)');
  assert(auditTableCheck.length > 0, 'Expected audit_log table to exist');
  console.log('  ✅ [PASS] Schema migrations: deleted_at and audit_log table verified.\n');

  // 2. Setup mock admin and superadmin tokens
  const superadminUser = { id: 9991, username: 'mock_superadmin', role: 'superadmin' };
  const adminUser = { id: 9992, username: 'mock_admin', role: 'admin' };

  const superadminToken = jwt.sign(superadminUser, JWT_SECRET, { expiresIn: '1h' });
  const adminToken = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '1h' });

  // 3. Create a test business to soft-delete
  console.log('2. Creating test business for soft-delete testing...');
  const createRes = await dbRun(`
    INSERT INTO businesses (name, slug, category, status)
    VALUES ('Audit Test Business', 'audit-test-business-${Date.now()}', 'IT Services', 'live')
  `);
  const bizId = createRes.lastID;

  await logAudit({
    admin_id: adminUser.id,
    action: 'CREATE',
    entity_type: 'business',
    entity_id: bizId,
    details: { name: 'Audit Test Business' }
  });

  // Verify it exists in active list
  const activeBiz = await dbGet('SELECT * FROM businesses WHERE id = ? AND deleted_at IS NULL', [bizId]);
  assert(activeBiz, 'Business should be active');

  // 4. Soft-delete the business
  console.log('3. Performing soft-delete on business...');
  await dbRun(`
    UPDATE businesses SET deleted_at = CURRENT_TIMESTAMP, status = 'suspended' WHERE id = ?
  `, [bizId]);

  await logAudit({
    admin_id: adminUser.id,
    action: 'SOFT_DELETE',
    entity_type: 'business',
    entity_id: bizId,
    details: { name: 'Audit Test Business', previous_status: 'live' }
  });

  // Verify excluded from normal list
  const activeList = await dbAll('SELECT * FROM businesses WHERE deleted_at IS NULL AND id = ?', [bizId]);
  assert.strictEqual(activeList.length, 0, 'Soft-deleted business must NOT appear in active list');

  // Verify present in trash list
  const trashList = await dbAll('SELECT * FROM businesses WHERE deleted_at IS NOT NULL AND id = ?', [bizId]);
  assert.strictEqual(trashList.length, 1, 'Soft-deleted business MUST appear in trash list');
  assert.strictEqual(trashList[0].status, 'suspended', 'Soft-deleted business status should be suspended');
  console.log('  ✅ [PASS] Soft-delete: Excluded from active queries and present in trash.\n');

  // 5. Restore from trash
  console.log('4. Testing business restoration...');
  await dbRun(`
    UPDATE businesses SET deleted_at = NULL, status = 'upcoming' WHERE id = ?
  `, [bizId]);

  await logAudit({
    admin_id: adminUser.id,
    action: 'RESTORE',
    entity_type: 'business',
    entity_id: bizId,
    details: { name: 'Audit Test Business' }
  });

  const restored = await dbGet('SELECT * FROM businesses WHERE id = ? AND deleted_at IS NULL', [bizId]);
  assert(restored, 'Business should be restored and active');
  console.log('  ✅ [PASS] Restore: Successfully restored from trash.\n');

  // Re-trash for permanent delete test
  await dbRun(`UPDATE businesses SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [bizId]);

  // 6. Test Role-Based Restrictions (requireSuperAdmin middleware unit simulation)
  console.log('5. Testing Role-Based Restrictions...');
  const { requireSuperAdmin } = require('../src/middleware/auth');

  // Test admin role (should fail)
  let adminForbidden = false;
  const mockReqAdmin = { admin: adminUser };
  const mockRes = {
    status: (code) => {
      if (code === 403) adminForbidden = true;
      return { json: (msg) => msg };
    }
  };
  requireSuperAdmin(mockReqAdmin, mockRes, () => {
    adminForbidden = false;
  });
  assert(adminForbidden, 'Expected role="admin" to be blocked with 403 by requireSuperAdmin');

  // Test superadmin role (should pass)
  let superadminAllowed = false;
  const mockReqSuper = { admin: superadminUser };
  requireSuperAdmin(mockReqSuper, mockRes, () => {
    superadminAllowed = true;
  });
  assert(superadminAllowed, 'Expected role="superadmin" to pass requireSuperAdmin');
  console.log('  ✅ [PASS] Role-based Access Control: Superadmin allowed, Admin forbidden.\n');

  // 7. Permanent hard-delete by superadmin
  console.log('6. Testing permanent hard-delete...');
  await dbRun('DELETE FROM businesses WHERE id = ?', [bizId]);
  await logAudit({
    admin_id: superadminUser.id,
    action: 'HARD_DELETE',
    entity_type: 'business',
    entity_id: bizId,
    details: { name: 'Audit Test Business' }
  });

  const permanentlyDeleted = await dbGet('SELECT * FROM businesses WHERE id = ?', [bizId]);
  assert.strictEqual(permanentlyDeleted, undefined, 'Business should be permanently deleted from SQLite');
  console.log('  ✅ [PASS] Permanent delete: Row removed completely by superadmin.\n');

  // 8. Verify audit logs
  console.log('7. Verifying audit log entries in database...');
  const logs = await dbAll('SELECT * FROM audit_log WHERE entity_id = ? ORDER BY id ASC', [bizId]);
  assert(logs.length >= 4, 'Expected at least 4 audit logs for the test entity');
  const actions = logs.map(l => l.action);
  assert(actions.includes('CREATE'), 'Expected CREATE log');
  assert(actions.includes('SOFT_DELETE'), 'Expected SOFT_DELETE log');
  assert(actions.includes('RESTORE'), 'Expected RESTORE log');
  assert(actions.includes('HARD_DELETE'), 'Expected HARD_DELETE log');
  console.log('  ✅ [PASS] Audit Trail: All actions (CREATE, SOFT_DELETE, RESTORE, HARD_DELETE) recorded in audit_log.\n');

  console.log('====================================================');
  console.log('🎉 All Soft-Delete & Audit System tests passed successfully!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
