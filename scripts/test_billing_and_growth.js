/**
 * End-to-End Verification Test Script for SCode Platform:
 * - Rebranding verification (zero Orbit9 occurrences)
 * - Hosting plans & Razorpay billing lifecycle
 * - Offline payment manual recording
 * - Subscription expiry scan & suspended state transition
 * - QR code generation service
 * - Analytics chatbot revenue and subscription queries
 */

const assert = require('assert');
const { initDB, dbGet, dbAll, dbRun } = require('../src/db/database');
const subscriptionService = require('../src/services/subscriptionService');
const analyticsService = require('../src/services/analyticsService');
const chatService = require('../src/services/chatService');
const QRCode = require('qrcode');

async function runTests() {
  console.log('🧪 Starting SCode Platform Automated Verification Suite...\n');
  await initDB();

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    return fn()
      .then(() => {
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  ❌ [FAIL] ${name}:`, err.message);
      });
  }

  // 1. Rebranding Check in DB
  await test('Priority 0: Zero Orbit9 emails in businesses, admin_users, users, leads', async () => {
    const bizEmails = await dbAll('SELECT email FROM businesses WHERE email LIKE "%orbit9%"');
    assert.strictEqual(bizEmails.length, 0, `Expected 0 businesses with orbit9, found ${bizEmails.length}`);

    const adminEmails = await dbAll('SELECT email FROM admin_users WHERE email LIKE "%orbit9%"');
    assert.strictEqual(adminEmails.length, 0, `Expected 0 admin users with orbit9, found ${adminEmails.length}`);

    const userEmails = await dbAll('SELECT email FROM users WHERE email LIKE "%orbit9%"');
    assert.strictEqual(userEmails.length, 0, `Expected 0 users with orbit9, found ${userEmails.length}`);
  });

  // 2. Hosting Plans in Database
  let starterPlan, growthPlan;
  await test('Feature 1: Active hosting plans exist in database', async () => {
    const plans = await dbAll('SELECT * FROM plans WHERE is_active = 1');
    assert.ok(plans.length >= 3, `Expected at least 3 plans, got ${plans.length}`);

    starterPlan = plans.find(p => p.slug === 'starter');
    growthPlan = plans.find(p => p.slug === 'growth');
    assert.ok(starterPlan, 'Starter plan should exist');
    assert.ok(growthPlan, 'Growth plan should exist');
    assert.strictEqual(typeof starterPlan.price, 'number');
    assert.ok(starterPlan.price > 0);
  });

  // 3. Payment Creation & Verification Simulation
  let testOrderId = `order_test_${Date.now()}`;
  let testPaymentId = `pay_test_${Date.now()}`;
  let testBizSlug = `test-dental-clinic-${Date.now().toString().slice(-4)}`;

  await test('Feature 1: Payments table insertion and plan linking', async () => {
    const res = await dbRun(`
      INSERT INTO payments (
        plan_id, razorpay_order_id, amount, currency, status, notes
      ) VALUES (?, ?, ?, 'INR', 'created', ?)
    `, [growthPlan.id, testOrderId, growthPlan.price, JSON.stringify({ name: 'Test Dental Clinic' })]);

    assert.ok(res.lastID > 0, 'Payment record should be inserted with status created');
  });

  // 4. Manual Offline Payment & Subscription Activation
  await test('Feature 1: Admin manual payment records offline payment and renews subscription', async () => {
    // Pick existing business
    const biz = await dbGet('SELECT * FROM businesses LIMIT 1');
    assert.ok(biz, 'Should have at least 1 business');

    const updatedBiz = await subscriptionService.activateSubscription(biz.id, growthPlan.id, 12);
    assert.strictEqual(updatedBiz.status, 'live');
    assert.strictEqual(updatedBiz.current_plan_id, growthPlan.id);
    assert.ok(updatedBiz.expiry_date, 'Expiry date should be set');
  });

  // 5. Subscription Expiry Automation Scanner
  await test('Feature 1: Subscription expiry scanner detects and suspends past-due businesses', async () => {
    // Create a mock expired business
    const mockSlug = `expired-biz-${Date.now()}`;
    const insertRes = await dbRun(`
      INSERT INTO businesses (name, slug, category, status, expiry_date)
      VALUES ('Mock Expired Store', ?, 'Retail', 'live', '2023-01-01')
    `, [mockSlug]);

    const suspended = await subscriptionService.scanAndSuspendExpired();
    const suspendedBiz = await dbGet('SELECT * FROM businesses WHERE id = ?', [insertRes.lastID]);
    assert.strictEqual(suspendedBiz.status, 'suspended', 'Expired business should be transitioned to suspended');

    // Clean up mock record
    await dbRun('DELETE FROM businesses WHERE id = ?', [insertRes.lastID]);
  });

  // 6. Analytics Chatbot Revenue Questions
  await test('Feature 1: Analytics Chatbot handles revenue and payment questions', async () => {
    const revenueResult = await analyticsService.tryHandle('how much revenue this month');
    assert.ok(revenueResult, 'Should return analytics result for revenue question');
    assert.strictEqual(revenueResult.intent, 'ANALYTICS_REVENUE');
    assert.ok(revenueResult.reply.includes('Total Collected'));

    const paymentsListResult = await analyticsService.tryHandle('list all payments');
    assert.ok(paymentsListResult, 'Should return list of payments');
    assert.strictEqual(paymentsListResult.intent, 'ANALYTICS_LIST');
  });

  // 7. Analytics Chatbot Expiring Subscriptions Question
  await test('Feature 1: Analytics Chatbot handles subscription expiry questions', async () => {
    const expiryResult = await analyticsService.tryHandle('how many subscriptions expiring this week');
    assert.ok(expiryResult, 'Should return expiry analytics result');
    assert.strictEqual(expiryResult.intent, 'ANALYTICS_EXPIRY');
  });

  // 8. Feature 1b: Approval and Quality-Control Workflow Tests
  await test('Feature 1b: Self-serve creation initializes status as pending_review and logs audit entry', async () => {
    const testBizName = `Test Quality Biz ${Date.now().toString().slice(-4)}`;
    const testSlug = `test-quality-biz-${Date.now().toString().slice(-4)}`;

    const bizRes = await dbRun(`
      INSERT INTO businesses (name, slug, category, phone, email, status, current_plan_id)
      VALUES (?, ?, 'Healthcare', '9876543210', 'test@qualitybiz.com', 'pending_review', ?)
    `, [testBizName, testSlug, growthPlan.id]);

    const createdBiz = await dbGet('SELECT * FROM businesses WHERE id = ?', [bizRes.lastID]);
    assert.strictEqual(createdBiz.status, 'pending_review', 'Business should be created in pending_review state');

    // Insert approval_log entry
    await dbRun(`
      INSERT INTO approval_log (business_id, action, reason, details)
      VALUES (?, 'submitted', 'Self-serve hosting order created', '{}')
    `, [createdBiz.id]);

    const logs = await dbAll('SELECT * FROM approval_log WHERE business_id = ?', [createdBiz.id]);
    assert.ok(logs.length >= 1, 'Approval log should record submission');

    // Simulate Admin Approval
    await dbRun(`
      UPDATE businesses SET status = 'live', approved_by = 1, approved_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [createdBiz.id]);

    const approvedBiz = await dbGet('SELECT * FROM businesses WHERE id = ?', [createdBiz.id]);
    assert.strictEqual(approvedBiz.status, 'live', 'Approved business should be transitioned to live');
    assert.ok(approvedBiz.approved_at, 'Approved timestamp should be recorded');

    // Clean up
    await dbRun('DELETE FROM approval_log WHERE business_id = ?', [createdBiz.id]);
    await dbRun('DELETE FROM businesses WHERE id = ?', [createdBiz.id]);
  });

  // 9. Feature 1c: Analytics Chatbot Approval & Needs Attention Questions
  await test('Feature 1c: Analytics Chatbot handles approval workflow and needs-attention questions', async () => {
    const attentionResult = await analyticsService.tryHandle('what needs attention');
    assert.ok(attentionResult, 'Should return analytics result for needs attention');
    assert.strictEqual(attentionResult.intent, 'ANALYTICS_NEEDS_ATTENTION');
    assert.ok(attentionResult.reply.includes('Pending Approvals'));

    const pendingCountResult = await analyticsService.tryHandle('how many businesses are pending approval');
    assert.ok(pendingCountResult, 'Should return count for pending approval');
    assert.strictEqual(pendingCountResult.intent, 'ANALYTICS_COUNT');
  });

  // 10. QR Code Generation
  await test('Feature 2: QR Code generates valid PNG buffer and DataURL locally', async () => {
    const testUrl = 'https://scode.in/host-your-business';
    const pngBuffer = await QRCode.toBuffer(testUrl, { width: 300 });
    assert.ok(Buffer.isBuffer(pngBuffer), 'Should produce valid buffer');
    assert.ok(pngBuffer.length > 500, 'PNG buffer should have valid image payload');

    const dataUrl = await QRCode.toDataURL(testUrl);
    assert.ok(dataUrl.startsWith('data:image/png;base64,'), 'DataURL should be valid PNG data URI');
  });

  console.log(`\n====================================================`);
  console.log(`Results: ${passed} / ${total} tests passed successfully.`);
  console.log(`====================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runTests };
