const { dbRun, dbAll, dbGet } = require('../db/database');
const emailService = require('./emailService');

/**
 * SubscriptionService
 * Manages lifecycle status transitions, expiry scans, renewal calculations, and reminder alerts.
 */
class SubscriptionService {
  /**
   * Scan businesses for expired subscriptions and mark them 'suspended'.
   */
  async scanAndSuspendExpired() {
    try {
      // Find businesses where expiry_date is set, is in the past (YYYY-MM-DD format), and not already suspended
      const expiredBusinesses = await dbAll(`
        SELECT id, name, slug, expiry_date, status
        FROM businesses
        WHERE expiry_date IS NOT NULL 
          AND expiry_date != ''
          AND date(expiry_date) < date('now')
          AND status != 'suspended'
          AND deleted_at IS NULL
      `);

      if (expiredBusinesses.length > 0) {
        console.log(`[SubscriptionService] Found ${expiredBusinesses.length} expired businesses to suspend:`);
        for (const b of expiredBusinesses) {
          await dbRun('UPDATE businesses SET status = "suspended", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [b.id]);
          console.log(`  🚨 Suspended business #${b.id} (${b.name}, expired on ${b.expiry_date})`);
        }
      } else {
        console.log('[SubscriptionService] Daily scan completed: 0 expired businesses.');
      }
      return expiredBusinesses;
    } catch (err) {
      console.error('[SubscriptionService] Error scanning expired subscriptions:', err);
      return [];
    }
  }

  /**
   * Scan businesses expiring in 7 days and 1 day, and dispatch renewal reminder emails.
   */
  async scanAndSendRenewalReminders() {
    const results = { sent7Days: [], sent1Day: [] };
    try {
      // 1. Businesses expiring in exactly 7 days
      const expiringIn7 = await dbAll(`
        SELECT b.id, b.name, b.slug, b.email, b.expiry_date, p.name as plan_name
        FROM businesses b
        LEFT JOIN plans p ON b.current_plan_id = p.id
        WHERE b.deleted_at IS NULL
          AND b.status = 'live'
          AND b.expiry_date IS NOT NULL
          AND date(b.expiry_date) = date('now', '+7 days')
          AND b.email IS NOT NULL AND b.email != ''
      `);

      for (const b of expiringIn7) {
        await emailService.sendRenewalReminder({
          to: b.email,
          businessName: b.name,
          planName: b.plan_name || 'Standard Hosting',
          expiryDate: b.expiry_date,
          daysLeft: 7
        });
        results.sent7Days.push(b);
      }

      // 2. Businesses expiring in exactly 1 day
      const expiringIn1 = await dbAll(`
        SELECT b.id, b.name, b.slug, b.email, b.expiry_date, p.name as plan_name
        FROM businesses b
        LEFT JOIN plans p ON b.current_plan_id = p.id
        WHERE b.deleted_at IS NULL
          AND b.status = 'live'
          AND b.expiry_date IS NOT NULL
          AND date(b.expiry_date) = date('now', '+1 day')
          AND b.email IS NOT NULL AND b.email != ''
      `);

      for (const b of expiringIn1) {
        await emailService.sendRenewalReminder({
          to: b.email,
          businessName: b.name,
          planName: b.plan_name || 'Standard Hosting',
          expiryDate: b.expiry_date,
          daysLeft: 1
        });
        results.sent1Day.push(b);
      }

      const totalSent = results.sent7Days.length + results.sent1Day.length;
      if (totalSent > 0) {
        console.log(`[SubscriptionService] Sent ${totalSent} renewal reminder emails (${results.sent7Days.length} @ 7-day, ${results.sent1Day.length} @ 1-day).`);
      } else {
        console.log('[SubscriptionService] Renewal reminder scan completed: 0 due today.');
      }
      return results;
    } catch (err) {
      console.error('[SubscriptionService] Error sending renewal reminders:', err);
      return results;
    }
  }

  /**
   * Start the recurring daily timer for subscription expiry check and renewal reminders.
   */
  startLifecycleAutomation(intervalMs = 24 * 60 * 60 * 1000) {
    // Run immediately on boot
    this.scanAndSuspendExpired();
    this.scanAndSendRenewalReminders();

    // Schedule daily check
    const interval = setInterval(() => {
      this.scanAndSuspendExpired();
      this.scanAndSendRenewalReminders();
    }, intervalMs);

    // Allow process to exit cleanly if needed
    if (interval.unref) interval.unref();
    return interval;
  }

  /**
   * Calculate future expiry date based on plan duration in months (default 12 months).
   */
  calculateExpiryDate(durationMonths = 12, fromDate = new Date()) {
    const d = new Date(fromDate);
    d.setMonth(d.getMonth() + parseInt(durationMonths, 10));
    return d.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  }

  /**
   * Get businesses expiring in the next N days.
   */
  async getExpiringInDays(days = 30) {
    return await dbAll(`
      SELECT b.*, p.name as plan_name, p.price as plan_price
      FROM businesses b
      LEFT JOIN plans p ON b.current_plan_id = p.id
      WHERE b.expiry_date IS NOT NULL
        AND b.expiry_date != ''
        AND date(b.expiry_date) >= date('now')
        AND date(b.expiry_date) <= date('now', '+' || ? || ' days')
      ORDER BY b.expiry_date ASC
    `, [days]);
  }

  /**
   * Renew or activate a business subscription
   */
  async activateSubscription(businessId, planId, durationMonths = 12) {
    const newExpiry = this.calculateExpiryDate(durationMonths);
    await dbRun(`
      UPDATE businesses 
      SET status = 'live',
          expiry_date = ?,
          current_plan_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newExpiry, planId, businessId]);

    return await dbGet('SELECT * FROM businesses WHERE id = ?', [businessId]);
  }
}

module.exports = new SubscriptionService();
