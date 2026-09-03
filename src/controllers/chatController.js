const chatService = require('../services/chatService');

/**
 * Controller for Admin AI Chatbot
 */
class ChatController {
  /**
   * POST /api/chat
   * Process natural language queries from authenticated admin users.
   */
  async handleChat(req, res) {
    try {
      const { message, sessionId } = req.body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({
          success: false,
          type: 'error',
          message: 'Message field is required.'
        });
      }

      // Context of the logged-in admin from verifyAdmin middleware
      const adminContext = req.admin || { id: 1, username: 'Admin' };
      const currentSessionId = sessionId || req.headers['x-session-id'] || `admin_${adminContext.id || 1}`;

      // Process query through ChatService (Intent extraction -> Search Service -> DB)
      const result = await chatService.processMessage(message, adminContext, currentSessionId);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Chat processing error:', error);
      return res.status(500).json({
        success: false,
        type: 'error',
        message: 'Internal server error processing chatbot query.',
        error: error.message
      });
    }
  }
}

module.exports = new ChatController();
