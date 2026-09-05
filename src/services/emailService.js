const nodemailer = require('nodemailer');

/**
 * EmailService
 * Manages transactional emails (receipts, renewal reminders, alerts) via SMTP with nodemailer.
 * Falls back safely to console logging when SMTP credentials are not provided.
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'SCode Platform <noreply@scode.in>';
    this.initTransporter();
  }

  initTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER || process.env.SMTP_USERNAME;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass }
        });
        console.log(`[EmailService] SMTP transporter initialized (${host}:${port})`);
      } catch (err) {
        console.warn('[EmailService] Failed to initialize SMTP transporter:', err.message);
        this.transporter = null;
      }
    } else {
      this.transporter = null;
    }
  }

  /**
   * Generic send email method.
   */
  async sendMail({ to, subject, text, html }) {
    if (!to) {
      console.warn('[EmailService] No recipient address provided, skipping email.');
      return { success: false, message: 'No recipient email' };
    }

    const mailOptions = {
      from: this.fromAddress,
      to,
      subject,
      text,
      html: html || text
    };

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`[EmailService] Email sent successfully to ${to} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      } catch (err) {
        console.error(`[EmailService] Error sending email via SMTP to ${to}:`, err.message);
        return { success: false, error: err.message };
      }
    } else {
      // Mock / Dev delivery
      console.log('----------------------------------------------------');
      console.log(`📧 [EmailService Mock / Dev Mode]`);
      console.log(`To: ${to}`);
      console.log(`From: ${this.fromAddress}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content:\n${text}`);
      console.log('----------------------------------------------------');
      return { success: true, mock: true, messageId: `mock_${Date.now()}` };
    }
  }

  /**
   * Send a payment receipt email after successful transaction verification.
   */
  async sendPaymentReceipt({ to, businessName, planName, amountRupees, expiryDate, paymentId, orderId }) {
    const formattedAmount = Number(amountRupees || 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });

    const subject = `Payment Receipt: ${planName || 'Hosting Plan'} Subscription for ${businessName || 'Your Business'}`;

    const text = `Dear Business Owner,

Thank you for choosing SCode Platform! Your payment has been successfully processed and your subscription is active.

====================================================
RECEIPT & SUBSCRIPTION DETAILS
====================================================
Business Name : ${businessName || 'Your Business'}
Plan Name     : ${planName || 'Standard Hosting'}
Amount Paid   : ${formattedAmount}
Payment ID    : ${paymentId || 'N/A'}
Order ID      : ${orderId || 'N/A'}
Expiry Date   : ${expiryDate || 'N/A'}
Status        : PAID / ACTIVE
====================================================

You can access and manage your business profile anytime through the SCode Platform.

If you have any questions, feel free to reach out to our team at support@scode.in.

Warm regards,
The SCode Team
https://scode.in
`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #1e3a8a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">SCode Platform</h1>
          <p style="color: #93c5fd; margin: 6px 0 0 0; font-size: 14px;">Payment Receipt &amp; Subscription Confirmation</p>
        </div>
        <div style="padding: 28px;">
          <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Dear <strong>${businessName || 'Valued Partner'}</strong>,</p>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">Thank you for your business. Your payment has been verified and your hosting subscription is active.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Business Name</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${businessName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Plan</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${planName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Amount Paid</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #16a34a; font-size: 16px; font-weight: 700; text-align: right;">${formattedAmount}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Payment ID</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px; font-family: monospace; text-align: right;">${paymentId}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; color: #64748b; font-size: 14px;">Subscription Expiry</td>
              <td style="padding: 12px 16px; color: #2563eb; font-size: 14px; font-weight: 600; text-align: right;">${expiryDate}</td>
            </tr>
          </table>

          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">If you need assistance with your listing or wish to customize your page, please contact <a href="mailto:support@scode.in" style="color: #2563eb;">support@scode.in</a>.</p>
        </div>
        <div style="background: #f1f5f9; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} SCode Platform. All rights reserved.
        </div>
      </div>
    `;

    return this.sendMail({ to, subject, text, html });
  }

  /**
   * Send a renewal reminder email to a business owner prior to expiration.
   */
  async sendRenewalReminder({ to, businessName, planName, expiryDate, daysLeft }) {
    const subject = `Reminder: Your ${planName || 'SCode'} Subscription for ${businessName} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;

    const text = `Dear Business Owner,

This is a friendly reminder that your hosting subscription on SCode Platform for "${businessName}" is set to expire in ${daysLeft} day${daysLeft === 1 ? '' : 's'} on ${expiryDate}.

To ensure uninterrupted online presence and lead generation for your business, please renew your subscription before the expiry date.

====================================================
SUBSCRIPTION DETAILS
====================================================
Business Name : ${businessName}
Current Plan  : ${planName || 'Hosting Plan'}
Expiry Date   : ${expiryDate}
Days Left     : ${daysLeft} day${daysLeft === 1 ? '' : 's'}
====================================================

You can renew your plan online via the SCode platform or contact our sales team at support@scode.in.

Warm regards,
The SCode Team
https://scode.in
`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #b45309; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Subscription Renewal Reminder</h1>
          <p style="color: #fde68a; margin: 6px 0 0 0; font-size: 14px;">${daysLeft} Day${daysLeft === 1 ? '' : 's'} Remaining</p>
        </div>
        <div style="padding: 28px;">
          <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Dear <strong>${businessName}</strong>,</p>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            Your hosting plan subscription for <strong>${businessName}</strong> on the SCode Platform will expire on <strong style="color: #b45309;">${expiryDate}</strong> (${daysLeft} day${daysLeft === 1 ? '' : 's'} left).
          </p>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            To maintain your live website listing and avoid service suspension, please renew your subscription today.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #fffbeb; border-radius: 6px; border: 1px solid #fde68a;">
            <tr>
              <td style="padding: 12px 16px; color: #92400e; font-size: 14px;">Business</td>
              <td style="padding: 12px 16px; color: #78350f; font-size: 14px; font-weight: 600; text-align: right;">${businessName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; color: #92400e; font-size: 14px;">Plan</td>
              <td style="padding: 12px 16px; color: #78350f; font-size: 14px; font-weight: 600; text-align: right;">${planName || 'Standard Plan'}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; color: #92400e; font-size: 14px;">Expiry Date</td>
              <td style="padding: 12px 16px; color: #b45309; font-size: 15px; font-weight: 700; text-align: right;">${expiryDate}</td>
            </tr>
          </table>

          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">For renewal assistance or questions, please reply to this email or contact <a href="mailto:support@scode.in" style="color: #2563eb;">support@scode.in</a>.</p>
        </div>
        <div style="background: #f1f5f9; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} SCode Platform. All rights reserved.
        </div>
      </div>
    `;

    return this.sendMail({ to, subject, text, html });
  }
}

module.exports = new EmailService();
