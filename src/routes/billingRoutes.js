const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { dbRun, dbGet, dbAll } = require('../db/database');
const { verifyAdmin, requireSuperAdmin } = require('../middleware/auth');
const subscriptionService = require('../services/subscriptionService');
const userSearchService = require('../services/userSearchService');
const { logAudit } = require('../services/auditService');
const emailService = require('../services/emailService');

// Razorpay SDK initialization
let Razorpay;
try {
  Razorpay = require('razorpay');
} catch (e) {
  Razorpay = null;
}

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (Razorpay && keyId && keySecret && !keyId.includes('mock') && !keyId.includes('placeholder')) {
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return null;
};

// In-Memory Rate Limiter for create-order endpoint (Max 20 requests per minute per IP)
const rateLimitMap = new Map();
const rateLimitCreateOrder = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 20;

  let record = rateLimitMap.get(ip);
  if (!record || now - record.startTime > windowMs) {
    record = { count: 1, startTime: now };
    rateLimitMap.set(ip, record);
  } else {
    record.count += 1;
    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many order requests from this IP. Please try again in a minute.'
      });
    }
  }
  next();
};

// Utility to generate a URL-friendly slug
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// 1. GET /api/billing/plans - List active plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await dbAll('SELECT * FROM plans WHERE is_active = 1 ORDER BY price ASC');
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch hosting plans' });
  }
});

