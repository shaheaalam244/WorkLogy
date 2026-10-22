import api from './axios';

export const disputeAPI = {
  createDispute: async (data) => {
    const res = await api.post('/disputes', data);
    return res.data;
  },

  getDisputes: async (params = {}) => {
    const res = await api.get('/disputes', { params });
    return res.data;
  },

  getDisputeById: async (id) => {
    const res = await api.get(`/disputes/${id}`);
    return res.data;
  },

  updateDisputeStatus: async (id, data) => {
    const res = await api.patch(`/disputes/${id}/status`, data);
    return res.data;
  }
};
