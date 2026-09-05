const assert = require('assert');
const express = require('express');
const jwt = require('jsonwebtoken');
const { initDB, dbRun, dbGet, dbAll } = require('../src/db/database');
const billingRoutes = require('../src/routes/billingRoutes');
const subscriptionService = require('../src/services/subscriptionService');
const emailService = require('../src/services/emailService');
const { JWT_SECRET } = require('../src/middleware/auth');

async function runTests() {
  console.log('🧪 Starting Razorpay Refund, Email Receipts & Renewal Reminders Test Suite...\n');
  await initDB();

  const app = express();
  app.use(express.json());
  app.use('/api/billing', billingRoutes);

  const adminToken = jwt.sign({ id: 7771, username: 'refund_admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

  // 1. Setup Test Data
  console.log('1. Setting up test data for refund and verification...');
  await dbRun('DELETE FROM businesses WHERE slug LIKE "refund-test-%"');
  await dbRun('DELETE FROM payments WHERE razorpay_order_id LIKE "order_refund_test_%"');

  const bizRes = await dbRun(`
    INSERT INTO businesses (name, slug, category, email, status, expiry_date)
    VALUES ('Refund Test Biz', 'refund-test-biz-1', 'Technology', 'owner@refundtest.com', 'live', date('now', '+300 days'))
  `);
  const bizId = bizRes.lastID;

  const paymentRes = await dbRun(`
    INSERT INTO payments (business_id, plan_id, razorpay_order_id, razorpay_payment_id, amount, currency, status, payment_method, paid_at)
    VALUES (?, 1, 'order_refund_test_1', 'pay_mock_refund_123', 299900, 'INR', 'paid', 'razorpay', CURRENT_TIMESTAMP)
  `, [bizId]);
  const paymentId = paymentRes.lastID;

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // 2. Test POST /api/billing/admin/refund/:paymentId
    console.log('2. Testing POST /api/billing/admin/refund/:paymentId...');
    const refundRes = await fetch(`http://127.0.0.1:${port}/api/billing/admin/refund/${paymentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ reason: 'Customer requested refund during trial' })
    });

    const refundJson = await refundRes.json();
    assert.strictEqual(refundJson.success, true, `Refund API failed: ${refundJson.message}`);
    assert.strictEqual(refundJson.data.status, 'refunded', 'Payment status should be refunded');
    assert.ok(refundJson.data.refund, 'Refund details object must be returned');
    console.log('  ✅ [PASS] Refund API returned success and processed refund.');

    // Verify DB updated
    const updatedPayment = await dbGet('SELECT * FROM payments WHERE id = ?', [paymentId]);
    assert.strictEqual(updatedPayment.status, 'refunded', 'Database payment status must be refunded');
    console.log('  ✅ [PASS] Payment record status in DB updated to "refunded".');

    // Verify Audit log entry
    const auditEntry = await dbGet('SELECT * FROM audit_log WHERE entity_id = ? AND action = "REFUND" ORDER BY id DESC LIMIT 1', [paymentId]);
    assert.ok(auditEntry, 'Audit log entry must be created for refund');
    console.log('  ✅ [PASS] Audit log recorded REFUND action with admin details.');

    // Test duplicate refund attempt (should fail with 400)
    const dupRefundRes = await fetch(`http://127.0.0.1:${port}/api/billing/admin/refund/${paymentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const dupRefundJson = await dupRefundRes.json();
    assert.strictEqual(dupRefundRes.status, 400, 'Duplicate refund should return 400');
    assert.strictEqual(dupRefundJson.success, false);
    console.log('  ✅ [PASS] Duplicate refund rejection verified.');

    // 3. Test Email Receipt Generation & Service
    console.log('3. Testing EmailService Receipt Generation & Delivery...');
    let receiptSent = false;
    const originalSendMail = emailService.sendMail.bind(emailService);
    emailService.sendMail = async (opts) => {
      receiptSent = true;
      assert.ok(opts.to, 'Receipt must have recipient email');
      assert.ok(opts.subject.includes('Payment Receipt'), 'Subject must contain Payment Receipt');
      assert.ok(opts.text.includes('₹2,999') || opts.text.includes('2999'), 'Receipt must contain amount');
      return originalSendMail(opts);
    };

    const emailResult = await emailService.sendPaymentReceipt({
      to: 'client@example.com',
      businessName: 'Apex Motors',
      planName: 'Growth Plan',
      amountRupees: 2999,
      expiryDate: '2027-09-05',
      paymentId: 'pay_test_receipt_123',
      orderId: 'order_test_receipt_123'
    });
    assert.strictEqual(emailResult.success, true, 'Payment receipt email sending must succeed');
    assert.strictEqual(receiptSent, true, 'sendMail must have been called');
    console.log('  ✅ [PASS] Email receipt generation & formatting verified.');

    // Restore original sendMail before renewal reminders
    emailService.sendMail = originalSendMail;

    // 4. Test Renewal Reminder Scanner (7 days & 1 day before expiry)
    console.log('4. Testing Renewal Reminder Scanner (7 days & 1 day)...');
    
    // Setup business expiring in exactly 7 days
    await dbRun(`
      INSERT INTO businesses (name, slug, category, email, status, expiry_date, current_plan_id)
      VALUES ('7-Day Expiring Biz', 'refund-test-7day', 'Retail', 'remind7@refundtest.com', 'live', date('now', '+7 days'), 1)
    `);

    // Setup business expiring in exactly 1 day
    await dbRun(`
      INSERT INTO businesses (name, slug, category, email, status, expiry_date, current_plan_id)
      VALUES ('1-Day Expiring Biz', 'refund-test-1day', 'Retail', 'remind1@refundtest.com', 'live', date('now', '+1 day'), 1)
    `);

    const reminderResults = await subscriptionService.scanAndSendRenewalReminders();
    assert.ok(reminderResults.sent7Days.length >= 1, 'Must find at least 1 business for 7-day reminder');
    assert.ok(reminderResults.sent1Day.length >= 1, 'Must find at least 1 business for 1-day reminder');
    
    const found7 = reminderResults.sent7Days.find(b => b.slug === 'refund-test-7day');
    const found1 = reminderResults.sent1Day.find(b => b.slug === 'refund-test-1day');
    assert.ok(found7, '7-Day business must be found in reminder list');
    assert.ok(found1, '1-Day business must be found in reminder list');
    console.log(`  ✅ [PASS] Renewal reminder scanner identified and dispatched reminders (7-day: ${reminderResults.sent7Days.length}, 1-day: ${reminderResults.sent1Day.length}).`);

    // Restore original sendMail
    emailService.sendMail = originalSendMail;

    console.log('\n🎉 ALL RAZORPAY REFUND, RECEIPT & REMINDER TESTS PASSED!');
  } finally {
    server.close();
    await dbRun('DELETE FROM businesses WHERE slug LIKE "refund-test-%"');
    await dbRun('DELETE FROM payments WHERE razorpay_order_id LIKE "order_refund_test_%"');
  }
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
