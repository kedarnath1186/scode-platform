const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyAdmin } = require('../middleware/auth');

/**
 * @route   POST /api/chat
 * @desc    AI-style natural language user search chatbot (Admin only)
 * @access  Private (Authenticated Admin)
 */
router.post('/', verifyAdmin, (req, res) => chatController.handleChat(req, res));

module.exports = router;
