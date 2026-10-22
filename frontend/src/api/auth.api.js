import api from './axios';

export const authAPI = {
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },

  register: async (data) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  getMe: async () => {
    try {
      const res = await api.get('/auth/me');
      return res.data;
    } catch (err) {
      return null;
    }
  },

  updateDetails: async (data) => {
    const res = await api.put('/auth/updatedetails', data);
    return res.data;
  },

  updatePassword: async (data) => {
    const res = await api.put('/auth/updatepassword', data);
    return res.data;
  }
};