// 2. POST /api/billing/create-order - Create Razorpay order (Rate Limited)
router.post('/create-order', rateLimitCreateOrder, async (req, res) => {
  try {
    const { plan_id, plan_slug, business_data, existing_business_id } = req.body;

    let plan;
    if (plan_id) {
      plan = await dbGet('SELECT * FROM plans WHERE id = ? AND is_active = 1', [plan_id]);
    } else if (plan_slug) {
      plan = await dbGet('SELECT * FROM plans WHERE slug = ? AND is_active = 1', [plan_slug]);
    }

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Selected plan not found or inactive' });
    }

    const amountInPaise = plan.price;
    const rzp = getRazorpayInstance();
    let razorpayOrderId;

    if (rzp) {
      // Real Razorpay Order Creation
      const order = await rzp.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_${Date.now().toString().slice(-8)}`,
        notes: {
          plan_name: plan.name,
          plan_id: plan.id.toString(),
          business_name: (business_data && business_data.name) || ''
        }
      });
      razorpayOrderId = order.id;
    } else {
      // Simulated / Sandbox Order
      razorpayOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    // Record created payment in DB
    const paymentResult = await dbRun(`
      INSERT INTO payments (
        business_id, plan_id, razorpay_order_id, amount, currency, status, notes
      ) VALUES (?, ?, ?, ?, 'INR', 'created', ?)
    `, [
      existing_business_id || null,
      plan.id,
      razorpayOrderId,
      amountInPaise,
      JSON.stringify({ business_data: business_data || {}, plan: { id: plan.id, name: plan.name } })
    ]);

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_scode_public_key';

    res.json({
      success: true,
      data: {
        order_id: razorpayOrderId,
        payment_db_id: paymentResult.lastID,
        amount: amountInPaise,
        currency: 'INR',
        key_id: keyId,
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          duration_months: plan.duration_months
        }
      }
    });
  } catch (error) {
    console.error('Error creating billing order:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
});

// 3. POST /api/billing/verify-payment - Server-side payment verification
router.post('/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      business_data,
      plan_id,
      existing_business_id
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ success: false, message: 'Missing order_id or payment_id' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Strict HMAC SHA256 Signature Verification
    if (keySecret && !keySecret.includes('placeholder')) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        // Record failed payment attempt
        await dbRun('UPDATE payments SET status = "failed" WHERE razorpay_order_id = ?', [razorpay_order_id]);
        return res.status(400).json({ success: false, message: 'Invalid payment signature verification failed' });
      }
    } else {
      // In sandbox/test mode without live keys, verify test payload consistency
      console.log('🧪 Razorpay test mode verification accepted for order:', razorpay_order_id);
    }

    // Check existing payment record (idempotency)
    const existingPayment = await dbGet('SELECT * FROM payments WHERE razorpay_order_id = ?', [razorpay_order_id]);
    if (existingPayment && existingPayment.status === 'paid' && existingPayment.business_id) {
      const biz = await dbGet('SELECT * FROM businesses WHERE id = ?', [existingPayment.business_id]);
      return res.json({
        success: true,
        message: 'Payment already verified and processed',
        data: { business: biz, payment: existingPayment }
      });
    }

    const plan = await dbGet('SELECT * FROM plans WHERE id = ?', [plan_id || (existingPayment ? existingPayment.plan_id : 1)]);
    const durationMonths = plan ? plan.duration_months : 12;
    const expiryDate = subscriptionService.calculateExpiryDate(durationMonths);

    let businessId = existing_business_id || (existingPayment ? existingPayment.business_id : null);
    let businessSlug;
    let businessName;

    if (businessId) {
      // Update existing business subscription
      await dbRun(`
        UPDATE businesses SET
          status = 'live',
          expiry_date = ?,
          current_plan_id = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [expiryDate, plan ? plan.id : null, businessId]);

      const updatedBiz = await dbGet('SELECT * FROM businesses WHERE id = ?', [businessId]);
      businessSlug = updatedBiz ? updatedBiz.slug : '';
      businessName = updatedBiz ? updatedBiz.name : '';
    } else if (business_data && business_data.name) {
      // Create new business with 'upcoming' status (self-serve initial state)
      businessName = business_data.name;
      let slug = generateSlug(business_data.name);
      const existingSlug = await dbGet('SELECT id FROM businesses WHERE slug = ?', [slug]);
      if (existingSlug) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }
      businessSlug = slug;

      // 1. Create or find user
      let userId = null;
      if (business_data.email) {
        const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [business_data.email]);
        if (existingUser) {
          userId = existingUser.id;
        } else {
          const userRes = await dbRun(`
            INSERT INTO users (name, email, phone, city, state, pincode, address, role, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'business_owner', 'active')
          `, [
            business_data.owner_name || business_data.name,
            business_data.email,
            business_data.phone || '',
            business_data.city || 'Pune',
            business_data.state || 'Maharashtra',
            business_data.pincode || '',
            business_data.address || ''
          ]);
          userId = userRes.lastID;
        }
      }

      // 2. Insert new business record with 'pending_review' status (Feature 1b quality control)
      const bizRes = await dbRun(`
        INSERT INTO businesses (
          name, slug, category, tagline, description, about_text,
          phone, whatsapp, email, address, city, state, pincode,
          status, expiry_date, current_plan_id, owner_id, theme_color, is_featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?, ?, ?, ?)
      `, [
        business_data.name,
        businessSlug,
        business_data.category || 'General Business',
        business_data.tagline || `Welcome to ${business_data.name}`,
        business_data.description || 'Verified local business powered by SCode Platform.',
        business_data.about_text || '',
        business_data.phone || '',
        business_data.whatsapp || business_data.phone || '',
        business_data.email || '',
        business_data.address || '',
        business_data.city || 'Pune',
        business_data.state || 'Maharashtra',
        business_data.pincode || '',
        expiryDate,
        plan ? plan.id : null,
        userId,
        business_data.theme_color || '#3b82f6',
        plan && plan.is_featured_included ? 1 : 0
      ]);

      businessId = bizRes.lastID;

      // Log initial submission in approval_log
      await dbRun(`
        INSERT INTO approval_log (business_id, action, reason, details)
        VALUES (?, 'submitted', 'Self-serve hosting order created & payment verified', ?)
      `, [
        businessId,
        JSON.stringify({
          plan: plan ? plan.name : 'Standard',
          amount: plan ? plan.price : 0,
          razorpay_order_id,
          razorpay_payment_id
        })
      ]);

      // If user was created/found, link business_id
      if (userId) {
        await dbRun('UPDATE users SET business_id = ? WHERE id = ?', [businessId, userId]);
      }
    }

    // Update payment record as 'paid'
    if (existingPayment) {
      await dbRun(`
        UPDATE payments SET
          status = 'paid',
          business_id = ?,
          razorpay_payment_id = ?,
          razorpay_signature = ?,
          paid_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [businessId, razorpay_payment_id, razorpay_signature || '', existingPayment.id]);
    } else {
      await dbRun(`
        INSERT INTO payments (
          business_id, plan_id, razorpay_order_id, razorpay_payment_id, razorpay_signature,
          amount, currency, status, payment_method, paid_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'INR', 'paid', 'razorpay', CURRENT_TIMESTAMP)
      `, [
        businessId,
        plan ? plan.id : 1,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature || '',
        plan ? plan.price : 299900
      ]);
    }

    userSearchService.invalidateCache();

    const createdBiz = businessId ? await dbGet('SELECT * FROM businesses WHERE id = ?', [businessId]) : null;

    // Send receipt email to business email (non-blocking)
    const recipientEmail = (business_data && business_data.email) || (createdBiz && createdBiz.email);
    if (recipientEmail) {
      emailService.sendPaymentReceipt({
        to: recipientEmail,
        businessName: businessName || (createdBiz ? createdBiz.name : 'Your Business'),
        planName: plan ? plan.name : 'Hosting Plan',
        amountRupees: (plan ? plan.price : 299900) / 100,
        expiryDate: expiryDate,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      }).catch(err => {
        console.warn('[EmailService] Failed to send payment receipt:', err.message);
      });
    }

    res.json({
      success: true,
      message: 'Payment verified and subscription activated successfully!',
      data: {
        business_id: businessId,
        slug: businessSlug,
        name: businessName,
        expiry_date: expiryDate,
        business: createdBiz
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment: ' + error.message });
  }
});

// 4. POST /api/billing/webhook - Razorpay Webhook Endpoint
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (expectedSignature !== signature) {
        console.warn('[Razorpay Webhook] Invalid webhook signature');
        return res.status(400).json({ success: false, message: 'Invalid signature' });
      }
    }

    const event = req.body.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const payment = await dbGet('SELECT * FROM payments WHERE razorpay_order_id = ?', [orderId]);
        if (payment && payment.status !== 'paid') {
          await dbRun(`
            UPDATE payments SET
              status = 'paid',
              razorpay_payment_id = ?,
              paid_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [paymentId || '', payment.id]);

          if (payment.business_id) {
            const plan = await dbGet('SELECT duration_months FROM plans WHERE id = ?', [payment.plan_id]);
            const duration = plan ? plan.duration_months : 12;
            const newExpiry = subscriptionService.calculateExpiryDate(duration);
            await dbRun('UPDATE businesses SET status = "live", expiry_date = ? WHERE id = ?', [newExpiry, payment.business_id]);
          }
          console.log(`[Razorpay Webhook] Payment #${payment.id} marked as paid via webhook.`);
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, message: 'Webhook error' });
  }
});

