import express from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  startConversation,
  markConversationRead,
  getUnreadCount
} from '../controllers/chat.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/conversations', protect, getConversations);
router.post('/conversations', protect, startConversation);
router.get('/conversations/:conversationId/messages', protect, getMessages);
router.get('/messages/:conversationId', protect, getMessages); // Alias for compatibility
router.post('/messages', protect, sendMessage);
router.patch('/conversations/:conversationId/read', protect, markConversationRead);
router.get('/unread-count', protect, getUnreadCount);

export default router;
