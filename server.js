/**
 * SCode Platform - Express Application Entry Point
 * 
 * Required Environment Variables (.env):
 * - PORT: Port to run Express server on (default: 3000)
 * - JWT_SECRET: Secret key for signing admin JWT auth tokens
 * - RAZORPAY_KEY_ID: Razorpay API Key ID (e.g. rzp_live_... or rzp_test_...)
 * - RAZORPAY_KEY_SECRET: Razorpay API Key Secret
 * - RAZORPAY_WEBHOOK_SECRET: Razorpay Webhook Secret for HMAC verification
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { initDB } = require('./src/db/database');
const subscriptionService = require('./src/services/subscriptionService');

const authRoutes = require('./src/routes/authRoutes');
const businessRoutes = require('./src/routes/businessRoutes');
const leadRoutes = require('./src/routes/leadRoutes');
const statsRoutes = require('./src/routes/statsRoutes');
const settingRoutes = require('./src/routes/settingRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const billingRoutes = require('./src/routes/billingRoutes');
const qrRoutes = require('./src/routes/qrRoutes');
const approvalRoutes = require('./src/routes/approvalRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to prevent blocking external Google Fonts, Bootstrap Icons, Unsplash images, and Razorpay
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 2. Locked-down CORS
const allowedOrigin = process.env.ALLOWED_ORIGIN;
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, mobile apps, same-origin)
    if (!origin) return callback(null, true);

    if (allowedOrigin) {
      const allowedList = allowedOrigin.split(',').map(o => o.trim());
      if (allowedList.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
    }

    // In development mode, allow origins if ALLOWED_ORIGIN is not explicitly configured
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    return callback(new Error('CORS ALLOWED_ORIGIN is not configured'));
  },
  credentials: true
};
app.use(cors(corsOptions));

// 3. Global Rate Limiter for /api/ (100 req / minute per IP)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again in a minute.'
  }
});
app.use('/api/', apiLimiter);

// 4. Request Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 1. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/approvals', approvalRoutes);

// 2. Build Integrity Check: Serve React Static Build (from client/dist)
const clientDistPath = path.join(__dirname, 'client', 'dist');
const clientIndexHtml = path.join(clientDistPath, 'index.html');
const isDistPresent = fs.existsSync(clientIndexHtml);

if (isDistPresent) {
  app.use(express.static(clientDistPath));
} else {
  console.error(`
=============================================================================
❌ FATAL BUILD ERROR: client/dist/index.html NOT FOUND!
-----------------------------------------------------------------------------
Did the build step run? (npm run build)
Refusing to serve unsafe fallback content.
Any request to frontend routes will receive a 503 Deployment in Progress screen.
=============================================================================
  `);
}

// 3. React SPA Fallback Handler (Never falls back to unbranded/legacy files)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }

  if (fs.existsSync(clientIndexHtml)) {
    res.sendFile(clientIndexHtml);
  } else {
    res.status(503).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>SCode Platform — Deployment in Progress</title>
        <style>
          body { background: #0b0f19; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { max-width: 500px; background: #131c2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 40px; text-align: center; }
          h1 { color: #60a5fa; margin-bottom: 12px; font-size: 1.5rem; }
          p { color: #94a3b8; line-height: 1.6; margin-bottom: 20px; }
          .code { background: #000; padding: 8px 12px; border-radius: 6px; font-family: monospace; color: #34d399; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 SCode Platform — Deployment in Progress</h1>
          <p>The client build is currently being generated or was not completed. Please run the build command:</p>
          <div class="code">npm run build</div>
        </div>
      </body>
      </html>
    `);
  }
});

// Start Server
const startServer = async () => {
  try {
    await initDB();

    // Start Daily Subscription Expiry Lifecycle Scanner
    subscriptionService.startLifecycleAutomation();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 SCode Platform Server running on http://localhost:${PORT}`);
      console.log(`🌐 React Main Platform: http://localhost:${PORT}/`);
      console.log(`💼 Self-Serve Hosting: http://localhost:${PORT}/host-your-business`);
      console.log(`🏢 Dynamic React Sub-Site: http://localhost:${PORT}/b/clean-water-solutions`);
      console.log(`🔐 React Admin CMS: http://localhost:${PORT}/admin`);
      console.log(`💳 Razorpay Billing API: http://localhost:${PORT}/api/billing/plans`);
      console.log(`📷 QR Code Generator: http://localhost:${PORT}/api/qr?text=http://localhost:${PORT}/host-your-business`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
  }
};

startServer();