// 5. GET /api/billing/admin/overview - Admin revenue & payments overview
router.get('/admin/overview', verifyAdmin, async (req, res) => {
  try {
    // Total Revenue (All-time in paise -> convert to rupees in response)
    const totalRevRow = await dbGet('SELECT SUM(amount) as total FROM payments WHERE status = "paid"');
    const totalRevenuePaise = totalRevRow?.total || 0;

    // Revenue this month
    const thisMonthRow = await dbGet(`
      SELECT SUM(amount) as total 
      FROM payments 
      WHERE status = 'paid' 
        AND strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')
    `);
    const thisMonthPaise = thisMonthRow?.total || 0;

    // Revenue today
    const todayRow = await dbGet(`
      SELECT SUM(amount) as total 
      FROM payments 
      WHERE status = 'paid' 
        AND date(paid_at) = date('now')
    `);
    const todayPaise = todayRow?.total || 0;

    // Active & Expiring businesses
    const activeSubsRow = await dbGet('SELECT COUNT(*) as count FROM businesses WHERE status = "live" AND deleted_at IS NULL');
    const expiring7Days = await subscriptionService.getExpiringInDays(7);
    const expiring30Days = await subscriptionService.getExpiringInDays(30);

    // List all payments
    const payments = await dbAll(`
      SELECT p.*, b.name as business_name, b.slug as business_slug, pl.name as plan_name
      FROM payments p
      LEFT JOIN businesses b ON p.business_id = b.id
      LEFT JOIN plans pl ON p.plan_id = pl.id
      ORDER BY p.created_at DESC
      LIMIT 100
    `);

    // --- GROWTH METRICS ---
    // 1. MRR: normalize every active paid business's plan price to monthly-equivalent (price / duration_months) and sum it
    const activePaidBiz = await dbAll(`
      SELECT b.id, b.name, b.current_plan_id, p.price as plan_price, p.duration_months
      FROM businesses b
      JOIN plans p ON b.current_plan_id = p.id
      WHERE b.deleted_at IS NULL 
        AND b.status = 'live' 
        AND (b.expiry_date >= date('now') OR b.expiry_date IS NULL)
    `);
    let mrrPaise = 0;
    for (const biz of activePaidBiz) {
      const duration = biz.duration_months && biz.duration_months > 0 ? biz.duration_months : 12;
      const monthlyPaise = (biz.plan_price || 0) / duration;
      mrrPaise += monthlyPaise;
    }
    const mrrRupees = Math.round(mrrPaise / 100);

    // 2. Churn: % of businesses whose expiry_date passed in the last 30 days and who have not been renewed since
    const expiredIn30Days = await dbAll(`
      SELECT b.id, b.name, b.expiry_date
      FROM businesses b
      WHERE b.deleted_at IS NULL 
        AND b.expiry_date >= date('now', '-30 days')
        AND b.expiry_date < date('now')
    `);
    let unrenewedCount = 0;
    for (const biz of expiredIn30Days) {
      const renewalPayment = await dbGet(`
        SELECT id FROM payments 
        WHERE business_id = ? 
          AND status = 'paid' 
          AND (date(paid_at) > date(?) OR date(created_at) > date(?))
        LIMIT 1
      `, [biz.id, biz.expiry_date, biz.expiry_date]);
      if (!renewalPayment) {
        unrenewedCount++;
      }
    }
    const totalExpiredIn30Days = expiredIn30Days.length;
    const churnRatePercent = totalExpiredIn30Days > 0
      ? Number(((unrenewedCount / totalExpiredIn30Days) * 100).toFixed(2))
      : 0;

    // 3. Lead-to-paid conversion rate: count of leads in last 30 days vs count of businesses created via billing in same period
    const leadsCountRow = await dbGet(`
      SELECT COUNT(*) as count 
      FROM leads 
      WHERE deleted_at IS NULL 
        AND created_at >= datetime('now', '-30 days')
    `);
    const leadsInLast30Days = leadsCountRow?.count || 0;

    const paidBizRow = await dbGet(`
      SELECT COUNT(DISTINCT business_id) as count 
      FROM payments 
      WHERE status = 'paid' 
        AND payment_method IN ('razorpay', 'mock')
        AND created_at >= datetime('now', '-30 days')
        AND business_id IS NOT NULL
    `);
    const paidConversionsInLast30Days = paidBizRow?.count || 0;
    const conversionRatePercent = leadsInLast30Days > 0
      ? Number(((paidConversionsInLast30Days / leadsInLast30Days) * 100).toFixed(2))
      : 0;

    // 4. Overdue businesses: status = 'live' but expiry_date < today (flagged as missed by lifecycle automation)
    const overdueBusinesses = await dbAll(`
      SELECT b.id, b.name, b.slug, b.status, b.expiry_date, b.phone, b.email, p.name as plan_name
      FROM businesses b
      LEFT JOIN plans p ON b.current_plan_id = p.id
      WHERE b.deleted_at IS NULL 
        AND b.status = 'live' 
        AND b.expiry_date < date('now')
      ORDER BY b.expiry_date ASC
    `);

    const growth = {
      mrr: {
        mrrPaise: Math.round(mrrPaise),
        mrrRupees: mrrRupees,
        activePaidBusinesses: activePaidBiz.length
      },
      churn: {
        expiredInLast30Days: totalExpiredIn30Days,
        unrenewedCount: unrenewedCount,
        renewedCount: totalExpiredIn30Days - unrenewedCount,
        churnRatePercent: churnRatePercent
      },
      leadConversion: {
        leadsInLast30Days: leadsInLast30Days,
        paidConversionsInLast30Days: paidConversionsInLast30Days,
        conversionRatePercent: conversionRatePercent
      },
      overdue: {
        count: overdueBusinesses.length,
        businesses: overdueBusinesses
      }
    };

    res.json({
      success: true,
      data: {
        revenue: {
          totalPaise: totalRevenuePaise,
          totalRupees: totalRevenuePaise / 100,
          thisMonthPaise: thisMonthPaise,
          thisMonthRupees: thisMonthPaise / 100,
          todayPaise: todayPaise,
          todayRupees: todayPaise / 100
        },
        counts: {
          activeSubscriptions: activeSubsRow?.count || 0,
          totalPayments: payments.length,
          expiringIn7Days: expiring7Days.length,
          expiringIn30Days: expiring30Days.length
        },
        expiringBusinesses: expiring30Days,
        growth,
        payments
      }
    });
  } catch (error) {
    console.error('Error fetching admin billing overview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch billing stats' });
  }
});

