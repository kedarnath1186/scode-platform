const assert = require('assert');
const express = require('express');
const jwt = require('jsonwebtoken');
const { initDB, dbRun, dbGet, dbAll } = require('../src/db/database');
const billingRoutes = require('../src/routes/billingRoutes');
const { JWT_SECRET } = require('../src/middleware/auth');

async function runTests() {
  console.log('🧪 Starting Billing Growth Metrics Test Suite...\n');
  await initDB();

  // 1. Setup mock Express app
  const app = express();
  app.use(express.json());
  app.use('/api/billing', billingRoutes);

  // Helper for internal requests
  const adminToken = jwt.sign({ id: 8888, username: 'growth_admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

  // 2. Fetch plans for testing
  const plans = await dbAll('SELECT * FROM plans WHERE is_active = 1');
  assert.ok(plans.length >= 1, 'At least 1 active plan must exist');
  const testPlan = plans[0]; // e.g. price 299900 paise (₹2999), 12 months -> ~₹249.91/mo

  // 3. Setup test data for MRR, Churn, Lead Conversion, Overdue
  console.log('1. Setting up controlled test scenario...');
  
  // Clean up any previous test records
  await dbRun('DELETE FROM businesses WHERE slug LIKE "growth-test-%"');
  await dbRun('DELETE FROM leads WHERE email LIKE "%@growthtest.com"');

  // Business 1: Active Live (for MRR)
  const biz1 = await dbRun(`
    INSERT INTO businesses (name, slug, category, status, current_plan_id, expiry_date)
    VALUES ('Growth MRR Biz 1', 'growth-test-mrr-1', 'IT', 'live', ?, date('now', '+60 days'))
  `, [testPlan.id]);

  // Business 2: Expired 10 days ago, no renewal (Churned)
  const biz2 = await dbRun(`
    INSERT INTO businesses (name, slug, category, status, current_plan_id, expiry_date)
    VALUES ('Growth Churned Biz 2', 'growth-test-churn-2', 'Retail', 'suspended', ?, date('now', '-10 days'))
  `, [testPlan.id]);

  // Business 3: Expired 15 days ago, renewed 5 days ago (Renewed)
  const biz3 = await dbRun(`
    INSERT INTO businesses (name, slug, category, status, current_plan_id, expiry_date)
    VALUES ('Growth Renewed Biz 3', 'growth-test-renew-3', 'Healthcare', 'live', ?, date('now', '+350 days'))
  `, [testPlan.id]);
  // Add payment for biz3 with paid_at 5 days ago (which is > expiry_date window for previous period)
  await dbRun(`
    INSERT INTO payments (business_id, plan_id, amount, currency, status, payment_method, razorpay_order_id, razorpay_payment_id, paid_at, created_at)
    VALUES (?, ?, ?, 'INR', 'paid', 'razorpay', 'order_growth_renew', 'pay_growth_renew', datetime('now', '-5 days'), datetime('now', '-5 days'))
  `, [biz3.lastID, testPlan.id, testPlan.price]);

  // Business 4: Overdue Business (status = 'live' but expiry_date = 5 days ago)
  const biz4 = await dbRun(`
    INSERT INTO businesses (name, slug, category, status, current_plan_id, expiry_date)
    VALUES ('Growth Overdue Biz 4', 'growth-test-overdue-4', 'Services', 'live', ?, date('now', '-5 days'))
  `, [testPlan.id]);

  // Leads in last 30 days
  await dbRun(`
    INSERT INTO leads (business_id, name, email, phone, message, status, created_at)
    VALUES (?, 'Growth Lead 1', 'lead1@growthtest.com', '9876543210', 'Interested', 'new', datetime('now', '-3 days'))
  `, [biz1.lastID]);
  await dbRun(`
    INSERT INTO leads (business_id, name, email, phone, message, status, created_at)
    VALUES (?, 'Growth Lead 2', 'lead2@growthtest.com', '9876543211', 'Interested', 'new', datetime('now', '-2 days'))
  `, [biz1.lastID]);

  // Start temporary server to test GET /api/billing/admin/overview
  const server = app.listen(0);
  const port = server.address().port;

  try {
    console.log('2. Requesting GET /api/billing/admin/overview...');
    const response = await fetch(`http://127.0.0.1:${port}/api/billing/admin/overview`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const json = await response.json();
    assert.strictEqual(json.success, true, 'Overview request should be successful');
    assert.ok(json.data, 'Data object should exist in response');
    assert.ok(json.data.growth, 'Growth object must exist in data');

    const { growth } = json.data;

    // Verify 1: MRR
    console.log('3. Validating MRR metrics...');
    assert.ok(growth.mrr, 'MRR section must exist in growth object');
    assert.ok(typeof growth.mrr.mrrPaise === 'number', 'mrrPaise must be a number');
    assert.ok(typeof growth.mrr.mrrRupees === 'number', 'mrrRupees must be a number');
    assert.ok(growth.mrr.mrrRupees > 0, 'mrrRupees must be greater than 0');
    assert.ok(growth.mrr.activePaidBusinesses >= 1, 'At least 1 active paid business must be counted');
    console.log(`  ✅ [PASS] MRR: ₹${growth.mrr.mrrRupees} (${growth.mrr.activePaidBusinesses} active paid subscriptions)`);

    // Verify 2: Churn
    console.log('4. Validating Churn metrics...');
    assert.ok(growth.churn, 'Churn section must exist in growth object');
    assert.ok(typeof growth.churn.churnRatePercent === 'number', 'churnRatePercent must be a number');
    assert.ok(typeof growth.churn.expiredInLast30Days === 'number', 'expiredInLast30Days must be a number');
    assert.ok(typeof growth.churn.unrenewedCount === 'number', 'unrenewedCount must be a number');
    console.log(`  ✅ [PASS] Churn Rate: ${growth.churn.churnRatePercent}% (${growth.churn.unrenewedCount} unrenewed of ${growth.churn.expiredInLast30Days} expired in last 30d)`);

    // Verify 3: Lead-to-Paid Conversion
    console.log('5. Validating Lead-to-Paid Conversion...');
    assert.ok(growth.leadConversion, 'leadConversion section must exist in growth object');
    assert.ok(typeof growth.leadConversion.conversionRatePercent === 'number', 'conversionRatePercent must be a number');
    assert.ok(growth.leadConversion.leadsInLast30Days >= 2, 'Should have at least 2 leads in last 30d');
    console.log(`  ✅ [PASS] Lead Conversion: ${growth.leadConversion.conversionRatePercent}% (${growth.leadConversion.paidConversionsInLast30Days} paid / ${growth.leadConversion.leadsInLast30Days} leads)`);

    // Verify 4: Overdue Businesses
    console.log('6. Validating Overdue Businesses Flagging...');
    assert.ok(growth.overdue, 'Overdue section must exist in growth object');
    assert.ok(growth.overdue.count >= 1, 'Must detect at least 1 overdue business');
    const overdueFound = growth.overdue.businesses.find(b => b.slug === 'growth-test-overdue-4');
    assert.ok(overdueFound, 'Overdue business (biz4) must be flagged');
    assert.strictEqual(overdueFound.status, 'live', 'Flagged overdue business must have status live');
    console.log(`  ✅ [PASS] Overdue Businesses: ${growth.overdue.count} flagged (Found ${overdueFound.name})`);

    console.log('\n🎉 ALL BILLING GROWTH METRICS TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
    // Cleanup test data
    await dbRun('DELETE FROM businesses WHERE slug LIKE "growth-test-%"');
    await dbRun('DELETE FROM leads WHERE email LIKE "%@growthtest.com"');
    await dbRun('DELETE FROM payments WHERE razorpay_order_id = "order_growth_renew"');
  }
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
