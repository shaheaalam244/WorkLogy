import api from './axios';

export const notificationAPI = {
  getAll: async (params = {}) => {
    const res = await api.get('/notifications', { params });
    return res.data;
  },

  getUnreadCount: async () => {
    const res = await api.get('/notifications/unread-count');
    return res.data;
  },

  markAsRead: async (id) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await api.patch('/notifications/read-all');
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/notifications/${id}`);
    return res.data;
  },

  getPreferences: async () => {
    const res = await api.get('/notifications/preferences');
    return res.data;
  },

  updatePreferences: async (data) => {
    const res = await api.patch('/notifications/preferences', data);
    return res.data;
  }
};