// 6. POST /api/billing/admin/manual-payment - Admin records offline payment & activates/renews business (Superadmin only)
router.post('/admin/manual-payment', verifyAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { business_id, plan_id, amount, notes, payment_method = 'offline' } = req.body;

    if (!business_id || !plan_id) {
      return res.status(400).json({ success: false, message: 'Business ID and Plan ID are required' });
    }

    const business = await dbGet('SELECT * FROM businesses WHERE id = ?', [business_id]);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const plan = await dbGet('SELECT * FROM plans WHERE id = ?', [plan_id]);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const finalAmount = amount ? parseInt(amount, 10) : plan.price;
    const orderId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const paymentId = `pay_offline_${Date.now()}`;

    // Record payment
    const paymentRes = await dbRun(`
      INSERT INTO payments (
        business_id, plan_id, razorpay_order_id, razorpay_payment_id,
        amount, currency, status, payment_method, notes, paid_at
      ) VALUES (?, ?, ?, ?, ?, 'INR', 'paid', ?, ?, CURRENT_TIMESTAMP)
    `, [
      business_id,
      plan.id,
      orderId,
      paymentId,
      finalAmount,
      payment_method,
      notes || `Manual offline renewal recorded by Admin for ${business.name}`
    ]);

    // Activate/Renew business subscription
    const updatedBiz = await subscriptionService.activateSubscription(business_id, plan.id, plan.duration_months);

    await logAudit({
      admin_id: req.admin?.id,
      action: 'MANUAL_PAYMENT',
      entity_type: 'payment',
      entity_id: paymentRes.lastID,
      details: {
        business_id,
        business_name: business.name,
        plan_id: plan.id,
        plan_name: plan.name,
        amount: finalAmount,
        payment_method
      }
    });

    userSearchService.invalidateCache();

    res.json({
      success: true,
      message: `Subscription successfully renewed for "${business.name}" until ${updatedBiz.expiry_date}!`,
      data: {
        payment_id: paymentRes.lastID,
        business: updatedBiz
      }
    });
  } catch (error) {
    console.error('Error recording manual payment:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
});

