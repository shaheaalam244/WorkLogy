import api from './axios';

export const jobAPI = {
  getAll: async (params) => {
    const res = await api.get('/jobs', { params });
    return res.data;
  },

  getNearby: async (params) => {
    const res = await api.get('/jobs/nearby', { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/jobs/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/jobs', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/jobs/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/jobs/${id}`);
    return res.data;
  },

  getMyJobs: async () => {
    const res = await api.get('/jobs/my-customer-jobs');
    return res.data;
  },

  updateStatus: async (id, statusData) => {
    const res = await api.patch(`/jobs/${id}/status`, statusData);
    return res.data;
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post('/jobs/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  acceptJob: async (id, data) => {
    const res = await api.post(`/jobs/${id}/accept`, data);
    return res.data;
  },

  claimInstant: async (id, data) => {
    const res = await api.post(`/jobs/${id}/accept`, data);
    return res.data;
  },

  getEmergencyLeads: async () => {
    const res = await api.get('/jobs/emergency-leads');
    return res.data;
  },

  decline: async (id) => {
    const res = await api.post(`/jobs/${id}/decline`);
    return res.data;
  },

  cancel: async (id, data) => {
    const res = await api.post(`/jobs/${id}/cancel`, data);
    return res.data;
  },

  retryDispatch: async (id) => {
    const res = await api.post(`/jobs/${id}/retry-dispatch`);
    return res.data;
  }
};
