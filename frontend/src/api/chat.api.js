import api from './axios';

export const chatAPI = {
  /**
   * Fetch all conversations for current authenticated user
   */
  getConversations: async () => {
    const res = await api.get('/chat/conversations');
    return res.data;
  },

  /**
   * Fetch paginated message history for a conversation
   */
  getMessages: async (conversationId, params = {}) => {
    const res = await api.get(`/chat/conversations/${conversationId}/messages`, { params });
    return res.data;
  },

  /**
   * Send a message in a conversation (persisted to MongoDB, broadcast via socket)
   */
  sendMessage: async (data) => {
    const res = await api.post('/chat/messages', data);
    return res.data;
  },

  /**
   * Mark all unread messages in a conversation as read
   */
  markConversationRead: async (conversationId) => {
    const res = await api.patch(`/chat/conversations/${conversationId}/read`);
    return res.data;
  },

  /**
   * Retrieve or create a conversation with a recipient (and optional job reference)
   */
  startConversation: async (data) => {
    const res = await api.post('/chat/conversations', data);
    return res.data;
  },

  /**
   * Fetch total unread message count across all conversations
   */
  getUnreadCount: async () => {
    const res = await api.get('/chat/unread-count');
    return res.data;
  }
};

export default chatAPI;