// 7. POST /api/billing/admin/refund/:paymentId - Admin issues refund via Razorpay
router.post('/admin/refund/:paymentId', verifyAdmin, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    // 1. Locate payment record by ID or razorpay_payment_id
    const payment = await dbGet(`
      SELECT p.*, b.name as business_name, b.email as business_email
      FROM payments p
      LEFT JOIN businesses b ON p.business_id = b.id
      WHERE p.id = ? OR p.razorpay_payment_id = ?
    `, [paymentId, paymentId]);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({ success: false, message: 'Payment has already been refunded' });
    }

    if (payment.status !== 'paid') {
      return res.status(400).json({ success: false, message: `Cannot refund payment with status: "${payment.status}"` });
    }

    const razorpay = getRazorpayInstance();
    let razorpayRefund = null;
    const refundAmount = amount ? parseInt(amount, 10) : payment.amount;

    // 2. Call Razorpay refund API if real payment ID & credentials exist
    if (
      razorpay &&
      payment.razorpay_payment_id &&
      !payment.razorpay_payment_id.startsWith('pay_mock') &&
      !payment.razorpay_payment_id.startsWith('mock_') &&
      !payment.razorpay_payment_id.startsWith('pay_offline')
    ) {
      try {
        razorpayRefund = await razorpay.payments.refund(payment.razorpay_payment_id, {
          amount: refundAmount,
          notes: {
            admin_id: req.admin?.id ? String(req.admin.id) : 'unknown',
            reason: reason || 'Admin initiated refund from SCode Platform'
          }
        });
      } catch (rzpErr) {
        console.error('[Razorpay Refund API Error]:', rzpErr);
        const errorDesc = rzpErr.error?.description || rzpErr.message || 'Razorpay refund failed';
        return res.status(500).json({
          success: false,
          message: `Razorpay refund API call failed: ${errorDesc}`
        });
      }
    } else {
      // Mock / Offline refund processing
      razorpayRefund = {
        id: `rfnd_mock_${Date.now()}`,
        payment_id: payment.razorpay_payment_id || `pay_${payment.id}`,
        amount: refundAmount,
        currency: payment.currency || 'INR',
        status: 'processed',
        speed: 'normal',
        created_at: Math.floor(Date.now() / 1000)
      };
      console.log(`[Razorpay Refund] Processed mock/sandbox refund for payment #${payment.id}`);
    }

    // 3. Update payment status to 'refunded' in DB
    await dbRun(`
      UPDATE payments SET
        status = 'refunded',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [payment.id]);

    // 4. Log audit action
    await logAudit({
      admin_id: req.admin?.id,
      action: 'REFUND',
      entity_type: 'payment',
      entity_id: payment.id,
      details: {
        payment_id: payment.id,
        razorpay_payment_id: payment.razorpay_payment_id,
        business_id: payment.business_id,
        business_name: payment.business_name,
        refund_amount: refundAmount,
        refund_id: razorpayRefund?.id,
        reason: reason || 'Admin initiated refund'
      }
    });

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      data: {
        payment_id: payment.id,
        razorpay_payment_id: payment.razorpay_payment_id,
        amount_refunded: refundAmount,
        status: 'refunded',
        refund: razorpayRefund
      }
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ success: false, message: 'Failed to process refund: ' + error.message });
  }
});

module.exports = router;
