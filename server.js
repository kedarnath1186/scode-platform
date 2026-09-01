const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { initDB } = require('./src/db/database');
const authRoutes = require('./src/routes/authRoutes');
const businessRoutes = require('./src/routes/businessRoutes');
const leadRoutes = require('./src/routes/leadRoutes');
const statsRoutes = require('./src/routes/statsRoutes');
const settingRoutes = require('./src/routes/settingRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 1. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingRoutes);

// 2. Serve React Static Build (from client/dist)
const clientDistPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDistPath));

// Also fallback to public if needed
app.use(express.static(path.join(__dirname, 'public')));

// 3. React SPA Fallback Handler
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Start Server
const startServer = async () => {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 SCode Platform Server on http://localhost:${PORT}`);
      console.log(`🌐 React Main Platform: http://localhost:${PORT}/`);
      console.log(`🏢 Dynamic React Sub-Site: http://localhost:${PORT}/b/clean-water-solutions`);
      console.log(`🔐 React Admin CMS: http://localhost:${PORT}/admin (admin / admin123)`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
  }
};

startServer();
